require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const sqlFile = path.join(__dirname, '../database/add_admin_notes.sql');
  let sql = fs.readFileSync(sqlFile, 'utf8');
  
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  
  for (let stmt of statements) {
    console.log('Executing:', stmt.substring(0, 50) + '...');
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log('Success');
    } catch (e) {
      if (e.message.includes('already exists') || e.message.includes('relation "whiteboard_files" already exists')) {
        console.log('Already exists, skipping...');
      } else {
        console.error('Error:', e.message);
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
