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
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

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
 * @route   PUT /api/training/modules/:id
 * @desc    Update a training module's metadata
 * @access  Private (Admin/Instructor)
 */
router.put('/modules/:id', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, titleHindi, description, language, boardAligned, classLevel, isPublished, pedagogyConfig } = req.body;

    const existing = await prisma.trainingModule.findFirst({
        where: { id, schoolId: req.user.schoolId }
    });
    if (!existing) {
        return res.status(404).json({ success: false, message: 'Training module not found' });
    }

    const updated = await prisma.trainingModule.update({
        where: { id },
        data: {
            title: title !== undefined ? title : existing.title,
            titleHindi: titleHindi !== undefined ? titleHindi : existing.titleHindi,
            description: description !== undefined ? description : existing.description,
            language: language !== undefined ? language : existing.language,
            boardAligned: boardAligned !== undefined ? boardAligned : existing.boardAligned,
            classLevel: classLevel !== undefined ? (classLevel ? parseInt(classLevel) : null) : existing.classLevel,
            isPublished: isPublished !== undefined ? isPublished : existing.isPublished,
            pedagogyConfig: pedagogyConfig !== undefined ? pedagogyConfig : existing.pedagogyConfig
        }
    });

    res.json({ success: true, data: { module: updated } });
}));

/**
 * @route   DELETE /api/training/modules/:id
 * @desc    Delete a training module and cleanup associated relations
 * @access  Private (Admin/Instructor)
 */
router.delete('/modules/:id', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existing = await prisma.trainingModule.findFirst({
        where: { id, schoolId: req.user.schoolId }
    });
    if (!existing) {
        return res.status(404).json({ success: false, message: 'Training module not found' });
    }

    // Unlink any assignments referencing this training module
    await prisma.assignment.updateMany({
        where: { trainingModuleId: id },
        data: { trainingModuleId: null }
    });

    // Cleanup student mastery and progress
    await prisma.studentUnitMastery.deleteMany({
        where: { unit: { moduleId: id } }
    });
    await prisma.studentTrainingProgress.deleteMany({
        where: { moduleId: id }
    });

    // Cascade delete units (and exercises via Prisma cascade)
    await prisma.trainingModule.delete({
        where: { id }
    });

    res.json({ success: true, message: 'Training module deleted successfully' });
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
 * @route   PUT /api/training/units/:id
 * @desc    Update an existing unit
 * @access  Private
 */
router.put('/units/:id', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, unitNumber, expectedHours, unlockThreshold, sequenceOrder } = req.body;

    const existingUnit = await prisma.trainingUnit.findUnique({ where: { id } });
    if (!existingUnit) return res.status(404).json({ success: false, message: 'Unit not found' });

    const updatedUnit = await prisma.trainingUnit.update({
        where: { id },
        data: {
            title: title !== undefined ? title : existingUnit.title,
            description: description !== undefined ? description : existingUnit.description,
            unitNumber: unitNumber !== undefined ? parseInt(unitNumber) : existingUnit.unitNumber,
            expectedHours: expectedHours !== undefined ? (expectedHours ? parseInt(expectedHours) : null) : existingUnit.expectedHours,
            unlockThreshold: unlockThreshold !== undefined ? parseInt(unlockThreshold) : existingUnit.unlockThreshold,
            sequenceOrder: sequenceOrder !== undefined ? parseInt(sequenceOrder) : existingUnit.sequenceOrder
        }
    });

    res.json({ success: true, data: { unit: updatedUnit } });
}));

/**
 * @route   DELETE /api/training/units/:id
 * @desc    Delete a unit and its exercises
 * @access  Private
 */
router.delete('/units/:id', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const unit = await prisma.trainingUnit.findUnique({
        where: { id },
        include: { _count: { select: { exercises: true } } }
    });
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });

    const exerciseCount = unit._count?.exercises || 0;

    await prisma.trainingUnit.delete({ where: { id } });

    await prisma.trainingModule.update({
        where: { id: unit.moduleId },
        data: {
            totalUnits: { decrement: 1 },
            totalExercises: { decrement: exerciseCount }
        }
    });

    res.json({ success: true, message: 'Unit deleted successfully' });
}));

/**
 * @route   GET /api/training/units/:id/theory
 * @desc    Get unit theory notes, mini-checkpoints, and CBSE tips
 * @access  Private
 */
