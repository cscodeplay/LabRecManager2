const express = require('express');
const crypto = require('crypto');
const prisma = require('../config/database');
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
 * @access  Instructor/Admin/Student
 */
router.post('/upload', authenticate, authorize('instructor', 'admin', 'lab_assistant', 'principal', 'student'), upload.single('video'), asyncHandler(async (req, res) => {
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

    // Check storage quota before upload
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { storageQuotaMb: true, storageUsedBytes: true }
    });

    const quotaBytes = (user.storageQuotaMb || 500) * 1024 * 1024;
    const currentUsed = Number(user.storageUsedBytes || 0);
    const newFileSize = req.file.size;

    if (currentUsed + newFileSize > quotaBytes) {
        const quotaMb = Math.round(quotaBytes / (1024 * 1024));
        const usedMb = Math.round(currentUsed / (1024 * 1024));
        const reqMb = (newFileSize / (1024 * 1024)).toFixed(2);
        return res.status(400).json({
            success: false,
            message: `Storage quota exceeded. You have ${usedMb} MB used of ${quotaMb} MB. File size: ${reqMb} MB.`
        });
    }

    // Upload to Cloudinary using upload_stream for memory buffer
    let result;
    try {
        result = await new Promise((resolve, reject) => {
            const uploadStream = require('cloudinary').v2.uploader.upload_stream(
                {
                    resource_type: 'video',
                    folder: 'ulrms/whiteboard_recordings',
                    public_id: `wb_rec_${userId}_${Date.now()}`,
                    eager: [
                        { width: 320, height: 180, crop: 'fill', format: 'jpg' },
                        { format: 'mp4' }
                    ],
                    eager_async: true
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            
            const { Readable } = require('stream');
            const stream = Readable.from(req.file.buffer);
            stream.pipe(uploadStream);
        });
    } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ success: false, message: 'Failed to upload video to Cloudinary', error: uploadError.message });
    }

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
            cloudinaryUrl: result.secure_url.replace(/\.webm$/i, '.mp4'),
            thumbnailUrl: result.eager?.[0]?.secure_url || null,
            duration: Math.round(result.duration) || parseInt(duration) || 0,
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

    // Update user's storage used
    await prisma.user.update({
        where: { id: userId },
        data: { storageUsedBytes: currentUsed + newFileSize }
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
    const isAdmin = ['admin', 'principal'].includes(req.user.role);

    let whereClause = { schoolId };

    if (!isAdmin) {
        if (req.user.role === 'student') {
            const enrollments = await prisma.classEnrollment.findMany({
                where: { studentId: userId, status: 'active' },
                select: { classId: true }
            });
            const classIds = enrollments.map(e => e.classId);

            const groupMembers = await prisma.groupMember.findMany({
                where: { studentId: userId },
                select: { groupId: true }
            });
            const groupIds = groupMembers.map(g => g.groupId);

            const orConditions = [
                { userId } // Own recordings
            ];
            
            if (classIds.length > 0) {
                orConditions.push({ shares: { some: { targetClassId: { in: classIds } } } });
            }
            if (groupIds.length > 0) {
                orConditions.push({ shares: { some: { targetGroupId: { in: groupIds } } } });
            }
            orConditions.push({ shares: { some: { targetUserId: userId } } });
            
            whereClause.OR = orConditions;
        } else {
            whereClause.userId = userId; // Instructors typically see their own, unless we allow sharing to instructors
            // Let's also include shares specifically to them just in case
            whereClause.OR = [
                { userId },
                { shares: { some: { targetUserId: userId } } }
            ];
        }
    }

    const [recordings, total] = await Promise.all([
        prisma.whiteboardRecording.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            skip,
            take: parseInt(limit),
            include: {
                user: {
                    select: { firstName: true, lastName: true }
                },
                shares: {
                    include: {
                        targetClass: { select: { name: true, section: true } },
                        targetGroup: { select: { name: true } },
                        targetUser: { select: { firstName: true, lastName: true } }
                    }
                }
            }
        }),
        prisma.whiteboardRecording.count({ where: whereClause })
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

    // Decrement storage used for the recording owner
    const owner = await prisma.user.findUnique({
        where: { id: recording.userId },
        select: { storageUsedBytes: true }
    });
    if (owner) {
        const newUsed = Math.max(0, Number(owner.storageUsedBytes || 0) - recording.fileSize);
        await prisma.user.update({
            where: { id: recording.userId },
            data: { storageUsedBytes: newUsed }
        });
    }

    // Delete from database
    await prisma.whiteboardRecording.delete({
        where: { id }
    });

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

/**
 * @route   POST /api/recordings/:id/share
 * @desc    Share a recording with targets
 * @access  Owner or Admin
 */
router.post('/:id/share', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { targets } = req.body; // Array of { type: 'class'|'group'|'student', id: string }
    const userId = req.user.id;
    const isAdmin = ['admin', 'principal'].includes(req.user.role);

    if (!targets || !Array.isArray(targets) || targets.length === 0) {
        return res.status(400).json({ success: false, error: 'Valid targets array is required' });
    }

    const recording = await prisma.whiteboardRecording.findFirst({
        where: {
            id,
            ...(isAdmin ? {} : { userId })
        }
    });

    if (!recording) {
        return res.status(404).json({ success: false, error: 'Recording not found' });
    }

    const shares = [];
    const notifications = [];

    for (const target of targets) {
        const shareData = {
            recordingId: id,
            sharedById: userId,
            targetType: target.type
        };

        if (target.type === 'class') {
            shareData.targetClassId = target.id;
        } else if (target.type === 'group') {
            shareData.targetGroupId = target.id;
        } else if (target.type === 'student') {
            shareData.targetUserId = target.id;

            notifications.push({
                userId: target.id,
                title: 'Recording Shared with You',
                message: `"${recording.title}" has been shared with you by ${req.user.firstName} ${req.user.lastName}.`
            });
        }

        shares.push(shareData);
    }

    const createdShares = await prisma.whiteboardRecordingShare.createMany({
        data: shares
    });

    if (notifications.length > 0) {
        await prisma.notification.createMany({
            data: notifications
        });
    }

    res.status(201).json({
        success: true,
        message: `Recording shared with ${targets.length} target(s)`,
        data: { sharesCreated: createdShares.count }
    });
}));

/**
 * @route   DELETE /api/recordings/:id/share/:shareId
 * @desc    Remove a recording share
 * @access  Owner or Admin
 */
router.delete('/:id/share/:shareId', authenticate, asyncHandler(async (req, res) => {
    const { id, shareId } = req.params;
    const userId = req.user.id;
    const isAdmin = ['admin', 'principal'].includes(req.user.role);

    const recording = await prisma.whiteboardRecording.findFirst({
        where: {
            id,
            ...(isAdmin ? {} : { userId })
        }
    });

    if (!recording) {
        return res.status(404).json({ success: false, error: 'Recording not found' });
    }

    await prisma.whiteboardRecordingShare.delete({
        where: { id: shareId }
    });

    res.json({ success: true, message: 'Share removed successfully' });
}));

module.exports = router;
