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

// Robust JSON parser for AI outputs containing raw LaTeX backslashes (e.g. \ce, \alpha, \frac)
function repairAndParseJson(rawText) {
    // 1. Clean markdown code fences if present
    let text = (rawText || '')
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

    // 2. Direct parse attempt
    try {
        return JSON.parse(text);
    } catch (_) {
        // Fall through to regex extraction and backslash repair
    }

    // 3. Extract array block if surrounded by extraneous thoughts/text
    const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
        text = arrayMatch[0];
    }

    try {
        return JSON.parse(text);
    } catch (_) {
        // Fall through to string-aware escape repair
    }

    // 4. Tokenize and fix invalid JSON escape sequences
    // In JSON, only \", \\, \/, \b, \f, \n, \r, \t, \uXXXX are valid.
    // In LaTeX equations, backslashes are pervasive (\ce, \alpha, \frac, \beta, \text, \mu, etc.).
    // If the LLM generates a single backslash instead of escaping it (e.g. "\ce{CH3COCH3}"),
    // standard JSON.parse fails with "Bad escaped character in JSON".
    let inString = false;
    let escaped = false;
    let repaired = '';

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === '"' && !escaped) {
            inString = !inString;
            repaired += char;
            continue;
        }

        if (inString) {
            if (char === '\\') {
                const nextChar = text[i + 1];

                // Detect LaTeX commands that might accidentally match JSON escapes \f or \b
                const isLatexFrac = text.slice(i, i + 5) === '\\frac';
                const isLatexBeta = text.slice(i, i + 5) === '\\beta';

                if (isLatexFrac || isLatexBeta) {
                    repaired += '\\\\';
                } else if ('"\\/nrt'.includes(nextChar)) {
                    // Valid standard JSON escape
                    repaired += char;
                    repaired += nextChar;
                    i++;
                } else if (nextChar === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
                    // Valid unicode escape \uXXXX
                    repaired += char;
                } else {
                    // Unescaped LaTeX backslash (e.g. \c, \a, \s, \t, etc.): double escape it
                    repaired += '\\\\';
                }
            } else {
                repaired += char;
            }
        } else {
            repaired += char;
        }
    }

    return JSON.parse(repaired);
}

// Helper to normalize bare \ce without braces or un-delimited chemical formulas into proper $\ce{...}$
function cleanLatexChemistry(str) {
    if (!str || typeof str !== 'string') return '';

    let out = str;

    // 0. Dollar-wrapped bare \ce: $\ce Na^+$ -> $\ce{Na^+}$ or $\ce Al^{3+}$ -> $\ce{Al^{3+}}$
    out = out.replace(/\$\s*\\ce\s+([A-Za-z0-9\[\]\(\)\{\}\^\_\+\-\=\.\s]+?)\s*\$/g, (match, formula) => {
        return `$\\ce{${formula.trim()}}$`;
    });

    // 1. Braced \ce{...} not yet wrapped in $ (supports nested braces like \ce{Al^{3+}} or \ce{SO4^{2-}})
    out = out.replace(/(?<!\$)\\ce\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}(?!\$)/g, '$\\ce{$1}$');

    // 2. Bare \ce formula with optional internal bond spaces (e.g. "R - CH2OH", "Na^+", "Al^{3+}", "Ne")
    out = out.replace(/(?<!\$)\\ce\s+([A-Za-z0-9\[\]\(\)\{\}\^\_\+\-\=\.]+(?:\s+[\-\+\=\>]+\s+[A-Za-z0-9\[\]\(\)\{\}\^\_\+\-\=\.]+)*)(?=(?:[\s\)\,\;\.\?\:\!]*(?:[\)\,\;\.\?\:\!]|\s+[a-z]{2,}\b|\s+[A-Z][a-z]{2,}\b|\s*$)))/g, (match, formula) => {
        return `$\\ce{${formula.trim()}}$`;
    });

    // 3. Fallback: Any remaining stray \ce <formula> that didn't hit previous lookaheads
    out = out.replace(/(?<!\$)\\ce\s+([A-Za-z0-9\[\]\(\)\{\}\^\_\+\-\=\.]+)(?!\$)/g, (match, formula) => {
        return `$\\ce{${formula.trim()}}$`;
    });

    return out;
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
7. PCMB & SCIENTIFIC EQUATION FORMATTING:
   - For Physics, Mathematics, Biology, and Chemistry questions, format equations, formulas, and scientific units using LaTeX:
     * Inline math / variables / units: wrap in single dollar signs, e.g. $F = ma$, $\\lambda = \\frac{h}{p}$, $\\int_{0}^{1} x^2 dx$, $25^\\circ\\text{C}$, $\\mu\\text{m}$, $\\alpha, \\beta$.
     * Block equations: wrap in double dollar signs, e.g. $$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$$.
     * Chemistry formulas & reactions: ALWAYS wrap with $\\ce{...}$ including curly braces for ALL formulas, ions, and elements (e.g. $\\ce{Na+}$, $\\ce{Mg^{2+}}$, $\\ce{Al^{3+}}$, $\\ce{F^-}$, $\\ce{Ne}$, $\\ce{2H2 + O2 -> 2H2O}$, $\\ce{CaCO3 -> CaO + CO2}$, $\\ce{SO4^{2-}}$, $\\ce{H2SO4}$). NEVER write bare \\ce without curly braces.
   - CRITICAL JSON ESCAPING: Backslashes in JSON strings MUST be escaped as \\\\ (e.g. "\\\\ce{...}", "\\\\alpha", "\\\\frac{...}"). Never output invalid unescaped backslashes.

