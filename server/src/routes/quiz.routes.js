const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../config/database');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const aiService = require('../services/ai.service');

// Helper to generate a unique 6-character alphanumeric code (e.g. "8K2P9X")
function generateQuizCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit ambiguous chars like I, 1, O, 0
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * @route   POST /api/quiz/generate
 * @desc    Generate AI 4-choice questions using Gemini/Groq
 * @access  Private (Instructor, Admin, Principal, Lab Assistant, Student)
 */
router.post('/generate', authenticate, asyncHandler(async (req, res) => {
    const {
        keywords = '',
        difficulty = 'medium',
        numberOfQuestions = 5,
        timeLimitMinutes = 10,
        customInstructions = '',
        language = 'English'
    } = req.body;

    if (!keywords || !keywords.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Keywords or topic is required to generate quiz'
        });
    }

    const count = Math.min(Math.max(parseInt(numberOfQuestions) || 5, 1), 30);
    const validDifficulty = ['easy', 'medium', 'hard', 'mixed'].includes(difficulty?.toLowerCase())
        ? difficulty.toLowerCase()
        : 'medium';

    const systemPrompt = `You are a world-class academic quiz creator and educator.
Your task is to generate high-quality, pedagogically sound, multiple-choice questions (MCQs) with EXACTLY 4 choices (A, B, C, D) for each question.
Target Language: ${language}
Difficulty Level: ${validDifficulty}

CRITICAL RULES:
1. Return EXACTLY a JSON array of ${count} question objects.
2. Each question MUST have exactly 4 choices labeled 'A', 'B', 'C', and 'D'.
3. One and ONLY ONE option must be designated as 'correctOption' ('A', 'B', 'C', or 'D').
4. The distractors (wrong options) must be plausible and conceptually meaningful, not trivial.
5. Provide a clear, educational 'explanation' for why the correct option is right.
6. The questions must strictly follow 1-based sequential numbering (id: 1, 2, 3, ...).

JSON SCHEMA TO RETURN (RETURN ONLY VALID JSON, NO MARKDOWN, NO CODEBLOCKS):
[
  {
    "id": 1,
    "question": "Clear and concise question text",
    "options": [
      { "key": "A", "text": "First choice" },
      { "key": "B", "text": "Second choice" },
      { "key": "C", "text": "Third choice" },
      { "key": "D", "text": "Fourth choice" }
    ],
    "correctOption": "A",
    "explanation": "Explanation of why A is correct...",
    "difficulty": "${validDifficulty}",
    "points": 1
  }
]`;

    const userPrompt = `Generate a ${count}-question quiz on the following keywords/topics:
TOPIC / KEYWORDS: "${keywords.trim()}"
DIFFICULTY: ${validDifficulty}
ESTIMATED TIME: ${timeLimitMinutes} minutes
${customInstructions ? `ADDITIONAL INSTRUCTIONS: ${customInstructions}` : ''}

Ensure each question has 4 distinct options (A, B, C, D), a correctOption, and an explanation. Return ONLY valid JSON array.`;

    try {
        const response = await aiService.executeChatCompletion({
            messages: [{ role: 'user', content: userPrompt }],
            systemPrompt,
            preferredProvider: 'auto',
            temperature: 0.2,
            maxTokens: 4000,
            jsonMode: true
        });

        let rawText = response.text || '';
        // Clean markdown backticks if present
        rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

        let questions = [];
        try {
            questions = JSON.parse(rawText);
        } catch (jsonErr) {
            // Attempt regex array extraction
            const arrayMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (arrayMatch) {
                questions = JSON.parse(arrayMatch[0]);
            } else {
                throw new Error('Failed to parse AI output into valid questions JSON');
            }
        }

        if (!Array.isArray(questions) || questions.length === 0) {
            throw new Error('AI returned an empty question list');
        }

        // Normalize and validate sequential order and 4 options
        const normalizedQuestions = questions.map((q, idx) => {
            const seqNumber = idx + 1;
            let options = Array.isArray(q.options) ? q.options : [];
            
            // Normalize options to [{key: 'A', text: '...'}, ...]
            const standardKeys = ['A', 'B', 'C', 'D'];
            const normalizedOptions = standardKeys.map((key, optIdx) => {
                const existing = options.find(o => (o.key || '').toUpperCase() === key) || options[optIdx];
                return {
                    key,
                    text: existing ? (typeof existing === 'string' ? existing : existing.text || '') : `Option ${key}`
                };
            });

            let correctOpt = (q.correctOption || 'A').toUpperCase();
            if (!standardKeys.includes(correctOpt)) correctOpt = 'A';

            return {
                id: seqNumber,
                question: q.question || `Question ${seqNumber}`,
                options: normalizedOptions,
                correctOption: correctOpt,
                explanation: q.explanation || 'No explanation provided.',
                difficulty: q.difficulty || validDifficulty,
                points: q.points || 1
            };
        });

        res.json({
            success: true,
            data: {
                keywords,
                difficulty: validDifficulty,
                totalQuestions: normalizedQuestions.length,
                timeLimitMinutes: parseInt(timeLimitMinutes) || 10,
                questions: normalizedQuestions
            }
        });
    } catch (error) {
        console.error('[QuizRoutes] AI Generation Error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate quiz using AI'
        });
    }
}));

