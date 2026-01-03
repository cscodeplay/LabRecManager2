const express = require('express');
const crypto = require('crypto');
const { prisma } = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const cloudinary = require('../services/cloudinary');
const multer = require('multer');

const router = express.Router();

// Configure multer for video upload (max 500MB for 30 min recording)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB
    }
});

/**
 * @route   POST /api/recordings/upload
 * @desc    Upload whiteboard recording to Cloudinary
 * @access  Instructor/Admin
 */
router.post('/upload', authenticate, authorize('instructor', 'admin', 'lab_assistant', 'principal'), upload.single('video'), asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No video file provided' });
    }

    const { title, description, sessionId, duration } = req.body;
    const userId = req.user.id;
    const schoolId = req.user.schoolId;

    // Check if Cloudinary is configured
    if (!cloudinary.isConfigured()) {
        return res.status(503).json({
            success: false,
            error: 'Cloud storage not configured. Contact your administrator.'
        });
    }

    // Upload to Cloudinary as video
    const result = await new Promise((resolve, reject) => {
        const uploadStream = require('cloudinary').v2.uploader.upload_stream(
            {
                resource_type: 'video',
                folder: 'ulrms/whiteboard_recordings',
                public_id: `wb_rec_${userId}_${Date.now()}`,
                eager: [
                    { width: 320, height: 180, crop: 'fill', format: 'jpg' } // Thumbnail
                ]
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(req.file.buffer);
    });

    // Generate unique share token
    const shareToken = crypto.randomBytes(32).toString('hex');

    // Save recording metadata to database
    const recording = await prisma.whiteboardRecording.create({
        data: {
            userId,
            schoolId,
            title: title || `Recording ${new Date().toLocaleDateString()}`,
            description: description || null,
            sessionId: sessionId || null,
            cloudinaryId: result.public_id,
            cloudinaryUrl: result.secure_url,
            thumbnailUrl: result.eager?.[0]?.secure_url || null,
            duration: parseInt(duration) || null,
            fileSize: result.bytes,
            shareToken,
            isPublic: true
        },
        include: {
            user: {
                select: { firstName: true, lastName: true }
            }
        }
    });

    res.status(201).json({
        success: true,
        data: {
            ...recording,
            shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3002'}/recordings/watch/${shareToken}`
        },
        message: 'Recording uploaded successfully'
    });
}));

/**
 * @route   GET /api/recordings
 * @desc    Get user's recordings list
 * @access  Authenticated
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const schoolId = req.user.schoolId;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [recordings, total] = await Promise.all([
        prisma.whiteboardRecording.findMany({
            where: { userId, schoolId },
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit),
            include: {
                user: {
                    select: { firstName: true, lastName: true }
                }
            }
        }),
        prisma.whiteboardRecording.count({ where: { userId, schoolId } })
    ]);

    // Add share URLs
    const recordingsWithUrls = recordings.map(r => ({
        ...r,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3002'}/recordings/watch/${r.shareToken}`
    }));

    res.json({
        success: true,
        data: recordingsWithUrls,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
        }
    });
}));

/**
 * @route   GET /api/recordings/:id
 * @desc    Get single recording details
 * @access  Owner or Admin
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const schoolId = req.user.schoolId;
    const isAdmin = ['admin', 'principal'].includes(req.user.role);

    const recording = await prisma.whiteboardRecording.findFirst({
        where: {
            id,
            schoolId,
            ...(isAdmin ? {} : { userId }) // Admins can see all within their school
        },
        include: {
            user: {
                select: { firstName: true, lastName: true, email: true }
            }
        }
    });

    if (!recording) {
        return res.status(404).json({ success: false, error: 'Recording not found' });
    }

    res.json({
        success: true,
        data: {
            ...recording,
            shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3002'}/recordings/watch/${recording.shareToken}`
        }
    });
}));

/**
 * @route   GET /api/recordings/share/:token
 * @desc    Get recording by share token (public access)
 * @access  Public
 */
router.get('/share/:token', asyncHandler(async (req, res) => {
    const { token } = req.params;

    const recording = await prisma.whiteboardRecording.findUnique({
        where: { shareToken: token },
        include: {
            user: {
                select: { firstName: true, lastName: true }
            },
            school: {
                select: { name: true }
            }
        }
    });

    if (!recording) {
        return res.status(404).json({ success: false, error: 'Recording not found or link expired' });
    }

    if (!recording.isPublic) {
        return res.status(403).json({ success: false, error: 'This recording is private' });
    }

    res.json({
        success: true,
        data: recording
    });
}));

/**
 * @route   DELETE /api/recordings/:id
 * @desc    Delete a recording
 * @access  Owner or Admin
 */
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const schoolId = req.user.schoolId;
    const isAdmin = ['admin', 'principal'].includes(req.user.role);

    const recording = await prisma.whiteboardRecording.findFirst({
        where: {
            id,
            schoolId,
            ...(isAdmin ? {} : { userId })
        }
    });

    if (!recording) {
        return res.status(404).json({ success: false, error: 'Recording not found' });
    }

    // Delete from Cloudinary
    try {
        await require('cloudinary').v2.uploader.destroy(recording.cloudinaryId, { resource_type: 'video' });
    } catch (e) {
        console.error('Failed to delete from Cloudinary:', e.message);
    }

    // Delete from database
    await prisma.whiteboardRecording.delete({ where: { id } });

    res.json({ success: true, message: 'Recording deleted successfully' });
}));

/**
 * @route   PATCH /api/recordings/:id
 * @desc    Update recording metadata (title, description, isPublic)
 * @access  Owner
 */
router.patch('/:id', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, isPublic } = req.body;
    const userId = req.user.id;

    const recording = await prisma.whiteboardRecording.findFirst({
        where: { id, userId }
    });

    if (!recording) {
        return res.status(404).json({ success: false, error: 'Recording not found' });
    }

    const updated = await prisma.whiteboardRecording.update({
        where: { id },
        data: {
            ...(title !== undefined && { title }),
            ...(description !== undefined && { description }),
            ...(isPublic !== undefined && { isPublic })
        }
    });

    res.json({ success: true, data: updated });
}));

module.exports = router;
