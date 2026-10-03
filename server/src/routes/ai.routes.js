const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const prisma = require('../config/database');
const aiService = require('../services/ai.service');
const chatbotService = require('../services/chatbot.service');
const notificationService = require('../services/notificationService');
const fs = require('fs');
const path = require('path');

const upload = multer({
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

/**
 * @route   POST /api/ai/parse-assignments
 * @desc    Extract assignments from uploaded image and resolve target entities via AI
 * @access  Private (Instructor / Admin)
 */
router.post('/parse-assignments', authenticate, authorize('instructor', 'lab_assistant', 'admin', 'principal'), upload.single('image'), asyncHandler(async (req, res) => {
    const { prompt = '', provider = 'groq', subjectId = '' } = req.body;
    
    if (!req.file && (!prompt || !prompt.trim())) {
        return res.status(400).json({
            success: false,
            message: 'Either an image file or a prompt instruction is required'
        });
    }

    const schoolId = req.user.schoolId || null;

    // Fetch school context (Classes, Groups, Students, Subjects)
    const [classes, groups, students, subjects] = await Promise.all([
        prisma.class.findMany({
            where: schoolId ? { schoolId } : {},
            select: { id: true, name: true, gradeLevel: true, section: true }
        }),
        prisma.studentGroup.findMany({
            where: schoolId ? { class: { schoolId } } : {},
            select: { id: true, name: true, class: { select: { name: true } } }
        }),
        prisma.user.findMany({
            where: { role: 'student', ...(schoolId ? { schoolId } : {}) },
            select: { id: true, firstName: true, lastName: true, admissionNumber: true }
        }),
        prisma.subject.findMany({
            select: { id: true, name: true, code: true }
        })
    ]);

    // 1. Extract assignments (via image vision AI or text-only generation AI)
    let extractedAssignments = [];
    if (req.file) {
        extractedAssignments = await aiService.extractAssignmentsFromImage(
            req.file.buffer,
            req.file.mimetype,
            prompt,
            provider
        );
    } else {
        extractedAssignments = await aiService.extractAssignmentsFromText(
            prompt,
            provider
        );
    }

    // 2. Parse targets and subject match from prompt via AI
    const targetResolution = await aiService.parseAssignmentTargets(
        prompt,
        { classes, groups, students, subjects },
        provider
    );

    // Calculate default due date (24 hours from now unless specified)
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + (targetResolution.dueDateHoursFromNow || 24));

    // Determine default status
    const shouldPublishNow = prompt.toLowerCase().includes('publish now') || prompt.toLowerCase().includes('publish immediately') || targetResolution.publishImmediately;
    const status = shouldPublishNow ? 'published' : 'published';

    // Resolved subject (use user selected subjectId if provided, else AI resolved, else CS default)
    let defaultSubjectId = subjectId || targetResolution.selectedSubjectId;
    if (!defaultSubjectId) {
        const csSubject = subjects.find(s => s.name?.toLowerCase().includes('computer'));
        defaultSubjectId = csSubject ? csSubject.id : subjects[0]?.id;
    }

    res.json({
        success: true,
        message: `Extracted ${extractedAssignments.length} assignment(s) successfully`,
        data: {
            extractedAssignments,
            targetResolution: {
                ...targetResolution,
                selectedSubjectId: defaultSubjectId,
                status,
                dueDate: dueDate.toISOString()
            },
            availableSubjects: subjects
        }
    });
}));

/**
 * @route   POST /api/ai/batch-create
 * @desc    Batch save and publish AI generated assignments
 * @access  Private (Instructor / Admin)
 */
router.post('/batch-create', authenticate, authorize('instructor', 'lab_assistant', 'admin', 'principal'), asyncHandler(async (req, res) => {
    const {
        assignments = [],
        subjectId,
        labId,
        academicYearId,
        practicalMarks = 60,
        vivaMarks = 20,
        outputMarks = 20,
        maxMarks = 100,
        status = 'published',
        dueDate,
        targetClassIds = [],
        targetGroupIds = [],
        targetStudentIds = []
    } = req.body;

    if (!assignments || assignments.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No assignments provided for creation'
        });
    }

    if (!subjectId) {
        return res.status(400).json({
            success: false,
            message: 'Subject ID is required'
        });
    }

    const sessionId = academicYearId || req.headers['x-academic-session'];
    const createdAssignments = [];

    // Default due date: 24 hours from now if not provided
    const finalDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const fallbackSchool = await prisma.school.findFirst({ select: { id: true } });
    const schoolIdToUse = req.user.schoolId || fallbackSchool?.id;

    for (let i = 0; i < assignments.length; i++) {
        const item = assignments[i];
        const title = item.title || `Lab Assignment #${i + 1}`;
        const description = item.description || item.aim || title;

        const assignment = await prisma.assignment.create({
            data: {
                schoolId: schoolIdToUse,
                createdById: req.user.id,
                subjectId,
                labId: labId || null,
                academicYearId: sessionId || null,
                title,
                description,
                aim: item.aim || null,
                theory: item.theory || null,
                procedure: item.procedure || null,
                expectedOutput: item.expectedOutput || null,
                experimentNumber: item.experimentNumber || `${i + 1}`,
                assignmentType: item.assignmentType || 'program',
                programmingLanguage: item.programmingLanguage || 'python',
                maxMarks: Number(maxMarks) || 100,
                practicalMarks: Number(practicalMarks) || 60,
                vivaMarks: Number(vivaMarks) || 20,
                outputMarks: Number(outputMarks) || 20,
                status: status || 'published',
                due_date: finalDueDate
            }
        });

        // Add Target Associations (Classes)
        for (const classId of targetClassIds) {
            await prisma.assignmentTarget.create({
                data: {
                    assignmentId: assignment.id,
                    targetType: 'class',
                    targetClassId: classId,
                    assignedById: req.user.id,
                    dueDate: finalDueDate,
                    publishDate: status === 'published' ? new Date() : null
                }
            });

            if (status === 'published') {
                try {
                    await notificationService.notifyClass({
                        classId,
                        title: `New Work Assigned: ${assignment.title}`,
                        message: `You have been assigned new lab work. Due: ${finalDueDate.toLocaleDateString('en-IN')}`,
                        type: 'work_assigned',
                        referenceType: 'assignment',
                        referenceId: assignment.id,
                        actionUrl: '/my-work'
                    });
                } catch (err) {
                    console.warn('Failed to notify class:', err.message);
                }
            }
        }

        // Add Target Associations (Groups)
        for (const groupId of targetGroupIds) {
            await prisma.assignmentTarget.create({
                data: {
                    assignmentId: assignment.id,
                    targetType: 'group',
                    targetGroupId: groupId,
                    assignedById: req.user.id,
                    dueDate: finalDueDate,
                    publishDate: status === 'published' ? new Date() : null
                }
            });

            if (status === 'published') {
                try {
                    await notificationService.notifyGroup({
                        groupId,
                        title: `New Work Assigned: ${assignment.title}`,
                        message: `You have been assigned new lab work. Due: ${finalDueDate.toLocaleDateString('en-IN')}`,
                        type: 'work_assigned',
                        referenceType: 'assignment',
                        referenceId: assignment.id,
                        actionUrl: '/my-work'
                    });
                } catch (err) {
                    console.warn('Failed to notify group:', err.message);
                }
            }
        }

        // Add Target Associations (Students)
        for (const studentId of targetStudentIds) {
            await prisma.assignmentTarget.create({
                data: {
                    assignmentId: assignment.id,
                    targetType: 'student',
                    targetStudentId: studentId,
                    assignedById: req.user.id,
                    dueDate: finalDueDate,
                    publishDate: status === 'published' ? new Date() : null
                }
            });

            if (status === 'published') {
                try {
                    await notificationService.createNotification({
                        userId: studentId,
                        title: `New Work Assigned: ${assignment.title}`,
                        message: `You have been assigned new lab work. Due: ${finalDueDate.toLocaleDateString('en-IN')}`,
                        type: 'work_assigned',
                        referenceType: 'assignment',
                        referenceId: assignment.id,
                        actionUrl: '/my-work'
                    });
                } catch (err) {
                    console.warn('Failed to notify student:', err.message);
                }
            }
        }

        // Activity log
        try {
            await prisma.activityLog.create({
                data: {
                    userId: req.user.id,
                    schoolId: req.user.schoolId || null,
                    actionType: 'assignment',
                    entityType: 'assignment',
                    entityId: assignment.id,
                    description: `AI Auto-created assignment: "${assignment.title}"`
                }
            });
        } catch (logError) {
            console.warn('Activity log failed:', logError.message);
        }

        createdAssignments.push(assignment);
    }

    res.status(201).json({
        success: true,
        message: `Successfully created and assigned ${createdAssignments.length} assignment(s)`,
        data: { createdAssignments }
    });
}));

