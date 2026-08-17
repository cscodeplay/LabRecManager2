require('dotenv').config({ path: __dirname + '/.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const documents = await prisma.document.findMany();
        let updatedCount = 0;
        
        for (const doc of documents) {
            if (doc.url && doc.fileType === 'file') {
                const ext = doc.url.split('.').pop().toLowerCase();
                const validExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odp', 'mp4', 'mpeg', 'ogg', 'webm', 'avi', 'mov', 'mp3', 'wav', 'm4a', 'aac', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'txt', 'html', 'csv'];
                
                if (validExts.includes(ext)) {
                    await prisma.document.update({
                        where: { id: doc.id },
                        data: { fileType: ext }
                    });
                    updatedCount++;
                }
            }
        }
        
        console.log(`Successfully updated ${updatedCount} documents.`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
