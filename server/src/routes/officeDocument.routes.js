const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const documentConverter = require('../services/documentConverter.service');
const docx = require('docx');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for high-res documents & zip archives
});

const SUBFOLDERS = [
    'Word Documents',
    'Excel Spreadsheets',
    'Presentations (Slides)',
    'PDF Documents',
    'Images',
    'Audio',
    'Video',
    'Signatures',
    'Zip Archives',
    'Compressed',
    'extract_og'
];

async function getOrCreateOfficeMediaFolders(schoolId, userId) {
    let validSchool = null;
    if (schoolId) {
        validSchool = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } });
    }
    if (!validSchool) {
        validSchool = await prisma.school.findFirst({ select: { id: true } });
    }
    schoolId = validSchool?.id;

    let validUser = null;
    if (userId) {
        validUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    }
    if (!validUser) {
        validUser = await prisma.user.findFirst({ select: { id: true } });
    }
    userId = validUser?.id;

    // Find or create root folder
    let root = await prisma.documentFolder.findFirst({
        where: {
            schoolId,
            parentId: null,
            name: 'Office Media Files',
            deletedAt: null
        }
    });

    if (!root) {
        root = await prisma.documentFolder.create({
            data: {
                schoolId,
                createdById: userId,
                name: 'Office Media Files',
                parentId: null
            }
        });
    }

    const subfolders = {};
    for (const name of SUBFOLDERS) {
        let sub = await prisma.documentFolder.findFirst({
            where: {
                schoolId,
                parentId: root.id,
                name,
                deletedAt: null
            }
        });
        if (!sub) {
            sub = await prisma.documentFolder.create({
                data: {
                    schoolId,
                    createdById: userId,
                    name,
                    parentId: root.id
                }
            });
        }
        subfolders[name] = sub;
    }

    return { root, subfolders, schoolId, userId };
}

/**
 * @route   POST /api/office/documents/ensure-media-folders
 * @desc    Ensure Office Media Files hierarchy exists
 */
router.post('/ensure-media-folders', optionalAuth, asyncHandler(async (req, res) => {
    const userId = req.user?.id || null;
    const schoolId = req.user?.schoolId || null;
    const result = await getOrCreateOfficeMediaFolders(schoolId, userId);
    res.json({ success: true, data: result });
}));

/**
 * @route   GET /api/office/documents/media-files
 * @desc    Get files in Office Media Files hierarchy
 */
