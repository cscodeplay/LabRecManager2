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
const cloudinary = require('../services/cloudinary');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

function getClientBaseUrl(req) {
    const host = req.get('host') || '';
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return process.env.CLIENT_URL || 'http://localhost:3000';
    }
    if (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost')) {
        return process.env.CLIENT_URL;
    }
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    return `${protocol}://${host}`;
}

function getCallbackUrl(req) {
    const host = req.get('host') || '';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';

    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
        if (process.env.GOOGLE_REDIRECT_URI && !process.env.GOOGLE_REDIRECT_URI.includes('localhost')) {
            return process.env.GOOGLE_REDIRECT_URI;
        }
        return `${protocol}://${host}/api/drive/auth/callback`;
    }

    return process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/api/drive/auth/callback`;
}

/**
 * @route   GET /api/drive/auth/callback
 * @desc    OAuth 2.0 redirect callback endpoint from Google consent screen
 * @access  Public (browser redirect from Google)
 */
router.get('/auth/callback', asyncHandler(async (req, res) => {
    const { code, error } = req.query;
    const clientBase = getClientBaseUrl(req);

    if (error) {
        console.warn('[GoogleDrive OAuth Callback Error from Google]:', error);
        return res.redirect(`${clientBase}/documents?tab=drive&oauth=error&message=${encodeURIComponent(error)}`);
    }

    if (!code) {
        return res.redirect(`${clientBase}/documents?tab=drive&oauth=error&message=No+authorization+code+provided`);
    }

    try {
        const callbackUrl = getCallbackUrl(req);
        await googleDriveService.handleOAuthCallback(code, callbackUrl);
        return res.redirect(`${clientBase}/documents?tab=drive&oauth=success`);
    } catch (err) {
        console.error('[GoogleDrive OAuth Callback Exchange Error]:', err.message);
        return res.redirect(`${clientBase}/documents?tab=drive&oauth=error&message=${encodeURIComponent(err.message)}`);
    }
}));

// Require authentication for all protected Google Drive routes below
router.use(authenticate);

// Auto-restore Google Drive OAuth from persistent DB if needed
router.use(asyncHandler(async (req, res, next) => {
    await googleDriveService.ensureInitialized();
    next();
}));

/**
 * @route   GET /api/drive/status
 * @desc    Check Google Drive integration status, auth mode, and storage quota
 */
router.get('/status', asyncHandler(async (req, res) => {
    const quotaData = await googleDriveService.getStorageQuota();
    const oauthConfig = googleDriveService.getOAuthConfig();

    res.json({
        success: true,
        data: {
            isConfigured: googleDriveService.isConfigured(),
            authType: googleDriveService.authType,
            isOAuthConnected: googleDriveService.authType === 'oauth_user' && !quotaData.error,
            authError: quotaData.error || null,
            hasOAuthConfig: Boolean(oauthConfig.clientId && oauthConfig.clientSecret),
            clientId: oauthConfig.clientId ? `${oauthConfig.clientId.substring(0, 16)}...` : null,
            user: quotaData.user || null,
            quota: quotaData.quota || null,
            folderId: googleDriveService.folderId,
            serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null,
            ulrmsFolderUrl: 'https://drive.google.com/drive/folders/1fzuxLH580TlkwJyATBbrjv7LBnFnC1Qp',
            ulrmsFilesFolderUrl: 'https://drive.google.com/drive/folders/1R6SmhanodL-ghLTOoBhX_EgQ5Farf853',
            storageNotice: googleDriveService.authType === 'oauth_user' && !quotaData.error
                ? `Connected to personal Google Drive (${quotaData.user?.emailAddress || 'User'}). 5 TB storage quota active.`
                : (quotaData.error
                    ? `Google Drive authorization notice: ${quotaData.error}`
                    : 'Google Service Accounts have a 0-byte quota for creating files in personal @gmail.com folders. Connect your personal Google account via OAuth 2.0 to upload directly using your 5 TB storage plan.')
        }
    });
}));

/**
 * @route   GET /api/drive/auth/url
 * @desc    Generate Google OAuth consent URL for user authorization
 */
router.get('/auth/url', asyncHandler(async (req, res) => {
    const callbackUrl = getCallbackUrl(req);
    const authUrl = googleDriveService.generateAuthUrl(callbackUrl);
    res.json({
        success: true,
        data: {
            authUrl,
            callbackUrl
        }
    });
}));

/**
 * @route   POST /api/drive/auth/config
 * @desc    Save OAuth 2.0 Client ID and Secret (allows setup from UI)
 */
router.post('/auth/config', asyncHandler(async (req, res) => {
    const { clientId, clientSecret, redirectUri } = req.body;
    if (!clientId || !clientSecret) {
        return res.status(400).json({ success: false, message: 'Both Client ID and Client Secret are required' });
    }
    const saved = googleDriveService.saveOAuthConfig({ clientId, clientSecret, redirectUri });
    res.json({
        success: true,
        message: 'Google OAuth client credentials saved successfully',
        data: {
            hasOAuthConfig: Boolean(saved.clientId && saved.clientSecret),
            clientId: saved.clientId ? `${saved.clientId.substring(0, 16)}...` : null
        }
    });
}));

/**
 * @route   POST /api/drive/auth/disconnect
 * @desc    Disconnect Google OAuth account
 */
router.post('/auth/disconnect', asyncHandler(async (req, res) => {
    googleDriveService.disconnectOAuth();
    res.json({
        success: true,
        message: 'Google OAuth account disconnected. Reverted to standard configuration.'
    });
}));

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

    let filename = metadata.name || 'download';
    let mimeType = metadata.mimeType || 'application/octet-stream';

    // Google Docs / Sheets / Slides exports require matching MIME types and extensions
    if (mimeType === 'application/vnd.google-apps.document') {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (!filename.toLowerCase().endsWith('.docx')) filename += '.docx';
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (!filename.toLowerCase().endsWith('.xlsx')) filename += '.xlsx';
    } else if (mimeType === 'application/vnd.google-apps.presentation') {
        mimeType = 'application/pdf';
        if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
}));

/**
 * @route   POST /api/drive/export-from-documents
 * @desc    Export / Copy / Move selected documents from My Documents to a Google Drive folder
 * @access  Private
 */
router.post('/export-from-documents', authenticate, asyncHandler(async (req, res) => {
    const { documentIds, targetFolderId = null, isMove = false } = req.body;

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No document IDs provided' });
    }

    const documents = await prisma.document.findMany({
        where: {
            id: { in: documentIds },
            schoolId: req.user.schoolId,
            deletedAt: null
        }
    });

    if (documents.length === 0) {
        return res.status(404).json({ success: false, message: 'No matching documents found' });
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const doc of documents) {
        try {
            let fileBuffer = null;

            // 1. Check local disk upload
            if (doc.url && doc.url.startsWith('/uploads/')) {
                const relativePath = doc.url.replace(/^\//, '');
                const diskPath = path.join(__dirname, '../../', relativePath);
                if (fs.existsSync(diskPath)) {
                    fileBuffer = fs.readFileSync(diskPath);
                }
            }

            // 2. If not on disk, try fetching via axios
            if (!fileBuffer && doc.url && doc.url.startsWith('http')) {
                const axios = require('axios');
                const fileRes = await axios.get(doc.url, { responseType: 'arraybuffer' });
                fileBuffer = Buffer.from(fileRes.data);
            }

            if (!fileBuffer) {
                throw new Error(`File buffer could not be loaded for document "${doc.name}"`);
            }

            const fileName = doc.fileName || doc.name || 'document';
            const mimeType = doc.mimeType || 'application/octet-stream';

            // Upload to Google Drive
            const driveFile = await googleDriveService.uploadFile(
                fileBuffer,
                fileName,
                mimeType,
                targetFolderId || null
            );

            // If move, soft-delete from local documents
            if (isMove) {
                await prisma.document.update({
                    where: { id: doc.id },
                    data: {
                        deletedAt: new Date(),
                        deletedById: req.user.id
                    }
                });
            }

            results.push({
                id: doc.id,
                name: fileName,
                driveId: driveFile.id,
                status: 'success'
            });
            successCount++;
        } catch (err) {
            console.error(`[Drive Export] Failed to transfer doc ${doc.id}:`, err.message);
            results.push({
                id: doc.id,
                name: doc.name,
                status: 'failed',
                error: err.message
            });
            failCount++;
        }
    }

    res.json({
        success: successCount > 0,
        message: `Successfully transferred ${successCount} document${successCount === 1 ? '' : 's'} to Google Drive${failCount > 0 ? ` (${failCount} failed)` : ''}`,
        transferredCount: successCount,
        failedCount: failCount,
        isMove,
        results
    });
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

    const isLive = uploaded.storageMode === 'google_drive';
    res.status(isLive ? 201 : 200).json({
        success: true,
        isLiveGoogleDrive: isLive,
        storageMode: uploaded.storageMode,
        warning: uploaded.warning || null,
        message: isLive 
            ? 'File uploaded directly to Google Drive successfully'
            : 'File saved in synchronized storage. (Google restricts Service Accounts from creating files directly in personal @gmail Drive folders due to 0-byte quota policies. Open your ULRMS Drive folder to drag and drop)',
        ulrmsFolderUrl: 'https://drive.google.com/drive/folders/1fzuxLH580TlkwJyATBbrjv7LBnFnC1Qp',
        data: uploaded
    });
}));

/**
 * @route   POST /api/drive/import-to-documents
/**
 * Helper: Import a single Google Drive file to Documents repository with storage quota validation
 */
async function importSingleDriveFile({ fileId, folderId, name, category, description, userId, schoolId }) {
    await googleDriveService.ensureInitialized();
    const metadata = await googleDriveService.getFileMetadata(fileId);

    // Resolve valid schoolId
    let targetSchoolId = schoolId;
    if (!targetSchoolId) {
        const u = await prisma.user.findUnique({
            where: { id: userId },
            select: { schoolId: true }
        });
        targetSchoolId = u?.schoolId;
        if (!targetSchoolId) {
            const firstSchool = await prisma.school.findFirst({ select: { id: true } });
            targetSchoolId = firstSchool?.id;
        }
    }

    // Check user storage quota
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { storageQuotaMb: true, storageUsedBytes: true }
    });
    const quotaBytes = (user?.storageQuotaMb || 500) * 1024 * 1024;
    const currentUsed = Number(user?.storageUsedBytes || 0);
    const estimatedSize = metadata.size ? parseInt(metadata.size, 10) : 0;

    if (estimatedSize > 0 && currentUsed + estimatedSize > quotaBytes) {
        const quotaMb = Math.round(quotaBytes / (1024 * 1024));
        const usedMb = Math.round(currentUsed / (1024 * 1024));
        throw new Error(`Storage quota exceeded. Used ${usedMb} MB of ${quotaMb} MB limit.`);
    }

    let buffer;
    try {
        buffer = await googleDriveService.downloadFileBuffer(fileId);
    } catch (dlErr) {
        throw new Error(`Failed to download "${metadata.name || 'file'}" from Google Drive: ${dlErr.message}`);
    }

    let docName = name || metadata.name.replace(/\.[^.]+$/, '');
    let fileName = metadata.name || `${docName}.docx`;
    let mimeType = metadata.mimeType || 'application/octet-stream';

    if (mimeType === 'application/vnd.google-apps.document') {
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (!fileName.toLowerCase().endsWith('.docx')) fileName += '.docx';
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (!fileName.toLowerCase().endsWith('.xlsx')) fileName += '.xlsx';
    } else if (mimeType === 'application/vnd.google-apps.presentation') {
        mimeType = 'application/pdf';
        if (!fileName.toLowerCase().endsWith('.pdf')) fileName += '.pdf';
    }

    const fileSize = buffer ? buffer.length : 0;

    if (currentUsed + fileSize > quotaBytes) {
        throw new Error(`Storage quota exceeded for "${fileName}" (${(fileSize / (1024 * 1024)).toFixed(1)} MB)`);
    }

    // Save locally in server/uploads folder
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
        try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) {}
    }

    const uniquePrefix = `${Date.now()}_${Math.round(Math.random() * 1e4)}`;
    const savedDiskName = `${uniquePrefix}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const localFilePath = path.join(uploadsDir, savedDiskName);
    fs.writeFileSync(localFilePath, buffer);

    let finalPublicId = `local_${savedDiskName}`;
    let fileUrl = `/uploads/${savedDiskName}`;

    // If Cloudinary is configured and file size <= 10MB, also upload to Cloudinary for cloud persistence
    if (cloudinary && typeof cloudinary.isConfigured === 'function' && cloudinary.isConfigured() && fileSize <= 10 * 1024 * 1024) {
        try {
            const result = await cloudinary.uploadFile(buffer, fileName, mimeType);
            if (result && (result.secureUrl || result.url)) {
                finalPublicId = result.publicId;
                fileUrl = result.secureUrl || result.url;
            }
        } catch (cloudErr) {
            console.warn('[Drive Import] Cloudinary backup notice (using local /uploads):', cloudErr.message);
        }
    }

    const ext = path.extname(fileName).toLowerCase().replace('.', '') || 'pdf';
    const cleanFolderId = (folderId && typeof folderId === 'string' && folderId !== 'null' && folderId !== 'undefined' && folderId !== '__NEW__' && folderId.trim().length === 36) ? folderId.trim() : null;

    const doc = await prisma.document.create({
        data: {
            schoolId: targetSchoolId,
            uploadedById: userId,
            folderId: cleanFolderId,
            name: docName,
            description: description || `Imported from Google Drive (${metadata.name})`,
            fileName,
            fileType: ext,
            mimeType,
            fileSize,
            cloudinaryId: finalPublicId,
            url: fileUrl,
            category: category || 'Google Drive',
            isPublic: false
        },
        include: {
            uploadedBy: { select: { id: true, firstName: true, lastName: true } }
        }
    });

    // Increment user's used storage atomically
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { storageUsedBytes: { increment: fileSize } }
        });
    } catch (storageUpdateErr) {
        console.warn('[Drive Import] storageUsedBytes update notice:', storageUpdateErr.message);
    }

    return doc;
}

