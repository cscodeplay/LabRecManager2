const prisma = require('../server/src/config/database');

async function main() {
    console.log('[Link Training] Starting DBMS Training Module update & class assignment...');

    // 1. Process School 1 (Gemini AI School / DPS)
    const school1Id = '00000001-0000-0000-0000-000000000001';
    const activeYear1Id = '216c2d16-6928-48b3-886c-0747db571955'; // 2026-27 active
    const adminUser1 = await prisma.user.findFirst({
        where: { schoolId: school1Id, role: { in: ['admin', 'principal', 'instructor'] } }
    });
    const subject1 = await prisma.subject.findFirst({
        where: { schoolId: school1Id, name: { contains: 'Computer' } }
    }) || await prisma.subject.findFirst({ where: { schoolId: school1Id } });

    console.log(`[Link Training] School 1: Subject=${subject1?.name} (${subject1?.id}), Admin=${adminUser1?.email}`);

    const mod1 = await prisma.trainingModule.findFirst({
        where: { schoolId: school1Id, title: { contains: 'Database Management System' } }
    });

    if (mod1) {
        // Update academicYearId to current active year & ensure published
        await prisma.trainingModule.update({
            where: { id: mod1.id },
            data: {
                academicYearId: activeYear1Id,
                isPublished: true
            }
        });
        console.log(`[Link Training] Updated School 1 Module (${mod1.id}): set academicYearId=${activeYear1Id}, isPublished=true`);

        // Create or update Assignment
        let assign1 = await prisma.assignment.findFirst({
            where: { trainingModuleId: mod1.id }
        });

        if (!assign1 && subject1 && adminUser1) {
            assign1 = await prisma.assignment.create({
                data: {
                    schoolId: school1Id,
                    subjectId: subject1.id,
                    createdById: adminUser1.id,
                    title: 'Training: Database Management System (Class 11)',
                    description: 'Master Database Management System: Hierarchy, Architecture, DBLC, and Characteristics.',
                    aim: 'Complete all interactive units and exercises in Database Management System',
                    assignmentType: 'training_module',
                    status: 'published',
                    academicYearId: activeYear1Id,
                    trainingModuleId: mod1.id,
                    maxMarks: 100,
                    passingMarks: 40,
                    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });
            console.log(`[Link Training] Created new Assignment (${assign1.id}) for module ${mod1.id}`);
        } else if (assign1) {
            await prisma.assignment.update({
                where: { id: assign1.id },
                data: {
                    academicYearId: activeYear1Id,
                    status: 'published'
                }
            });
            console.log(`[Link Training] Updated existing Assignment (${assign1.id})`);
        }

        // Link targets to all classes and groups
        if (assign1 && adminUser1) {
            const classes1 = await prisma.class.findMany({ where: { schoolId: school1Id } });
            console.log(`[Link Training] Found ${classes1.length} classes in School 1`);
            for (const cls of classes1) {
                const existing = await prisma.assignmentTarget.findFirst({
                    where: { assignmentId: assign1.id, targetType: 'class', targetClassId: cls.id }
                });
                if (!existing) {
                    await prisma.assignmentTarget.create({
                        data: {
                            assignmentId: assign1.id,
                            targetType: 'class',
                            targetClassId: cls.id,
                            assignedById: adminUser1.id
                        }
                    });
                }
            }

            const groups1 = await prisma.studentGroup.findMany({ where: { class: { schoolId: school1Id } } });
            console.log(`[Link Training] Found ${groups1.length} groups in School 1`);
            for (const grp of groups1) {
                const existing = await prisma.assignmentTarget.findFirst({
                    where: { assignmentId: assign1.id, targetType: 'group', targetGroupId: grp.id }
                });
                if (!existing) {
                    await prisma.assignmentTarget.create({
                        data: {
                            assignmentId: assign1.id,
                            targetType: 'group',
                            targetGroupId: grp.id,
                            assignedById: adminUser1.id
                        }
                    });
                }
            }
        }
    }

    // 2. Process School 2 (St. Xavier)
    const school2Id = '00000001-0000-0000-0000-000000000002';
    const activeYear2Id = 'e003654c-ec5b-40d4-9d59-bddc1af95dc4'; // 2026-27 active
    const adminUser2 = await prisma.user.findFirst({
        where: { schoolId: school2Id, role: { in: ['admin', 'principal', 'instructor'] } }
    });
    let subject2 = await prisma.subject.findFirst({
        where: { schoolId: school2Id }
    });
    if (!subject2) {
        subject2 = await prisma.subject.create({
            data: {
                schoolId: school2Id,
                name: 'Computer Science',
                code: 'CS-STX'
            }
        });
    }

    const mod2 = await prisma.trainingModule.findFirst({
        where: { schoolId: school2Id, title: { contains: 'Database Management System' } }
    });

    if (mod2) {
        await prisma.trainingModule.update({
            where: { id: mod2.id },
            data: {
                academicYearId: activeYear2Id,
                isPublished: true
            }
        });
        console.log(`[Link Training] Updated School 2 Module (${mod2.id}): set academicYearId=${activeYear2Id}, isPublished=true`);

        let assign2 = await prisma.assignment.findFirst({
            where: { trainingModuleId: mod2.id }
        });

        if (!assign2 && subject2 && adminUser2) {
            assign2 = await prisma.assignment.create({
                data: {
                    schoolId: school2Id,
                    subjectId: subject2.id,
                    createdById: adminUser2.id,
                    title: 'Training: Database Management System (Class 11)',
                    description: 'Master Database Management System: Hierarchy, Architecture, DBLC, and Characteristics.',
                    aim: 'Complete all interactive units and exercises in Database Management System',
                    assignmentType: 'training_module',
                    status: 'published',
                    academicYearId: activeYear2Id,
                    trainingModuleId: mod2.id,
                    maxMarks: 100,
                    passingMarks: 40,
                    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });
            console.log(`[Link Training] Created new Assignment (${assign2.id}) for School 2 module`);
        }
    }

    console.log('[Link Training] ✅ All DBMS training modules successfully updated and assigned!');
}

main()
    .catch((e) => {
        console.error('[Link Training] Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