router.get('/media-files', optionalAuth, asyncHandler(async (req, res) => {
    const { docType, search, limit = 100 } = req.query;
    let userId = req.user?.id || null;
    let schoolId = req.user?.schoolId || null;

    const { root, subfolders } = await getOrCreateOfficeMediaFolders(schoolId, userId);
    const folderIds = [root.id, ...Object.values(subfolders).map(f => f.id)];

    const whereConditions = {
        folderId: { in: folderIds },
        deletedAt: null
    };

    if (search) {
        whereConditions.name = { contains: search, mode: 'insensitive' };
    }

    if (docType) {
        if (docType === 'word') whereConditions.fileType = { in: ['doc', 'docx'] };
        else if (docType === 'excel') whereConditions.fileType = { in: ['xls', 'xlsx', 'csv'] };
        else if (docType === 'presentation') whereConditions.fileType = { in: ['ppt', 'pptx'] };
        else if (docType === 'pdf') whereConditions.fileType = 'pdf';
        else if (docType === 'image') whereConditions.fileType = { in: ['png', 'jpg', 'jpeg', 'webp', 'gif'] };
        else if (docType === 'audio') whereConditions.fileType = { in: ['mp3', 'wav', 'm4a', 'ogg', 'aac'] };
        else if (docType === 'video') whereConditions.fileType = { in: ['mp4', 'webm', 'mov'] };
    }

    const files = await prisma.document.findMany({
        where: whereConditions,
        include: {
            folder: { select: { id: true, name: true } },
            uploadedBy: { select: { id: true, firstName: true, lastName: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: parseInt(limit, 10)
    });

    res.json({
        success: true,
        data: {
            root,
            subfolders,
            files
        }
    });
}));

/**
 * @route   POST /api/office/documents/save-to-media-files
 * @desc    Directly save any office document into its designated Office Media Files subfolder
 */
router.post('/save-to-media-files', upload.single('file'), optionalAuth, asyncHandler(async (req, res) => {
    let { docType, title, content, fileBase64, format, documentId, officeDocId, folderName, subfolderName: reqSubfolderName } = req.body;
    let userId = req.user?.id || null;
    let schoolId = req.user?.schoolId || null;

    if (typeof content === 'string') {
        try {
            content = JSON.parse(content);
        } catch (e) {
            // Keep as string or object
        }
    }

    const { root, subfolders, schoolId: resolvedSchoolId, userId: resolvedUserId } = await getOrCreateOfficeMediaFolders(schoolId, userId);
    schoolId = resolvedSchoolId;
    userId = resolvedUserId;

    // Map docType / format to target subfolder
    let subfolderName = reqSubfolderName || folderName || 'Word Documents';
    let fileExt = 'docx';
    let mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const normalizedType = String(docType || '').toLowerCase();
    const hasBinaryFile = !!(req.file && req.file.buffer);
    const isPdfBase64 = fileBase64 && typeof fileBase64 === 'string' && (fileBase64.startsWith('data:application/pdf') || fileBase64.startsWith('JVBERi'));
    const isZipBase64 = fileBase64 && typeof fileBase64 === 'string' && (fileBase64.startsWith('data:application/zip') || fileBase64.startsWith('UEsDB'));

    if (normalizedType === 'excel' || format === 'xlsx') {
        if (!reqSubfolderName && !folderName) subfolderName = 'Excel Spreadsheets';
        fileExt = 'xlsx';
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (normalizedType === 'presentation' || format === 'pptx') {
        if (!reqSubfolderName && !folderName) subfolderName = 'Presentations (Slides)';
        fileExt = 'pptx';
        mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else if (normalizedType === 'zip' || format === 'zip' || isZipBase64 || (hasBinaryFile && req.file.originalname?.endsWith('.zip'))) {
        if (!reqSubfolderName && !folderName) subfolderName = 'Zip Archives';
        fileExt = 'zip';
        mimeType = 'application/zip';
    } else if (normalizedType === 'pdf' || format === 'pdf' || isPdfBase64 || (hasBinaryFile && req.file.originalname?.endsWith('.pdf')) || folderName === 'extract_og' || subfolderName.startsWith('extract_')) {
        if (!reqSubfolderName && !folderName) subfolderName = 'PDF Documents';
        fileExt = 'pdf';
        mimeType = 'application/pdf';
    } else if (normalizedType === 'image' || ['png', 'jpg', 'jpeg'].includes(format)) {
        if (!reqSubfolderName && !folderName) subfolderName = 'Images';
        fileExt = format || 'png';
        mimeType = fileExt === 'jpg' || fileExt === 'jpeg' ? 'image/jpeg' : 'image/png';
    } else if (normalizedType === 'audio' || ['mp3', 'wav', 'm4a'].includes(format)) {
        if (!reqSubfolderName && !folderName) subfolderName = 'Audio';
        fileExt = format || 'mp3';
        mimeType = 'audio/mpeg';
    } else if (normalizedType === 'video' || ['mp4', 'webm'].includes(format)) {
        if (!reqSubfolderName && !folderName) subfolderName = 'Video';
        fileExt = format || 'mp4';
        mimeType = 'video/mp4';
    }

    // Resolve or dynamically create target subfolder (e.g. for dynamic extract_YYYY-MM-DD_HH-mm-ss folders or Zip Archives)
    let targetSubfolder = subfolders[subfolderName];
    if (!targetSubfolder && subfolderName) {
        targetSubfolder = await prisma.documentFolder.findFirst({
            where: {
                schoolId,
                name: subfolderName,
                deletedAt: null
            }
        });
        if (!targetSubfolder) {
            const parentId = subfolderName.startsWith('extract_') ? (subfolders['PDF Documents']?.id || root.id) : root.id;
            targetSubfolder = await prisma.documentFolder.create({
                data: {
                    schoolId,
                    createdById: userId,
                    name: subfolderName,
                    parentId
                }
            });
            subfolders[subfolderName] = targetSubfolder;
        }
    }
    if (!targetSubfolder) targetSubfolder = root;

    let cleanTitle = (title || req.file?.originalname?.replace(/\.[^/.]+$/, '') || 'Untitled Document').trim();

    // Check if document already exists to avoid creating duplicate versions on save/rename
    let existingDoc = null;
    if (documentId) {
        existingDoc = await prisma.document.findFirst({
            where: { id: documentId, schoolId }
        }).catch(() => null);
    }
    if (!existingDoc && targetSubfolder?.id) {
        existingDoc = await prisma.document.findFirst({
            where: {
                folderId: targetSubfolder.id,
                name: `${cleanTitle}.${fileExt}`,
                schoolId
            }
        }).catch(() => null);
    }

    const uploadDir = path.join(__dirname, '../../uploads/office-media');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const diskFileName = existingDoc?.fileName
        ? existingDoc.fileName
        : `${cleanTitle.replace(/[^a-zA-Z0-9_\-\.]/g, '_')}_${Date.now()}.${fileExt}`;
    const diskPath = path.join(uploadDir, diskFileName);

    let fileBuffer = null;
    if (req.file && req.file.buffer) {
        fileBuffer = req.file.buffer;
    } else if (fileBase64) {
        const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');
        fileBuffer = Buffer.from(cleanBase64, 'base64');
    } else if (normalizedType === 'word') {
        const plainText = content?.plainText || content?.html?.replace(/<[^>]*>/g, ' ') || 'Empty document';
        const paragraphs = plainText.split('\n').filter(Boolean).map(line =>
            new docx.Paragraph({
                children: [new docx.TextRun({ text: line, size: 24, font: 'Calibri' })],
                spacing: { after: 120 }
            })
        );
        const docxDoc = new docx.Document({
            sections: [{ properties: {}, children: paragraphs.length > 0 ? paragraphs : [new docx.Paragraph({ text: ' ' })] }]
        });
        fileBuffer = await docx.Packer.toBuffer(docxDoc);
    } else if (normalizedType === 'excel') {
        const wb = XLSX.utils.book_new();
        const sheetsData = content?.sheets || [{ name: 'Sheet1', cells: {} }];
        sheetsData.forEach((sh, idx) => {
            const aoa = [];
            const cells = sh.cells || {};
            for (let r = 1; r <= 50; r++) {
                const row = [];
                for (let c = 0; c < 26; c++) {
                    const colLetter = XLSX.utils.encode_col(c);
                    const cellKey = `${colLetter}${r}`;
                    row.push(cells[cellKey]?.val ?? cells[cellKey]?.value ?? '');
                }
                aoa.push(row);
            }
            const ws = XLSX.utils.aoa_to_sheet(aoa);
            XLSX.utils.book_append_sheet(wb, ws, sh.name || `Sheet${idx + 1}`);
        });
        fileBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }

    if (fileBuffer) {
        fs.writeFileSync(diskPath, fileBuffer);
    } else {
        fs.writeFileSync(diskPath, Buffer.from(JSON.stringify(content || {})));
    }

    const fileSize = fs.statSync(diskPath).size;
    const finalUrl = `/uploads/office-media/${diskFileName}`;

    // 1. Create or update Document record in place
    let document = null;
    if (existingDoc) {
        document = await prisma.document.update({
            where: { id: existingDoc.id },
            data: {
                name: `${cleanTitle}.${fileExt}`,
                fileName: diskFileName,
                fileType: fileExt,
                mimeType,
                fileSize,
                url: finalUrl,
                updatedAt: new Date()
            }
        });
    } else {
        document = await prisma.document.create({
            data: {
                schoolId,
                uploadedById: userId,
                folderId: targetSubfolder.id,
                name: `${cleanTitle}.${fileExt}`,
                fileName: diskFileName,
                fileType: fileExt,
                mimeType,
                fileSize,
                cloudinaryId: `office-media/${diskFileName}`,
                url: finalUrl,
                category: normalizedType,
                isPublic: false
            }
        });
    }

    // 2. Also save or update office_documents table
    let officeDoc = null;
    try {
        let existingDocs = [];
        if (officeDocId) {
            existingDocs = await prisma.$queryRawUnsafe(`
                SELECT "id" FROM "office_documents" WHERE "id" = $1::uuid AND "school_id" = $2::uuid LIMIT 1
            `, officeDocId, schoolId).catch(() => []);
        }
        if (existingDocs.length === 0) {
            existingDocs = await prisma.$queryRawUnsafe(`
                SELECT "id" FROM "office_documents" WHERE "title" = $1 AND "school_id" = $2::uuid LIMIT 1
            `, cleanTitle, schoolId).catch(() => []);
        }

        if (existingDocs.length > 0) {
            const upd = await prisma.$queryRawUnsafe(`
                UPDATE "office_documents" SET
                    "title" = $1,
                    "current_content" = $2::jsonb,
                    "metadata" = $3::jsonb,
                    "updated_at" = NOW()
                WHERE "id" = $4::uuid
                RETURNING "id", "title", "doc_type", "current_content", "updated_at"
            `, cleanTitle, JSON.stringify(content || {}), JSON.stringify({ documentId: document.id, fileUrl: finalUrl }), existingDocs[0].id);
            officeDoc = upd[0];
        } else {
            const ins = await prisma.$queryRawUnsafe(`
                INSERT INTO "office_documents" (
                    "id", "school_id", "created_by", "title", "doc_type", "current_content", "metadata", "created_at", "updated_at"
                ) VALUES (
                    gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5::jsonb, $6::jsonb, NOW(), NOW()
                ) RETURNING "id", "title", "doc_type", "current_content", "updated_at"
            `, schoolId, userId, cleanTitle, normalizedType, JSON.stringify(content || {}), JSON.stringify({ documentId: document.id, fileUrl: finalUrl }));
            officeDoc = ins[0];
        }
    } catch (dbErr) {
        console.warn('[SaveToMediaFiles] office_documents sync warning:', dbErr.message);
    }

    res.json({
        success: true,
        message: `Saved to ${subfolderName}!`,
        data: {
            document,
            officeDocument: officeDoc,
            folder: targetSubfolder,
            fileUrl: finalUrl
        }
    });
}));

/**
 * @route   GET /api/office/documents
 * @desc    Get all office documents (filtered by doc_type: word, excel, presentation)
 */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
    const { docType, search, limit = 50 } = req.query;
    const userId = req.user?.id || null;
    const schoolId = req.user?.schoolId || null;

    let query = `
        SELECT "id", "school_id", "created_by", "title", "doc_type", "metadata",
               "is_archived", "created_at", "updated_at"
        FROM "office_documents"
        WHERE "is_archived" = FALSE
    `;
    const params = [];

    if (docType) {
        params.push(docType);
        query += ` AND "doc_type" = $${params.length}`;
    }

    if (search) {
        params.push(`%${search}%`);
        query += ` AND "title" ILIKE $${params.length}`;
    }

    if (userId) {
        params.push(userId);
        query += ` AND ("created_by" = $${params.length}::uuid OR "created_by" IS NULL)`;
    }

    query += ` ORDER BY "updated_at" DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit, 10));

    const docs = await prisma.$queryRawUnsafe(query, ...params);
    res.json({ success: true, data: docs });
}));

/**
 * @route   GET /api/office/documents/signatures
 * @desc    Get user's stored signatures from Office Media Files/Signatures
 */
router.get('/signatures', optionalAuth, asyncHandler(async (req, res) => {
    let userId = req.user?.id || null;
    let schoolId = req.user?.schoolId || null;

    const { subfolders, schoolId: resolvedSchoolId, userId: resolvedUserId } = await getOrCreateOfficeMediaFolders(schoolId, userId);
    schoolId = resolvedSchoolId;
    userId = resolvedUserId;

    const targetSubfolder = subfolders['Signatures'] || subfolders['Images'];
    if (!targetSubfolder) {
        return res.json({ success: true, data: [] });
    }

    const docs = await prisma.document.findMany({
        where: {
            folderId: targetSubfolder.id,
            deletedAt: null
        },
        orderBy: { createdAt: 'desc' },
        take: 30
    });

    const signatures = docs.map(doc => {
        let dataUrl = doc.url;
        if (doc.fileName) {
            const diskPath = path.join(__dirname, '../../uploads/office-media', doc.fileName);
            if (fs.existsSync(diskPath)) {
                const buf = fs.readFileSync(diskPath);
                dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
            }
        }
        return {
            id: doc.id,
            name: doc.name,
            dataUrl,
            url: doc.url,
            createdAt: doc.createdAt
        };
    });

    res.json({ success: true, data: signatures });
}));

/**
 * @route   POST /api/office/documents/signatures
 * @desc    Save a signature image to Office Media Files/Signatures
 */
router.post('/signatures', optionalAuth, asyncHandler(async (req, res) => {
    const { signatureDataUrl, title } = req.body;
    if (!signatureDataUrl) {
        return res.status(400).json({ success: false, message: 'Signature data is required' });
    }

    let userId = req.user?.id || null;
    let schoolId = req.user?.schoolId || null;

    const { subfolders, schoolId: resolvedSchoolId, userId: resolvedUserId } = await getOrCreateOfficeMediaFolders(schoolId, userId);
    schoolId = resolvedSchoolId;
    userId = resolvedUserId;

    const targetSubfolder = subfolders['Signatures'] || subfolders['Images'];
    const uploadDir = path.join(__dirname, '../../uploads/office-media');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const cleanTitle = (title || 'Signature').trim();
    const diskFileName = `signature_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.png`;
    const diskPath = path.join(uploadDir, diskFileName);

    const cleanBase64 = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(cleanBase64, 'base64');
    fs.writeFileSync(diskPath, imgBuffer);

    const doc = await prisma.document.create({
        data: {
            schoolId,
            uploadedById: userId,
            folderId: targetSubfolder.id,
            name: `${cleanTitle}.png`,
            fileName: diskFileName,
            fileType: 'png',
            mimeType: 'image/png',
            fileSize: imgBuffer.length,
            cloudinaryId: `office-media/${diskFileName}`,
            url: `/uploads/office-media/${diskFileName}`,
            category: 'signature',
            isPublic: false
        }
    });

    res.json({
        success: true,
        data: {
            id: doc.id,
            name: doc.name,
            dataUrl: signatureDataUrl,
            url: doc.url,
            createdAt: doc.createdAt
        }
    });
}));

/**
 * @route   DELETE /api/office/documents/signatures/:id
 * @desc    Delete a saved signature
 */
router.delete('/signatures/:id', optionalAuth, asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.document.update({
        where: { id },
        data: { deletedAt: new Date() }
    }).catch(() => null);
    res.json({ success: true, message: 'Signature removed' });
}));

/**
 * @route   GET /api/office/documents/drive/:fileId
 * @desc    Fetch and parse a Google Drive file directly for opening in In-House Word or Sheets
 */
router.get('/drive/:fileId', optionalAuth, asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const googleDriveService = require('../services/googleDrive');
    const driveService = (req.user && googleDriveService.forUser)
        ? (googleDriveService.forUser(req.user) || googleDriveService)
        : googleDriveService;

    const metadata = await driveService.getFileMetadata(fileId);
    const buffer = await driveService.downloadFileBuffer(fileId);

    const mime = (metadata.mimeType || '').toLowerCase();
    const filename = metadata.name || 'Untitled';
    const ext = filename.split('.').pop().toLowerCase();

    const isSheet = mime.includes('spreadsheet') || mime.includes('excel') || ['xlsx', 'xls', 'csv'].includes(ext);
    const isPresentation = mime.includes('presentation') || mime.includes('powerpoint') || ['pptx', 'ppt', 'odp'].includes(ext);
    const isPdf = ext === 'pdf' || mime.includes('pdf');

    if (isPdf) {
        return res.json({
            success: true,
            data: {
                docType: 'pdf',
                driveFileId: fileId,
                title: filename.replace(/\.pdf$/i, ''),
                source: 'google_drive',
                fileBase64: `data:application/pdf;base64,${buffer.toString('base64')}`,
                metadata: {
                    originalName: filename,
                    mimeType: 'application/pdf',
                    size: metadata.size || buffer.length,
                    modifiedTime: metadata.modifiedTime
                }
            }
        });
    }

    if (isPresentation) {
        return res.json({
            success: true,
            data: {
                docType: 'presentation',
                driveFileId: fileId,
                title: filename.replace(/\.(pptx|ppt|odp)$/i, ''),
                source: 'google_drive',
                content: {
                    activeSlide: 0,
                    slides: [
                        {
                            id: 'slide_1',
                            title: filename.replace(/\.(pptx|ppt|odp)$/i, ''),
                            subtitle: 'Presentation loaded from Google Drive (CloudVault)',
                            layout: 'title',
                            elements: [
                                { type: 'text', content: 'Double-click to edit presentation slide content or add new slides from the left panel.' }
                            ]
                        },
                        {
                            id: 'slide_2',
                            title: 'Key Objectives & Summary',
                            subtitle: 'Executive overview and learning goals',
                            layout: 'bullets',
                            elements: [
                                { type: 'text', content: '• Comprehensive curriculum and lecture coverage' },
                                { type: 'text', content: '• Interactive laboratory experiments & demonstrations' },
                                { type: 'text', content: '• Live presentation slideshow mode (F5) with full screen' }
                            ]
                        }
                    ]
                },
                metadata: {
                    originalName: filename,
                    mimeType: metadata.mimeType,
                    size: metadata.size,
                    modifiedTime: metadata.modifiedTime
                }
            }
        });
    }

    if (isSheet) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheets = [];

        workbook.SheetNames.forEach((sheetName, index) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            const cells = {};
            jsonData.forEach((row, rIdx) => {
                row.forEach((val, cIdx) => {
                    if (val !== '' && val !== null && val !== undefined) {
                        const colLetter = XLSX.utils.encode_col(cIdx);
                        const cellKey = `${colLetter}${rIdx + 1}`;
                        cells[cellKey] = {
                            value: val,
                            formula: '',
                            formatted: typeof val === 'number' ? val.toLocaleString() : String(val)
                        };
                    }
                });
            });

            sheets.push({
                id: `sheet_${index + 1}`,
                name: sheetName,
                rows: Math.max(50, jsonData.length + 10),
                cols: 26,
                cells
            });
        });

        return res.json({
            success: true,
            data: {
                docType: 'excel',
                driveFileId: fileId,
                title: filename.replace(/\.(xlsx|xls|csv)$/i, ''),
                source: 'google_drive',
                content: {
                    activeSheet: sheets[0]?.name || 'Sheet1',
                    sheets: sheets.length > 0 ? sheets : [{ id: 'sheet_1', name: 'Sheet1', rows: 50, cols: 26, cells: {} }]
                },
                metadata: {
                    originalName: filename,
                    mimeType: metadata.mimeType,
                    size: metadata.size,
                    modifiedTime: metadata.modifiedTime
                }
            }
        });
    }

    // Default to Word Document
    let htmlContent = '';
    let plainText = '';

    if (ext === 'docx' || mime.includes('word') || mime.includes('document')) {
        const mammoth = require('mammoth');
        const conversion = await mammoth.convertToHtml({ buffer });
        htmlContent = conversion.value;
        const textConversion = await mammoth.extractRawText({ buffer });
        plainText = textConversion.value;
    } else if (ext === 'txt') {
        plainText = buffer.toString('utf8');
        htmlContent = `<pre style="font-family: monospace; white-space: pre-wrap;">${plainText}</pre>`;
    } else {
        htmlContent = `<h1>${filename}</h1><p>Document content loaded from Google Drive.</p>`;
        plainText = filename;
    }

    return res.json({
        success: true,
        data: {
            docType: 'word',
            driveFileId: fileId,
            title: filename.replace(/\.(docx|doc|odt|txt)$/i, ''),
            source: 'google_drive',
            content: {
                html: htmlContent || `<h1>${filename}</h1><p>Document loaded from Google Drive.</p>`,
                plainText: plainText,
                wordCount: plainText ? plainText.trim().split(/\s+/).length : 0
            },
            metadata: {
                originalName: filename,
                mimeType: metadata.mimeType,
                size: metadata.size,
                modifiedTime: metadata.modifiedTime
            }
        }
    });
}));

/**
 * @route   GET /api/office/documents/:id
 * @desc    Get single document with full current_content
 */
router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
    const docId = req.params.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(docId)) {
        try {
            const docs = await prisma.$queryRawUnsafe(`
                SELECT "id", "school_id", "created_by", "title", "doc_type", "current_content",
                       "metadata", "is_archived", "created_at", "updated_at"
                FROM "office_documents"
                WHERE "id" = $1::uuid
            `, docId);

            if (docs.length > 0) {
                return res.json({ success: true, data: docs[0] });
            }
        } catch (_) {}

        // Fallback: Check standard CloudVault Document model
        try {
            const standardDoc = await prisma.document.findUnique({
                where: { id: docId }
            });
            if (standardDoc) {
                return res.json({
                    success: true,
                    data: {
                        id: standardDoc.id,
                        title: standardDoc.name || standardDoc.fileName,
                        doc_type: standardDoc.fileType?.toLowerCase(),
                        url: standardDoc.url,
                        file_name: standardDoc.fileName,
                        file_type: standardDoc.fileType,
                        mime_type: standardDoc.mimeType,
                        created_at: standardDoc.createdAt,
                        updated_at: standardDoc.updatedAt
                    }
                });
            }
        } catch (_) {}
    }

    return res.status(404).json({ success: false, message: 'Document not found' });
}));

/**
 * @route   POST /api/office/documents
 * @desc    Create a new Office Document (Word or Excel)
 */
router.post('/', optionalAuth, asyncHandler(async (req, res) => {
    const { title, docType, content, metadata } = req.body;

    if (!docType || !['word', 'excel', 'presentation'].includes(docType)) {
        return res.status(400).json({ success: false, message: 'Valid docType is required (word, excel, presentation)' });
    }

    const docTitle = (title || (docType === 'word' ? 'Untitled Document' : 'Untitled Spreadsheet')).trim();
    const userId = req.user?.id || null;
    const schoolId = req.user?.schoolId || null;

    // Default structure for Word vs Excel
    let initialContent = content;
    if (!initialContent) {
        if (docType === 'word') {
            initialContent = {
                html: '<h1>Untitled Document</h1><p>Start writing your lab report or class notes here...</p>',
                plainText: 'Untitled Document\nStart writing your lab report or class notes here...',
                wordCount: 12
            };
        } else if (docType === 'excel') {
            initialContent = {
                activeSheet: 'Sheet1',
                sheets: [
                    {
                        name: 'Sheet1',
                        rows: 50,
                        cols: 26,
                        cells: {
                            'A1': { val: 'Item', bold: true, bg: '#f1f5f9' },
                            'B1': { val: 'Quantity', bold: true, bg: '#f1f5f9' },
                            'C1': { val: 'Unit Price', bold: true, bg: '#f1f5f9' },
                            'D1': { val: 'Total', bold: true, bg: '#f1f5f9' },
                            'A2': { val: 'Resistor 100Ω' },
                            'B2': { val: 10 },
                            'C2': { val: 5 },
                            'D2': { formula: '=B2*C2', val: 50 },
                            'A3': { val: 'Capacitor 10μF' },
                            'B3': { val: 4 },
                            'C3': { val: 15 },
                            'D3': { formula: '=B3*C3', val: 60 },
                            'A4': { val: 'Total Amount', bold: true },
                            'D4': { formula: '=SUM(D2:D3)', val: 110, bold: true, bg: '#e0f2fe' }
                        }
                    }
                ]
            };
        } else if (docType === 'presentation') {
            initialContent = {
                activeSlide: 0,
                slides: [
                    {
                        id: 'slide_1',
                        title: 'Lab Lecture & Presentation',
                        subtitle: 'Department of Electrical & Computer Engineering',
                        layout: 'title',
                        elements: [
                            { type: 'text', content: 'Instructor: Dr. R. Sharma | Academic Session 2026-27' }
                        ]
                    },
                    {
                        id: 'slide_2',
                        title: 'Experiment Objectives & Scope',
                        subtitle: 'Key principles and expected learning outcomes',
                        layout: 'bullets',
                        elements: [
                            { type: 'text', content: '• Verify Ohm\'s Law and Kirchhoff\'s Voltage & Current Laws' },
                            { type: 'text', content: '• Calibrate precision digital multimeters & oscilloscope channels' },
                            { type: 'text', content: '• Plot V-I characteristic curves and evaluate dynamic resistance' }
                        ]
                    },
                    {
                        id: 'slide_3',
                        title: 'Experimental Data & Observations',
                        subtitle: 'Measured values across test resistances',
                        layout: 'two_col',
                        elements: [
                            { type: 'text', content: 'Trial 1 (100Ω): V = 5.0V, I = 50.2mA\nTrial 2 (220Ω): V = 5.0V, I = 22.8mA\nTrial 3 (470Ω): V = 5.0V, I = 10.6mA' },
                            { type: 'text', content: 'Observations:\n1. Strict linear correlation observed.\n2. Thermal drift minimized within 1.2% error threshold.' }
                        ]
                    }
                ]
            };
        } else {
            initialContent = {};
        }
    }

    const created = await prisma.$queryRawUnsafe(`
        INSERT INTO "office_documents" (
            "id", "school_id", "created_by", "title", "doc_type", "current_content",
            "metadata", "created_at", "updated_at"
        ) VALUES (
            gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5::jsonb, $6::jsonb, NOW(), NOW()
        ) RETURNING "id", "title", "doc_type", "current_content", "metadata", "created_at", "updated_at"
    `,
        schoolId,
        userId,
        docTitle,
        docType,
        JSON.stringify(initialContent),
        JSON.stringify(metadata || {})
    );

    // Initial revision snapshot
    await prisma.$queryRawUnsafe(`
        INSERT INTO "office_document_revisions" (
            "id", "document_id", "author_id", "version_number", "snapshot", "change_summary", "created_at"
        ) VALUES (
            gen_random_uuid(), $1::uuid, $2::uuid, 1, $3::jsonb, 'Initial Creation', NOW()
        )
    `, created[0].id, userId, JSON.stringify(initialContent));

    res.status(201).json({ success: true, data: created[0] });
}));

/**
 * @route   PUT /api/office/documents/:id
 * @desc    Save / Auto-save Document Content & Title
 */
router.put('/:id', optionalAuth, asyncHandler(async (req, res) => {
    const docId = req.params.id;
    const { title, content, metadata } = req.body;

    const existing = await prisma.$queryRawUnsafe(`
        SELECT "id", "current_content" FROM "office_documents" WHERE "id" = $1::uuid
    `, docId);

    if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const updated = await prisma.$queryRawUnsafe(`
        UPDATE "office_documents" SET
            "title" = COALESCE($1, "title"),
            "current_content" = COALESCE($2::jsonb, "current_content"),
            "metadata" = COALESCE($3::jsonb, "metadata"),
            "updated_at" = NOW()
        WHERE "id" = $4::uuid
        RETURNING "id", "title", "doc_type", "current_content", "metadata", "updated_at"
    `,
        title || null,
        content ? JSON.stringify(content) : null,
        metadata ? JSON.stringify(metadata) : null,
        docId
    );

    res.json({ success: true, data: updated[0] });
}));

/**
 * @route   POST /api/office/documents/:id/export
 * @desc    Export document to .docx, .xlsx, or .pdf
 */
router.post('/:id/export', optionalAuth, asyncHandler(async (req, res) => {
    const docId = req.params.id;
    const { format } = req.body; // docx, xlsx, pdf

    const docRes = await prisma.$queryRawUnsafe(`
        SELECT "id", "title", "doc_type", "current_content"
        FROM "office_documents"
        WHERE "id" = $1::uuid
    `, docId);

    if (docRes.length === 0) {
        return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const docItem = docRes[0];
    const docType = docItem.doc_type;
    const content = docItem.current_content || {};
    const safeTitle = (docItem.title || 'document').replace(/[^a-zA-Z0-9_.-]/g, '_');

    let outputBuffer;
    let outputExt = format;
    let mimeType = 'application/octet-stream';

    if (docType === 'word') {
        if (format === 'docx') {
            const plainText = content.plainText || content.html?.replace(/<[^>]*>/g, ' ') || 'Empty document';
            const paragraphs = plainText.split('\n').filter(Boolean).map(line =>
                new docx.Paragraph({
                    children: [new docx.TextRun({ text: line, size: 22 })],
                    spacing: { after: 120 }
                })
            );

            const docxFile = new docx.Document({
                sections: [{
                    children: [
                        new docx.Paragraph({
                            children: [new docx.TextRun({ text: docItem.title, bold: true, size: 32 })],
                            spacing: { after: 200 }
                        }),
                        ...paragraphs
                    ]
                }]
            });
            outputBuffer = await docx.Packer.toBuffer(docxFile);
            outputExt = 'docx';
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (format === 'pdf') {
            const rawText = content.plainText || content.html?.replace(/<[^>]*>/g, ' ') || 'Empty document';
            outputBuffer = await documentConverter.convertWordToPdf(
                Buffer.from(rawText),
                { title: docItem.title }
            );
            outputExt = 'pdf';
            mimeType = 'application/pdf';
        } else if (format === 'txt') {
            const rawText = content.plainText || content.html?.replace(/<[^>]*>/g, ' ') || '';
            outputBuffer = Buffer.from(rawText, 'utf8');
            outputExt = 'txt';
            mimeType = 'text/plain';
        } else if (format === 'html') {
            const htmlContent = content.html || `<p>${content.plainText || ''}</p>`;
            const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head><body>${htmlContent}</body></html>`;
            outputBuffer = Buffer.from(fullHtml, 'utf8');
            outputExt = 'html';
            mimeType = 'text/html';
        } else if (format === 'md') {
            const rawText = content.plainText || content.html?.replace(/<[^>]*>/g, '') || '';
            outputBuffer = Buffer.from(`# ${docItem.title}\n\n${rawText}`, 'utf8');
            outputExt = 'md';
            mimeType = 'text/markdown';
        }
    } else if (docType === 'excel') {
        // Convert sheet cells to XLSX workbook
        const wb = XLSX.utils.book_new();
        const sheets = content.sheets || [{ name: 'Sheet1', cells: {} }];

        sheets.forEach(sh => {
            const aoa = [];
            for (let r = 0; r < (sh.rows || 30); r++) {
                const rowArr = [];
                for (let c = 0; c < (sh.cols || 20); c++) {
                    const colLetter = String.fromCharCode(65 + c);
                    const cellKey = `${colLetter}${r + 1}`;
                    const cellData = sh.cells ? sh.cells[cellKey] : null;
                    rowArr.push(cellData && cellData.val !== undefined ? cellData.val : '');
                }
                aoa.push(rowArr);
            }
            const ws = XLSX.utils.aoa_to_sheet(aoa);
            XLSX.utils.book_append_sheet(wb, ws, sh.name || 'Sheet1');
        });

        if (format === 'xlsx') {
            outputBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            outputExt = 'xlsx';
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (format === 'csv') {
            const firstSheet = wb.Sheets[wb.SheetNames[0]];
            const csvText = XLSX.utils.sheet_to_csv(firstSheet);
            outputBuffer = Buffer.from(csvText, 'utf8');
            outputExt = 'csv';
            mimeType = 'text/csv';
        } else if (format === 'pdf') {
            const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            outputBuffer = await documentConverter.convertExcelToPdf(xlsxBuffer, { sheetName: wb.SheetNames[0] });
            outputExt = 'pdf';
            mimeType = 'application/pdf';
        } else if (format === 'json') {
            outputBuffer = Buffer.from(JSON.stringify(content, null, 2), 'utf8');
            outputExt = 'json';
            mimeType = 'application/json';
        }
    } else if (docType === 'presentation') {
        const slides = content.slides || [];
        if (format === 'pdf') {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({
                size: [960, 540],
                layout: 'landscape',
                margins: { top: 40, bottom: 40, left: 50, right: 50 },
                autoFirstPage: false
            });
            const chunks = [];
            doc.on('data', chunk => chunks.push(chunk));

            slides.forEach((slide, sIdx) => {
                doc.addPage({ size: [960, 540], layout: 'landscape' });
                doc.rect(0, 0, 960, 540).fill(slide.bgColor || '#0f172a');
                doc.rect(0, 0, 960, 8).fill('#6366f1');

                doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold');
                doc.text(slide.title || `Slide ${sIdx + 1}`, 50, 45, { width: 860 });

                if (slide.subtitle) {
                    doc.fillColor('#94a3b8').fontSize(14).font('Helvetica');
                    doc.text(slide.subtitle, 50, 85, { width: 860 });
                }

                let yOffset = 130;
                if (slide.elements && slide.elements.length > 0) {
                    slide.elements.forEach(el => {
                        if (el.content) {
                            doc.fillColor('#e2e8f0').fontSize(14).font('Helvetica');
                            doc.text(String(el.content), 50, yOffset, { width: 860, lineGap: 6 });
                            yOffset += 45;
                        }
                    });
                }

                doc.fillColor('#64748b').fontSize(10).font('Helvetica');
                doc.text(`LabSlides Presentation | Slide ${sIdx + 1} of ${slides.length}`, 50, 510, { width: 860, align: 'right' });
            });

            doc.end();
            outputBuffer = await new Promise((resolve) => {
                doc.on('end', () => resolve(Buffer.concat(chunks)));
            });
            outputExt = 'pdf';
            mimeType = 'application/pdf';
        } else if (format === 'json') {
            outputBuffer = Buffer.from(JSON.stringify(content, null, 2), 'utf8');
            outputExt = 'json';
            mimeType = 'application/json';
        } else if (format === 'html' || format === 'pptx') {
            let htmlSlideDeck = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>
            body{margin:0;background:#090d16;font-family:system-ui,sans-serif;color:#f8fafc;display:flex;flex-direction:column;align-items:center;padding:30px;}
            .slide{width:960px;height:540px;background:#0f172a;border:1px solid #334155;border-radius:12px;padding:40px;box-sizing:border-box;margin-bottom:30px;box-shadow:0 10px 25px rgba(0,0,0,0.5);display:flex;flex-direction:column;}
            h1{font-size:28px;margin:0 0 10px 0;color:#60a5fa;}
            h3{font-size:16px;color:#94a3b8;margin:0 0 20px 0;}
            p{font-size:15px;line-height:1.6;color:#e2e8f0;}
            </style></head><body>`;
            slides.forEach((sl, idx) => {
                htmlSlideDeck += `<div class="slide"><h1>${sl.title || `Slide ${idx+1}`}</h1><h3>${sl.subtitle || ''}</h3>${(sl.elements || []).map(e => `<p>${e.content || ''}</p>`).join('')}</div>`;
            });
            htmlSlideDeck += `</body></html>`;
            outputBuffer = Buffer.from(htmlSlideDeck, 'utf8');
            outputExt = 'html';
            mimeType = 'text/html';
        }
    }

    if (!outputBuffer) {
        return res.status(400).json({ success: false, message: `Unsupported export format "${format}" for docType "${docType}"` });
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.${outputExt}"`);
    res.send(outputBuffer);
}));

/**
 * @route   GET /api/office/documents/:id/revisions
 * @desc    Get version history
 */
router.get('/:id/revisions', optionalAuth, asyncHandler(async (req, res) => {
    const docId = req.params.id;
    const revisions = await prisma.$queryRawUnsafe(`
        SELECT "id", "document_id", "version_number", "change_summary", "created_at"
        FROM "office_document_revisions"
        WHERE "document_id" = $1::uuid
        ORDER BY "version_number" DESC
    `, docId);

    res.json({ success: true, data: revisions });
}));

/**
 * @route   POST /api/office/documents/:id/revisions
 * @desc    Create a named revision milestone
 */
router.post('/:id/revisions', optionalAuth, asyncHandler(async (req, res) => {
    const docId = req.params.id;
    const { summary } = req.body;
    const userId = req.user?.id || null;

    const docRes = await prisma.$queryRawUnsafe(`
        SELECT "current_content" FROM "office_documents" WHERE "id" = $1::uuid
    `, docId);

    if (docRes.length === 0) {
        return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const countRes = await prisma.$queryRawUnsafe(`
        SELECT COALESCE(MAX("version_number"), 0) + 1 AS next_ver
        FROM "office_document_revisions"
        WHERE "document_id" = $1::uuid
    `, docId);

    const nextVer = countRes[0]?.next_ver || 1;

    const rev = await prisma.$queryRawUnsafe(`
        INSERT INTO "office_document_revisions" (
            "id", "document_id", "author_id", "version_number", "snapshot", "change_summary", "created_at"
        ) VALUES (
            gen_random_uuid(), $1::uuid, $2::uuid, $3, $4::jsonb, $5, NOW()
        ) RETURNING "id", "version_number", "change_summary", "created_at"
    `, docId, userId, nextVer, JSON.stringify(docRes[0].current_content), summary || `Version ${nextVer}`);

    res.status(201).json({ success: true, data: rev[0] });
}));

/**
 * @route   POST /api/office/documents/:id/revisions/:revId/restore
 * @desc    Restore a past revision snapshot
 */
router.post('/:id/revisions/:revId/restore', optionalAuth, asyncHandler(async (req, res) => {
    const { id, revId } = req.params;
    const revRes = await prisma.$queryRawUnsafe(`
        SELECT "snapshot" FROM "office_document_revisions"
        WHERE "id" = $1::uuid AND "document_id" = $2::uuid
    `, revId, id);

    if (!revRes || revRes.length === 0) {
        return res.status(404).json({ success: false, message: 'Revision snapshot not found' });
    }

    const snapshot = revRes[0].snapshot;
    await prisma.$queryRawUnsafe(`
        UPDATE "office_documents"
        SET "current_content" = $1::jsonb, "updated_at" = NOW()
        WHERE "id" = $2::uuid
    `, JSON.stringify(snapshot), id);

    res.json({ success: true, message: 'Document restored to selected revision', data: snapshot });
}));

/**
 * @route   DELETE /api/office/documents/:id
 * @desc    Archive document
 */
router.delete('/:id', optionalAuth, asyncHandler(async (req, res) => {
    const docId = req.params.id;
    await prisma.$queryRawUnsafe(`
        UPDATE "office_documents" SET "is_archived" = TRUE, "updated_at" = NOW()
        WHERE "id" = $1::uuid
    `, docId);

    res.json({ success: true, message: 'Document archived successfully' });
}));

module.exports = router;
