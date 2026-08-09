const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        await prisma.$executeRawUnsafe(`ALTER TABLE whiteboard_sessions ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP(6);`);
        await prisma.$executeRawUnsafe(`ALTER TABLE whiteboard_sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;`);
        console.log("Migration successful");
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