/**
 * @route   POST /api/quiz
 * @desc    Save/Publish a new quiz
 * @access  Private (Authenticated users)
 */
router.post('/', authenticate, asyncHandler(async (req, res) => {
    const {
        title = 'Untitled Quiz',
        description = '',
        keywords = '',
        difficulty = 'medium',
        totalQuestions,
        timeLimitMinutes = 10,
        questions = [],
        status = 'published'
    } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Quiz must have at least one question'
        });
    }

    // Ensure sequential IDs and 4 options
    const standardKeys = ['A', 'B', 'C', 'D'];
    const sanitizedQuestions = questions.map((q, idx) => {
        const seqId = idx + 1;
        const opts = (Array.isArray(q.options) ? q.options : []).slice(0, 4);
        while (opts.length < 4) {
            const nextKey = standardKeys[opts.length];
            opts.push({ key: nextKey, text: `Option ${nextKey}` });
        }
        const normalizedOpts = standardKeys.map((key, optIdx) => ({
            key,
            text: opts[optIdx]?.text || `Option ${key}`
        }));

        let correctOpt = (q.correctOption || 'A').toUpperCase();
        if (!standardKeys.includes(correctOpt)) correctOpt = 'A';

        return {
            id: seqId,
            question: q.question || `Question ${seqId}`,
            options: normalizedOpts,
            correctOption: correctOpt,
            explanation: q.explanation || '',
            difficulty: q.difficulty || difficulty || 'medium',
            points: q.points || 1
        };
    });

    // Generate unique short code
    let code = generateQuizCode();
    let exists = await prisma.quiz.findUnique({ where: { code } });
    let attempts = 0;
    while (exists && attempts < 10) {
        code = generateQuizCode();
        exists = await prisma.quiz.findUnique({ where: { code } });
        attempts++;
    }

    const quiz = await prisma.quiz.create({
        data: {
            code,
            title: title.trim() || `Quiz on ${keywords || 'General Topic'}`,
            description: description || '',
            keywords: keywords || '',
            difficulty: difficulty || 'medium',
            totalQuestions: sanitizedQuestions.length,
            timeLimitMinutes: Math.max(parseInt(timeLimitMinutes) || 10, 1),
            questions: sanitizedQuestions,
            status: status === 'draft' ? 'draft' : 'published',
            createdById: req.user.id,
            schoolId: req.user.schoolId || null
        }
    });

    res.status(201).json({
        success: true,
        message: 'Quiz created successfully',
        data: quiz
    });
}));

