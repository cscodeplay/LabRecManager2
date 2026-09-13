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
const bcrypt = require('bcryptjs');
const { detectTableAndMapping, applyMapping, TABLE_SCHEMAS } = require('../utils/tableSchemaDetector');

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

        // Intelligent Table Detection & Column Auto-Mapping for Uploaded Files
        let dataLoadingAction = null;
        let dataImportAction = null;
        const lowerCombined = combinedText.toLowerCase();

        // 1. Attempt tabular detection (CSV / TSV / Delimited rows)
        let parsedHeaders = [];
        let parsedRows = [];

        // Check if any file was CSV/Excel/Text with delimited structure
        const csvFile = processedResults.find(f => f.fileName?.match(/\.(csv|tsv|txt)$/i));
        if (csvFile && csvFile.extractedText) {
            const lines = csvFile.extractedText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            if (lines.length >= 2) {
                // Check delimiter: comma, tab, semicolon, or pipe
                const firstLine = lines[0];
                let delim = ',';
                if (firstLine.includes('\t')) delim = '\t';
                else if (firstLine.includes(';') && !firstLine.includes(',')) delim = ';';
                else if (firstLine.includes('|') && !firstLine.includes(',')) delim = '|';

                const rawH = firstLine.split(delim).map(h => h.trim().replace(/^["']|["']$/g, ''));
                if (rawH.length >= 2) {
                    parsedHeaders = rawH;
                    for (let r = 1; r < lines.length; r++) {
                        const rowVals = lines[r].split(delim).map(c => c.trim().replace(/^["']|["']$/g, ''));
                        if (rowVals.length === 0 || (rowVals.length === 1 && !rowVals[0])) continue;
                        const rowObj = {};
                        rawH.forEach((h, idx) => {
                            rowObj[h] = rowVals[idx] !== undefined ? rowVals[idx] : '';
                        });
                        rowObj._originalRowIndex = r;
                        rowObj.selected = true;
                        parsedRows.push(rowObj);
                    }
                }
            }
        }

        if (parsedHeaders.length >= 2 && parsedRows.length > 0) {
            const detection = detectTableAndMapping(parsedHeaders, parsedRows.slice(0, 10));

            if (detection.detectedTable === 'users') {
                const classes = await prisma.class.findMany({
                    where: req.user.schoolId ? { schoolId: req.user.schoolId } : {},
                    select: { id: true, name: true, gradeLevel: true, section: true },
                    orderBy: { name: 'asc' }
                });

                dataImportAction = {
                    actionType: 'student_import',
                    targetTable: 'users',
                    targetLabel: 'Students / Users (users)',
                    title: `👥 ${parsedRows.length} Student Record(s) Detected in ${mainResult.fileName}`,
                    fileName: mainResult.fileName,
                    classId: classes[0]?.id || null,
                    className: classes[0]?.name || 'Select Class',
                    availableClasses: classes,
                    columns: parsedHeaders,
                    columnMapping: detection.columnMapping,
                    availableFields: detection.availableFields,
                    records: parsedRows,
                    isConfirmed: false
                };
            } else if (detection.detectedTable === 'lab_items') {
                const labs = await prisma.lab.findMany({
                    where: req.user.schoolId ? { schoolId: req.user.schoolId } : {},
                    select: { id: true, name: true },
                    orderBy: { name: 'asc' }
                });

                dataImportAction = {
                    actionType: 'inventory_import',
                    targetTable: 'lab_items',
                    targetLabel: 'Lab Inventory (lab_items)',
                    title: `📦 ${parsedRows.length} Inventory Item(s) Detected in ${mainResult.fileName}`,
                    fileName: mainResult.fileName,
                    labId: labs[0]?.id || null,
                    labName: labs[0]?.name || 'Select Lab',
                    availableLabs: labs,
                    columns: parsedHeaders,
                    columnMapping: detection.columnMapping,
                    availableFields: detection.availableFields,
                    records: parsedRows,
                    isConfirmed: false
                };
            } else {
                dataImportAction = {
                    actionType: 'table_import',
                    targetTable: detection.detectedTable,
                    targetLabel: detection.targetLabel,
                    title: `📊 ${parsedRows.length} Record(s) Detected for ${detection.targetLabel}`,
                    fileName: mainResult.fileName,
                    columns: parsedHeaders,
                    columnMapping: detection.columnMapping,
                    availableFields: detection.availableFields,
                    records: parsedRows,
                    isConfirmed: false
                };
            }
            dataLoadingAction = dataImportAction;
        }

        // 2. Fallback: Image OCR / Vision hardware extraction if no tabular CSV was found
        if (!dataImportAction && (lowerCombined.includes('model') || lowerCombined.includes('serial') || lowerCombined.includes('pc') || lowerCombined.includes('dell') || lowerCombined.includes('hp') || lowerCombined.includes('lenovo') || lowerCombined.includes('equipment') || lowerCombined.includes('inventory'))) {
            const labs = await prisma.lab.findMany({
                where: req.user.schoolId ? { schoolId: req.user.schoolId } : {},
                select: { id: true, name: true },
                orderBy: { name: 'asc' }
            });

            const lines = combinedText.split('\n').map(l => l.trim()).filter(Boolean);
            const extractedRecords = [];
            let itemCounter = 1;

            for (const line of lines) {
                if (line.startsWith('===') || line.startsWith('EXTRACTION') || line.length < 5) continue;
                if (line.match(/(pc|laptop|monitor|printer|keyboard|mouse|server|switch|router|ups|dell|hp|lenovo|asus|acer|apple|cisco|logitech|serial|sn[:\- ]|model[:\- ])/i)) {
                    let itemType = 'pc';
                    if (line.match(/laptop/i)) itemType = 'laptop';
                    else if (line.match(/monitor|screen|display/i)) itemType = 'monitor';
                    else if (line.match(/printer|scanner/i)) itemType = 'printer';
                    else if (line.match(/switch|router|network/i)) itemType = 'network_switch';
                    else if (line.match(/ups|battery/i)) itemType = 'ups';
                    else if (line.match(/server/i)) itemType = 'server';

                    let brand = 'Standard';
                    const brandMatch = line.match(/\b(Dell|HP|Lenovo|Apple|Asus|Acer|Samsung|LG|Logitech|Cisco|TP-Link|D-Link|Intel|AMD)\b/i);
                    if (brandMatch) brand = brandMatch[1];

                    let serialNumber = `SN-${Date.now().toString().slice(-4)}${itemCounter}`;
                    const snMatch = line.match(/(?:SN|S\/N|Serial|Serial No|Serial Number)[:\- ]*([a-zA-Z0-9_-]{4,20})/i);
                    if (snMatch && snMatch[1]) serialNumber = snMatch[1];

                    let model = `${brand} Hardware Unit`;
                    const modelMatch = line.match(/(?:Model|Type)[:\- ]*([a-zA-Z0-9_\-\s]{3,25})/i);
                    if (modelMatch && modelMatch[1]) model = modelMatch[1].trim();

                    const labPrefix = labs[0]?.name ? labs[0].name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase() : 'LAB';
                    const itemNumber = `${labPrefix}-${itemType.toUpperCase()}-${String(itemCounter).padStart(2, '0')}`;

                    extractedRecords.push({
                        itemNumber,
                        itemType,
                        brand,
                        modelNo: model,
                        serialNo: serialNumber,
                        specs: line.substring(0, 100),
                        status: 'active',
                        selected: true,
                        _originalRowIndex: itemCounter
                    });
                    itemCounter++;
                }
            }

            if (extractedRecords.length > 0) {
                dataImportAction = {
                    actionType: 'inventory_import',
                    targetTable: 'lab_items',
                    targetLabel: 'Lab Inventory (lab_items)',
                    title: `📦 ${extractedRecords.length} Inventory Item(s) Extracted from ${processedResults.length} Image/File(s)`,
                    labId: labs[0]?.id || null,
                    labName: labs[0]?.name || 'Computer Lab',
                    availableLabs: labs,
                    columns: ['itemNumber', 'itemType', 'brand', 'modelNo', 'serialNo', 'status'],
                    columnMapping: { itemNumber: 'itemNumber', itemType: 'itemType', brand: 'brand', modelNo: 'modelNo', serialNo: 'serialNo', status: 'status' },
                    availableFields: TABLE_SCHEMAS.lab_items.fields,
                    records: extractedRecords.slice(0, 100),
                    imageUrls: processedResults.map(p => p.imageUrl).filter(Boolean),
                    isConfirmed: false
                };
                dataLoadingAction = dataImportAction;
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
                dataLoadingAction,
                dataImportAction
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
 * @desc    Directly load/import confirmed extracted records into PostgreSQL with column mapping & row error reporting
 * @access  Private (Admin, Principal, Instructor, Lab Assistant)
 */
router.post('/load-data', authenticate, authorize('admin', 'principal', 'instructor', 'lab_assistant'), asyncHandler(async (req, res) => {
    const { actionType, targetTable, records: rawRecords, labId, classId, columnMapping, moduleData } = req.body;
    const schoolId = req.user.schoolId;

    // 1. Training Module Creation
    if (actionType === 'training_module_create' || actionType === 'training_create') {
        const m = moduleData || req.body;
        if (!m || !m.title) {
            return res.status(400).json({ success: false, message: 'Training module title is required' });
        }

        const title = m.title.trim();
        const description = m.description || `Training module on ${title}`;
        const language = m.language || 'python';
        const classLevel = m.classLevel ? parseInt(m.classLevel, 10) : 11;
        const boardAligned = m.boardAligned || 'CBSE';
        const units = Array.isArray(m.units) ? m.units : [];
        const exercises = Array.isArray(m.exercises) ? m.exercises : [];

        // Create module
        const createdModule = await prisma.trainingModule.create({
            data: {
                schoolId,
                title,
                description,
                language,
                classLevel,
                boardAligned,
                totalUnits: units.length,
                totalExercises: exercises.length,
                isPublished: false
            }
        });

        // Create units and exercises
        const createdUnits = [];
        let createdExCount = 0;

        for (let uIdx = 0; uIdx < units.length; uIdx++) {
            const u = units[uIdx];
            let unitDesc = null;
            if (typeof u.description === 'object' && u.description !== null) {
                unitDesc = JSON.stringify(u.description);
            } else if (typeof u.description === 'string' && u.description.trim()) {
                unitDesc = u.description;
            } else if (u.theory) {
                unitDesc = typeof u.theory === 'object' ? JSON.stringify(u.theory) : String(u.theory);
            }

            const createdUnit = await prisma.trainingUnit.create({
                data: {
                    moduleId: createdModule.id,
                    unitNumber: u.unitNumber || (uIdx + 1),
                    title: u.title || `Unit ${uIdx + 1}`,
                    description: unitDesc,
                    expectedHours: u.expectedHours || 2,
                    unlockThreshold: 75,
                    sequenceOrder: uIdx + 1
                }
            });
            createdUnits.push(createdUnit);

            // Find exercises belonging to this unit (or distribute if unitId not mapped)
            const unitExercises = exercises.filter(e => e.unitIndex === uIdx || e.unitNumber === (uIdx + 1));
            const exToCreate = unitExercises.length > 0 ? unitExercises : (uIdx === 0 && exercises.filter(e => e.unitIndex === undefined).length > 0 ? exercises.filter(e => e.unitIndex === undefined) : []);

            for (let eIdx = 0; eIdx < exToCreate.length; eIdx++) {
                const ex = exToCreate[eIdx];
                await prisma.trainingExercise.create({
                    data: {
                        unitId: createdUnit.id,
                        title: ex.title || `Exercise ${eIdx + 1}`,
                        description: ex.description || ex.title,
                        difficulty: ex.difficulty || 'medium',
                        scaffoldLevel: ex.scaffoldLevel || 'guided',
                        exerciseType: ex.exerciseType || 'coding',
                        bloomsLevel: ex.bloomsLevel || 'Apply',
                        learningObjective: ex.learningObjective || null,
                        starterCode: ex.starterCode || null,
                        solutionCode: ex.solutionCode || null,
                        testCases: ex.testCases || (ex.mathFormulas ? { mathFormulas: ex.mathFormulas, answer: ex.solutionCode } : null),
                        hints: ex.hints || null,
                        timeLimit: ex.timeLimit || 5,
                        sequenceOrder: eIdx + 1,
                        xpReward: ex.xpReward || 15
                    }
                }).catch(eErr => console.warn('[LoadData] Exercise create failed:', eErr.message));
                createdExCount++;
            }
        }

        return res.json({
            success: true,
            count: createdExCount,
            failedCount: 0,
            failedRows: [],
            data: { module: createdModule, units: createdUnits },
            message: `Successfully created Training Module "${title}" with ${createdUnits.length} units and ${createdExCount} exercises!`
        });
    }

    // 2. Tabular Data Imports (Students, Inventory, Generic)
    if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
        return res.status(400).json({ success: false, message: 'No records provided to load' });
    }

    const effectiveTable = targetTable || (actionType === 'student_import' ? 'users' : 'lab_items');
    // Apply column mapping if provided
    const records = columnMapping && Object.keys(columnMapping).length > 0
        ? applyMapping(rawRecords, columnMapping, effectiveTable)
        : rawRecords;

    const failedRows = [];

    // Case A: Student Import into users table + class enrollment
    if (effectiveTable === 'users' || actionType === 'student_import') {
        let targetClassId = classId;
        if (!targetClassId) {
            const firstClass = await prisma.class.findFirst({ where: schoolId ? { schoolId } : {} });
            targetClassId = firstClass?.id;
        }

        const targetClass = targetClassId ? await prisma.class.findUnique({ where: { id: targetClassId } }) : null;
        let successCount = 0;
        const defaultPassword = 'Student@123';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(defaultPassword, salt);

        for (let i = 0; i < records.length; i++) {
            const rec = records[i];
            const rowIdx = rec._originalRowIndex || (i + 1);

            try {
                if (!rec.firstName || !String(rec.firstName).trim()) {
                    throw new Error('First name is required');
                }

                // Generate email if missing
                let email = rec.email ? String(rec.email).trim().toLowerCase() : null;
                if (!email) {
                    const cleanFirst = String(rec.firstName).toLowerCase().replace(/[^a-z0-9]/g, '');
                    const cleanLast = (rec.lastName ? String(rec.lastName) : 'stu').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const cleanId = rec.studentId ? String(rec.studentId).toLowerCase().replace(/[^a-z0-9]/g, '') : `${Date.now().toString().slice(-4)}${i}`;
                    email = `${cleanFirst}.${cleanLast}.${cleanId}@student.school.edu`;
                }

                // Check existing user
                let userRecord = await prisma.user.findUnique({ where: { email } });
                if (!userRecord) {
                    userRecord = await prisma.user.create({
                        data: {
                            schoolId,
                            email,
                            passwordHash,
                            role: 'student',
                            firstName: rec.firstName.trim(),
                            lastName: rec.lastName ? rec.lastName.trim() : 'Student',
                            phone: rec.phone ? String(rec.phone).trim() : null,
                            admissionNumber: rec.studentId || rec.admissionNumber || null
                        }
                    });
                } else {
                    // Update existing
                    userRecord = await prisma.user.update({
                        where: { id: userRecord.id },
                        data: {
                            firstName: rec.firstName.trim(),
                            lastName: rec.lastName ? rec.lastName.trim() : userRecord.lastName,
                            phone: rec.phone ? String(rec.phone).trim() : userRecord.phone
                        }
                    });
                }

                // Enroll into target class if specified
                if (targetClassId && userRecord) {
                    const existingEnroll = await prisma.classEnrollment.findUnique({
                        where: {
                            studentId_classId: {
                                studentId: userRecord.id,
                                classId: targetClassId
                            }
                        }
                    });

                    if (!existingEnroll) {
                        await prisma.classEnrollment.create({
                            data: {
                                studentId: userRecord.id,
                                classId: targetClassId,
                                rollNumber: rec.rollNumber ? parseInt(rec.rollNumber, 10) : undefined,
                                status: 'active'
                            }
                        });
                    }
                }

                successCount++;
            } catch (rowErr) {
                failedRows.push({
                    row: rowIdx,
                    identifier: rec.email || rec.studentId || rec.firstName || `Row ${rowIdx}`,
                    error: rowErr.message || 'Validation or database failure'
                });
            }
        }

        const className = targetClass?.name || 'School Roster';
        return res.json({
            success: true,
            count: successCount,
            failedCount: failedRows.length,
            failedRows,
            message: failedRows.length === 0
                ? `Successfully imported all ${successCount} students into "${className}"!`
                : `Imported ${successCount} students into "${className}". ${failedRows.length} row(s) failed.`
        });
    }

    // Case B: Lab Inventory Import into lab_items table
    if (effectiveTable === 'lab_items' || actionType === 'inventory_import') {
        let targetLabId = labId;
        if (!targetLabId) {
            const firstLab = await prisma.lab.findFirst({ where: schoolId ? { schoolId } : {} });
            targetLabId = firstLab?.id;
        }

        if (!targetLabId) {
            return res.status(400).json({ success: false, message: 'No target lab found for inventory import' });
        }

        const targetLab = await prisma.lab.findUnique({ where: { id: targetLabId } });
        const createdItems = [];

        for (let i = 0; i < records.length; i++) {
            const item = records[i];
            const rowIdx = item._originalRowIndex || (i + 1);

            try {
                const itemNumber = item.itemNumber || item.itemNo || `ITEM-${Date.now().toString().slice(-4)}-${i + 1}`;
                const itemType = item.itemType || item.type || 'pc';
                const brand = item.brand || item.make || null;
                const modelNo = item.modelNo || item.model || null;
                const serialNo = item.serialNo || item.serialNumber || null;
                const specs = item.specs || (item.specifications ? { description: item.specifications } : null);
                const status = item.status || 'active';

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
                            status
                        }
                    });
                    createdItems.push(created);
                }
            } catch (rowErr) {
                failedRows.push({
                    row: rowIdx,
                    identifier: item.itemNumber || `Row ${rowIdx}`,
                    error: rowErr.message || 'Failed to save inventory item'
                });
            }
        }

        // Create import history
        if (targetLab?.schoolId || schoolId) {
            await prisma.importHistory.create({
                data: {
                    labId: targetLabId,
                    schoolId: targetLab?.schoolId || schoolId,
                    uploadedById: req.user.id,
                    itemsImported: createdItems.length,
                    itemsFailed: failedRows.length,
                    status: failedRows.length === 0 ? 'completed' : 'completed_with_errors',
                    fileName: 'AI_Auto_Data_Import.csv',
                    fileSize: 1024
                }
            }).catch(err => console.warn('[ImportHistory] Log failed:', err.message));
        }

        const labName = targetLab?.name || 'Lab';
        return res.json({
            success: true,
            count: createdItems.length,
            failedCount: failedRows.length,
            failedRows,
            labName,
            items: createdItems,
            message: failedRows.length === 0
                ? `Successfully loaded all ${createdItems.length} inventory items into "${labName}"!`
                : `Loaded ${createdItems.length} items into "${labName}". ${failedRows.length} row(s) failed.`
        });
    }

    return res.status(400).json({ success: false, message: `Unsupported target table: ${effectiveTable}` });
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
