const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: { db: { url: "postgresql://neondb_owner:npg_AqdEieg3QG0C@ep-icy-glade-ahfbz57u-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" } }
});
async function main() {
    try {
        console.log("Fetching shares...");
        const userId = '123e4567-e89b-12d3-a456-426614174000'; // dummy valid uuid
        const schoolId = '123e4567-e89b-12d3-a456-426614174000';

        const shares = await prisma.documentShare.findMany({
            where: {
                OR: [{ targetType: 'instructor', targetUserId: userId }],
                AND: [
                    { document: { schoolId } },
                    {
                        OR: [
                            { expiresAt: null },
                            { expiresAt: { gt: new Date() } }
                        ]
                    }
                ]
            },
            include: {
                document: {
                    include: {
                        uploadedBy: { select: { id: true, firstName: true, lastName: true } }
                    }
                },
                sharedBy: { select: { id: true, firstName: true, lastName: true } },
                targetClass: { select: { id: true, name: true, gradeLevel: true, section: true } },
                targetGroup: { select: { id: true, name: true } }
            },
            orderBy: { sharedAt: 'desc' }
        });
        console.log("Found shares:", shares.length);
    } catch(e) {
        console.error("Error:", e.message);
    }
}
main().finally(() => prisma.$disconnect());