router.get('/units/:id/theory', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const unit = await prisma.trainingUnit.findUnique({
        where: { id },
        include: {
            module: {
                select: { id: true, title: true, language: true, classLevel: true, boardAligned: true }
            },
            exercises: {
                select: { id: true, title: true, exerciseType: true },
                orderBy: { sequenceOrder: 'asc' }
            }
        }
    });

    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });

    let theoryData = {
        title: unit.title,
        unitNumber: unit.unitNumber,
        summary: unit.description || '',
        content: '',
        miniCheckpoints: [],
        cbseTips: []
    };

    if (unit.description) {
        try {
            const parsed = JSON.parse(unit.description);
            if (parsed && typeof parsed === 'object') {
                theoryData.summary = parsed.summary || '';
                theoryData.content = parsed.content || parsed.text || '';
                theoryData.miniCheckpoints = Array.isArray(parsed.miniCheckpoints) ? parsed.miniCheckpoints : [];
                theoryData.cbseTips = Array.isArray(parsed.cbseTips) ? parsed.cbseTips : [];
            }
        } catch (e) {
            theoryData.content = unit.description;
        }
    }

    res.json({
        success: true,
        data: {
            unit: {
                id: unit.id,
                title: unit.title,
                unitNumber: unit.unitNumber,
                moduleId: unit.moduleId,
                module: unit.module,
                firstExerciseId: unit.exercises?.[0]?.id || null,
                ...theoryData
            }
        }
    });
}));

/**
 * @route   PUT /api/training/units/:id/theory
 * @desc    Save/update unit theory notes, mini-checkpoints, and CBSE tips
 * @access  Private
 */
router.put('/units/:id/theory', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { summary, content, miniCheckpoints, cbseTips } = req.body;

    const existingUnit = await prisma.trainingUnit.findUnique({ where: { id } });
    if (!existingUnit) return res.status(404).json({ success: false, message: 'Unit not found' });

    const payload = {
        summary: summary || '',
        content: content || '',
        miniCheckpoints: Array.isArray(miniCheckpoints) ? miniCheckpoints : [],
        cbseTips: Array.isArray(cbseTips) ? cbseTips : []
    };

    const updatedUnit = await prisma.trainingUnit.update({
        where: { id },
        data: {
            description: JSON.stringify(payload)
        }
    });

    res.json({ success: true, data: { unit: updatedUnit } });
}));

/**
 * @route   POST /api/training/units/:id/theory/complete
 * @desc    Mark unit theory completed, award XP, update progress
 * @access  Private
 */
router.post('/units/:id/theory/complete', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const studentId = req.user.id;

    const unit = await prisma.trainingUnit.findUnique({
        where: { id },
        select: { moduleId: true, unitNumber: true, title: true }
    });
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });

    const xpReward = 15;

    let progress = await prisma.studentTrainingProgress.findUnique({
        where: {
            studentId_moduleId: {
                studentId,
                moduleId: unit.moduleId
            }
        }
    });

    if (progress) {
        progress = await prisma.studentTrainingProgress.update({
            where: { id: progress.id },
            data: {
                totalXP: { increment: xpReward },
                lastActiveAt: new Date()
            }
        });
    } else {
        progress = await prisma.studentTrainingProgress.create({
            data: {
                studentId,
                moduleId: unit.moduleId,
                currentUnitId: id,
                totalXP: xpReward
            }
        });
    }

    res.json({
        success: true,
        data: {
            xpEarned: xpReward,
            totalXP: progress.totalXP
        }
    });
}));

/**
 * @route   PUT /api/training/exercises/:id
 * @desc    Update an existing exercise
 * @access  Private
 */