/**
 * @route   POST /api/ai/generate-timetable-slots
 * @desc    Generate structured timetable slots from natural language prompt
 * @access  Private (Admin, Principal, Instructor)
 */
router.post('/generate-timetable-slots', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { prompt, classId, periodStructure = [], existingSlots = {}, provider = 'groq' } = req.body;

    if (!prompt || !prompt.trim()) {
        return res.status(400).json({
            success: false,
            message: 'Prompt instruction is required'
        });
    }

    const schoolId = req.user.schoolId || null;

    // Fetch class info, subjects and instructors for context
    const [classInfo, subjects, instructors] = await Promise.all([
        classId ? prisma.class.findUnique({
            where: { id: classId },
            select: { id: true, name: true, gradeLevel: true, section: true }
        }) : null,
        prisma.subject.findMany({
            where: {
                ...(schoolId ? { schoolId } : {}),
                ...(classId ? { classSubjects: { some: { classId } } } : {})
            },
            select: { id: true, name: true, code: true }
        }),
        prisma.user.findMany({
            where: {
                role: 'instructor',
                ...(schoolId ? { schoolId } : {})
            },
            select: { id: true, firstName: true, lastName: true, email: true }
        })
    ]);

    // If no subjects found for specific class, load all subjects for school
    let availableSubjects = subjects;
    if (availableSubjects.length === 0 && schoolId) {
        availableSubjects = await prisma.subject.findMany({
            where: { schoolId },
            select: { id: true, name: true, code: true }
        });
    }

    // Generate slots via AI service
    const generatedSlots = await aiService.generateTimetableSlots(
        prompt,
        { classInfo, subjects: availableSubjects, instructors, periodStructure, existingSlots },
        provider
    );

    res.json({
        success: true,
        message: `AI generated ${generatedSlots.length} timetable slot(s)`,
        data: {
            slots: generatedSlots,
            subjects: availableSubjects,
            instructors,
            classInfo
        }
    });
}));

