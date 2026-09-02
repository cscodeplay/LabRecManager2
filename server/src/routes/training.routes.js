const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const { spawnSync } = require('child_process');
const aiService = require('../services/ai.service');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * AI Socratic Review Function
 */
async function evaluateStudentCodeWithAI(code, problemStatement, failedCases) {
    if (!process.env.GEMINI_API_KEY) return "AI Assessor is not configured (Missing API Key).";
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `
        You are an expert AI Computer Science tutor. The student submitted the following code:
        \`\`\`
        ${code}
        \`\`\`
        
        The Problem Statement was:
        ${problemStatement}
        
        The following test cases failed:
        ${JSON.stringify(failedCases, null, 2)}
        
        Analyze the student's code and evaluate if their approach is logically close (partially correct) but failed on an edge case, or if it is completely wrong. 
        Provide a JSON response with the following schema:
        {
          "isPartiallyCorrect": true|false,
          "socraticFeedback": "String: Write a hint as a question to push the student to realize their mistake without directly giving them the answer.",
          "suggestedEdgeCases": [{"input": "...", "expectedOutput": "..."}] 
        }
        Do not wrap the JSON in markdown formatting backticks if possible, ensure it parses validly.
        `;

        const result = await model.generateContent(prompt);
        let out = result.response.text();
        // clean formatting
        out = out.replace(/```json/gi, '').replace(/```/gi, '').trim();
        return JSON.parse(out);
    } catch (e) {
        console.error("AI Evaluation error:", e);
        return null;
    }
}

/**
 * Helper to run Python code with local python3 sandbox and Wandbox fallback
 */
async function executePythonCode(code, input = '') {
    let inputStr = '';
    if (Array.isArray(input)) {
        inputStr = input.map(x => (x !== null && x !== undefined) ? String(x) : '').join('\n') + '\n';
    } else if (typeof input === 'string') {
        inputStr = input.replace(/\r\n/g, '\n');
        if (inputStr && !inputStr.endsWith('\n')) {
            inputStr += '\n';
        }
    } else if (input !== undefined && input !== null) {
        inputStr = String(input) + '\n';
    }
    
    // 1. Try local python3 execution first for high speed and reliability
    try {
        const proc = spawnSync('python3', ['-c', code], {
            input: inputStr,
            encoding: 'utf8',
            timeout: 6000
        });

        if (proc.stdout !== null || proc.stderr !== null) {
            return {
                stdout: proc.stdout || '',
                stderr: proc.stderr || (proc.error ? proc.error.message : ''),
                code: proc.status !== null ? proc.status : (proc.error ? 1 : 0)
            };
        }
    } catch (localErr) {
        console.warn('[Training Sandbox] Local python3 fallback to Wandbox:', localErr.message);
    }

    // 2. Fallback to Wandbox API
    try {
        const response = await axios.post('https://wandbox.org/api/compile.json', {
            compiler: 'cpython-3.11.10',
            code: code,
            stdin: inputStr
        }, { timeout: 8000 });
        
        return {
            stdout: response.data.program_message || response.data.program_output || '',
            stderr: response.data.program_error || response.data.compiler_error || '',
            code: parseInt(response.data.status || 0, 10)
        };
    } catch (err) {
        console.error('[Training Sandbox] Code execution error:', err.message);
        throw new Error('Failed to execute code sandbox: ' + (err.message || 'Execution error'));
    }
}

/**
 * @route   GET /api/training/modules
 * @desc    Get all available training modules (assigned to the current user's class, or all for admin)
 * @access  Private
 */