router.put('/exercises/:id', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const existing = await prisma.trainingExercise.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Exercise not found' });

    const updatedExercise = await prisma.trainingExercise.update({
        where: { id },
        data: {
            title: req.body.title !== undefined ? req.body.title : existing.title,
            description: req.body.description !== undefined ? req.body.description : existing.description,
            exerciseType: req.body.exerciseType !== undefined ? req.body.exerciseType : existing.exerciseType,
            difficulty: req.body.difficulty !== undefined ? req.body.difficulty : existing.difficulty,
            scaffoldLevel: req.body.scaffoldLevel !== undefined ? req.body.scaffoldLevel : existing.scaffoldLevel,
            bloomsLevel: req.body.bloomsLevel !== undefined ? req.body.bloomsLevel : existing.bloomsLevel,
            learningObjective: req.body.learningObjective !== undefined ? req.body.learningObjective : existing.learningObjective,
            isReviewExercise: req.body.isReviewExercise !== undefined ? req.body.isReviewExercise : existing.isReviewExercise,
            reviewsTopicId: req.body.reviewsTopicId !== undefined ? req.body.reviewsTopicId : existing.reviewsTopicId,
            starterCode: req.body.starterCode !== undefined ? req.body.starterCode : existing.starterCode,
            solutionCode: req.body.solutionCode !== undefined ? req.body.solutionCode : existing.solutionCode,
            testCases: req.body.testCases !== undefined ? (typeof req.body.testCases === 'string' ? JSON.parse(req.body.testCases) : req.body.testCases) : existing.testCases,
            hints: req.body.hints !== undefined ? (typeof req.body.hints === 'string' ? JSON.parse(req.body.hints) : req.body.hints) : existing.hints,
            timeLimit: req.body.timeLimit !== undefined ? (parseInt(req.body.timeLimit) || 5) : existing.timeLimit,
            sequenceOrder: req.body.sequenceOrder !== undefined ? (parseInt(req.body.sequenceOrder) || 1) : existing.sequenceOrder,
            xpReward: req.body.xpReward !== undefined ? (parseInt(req.body.xpReward) || 10) : existing.xpReward
        }
    });

    res.json({ success: true, data: { exercise: updatedExercise } });
}));

/**
 * @route   DELETE /api/training/exercises/:id
 * @desc    Delete an exercise
 * @access  Private
 */
