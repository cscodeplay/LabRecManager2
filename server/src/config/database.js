const { PrismaClient } = require('@prisma/client');

let dbUrl = process.env.DATABASE_URL;

if (process.env.ACTIVE_DB === 'old' && process.env.DATABASE_URL_OLD) {
    dbUrl = process.env.DATABASE_URL_OLD;
    console.log('[DB Config] Using DATABASE_URL_OLD');
} else if (process.env.ACTIVE_DB === 'new' && process.env.DATABASE_URL_NEW) {
    dbUrl = process.env.DATABASE_URL_NEW;
    console.log('[DB Config] Using DATABASE_URL_NEW');
} else {
    console.log('[DB Config] Using default DATABASE_URL');
}

// Create a single instance of Prisma Client with query logging
const prisma = new PrismaClient({
    datasources: dbUrl ? {
        db: { url: dbUrl }
    } : undefined,
    log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
    ],
});

// Track database status
let isDatabaseConnected = false;

// Store recent queries for debugging (in-memory, last 100)
const recentQueries = [];
const MAX_RECENT_QUERIES = 100;

// Listen for query events and capture actual SQL
prisma.$on('query', (e) => {
    const queryInfo = {
        query: e.query,
        params: e.params,
        duration: e.duration,
        timestamp: new Date().toISOString()
    };

    // Store in memory for debugging
    recentQueries.push(queryInfo);
    if (recentQueries.length > MAX_RECENT_QUERIES) {
        recentQueries.shift();
    }

    // Log slow queries (>500ms)
    if (e.duration > 500) {
        console.log(`⚠️ Slow query (${e.duration}ms):`, e.query.substring(0, 200));
    }
});

// Batched query log buffer — flushes every 5 seconds to avoid per-query DB writes
const queryLogBuffer = [];
const FLUSH_INTERVAL_MS = 5000;
const SLOW_QUERY_THRESHOLD_MS = 500;

let flushTimer = null;
function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(flushQueryLogs, FLUSH_INTERVAL_MS);
}

async function flushQueryLogs() {
    flushTimer = null;
    if (queryLogBuffer.length === 0 || !isDatabaseConnected) return;
    const batch = queryLogBuffer.splice(0, queryLogBuffer.length);
    try {
        await prisma.queryLog.createMany({ data: batch });
    } catch (err) {
        console.error('Query log batch flush failed:', err.message);
    }
}

// Query logging & automatic retry middleware
prisma.$use(async (params, next) => {
    // Skip logging for QueryLog operations to prevent infinite loop
    if (params.model === 'QueryLog') {
        return next(params);
    }

    const startTime = Date.now();
    let error = null;
    let result;

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
        attempts++;
        try {
            result = await next(params);
            isDatabaseConnected = true;
            error = null;
            break;
        } catch (err) {
            error = err;
            const msg = err.message || '';
            const code = err.code || '';
            const isConnErr = code === 'P1001' || code === 'P1002' || code === 'P1008' || code === 'P1017' ||
                msg.includes("Can't reach database") || msg.includes("Connection terminated") ||
                msg.includes("closed the connection") || msg.includes("ECONNRESET") ||
                msg.includes("ETIMEDOUT") || msg.includes("socket hang up");

            if (isConnErr && attempts < maxAttempts) {
                console.warn(`⚠️ Prisma connection error on ${params.model}.${params.action} (attempt ${attempts}/${maxAttempts}). Retrying in 1.2s for Neon DB wakeup...`);
                await new Promise(r => setTimeout(r, 1200));
                try {
                    await prisma.$connect();
                } catch (cErr) {
                    // Ignore reconnect error, retry next(params)
                }
            } else {
                break;
            }
        }
    }

    const duration = Date.now() - startTime;

    // Only log errors and slow queries to the DB (avoids doubling latency on every call)
    const isSlowOrError = error || duration > SLOW_QUERY_THRESHOLD_MS;
    if (isDatabaseConnected && isSlowOrError) {
        const paramsStr = JSON.stringify(params.args || {});
        queryLogBuffer.push({
            query: `${params.model}.${params.action}`,
            params: paramsStr.substring(0, 5000),
            duration,
            error: error ? `${error.message}\n${error.stack || ''}`.substring(0, 2000) : null,
            success: !error,
            model: params.model,
            action: params.action,
        });
        scheduleFlush();
    }

    // Rethrow error if there was one
    if (error) {
        throw error;
    }

    return result;
});

// Test database connection with retries
async function testConnection(retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            await prisma.$connect();
            await prisma.$queryRaw`SELECT 1`;
            isDatabaseConnected = true;
            console.log('✅ Database connected successfully');
            return true;
        } catch (error) {
            console.error(`⚠️ Database connection attempt ${i + 1}/${retries} failed:`, error.message);
            if (i < retries - 1) {
                console.log('Retrying in 3 seconds...');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    }
    console.error('❌ Database connection failed after', retries, 'attempts');
    console.log('⚠️ Server will continue running - DB will reconnect when available');
    isDatabaseConnected = false;
    return false;
}

// Don't crash the server if DB is unavailable
testConnection().catch(() => {
    console.log('⚠️ Starting server without database connection');
});

// Background keep-alive ping to prevent Neon DB from auto-suspending
const KEEP_ALIVE_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes
setInterval(async () => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        isDatabaseConnected = true;
    } catch (err) {
        console.warn('⚠️ Neon DB keep-alive ping failed, attempting reconnection...', err.message);
        try {
            await prisma.$connect();
            await prisma.$queryRaw`SELECT 1`;
            isDatabaseConnected = true;
            console.log('✅ Neon DB keep-alive reconnected successfully');
        } catch (reconnectErr) {
            isDatabaseConnected = false;
        }
    }
}, KEEP_ALIVE_INTERVAL_MS);

// Handle graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

// Export connection status check function
prisma.isConnected = () => isDatabaseConnected;

// Reconnect function
prisma.reconnect = async () => {
    return testConnection(1);
};

// Export recent queries for debugging API
prisma.getRecentQueries = () => [...recentQueries];

module.exports = prisma;
