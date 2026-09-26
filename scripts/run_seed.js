const fs = require('fs');
const path = require('path');
const prisma = require('../server/src/config/database');

function parseSqlStatements(sqlText) {
  let clean = sqlText.replace(/\/\*[\s\S]*?\*\//g, '');
  const rawStatements = clean.split(/;\s*[\r\n]+/);
  const statements = [];
  for (let raw of rawStatements) {
    const lines = raw.split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('--'));
    if (lines.length > 0) {
      statements.push(lines.join('\n'));
    }
  }
  return statements;
}

async function main() {
  console.log('🚀 Starting Database Seed Execution...');
  const seedFile = path.resolve(__dirname, '../database/seed_all_tables.sql');
  const content = fs.readFileSync(seedFile, 'utf8');

  const statements = parseSqlStatements(content);
  console.log(`Parsed ${statements.length} SQL execution blocks.`);

  const startTime = Date.now();

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    // Extract table name from INSERT INTO <table> or TRUNCATE TABLE
    const match = stmt.match(/(?:INSERT\s+INTO|TRUNCATE\s+TABLE)\s+([a-zA-Z0-9_"]+)/i);
    const label = match ? match[0] : `Statement ${i + 1}`;

    try {
      process.stdout.write(`[${(i + 1).toString().padStart(2, '0')}/${statements.length}] ${label.padEnd(40)} ... `);
      await prisma.$executeRawUnsafe(stmt);
      console.log('✅');
    } catch (err) {
      console.log('❌');
      console.error(`\nFailed executing statement ${i + 1}:\n${stmt}\n`);
      console.error('Error Details:', err);
      throw err;
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n======================================================');
  console.log(`🎉 All ${statements.length} Seed Statements Executed Successfully in ${durationSec}s!`);
  console.log('Verifying exact row counts across all tables in a single query...');
  console.log('======================================================\n');

  // Query all public base tables
  const tablesRes = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  const validTables = tablesRes
    .map(t => t.table_name)
    .filter(t => t !== '_prisma_migrations');

  // Build a single UNION ALL query to get counts in 1 network roundtrip
  const countQuery = validTables
    .map(t => `SELECT '${t}' AS table_name, COUNT(*)::int AS count FROM "${t}"`)
    .join(' UNION ALL ') + ' ORDER BY table_name;';

  const countsRes = await prisma.$queryRawUnsafe(countQuery);

  let passedCount = 0;
  const underpopulated = [];

  for (const row of countsRes) {
    const tableName = row.table_name;
    const count = row.count;
    const statusIcon = count >= 2 ? '✅' : '⚠️';
    console.log(`${statusIcon} ${tableName.padEnd(35)} : ${count} rows`);
    if (count >= 2) {
      passedCount++;
    } else {
      underpopulated.push({ table: tableName, count });
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`Summary: ${passedCount}/${validTables.length} tables have >= 2 rows.`);
  if (underpopulated.length > 0) {
    console.log('Tables needing attention:', JSON.stringify(underpopulated, null, 2));
  } else {
    console.log('🌟 100% of tables satisfied the >= 2 rows requirement!');
  }
  console.log('------------------------------------------------------\n');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Seeding process encountered an unhandled error:', err);
  process.exit(1);
});
