/**
 * Admin AI Chatbot Routes
 * POST /api/admin/chatbot/chat    — Send a message to the AI
 * POST /api/admin/chatbot/upload  — Upload a document for AI to read
 * GET  /api/admin/chatbot/schema  — Get/refresh the database schema
 * POST /api/admin/chatbot/execute — Execute a SQL query from the chat
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const chatbotService = require('../services/chatbot.service');
const prisma = require('../config/database');

// File upload config — 100MB limit
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'text/plain', 'text/csv', 'application/json',
            'application/pdf', 'text/markdown',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/x-m4a',
            'video/mp4', 'video/mpeg', 'video/ogg', 'video/webm', 'video/x-msvideo', 'video/quicktime',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.oasis.opendocument.presentation',
            'text/html'
        ];
        if (allowedTypes.includes(file.mimetype) ||
            file.originalname.match(/\.(txt|csv|json|pdf|md|sql|log)$/i)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
        }
    }
});

/**
 * @route   POST /api/admin/chatbot/chat
 * @desc    Send a message to the AI chatbot
 * @access  Private (Admin only)
 */
router.post('/chat', authenticate, authorize('admin', 'principal', 'instructor', 'lab_assistant'), asyncHandler(async (req, res) => {
    const { message, conversationHistory = [], documentContext = '', provider = 'auto' } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length < 1) {
        return res.status(400).json({
            success: false,
            message: 'Message is required'
        });
    }

    try {
        const sessionId = req.headers['x-academic-session'];
        
        const result = await chatbotService.chat(message.trim(), {
            conversationHistory,
            documentContext,
            userId: req.user.id,
            academicYearId: sessionId,
            provider
        });

        // Log AI chatbot usage
        prisma.activityLog.create({
            data: {
                userId: req.user.id,
                schoolId: req.user.schoolId,
                actionType: 'other',
                action_type: 'ai_chatbot',
                description: `AI Chatbot: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
                entityType: 'ai_chatbot',
                metadata: {
                    messageLength: message.length,
                    hadSQL: !!result.sql,
                    hadQueryResult: !!result.queryResult
                }
            }
        }).catch(err => console.warn('[ChatBot] Activity log failed:', err.message));

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[ChatBot Route] Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'AI chat failed'
        });
    }
}));

/**
 * @route   POST /api/admin/chatbot/upload
 * @desc    Upload a document for the AI to read
 * @access  Private (Admin only)
 */
router.post('/upload', authenticate, authorize('admin', 'principal'), upload.single('document'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'Please upload a document'
        });
    }

    try {
        const text = await chatbotService.extractDocumentText(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname
        );

        res.json({
            success: true,
            data: {
                fileName: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                extractedText: text,
                charCount: text.length,
                preview: text.substring(0, 500) + (text.length > 500 ? '...' : '')
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Failed to process document: ${error.message}`
        });
    }
}));

/**
 * @route   GET /api/admin/chatbot/schema
 * @desc    Get or refresh the database schema
 * @access  Private (Admin only)
 */
router.get('/schema', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const forceRefresh = req.query.refresh === 'true';

    let schema;
    if (forceRefresh) {
        schema = await chatbotService.refreshSchema();
    } else {
        schema = await chatbotService.getSchema();
    }

    res.json({
        success: true,
        data: {
            schema,
            cachedAt: chatbotService.schemaCachedAt
                ? new Date(chatbotService.schemaCachedAt).toISOString()
                : null,
            refreshed: forceRefresh
        }
    });
}));

/**
 * @route   POST /api/admin/chatbot/execute
 * @desc    Execute a SQL query from the chat interface
 * @access  Private (Admin only)
 */
router.post('/execute', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const { sql } = req.body;

    if (!sql || typeof sql !== 'string' || sql.trim().length < 3) {
        return res.status(400).json({
            success: false,
            message: 'SQL query is required'
        });
    }

    // Log this operation
    console.warn(`[ChatBot SQL] Admin ${req.user.email} executing:`, sql.substring(0, 100));

    const result = await chatbotService.executeSQL(sql.trim());

    // Audit log
    prisma.activityLog.create({
        data: {
            userId: req.user.id,
            schoolId: req.user.schoolId,
            actionType: 'other',
            action_type: 'ai_chatbot_sql',
            description: `AI Chatbot SQL: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`,
            entityType: 'sql_execution',
            metadata: { sql: sql.substring(0, 500), success: result.success, rowCount: result.rowCount }
        }
    }).catch(err => console.warn('[ChatBot] Activity log failed:', err.message));

    if (result.success) {
        res.json({ success: true, data: result });
    } else {
        res.status(400).json({
            success: false,
            message: result.error,
            detail: result.detail,
            hint: result.hint
        });
    }
}));


/**
 * @route   GET /api/admin/chatbot/sessions
 * @desc    Get all chat sessions for the user
 * @access  Private
 */
router.get('/sessions', authenticate, asyncHandler(async (req, res) => {
    const sessions = await prisma.activityLog.findMany({
        where: {
            userId: req.user.id,
            action_type: 'ai_chat_session'
        },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            description: true,
            createdAt: true,
            metadata: true
        }
    });
    res.json({ success: true, data: sessions });
}));

/**
 * @route   POST /api/admin/chatbot/sessions
 * @desc    Save or update a chat session
 * @access  Private
 */
router.post('/sessions', authenticate, asyncHandler(async (req, res) => {
    const { sessionId, title, messages } = req.body;
    
    if (sessionId) {
        // Try to update existing
        const existing = await prisma.activityLog.findFirst({ where: { id: sessionId, userId: req.user.id } });
        if (existing) {
            const updated = await prisma.activityLog.update({
                where: { id: sessionId },
                data: {
                    description: title || existing.description,
                    metadata: { messages }
                }
            });
            return res.json({ success: true, data: updated });
        }
    }
    
    // Create new
    const created = await prisma.activityLog.create({
        data: {
            userId: req.user.id,
            schoolId: req.user.schoolId,
            actionType: 'other',
            action_type: 'ai_chat_session',
            description: title || 'New Chat',
            metadata: { messages }
        }
    });
    
    res.json({ success: true, data: created });
}));

/**
 * @route   DELETE /api/admin/chatbot/sessions/:id
 * @desc    Delete a chat session
 * @access  Private
 */
router.delete('/sessions/:id', authenticate, asyncHandler(async (req, res) => {
    await prisma.activityLog.deleteMany({
        where: { id: req.params.id, userId: req.user.id }
    });
    res.json({ success: true });
}));

module.exports = router;
