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
 * @desc    Upload a file to Cloudinary
 * @access  Private
 */
router.post('/upload', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
    }

    if (!cloudinary.isConfigured()) {
        return res.status(503).json({
            success: false,
            message: 'Cloudinary not configured. Upload to external service and paste URL instead.'
        });
    }

    const result = await cloudinary.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
    );

    res.json({
        success: true,
        message: 'File uploaded successfully',
        data: {
            fileId: result.publicId,
            url: result.secureUrl,
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: result.size || req.file.size,
            width: result.width,
            height: result.height
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
