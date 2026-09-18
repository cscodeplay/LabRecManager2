const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const googleDriveService = require('../services/googleDrive');
const chatbotService = require('../services/chatbot.service');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Require authentication for all Google Drive routes
router.use(authenticate);

/**
 * @route   GET /api/drive/status
 * @desc    Check Google Drive integration status
 */
router.get('/status', (req, res) => {
    res.json({
        success: true,
        data: {
            isConfigured: googleDriveService.isConfigured(),
            folderId: googleDriveService.folderId
        }
    });
});

/**
 * @route   GET /api/drive/files
 * @desc    List files and folders from Google Drive
 */
router.get('/files', asyncHandler(async (req, res) => {
    const { folderId, query, mimeType, pageSize } = req.query;

    const files = await googleDriveService.listFiles({
        folderId: folderId || null,
        query: query || '',
        mimeType: mimeType || null,
        pageSize: pageSize ? parseInt(pageSize, 10) : 50
    });

    res.json({
        success: true,
        data: {
            files,
            isConfigured: googleDriveService.isConfigured(),
            folderId: folderId || googleDriveService.folderId
        }
    });
}));

/**
 * @route   GET /api/drive/files/:id
 * @desc    Get file metadata
 */
router.get('/files/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const metadata = await googleDriveService.getFileMetadata(id);

    res.json({
        success: true,
        data: metadata
    });
}));

/**
 * @route   GET /api/drive/files/:id/content
 * @desc    Download / Stream file buffer
 */
router.get('/files/:id/content', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const metadata = await googleDriveService.getFileMetadata(id);
    const buffer = await googleDriveService.downloadFileBuffer(id);

    const filename = metadata.name || 'download';
    const mimeType = metadata.mimeType || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
}));

/**
 * @route   GET /api/drive/files/:id/text
 * @desc    Extract text from file for chatbot reasoning / preview
 */
router.get('/files/:id/text', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const metadata = await googleDriveService.getFileMetadata(id);
    const buffer = await googleDriveService.downloadFileBuffer(id);

    const extractedText = await chatbotService.getOrExtractDocumentText(
        null,
        metadata.mimeType || 'text/plain',
        metadata.name || 'document',
        buffer
    );

    res.json({
        success: true,
        data: {
            id,
            name: metadata.name,
            text: extractedText,
            charCount: extractedText.length
        }
    });
}));

/**
 * @route   POST /api/drive/upload
 * @desc    Upload file buffer or base64 to Google Drive
 */
router.post('/upload', upload.single('file'), asyncHandler(async (req, res) => {
    let fileBuffer;
    let fileName;
    let mimeType;
    let targetFolderId = req.body.folderId || null;

    if (req.file) {
        fileBuffer = req.file.buffer;
        fileName = req.file.originalname;
        mimeType = req.file.mimetype;
    } else if (req.body.fileData) {
        // Base64 payload (used for client charts PNG or CSV text)
        const base64Data = req.body.fileData.replace(/^data:[^;]+;base64,/, '');
        fileBuffer = Buffer.from(base64Data, 'base64');
        fileName = req.body.fileName || `artifact_${Date.now()}`;
        mimeType = req.body.mimeType || 'application/octet-stream';
    } else if (req.body.content) {
        fileBuffer = Buffer.from(req.body.content, 'utf8');
        fileName = req.body.fileName || `document_${Date.now()}.csv`;
        mimeType = req.body.mimeType || 'text/csv';
    } else {
        return res.status(400).json({ success: false, message: 'No file or content provided' });
    }

    const uploaded = await googleDriveService.uploadFile(
        fileBuffer,
        fileName,
        mimeType,
        targetFolderId
    );

    res.status(201).json({
        success: true,
        message: 'File uploaded to Google Drive successfully',
        data: uploaded
    });
}));

/**
 * @route   POST /api/drive/import-to-documents
 * @desc    Import a Google Drive file into school's Document management repository
 */
router.post('/import-to-documents', asyncHandler(async (req, res) => {
    const { fileId, folderId, name, category, description } = req.body;
    const userId = req.user.id;
    const schoolId = req.user.schoolId || null;

    if (!fileId) {
        return res.status(400).json({ success: false, message: 'fileId is required' });
    }

    // 1. Fetch file metadata and buffer from Google Drive
    const metadata = await googleDriveService.getFileMetadata(fileId);
    const buffer = await googleDriveService.downloadFileBuffer(fileId);

    const docName = name || metadata.name.replace(/\.[^.]+$/, '');
    const fileName = metadata.name || `${docName}.pdf`;
    const mimeType = metadata.mimeType || 'application/pdf';
    const fileSize = buffer.length;

    // 2. Save locally in uploads folder for permanent access
    const uploadsDir = path.join(__dirname, '../../../uploads');
    if (!fs.existsSync(uploadsDir)) {
        try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) {}
    }

    const uniquePrefix = `${Date.now()}_${Math.round(Math.random() * 1e4)}`;
    const savedDiskName = `${uniquePrefix}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const localFilePath = path.join(uploadsDir, savedDiskName);
    fs.writeFileSync(localFilePath, buffer);

    const fileUrl = `/uploads/${savedDiskName}`;

    // Determine simplified fileType (pdf, doc, docx, csv, xlsx, txt, etc.)
    const ext = path.extname(fileName).toLowerCase().replace('.', '') || 'pdf';

    // 3. Register record in PostgreSQL Document table
    const doc = await prisma.document.create({
        data: {
            schoolId,
            uploadedById: userId,
            folderId: folderId || null,
            name: docName,
            description: description || `Imported from Google Drive (${metadata.name})`,
            fileName,
            fileType: ext,
            mimeType,
            fileSize,
            url: fileUrl,
            category: category || 'Google Drive',
            isPublic: false
        },
        include: {
            uploadedBy: { select: { id: true, firstName: true, lastName: true } }
        }
    });

    res.status(201).json({
        success: true,
        message: `Successfully imported "${docName}" into Documents`,
        data: doc
    });
}));

module.exports = router;