router.get('/modules', authenticate, asyncHandler(async (req, res) => {
    const isAdmin = ['admin', 'principal', 'instructor'].includes(req.user.role);
    let where = { schoolId: req.user.schoolId };
    // Students only see published modules; admins see all (draft + published)
    if (!isAdmin) {
        where.isPublished = true;
    }
    
    // Filter by academic session if provided via header from client interceptor
    const sessionId = req.headers['x-academic-session'];
    if (sessionId) {
        where.OR = [
            { academicYearId: sessionId },
            { academicYearId: null }
        ];
    }

    const modules = await prisma.trainingModule.findMany({
        where,
        include: {
            _count: { select: { units: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    res.json({
        success: true,
        data: { modules }
    });
}));

/**
 * @route   GET /api/training/modules/:id
 * @desc    Get detailed module structure and student progress
 * @access  Private
 */
router.get('/modules/:id', authenticate, asyncHandler(async (req, res) => {
    const moduleId = req.params.id;

    const isAdmin = ['admin', 'principal', 'instructor'].includes(req.user.role);

    // Admin/instructor sees full exercise data for the builder; students see summary
    const exerciseSelect = isAdmin
        ? {
            id: true, title: true, description: true, difficulty: true,
            scaffoldLevel: true, bloomsLevel: true, learningObjective: true,
            isReviewExercise: true, xpReward: true, exerciseType: true,
            starterCode: true, solutionCode: true, testCases: true, hints: true,
            timeLimit: true, sequenceOrder: true
          }
        : {
            id: true, title: true, difficulty: true, description: true,
            scaffoldLevel: true, isReviewExercise: true, xpReward: true,
            exerciseType: true, sequenceOrder: true
          };

    const moduleDetails = await prisma.trainingModule.findUnique({
        where: { id: moduleId },
        include: {
            units: {
                orderBy: { sequenceOrder: 'asc' },
                include: {
                    exercises: {
                        orderBy: { sequenceOrder: 'asc' },
                        select: exerciseSelect
                    }
                }
            }
        }
    });

    if (!moduleDetails) {
        return res.status(404).json({ success: false, message: 'Module not found' });
    }

    // Get student/user progress
    let progress = null;
    let unitMasteries = [];
    
    if (req.user?.id) {
        progress = await prisma.studentTrainingProgress.findUnique({
            where: {
                studentId_moduleId: {
                    studentId: req.user.id,
                    moduleId: moduleId
                }
            }
        });

        const unitIds = moduleDetails.units.map(u => u.id);
        const allExerciseIds = moduleDetails.units.flatMap(u => u.exercises.map(e => e.id));

        // Fetch user's submissions for all exercises in this module
        const userSubmissions = await prisma.codingSubmission.findMany({
            where: {
                studentId: req.user.id,
                exerciseId: { in: allExerciseIds }
            },
            orderBy: { submittedAt: 'desc' },
            select: {
                exerciseId: true,
                status: true,
                submittedAt: true
            }
        });

        const exerciseStatusMap = {};
        for (const sub of userSubmissions) {
            if (!exerciseStatusMap[sub.exerciseId]) {
                exerciseStatusMap[sub.exerciseId] = {
                    status: sub.status,
                    lastSubmittedAt: sub.submittedAt,
                    hasPassed: sub.status === 'passed'
                };
            } else if (sub.status === 'passed') {
                exerciseStatusMap[sub.exerciseId].hasPassed = true;
            }
        }

        // Attach userStatus to each exercise
        moduleDetails.units.forEach(u => {
            u.exercises.forEach(e => {
                const subInfo = exerciseStatusMap[e.id];
                e.userStatus = subInfo?.hasPassed ? 'passed' : subInfo ? subInfo.status : 'unvisited';
            });
        });

        unitMasteries = await prisma.studentUnitMastery.findMany({
            where: {
                studentId: req.user.id,
                unitId: { in: unitIds }
            }
        });
    }

    res.json({
        success: true,
        data: {
            module: moduleDetails,
            progress,
            unitMasteries
        }
    });
}));

// ==========================================
// BUILDER APIs (Admin/Instructor Only)
// ==========================================

/**
 * @route   POST /api/training/modules
 * @desc    Create a new training module
 * @access  Private (Admin/Instructor)
 */
router.post('/modules', authenticate, authorize('admin', 'principal', 'instructor'), [
    body('title').notEmpty().withMessage('Title is required'),
    body('language').notEmpty().withMessage('Language is required'),
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, titleHindi, description, language, boardAligned, classLevel } = req.body;
    const sessionId = req.headers['x-academic-session'];

    const newModule = await prisma.trainingModule.create({
        data: {
            schoolId: req.user.schoolId,
            academicYearId: sessionId || null,
            title,
            titleHindi,
            description,
            language,
            boardAligned,
            classLevel: classLevel ? parseInt(classLevel) : null,
            isPublished: false // By default unpublished
        }
    });

    res.status(201).json({ success: true, data: { module: newModule } });
}));

/**
 * @route   POST /api/training/modules/:id/units
 * @desc    Create a new unit for a module
 * @access  Private
 */
router.post('/modules/:id/units', authenticate, authorize('admin', 'principal', 'instructor'), [
    body('title').notEmpty().withMessage('Title is required'),
    body('unitNumber').isNumeric().withMessage('Unit number is required'),
    body('unlockThreshold').isNumeric().withMessage('Unlock threshold is required')
], asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, unitNumber, expectedHours, unlockThreshold, sequenceOrder } = req.body;

    const unit = await prisma.trainingUnit.create({
        data: {
            moduleId: id,
            title,
            description,
            unitNumber: parseInt(unitNumber),
            expectedHours: expectedHours ? parseInt(expectedHours) : null,
            unlockThreshold: parseInt(unlockThreshold),
            sequenceOrder: sequenceOrder ? parseInt(sequenceOrder) : parseInt(unitNumber)
        }
    });

    // Update totalUnits count
    await prisma.trainingModule.update({
        where: { id },
        data: { totalUnits: { increment: 1 } }
    });

    res.status(201).json({ success: true, data: { unit } });
}));