/**
 * @route   PUT /api/quiz/:id
 * @desc    Update existing quiz (questions, metadata, status)
 * @access  Private (Creator or Admin)
 */
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        keywords,
        difficulty,
        timeLimitMinutes,
        questions,
        status
    } = req.body;

    const existing = await prisma.quiz.findUnique({ where: { id } });
    if (!existing) {
        return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    // Permission check: only creator or admin/principal can update
    const isOwner = existing.createdById === req.user.id;
    const isAdmin = ['admin', 'principal'].includes(req.user.role);
    if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Not authorized to edit this quiz' });
    }

    let sanitizedQuestions = existing.questions;
    if (Array.isArray(questions)) {
        const standardKeys = ['A', 'B', 'C', 'D'];
        sanitizedQuestions = questions.map((q, idx) => {
            const seqId = idx + 1;
            const opts = (Array.isArray(q.options) ? q.options : []).slice(0, 4);
            while (opts.length < 4) {
                const nextKey = standardKeys[opts.length];
                opts.push({ key: nextKey, text: `Option ${nextKey}` });
            }
            const normalizedOpts = standardKeys.map((key, optIdx) => ({
                key,
                text: opts[optIdx]?.text || `Option ${key}`
            }));

            let correctOpt = (q.correctOption || 'A').toUpperCase();
            if (!standardKeys.includes(correctOpt)) correctOpt = 'A';

            return {
                id: seqId,
                question: q.question || `Question ${seqId}`,
                options: normalizedOpts,
                correctOption: correctOpt,
                explanation: q.explanation || '',
                difficulty: q.difficulty || difficulty || existing.difficulty,
                points: q.points || 1
            };
        });
    }

    const updated = await prisma.quiz.update({
        where: { id },
        data: {
            ...(title !== undefined ? { title } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(keywords !== undefined ? { keywords } : {}),
            ...(difficulty !== undefined ? { difficulty } : {}),
            ...(timeLimitMinutes !== undefined ? { timeLimitMinutes: Math.max(parseInt(timeLimitMinutes) || 10, 1) } : {}),
            ...(Array.isArray(questions) ? { questions: sanitizedQuestions, totalQuestions: sanitizedQuestions.length } : {}),
            ...(status !== undefined ? { status } : {}),
            updatedAt: new Date()
        }
    });

    res.json({
        success: true,
        message: 'Quiz updated successfully',
        data: updated
    });
}));

/**
 * @route   GET /api/quiz
 * @desc    List quizzes (Admin/Instructor sees drafts + published; students see published)
 * @access  Private (Authenticated)
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const { status, q, page = 1, limit = 50 } = req.query;
    const isStaff = ['admin', 'instructor', 'principal', 'lab_assistant'].includes(req.user.role);

    const where = {};
    if (req.user.schoolId) {
        where.OR = [
            { schoolId: req.user.schoolId },
            { schoolId: null },
            { createdById: req.user.id }
        ];
    }

    // Role-based status filtering
    if (!isStaff) {
        // Students can only access published quizzes
        where.status = 'published';
    } else if (status) {
        where.status = status;
    }

    if (q && q.trim()) {
        const query = q.trim();
        where.AND = [
            {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { keywords: { contains: query, mode: 'insensitive' } },
                    { code: { contains: query, mode: 'insensitive' } }
                ]
            }
        ];
    }

    const [quizzes, total] = await Promise.all([
        prisma.quiz.findMany({
            where,
            include: {
                creator: {
                    select: { id: true, firstName: true, lastName: true, role: true }
                },
                _count: {
                    select: { submissions: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        }),
        prisma.quiz.count({ where })
    ]);

    res.json({
        success: true,
        data: {
            quizzes,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        }
    });
}));

/**
 * @route   GET /api/quiz/my-results
 * @desc    Get current user's quiz submissions
 * @access  Private (Authenticated)
 */
router.get('/my-results', authenticate, asyncHandler(async (req, res) => {
    const submissions = await prisma.quizSubmission.findMany({
        where: { userId: req.user.id },
        include: {
            quiz: {
                select: {
                    id: true,
                    code: true,
                    title: true,
                    difficulty: true,
                    totalQuestions: true,
                    timeLimitMinutes: true
                }
            }
        },
        orderBy: { submittedAt: 'desc' }
    });

    res.json({
        success: true,
        data: submissions
    });
}));

/**
 * @route   GET /api/quiz/take/:idOrCode
 * @desc    Fetch quiz for taking (STRIPS correctOption and explanation to prevent cheating)
 * @access  Public / Optional Auth (Prompts login if not authenticated)
 */