router.delete('/exercises/:id', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const exercise = await prisma.trainingExercise.findUnique({
        where: { id },
        include: { unit: { select: { moduleId: true } } }
    });
    if (!exercise) return res.status(404).json({ success: false, message: 'Exercise not found' });

    await prisma.trainingExercise.delete({ where: { id } });

    if (exercise.unit?.moduleId) {
        await prisma.trainingModule.update({
            where: { id: exercise.unit.moduleId },
            data: { totalExercises: { decrement: 1 } }
        });
    }

    res.json({ success: true, message: 'Exercise deleted successfully' });
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
        } else if (exerciseType === 'assertion_reason') {
            const rawTc = exercise.testCases || {};
            exercise.testCases = {
                assertion: rawTc.assertion || '',
                reason: rawTc.reason || '',
                topic: rawTc.topic || '',
                explanation: undefined,
                correctOption: undefined
            };
        } else if (exerciseType === 'code_trace') {
            const rawTc = exercise.testCases || {};
            exercise.testCases = {
                codeSnippet: rawTc.codeSnippet || '',
                tableHeaders: rawTc.tableHeaders || ['Step', 'Variables'],
                rowCount: Array.isArray(rawTc.expectedRows) ? rawTc.expectedRows.length : 3,
                explanation: undefined,
                expectedRows: undefined
            };
        } else if (exerciseType === 'code_debug') {
            const rawTc = exercise.testCases || {};
            exercise.testCases = {
                buggyCode: rawTc.buggyCode || exercise.starterCode || '',
                lineCount: rawTc.buggyCode ? rawTc.buggyCode.split('\n').length : 10,
                hint: rawTc.hint || '',
                errors: undefined,
                solutionCode: undefined,
                explanation: undefined
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
        // Python Execute with auto-harness for function-only submissions
        let codeToRun = code;
        let stdinInput = (customInput || '').trim();

        // If no custom input was provided, default to the exercise's first sample test case
        if (!stdinInput && Array.isArray(exercise.testCases) && exercise.testCases.length > 0) {
            stdinInput = String(exercise.testCases[0].input || '').trim();
        }

        if (stdinInput) {
            const funcCallMatch = stdinInput.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*)\)$/);
            if (funcCallMatch) {
                const calledFuncName = funcCallMatch[1];
                const rawArgs = funcCallMatch[2].trim();
                const hasInputCall = code.includes('input(');
                if (!hasInputCall && new RegExp(`def\\s+${calledFuncName}\\s*\\(`, 'm').test(code)) {
                    codeToRun = `${code}\n\n# Auto-harness invocation\ntry:\n    _res = ${stdinInput}\n    if _res is not None:\n        print(_res)\nexcept Exception as _e:\n    import sys\n    sys.stderr.write(str(_e))\n`;
                    stdinInput = '';
                } else if (hasInputCall) {
                    const argsList = rawArgs ? rawArgs.split(',').map(a => a.trim().replace(/^['"]|['"]$/g, '')) : [];
                    stdinInput = argsList.join('\n') + '\n';
                }
            } else if (!code.includes('input(')) {
                const singleFuncMatch = code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\):/);
                if (singleFuncMatch) {
                    const funcName = singleFuncMatch[1];
                    const params = singleFuncMatch[2].split(',').map(p => p.trim()).filter(Boolean);
                    const inputArgs = stdinInput.split(/[\n,]+/).map(a => a.trim()).filter(Boolean);
                    if (params.length > 0 && inputArgs.length === params.length) {
                        codeToRun = `${code}\n\n# Auto-harness invocation\ntry:\n    _res = ${funcName}(${inputArgs.join(', ')})\n    if _res is not None:\n        print(_res)\nexcept Exception as _e:\n    import sys\n    sys.stderr.write(str(_e))\n`;
                        stdinInput = '';
                    }
                }
            }
        }
        execution = await executePythonCode(codeToRun, stdinInput);
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
    const { code, selectedOption, blankAnswers, scenarioAnswers, traceRows, flaggedLine } = req.body;

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
    // 4. CBSE ASSERTION-REASONING (A-R) EVALUATION
    // ==========================================
    else if (exerciseType === 'assertion_reason') {
        const arData = exercise.testCases || {};
        const correctOpt = parseInt(arData.correctOption, 10);
        const userOpt = parseInt(selectedOption, 10);

        passedAll = (userOpt === correctOpt);
        submissionCode = JSON.stringify({ selectedOption: userOpt });
        submissionOutput = passedAll
            ? 'Correct! You evaluated the Assertion and Reason accurately.'
            : 'Incorrect option chosen for Assertion and Reason.';

        results = [{
            passed: passedAll,
            selectedOption: userOpt,
            correctOption: correctOpt,
            explanation: arData.explanation || 'Analyze whether Assertion (A) and Reason (R) are individually true, and whether R directly explains A.'
        }];

        if (!passedAll) {
            socraticReview = `Examine both statements independently first: is Assertion (A) true? Is Reason (R) true? If both are true, test if connecting them with "because" makes logical sense.`;
        }
    }
    // ==========================================
    // 5. CBSE DRY-RUN VARIABLE TRACING EVALUATION
    // ==========================================
    else if (exerciseType === 'code_trace') {
        const traceData = exercise.testCases || {};
        const expectedRows = Array.isArray(traceData.expectedRows) ? traceData.expectedRows : [];
        const userRows = Array.isArray(traceRows) ? traceRows : (Array.isArray(blankAnswers) ? blankAnswers : []);

        submissionCode = JSON.stringify({ traceRows: userRows });
        let allRowsPassed = true;

        results = expectedRows.map((expRow, rIdx) => {
            const userRow = userRows[rIdx] || [];
            const rowPassed = expRow.every((expCell, cIdx) => {
                const userCell = String(userRow[cIdx] || '').trim().toLowerCase();
                const cleanExpected = String(expCell || '').trim().toLowerCase();
                return userCell === cleanExpected;
            });

            if (!rowPassed) allRowsPassed = false;

            return {
                step: rIdx + 1,
                expected: expRow,
                userAnswer: userRow,
                isCorrect: rowPassed
            };
        });

        passedAll = allRowsPassed && userRows.length >= expectedRows.length;
        submissionOutput = passedAll
            ? 'All variable dry-run trace steps calculated correctly.'
            : 'One or more variable values in the trace table are incorrect.';

        if (!passedAll) {
            socraticReview = `Step through each loop iteration carefully. Track how each variable changes before moving to the next iteration.`;
        }
    }
    // ==========================================
    // 6. CBSE CODE DEBUGGING & ERROR SPOTTING
    // ==========================================
    else if (exerciseType === 'code_debug') {
        const debugData = exercise.testCases || {};
        const expectedErrors = Array.isArray(debugData.errors) ? debugData.errors : [];
        const userFlaggedLine = parseInt(flaggedLine || selectedOption, 10);
        const userFixCode = (code || '').trim();

        let isLineCorrect = false;
        if (expectedErrors.length > 0) {
            isLineCorrect = expectedErrors.some(e => parseInt(e.line, 10) === userFlaggedLine);
        }

        let exeSuccess = false;
        if (userFixCode) {
            try {
                const exe = await executePythonCode(userFixCode, '');
                exeSuccess = !exe.stderr && (exe.code === 0 || exe.code === null);
            } catch (e) {}
        }

        passedAll = exeSuccess || isLineCorrect;
        submissionCode = userFixCode || JSON.stringify({ flaggedLine: userFlaggedLine });
        submissionOutput = passedAll
            ? 'Bug successfully spotted and resolved!'
            : 'The code still contains errors or the wrong line was flagged.';

        results = [{
            passed: passedAll,
            userFlaggedLine,
            errors: expectedErrors,
            explanation: debugData.explanation || 'Check syntax rules, indentation, and variable naming.'
        }];

        if (!passedAll) {
            socraticReview = `Check for common Python syntax errors on the flagged lines: unclosed brackets, missing colons, or improper indentation.`;
        }
    }
    // ==========================================
    // 7. CODING & PR REVIEW (BUG FIX) EVALUATION
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
                    let codeToRun = code;
                    let stdinInput = testInput;

                    // Auto-harness for function-only solutions or feeding args into scripts with input():
                    const trimmedInput = testInput.trim();
                    const funcCallMatch = trimmedInput.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*)\)$/);
                    const hasInputCall = code.includes('input(');

                    if (funcCallMatch) {
                        const calledFuncName = funcCallMatch[1];
                        const rawArgs = funcCallMatch[2].trim();
                        if (!hasInputCall && new RegExp(`def\\s+${calledFuncName}\\s*\\(`, 'm').test(code)) {
                            codeToRun = `${code}\n\n# Auto-harness call\ntry:\n    _res = ${trimmedInput}\n    if _res is not None:\n        print(_res)\nexcept Exception as _e:\n    import sys\n    sys.stderr.write(str(_e))\n`;
                            stdinInput = '';
                        } else if (hasInputCall) {
                            // Extract arguments from func(a, b) and provide them as separate lines on STDIN
                            const argsList = rawArgs ? rawArgs.split(',').map(a => a.trim().replace(/^['"]|['"]$/g, '')) : [];
                            stdinInput = argsList.join('\n') + '\n';
                        }
                    } else if (!hasInputCall) {
                        const singleFuncMatch = code.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\):/);
                        if (singleFuncMatch) {
                            const funcName = singleFuncMatch[1];
                            const params = singleFuncMatch[2].split(',').map(p => p.trim()).filter(Boolean);
                            const inputArgs = trimmedInput.split(/[\n,]+/).map(a => a.trim()).filter(Boolean);
                            if (params.length > 0 && inputArgs.length === params.length) {
                                codeToRun = `${code}\n\n# Auto-harness call\ntry:\n    _res = ${funcName}(${inputArgs.join(', ')})\n    if _res is not None:\n        print(_res)\nexcept Exception as _e:\n    import sys\n    sys.stderr.write(str(_e))\n`;
                                stdinInput = '';
                            }
                        }
                    }
                    exe = await executePythonCode(codeToRun, stdinInput);
                }
                
                const actualRaw = exe.stdout ? exe.stdout.replace(/\r\n/g, '\n') : '';
                const expectedRaw = (tc.expectedOutput !== undefined ? tc.expectedOutput : tc.expected) ?? '';
                const expectedString = typeof expectedRaw === 'string' ? expectedRaw.replace(/\r\n/g, '\n') : String(expectedRaw);
                
                // Clean comparison
                const actualClean = actualRaw.trim();
                const expectedClean = expectedString.trim();
                
                let passed = (exe.code === 0) && (actualClean === expectedClean);

                // Flexible comparison for numeric equality and outputs with labels (e.g. "Value is: 10" or float "10.0")
                if (!passed && exe.code === 0) {
                    if (!isNaN(Number(expectedClean)) && !isNaN(Number(actualClean)) && Number(expectedClean) === Number(actualClean)) {
                        passed = true;
                    } else {
                        const lines = actualClean.split('\n').map(l => l.trim()).filter(Boolean);
                        const lastLine = lines[lines.length - 1] || '';
                        const strippedLastLine = lastLine.replace(/^.*?(?:value\s*(?:is)?|output\s*(?:is)?|result\s*(?:is)?|ans\s*(?:is)?)\s*[:=]?\s*/i, '').trim();
                        if (strippedLastLine === expectedClean || (!isNaN(Number(expectedClean)) && !isNaN(Number(strippedLastLine)) && Number(expectedClean) === Number(strippedLastLine))) {
                            passed = true;
                        } else {
                            const lastToken = lastLine.split(/\s+/).pop();
                            if (lastToken === expectedClean || (!isNaN(Number(expectedClean)) && !isNaN(Number(lastToken)) && Number(expectedClean) === Number(lastToken))) {
                                passed = true;
                            }
                        }
                    }
                }

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
    const { action, payload = {}, provider = 'gemini' } = req.body;

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

        const enrichedData = typeof result === 'object' && result !== null
            ? { ...result, outline: result, theory: result, exercise: result, module: result }
            : result;

        res.json({
            success: true,
            data: enrichedData
        });
    } catch (err) {
        console.error(`[Training AI Assist Error] ${action}:`, err.message);
        res.status(500).json({
            success: false,
            message: err.message || 'AI LMS Assistant encountered an error'
        });
    }
}));