/**
 * @route   POST /api/training/units/:id/exercises
 * @desc    Create a new exercise
 * @access  Private
 */
router.post('/units/:id/exercises', authenticate, authorize('admin', 'principal', 'instructor'), [
    body('title').notEmpty().withMessage('Title is required'),
    body('scaffoldLevel').notEmpty().withMessage('Scaffold level is required')
], asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Find module to update total exercises count
    const unit = await prisma.trainingUnit.findUnique({
        where: { id }, select: { moduleId: true }
    });
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });

    const exercise = await prisma.trainingExercise.create({
        data: {
            unitId: id,
            title: req.body.title,
            description: req.body.description || '',
            difficulty: req.body.difficulty || 'beginner',
            scaffoldLevel: req.body.scaffoldLevel,
            bloomsLevel: req.body.bloomsLevel || null,
            learningObjective: req.body.learningObjective || null,
            isReviewExercise: req.body.isReviewExercise || false,
            reviewsTopicId: req.body.reviewsTopicId || null,
            starterCode: req.body.starterCode || '',
            solutionCode: req.body.solutionCode || '',
            testCases: req.body.testCases ? (typeof req.body.testCases === 'string' ? JSON.parse(req.body.testCases) : req.body.testCases) : [],
            hints: req.body.hints ? (typeof req.body.hints === 'string' ? JSON.parse(req.body.hints) : req.body.hints) : [],
            timeLimit: parseInt(req.body.timeLimit) || 5,
            sequenceOrder: parseInt(req.body.sequenceOrder) || 1,
            xpReward: parseInt(req.body.xpReward) || 10
        }
    });

    await prisma.trainingModule.update({
        where: { id: unit.moduleId },
        data: { totalExercises: { increment: 1 } }
    });

    res.status(201).json({ success: true, data: { exercise } });
}));

/**
 * @route   GET /api/training/exercises/:id
 * @desc    Get specific exercise data for the editor / multi-modal player
 * @access  Private
 */
router.get('/exercises/:id', authenticate, asyncHandler(async (req, res) => {
    const exercise = await prisma.trainingExercise.findUnique({
        where: { id: req.params.id },
        include: {
            unit: { 
                select: { 
                    moduleId: true, 
                    unlockThreshold: true,
                    module: { select: { language: true } }
                } 
            }
        }
    });

    if (!exercise) return res.status(404).json({ success: false, message: 'Exercise not found' });

    const exerciseType = exercise.exerciseType || 'coding';

    // Hide solution answers from students before submission
    if (req.user.role === 'student') {
        exercise.solutionCode = undefined;
        
        if (exerciseType === 'coding' || exerciseType === 'bug_fix') {
            if (Array.isArray(exercise.testCases)) {
                exercise.testCases = exercise.testCases.map(tc => {
                    if (tc.isHidden) return { isHidden: true };
                    return tc;
                });
            }
        } else if (exerciseType === 'mcq') {
            const rawTc = exercise.testCases || {};
            exercise.testCases = {
                question: rawTc.question || '',
                codeSnippet: rawTc.codeSnippet || '',
                options: rawTc.options || [],
                explanation: undefined, // Hidden until submit
                correctOption: undefined // Hidden until submit
            };
        } else if (exerciseType === 'fill_blank') {
            const rawTc = exercise.testCases || {};
            exercise.testCases = {
                codeTemplate: rawTc.codeTemplate || '',
                blanks: Array.isArray(rawTc.blanks) ? rawTc.blanks.map(b => ({ id: b.id, hint: b.hint })) : [],
                explanation: undefined
            };
        } else if (exerciseType === 'case_study') {
            const rawTc = exercise.testCases || {};
            exercise.testCases = {
                scenarioTitle: rawTc.scenarioTitle || '',
                scenarioContext: rawTc.scenarioContext || '',
                questions: Array.isArray(rawTc.questions) ? rawTc.questions.map(q => ({
                    id: q.id,
                    prompt: q.prompt,
                    codeSnippet: q.codeSnippet || null,
                    options: q.options || [],
                    category: q.category || 'technical'
                })) : []
            };
        }
    }

    // Fetch latest user submission for this exercise to restore answers & results
    let latestSubmission = null;
    if (req.user?.id) {
        latestSubmission = await prisma.codingSubmission.findFirst({
            where: {
                exerciseId: req.params.id,
                studentId: req.user.id
            },
            orderBy: { submittedAt: 'desc' }
        });
    }

    res.json({ success: true, data: { exercise, latestSubmission } });
}));

