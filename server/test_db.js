const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    try {
        await prisma.documentShare.findFirst({
            where: { id: '00000000-0000-0000-0000-000000000000' },
            include: { document: { select: { schoolId: true } } }
        });
        console.log("findFirst OK");
    } catch(e) { console.error("Error 1:", e.message); }

    try {
        await prisma.document.findUnique({
            where: { id: '00000000-0000-0000-0000-000000000000', schoolId: '00000000-0000-0000-0000-000000000000' }
        });
        console.log("findUnique OK");
    } catch(e) { console.error("Error 2:", e.message); }
}
main().finally(() => prisma.$disconnect());
