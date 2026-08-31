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
            'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'image/svg+xml',
            'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/x-m4a',
            'video/mp4', 'video/mpeg', 'video/ogg', 'video/webm', 'video/x-msvideo', 'video/quicktime',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.oasis.opendocument.presentation',
            'text/html'
        ];
        if (allowedTypes.includes(file.mimetype) ||
            file.mimetype.startsWith('image/') ||
            file.originalname.match(/\.(txt|csv|json|pdf|md|sql|log|png|jpg|jpeg|webp|bmp|gif|tiff|svg)$/i)) {
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
            userRole: req.user.role,
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
 * @desc    Upload up to 5 documents or images for the AI to read & analyze
 * @access  Private (All authenticated users)
 */
router.post('/upload', authenticate, authorize('admin', 'principal', 'instructor', 'lab_assistant', 'student'), upload.any(), asyncHandler(async (req, res) => {
    const rawFiles = req.files || (req.file ? [req.file] : []);
    const files = rawFiles.slice(0, 5); // Max 5 files

    if (files.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Please upload at least one document or image (maximum 5 supported)'
        });
    }

    try {
        const processedResults = [];
        let combinedText = '';

        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const text = await chatbotService.extractDocumentText(
                f.buffer,
                f.mimetype,
                f.originalname
            );

            let imageUrl = null;
            if (f.mimetype.startsWith('image/')) {
                imageUrl = `data:${f.mimetype};base64,${f.buffer.toString('base64')}`;
            }

            combinedText += `\n\n=== [File ${i + 1}/${files.length}: ${f.originalname}] ===\n${text}`;

            processedResults.push({
                fileName: f.originalname,
                fileSize: f.size,
                mimeType: f.mimetype,
                imageUrl,
                extractedText: text,
                charCount: text.length,
                preview: text.substring(0, 500) + (text.length > 500 ? '...' : '')
            });
        }

        const mainResult = processedResults[0];
        const isMulti = processedResults.length > 1;

        // Structured extraction for Data Loading Table Preview
        let dataLoadingAction = null;
        const lowerCombined = combinedText.toLowerCase();

        // Check if uploaded images contain inventory/equipment/hardware data
        if (lowerCombined.includes('model') || lowerCombined.includes('serial') || lowerCombined.includes('pc') || lowerCombined.includes('dell') || lowerCombined.includes('hp') || lowerCombined.includes('lenovo') || lowerCombined.includes('mac') || lowerCombined.includes('equipment') || lowerCombined.includes('inventory') || lowerCombined.includes('hardware')) {
            const labs = await prisma.lab.findMany({
                where: req.user.schoolId ? { schoolId: req.user.schoolId } : {},
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            });

            // Parse lines to build preview records
            const lines = combinedText.split('\n').map(l => l.trim()).filter(Boolean);
            const extractedRecords = [];
            let itemCounter = 1;

            for (const line of lines) {
                if (line.startsWith('===') || line.startsWith('EXTRACTION') || line.length < 5) continue;
                
                // Match lines with hardware or serial info
                if (line.match(/(pc|laptop|monitor|printer|keyboard|mouse|server|switch|router|ups|dell|hp|lenovo|asus|acer|apple|cisco|logitech|serial|sn[:\- ]|model[:\- ])/i)) {
                    let itemType = 'pc';
                    if (line.match(/laptop/i)) itemType = 'laptop';
                    else if (line.match(/monitor|screen|display/i)) itemType = 'monitor';
                    else if (line.match(/printer|scanner/i)) itemType = 'printer';
                    else if (line.match(/switch|router|network|hub/i)) itemType = 'network_switch';
                    else if (line.match(/ups|battery/i)) itemType = 'ups';
                    else if (line.match(/server/i)) itemType = 'server';
                    else if (line.match(/webcam|camera/i)) itemType = 'webcam';

                    // Extract Brand
                    let brand = 'Standard';
                    const brandMatch = line.match(/\b(Dell|HP|Lenovo|Apple|Asus|Acer|Samsung|LG|Logitech|Cisco|TP-Link|D-Link|Intel|AMD)\b/i);
                    if (brandMatch) brand = brandMatch[1];

                    // Extract Serial Number
                    let serialNumber = `SN-${Date.now().toString().slice(-4)}${itemCounter}`;
                    const snMatch = line.match(/(?:SN|S\/N|Serial|Serial No|Serial Number)[:\- ]*([a-zA-Z0-9_-]{4,20})/i);
                    if (snMatch && snMatch[1]) serialNumber = snMatch[1];

                    // Extract Model
                    let model = `${brand} Hardware Unit`;
                    const modelMatch = line.match(/(?:Model|Type)[:\- ]*([a-zA-Z0-9_\-\s]{3,25})/i);
                    if (modelMatch && modelMatch[1]) model = modelMatch[1].trim();

                    const labPrefix = labs[0]?.name ? labs[0].name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() : 'LAB';
                    const itemNumber = `${labPrefix}-${itemType.toUpperCase()}-${String(itemCounter).padStart(2, '0')}`;

                    extractedRecords.push({
                        itemNumber,
                        itemType,
                        brand,
                        model,
                        serialNumber,
                        specifications: line.substring(0, 100),
                        status: 'active',
                        selected: true
                    });
                    itemCounter++;
                }
            }

            if (extractedRecords.length > 0) {
                dataLoadingAction = {
                    actionType: 'inventory_import',
                    title: `📦 ${extractedRecords.length} Inventory Item(s) Extracted from ${processedResults.length} Image(s)`,
                    labId: labs[0]?.id || null,
                    labName: labs[0]?.name || 'Computer Lab',
                    availableLabs: labs,
                    columns: ['Item No', 'Type', 'Brand / Model', 'Serial Number', 'Specs', 'Status'],
                    records: extractedRecords.slice(0, 50),
                    imageUrls: processedResults.map(p => p.imageUrl).filter(Boolean),
                    isConfirmed: false
                };
            }
        }

        res.json({
            success: true,
            data: {
                fileName: isMulti ? `${processedResults.length} Images/Documents Loaded` : mainResult.fileName,
                fileSize: processedResults.reduce((acc, f) => acc + f.fileSize, 0),
                mimeType: isMulti ? 'multipart/mixed' : mainResult.mimeType,
                imageUrl: mainResult.imageUrl,
                imageUrls: processedResults.map(p => p.imageUrl).filter(Boolean),
                files: processedResults,
                extractedText: combinedText.trim(),
                charCount: combinedText.length,
                preview: combinedText.substring(0, 600) + (combinedText.length > 600 ? '...' : ''),
                dataLoadingAction
            }
        });
    } catch (error) {
        console.error('[ChatBot Upload Error]:', error);
        res.status(500).json({
            success: false,
            message: `Failed to process document: ${error.message}`
        });
    }
}));