/**
 * @route   POST /api/training/exercises/:id/run
 * @desc    Dry-run the code without submitting
 * @access  Private
 */
router.post('/exercises/:id/run', authenticate, [
    body('code').notEmpty()
], asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { code, customInput } = req.body;
    
    // Check language
    const exercise = await prisma.trainingExercise.findUnique({
        where: { id },
        include: { unit: { include: { module: true } } }
    });
    
    if (!exercise) return res.status(404).json({ success: false, message: 'Exercise not found' });
    
    const language = exercise.unit?.module?.language?.toLowerCase() || 'python';
    
    let execution;
    if (language === 'html') {
        // For HTML, there is no execution Sandbox. The literal code is the output.
        execution = { stdout: code, stderr: '', code: 0 };
    } else {
        // Python Execute
        execution = await executePythonCode(code, customInput || '');
    }

    res.json({
        success: true,
        data: {
            output: execution.stdout || execution.stderr,
            isError: execution.code !== 0
        }
    });
}));

/**
 * @route   POST /api/training/exercises/:id/submit
 * @desc    Submit exercise (Coding, MCQ, Fill-in-Blank, Case Study, PR Review)
 * @access  Private
 */
router.post('/exercises/:id/submit', authenticate, asyncHandler(async (req, res) => {
    const exerciseId = req.params.id;
    const studentId = req.user.id;
    const { code, selectedOption, blankAnswers, scenarioAnswers } = req.body;

    // Fetch exercise with true test cases and solution data
    const exercise = await prisma.trainingExercise.findUnique({
        where: { id: exerciseId },
        include: { unit: { include: { module: true } } }
    });

    if (!exercise) return res.status(404).json({ success: false, message: 'Exercise not found' });

    const exerciseType = exercise.exerciseType || 'coding';
    const language = exercise.unit?.module?.language?.toLowerCase() || 'python';
    let passedAll = true;
    let results = [];
    let socraticReview = null;
    let submissionCode = code || '';
    let submissionOutput = '';

    // ==========================================
    // 1. MCQ EVALUATION
    // ==========================================
    if (exerciseType === 'mcq') {
        const mcqData = exercise.testCases || {};
        const correctOpt = parseInt(mcqData.correctOption, 10);
        const userOpt = parseInt(selectedOption, 10);
        
        passedAll = (userOpt === correctOpt);
        submissionCode = JSON.stringify({ selectedOption: userOpt });
        submissionOutput = passedAll ? 'Correct answer selected.' : 'Incorrect option chosen.';
        
        results = [{
            passed: passedAll,
            selectedOption: userOpt,
            correctOption: correctOpt,
            explanation: mcqData.explanation || 'Review the code execution flow and state transformations.'
        }];

        if (!passedAll) {
            socraticReview = `Consider dry-running the code line by line. Notice what the variable values become before the return/print statement.`;
        }
    } 
    // ==========================================
    // 2. FILL-IN-THE-BLANKS (CLOZE) EVALUATION
    // ==========================================
    else if (exerciseType === 'fill_blank') {
        const fillData = exercise.testCases || {};
        const blanks = Array.isArray(fillData.blanks) ? fillData.blanks : [];
        const userAnswers = Array.isArray(blankAnswers) ? blankAnswers : [];
        
        submissionCode = JSON.stringify({ answers: userAnswers });
        let allBlanksPassed = true;

        results = blanks.map((blank, i) => {
            const userVal = (userAnswers[i] || '').trim().toLowerCase();
            const expectedList = Array.isArray(blank.expected) 
                ? blank.expected.map(e => e.trim().toLowerCase()) 
                : [String(blank.expected || '').trim().toLowerCase()];
            
            const isCorrect = expectedList.some(exp => exp === userVal || userVal.replace(/\s+/g, '') === exp.replace(/\s+/g, ''));
            if (!isCorrect) allBlanksPassed = false;

            return {
                blankId: blank.id,
                userAnswer: userAnswers[i] || '',
                isCorrect,
                hint: blank.hint || 'Check syntax and naming conventions.'
            };
        });

        passedAll = allBlanksPassed;
        submissionOutput = passedAll ? 'All blanks filled correctly.' : 'Some blanks were incorrect.';
        
        if (!passedAll) {
            socraticReview = `Check the missing operations. Are you using the correct method signature or keyword?`;
        }
    }
    // ==========================================
    // 3. CASE STUDY / MNC SCENARIO EVALUATION
    // ==========================================
    else if (exerciseType === 'case_study') {
        const caseData = exercise.testCases || {};
        const questions = Array.isArray(caseData.questions) ? caseData.questions : [];
        const userResponses = scenarioAnswers || {};
        
        submissionCode = JSON.stringify({ responses: userResponses });
        let correctCount = 0;

        results = questions.map(q => {
            const correctOpt = parseInt(q.correctOption, 10);
            const userChoice = parseInt(userResponses[q.id], 10);
            const isCorrect = (userChoice === correctOpt);
            if (isCorrect) correctCount++;

            return {
                questionId: q.id,
                prompt: q.prompt,
                userChoice,
                correctOption: correctOpt,
                isCorrect,
                explanation: q.explanation || ''
            };
        });

        // 100% required for mastery or >= 80%
        passedAll = (correctCount === questions.length);
        submissionOutput = `Score: ${correctCount}/${questions.length} questions answered correctly.`;

        if (!passedAll) {
            socraticReview = `Review the incident root cause. In an enterprise system, prioritize data integrity, bounded resource limits, and clear RCA communication.`;
        }
    }
    // ==========================================
    // 4. CODING & PR REVIEW (BUG FIX) EVALUATION
    // ==========================================
    else {
        const testCases = Array.isArray(exercise.testCases) ? exercise.testCases : [];
        let firstErrorOutput = null;

        for (const tc of testCases) {
            try {
                let exe;
                const testInput = typeof tc.input === 'string' ? tc.input : (tc.input !== undefined && tc.input !== null ? String(tc.input) : '');
                
                if (language === 'html') {
                    exe = { stdout: code, stderr: '', code: 0 };
                } else {
                    exe = await executePythonCode(code, testInput);
                }
                
                const actualRaw = exe.stdout ? exe.stdout.replace(/\r\n/g, '\n') : '';
                const expectedRaw = (tc.expectedOutput !== undefined ? tc.expectedOutput : tc.expected) ?? '';
                const expectedString = typeof expectedRaw === 'string' ? expectedRaw.replace(/\r\n/g, '\n') : String(expectedRaw);
                
                // Clean comparison
                const actualClean = actualRaw.trim();
                const expectedClean = expectedString.trim();
                
                const passed = (exe.code === 0) && (actualClean === expectedClean);
                if (!passed) passedAll = false;

                if (exe.code !== 0 && !firstErrorOutput) {
                    firstErrorOutput = exe.stderr;
                }

                results.push({
                    input: tc.isHidden ? 'Hidden' : testInput,
                    expected: tc.isHidden ? 'Hidden' : expectedString,
                    actual: exe.stderr ? `Error: ${exe.stderr.trim()}` : actualRaw,
                    passed
                });
            } catch (err) {
                passedAll = false;
                results.push({ passed: false, actual: `Execution Sandbox Error: ${err.message}` });
            }
        }

        submissionOutput = firstErrorOutput || (results.length > 0 ? results[0].actual : '');

        // Evaluate with AI for Coding Failures
        if (results.some(r => !r.passed) || results.length === 0) {
            const failedCases = results.filter(r => !r.passed).map(r => ({ input: r.input, expected: r.expected, actual: r.actual }));
            const aiEvaluation = await evaluateStudentCodeWithAI(code, exercise.description, failedCases);
            
            if (aiEvaluation) {
                socraticReview = aiEvaluation.socraticFeedback;
                if (Array.isArray(aiEvaluation.suggestedEdgeCases)) {
                    aiEvaluation.suggestedEdgeCases.forEach(tc => {
                        results.push({
                            input: tc.input,
                            expected: tc.expectedOutput,
                            actual: 'Not Evaluated (Dynamic AI Case)',
                            passed: false,
                            isAiGenerated: true
                        });
                    });
                }
            } else {
                socraticReview = "Consider tracing your program with the first failing input. What does your logic return vs what is expected?";
            }
        }
    }

    const testStatus = passedAll ? 'passed' : 'failed';

    // Save Submission
    const submission = await prisma.codingSubmission.create({
        data: {
            exerciseId,
            studentId,
            code: submissionCode,
            status: testStatus,
            output: submissionOutput,
            testResults: results,
            aiSocraticReview: socraticReview
        }
    });

    // If passed, update Progress, Mastery & XP
    let updatedTotalXP = 0;
    let nextExerciseId = null;
    let isUnitMastered = false;

    if (req.user?.id) {
        const unitId = exercise.unitId;
        const moduleId = exercise.unit.moduleId;

        // Check if student already passed this exercise before
        const previousPass = await prisma.codingSubmission.findFirst({
            where: {
                exerciseId,
                studentId,
                status: 'passed',
                id: { not: submission.id }
            }
        });

        const xpToAward = (passedAll && !previousPass) ? (exercise.xpReward || 10) : 0;

        // Ensure Progress record exists
        let progress = await prisma.studentTrainingProgress.findUnique({
            where: { studentId_moduleId: { studentId, moduleId } }
        });

        if (!progress) {
            progress = await prisma.studentTrainingProgress.create({
                data: {
                    studentId,
                    moduleId,
                    currentUnitId: unitId,
                    totalXP: xpToAward
                }
            });
            updatedTotalXP = xpToAward;
        } else {
            const updated = await prisma.studentTrainingProgress.update({
                where: { id: progress.id },
                data: {
                    totalXP: xpToAward > 0 ? { increment: xpToAward } : undefined,
                    lastActiveAt: new Date()
                }
            });
            updatedTotalXP = updated.totalXP;
        }

        // Update Mastery accurately by counting DISTINCT passed exercises in this unit
        const totalExercisesInUnit = await prisma.trainingExercise.count({ where: { unitId } });
        
        const passedExercises = await prisma.codingSubmission.findMany({
            where: {
                studentId,
                status: 'passed',
                exercise: { unitId }
            },
            select: { exerciseId: true },
            distinct: ['exerciseId']
        });

        const distinctPassedCount = passedExercises.length;
        const newScore = totalExercisesInUnit > 0 ? (distinctPassedCount / totalExercisesInUnit) * 100 : 100;
        isUnitMastered = newScore >= (exercise.unit?.unlockThreshold || 80);

        let mastery = await prisma.studentUnitMastery.findUnique({
            where: { studentId_unitId: { studentId, unitId } }
        });

        if (!mastery) {
            await prisma.studentUnitMastery.create({
                data: {
                    studentId,
                    unitId,
                    exercisesDone: distinctPassedCount,
                    masteryScore: Math.min(Math.round(newScore), 100),
                    status: isUnitMastered ? 'mastered' : 'in_progress',
                    unlockedAt: new Date(),
                    masteredAt: isUnitMastered ? new Date() : null
                }
            });
        } else {
            await prisma.studentUnitMastery.update({
                where: { id: mastery.id },
                data: {
                    exercisesDone: distinctPassedCount,
                    masteryScore: Math.min(Math.round(newScore), 100),
                    status: isUnitMastered ? 'mastered' : 'in_progress',
                    masteredAt: isUnitMastered ? (mastery.masteredAt || new Date()) : null
                }
            });
        }

        // Find Next Exercise in module sequence
        try {
            const allUnits = await prisma.trainingUnit.findMany({
                where: { moduleId },
                orderBy: { sequenceOrder: 'asc' },
                include: {
                    exercises: {
                        orderBy: { sequenceOrder: 'asc' },
                        select: { id: true }
                    }
                }
            });

            const allExerciseIds = allUnits.flatMap(u => u.exercises.map(e => e.id));
            const currentIdx = allExerciseIds.indexOf(exercise.id);
            if (currentIdx !== -1 && currentIdx + 1 < allExerciseIds.length) {
                nextExerciseId = allExerciseIds[currentIdx + 1];
            }
        } catch (seqErr) {
            console.warn('[Training Submit] Next exercise lookup failed:', seqErr.message);
        }
    }

    res.json({
        success: true,
        data: {
            status: testStatus,
            results,
            socraticReview,
            xpEarned: passedAll ? (exercise.xpReward || 10) : 0,
            totalXP: updatedTotalXP,
            nextExerciseId,
            isUnitMastered,
            submissionId: submission.id
        }
    });
}));