/**
 * @route   POST /api/training/ai/outline
 * @desc    Direct endpoint to generate Training Module Course Outline
 */
router.post('/ai/outline', authenticate, asyncHandler(async (req, res) => {
    const payload = req.body.payload || req.body;
    const provider = req.body.provider || payload.provider || 'gemini';

    try {
        const result = await aiService.generateTrainingModuleOutline({
            topic: payload.topic || 'Python Programming',
            targetAudience: payload.targetAudience || '',
            language: payload.language || 'python',
            classLevel: payload.classLevel || 11,
            board: payload.board || 'CBSE',
            totalUnits: payload.totalUnits || 3,
            documentText: payload.documentText || '',
            provider
        });

        res.json({
            success: true,
            data: {
                outline: result,
                ...(typeof result === 'object' && result !== null ? result : {})
            }
        });
    } catch (err) {
        console.error('[AI Outline Error]:', err.message);
        res.status(500).json({ success: false, message: err.message || 'Failed to synthesize outline' });
    }
}));

/**
 * @route   POST /api/training/ai/theory
 * @desc    Direct endpoint to generate Pre-Lab Theory & Interactive Checkpoints
 */
router.post('/ai/theory', authenticate, asyncHandler(async (req, res) => {
    const payload = req.body.payload || req.body;
    const provider = req.body.provider || payload.provider || 'gemini';

    try {
        const result = await aiService.generateTrainingTheoryAndGraphics({
            topic: payload.topic || 'Python Basics',
            unitTitle: payload.unitTitle || '',
            unitDescription: payload.unitDescription || '',
            moduleTitle: payload.moduleTitle || '',
            documentText: payload.documentText || '',
            language: payload.language || 'python',
            classLevel: payload.classLevel || 11,
            provider
        });

        res.json({
            success: true,
            data: {
                theory: result,
                ...(typeof result === 'object' && result !== null ? result : {})
            }
        });
    } catch (err) {
        console.error('[AI Theory Error]:', err.message);
        res.status(500).json({ success: false, message: err.message || 'Failed to synthesize theory' });
    }
}));

