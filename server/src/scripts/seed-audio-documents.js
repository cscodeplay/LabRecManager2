const prisma = require('../config/database');

async function seedAudioDocuments() {
    console.log('[Seed] Starting Audio Folder & Documents seeding for all schools...');

    const schools = await prisma.school.findMany();
    if (!schools || schools.length === 0) {
        console.error('[Seed] No schools found!');
        return;
    }

    const audioFiles = [
        {
            name: 'Thermodynamics Lecture - Samantha (Educator Voice)',
            description: '4-5 line natural voice lecture sample on Thermodynamics by Samantha (US English, articulate teaching tone).',
            fileName: 'thermo_samantha.wav',
            fileType: 'wav',
            mimeType: 'audio/wav',
            fileSize: 1752014,
            cloudinaryId: 'local_thermo_samantha_wav',
            url: '/uploads/audio/thermo_samantha.wav',
            category: 'audio'
        },
        {
            name: 'Thermodynamics Lecture - Daniel (Academic British Voice)',
            description: '4-5 line natural voice lecture sample on Thermodynamics by Daniel (UK English, academic depth and resonance).',
            fileName: 'thermo_daniel.wav',
            fileType: 'wav',
            mimeType: 'audio/wav',
            fileSize: 1839522,
            cloudinaryId: 'local_thermo_daniel_wav',
            url: '/uploads/audio/thermo_daniel.wav',
            category: 'audio'
        },
        {
            name: 'Thermodynamics Lecture - Rishi (Indian English Voice)',
            description: '4-5 line natural voice lecture sample on Thermodynamics by Rishi (Indian English, expressive educator tone).',
            fileName: 'thermo_rishi.wav',
            fileType: 'wav',
            mimeType: 'audio/wav',
            fileSize: 1905748,
            cloudinaryId: 'local_thermo_rishi_wav',
            url: '/uploads/audio/thermo_rishi.wav',
            category: 'audio'
        },
        {
            name: 'Thermodynamics Lecture (Compressed) - Samantha',
            description: 'Optimized AAC/M4A natural voice lecture sample on Thermodynamics by Samantha.',
            fileName: 'thermo_samantha.m4a',
            fileType: 'm4a',
            mimeType: 'audio/mp4',
            fileSize: 170786,
            cloudinaryId: 'local_thermo_samantha_m4a',
            url: '/uploads/audio/thermo_samantha.m4a',
            category: 'audio'
        },
        {
            name: 'Thermodynamics Lecture (Compressed) - Daniel',
            description: 'Optimized AAC/M4A natural voice lecture sample on Thermodynamics by Daniel.',
            fileName: 'thermo_daniel.m4a',
            fileType: 'm4a',
            mimeType: 'audio/mp4',
            fileSize: 179261,
            cloudinaryId: 'local_thermo_daniel_m4a',
            url: '/uploads/audio/thermo_daniel.m4a',
            category: 'audio'
        },
        {
            name: 'Thermodynamics Lecture (Compressed) - Rishi',
            description: 'Optimized AAC/M4A natural voice lecture sample on Thermodynamics by Rishi.',
            fileName: 'thermo_rishi.m4a',
            fileType: 'm4a',
            mimeType: 'audio/mp4',
            fileSize: 183898,
            cloudinaryId: 'local_thermo_rishi_m4a',
            url: '/uploads/audio/thermo_rishi.m4a',
            category: 'audio'
        }
    ];

    for (const school of schools) {
        console.log(`\n========================================`);
        console.log(`[Seed] Processing School: ${school.name} (${school.id})`);

        const adminUser = await prisma.user.findFirst({
            where: {
                schoolId: school.id,
                role: { in: ['admin', 'principal'] }
            }
        });

        if (!adminUser) {
            console.warn(`[Seed] No admin found for school ${school.name}, skipping`);
            continue;
        }

        console.log(`[Seed] Using Admin: ${adminUser.firstName} (${adminUser.id})`);

        // Check or create Audio folder
        let audioFolder = await prisma.documentFolder.findFirst({
            where: {
                schoolId: school.id,
                name: { in: ['Audio', 'Audio & Lecture Recordings'], mode: 'insensitive' },
                deletedAt: null
            }
        });

        if (!audioFolder) {
            audioFolder = await prisma.documentFolder.create({
                data: {
                    schoolId: school.id,
                    createdById: adminUser.id,
                    parentId: null,
                    name: 'Audio'
                }
            });
            console.log(`[Seed] Created 'Audio' folder (${audioFolder.id})`);
        } else {
            console.log(`[Seed] Found existing 'Audio' folder (${audioFolder.id})`);
        }

        // Insert or update documents
        for (const item of audioFiles) {
            const existingDoc = await prisma.document.findFirst({
                where: {
                    schoolId: school.id,
                    folderId: audioFolder.id,
                    fileName: item.fileName,
                    deletedAt: null
                }
            });

            if (existingDoc) {
                console.log(`[Seed] Document exists: ${item.name} (${existingDoc.id})`);
                await prisma.document.update({
                    where: { id: existingDoc.id },
                    data: {
                        name: item.name,
                        description: item.description,
                        fileType: item.fileType,
                        mimeType: item.mimeType,
                        fileSize: item.fileSize,
                        url: item.url,
                        category: item.category,
                        isPublic: true
                    }
                });
            } else {
                const createdDoc = await prisma.document.create({
                    data: {
                        schoolId: school.id,
                        uploadedById: adminUser.id,
                        folderId: audioFolder.id,
                        name: item.name,
                        description: item.description,
                        fileName: item.fileName,
                        fileType: item.fileType,
                        mimeType: item.mimeType,
                        fileSize: item.fileSize,
                        cloudinaryId: item.cloudinaryId,
                        url: item.url,
                        isPublic: true,
                        category: item.category
                    }
                });
                console.log(`[Seed] Inserted Document: ${item.name} (${createdDoc.id})`);
            }
        }
    }

    console.log('\n[Seed] Finished seeding Audio folder and documents across all schools!');
}

seedAudioDocuments()
    .catch((err) => {
        console.error('[Seed Error]:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