/**
 * @route   POST /api/ai/card-assist
 * @desc    General purpose contextual Card AI copilot (Read -> Edit -> Insert)
 * @access  Private
 */
router.post('/card-assist', authenticate, asyncHandler(async (req, res) => {
    const { type, prompt = '', context = {}, refinement = '', provider = 'groq' } = req.body;

    if (!type) {
        return res.status(400).json({ success: false, message: 'Assist type is required' });
    }

    try {
        const result = await aiService.executeCardAssist({
            type,
            prompt,
            context,
            refinement,
            provider
        });

        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error(`[AI Route] Card assist error (${type}):`, err.message);
        res.status(500).json({
            success: false,
            message: err.message || 'AI assist failed'
        });
    }
}));

/**
 * @route   POST /api/ai/voice-command
 * @desc    Parse natural language voice commands into structured actions
 * @access  Private
 */
router.post('/voice-command', optionalAuth, asyncHandler(async (req, res) => {
    const { speechText, context = {} } = req.body;

    if (!speechText || !speechText.trim()) {
        return res.status(400).json({ success: false, message: 'speechText is required' });
    }

    try {
        const result = await aiService.executeVoiceCommand(speechText, context);

        if (result && result.quotaExhausted) {
            return res.status(429).json({
                success: false,
                quotaExhausted: true,
                message: result.error || 'AI Quota Exhausted across all configured providers',
                data: result
            });
        }

        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error('[AI Route] Voice command error:', err.message);
        const isQuota = Boolean(err.isQuotaExhausted || (err.message && /quota|rate limit|429|resource_exhausted/i.test(err.message)));
        res.status(isQuota ? 429 : 500).json({
            success: false,
            quotaExhausted: isQuota,
            message: err.message || 'Voice command interpretation failed',
            data: {
                recognized: false,
                quotaExhausted: isQuota,
                error: err.message,
                spokenFeedback: isQuota ? 'AI service quota exhausted. Please check your API keys in Settings.' : 'Voice command interpretation failed',
                speechResponse: isQuota ? 'The AI service quota is currently exhausted. Please update your API keys or configure a paid model in Settings to continue.' : 'AI failed to process this command.'
            }
        });
    }
}));