/**
 * @route   GET /api/training/class/:classId/analytics
 * @desc    Get training analytics for an entire class
 * @access  Private (Instructor, Admin)
 */
router.get('/class/:classId/analytics', authenticate, authorize('instructor', 'admin', 'principal'), asyncHandler(async (req, res) => {
    const classId = req.params.classId;

    // Get all students in the class
    const enrollments = await prisma.classEnrollment.findMany({
        where: { classId, status: 'active' },
        include: {
            student: {
                select: { id: true, firstName: true, lastName: true, admissionNumber: true }
            }
        }
    });

    const studentIds = enrollments.map(e => e.student.id);

    // Get progress for these students
    const progress = await prisma.studentTrainingProgress.findMany({
        where: { studentId: { in: studentIds } },
        include: {
            module: { select: { id: true, title: true } }
        }
    });

    // Group progress by student
    const studentAnalytics = enrollments.map(e => {
        const p = progress.filter(pr => pr.studentId === e.student.id);
        return {
            student: e.student,
            totalXP: p.reduce((sum, pr) => sum + pr.totalXP, 0),
            modulesProgress: p
        };
    });

    res.json({
        success: true,
        data: {
            classId,
            studentCount: enrollments.length,
            students: studentAnalytics
        }
    });
}));

// ==========================================
// PUBLISH / UNPUBLISH MODULE
// ==========================================

