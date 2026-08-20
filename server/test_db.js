const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const docs = await prisma.document.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, folderId: true, uploadedById: true, schoolId: true, deletedAt: true }
    });
    console.log("Recent Documents:", docs);
    
    const folders = await prisma.documentFolder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, createdById: true, schoolId: true, deletedAt: true }
    });
    console.log("Recent Folders:", folders);
}

main().catch(console.error).finally(() => prisma.$disconnect());
