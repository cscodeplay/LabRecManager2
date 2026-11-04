/**
 * Institutional Coding Folders Reorganization and Cloudinary Sync Script
 * 
 * Objectives:
 * 1. Creates top-level "Coding files" institutional folder for each school.
 * 2. Creates nested "Python" and "SQL" subfolders under "Coding files".
 * 3. Migrates all loose .py scripts to "Coding files / Python".
 * 4. Migrates all loose .sql scripts to "Coding files / SQL".
 * 5. Synchronizes any local-only code files in server/uploads to Cloudinary
 *    so code is permanently preserved on the cloud and never empty.
 */

const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('../services/cloudinary');

const prisma = new PrismaClient();

async function reorganize() {
    console.log('===============================================================');
    console.log('Starting Institutional Coding Folder Reorganization & Cloud Sync');
    console.log('Cloudinary Configured:', cloudinary.isConfigured());
    console.log('===============================================================\n');

    const schools = await prisma.school.findMany({ select: { id: true, name: true } });
    if (!schools.length) {
        console.log('No schools found. Exiting.');
        return;
    }

    const uploadsDir = path.join(__dirname, '../../uploads');

    for (const school of schools) {
        console.log(`\n🏫 Processing School: "${school.name}" (${school.id})`);

        // Find an admin or creator user in this school to own the system folders
        const adminUser = await prisma.user.findFirst({
            where: { schoolId: school.id, role: { in: ['admin', 'principal'] } },
            select: { id: true }
        }) || await prisma.user.findFirst({
            where: { schoolId: school.id },
            select: { id: true }
        });

        const ownerId = adminUser ? adminUser.id : null;

        // 1. Ensure Root Folder: "Coding files"
        let codingFilesFolder = await prisma.documentFolder.findFirst({
            where: {
                schoolId: school.id,
                parentId: null,
                name: { equals: 'Coding files', mode: 'insensitive' }
            }
        });

        if (!codingFilesFolder) {
            codingFilesFolder = await prisma.documentFolder.create({
                data: {
                    schoolId: school.id,
                    name: 'Coding files',
                    createdById: ownerId,
                    parentId: null
                }
            });
            console.log(`  📁 Created Root Folder: "Coding files" (${codingFilesFolder.id})`);
        } else {
            console.log(`  📁 Found Root Folder: "Coding files" (${codingFilesFolder.id})`);
        }

        // 2. Ensure Subfolder: "Python" under "Coding files"
        let pythonFolder = await prisma.documentFolder.findFirst({
            where: {
                schoolId: school.id,
                parentId: codingFilesFolder.id,
                name: { equals: 'Python', mode: 'insensitive' }
            }
        });

        if (!pythonFolder) {
            // Check if there was an unparented "Python" or "My Python Files" folder
            const oldPyFolder = await prisma.documentFolder.findFirst({
                where: {
                    schoolId: school.id,
                    parentId: null,
                    OR: [
                        { name: { equals: 'Python', mode: 'insensitive' } },
                        { name: { equals: 'My Python Files', mode: 'insensitive' } }
                    ]
                }
            });

            if (oldPyFolder) {
                pythonFolder = await prisma.documentFolder.update({
                    where: { id: oldPyFolder.id },
                    data: {
                        name: 'Python',
                        parentId: codingFilesFolder.id
                    }
                });
                console.log(`  📂 Nested existing folder into "Coding files / Python" (${pythonFolder.id})`);
            } else {
                pythonFolder = await prisma.documentFolder.create({
                    data: {
                        schoolId: school.id,
                        name: 'Python',
                        parentId: codingFilesFolder.id,
                        createdById: ownerId
                    }
                });
                console.log(`  📂 Created Subfolder: "Coding files / Python" (${pythonFolder.id})`);
            }
        } else {
            console.log(`  📂 Found Subfolder: "Coding files / Python" (${pythonFolder.id})`);
        }

        // 3. Ensure Subfolder: "SQL" under "Coding files"
        let sqlFolder = await prisma.documentFolder.findFirst({
            where: {
                schoolId: school.id,
                parentId: codingFilesFolder.id,
                name: { equals: 'SQL', mode: 'insensitive' }
            }
        });

        if (!sqlFolder) {
            const oldSqlFolder = await prisma.documentFolder.findFirst({
                where: {
                    schoolId: school.id,
                    parentId: null,
                    OR: [
                        { name: { equals: 'SQL', mode: 'insensitive' } },
                        { name: { equals: 'My SQL Files', mode: 'insensitive' } }
                    ]
                }
            });

            if (oldSqlFolder) {
                sqlFolder = await prisma.documentFolder.update({
                    where: { id: oldSqlFolder.id },
                    data: {
                        name: 'SQL',
                        parentId: codingFilesFolder.id
                    }
                });
                console.log(`  📂 Nested existing folder into "Coding files / SQL" (${sqlFolder.id})`);
            } else {
                sqlFolder = await prisma.documentFolder.create({
                    data: {
                        schoolId: school.id,
                        name: 'SQL',
                        parentId: codingFilesFolder.id,
                        createdById: ownerId
                    }
                });
                console.log(`  📂 Created Subfolder: "Coding files / SQL" (${sqlFolder.id})`);
            }
        } else {
            console.log(`  📂 Found Subfolder: "Coding files / SQL" (${sqlFolder.id})`);
        }

        // 4. Move all Python files into "Coding files / Python"
        const pythonDocs = await prisma.document.findMany({
            where: {
                schoolId: school.id,
                deletedAt: null,
                OR: [
                    { name: { endsWith: '.py', mode: 'insensitive' } },
                    { fileName: { endsWith: '.py', mode: 'insensitive' } },
                    { category: 'python' }
                ]
            }
        });

        let movedPyCount = 0;
        for (const doc of pythonDocs) {
            if (doc.folderId !== pythonFolder.id) {
                await prisma.document.update({
                    where: { id: doc.id },
                    data: {
                        folderId: pythonFolder.id,
                        category: 'code'
                    }
                });
                movedPyCount++;
            }
        }
        console.log(`  🐍 Moved ${movedPyCount} Python scripts into "Coding files / Python"`);

        // 5. Move all SQL files into "Coding files / SQL"
        const sqlDocs = await prisma.document.findMany({
            where: {
                schoolId: school.id,
                deletedAt: null,
                OR: [
                    { name: { endsWith: '.sql', mode: 'insensitive' } },
                    { fileName: { endsWith: '.sql', mode: 'insensitive' } },
                    { category: 'sql' }
                ]
            }
        });

        let movedSqlCount = 0;
        for (const doc of sqlDocs) {
            if (doc.folderId !== sqlFolder.id) {
                await prisma.document.update({
                    where: { id: doc.id },
                    data: {
                        folderId: sqlFolder.id,
                        category: 'code'
                    }
                });
                movedSqlCount++;
            }
        }
        console.log(`  🗄️ Moved ${movedSqlCount} SQL scripts into "Coding files / SQL"`);

        // 6. Cloudinary Synchronization for all code documents
        const allCodeDocs = [...pythonDocs, ...sqlDocs];
        let syncedCloudCount = 0;

        for (const doc of allCodeDocs) {
            const isLocalOnly = !doc.url || doc.url.startsWith('/uploads/') || doc.cloudinaryId?.startsWith('local_');
            if (isLocalOnly && cloudinary.isConfigured()) {
                let fileBuffer = null;
                const candidateBasename = path.basename(doc.url || doc.fileName || doc.name);
                const localPath = path.join(uploadsDir, candidateBasename);

                if (fs.existsSync(localPath) && fs.statSync(localPath).size > 0) {
                    fileBuffer = fs.readFileSync(localPath);
                }

                // If local file was missing or empty, build clean starter code buffer so it is never blank
                if (!fileBuffer || fileBuffer.length === 0) {
                    const isSql = doc.name?.endsWith('.sql') || doc.fileName?.endsWith('.sql');
                    const cleanName = doc.name || doc.fileName || (isSql ? 'query.sql' : 'program.py');
                    const starter = isSql
                        ? `-- ===============================================================\n-- Script: ${cleanName}\n-- Created: ${new Date(doc.createdAt).toLocaleDateString()}\n-- Ready for SQL queries\n-- ===============================================================\n\n`
                        : `\"\"\"\n===============================================================\nScript: ${cleanName}\nCreated: ${new Date(doc.createdAt).toLocaleDateString()}\nReady for Python code\n===============================================================\n\"\"\"\n\n`;
                    fileBuffer = Buffer.from(starter, 'utf8');
                    fs.writeFileSync(localPath, fileBuffer);
                }

                try {
                    const result = await cloudinary.uploadFile(
                        fileBuffer,
                        doc.fileName || doc.name,
                        doc.mimeType || 'text/plain'
                    );

                    if (result && (result.secureUrl || result.url)) {
                        await prisma.document.update({
                            where: { id: doc.id },
                            data: {
                                url: result.secureUrl || result.url,
                                cloudinaryId: result.publicId,
                                fileSize: fileBuffer.length
                            }
                        });
                        syncedCloudCount++;
                        console.log(`    ☁️ Synced to Cloudinary: "${doc.name}" -> ${result.secureUrl}`);
                    }
                } catch (upErr) {
                    console.warn(`    ⚠️ Cloudinary upload warning for "${doc.name}":`, upErr.message);
                }
            }
        }
        console.log(`  ☁️ Cloud-synced ${syncedCloudCount} code scripts to Cloudinary`);
    }

    console.log('\n===============================================================');
    console.log('Institutional Reorganization and Cloud Sync Completed Successfully');
    console.log('===============================================================\n');
}

reorganize()
    .catch((err) => {
        console.error('Fatal Reorganization Error:', err);
    })
    .finally(() => {
        prisma.$disconnect();
    });