/**
 * @route   PUT /api/training/modules/:id/publish
 * @desc    Toggle publish state of a module
 * @access  Private (Admin/Instructor)
 */
router.put('/modules/:id/publish', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await prisma.trainingModule.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Module not found' });

    const updated = await prisma.trainingModule.update({
        where: { id },
        data: { isPublished: !existing.isPublished }
    });

    res.json({
        success: true,
        data: { module: updated },
        message: updated.isPublished ? 'Module published' : 'Module unpublished'
    });
}));

// ==========================================
// CONFIGURATION (Update pedagogy settings)
// ==========================================

/**
 * @route   PUT /api/training/modules/:id/config
 * @desc    Update pedagogy configuration of a module
 * @access  Private (Admin/Instructor)
 */
router.put('/modules/:id/config', authenticate, authorize('admin', 'principal', 'instructor'), [
    body('pedagogyConfig').isObject().withMessage('Config must be an object'),
], asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { pedagogyConfig } = req.body;

    const existing = await prisma.trainingModule.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Module not found' });

    const updated = await prisma.trainingModule.update({
        where: { id },
        data: { pedagogyConfig }
    });

    res.json({
        success: true,
        data: { module: updated },
        message: 'Pedagogy configuration updated'
    });
}));

// ==========================================
// TRAINING ASSIGNMENT (Assign modules to classes/groups with deadlines)
// ==========================================

