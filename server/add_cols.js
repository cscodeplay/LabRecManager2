require('dotenv').config({ path: __dirname + '/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        console.log("Creating enum share_permission...");
        await prisma.$executeRawUnsafe(`CREATE TYPE share_permission AS ENUM ('view', 'download')`);
    } catch(e) { console.log(e.message); }
    
    try {
        console.log("Adding permission column to folder_shares...");
        await prisma.$executeRawUnsafe(`ALTER TABLE "folder_shares" ADD COLUMN "permission" "share_permission" NOT NULL DEFAULT 'download'`);
    } catch(e) { console.log(e.message); }

    try {
        console.log("Adding permission column to document_shares...");
        await prisma.$executeRawUnsafe(`ALTER TABLE "document_shares" ADD COLUMN "permission" "share_permission" NOT NULL DEFAULT 'download'`);
    } catch(e) { console.log(e.message); }

    console.log("Done adding columns");
}
run().finally(() => prisma.$disconnect());