/**
 * @route   POST /api/ai/whiteboard-tasks
 * @desc    Generate structured whiteboard tasks from prompt for instructors
 * @access  Private (Instructor, Admin, Principal)
 */
router.post('/whiteboard-tasks', authenticate, asyncHandler(async (req, res) => {
    const { prompt = '', context = {}, provider = 'groq' } = req.body;

    if (!prompt || !prompt.trim()) {
        return res.status(400).json({ success: false, message: 'Prompt instruction is required' });
    }

    try {
        const result = await aiService.executeCardAssist({
            type: 'whiteboard_tasks',
            prompt,
            context,
            provider
        });

        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error('[AI Route] Whiteboard tasks error:', err.message);
        res.status(500).json({
            success: false,
            message: err.message || 'AI task generation failed'
        });
    }
}));

/**
 * @route   POST /api/ai/recognize-math
 * @desc    Recognize handwritten math equation from canvas drawing image (Windows Math Input Panel style)
 * @access  Private (Authenticated users)
 */
router.post('/recognize-math', authenticate, asyncHandler(async (req, res) => {
    const { image, provider = 'gemini' } = req.body;

    if (!image) {
        return res.status(400).json({ success: false, message: 'Image data is required' });
    }

    try {
        const latex = await aiService.recognizeHandwrittenMath(image, provider);
        res.json({
            success: true,
            data: { latex }
        });
    } catch (err) {
        console.error('[AI Route] Math recognition error:', err.message);
        res.status(500).json({
            success: false,
            message: err.message || 'Math handwriting recognition failed'
        });
    }
}));

/**
 * @route   POST /api/ai/recognize-image-text
 * @desc    Recognize and transcribe text and LaTeX math formulas from an uploaded or selected image
 * @access  Private (Authenticated users)
 */
router.post('/recognize-image-text', authenticate, asyncHandler(async (req, res) => {
    const { image, provider = 'gemini' } = req.body;

    if (!image) {
        return res.status(400).json({ success: false, message: 'Image data is required' });
    }

    try {
        const text = await aiService.recognizeImageTextAndMath(image, provider);
        res.json({
            success: true,
            data: { text }
        });
    } catch (err) {
        console.error('[AI Route] Image text and math recognition error:', err.message);
        res.status(500).json({
            success: false,
            message: err.message || 'Image text recognition failed'
        });
    }
}));

/**
 * @route   GET /api/ai/config
 * @desc    Get current AI model configurations and status (Admin/Principal only)
 * @access  Private (Admin / Principal)
 */
router.get('/config', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const config = aiService.getConfigurations();
    res.json({
        success: true,
        data: config
    });
}));

/**
 * @route   POST /api/ai/config
 * @desc    Update and save AI provider API keys (OpenAI, Anthropic, DeepSeek, OpenRouter, Gemini, Groq, SambaNova)
 * @access  Private (Admin / Principal)
 */
