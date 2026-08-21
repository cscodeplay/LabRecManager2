const { PrismaClient, Prisma } = require('@prisma/client');
require('dotenv').config();

async function migrateData() {
    const sourceUrl = process.env.SOURCE_DB_URL;
    const targetUrl = process.env.TARGET_DB_URL;

    if (!sourceUrl || !targetUrl) {
        console.error('Please set SOURCE_DB_URL and TARGET_DB_URL in your .env file.');
        process.exit(1);
    }

    const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
    const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });

    console.log('Connecting to databases...');
    await source.();
    await target.();

    // 1. Build Dependency Graph
    const models = Prisma.dmmf.datamodel.models;
    const graph = {};
    
    for (const model of models) {
        graph[model.name] = new Set();
        for (const field of model.fields) {
            if (field.kind === 'object' && field.relationFromFields && field.relationFromFields.length > 0) {
                if (field.type !== model.name) {
                    graph[model.name].add(field.type);
                }
            }
        }
    }

    // 2. Topological Sort
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    function visit(node) {
        if (visiting.has(node)) return;
        if (!visited.has(node)) {
            visiting.add(node);
            for (const dep of graph[node]) visit(dep);
            visiting.delete(node);
            visited.add(node);
            sorted.push(node);
        }
    }

    for (const modelName of Object.keys(graph)) visit(modelName);

    console.log('\nMigration order (' + sorted.length + ' models):');
    console.log(sorted.join(' -> '));

    // 3. Clear Target DB (Reverse Order)
    console.log('\nClearing target database...');
    for (let i = sorted.length - 1; i >= 0; i--) {
        const modelName = sorted[i];
        const camelCase = modelName.charAt(0).toLowerCase() + modelName.slice(1);
        try {
            if (target[camelCase] && target[camelCase].deleteMany) {
                await target[camelCase].deleteMany({});
                console.log('Cleared ' + modelName);
            }
        } catch (err) {
            console.error('Failed to clear ' + modelName + ':', err.message);
        }
    }

    // 4. Migrate Data
    console.log('\nMigrating data...');
    for (const modelName of sorted) {
        const camelCase = modelName.charAt(0).toLowerCase() + modelName.slice(1);
        if (!source[camelCase] || !target[camelCase]) continue;

        try {
            const rows = await source[camelCase].findMany();
            if (rows.length > 0) {
                await target[camelCase].createMany({
                    data: rows,
                    skipDuplicates: true
                });
                console.log('✅ Migrated ' + rows.length + ' rows for ' + modelName);
            } else {
                console.log('⏭️  Skipped ' + modelName + ' (0 rows)');
            }
        } catch (err) {
            console.error('❌ Failed to migrate ' + modelName + ':', err.message);
        }
    }

    console.log('\nMigration completed!');
    await source.();
    await target.();
}

migrateData().catch(console.error);