/**
 * @route   POST /api/admin/chatbot/load-data
 * @desc    Directly load/import confirmed extracted records into PostgreSQL
 * @access  Private (Admin, Principal, Instructor, Lab Assistant)
 */
router.post('/load-data', authenticate, authorize('admin', 'principal', 'instructor', 'lab_assistant'), asyncHandler(async (req, res) => {
    const { actionType, records, labId, classId } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, message: 'No records provided to load' });
    }

    const schoolId = req.user.schoolId;

    if (actionType === 'inventory_import' || actionType === 'lab_items') {
        let targetLabId = labId;
        if (!targetLabId) {
            const firstLab = await prisma.lab.findFirst({ where: schoolId ? { schoolId } : {} });
            targetLabId = firstLab?.id;
        }

        if (!targetLabId) {
            return res.status(400).json({ success: false, message: 'No valid lab found to import items into' });
        }

        const targetLab = await prisma.lab.findUnique({ where: { id: targetLabId } });
        const createdItems = [];

        for (const item of records) {
            const itemNumber = item.itemNumber || item.itemNo || `ITEM-${Date.now()}-${Math.floor(Math.random()*1000)}`;
            const itemType = item.itemType || item.type || 'pc';
            const brand = item.brand || item.make || null;
            const modelNo = item.modelNo || item.model || null;
            const serialNo = item.serialNo || item.serialNumber || null;
            const specs = item.specs || (item.specifications ? { description: item.specifications } : null);
            const status = item.status || 'active';
            const imageUrl = item.imageUrl || null;

            const existing = await prisma.labItem.findFirst({
                where: { labId: targetLabId, itemNumber }
            });

            if (existing) {
                const updated = await prisma.labItem.update({
                    where: { id: existing.id },
                    data: {
                        itemType,
                        brand: brand || existing.brand,
                        modelNo: modelNo || existing.modelNo,
                        serialNo: serialNo || existing.serialNo,
                        specs: specs || existing.specs,
                        imageUrl: imageUrl || existing.imageUrl,
                        status
                    }
                });
                createdItems.push(updated);
            } else {
                const created = await prisma.labItem.create({
                    data: {
                        labId: targetLabId,
                        schoolId: targetLab?.schoolId || schoolId,
                        itemNumber,
                        itemType,
                        brand,
                        modelNo,
                        serialNo,
                        specs,
                        imageUrl,
                        status
                    }
                });
                createdItems.push(created);
            }
        }

        // Create import history entry
        if (targetLab?.schoolId || schoolId) {
            await prisma.importHistory.create({
                data: {
                    labId: targetLabId,
                    schoolId: targetLab?.schoolId || schoolId,
                    uploadedById: req.user.id,
                    itemsImported: createdItems.length,
                    itemsFailed: 0,
                    status: 'completed',
                    fileName: 'AI_Vision_Image_Import.jpg',
                    fileSize: 1024
                }
            }).catch(err => console.warn('[ImportHistory] Log failed:', err.message));
        }

        return res.json({
            success: true,
            message: `Successfully loaded ${createdItems.length} inventory items into "${targetLab?.name || 'Lab'}"`,
            data: { count: createdItems.length, labName: targetLab?.name, items: createdItems }
        });
    }

    return res.status(400).json({ success: false, message: `Unsupported actionType: ${actionType}` });
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
            userRole: req.user.role,
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
