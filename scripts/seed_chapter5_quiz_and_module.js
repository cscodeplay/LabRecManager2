const fs = require('fs');
const path = require('path');
const prisma = require('../server/src/config/database');

async function main() {
    console.log('[Seed] Loading Chapter 5 quiz and training module data...');
    const rawData = fs.readFileSync(path.join(__dirname, '../RAG/chapter5_training_module_and_quiz.json'), 'utf8');
    const data = JSON.parse(rawData);

    const schools = await prisma.school.findMany({ select: { id: true, name: true } });
    console.log(`[Seed] Found ${schools.length} schools:`, schools.map(s => `${s.name} (${s.id})`));

    for (const school of schools) {
        console.log(`\n======================================================`);
        console.log(`[Seed] Processing for school: ${school.name} (${school.id})`);
        console.log(`======================================================`);

        // Find an admin or principal user for this school
        const adminUser = await prisma.user.findFirst({
            where: {
                schoolId: school.id,
                role: { in: ['admin', 'principal', 'instructor'] }
            }
        });
        const creatorId = adminUser ? adminUser.id : null;
        console.log(`[Seed] Creator user: ${adminUser ? adminUser.email : 'None'} (${creatorId})`);

        // Find active academic year
        const academicYear = await prisma.academicYear.findFirst({
            where: { schoolId: school.id }
        });
        const academicYearId = academicYear ? academicYear.id : null;
        console.log(`[Seed] Academic year: ${academicYear ? academicYear.name : 'None'} (${academicYearId})`);

        // -------------------------------------------------------------------
        // 1. SEED DBMS QUIZ
        // -------------------------------------------------------------------
        const quizCode = school.id.startsWith('00000001-0000-0000-0000-000000000001') ? 'DBMS05' : 'DBMSX5';
        
        // Check if quiz already exists
        const existingQuiz = await prisma.quiz.findFirst({
            where: {
                OR: [
                    { code: quizCode },
                    { title: data.quizData.title, schoolId: school.id }
                ]
            }
        });

        let seededQuiz;
        if (existingQuiz) {
            console.log(`[Seed] Updating existing Quiz: ${existingQuiz.title} (code: ${existingQuiz.code})`);
            seededQuiz = await prisma.quiz.update({
                where: { id: existingQuiz.id },
                data: {
                    title: data.quizData.title,
                    description: data.quizData.description,
                    keywords: data.quizData.keywords,
                    difficulty: data.quizData.difficulty,
                    totalQuestions: data.quizData.totalQuestions,
                    timeLimitMinutes: data.quizData.timeLimitMinutes,
                    maxAttempts: data.quizData.maxAttempts,
                    questions: data.quizData.questions,
                    status: 'published',
                    schoolId: school.id,
                    createdById: creatorId
                }
            });
        } else {
            console.log(`[Seed] Creating new Quiz with code ${quizCode}...`);
            seededQuiz = await prisma.quiz.create({
                data: {
                    code: quizCode,
                    title: data.quizData.title,
                    description: data.quizData.description,
                    keywords: data.quizData.keywords,
                    difficulty: data.quizData.difficulty,
                    totalQuestions: data.quizData.totalQuestions,
                    timeLimitMinutes: data.quizData.timeLimitMinutes,
                    maxAttempts: data.quizData.maxAttempts,
                    questions: data.quizData.questions,
                    status: 'published',
                    schoolId: school.id,
                    createdById: creatorId
                }
            });
        }
        console.log(`[Seed] ✅ Quiz ready: id=${seededQuiz.id}, code=${seededQuiz.code}, title="${seededQuiz.title}"`);

        // Assign quiz to classes so students also see it
        const classes = await prisma.class.findMany({
            where: { schoolId: school.id },
            select: { id: true, name: true }
        });
        if (creatorId && classes.length > 0) {
            for (const cls of classes) {
                const existingAssignment = await prisma.quizAssignment.findFirst({
                    where: { quizId: seededQuiz.id, targetClassId: cls.id }
                });
                if (!existingAssignment) {
                    try {
                        await prisma.quizAssignment.create({
                            data: {
                                quiz: { connect: { id: seededQuiz.id } },
                                assignedBy: { connect: { id: creatorId } },
                                targetType: 'class',
                                class: { connect: { id: cls.id } }
                            }
                        });
                    } catch (assignErr) {
                        console.warn(`[Seed] Notice on QuizAssignment for class ${cls.name}:`, assignErr.message);
                    }
                }
            }
            console.log(`[Seed] ✅ Quiz assignment check completed for ${classes.length} classes.`);
        }

        // -------------------------------------------------------------------
        // 2. SEED TRAINING MODULE
        // -------------------------------------------------------------------
        const moduleMeta = data.trainingModule;
        const existingModule = await prisma.trainingModule.findFirst({
            where: {
                title: moduleMeta.title,
                schoolId: school.id
            }
        });

        let seededModule;
        if (existingModule) {
            console.log(`[Seed] Updating existing Training Module: id=${existingModule.id}`);
            // Delete old units to refresh cleanly
            await prisma.trainingUnit.deleteMany({
                where: { moduleId: existingModule.id }
            });

            seededModule = await prisma.trainingModule.update({
                where: { id: existingModule.id },
                data: {
                    titleHindi: moduleMeta.titleHindi,
                    description: moduleMeta.description,
                    language: moduleMeta.language,
                    boardAligned: moduleMeta.boardAligned,
                    classLevel: moduleMeta.classLevel,
                    totalUnits: moduleMeta.totalUnits,
                    totalExercises: moduleMeta.totalExercises,
                    isPublished: true,
                    pedagogyConfig: moduleMeta.pedagogyConfig,
                    academicYearId: academicYearId
                }
            });
        } else {
            console.log(`[Seed] Creating new Training Module "${moduleMeta.title}"...`);
            seededModule = await prisma.trainingModule.create({
                data: {
                    schoolId: school.id,
                    title: moduleMeta.title,
                    titleHindi: moduleMeta.titleHindi,
                    description: moduleMeta.description,
                    language: moduleMeta.language,
                    boardAligned: moduleMeta.boardAligned,
                    classLevel: moduleMeta.classLevel,
                    totalUnits: moduleMeta.totalUnits,
                    totalExercises: moduleMeta.totalExercises,
                    isPublished: true,
                    pedagogyConfig: moduleMeta.pedagogyConfig,
                    academicYearId: academicYearId
                }
            });
        }

        // Insert Units and Exercises
        for (const unitData of moduleMeta.units) {
            const unit = await prisma.trainingUnit.create({
                data: {
                    moduleId: seededModule.id,
                    unitNumber: unitData.unitNumber,
                    title: unitData.title,
                    description: unitData.description,
                    expectedHours: unitData.expectedHours,
                    unlockThreshold: unitData.unlockThreshold,
                    sequenceOrder: unitData.sequenceOrder
                }
            });

            console.log(`  [Seed] -> Created Unit ${unit.unitNumber}: ${unit.title}`);

            for (let eIdx = 0; eIdx < unitData.exercises.length; eIdx++) {
                const ex = unitData.exercises[eIdx];
                await prisma.trainingExercise.create({
                    data: {
                        unitId: unit.id,
                        title: ex.title,
                        description: ex.description,
                        difficulty: ex.difficulty,
                        scaffoldLevel: ex.scaffoldLevel,
                        exerciseType: ex.exerciseType,
                        bloomsLevel: ex.bloomsLevel,
                        starterCode: ex.starterCode || null,
                        solutionCode: ex.solutionCode || null,
                        sequenceOrder: eIdx + 1,
                        xpReward: ex.xpReward || 15
                    }
                });
            }
            console.log(`  [Seed]    Inserted ${unitData.exercises.length} exercises.`);
        }
        console.log(`[Seed] ✅ Training Module ready: id=${seededModule.id}, title="${seededModule.title}"`);

        // Create assignment for classes so students can access the module as well
        if (creatorId && classes.length > 0) {
            for (const cls of classes) {
                const existingAssign = await prisma.assignment.findFirst({
                    where: { trainingModuleId: seededModule.id, schoolId: school.id }
                });
                if (!existingAssign) {
                    try {
                        const newAssign = await prisma.assignment.create({
                            data: {
                                schoolId: school.id,
                                trainingModuleId: seededModule.id,
                                title: `DBMS Module Assignment - Class ${cls.name}`,
                                createdById: creatorId,
                                totalPoints: 100
                            }
                        });
                        await prisma.assignmentTarget.create({
                            data: {
                                assignment: { connect: { id: newAssign.id } },
                                assignedBy: { connect: { id: creatorId } },
                                targetType: 'class',
                                targetClassId: cls.id
                            }
                        });
                    } catch (targetErr) {
                        console.warn(`[Seed] Notice on Assignment for class ${cls.name}:`, targetErr.message);
                    }
                }
            }
            console.log(`[Seed] ✅ Training Module assignment check completed.`);
        }
    }

    console.log('\n[Seed] 🎉 All DBMS Quizzes and Training Modules successfully seeded into the database!');
}

main()
    .catch((e) => {
        console.error('[Seed] Error seeding data:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