JSON SCHEMA TO RETURN (RETURN ONLY VALID JSON, NO MARKDOWN, NO CODEBLOCKS):
[
  {
    "id": 1,
    "question": "Clear and concise question text (use LaTeX like $E = mc^2$ or $\\\\ce{H2O}$ where applicable)",
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

Ensure each question has 4 distinct options (A, B, C, D), a correctOption, and an explanation. If the topic involves Physics, Chemistry, Math, or Biology, properly format equations and formulas using LaTeX ($...$) and chemical formulas with $\\ce{...}$ (e.g. $\\ce{Na+}$, $\\ce{Al^{3+}}$, $\\ce{Ne}$). Remember to escape backslashes properly in JSON (\\\\). Return ONLY valid JSON array.`;

    try {
        const response = await aiService.executeChatCompletion({
            messages: [{ role: 'user', content: userPrompt }],
            systemPrompt,
            preferredProvider: 'auto',
            temperature: 0.2,
            maxTokens: 4000,
            jsonMode: true
        });

        const rawText = response.text || '';
        let questions = [];

        try {
            questions = repairAndParseJson(rawText);
        } catch (jsonErr) {
            console.error('[QuizRoutes] Failed to parse AI questions JSON:', jsonErr.message, 'Raw was:', rawText.slice(0, 300));
            throw new Error(`Failed to parse AI output into valid questions JSON: ${jsonErr.message}`);
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
                const rawOptText = existing ? (typeof existing === 'string' ? existing : existing.text || '') : `Option ${key}`;
                return {
                    key,
                    text: cleanLatexChemistry(rawOptText)
                };
            });

            let correctOpt = (q.correctOption || 'A').toUpperCase();
            if (!standardKeys.includes(correctOpt)) correctOpt = 'A';

            return {
                id: seqNumber,
                question: cleanLatexChemistry(q.question || `Question ${seqNumber}`),
                options: normalizedOptions,
                correctOption: correctOpt,
                explanation: cleanLatexChemistry(q.explanation || 'No explanation provided.'),
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
        maxAttempts = 1,
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
            text: cleanLatexChemistry(opts[optIdx]?.text || `Option ${key}`)
        }));

        let correctOpt = (q.correctOption || 'A').toUpperCase();
        if (!standardKeys.includes(correctOpt)) correctOpt = 'A';

        return {
            id: seqId,
            question: cleanLatexChemistry(q.question || `Question ${seqId}`),
            options: normalizedOpts,
            correctOption: correctOpt,
            explanation: cleanLatexChemistry(q.explanation || ''),
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
            maxAttempts: Math.max(parseInt(maxAttempts) || 1, 1),
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
        maxAttempts,
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
                text: cleanLatexChemistry(opts[optIdx]?.text || `Option ${key}`)
            }));

            let correctOpt = (q.correctOption || 'A').toUpperCase();
            if (!standardKeys.includes(correctOpt)) correctOpt = 'A';

            return {
                id: seqId,
                question: cleanLatexChemistry(q.question || `Question ${seqId}`),
                options: normalizedOpts,
                correctOption: correctOpt,
                explanation: cleanLatexChemistry(q.explanation || ''),
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
            ...(maxAttempts !== undefined ? { maxAttempts: Math.max(parseInt(maxAttempts) || 1, 1) } : {}),
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
        // Students can only access published quizzes assigned to their class, group, or user account
        where.status = 'published';
        const enrollments = await prisma.classEnrollment.findMany({
            where: { studentId: req.user.id, status: 'active' },
            select: { classId: true }
        });
        const studentClassIds = enrollments.map(e => e.classId);

        const groupMembers = await prisma.groupMember.findMany({
            where: { studentId: req.user.id },
            select: { groupId: true }
        });
        const studentGroupIds = groupMembers.map(g => g.groupId);

        where.assignments = {
            some: {
                OR: [
                    { targetType: 'class', targetClassId: { in: studentClassIds } },
                    { targetType: 'group', targetGroupId: { in: studentGroupIds } },
                    { targetType: 'student', targetStudentId: req.user.id }
                ]
            }
        };
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
                    select: { submissions: true, assignments: true }
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

    // Check assignment access for students
    if (req.user && req.user.role === 'student') {
        const isAssigned = await checkStudentQuizAssignment(quiz.id, req.user.id);
        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                message: 'This quiz has not been assigned to your class, group, or user account.'
            });
        }
    }

    // Check attempts taken
    let attemptsTaken = 0;
    if (req.user) {
        attemptsTaken = await prisma.quizSubmission.count({
            where: { quizId: quiz.id, userId: req.user.id }
        });
    }
    const maxAttempts = quiz.maxAttempts || 1;
    const canAttempt = attemptsTaken < maxAttempts;

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
            maxAttempts,
            attemptsTaken,
            canAttempt,
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

    // Check assignment access for students
    if (req.user.role === 'student') {
        const isAssigned = await checkStudentQuizAssignment(quiz.id, req.user.id);
        if (!isAssigned) {
            return res.status(403).json({
                success: false,
                message: 'This quiz has not been assigned to your class, group, or user account.'
            });
        }
    }

    // Check attempts limit
    const priorAttempts = await prisma.quizSubmission.count({
        where: { quizId: quiz.id, userId }
    });
    const maxAttempts = quiz.maxAttempts || 1;
    if (priorAttempts >= maxAttempts) {
        return res.status(403).json({
            success: false,
            message: `Maximum attempts reached (${maxAttempts}/${maxAttempts}) for this quiz.`
        });
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
            options: (q.options || []).map(opt => ({
                key: String(opt.key || '').toUpperCase(),
                text: opt.text || ''
            })),
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
                answers: sub.answers || [],
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
 * @route   POST /api/quiz/bulk-delete
 * @desc    Delete multiple quizzes at once
 * @access  Private (Creator or Admin)
 */
router.post('/bulk-delete', authenticate, asyncHandler(async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No quiz IDs provided' });
    }

    const isAdmin = ['admin', 'principal'].includes(req.user.role);
    const validUuids = ids.filter(id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim()));

    if (validUuids.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid quiz IDs provided' });
    }

    const where = isAdmin 
        ? { id: { in: validUuids } }
        : { id: { in: validUuids }, createdById: req.user.id };

    const deleteResult = await prisma.quiz.deleteMany({ where });

    res.json({
        success: true,
        message: `Successfully deleted ${deleteResult.count} quizzes`,
        count: deleteResult.count
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

/**
 * Helper to assign targets to a specific quiz
 */
async function assignQuizTargets(quizId, { targetType, targetClassId, targetClassIds, targetGroupId, targetGroupIds, targetStudentId, targetStudentIds, assignedById }) {
    const createdAssignments = [];
    const classIds = Array.isArray(targetClassIds) ? targetClassIds : (targetClassId ? [targetClassId] : []);
    const groupIds = Array.isArray(targetGroupIds) ? targetGroupIds : (targetGroupId ? [targetGroupId] : []);
    const studentIds = Array.isArray(targetStudentIds) ? targetStudentIds : (targetStudentId ? [targetStudentId] : []);

    // 1. Classes
    if (targetType === 'class' || (!targetType && classIds.length > 0) || targetType === 'multi') {
        for (const cId of classIds) {
            if (!cId) continue;
            const existing = await prisma.quizAssignment.findFirst({
                where: { quizId, targetType: 'class', targetClassId: cId }
            });
            if (!existing) {
                const assign = await prisma.quizAssignment.create({
                    data: {
                        quizId,
                        targetType: 'class',
                        targetClassId: cId,
                        assignedById
                    }
                });
                createdAssignments.push(assign);
            }
        }
    }

    // 2. Groups
    if (targetType === 'group' || (!targetType && groupIds.length > 0) || targetType === 'multi') {
        for (const gId of groupIds) {
            if (!gId) continue;
            const existing = await prisma.quizAssignment.findFirst({
                where: { quizId, targetType: 'group', targetGroupId: gId }
            });
            if (!existing) {
                let classIdForGroup = targetClassId || null;
                if (!classIdForGroup) {
                    const grp = await prisma.studentGroup.findUnique({ where: { id: gId }, select: { classId: true } });
                    if (grp) classIdForGroup = grp.classId;
                }
                const assign = await prisma.quizAssignment.create({
                    data: {
                        quizId,
                        targetType: 'group',
                        targetGroupId: gId,
                        targetClassId: classIdForGroup,
                        assignedById
                    }
                });
                createdAssignments.push(assign);
            }
        }
    }

    // 3. Students
    if (targetType === 'student' || (!targetType && studentIds.length > 0) || targetType === 'multi') {
        for (const sId of studentIds) {
            if (!sId) continue;
            const existing = await prisma.quizAssignment.findFirst({
                where: { quizId, targetType: 'student', targetStudentId: sId }
            });
            if (!existing) {
                const assign = await prisma.quizAssignment.create({
                    data: {
                        quizId,
                        targetType: 'student',
                        targetStudentId: sId,
                        targetClassId: targetClassId || null,
                        assignedById
                    }
                });
                createdAssignments.push(assign);
            }
        }
    }

    return createdAssignments;
}

/**
 * @route   POST /api/quiz/bulk-assign
 * @desc    Assign multiple quizzes to multiple classes, groups, or students
 * @access  Private (Staff)
 */
router.post('/bulk-assign', authenticate, asyncHandler(async (req, res) => {
    const isStaff = ['admin', 'instructor', 'principal', 'lab_assistant'].includes(req.user.role);
    if (!isStaff) {
        return res.status(403).json({ success: false, message: 'Only instructors and administrators can assign quizzes.' });
    }

    const { quizIds, targetType, targetClassId, targetClassIds, targetGroupId, targetGroupIds, targetStudentId, targetStudentIds } = req.body;
    if (!Array.isArray(quizIds) || quizIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Please provide at least one quiz to assign.' });
    }

    let allCreatedAssignments = [];
    for (const qId of quizIds) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(qId).trim());
        const quiz = await prisma.quiz.findFirst({
            where: isUuid ? { id: String(qId).trim() } : { code: String(qId).trim().toUpperCase() }
        });
        if (!quiz) continue;

        const created = await assignQuizTargets(quiz.id, {
            targetType,
            targetClassId,
            targetClassIds,
            targetGroupId,
            targetGroupIds,
            targetStudentId,
            targetStudentIds,
            assignedById: req.user.id
        });
        allCreatedAssignments.push(...created);
    }

    res.json({
        success: true,
        message: `Successfully processed assignments for ${quizIds.length} quiz(zes)`,
        data: allCreatedAssignments
    });
}));

/**
 * @route   POST /api/quiz/:id/assign
 * @desc    Assign quiz to class(es), group(s), or student(s)
 * @access  Private (Staff: Admin, Instructor, Principal, Lab Assistant)
 */
router.post('/:id/assign', authenticate, asyncHandler(async (req, res) => {
    const isStaff = ['admin', 'instructor', 'principal', 'lab_assistant'].includes(req.user.role);
    if (!isStaff) {
        return res.status(403).json({ success: false, message: 'Only instructors and administrators can assign quizzes.' });
    }

    const { id } = req.params;
    const { targetType, targetClassId, targetClassIds, targetGroupId, targetGroupIds, targetStudentId, targetStudentIds } = req.body;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
    const quiz = await prisma.quiz.findFirst({
        where: isUuid ? { id: id.trim() } : { code: id.trim().toUpperCase() }
    });

    if (!quiz) {
        return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const createdAssignments = await assignQuizTargets(quiz.id, {
        targetType,
        targetClassId,
        targetClassIds,
        targetGroupId,
        targetGroupIds,
        targetStudentId,
        targetStudentIds,
        assignedById: req.user.id
    });

    res.json({
        success: true,
        message: 'Quiz assigned successfully',
        data: createdAssignments
    });
}));

/**
 * @route   GET /api/quiz/:id/assignments
 * @desc    Get all active assignments for a quiz
 * @access  Private (Staff or Creator)
 */
router.get('/:id/assignments', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());
    const quiz = await prisma.quiz.findFirst({
        where: isUuid ? { id: id.trim() } : { code: id.trim().toUpperCase() }
    });

    if (!quiz) {
        return res.status(404).json({ success: false, message: 'Quiz not found' });
    }

    const assignments = await prisma.quizAssignment.findMany({
        where: { quizId: quiz.id },
        include: {
            class: { select: { id: true, name: true, gradeLevel: true, section: true } },
            group: { select: { id: true, name: true } },
            student: { select: { id: true, firstName: true, lastName: true, email: true, studentId: true } },
            assignedBy: { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: { assignedAt: 'desc' }
    });

    res.json({
        success: true,
        data: assignments
    });
}));

/**
 * @route   DELETE /api/quiz/:quizId/assignments/:assignmentId
 * @desc    Remove an assignment from a quiz
 * @access  Private (Staff or Creator)
 */
router.delete('/:quizId/assignments/:assignmentId', authenticate, asyncHandler(async (req, res) => {
    const { assignmentId } = req.params;
    const isStaff = ['admin', 'instructor', 'principal', 'lab_assistant'].includes(req.user.role);
    if (!isStaff) {
        return res.status(403).json({ success: false, message: 'Not authorized to remove assignment' });
    }

    await prisma.quizAssignment.delete({
        where: { id: assignmentId }
    });

    res.json({
        success: true,
        message: 'Quiz assignment removed successfully'
    });
}));

module.exports = router;