/**
 * @route   POST /api/drive/import-to-documents
 * @desc    Import a single Google Drive file into school's Document management repository
 */
router.post('/import-to-documents', asyncHandler(async (req, res) => {
    if (req.setTimeout) req.setTimeout(300000);
    const { fileId, folderId, name, category, description } = req.body;
    const userId = req.user.id;
    const schoolId = req.user.schoolId || null;

    if (!fileId) {
        return res.status(400).json({ success: false, message: 'fileId is required' });
    }

    try {
        const doc = await importSingleDriveFile({
            fileId,
            folderId,
            name,
            category,
            description,
            userId,
            schoolId
        });

        res.status(201).json({
            success: true,
            message: `Successfully imported "${doc.name}" into Documents`,
            data: doc
        });
    } catch (err) {
        res.status(400).json({
            success: false,
            message: err.message || 'Failed to import document'
        });
    }
}));

/**
 * @route   POST /api/drive/import-batch
 * @desc    Batch import multiple files and folders with real-time tracking
 */
router.post('/import-batch', asyncHandler(async (req, res) => {
    if (req.setTimeout) req.setTimeout(300000);
    const { items = [], targetFolderId = null } = req.body;
    const userId = req.user.id;
    let schoolId = req.user.schoolId || null;

    if (!schoolId) {
        const u = await prisma.user.findUnique({
            where: { id: userId },
            select: { schoolId: true }
        });
        schoolId = u?.schoolId;
        if (!schoolId) {
            const firstSchool = await prisma.school.findFirst({ select: { id: true } });
            schoolId = firstSchool?.id;
        }
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'No items provided for import' });
    }

    const results = [];
    let succeeded = 0;
    let failed = 0;

    const cleanTargetFolderId = (targetFolderId && typeof targetFolderId === 'string' && targetFolderId !== 'null' && targetFolderId !== 'undefined' && targetFolderId !== '__NEW__' && targetFolderId.length === 36) ? targetFolderId : null;

    for (const item of items) {
        if (item.isFolder) {
            try {
                let localFolder = null;
                if (schoolId) {
                    localFolder = await prisma.documentFolder.create({
                        data: {
                            schoolId,
                            createdById: userId,
                            parentId: cleanTargetFolderId,
                            name: item.name || 'Imported Folder'
                        }
                    });
                }
                const subTargetFolderId = localFolder ? localFolder.id : cleanTargetFolderId;

                const folderStats = await googleDriveService.getFolderStats(item.id);
                if (folderStats.files.length === 0) {
                    results.push({
                        id: item.id,
                        name: item.name,
                        status: 'success',
                        size: 0,
                        isFolder: true,
                        folderId: subTargetFolderId
                    });
                    succeeded++;
                } else {
                    for (const subFile of folderStats.files) {
                        try {
                            const doc = await importSingleDriveFile({
                                fileId: subFile.id,
                                folderId: subTargetFolderId,
                                name: subFile.name,
                                userId,
                                schoolId
                            });
                            results.push({
                                id: subFile.id,
                                name: subFile.name,
                                status: 'success',
                                size: doc.fileSize,
                                documentId: doc.id
                            });
                            succeeded++;
                        } catch (subErr) {
                            results.push({
                                id: subFile.id,
                                name: subFile.name,
                                status: 'failed',
                                error: subErr.message
                            });
                            failed++;
                        }
                    }
                }
            } catch (folderErr) {
                results.push({
                    id: item.id,
                    name: item.name,
                    status: 'failed',
                    error: `Folder import failed: ${folderErr.message}`
                });
                failed++;
            }
        } else {
            try {
                const doc = await importSingleDriveFile({
                    fileId: item.id,
                    folderId: cleanTargetFolderId,
                    name: item.name,
                    userId,
                    schoolId
                });
                results.push({
                    id: item.id,
                    name: item.name,
                    status: 'success',
                    size: doc.fileSize,
                    documentId: doc.id
                });
                succeeded++;
            } catch (fileErr) {
                results.push({
                    id: item.id,
                    name: item.name,
                    status: 'failed',
                    error: fileErr.message
                });
                failed++;
            }
        }
    }

    res.json({
        success: true,
        summary: {
            total: results.length,
            succeeded,
            failed
        },
        results
    });
}));

