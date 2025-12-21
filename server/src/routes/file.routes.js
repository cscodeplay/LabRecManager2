const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const googleDrive = require('../services/googleDrive');

// Configure multer for memory storage (we'll upload to Google Drive)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow images and PDFs
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images, PDFs, and documents allowed.'));
        }
    }
});

/**
 * @route   GET /api/files/status
 * @desc    Check if Google Drive is configured
 * @access  Private
 */
router.get('/status', authenticate, asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: {
            configured: googleDrive.isConfigured(),
            message: googleDrive.isConfigured()
                ? 'Google Drive is ready for uploads'
                : 'Google Drive not configured. Please add credentials.'
        }
    });
}));

/**
 * @route   POST /api/files/upload
 * @desc    Upload a file to Google Drive
 * @access  Private
 */
router.post('/upload', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
    }

    if (!googleDrive.isConfigured()) {
        return res.status(503).json({
            success: false,
            message: 'Google Drive not configured. Upload to external service and paste URL instead.'
        });
    }

    const result = await googleDrive.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
    );

    res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
            fileId: result.id,
            url: result.directLink,
            viewLink: result.webViewLink,
            downloadLink: result.webContentLink,
            thumbnailLink: result.thumbnailLink,
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size
        }
    });
}));

/**
 * @route   DELETE /api/files/:fileId
 * @desc    Delete a file from Google Drive
 * @access  Private (Admin only)
 */
router.delete('/:fileId', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    if (!googleDrive.isConfigured()) {
        return res.status(503).json({ success: false, message: 'Google Drive not configured' });
    }

    await googleDrive.deleteFile(req.params.fileId);

    res.json({
        success: true,
        message: 'File deleted successfully'
    });
}));

module.exports = router;
