const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const prisma = require('../config/database');
const aiService = require('../services/ai.service');
const chatbotService = require('../services/chatbot.service');
const notificationService = require('../services/notificationService');
const mcpManager = require('../services/mcpManager.service');
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
    const { speechText, context = {}, image = null } = req.body;

    const hasText = Boolean(speechText && speechText.trim());
    const imageInput = image || context.image || context.imageDataUrl;
    const hasImage = Boolean(imageInput);

    if (!hasText && !hasImage) {
        return res.status(400).json({ success: false, message: 'speechText or image is required' });
    }

    const commandText = hasText ? speechText : 'Solve the problem shown in this image';
    const mergedContext = {
        ...context,
        ...(hasImage ? { image: imageInput } : {})
    };

    try {
        const result = await aiService.executeVoiceCommand(commandText, mergedContext);

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
 * @access  Public / Authenticated
 */
router.post('/recognize-math', optionalAuth, asyncHandler(async (req, res) => {
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
 * @access  Public / Authenticated
 */
router.post('/recognize-image-text', optionalAuth, asyncHandler(async (req, res) => {
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
        nvidiaApiKey,
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

    // Fall back to current active keys if not explicitly defined in existing json
    existing.openaiApiKey = existing.openaiApiKey || aiService.openAIKey || process.env.OPENAI_API_KEY;
    existing.anthropicApiKey = existing.anthropicApiKey || aiService.anthropicKey || process.env.ANTHROPIC_API_KEY;
    existing.deepseekApiKey = existing.deepseekApiKey || aiService.deepSeekKey || process.env.DEEPSEEK_API_KEY;
    existing.openrouterApiKey = existing.openrouterApiKey || aiService.openRouterKey || process.env.OPENROUTER_API_KEY;
    existing.geminiApiKey = existing.geminiApiKey || aiService.geminiKey || process.env.GEMINI_API_KEY;
    existing.groqApiKey = existing.groqApiKey || aiService.groqKey || process.env.GROQ_API_KEY;
    existing.sambanovaApiKey = existing.sambanovaApiKey || aiService.sambaNovaKey || process.env.SAMBANOVA_API_KEY;
    existing.nvidiaApiKey = existing.nvidiaApiKey || aiService.nvidiaKey || process.env.NVIDIA_API_KEY;

    const isMasked = (v) => v && (typeof v === 'string') && (v.includes('••••') || v.includes('***'));

    const updated = {
        openaiApiKey: (!isMasked(openaiApiKey) && typeof openaiApiKey === 'string' && openaiApiKey.trim()) ? openaiApiKey.trim() : existing.openaiApiKey,
        anthropicApiKey: (!isMasked(anthropicApiKey) && typeof anthropicApiKey === 'string' && anthropicApiKey.trim()) ? anthropicApiKey.trim() : existing.anthropicApiKey,
        deepseekApiKey: (!isMasked(deepseekApiKey) && typeof deepseekApiKey === 'string' && deepseekApiKey.trim()) ? deepseekApiKey.trim() : existing.deepseekApiKey,
        openrouterApiKey: (!isMasked(openrouterApiKey) && typeof openrouterApiKey === 'string' && openrouterApiKey.trim()) ? openrouterApiKey.trim() : existing.openrouterApiKey,
        geminiApiKey: (!isMasked(geminiApiKey) && typeof geminiApiKey === 'string' && geminiApiKey.trim()) ? geminiApiKey.trim() : existing.geminiApiKey,
        groqApiKey: (!isMasked(groqApiKey) && typeof groqApiKey === 'string' && groqApiKey.trim()) ? groqApiKey.trim() : existing.groqApiKey,
        sambanovaApiKey: (!isMasked(sambanovaApiKey) && typeof sambanovaApiKey === 'string' && sambanovaApiKey.trim()) ? sambanovaApiKey.trim() : existing.sambanovaApiKey,
        nvidiaApiKey: (!isMasked(nvidiaApiKey) && typeof nvidiaApiKey === 'string' && nvidiaApiKey.trim()) ? nvidiaApiKey.trim().replace(/^Bearer\s+/i, '') : existing.nvidiaApiKey,
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
    if (updated.nvidiaApiKey) process.env.NVIDIA_API_KEY = updated.nvidiaApiKey;
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
 * @route   POST /api/ai/generate-diagram
 * @desc    Generate accurate whiteboard-compatible SVG diagram from math/physics problem text
 * @access  Private (Authenticated users)
 */
router.post('/generate-diagram', authenticate, asyncHandler(async (req, res) => {
    const { problemText, provider = 'auto', model } = req.body;

    if (!problemText || !problemText.trim()) {
        return res.status(400).json({ success: false, message: 'Problem text is required' });
    }

    try {
        const result = await aiService.generateDiagramFromProblem({ problemText, provider, model });
        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error('[AI Route] Generate diagram error:', err.message);
        res.status(500).json({
            success: false,
            message: err.message || 'Diagram generation failed'
        });
    }
}));

/**
 * @route   GET /api/ai/mcp-status
 * @desc    Get live status of commercial-safe open source MCP servers and available tools
 * @access  Public / Optional Auth
 */
router.get('/mcp-status', optionalAuth, asyncHandler(async (req, res) => {
    res.json(mcpManager.getStatus());
}));

/**
 * @route   POST /api/ai/mcp-execute
 * @desc    Directly execute an MCP diagram tool for whiteboard
 * @access  Public / Optional Auth
 */
router.post('/mcp-execute', optionalAuth, asyncHandler(async (req, res) => {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
        return res.status(400).json({ success: false, message: 'Prompt instruction is required' });
    }
    const result = await aiService.executeVoiceCommand(prompt, { module: 'whiteboard' });
    res.json({ success: true, data: result });
}));

/**
 * @route   POST /api/ai/test-provider
 * @desc    Test live connectivity and quota for an AI provider
 * @access  Private (Admin / Principal)
 */
router.post('/test-provider', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { provider, apiKey, model } = req.body;
    if (!provider) {
        return res.status(400).json({ success: false, message: 'Provider name is required' });
    }

    const t0 = Date.now();
    try {
        const testRes = await aiService.testProviderConnectivity({
            provider,
            apiKey,
            model
        });

        const latencyMs = Date.now() - t0;
        res.json({
            success: true,
            provider,
            model: testRes.model,
            latencyMs,
            message: `Connection verified! (${testRes.model} in ${latencyMs}ms)`
        });
    } catch (err) {
        const latencyMs = Date.now() - t0;
        const isQuota = Boolean(err.isQuotaError || err.isQuotaExhausted || (err.message && /quota|rate limit|credit|balance|429|resource_exhausted/i.test(err.message)));
        const isAuthOrMissing = Boolean(err.noKey || (err.message && /not entered|not configured|api key|authentication|invalid_api_key|unauthorized|401/i.test(err.message)));
        const statusCode = isQuota ? 429 : (isAuthOrMissing ? 400 : 502);

        res.status(statusCode).json({
            success: false,
            provider,
            latencyMs,
            quotaExhausted: isQuota,
            message: err.message
        });
    }
}));

/**
 * @route   POST /api/ai/scan-question-image
 * @desc    Scan an uploaded/dragged/pasted image and extract the question/problem text for the Whiteboard AI request box
 * @access  Private (Authenticated users)
 */
const safeImageUpload = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            console.warn('[AI Route] Image upload warning (proceeding to fallback):', err.message);
        }
        next();
    });
};

router.post('/scan-question-image', optionalAuth, safeImageUpload, asyncHandler(async (req, res) => {
    const { provider = 'auto' } = req.body;

    let buffer = req.file?.buffer;
    let mimeType = req.file?.mimetype || 'image/png';

    // Support either multipart file upload OR base64 image in req.body.image
    if (!buffer && req.body && req.body.image) {
        const imgStr = req.body.image;
        const match = typeof imgStr === 'string' ? imgStr.match(/^data:([^;]+);base64,(.+)$/s) : null;
        if (match) {
            mimeType = match[1];
            buffer = Buffer.from(match[2], 'base64');
        } else if (typeof imgStr === 'string' && !imgStr.startsWith('http') && !imgStr.startsWith('blob:')) {
            buffer = Buffer.from(imgStr, 'base64');
        }
    }

    if (!buffer) {
        return res.status(400).json({
            success: false,
            message: 'An image file or base64 image data is required to scan a question.'
        });
    }

    try {
        const result = await aiService.extractQuestionFromImage(
            buffer,
            mimeType,
            provider
        );
        const questionText = result?.questionText || result?.question || '';
        res.json({
            success: true,
            message: 'Scanned question from image successfully',
            data: {
                ...result,
                question: questionText,
                questionText: questionText
            }
        });
    } catch (err) {
        console.error('[AI Route] Scan question image error:', err.message);
        res.status(502).json({
            success: false,
            message: err.message || 'Failed to scan question from image'
        });
    }
}));

/**
 * @route   POST /api/ai/sheets-copilot
 * @desc    LabIntel AI Assistant for LabSheets (powered by Gemini / AI Engine)
 * @access  OptionalAuth
 */
router.post('/sheets-copilot', optionalAuth, asyncHandler(async (req, res) => {
    const { prompt, sheetContext = {}, actionType = 'auto' } = req.body;

    if (!prompt || !prompt.trim()) {
        return res.status(400).json({ success: false, message: 'Prompt instruction is required' });
    }

    const activeSheetName = sheetContext.activeSheet || sheetContext.sheetName || 'Sheet1';
    const activeCell = sheetContext.activeCell || 'A1';
    const selectedRange = sheetContext.selectedRange || sheetContext.selectionRange || activeCell;
    const selectedRangeValues = sheetContext.selectedRangeValues || {};
    const columns = sheetContext.columns || [];
    const headers = sheetContext.headers || [];
    const sampleRows = sheetContext.sampleRows || [];
    const usedRange = sheetContext.usedRange || '';
    const activeColDataRange = sheetContext.activeColumnDataRange || '';

    const systemPrompt = `You are LabIntel AI, an intelligent scientific, academic, and laboratory spreadsheet assistant for LabSheets in LabRecManager.
Your goal is to inspect the spreadsheet data context, infer the scientific or academic domain, select the mathematically and scientifically appropriate formulas, determine the correct cell coordinates and ranges, and provide clear suggestions that the user can review and apply.

CURRENT SPREADSHEET CONTEXT:
- Sheet Title: ${sheetContext.title || 'Untitled Sheet'}
- Active Sheet: ${activeSheetName}
- Target Active Cell (Focused by user): ${activeCell}
- User Selected Range: ${selectedRange}
${Object.keys(selectedRangeValues).length > 0 ? `- Selected Cell Values: ${JSON.stringify(selectedRangeValues)}` : ''}
${activeColDataRange ? `- Data in Active Column above target cell (${activeCell}): Range ${activeColDataRange}` : ''}
- Sheet Bounding Box (Used Range): ${usedRange || 'A1:H10'}

DETECTED COLUMNS & DATA RANGES:
${columns.length > 0 ? JSON.stringify(columns, null, 2) : 'No explicit column summary available.'}

DETECTED COLUMN HEADERS:
${headers.length > 0 ? JSON.stringify(headers, null, 2) : 'No explicit headers detected.'}

ACTUAL SHEET DATA ROWS:
${sampleRows.length > 0 ? JSON.stringify(sampleRows, null, 2) : 'Sheet is currently empty.'}

CRITICAL INSTRUCTIONS & INTELLIGENCE RULES (DO NOT HARDCODE - ANALYZE THE CONTEXT DYNAMICALLY):
1. SEMANTIC DOMAIN INFERENCE:
   - Carefully analyze the detected headers and sample data rows to recognize the subject domain:
     * Chemistry Periodic Table (e.g. Element Name, Atomic Number Z, Mass Number A):
       -> Suggest calculating Number of Neutrons: Neutrons = Mass Number - Atomic Number.
          For each row r, the formula is =C{r}-B{r} in a new column "Neutrons" (e.g. Col D).
     * Chemistry Solutions & Titrations (e.g. Solute Moles, Solution Volume, Concentration, Absorbance):
       -> Suggest Molarity (=MOLARITY(moles, volume) or =moles/volume), Dilution (=DILUTION(c1, v1, c2)), or pH (=PH(h_ion)).
     * Physics Kinematics & Linear Calibration (e.g. Concentration vs Absorbance):
       -> Suggest calibration curve slope (=SLOPE(y_range, x_range)) and intercept (=INTERCEPT(y_range, x_range)).
     * Academic Grading / Marksheets (e.g. Student Name, Subject marks):
       -> Suggest Total (=SUM(range)), Percentage (=(Total/Max)*100), Class Average (=AVERAGE(col_range)), or Grade (=IF(...)).
     * General Statistical Analysis:
       -> When asked to analyze data or calculate statistics (Mean, Median, Mode, StDev, Min, Max), identify the numeric columns and compute appropriate formulas with exact ranges.

2. WHERE TO APPLY (SPATIAL DECISION MAKING):
   - Row-by-Row Metrics (e.g. Neutrons per element, Total marks per student, Price*Qty):
     * action: "insert_column"
     * targetColLetter: the next available empty column immediately to the right of the existing data (e.g. if columns A, B, C have data, use column D).
     * columnData:
       {
         "header": "Neutrons",
         "targetColLetter": "D",
         "startRow": 2,
         "formulas": ["=C2-B2", "=C3-B3", "=C4-B4", ...]
       }
   - Column Aggregations & Summary Statistics (e.g. Mean, Median, Mode, Average, Sum, Min, Max):
     * If a single statistic is requested/suggested:
       action: "insert_formula"
       targetCell: the cell immediately below the column data (or ${activeCell} if focused there).
       formula: the exact formula (e.g. =AVERAGE(D2:D10)).
     * If multiple statistics are requested/suggested (e.g. "calculate mean, median, mode"):
       action: "batch_update"
       batchUpdates: mapping consecutive cells (e.g. ${activeCell} for Mean, the next row down for Median, and the next row down for Mode).
       Example:
       "batchUpdates": {
         "D11": "=AVERAGE(D2:D10)",
         "D12": "=MEDIAN(D2:D10)",
         "D13": "=MODE(D2:D10)"
       }
   - If user explicitly focused or requested cell ${activeCell}:
     * Set targetCell to ${activeCell} and bind formula arguments to the appropriate data range.

3. ACCURATE RANGE BINDING:
   - Use the EXACT column letters and row numbers present in DETECTED COLUMNS and ACTUAL SHEET DATA ROWS.
   - NEVER assume column B or arbitrary rows B2:B12 if the user's data is in other columns or row numbers.

4. USER PROMPT & SUGGESTION INTERACTION:
   - Provide a clear, actionable suggestion with:
     * "suggestionTitle": A concise, descriptive headline for the suggested calculation (e.g. "Calculate Number of Neutrons (Mass Number - Atomic Number)").
     * "explanation": A clear explanation of the scientific/domain rationale and formula syntax.
     * The appropriate action, formula, targetCell, columnData, or batchUpdates matching the schema below.

STRICT OUTPUT JSON SCHEMA:
{
  "suggestionTitle": "Descriptive Title of Suggested Calculation",
  "explanation": "Clear explanation of what was analyzed or calculated (Markdown supported)",
  "action": "insert_column" | "insert_formula" | "batch_update" | "generate_table" | "insights",
  "formula": "=C2-B2",
  "targetCell": "${activeCell}",
  "columnData": {
    "header": "Neutrons",
    "targetColLetter": "D",
    "startRow": 2,
    "formulas": ["=C2-B2", "=C3-B3", "=C4-B4"]
  },
  "batchUpdates": {
    "${activeCell}": "=AVERAGE(...)"
  },
  "tableData": {
    "startCell": "A1",
    "headers": ["Metric", "Value"],
    "rows": [["Mean", "=AVERAGE(...)"]]
  },
  "insights": [
    "Domain observation or insight 1...",
    "Domain observation 2..."
  ]
}`;

    try {
        const aiResponse = await aiService.executeChatCompletion({
            messages: [{ role: 'user', content: prompt.trim() }],
            systemPrompt,
            preferredProvider: 'gemini',
            temperature: 0.1,
            jsonMode: true
        });

        const rawText = aiResponse.text || aiResponse.content || '';
        let parsedData = null;
        try {
            const cleanContent = rawText.replace(/^```json/i, '').replace(/```$/i, '').trim();
            parsedData = JSON.parse(cleanContent);
        } catch {
            parsedData = {
                explanation: rawText,
                action: 'insights',
                insights: [rawText]
            };
        }

        res.json({
            success: true,
            provider: aiResponse.provider || 'gemini',
            model: aiResponse.model || 'gemini-2.5-flash',
            data: parsedData
        });
    } catch (err) {
        console.error('[LabIntel Route Error]:', err.message);
        res.status(502).json({
            success: false,
            message: err.message || 'LabIntel AI service encountered an error while analyzing spreadsheet context'
        });
    }
}));

module.exports = router;