router.get('/take/:idOrCode', optionalAuth, asyncHandler(async (req, res) => {
    const { idOrCode } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode.trim());

    const quiz = await prisma.quiz.findFirst({
        where: isUuid
            ? { id: idOrCode.trim() }
            : { code: idOrCode.trim().toUpperCase() },
        include: {
            creator: {
                select: { id: true, firstName: true, lastName: true }
            }
        }
    });

    if (!quiz) {
        return res.status(404).json({
            success: false,
            message: 'Quiz not found. Please verify the link or Quiz Code.'
        });
    }

    // Check publication status
    const isStaff = req.user && ['admin', 'instructor', 'principal'].includes(req.user.role);
    const isCreator = req.user && quiz.createdById === req.user.id;
    if (quiz.status === 'draft' && !isStaff && !isCreator) {
        return res.status(403).json({
            success: false,
            message: 'This quiz is currently in Draft mode and has not been published by the instructor yet.'
        });
    }

    // ANTI-CHEAT SANITIZATION: Strip answers and explanations
    const rawQuestions = Array.isArray(quiz.questions) ? quiz.questions : [];
    const sanitizedQuestions = rawQuestions.map(q => ({
        id: q.id,
        question: q.question,
        options: (q.options || []).map(opt => ({
            key: opt.key,
            text: opt.text
        })),
        points: q.points || 1
    }));

    res.json({
        success: true,
        data: {
            id: quiz.id,
            code: quiz.code,
            title: quiz.title,
            description: quiz.description,
            keywords: quiz.keywords,
            difficulty: quiz.difficulty,
            totalQuestions: quiz.totalQuestions,
            timeLimitMinutes: quiz.timeLimitMinutes,
            status: quiz.status,
            creator: quiz.creator,
            questions: sanitizedQuestions
        }
    });
}));

/**
 * @route   GET /api/quiz/:id
 * @desc    Get full quiz details (with questions and answers for creator/admin)
 * @access  Private (Creator or Admin)
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());

    const quiz = await prisma.quiz.findFirst({
        where: isUuid ? { id: id.trim() } : { code: id.trim().toUpperCase() },
        include: {
            creator: {
                select: { id: true, firstName: true, lastName: true, email: true, role: true }
            },
            _count: {
                select: { submissions: true }
            }
        }
    });

    if (!quiz) {
        return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    res.json({
        success: true,
        data: quiz
    });
}));

/**
 * @route   POST /api/quiz/:id/submit
 * @desc    Submit answers for a quiz (grades on server & stores with login ID)
 * @access  Private (Authenticated)
 */
router.post('/:id/submit', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { answers = [], timeTakenSeconds = 0, isTimedOut = false } = req.body;
    const userId = req.user.id; // User Login ID

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
    const quiz = await prisma.quiz.findFirst({
        where: isUuid ? { id: id.trim() } : { code: id.trim().toUpperCase() }
    });

    if (!quiz) {
        return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const groundTruth = Array.isArray(quiz.questions) ? quiz.questions : [];
    let correctCount = 0;
    let totalScore = 0;
    let maxScore = 0;

    // Grade each submitted response against ground truth
    const detailedAnswers = groundTruth.map((q) => {
        const studentAns = (answers || []).find(a => String(a.questionId) === String(q.id));
        const selectedOption = studentAns?.selectedOption ? String(studentAns.selectedOption).toUpperCase() : null;
        const correctOption = String(q.correctOption || 'A').toUpperCase();
        const isCorrect = selectedOption === correctOption;
        const points = q.points || 1;

        maxScore += points;
        if (isCorrect) {
            correctCount++;
            totalScore += points;
        }

        return {
            questionId: q.id,
            questionText: q.question,
            selectedOption,
            correctOption,
            isCorrect,
            explanation: q.explanation || '',
            pointsEarned: isCorrect ? points : 0,
            maxPoints: points
        };
    });

    const totalQuestions = groundTruth.length;
    const percentage = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(1)) : 0;

    const submission = await prisma.quizSubmission.create({
        data: {
            quizId: quiz.id,
            userId,
            score: totalScore,
            maxScore,
            percentage,
            correctAnswers: correctCount,
            totalQuestions,
            timeTakenSeconds: Math.max(parseInt(timeTakenSeconds) || 0, 0),
            answers: detailedAnswers,
            isTimedOut: Boolean(isTimedOut)
        }
    });

    res.json({
        success: true,
        message: 'Quiz submitted and graded successfully',
        data: {
            submissionId: submission.id,
            quizId: quiz.id,
            quizTitle: quiz.title,
            userId: req.user.id,
            userName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim(),
            score: totalScore,
            maxScore,
            percentage,
            correctAnswers: correctCount,
            totalQuestions,
            timeTakenSeconds: submission.timeTakenSeconds,
            isTimedOut: submission.isTimedOut,
            answers: detailedAnswers,
            submittedAt: submission.submittedAt
        }
    });
}));