/**
 * @route   POST /api/training/ai/exercise
 * @desc    Direct endpoint to generate multi-modal Training Exercises
 */
router.post('/ai/exercise', authenticate, asyncHandler(async (req, res) => {
    const payload = req.body.payload || req.body;
    const provider = req.body.provider || payload.provider || 'gemini';

    try {
        const result = await aiService.generateTrainingExercise({
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

        res.json({
            success: true,
            data: {
                exercise: result,
                ...(typeof result === 'object' && result !== null ? result : {})
            }
        });
    } catch (err) {
        console.error('[AI Exercise Error]:', err.message);
        res.status(500).json({ success: false, message: err.message || 'Failed to synthesize exercise' });
    }
}));

/**
 * @route   POST /api/training/ai/exercises/batch
 * @desc    Generate batch of exercises for checked topics or from RAG document
 */
router.post('/ai/exercises/batch', authenticate, asyncHandler(async (req, res) => {
    const payload = req.body.payload || req.body;
    const provider = req.body.provider || payload.provider || 'gemini';

    try {
        const result = await aiService.generateTrainingExerciseBatch({
            topics: payload.topics || [],
            unitTitle: payload.unitTitle || '',
            language: payload.language || 'python',
            classLevel: payload.classLevel || 11,
            board: payload.board || 'CBSE',
            count: payload.count || 3,
            source: payload.source || 'topics',
            documentText: payload.documentText || '',
            exerciseType: payload.exerciseType || 'mixed',
            provider
        });

        res.json({
            success: true,
            data: {
                exercises: result.exercises || [],
                ...(typeof result === 'object' && result !== null ? result : {})
            }
        });
    } catch (err) {
        console.error('[AI Exercise Batch Error]:', err.message);
        res.status(500).json({ success: false, message: err.message || 'Failed to generate exercises batch' });
    }
}));

/**
 * @route   POST /api/training/ai/from-document
 * @desc    RAG endpoint to synthesize complete Training Module from textbook/syllabus material
 */
router.post('/ai/from-document', authenticate, asyncHandler(async (req, res) => {
    const payload = req.body.payload || req.body;
    const provider = req.body.provider || payload.provider || 'gemini';

    try {
        const result = await aiService.generateTrainingModuleFromDocument({
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

        res.json({
            success: true,
            data: {
                module: result,
                outline: result,
                ...(typeof result === 'object' && result !== null ? result : {})
            }
        });
    } catch (err) {
        console.error('[AI RAG Document Error]:', err.message);
        // Foolproof recovery: generate deterministic fallback module so auto-build NEVER fails with 500
        try {
            const fallbackResult = aiService.generateDeterministicFallbackModule({
                documentText: payload.documentText || '',
                customPrompt: payload.customPrompt || '',
                language: payload.language || 'python',
                classLevel: payload.classLevel || 11,
                board: payload.board || 'CBSE',
                totalUnits: payload.totalUnits || 3
            });
            return res.json({
                success: true,
                data: {
                    module: fallbackResult,
                    outline: fallbackResult,
                    ...fallbackResult
                },
                warning: `AI generation experienced an issue (${err.message}). Grounded curriculum fallback was safely generated.`
            });
        } catch (fallbackErr) {
            console.error('[AI RAG Fallback Fatal Error]:', fallbackErr.message);
            res.status(500).json({ success: false, message: err.message || 'Failed to synthesize module from document' });
        }
    }
}));

/**
 * @route   POST /api/training/ai/rag/upload
 * @desc    Upload syllabus document for RAG, save to Documents > RAG Documents folder, and extract text
 * @access  Private (Admin/Instructor/Principal)
 */
router.post('/ai/rag/upload', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
    }

    let schoolId = req.user?.schoolId;
    let userId = req.user?.id;

    if (!schoolId) {
        try {
            const fallbackSchool = await prisma.school.findFirst();
            schoolId = fallbackSchool?.id;
        } catch (e) {
            console.warn('[RAG Upload] School lookup warning:', e.message);
        }
    }

    if (!userId) {
        try {
            const fallbackUser = await prisma.user.findFirst();
            userId = fallbackUser?.id;
        } catch (e) {
            console.warn('[RAG Upload] User lookup warning:', e.message);
        }
    }

    const originalName = req.file.originalname;
    const safeName = `${Date.now()}_${originalName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const ext = path.extname(originalName).toLowerCase().replace('.', '') || 'bin';
    const publicUrl = `/RAG/${safeName}`;

    // Clean human-friendly title from file name as solid baseline
    const cleanFileNameTitle = originalName
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b(pdf|syllabus|notes|ebook|guide|document|resource|chapter|unit)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, c => c.toUpperCase()) || originalName.replace(/\.[^.]+$/, '');

    let extractedText = '';

    // 1. Save to physical RAG folders
    try {
        const rootRagDir = path.join(__dirname, '../../../RAG');
        const publicRagDir = path.join(__dirname, '../../../client/public/RAG');
        [rootRagDir, publicRagDir].forEach(d => {
            if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
        });

        const rootFilePath = path.join(rootRagDir, safeName);
        const publicFilePath = path.join(publicRagDir, safeName);
        fs.writeFileSync(rootFilePath, req.file.buffer);
        fs.writeFileSync(publicFilePath, req.file.buffer);
    } catch (fsErr) {
        console.warn('[RAG Upload] Physical file save warning:', fsErr.message);
    }

    // 2. Extract text from PDF, TXT, MD, etc.
    if (req.file.mimetype === 'application/pdf' || ext === 'pdf') {
        try {
            const parser = new PDFParse({ data: new Uint8Array(req.file.buffer) });
            const parsed = await parser.getText();
            extractedText = (parsed.text || '')
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
                .replace(/\r\n/g, '\n')
                .replace(/[ \t]{3,}/g, '  ')
                .trim();
            await parser.destroy();
        } catch (pdfErr) {
            console.warn('[RAG Upload] PDF parsing error:', pdfErr.message);
        }
    } else if (req.file.mimetype.startsWith('text/') || ['txt', 'md', 'json', 'py', 'csv'].includes(ext)) {
        extractedText = req.file.buffer.toString('utf8');
    }

    // 3. Deep Analysis of Sufficient PDF content to extract Course Title and Metadata
    let analyzedMeta = {
        title: cleanFileNameTitle,
        titleHindi: `${cleanFileNameTitle} (पाठ्यक्रम)`,
        description: 'Comprehensive curriculum module synthesized from syllabus material.',
        keyTopics: [],
        suggestedLanguage: 'python'
    };

    if (extractedText && extractedText.trim().length >= 20) {
        try {
            // Read sufficient PDF content (up to 18,000 characters)
            const aiMeta = await aiService.extractTitleAndMetadataFromDocument({
                documentText: extractedText,
                provider: 'gemini',
                originalFileName: originalName
            });
            if (aiMeta && aiMeta.title && aiMeta.title.length >= 4) {
                analyzedMeta = {
                    title: aiMeta.title,
                    titleHindi: aiMeta.titleHindi || `${aiMeta.title} (पाठ्यक्रम)`,
                    description: aiMeta.description || analyzedMeta.description,
                    keyTopics: Array.isArray(aiMeta.keyTopics) ? aiMeta.keyTopics : [],
                    suggestedLanguage: aiMeta.suggestedLanguage || 'python'
                };
            }
        } catch (metaErr) {
            console.warn('[RAG Upload] Title extraction warning:', metaErr.message);
            const algoTitle = aiService.deepAlgorithmicTitleExtract(extractedText, originalName);
            analyzedMeta.title = algoTitle || cleanFileNameTitle;
        }
    } else if (req.file.mimetype.startsWith('image/')) {
        try {
            const aiMeta = await aiService.extractTitleAndMetadataFromDocument({
                imageBase64: req.file.buffer.toString('base64'),
                mimeType: req.file.mimetype,
                provider: 'gemini',
                originalFileName: originalName
            });
            if (aiMeta && aiMeta.title && aiMeta.title.length >= 4) {
                analyzedMeta = {
                    title: aiMeta.title,
                    titleHindi: aiMeta.titleHindi || `${aiMeta.title} (पाठ्यक्रम)`,
                    description: aiMeta.description || analyzedMeta.description,
                    keyTopics: Array.isArray(aiMeta.keyTopics) ? aiMeta.keyTopics : [],
                    suggestedLanguage: aiMeta.suggestedLanguage || 'python'
                };
            }
        } catch (imgErr) {
            console.warn('[RAG Upload] Vision title extraction warning:', imgErr.message);
        }
    } else {
        const algoTitle = aiService.deepAlgorithmicTitleExtract(extractedText, originalName);
        analyzedMeta.title = algoTitle || cleanFileNameTitle;
    }

    const suggestedTitle = analyzedMeta.title || cleanFileNameTitle;

    // 4. Save record in documents library (isolated try/catch so it never breaks title/text return)
    let docId = null;
    let docName = originalName.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
    if (schoolId && userId) {
        try {
            let folder = await prisma.documentFolder.findFirst({
                where: { schoolId, name: 'RAG Documents', deletedAt: null }
            });

            if (!folder) {
                folder = await prisma.documentFolder.create({
                    data: {
                        schoolId,
                        name: 'RAG Documents',
                        createdById: userId
                    }
                });
            }

            const doc = await prisma.document.create({
                data: {
                    schoolId,
                    uploadedById: userId,
                    folderId: folder.id,
                    name: docName,
                    description: `Uploaded syllabus/curriculum resource for AI RAG course generation.`,
                    fileName: originalName,
                    fileType: ext,
                    mimeType: req.file.mimetype || 'application/octet-stream',
                    fileSize: req.file.size || req.file.buffer.length,
                    cloudinaryId: `local_rag_${safeName}`,
                    url: publicUrl,
                    category: 'curriculum',
                    isPublic: true
                }
            });
            docId = doc.id;
        } catch (dbErr) {
            console.warn('[RAG Upload] Documents library registration warning:', dbErr.message);
        }
    }

    return res.json({
        success: true,
        data: {
            documentId: docId,
            name: docName,
            fileName: originalName,
            suggestedTitle,
            titleHindi: analyzedMeta.titleHindi,
            description: analyzedMeta.description,
            keyTopics: analyzedMeta.keyTopics,
            suggestedLanguage: analyzedMeta.suggestedLanguage,
            url: publicUrl,
            folderName: 'RAG Documents',
            extractedText,
            mimeType: req.file.mimetype,
            imageBase64: req.file.mimetype.startsWith('image/') ? req.file.buffer.toString('base64') : null
        }
    });
}));

module.exports = router;
