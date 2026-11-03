const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../storage/config/practice_engine_config.json');

function parseMysqlUri(uri) {
    if (!uri || typeof uri !== 'string') return null;
    const clean = uri.trim();
    if (!clean.startsWith('mysql://')) return null;
    try {
        const u = new URL(clean);
        return {
            host: u.hostname,
            port: parseInt(u.port || '3306', 10),
            user: decodeURIComponent(u.username || 'root'),
            password: decodeURIComponent(u.password || ''),
            database: u.pathname ? u.pathname.replace(/^\//, '') : undefined
        };
    } catch (e) {
        return null;
    }
}

function getSslOptions(conf) {
    if (!conf) return undefined;
    const host = conf.host || '';
    const isRemote = host && host !== '127.0.0.1' && host !== 'localhost';
    if (conf.ssl || isRemote) {
        return { minVersion: 'TLSv1.2', rejectUnauthorized: true };
    }
    return undefined;
}

const envUri = process.env.MYSQL_URL || process.env.MYSQL_URI;
const parsedUri = parseMysqlUri(envUri);

const DEFAULT_CONFIG = {
    activeEngine: 'mysql',
    mysql: {
        host: parsedUri?.host || process.env.MYSQL_HOST || '127.0.0.1',
        port: parsedUri?.port || parseInt(process.env.MYSQL_PORT || '3306', 10),
        user: parsedUri?.user || process.env.MYSQL_USER || 'root',
        password: parsedUri?.password || process.env.MYSQL_PASSWORD || '',
        databasePrefix: 'practice_stu_'
    },
    updatedAt: new Date().toISOString(),
    updatedBy: 'System'
};

class PracticeDatabaseService {
    constructor() {
        this.config = this.loadConfig();
        this.rootPool = null;
        this.initRootPool();
    }

    loadConfig() {
        try {
            if (fs.existsSync(CONFIG_PATH)) {
                const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
                return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
            }
        } catch (e) {
            console.error('[PracticeDB] Error loading engine config:', e.message);
        }
        return { ...DEFAULT_CONFIG };
    }

    saveConfig(newConfig) {
        try {
            const dir = path.dirname(CONFIG_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), 'utf8');
            this.config = newConfig;
            this.initRootPool();
            return true;
        } catch (e) {
            console.error('[PracticeDB] Error saving engine config:', e.message);
            return false;
        }
    }

    initRootPool() {
        try {
            if (this.rootPool) {
                this.rootPool.end().catch(() => {});
                this.rootPool = null;
            }
            const ssl = getSslOptions(this.config.mysql);
            this.rootPool = mysql.createPool({
                host: this.config.mysql.host,
                port: this.config.mysql.port,
                user: this.config.mysql.user,
                password: this.config.mysql.password,
                ssl: ssl,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                multipleStatements: true
            });
        } catch (e) {
            console.warn('[PracticeDB] Failed to initialize root MySQL pool:', e.message);
        }
    }

    /**
     * Test connection to MySQL with given or current credentials
     */
    async testMySqlConnection(overrideConfig = null) {
        const conf = overrideConfig || this.config.mysql;
        const ssl = getSslOptions(conf);
        let testConn = null;
        try {
            testConn = await mysql.createConnection({
                host: conf.host || '127.0.0.1',
                port: conf.port || 3306,
                user: conf.user || 'root',
                password: conf.password || '',
                ssl: ssl,
                connectTimeout: 7000
            });
            const [rows] = await testConn.query('SELECT VERSION() as version');
            const version = rows[0]?.version || 'MySQL 8+';
            await testConn.end();
            return { success: true, version, message: `Connected successfully to MySQL ${version}` };
        } catch (err) {
            if (testConn) {
                try { await testConn.end(); } catch (_) {}
            }
            return {
                success: false,
                error: err.message,
                message: `MySQL Connection Failed: ${err.message}`
            };
        }
    }

    /**
     * Get Engine Config with live health status
     */
    async getEngineConfig() {
        const testRes = await this.testMySqlConnection();
        return {
            activeEngine: 'mysql',
            availableEngines: ['mysql'],
            mysql: {
                host: this.config.mysql.host,
                port: this.config.mysql.port,
                user: this.config.mysql.user,
                hasPassword: Boolean(this.config.mysql.password)
            },
            isMysqlOnline: testRes.success,
            mysqlVersion: testRes.version || null,
            mysqlError: testRes.error || null,
            updatedAt: this.config.updatedAt,
            updatedBy: this.config.updatedBy
        };
    }

    /**
     * Update active engine and credentials (Admin only)
     */
    async updateEngineConfig(updates = {}, adminUser = null) {
        let mysqlUpdates = updates.mysql || {};
        if (updates.uri || updates.mysqlUri || typeof updates.mysql === 'string') {
            const rawUri = updates.uri || updates.mysqlUri || updates.mysql;
            const parsed = parseMysqlUri(rawUri);
            if (parsed) {
                mysqlUpdates = { ...mysqlUpdates, ...parsed };
            }
        }

        const nextConfig = {
            ...this.config,
            activeEngine: 'mysql',
            mysql: {
                ...this.config.mysql,
                ...mysqlUpdates
            },
            updatedAt: new Date().toISOString(),
            updatedBy: adminUser?.name || adminUser?.email || 'Admin'
        };

        const testResult = await this.testMySqlConnection(nextConfig.mysql);
        if (!testResult.success) {
            throw new Error(`MySQL connection test failed: ${testResult.error}`);
        }

        this.saveConfig(nextConfig);
        return await this.getEngineConfig();
    }

    /**
     * Sanitize student ID into a safe MySQL database identifier
     */
    getSanitizedDbName(studentId) {
        const clean = String(studentId || 'guest').replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        const prefix = this.config.mysql.databasePrefix || 'practice_stu_';
        return `${prefix}${clean}`.substring(0, 64);
    }

    /**
     * Ensure student's isolated MySQL schema exists
     */
    async ensureStudentMySqlDb(studentId) {
        if (!this.rootPool) {
            this.initRootPool();
        }
        const dbName = this.getSanitizedDbName(studentId);
        await this.rootPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        return dbName;
    }

    /**
     * Format array of objects into an ASCII table string for CLI stdout
     */
    formatAsciiTable(rows) {
        if (!rows || rows.length === 0) return '(0 rows returned)';
        const columns = Object.keys(rows[0]);
        if (columns.length === 0) return '(empty row)';

        const colWidths = {};
        columns.forEach(col => {
            colWidths[col] = Math.max(
                col.length,
                ...rows.map(r => String(r[col] === null ? 'NULL' : (r[col] !== undefined ? r[col] : '')).length)
            );
        });

        const separator = '+' + columns.map(c => '-'.repeat(colWidths[c] + 2)).join('+') + '+';
        const header = '|' + columns.map(c => ` ${c.padEnd(colWidths[c])} `).join('|') + '|';
        
        const dataRows = rows.map(r => {
            return '|' + columns.map(c => {
                const val = r[c] === null ? 'NULL' : (r[c] !== undefined ? String(r[c]) : '');
                return ` ${val.padEnd(colWidths[c])} `;
            }).join('|') + '|';
        });

        return [separator, header, separator, ...dataRows, separator].join('\n');
    }

    /**
     * Execute SQL query via MySQL
     */
    async executeMySql(code, studentId) {
        const startTime = Date.now();
        let dbName = null;
        let conn = null;
        try {
            dbName = await this.ensureStudentMySqlDb(studentId);
            const ssl = getSslOptions(this.config.mysql);
            conn = await mysql.createConnection({
                host: this.config.mysql.host,
                port: this.config.mysql.port,
                user: this.config.mysql.user,
                password: this.config.mysql.password,
                database: dbName,
                ssl: ssl,
                multipleStatements: true,
                connectTimeout: 8000
            });

            // Execute the SQL code
            const [results] = await conn.query(code);
            const durationMs = Date.now() - startTime;

            // Fetch list of current tables in student's schema
            const [tablesRes] = await conn.query(`SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'`);
            const existingTables = tablesRes.map(t => Object.values(t)[0]);

            // Parse result sets
            let stdoutParts = [];
            let structuredTables = null;

            // When multipleStatements: true, results can be:
            // 1) An array of result sets (if multiple statements were executed)
            // 2) A single result set (array of rows for SELECT, or ResultSetHeader for INSERT/UPDATE/CREATE)
            const resultSets = Array.isArray(results) && results.length > 0 && (Array.isArray(results[0]) || results[0]?.constructor?.name === 'ResultSetHeader')
                ? results
                : [results];

            resultSets.forEach((resSet, idx) => {
                if (Array.isArray(resSet)) {
                    // This is a SELECT query result
                    if (resSet.length > 0) {
                        if (!structuredTables) structuredTables = [];
                        structuredTables.push(...resSet);
                        stdoutParts.push(this.formatAsciiTable(resSet));
                        stdoutParts.push(`(${resSet.length} ${resSet.length === 1 ? 'row' : 'rows'} in set)\n`);
                    } else {
                        stdoutParts.push('Empty set\n');
                    }
                } else if (resSet && typeof resSet === 'object') {
                    // This is an INSERT / UPDATE / CREATE TABLE / DROP query header
                    const affected = resSet.affectedRows !== undefined ? resSet.affectedRows : 0;
                    const changed = resSet.changedRows !== undefined ? resSet.changedRows : 0;
                    stdoutParts.push(`Query OK, ${affected} rows affected${changed ? ` (${changed} changed)` : ''}`);
                }
            });

            await conn.end();

            return {
                stdout: stdoutParts.join('\n').trim(),
                stderr: '',
                exitCode: 0,
                durationMs,
                isLocal: true,
                tables: structuredTables && structuredTables.length > 0 ? structuredTables : null,
                existingTables,
                runner: 'local-mysql',
                engine: 'mysql',
                databaseName: dbName
            };
        } catch (err) {
            if (conn) {
                try { await conn.end(); } catch (_) {}
            }

            // Still query existing tables if possible
            let existingTables = [];
            try {
                if (this.rootPool) {
                    const [tRes] = await this.rootPool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = ?`, [dbName]);
                    existingTables = tRes.map(r => r.table_name || r.TABLE_NAME);
                }
            } catch (_) {}

            return {
                stdout: '',
                stderr: `MySQL Error: ${err.sqlMessage || err.message}`,
                exitCode: 1,
                durationMs: Date.now() - startTime,
                isLocal: true,
                tables: null,
                existingTables,
                runner: 'local-mysql',
                engine: 'mysql',
                databaseName: dbName
            };
        }
    }

    /**
     * Unified SQL execution method - dedicated MySQL / TiDB Cloud Engine
     */
    async executeSql(code, studentId) {
        return await this.executeMySql(code, studentId);
    }

    /**
     * Query existing tables for student under active MySQL engine
     */
    async getExistingTables(studentId) {
        try {
            const dbName = this.getSanitizedDbName(studentId);
            if (!this.rootPool) this.initRootPool();
            const [rows] = await this.rootPool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = ?`, [dbName]);
            return rows.map(r => r.table_name || r.TABLE_NAME);
        } catch (e) {
            return [];
        }
    }

    /**
     * Reset student's isolated MySQL database
     */
    async resetStudentDatabase(studentId) {
        const dbName = this.getSanitizedDbName(studentId);
        try {
            if (!this.rootPool) this.initRootPool();
            await this.rootPool.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
            await this.rootPool.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        } catch (e) {
            console.error('[PracticeDB] Error dropping MySQL database:', e.message);
        }

        return {
            success: true,
            activeEngine: 'mysql',
            database: dbName,
            message: `Practice MySQL database '${dbName}' reset successfully.`
        };
    }

    /**
     * Inspect student's live database schema and relationships (100% deterministic, NO AI)
     * Queries information_schema for MySQL
     */
    async getDatabaseSchema(studentId) {
        const dbName = this.getSanitizedDbName(studentId);

        try {
            if (!this.rootPool) this.initRootPool();

            // 1. Fetch all columns and types
            const [columns] = await this.rootPool.query(`
                SELECT 
                    TABLE_NAME, 
                    COLUMN_NAME, 
                    DATA_TYPE, 
                    COLUMN_TYPE, 
                    IS_NULLABLE, 
                    COLUMN_KEY, 
                    COLUMN_DEFAULT,
                    EXTRA
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = ?
                ORDER BY TABLE_NAME, ORDINAL_POSITION
            `, [dbName]);

            // 2. Fetch foreign key references
            const [fkRows] = await this.rootPool.query(`
                SELECT 
                    TABLE_NAME, 
                    COLUMN_NAME, 
                    REFERENCED_TABLE_NAME, 
                    REFERENCED_COLUMN_NAME, 
                    CONSTRAINT_NAME
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = ? 
                  AND REFERENCED_TABLE_NAME IS NOT NULL
            `, [dbName]);

            const tableMap = new Map();

            for (const col of columns) {
                const tableName = col.TABLE_NAME || col.table_name;
                if (!tableMap.has(tableName)) {
                    tableMap.set(tableName, {
                        name: tableName,
                        columns: [],
                        foreignKeys: []
                    });
                }

                const isPk = (col.COLUMN_KEY || col.column_key) === 'PRI';
                const colName = col.COLUMN_NAME || col.column_name;
                const colType = (col.COLUMN_TYPE || col.column_type || col.DATA_TYPE || 'VARCHAR').toUpperCase();
                const nullable = (col.IS_NULLABLE || col.is_nullable) === 'YES';

                tableMap.get(tableName).columns.push({
                    name: colName,
                    type: colType,
                    isPk,
                    isFk: false,
                    nullable,
                    defaultValue: col.COLUMN_DEFAULT || col.column_default || null,
                    extra: col.EXTRA || col.extra || ''
                });
            }

            for (const fk of fkRows) {
                const tName = fk.TABLE_NAME || fk.table_name;
                const cName = fk.COLUMN_NAME || fk.column_name;
                const refTable = fk.REFERENCED_TABLE_NAME || fk.referenced_table_name;
                const refCol = fk.REFERENCED_COLUMN_NAME || fk.referenced_column_name;

                if (tableMap.has(tName)) {
                    const tableObj = tableMap.get(tName);
                    tableObj.foreignKeys.push({
                        column: cName,
                        referencedTable: refTable,
                        referencedColumn: refCol,
                        constraintName: fk.CONSTRAINT_NAME || fk.constraint_name
                    });

                    const colObj = tableObj.columns.find(c => c.name.toLowerCase() === cName.toLowerCase());
                    if (colObj) colObj.isFk = true;
                }
            }

            return {
                engine: 'mysql',
                database: dbName,
                tables: Array.from(tableMap.values())
            };
        } catch (err) {
            console.error('[PracticeDB] MySQL schema fetch failed:', err.message);
            return { engine: 'mysql', database: dbName, tables: [], error: err.message };
        }
    }
}

module.exports = new PracticeDatabaseService();