/**
 * @route   POST /api/training/modules/:id/assign
 * @desc    Assign a training module to classes/groups with a deadline
 * @access  Private (Admin/Instructor)
 */
router.post('/modules/:id/assign', authenticate, authorize('admin', 'principal', 'instructor'), [
    body('deadline').optional().isISO8601().withMessage('Invalid deadline format'),
], asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { classIds, groupIds, deadline, notes, subjectId } = req.body;

    const mod = await prisma.trainingModule.findUnique({ where: { id } });
    if (!mod) return res.status(404).json({ success: false, message: 'Module not found' });

    // Publish automatically if still draft
    if (!mod.isPublished) {
        await prisma.trainingModule.update({ where: { id }, data: { isPublished: true } });
    }

    // Need a subjectId for the assignment. If not provided, find the school's first subject.
    let resolvedSubjectId = subjectId;
    if (!resolvedSubjectId) {
        const firstSubject = await prisma.subject.findFirst({
            where: { schoolId: req.user.schoolId }
        });
        if (!firstSubject) {
            return res.status(400).json({ success: false, message: 'No subjects found. Create a subject first.' });
        }
        resolvedSubjectId = firstSubject.id;
    }

    // Create an assignment record that links the training module to classes
    const dueDate = deadline ? new Date(deadline) : null;
    const assignment = await prisma.assignment.create({
        data: {
            schoolId: req.user.schoolId,
            createdById: req.user.id,
            title: `Training: ${mod.title}`,
            description: notes || `Complete the training module: ${mod.title}`,
            assignmentType: 'training_module',
            trainingModuleId: id,
            subjectId: resolvedSubjectId,
            maxMarks: 100,
            passingMarks: 60,
            status: 'active',
            due_date: dueDate,
        }
    });

    // Create AssignmentTarget records for each class
    const targets = [];
    if (classIds && classIds.length > 0) {
        for (const classId of classIds) {
            targets.push(prisma.assignmentTarget.create({
                data: {
                    assignmentId: assignment.id,
                    targetType: 'class',
                    targetClassId: classId,
                    assignedById: req.user.id,
                    dueDate,
                    specialInstructions: notes || null
                }
            }));
        }
    }

    // Create AssignmentTarget records for each group
    if (groupIds && groupIds.length > 0) {
        for (const groupId of groupIds) {
            targets.push(prisma.assignmentTarget.create({
                data: {
                    assignmentId: assignment.id,
                    targetType: 'group',
                    targetGroupId: groupId,
                    assignedById: req.user.id,
                    dueDate,
                    specialInstructions: notes || null
                }
            }));
        }
    }

    await Promise.all(targets);

    res.status(201).json({
        success: true,
        message: 'Module assigned successfully',
        data: { assignment }
    });
}));

/**
 * @route   GET /api/training/modules/:id/assignments
 * @desc    Get all assignments (class/group allocations) for a module
 * @access  Private (Admin/Instructor)
 */
