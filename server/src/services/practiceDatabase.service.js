const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const CONFIG_PATH = path.join(__dirname, '../../storage/config/practice_engine_config.json');

const DEFAULT_CONFIG = {
    activeEngine: 'mysql', // 'mysql' | 'sqlite'
    fallbackToSqlite: true,
    mysql: {
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: parseInt(process.env.MYSQL_PORT || '3306', 10),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
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
            this.rootPool = mysql.createPool({
                host: this.config.mysql.host,
                port: this.config.mysql.port,
                user: this.config.mysql.user,
                password: this.config.mysql.password,
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
        let testConn = null;
        try {
            testConn = await mysql.createConnection({
                host: conf.host || '127.0.0.1',
                port: conf.port || 3306,
                user: conf.user || 'root',
                password: conf.password || '',
                connectTimeout: 4000
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
            activeEngine: this.config.activeEngine,
            availableEngines: ['mysql', 'sqlite'],
            fallbackToSqlite: this.config.fallbackToSqlite,
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
        const nextConfig = {
            ...this.config,
            activeEngine: updates.activeEngine === 'sqlite' ? 'sqlite' : 'mysql',
            fallbackToSqlite: updates.fallbackToSqlite !== undefined ? Boolean(updates.fallbackToSqlite) : this.config.fallbackToSqlite,
            mysql: {
                ...this.config.mysql,
                ...(updates.mysql || {})
            },
            updatedAt: new Date().toISOString(),
            updatedBy: adminUser?.name || adminUser?.email || 'Admin'
        };

        if (nextConfig.activeEngine === 'mysql') {
            const testResult = await this.testMySqlConnection(nextConfig.mysql);
            if (!testResult.success) {
                if (!nextConfig.fallbackToSqlite) {
                    throw new Error(`Cannot set MySQL as primary engine: ${testResult.error}`);
                }
            }
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
        const dbName = await this.ensureStudentMySqlDb(studentId);

        let conn = null;
        try {
            conn = await mysql.createConnection({
                host: this.config.mysql.host,
                port: this.config.mysql.port,
                user: this.config.mysql.user,
                password: this.config.mysql.password,
                database: dbName,
                multipleStatements: true,
                connectTimeout: 5000
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
     * Execute SQL query via SQLite3 CLI
     */
    executeSqlite(code, dbPath) {
        return new Promise((resolve) => {
            const start = Date.now();

            const child = execFile('sqlite3', [dbPath, '-header', '-column'], { timeout: 8000, maxBuffer: 1024 * 1024 * 4 }, (err, stdout, stderr) => {
                const duration = Date.now() - start;

                // Query existing database tables
                execFile('sqlite3', [dbPath, '-json', 'SELECT name FROM sqlite_master WHERE type="table" AND name NOT LIKE "sqlite_%";'], (tErr, tStdout) => {
                    let existingTables = [];
                    try {
                        if (tStdout && tStdout.trim().startsWith('[')) {
                            const parsed = JSON.parse(tStdout);
                            existingTables = parsed.map(p => p.name);
                        }
                    } catch (e) {}

                    if (err) {
                        return resolve({
                            stdout: stdout || '',
                            stderr: stderr || err.message,
                            exitCode: 1,
                            durationMs: duration,
                            isLocal: true,
                            tables: [],
                            existingTables,
                            runner: 'local-sqlite3',
                            engine: 'sqlite'
                        });
                    }

                    // Extract structured JSON table data
                    execFile('sqlite3', [dbPath, '-json'], { timeout: 5000, maxBuffer: 1024 * 1024 * 4 }, (jErr, jStdout) => {
                        let jsonData = null;
                        try {
                            if (jStdout && jStdout.trim().startsWith('[')) {
                                jsonData = JSON.parse(jStdout);
                            }
                        } catch (e) {}

                        resolve({
                            stdout: stdout || '',
                            stderr: stderr || '',
                            exitCode: 0,
                            durationMs: duration,
                            isLocal: true,
                            tables: jsonData && Array.isArray(jsonData) && jsonData.length > 0 ? jsonData : null,
                            existingTables,
                            runner: 'local-sqlite3',
                            engine: 'sqlite'
                        });
                    }).stdin.end(code);
                });
            });

            child.stdin.write(code);
            child.stdin.end();
        });
    }

    /**
     * Unified SQL execution method honoring admin preselected engine
     */
    async executeSql(code, studentId, studentSqliteDbPath) {
        if (this.config.activeEngine === 'mysql') {
            try {
                const res = await this.executeMySql(code, studentId);
                // If it succeeded or returned a standard SQL syntax error, return it
                if (!res.stderr || !res.stderr.includes('ECONNREFUSED')) {
                    return res;
                }
                // If MySQL connection was refused and fallback is enabled, fallback to SQLite
                if (this.config.fallbackToSqlite) {
                    console.warn('[PracticeDB] MySQL connection refused, falling back to SQLite3');
                    const fallbackRes = await this.executeSqlite(code, studentSqliteDbPath);
                    return {
                        ...fallbackRes,
                        stdout: `[Notice: MySQL was offline, executed in SQLite3 fallback engine]\n\n${fallbackRes.stdout}`,
                        runner: 'local-sqlite3 (fallback)'
                    };
                }
                return res;
            } catch (err) {
                if (this.config.fallbackToSqlite) {
                    console.warn('[PracticeDB] MySQL error, falling back to SQLite:', err.message);
                    const fallbackRes = await this.executeSqlite(code, studentSqliteDbPath);
                    return {
                        ...fallbackRes,
                        stdout: `[Notice: Executed in SQLite3 fallback engine]\n\n${fallbackRes.stdout}`,
                        runner: 'local-sqlite3 (fallback)'
                    };
                }
                throw err;
            }
        }

        // SQLite active engine
        return await this.executeSqlite(code, studentSqliteDbPath);
    }

    /**
     * Query existing tables for student under active engine
     */
    async getExistingTables(studentId, studentSqliteDbPath) {
        if (this.config.activeEngine === 'mysql') {
            try {
                const dbName = this.getSanitizedDbName(studentId);
                if (!this.rootPool) this.initRootPool();
                const [rows] = await this.rootPool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = ?`, [dbName]);
                return rows.map(r => r.table_name || r.TABLE_NAME);
            } catch (e) {
                // Return empty if MySQL is offline or DB not yet created
            }
        }

        if (fs.existsSync(studentSqliteDbPath)) {
            return new Promise((resolve) => {
                execFile('sqlite3', [studentSqliteDbPath, '-json', 'SELECT name FROM sqlite_master WHERE type="table" AND name NOT LIKE "sqlite_%";'], (err, stdout) => {
                    if (!err && stdout && stdout.trim().startsWith('[')) {
                        try {
                            const parsed = JSON.parse(stdout);
                            return resolve(parsed.map(p => p.name));
                        } catch (e) {}
                    }
                    resolve([]);
                });
            });
        }
        return [];
    }

    /**
     * Reset student's isolated database
     */
    async resetStudentDatabase(studentId, studentSqliteDbPath) {
        let results = [];

        if (this.config.activeEngine === 'mysql') {
            try {
                const dbName = this.getSanitizedDbName(studentId);
                if (!this.rootPool) this.initRootPool();
                await this.rootPool.query(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
                await this.rootPool.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
                results.push(`Reset MySQL database '${dbName}'`);
            } catch (e) {
                console.error('[PracticeDB] Error dropping MySQL database:', e.message);
            }
        }

        if (fs.existsSync(studentSqliteDbPath)) {
            try {
                fs.unlinkSync(studentSqliteDbPath);
                results.push(`Reset SQLite file`);
            } catch (e) {}
        }

        return {
            success: true,
            activeEngine: this.config.activeEngine,
            message: `Practice database reset (${this.config.activeEngine.toUpperCase()})`
        };
    }
}

module.exports = new PracticeDatabaseService();