/**
 * @route   GET /api/quiz/:id/results
 * @desc    Get all submissions / leaderboard for a quiz
 * @access  Private (Creator or Admin)
 */
router.get('/:id/results', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());

    const quiz = await prisma.quiz.findFirst({
        where: isUuid ? { id: id.trim() } : { code: id.trim().toUpperCase() }
    });

    if (!quiz) {
        return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const submissions = await prisma.quizSubmission.findMany({
        where: { quizId: quiz.id },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    role: true
                }
            }
        },
        orderBy: [
            { score: 'desc' },
            { timeTakenSeconds: 'asc' }
        ]
    });

    // Summary statistics
    const totalParticipants = submissions.length;
    const avgScore = totalParticipants > 0
        ? (submissions.reduce((acc, s) => acc + s.score, 0) / totalParticipants).toFixed(1)
        : 0;
    const highestScore = totalParticipants > 0
        ? Math.max(...submissions.map(s => s.score))
        : 0;

    res.json({
        success: true,
        data: {
            quiz: {
                id: quiz.id,
                code: quiz.code,
                title: quiz.title,
                difficulty: quiz.difficulty,
                totalQuestions: quiz.totalQuestions,
                timeLimitMinutes: quiz.timeLimitMinutes
            },
            summary: {
                totalParticipants,
                avgScore: Number(avgScore),
                highestScore: Number(highestScore),
                maxPossibleScore: quiz.totalQuestions
            },
            submissions: submissions.map((sub, idx) => ({
                rank: idx + 1,
                id: sub.id,
                userId: sub.user.id,
                userName: `${sub.user.firstName || ''} ${sub.user.lastName || ''}`.trim() || 'Anonymous',
                userEmail: sub.user.email,
                userRole: sub.user.role,
                score: sub.score,
                maxScore: sub.maxScore,
                percentage: sub.percentage,
                correctAnswers: sub.correctAnswers,
                totalQuestions: sub.totalQuestions,
                timeTakenSeconds: sub.timeTakenSeconds,
                isTimedOut: sub.isTimedOut,
                submittedAt: sub.submittedAt
            }))
        }
    });
}));

/**
 * @route   GET /api/quiz/submission/:submissionId
 * @desc    Get detailed review of a specific submission
 * @access  Private (Owner or Admin)
 */
router.get('/submission/:submissionId', authenticate, asyncHandler(async (req, res) => {
    const { submissionId } = req.params;

    const submission = await prisma.quizSubmission.findUnique({
        where: { id: submissionId },
        include: {
            quiz: {
                select: { id: true, code: true, title: true, difficulty: true, totalQuestions: true, timeLimitMinutes: true },
            },
            user: {
                select: { id: true, firstName: true, lastName: true, email: true }
            }
        }
    });

    if (!submission) {
        return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // Permission check
    const isOwner = submission.userId === req.user.id;
    const isStaff = ['admin', 'instructor', 'principal'].includes(req.user.role);
    if (!isOwner && !isStaff) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this result' });
    }

    res.json({
        success: true,
        data: submission
    });
}));

/**
 * @route   DELETE /api/quiz/:id
 * @desc    Delete a quiz
 * @access  Private (Creator or Admin)
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());

    const quiz = await prisma.quiz.findFirst({
        where: isUuid ? { id: id.trim() } : { code: id.trim().toUpperCase() }
    });

    if (!quiz) {
        return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const isOwner = quiz.createdById === req.user.id;
    const isAdmin = ['admin', 'principal'].includes(req.user.role);
    if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this quiz' });
    }

    await prisma.quiz.delete({ where: { id: quiz.id } });

    res.json({
        success: true,
        message: 'Quiz deleted successfully'
    });
}));

module.exports = router;