router.get('/modules/:id/assignments', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    const assignments = await prisma.assignment.findMany({
        where: { trainingModuleId: id },
        include: {
            targets: true,
            createdBy: { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Enrich targets with class/group names
    for (const assignment of assignments) {
        for (const target of assignment.targets) {
            if (target.targetClassId) {
                const cls = await prisma.class.findUnique({ where: { id: target.targetClassId }, select: { name: true } });
                target.className = cls?.name || 'Unknown';
            }
            if (target.targetGroupId) {
                const grp = await prisma.studentGroup.findUnique({ where: { id: target.targetGroupId }, select: { name: true } });
                target.groupName = grp?.name || 'Unknown';
            }
        }
    }

    res.json({ success: true, data: { assignments } });
}));

/**
 * @route   GET /api/training/modules/:id/progress
 * @desc    Get progress of all students for a specific module
 * @access  Private (Admin/Instructor)
 */
router.get('/modules/:id/progress', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    const progress = await prisma.studentTrainingProgress.findMany({
        where: { moduleId: id },
        include: {
            student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } }
        },
        orderBy: { totalXP: 'desc' }
    });

    const unitMasteries = await prisma.studentUnitMastery.findMany({
        where: { unit: { moduleId: id } },
        include: {
            student: { select: { id: true, firstName: true, lastName: true } }
        }
    });

    res.json({
        success: true,
        data: {
            progress,
            unitMasteries
        }
    });
}));

// ==========================================
// AI LMS GENERATOR COPILOT ENDPOINT
// ==========================================

/**
 * @route   POST /api/training/ai-assist
 * @desc    Generate syllabus outlines, lesson theory with graphics, exercises (all 5 types), or socratic hints
 * @access  Private (Admin/Instructor/Principal)
 */
router.post('/ai-assist', authenticate, asyncHandler(async (req, res) => {
    const { action, payload = {}, provider = 'groq' } = req.body;

    if (!action) {
        return res.status(400).json({ success: false, message: 'AI action is required' });
    }

    try {
        let result = null;

        switch (action) {
            case 'generate_outline':
                result = await aiService.generateTrainingModuleOutline({
                    topic: payload.topic || 'Python Programming',
                    targetAudience: payload.targetAudience || '',
                    language: payload.language || 'python',
                    classLevel: payload.classLevel || 11,
                    board: payload.board || 'PSEB',
                    totalUnits: payload.totalUnits || 3,
                    documentText: payload.documentText || '',
                    provider
                });
                break;

            case 'generate_theory':
                result = await aiService.generateTrainingTheoryAndGraphics({
                    topic: payload.topic || 'Python Basics',
                    unitTitle: payload.unitTitle || '',
                    unitDescription: payload.unitDescription || '',
                    moduleTitle: payload.moduleTitle || '',
                    documentText: payload.documentText || '',
                    language: payload.language || 'python',
                    classLevel: payload.classLevel || 11,
                    provider
                });
                break;

            case 'generate_exercise':
                result = await aiService.generateTrainingExercise({
                    topic: payload.topic || 'Functions and Loops',
                    unitTitle: payload.unitTitle || '',
                    unitDescription: payload.unitDescription || '',
                    moduleTitle: payload.moduleTitle || '',
                    documentText: payload.documentText || '',
                    language: payload.language || 'python',
                    exerciseType: payload.exerciseType || 'coding',
                    difficulty: payload.difficulty || 'beginner',
                    scaffoldLevel: payload.scaffoldLevel || 'guided',
                    bloomsLevel: payload.bloomsLevel || 'apply',
                    customPrompt: payload.customPrompt || '',
                    provider
                });
                break;

            case 'socratic_hint':
                result = await aiService.generateSocraticHint({
                    problemTitle: payload.problemTitle || '',
                    problemDescription: payload.problemDescription || '',
                    studentCode: payload.studentCode || '',
                    currentOutput: payload.currentOutput || '',
                    failedTests: payload.failedTests || [],
                    provider
                });
                break;

            case 'generate_from_document':
                result = await aiService.generateTrainingModuleFromDocument({
                    documentText: payload.documentText || '',
                    imageBase64: payload.imageBase64 || null,
                    mimeType: payload.mimeType || 'image/jpeg',
                    customPrompt: payload.customPrompt || '',
                    language: payload.language || 'python',
                    classLevel: payload.classLevel || 11,
                    board: payload.board || 'CBSE',
                    totalUnits: payload.totalUnits || 3,
                    provider
                });
                break;

            default:
                return res.status(400).json({ success: false, message: `Unknown AI assist action: ${action}` });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error(`[Training AI Assist Error] ${action}:`, err.message);
        res.status(500).json({
            success: false,
            message: err.message || 'AI LMS Assistant encountered an error'
        });
    }
}));

module.exports = router;