/**
 * @route   GET /api/drive/folder-tree/:id
 * @desc    Get folder statistics (total files and byte size) for pre-import space checks
 */
router.get('/folder-tree/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const stats = await googleDriveService.getFolderStats(id);
    res.json({
        success: true,
        data: stats
    });
}));

/**
 * @route   GET /api/drive/storage-check
 * @desc    Check available user storage before starting imports
 */
router.get('/storage-check', asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { storageQuotaMb: true, storageUsedBytes: true }
    });
    const quotaBytes = (user?.storageQuotaMb || 500) * 1024 * 1024;
    const currentUsed = Number(user?.storageUsedBytes || 0);
    const remainingBytes = Math.max(0, quotaBytes - currentUsed);
    res.json({
        success: true,
        data: {
            quotaBytes,
            usedBytes: currentUsed,
            remainingBytes,
            quotaMb: user?.storageQuotaMb || 500
        }
    });
}));

/**
 * @route   POST /api/drive/folders
 * @desc    Create a new folder in Google Drive
 */
router.post('/folders', asyncHandler(async (req, res) => {
    const { name, parentFolderId } = req.body;
    if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Folder name is required' });
    }
    const folder = await googleDriveService.createFolder(name.trim(), parentFolderId || null);
    res.status(201).json({
        success: true,
        data: folder,
        message: `Folder "${name.trim()}" created successfully in Google Drive`
    });
}));

module.exports = router;
