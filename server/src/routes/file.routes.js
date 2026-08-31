const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const cloudinary = require('../services/cloudinary');

// Configure multer for memory storage (we'll upload to Cloudinary)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow images, PDFs, audio and video recordings
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'video/webm', 'video/mp4', 'video/x-matroska',
            'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/x-m4a',
            'video/mpeg', 'video/ogg', 'video/x-msvideo', 'video/quicktime',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/vnd.oasis.opendocument.presentation',
            'text/html'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images, PDFs, documents, and videos allowed.'));
        }
    }
});

/**
 * @route   GET /api/files/status
 * @desc    Check if Cloudinary is configured
 * @access  Private
 */
router.get('/status', authenticate, asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: {
            configured: cloudinary.isConfigured(),
            provider: 'cloudinary',
            message: cloudinary.isConfigured()
                ? 'Cloudinary is ready for uploads'
                : 'Cloudinary not configured. Please add credentials.'
        }
    });
}));

/**
 * @route   POST /api/files/upload
 * @desc    Upload a file (Cloudinary with local filesystem fallback)
 * @access  Private
 */
router.post('/upload', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
    }

    let fileUrl = null;
    let fileId = null;
    let width = null;
    let height = null;
    let size = req.file.size;

    // 1. Try Cloudinary first if configured
    if (cloudinary.isConfigured()) {
        try {
            const result = await cloudinary.uploadFile(
                req.file.buffer,
                req.file.originalname,
                req.file.mimetype
            );
            fileId = result.publicId;
            fileUrl = result.secureUrl || result.url;
            size = result.size || req.file.size;
            width = result.width;
            height = result.height;
        } catch (cErr) {
            console.warn('[Files Upload] Cloudinary upload failed, falling back to local disk:', cErr.message);
        }
    }

    // 2. Fallback to local disk storage if Cloudinary not configured or failed
    if (!fileUrl) {
        const fs = require('fs');
        const path = require('path');
        const { v4: uuidv4 } = require('uuid');

        const uploadDir = path.join(__dirname, '../../uploads/inventory');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const uniqueId = uuidv4();
        const ext = path.extname(req.file.originalname) || (req.file.mimetype.startsWith('image/') ? '.jpg' : '.bin');
        const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${uniqueId}-${safeName}`;
        const filePath = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, req.file.buffer);

        fileId = uniqueId;
        fileUrl = `/uploads/inventory/${fileName}`;
    }

    res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
            fileId,
            url: fileUrl,
            imageUrl: fileUrl,
            secureUrl: fileUrl,
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            size,
            width,
            height
        }
    });
}));

/**
 * @route   DELETE /api/files/:fileId
 * @desc    Delete a file from Cloudinary
 * @access  Private (Admin only)
 */
router.delete('/:fileId', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    if (!cloudinary.isConfigured()) {
        return res.status(503).json({ success: false, message: 'Cloudinary not configured' });
    }

    // The fileId is the publicId, URL-encoded
    const publicId = decodeURIComponent(req.params.fileId);
    await cloudinary.deleteFile(publicId);

    res.json({
        success: true,
        message: 'File deleted successfully'
    });
}));

module.exports = router;