router.post('/config', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const {
        openaiApiKey,
        anthropicApiKey,
        deepseekApiKey,
        openrouterApiKey,
        geminiApiKey,
        groqApiKey,
        sambanovaApiKey,
        preferredProvider
    } = req.body;

    const configPath = path.join(__dirname, '../../storage/ai_config.json');
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let existing = {};
    try {
        if (fs.existsSync(configPath)) {
            existing = JSON.parse(fs.readFileSync(configPath, 'utf8')) || {};
        }
    } catch (e) {}

    const isMasked = (v) => v && (typeof v === 'string') && (v.includes('••••') || v.includes('***'));

    const updated = {
        openaiApiKey: (!isMasked(openaiApiKey) && typeof openaiApiKey === 'string' && openaiApiKey.trim()) ? openaiApiKey.trim() : existing.openaiApiKey,
        anthropicApiKey: (!isMasked(anthropicApiKey) && typeof anthropicApiKey === 'string' && anthropicApiKey.trim()) ? anthropicApiKey.trim() : existing.anthropicApiKey,
        deepseekApiKey: (!isMasked(deepseekApiKey) && typeof deepseekApiKey === 'string' && deepseekApiKey.trim()) ? deepseekApiKey.trim() : existing.deepseekApiKey,
        openrouterApiKey: (!isMasked(openrouterApiKey) && typeof openrouterApiKey === 'string' && openrouterApiKey.trim()) ? openrouterApiKey.trim() : existing.openrouterApiKey,
        geminiApiKey: (!isMasked(geminiApiKey) && typeof geminiApiKey === 'string' && geminiApiKey.trim()) ? geminiApiKey.trim() : existing.geminiApiKey,
        groqApiKey: (!isMasked(groqApiKey) && typeof groqApiKey === 'string' && groqApiKey.trim()) ? groqApiKey.trim() : existing.groqApiKey,
        sambanovaApiKey: (!isMasked(sambanovaApiKey) && typeof sambanovaApiKey === 'string' && sambanovaApiKey.trim()) ? sambanovaApiKey.trim() : existing.sambanovaApiKey,
        preferredProvider: preferredProvider || existing.preferredProvider || 'auto'
    };

    // Clean undefined keys
    Object.keys(updated).forEach(k => {
        if (updated[k] === undefined || updated[k] === '') delete updated[k];
    });

    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf8');

    // Update in-memory process.env
    if (updated.openaiApiKey) process.env.OPENAI_API_KEY = updated.openaiApiKey;
    if (updated.anthropicApiKey) process.env.ANTHROPIC_API_KEY = updated.anthropicApiKey;
    if (updated.deepseekApiKey) process.env.DEEPSEEK_API_KEY = updated.deepseekApiKey;
    if (updated.openrouterApiKey) process.env.OPENROUTER_API_KEY = updated.openrouterApiKey;
    if (updated.geminiApiKey) process.env.GEMINI_API_KEY = updated.geminiApiKey;
    if (updated.groqApiKey) process.env.GROQ_API_KEY = updated.groqApiKey;
    if (updated.sambanovaApiKey) process.env.SAMBANOVA_API_KEY = updated.sambanovaApiKey;
    if (updated.preferredProvider) process.env.AI_PREFERRED_PROVIDER = updated.preferredProvider;

    // Reload services
    const aiConfig = aiService.reload();
    chatbotService.reload();

    res.json({
        success: true,
        message: 'AI Provider configurations saved and reloaded successfully',
        data: aiConfig
    });
}));

/**
 * @route   POST /api/ai/test-provider
 * @desc    Test live connectivity and quota for an AI provider
 * @access  Private (Admin / Principal)
 */
router.post('/test-provider', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { provider } = req.body;
    if (!provider) {
        return res.status(400).json({ success: false, message: 'Provider is required' });
    }

    const t0 = Date.now();
    try {
        const testRes = await aiService.executeChatCompletion({
            systemPrompt: 'You are an AI diagnostic assistant. Output exactly the word: ACTIVE.',
            messages: [{ role: 'user', content: 'Ping' }],
            preferredProvider: provider,
            temperature: 0.1,
            maxTokens: 10
        });

        const latencyMs = Date.now() - t0;
        res.json({
            success: true,
            provider,
            model: testRes.model,
            latencyMs,
            message: `Connection successful (${testRes.model} in ${latencyMs}ms)`
        });
    } catch (err) {
        const latencyMs = Date.now() - t0;
        const isQuota = Boolean(err.isQuotaExhausted || (err.message && /quota|rate limit|credit|balance|429|resource_exhausted/i.test(err.message)));
        res.status(isQuota ? 429 : 400).json({
            success: false,
            provider,
            latencyMs,
            quotaExhausted: isQuota,
            message: err.message
        });
    }
}));

module.exports = router;


