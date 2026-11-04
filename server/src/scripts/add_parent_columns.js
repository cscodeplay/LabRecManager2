require('dotenv').config({ path: __dirname + '/../../.env' });
const prisma = require('../config/database');

async function run() {
    try {
        console.log("Adding parent columns to users table if they don't exist...");
        await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "parent_name" VARCHAR(100);`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "parent_phone" VARCHAR(20);`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "parent_email" VARCHAR(255);`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "parent_relation" VARCHAR(50) DEFAULT 'Guardian';`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "parent_whatsapp_enabled" BOOLEAN DEFAULT true;`);
        console.log("✅ Parent columns successfully added or already present.");
    } catch(e) {
        console.error("Error adding parent columns:", e.message);
    }
}

run().finally(() => prisma.$disconnect());
