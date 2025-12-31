// Quick script to check procurement_requests table for empty fields
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const requests = await prisma.procurementRequest.findMany({
        take: 5,
        select: {
            id: true,
            title: true,
            description: true,
            budgetCode: true,
            billNumber: true,
            billDate: true,
            billAmount: true,
            billUrl: true,
            poNumber: true,
            poUrl: true,
            purchaseLetterUrl: true,
            purchaseLetterName: true,
            status: true,
            quotations: {
                select: {
                    id: true,
                    vendorId: true,
                    documentUrl: true,
                    quotationNumber: true
                }
            }
        }
    });

    console.log('\n=== PROCUREMENT REQUESTS ===\n');
    requests.forEach((r, i) => {
        console.log(`[${i + 1}] ${r.title} (${r.status})`);
        console.log(`    ID: ${r.id}`);
        console.log(`    description: ${r.description || '(empty)'}`);
        console.log(`    budgetCode: ${r.budgetCode || '(empty)'}`);
        console.log(`    billNumber: ${r.billNumber || '(empty)'}`);
        console.log(`    billDate: ${r.billDate || '(empty)'}`);
        console.log(`    billAmount: ${r.billAmount || '(empty)'}`);
        console.log(`    billUrl: ${r.billUrl || '(empty)'}`);
        console.log(`    poNumber: ${r.poNumber || '(empty)'}`);
        console.log(`    poUrl: ${r.poUrl || '(empty)'}`);
        console.log(`    purchaseLetterUrl: ${r.purchaseLetterUrl || '(empty)'}`);
        console.log(`    purchaseLetterName: ${r.purchaseLetterName || '(empty)'}`);
        console.log(`    Quotations: ${r.quotations?.length || 0}`);
        r.quotations?.forEach(q => {
            console.log(`      - ${q.quotationNumber}: documentUrl=${q.documentUrl || '(empty)'}`);
        });
        console.log('');
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
