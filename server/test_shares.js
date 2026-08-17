require('dotenv').config({ path: __dirname + '/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const shares = await prisma.folderShare.findMany({
            where: { folderId: '49732e18-02fa-4b5a-8cea-af6b0e1a2b89' },
            include: {
                sharedBy: { select: { id: true, firstName: true, lastName: true } },
                targetClass: { select: { id: true, name: true } },
                targetGroup: { select: { id: true, name: true } },
                targetUser: { select: { id: true, firstName: true, lastName: true, role: true } }
            },
            orderBy: { sharedAt: 'desc' }
        });
        console.log(shares);
    } catch(e) {
        console.error("ERROR:", e);
    }
}
run();
