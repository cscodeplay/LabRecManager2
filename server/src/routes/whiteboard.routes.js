const express = require('express');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const multer = require('multer');
const cloudinary = require('../services/cloudinary');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

const router = express.Router();

/**
 * @route   GET /api/whiteboard/personal
 * @desc    Get the personal standalone whiteboard data for an admin/instructor
 * @access  Admin/Instructor
 */
router.get('/personal', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const schoolId = req.user.schoolId;

    // Find a session representing their personal workspace (shared across school admins)
    const session = await prisma.whiteboardSession.findFirst({
        where: { schoolId, title: 'Personal Workspace' },
        orderBy: { createdAt: 'desc' }
    });

    if (!session) {
        return res.json({ success: true, data: { canvasData: null } });
    }

    res.json({ success: true, data: { canvasData: session.canvasData } });
}));

/**
 * @route   PUT /api/whiteboard/personal
 * @desc    Save the personal standalone whiteboard data
 * @access  Admin/Instructor
 */
router.put('/personal', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const schoolId = req.user.schoolId;
    const { canvasData } = req.body;

    const session = await prisma.whiteboardSession.findFirst({
        where: { schoolId, title: 'Personal Workspace' },
        orderBy: { createdAt: 'desc' }
    });

    if (session) {
        await prisma.whiteboardSession.update({
            where: { id: session.id },
            data: { canvasData }
        });
    } else {
        await prisma.whiteboardSession.create({
            data: {
                hostId: userId,
                schoolId,
                title: 'Personal Workspace',
                canvasData,
                status: 'active'
            }
        });
    }

    res.json({ success: true, message: 'Saved successfully' });
}));

// ====== WHITEBOARD FILE MANAGEMENT ======

/**
 * @route   GET /api/whiteboard/files
 * @desc    Get all whiteboard files for the current user
 * @access  Admin/Instructor
 */
router.get('/files', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const files = await prisma.whiteboardFile.findMany({
        where: { ownerId: userId, isArchived: false },
        orderBy: { lastOpenedAt: 'desc' },
        select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            pageCount: true,
            lastOpenedAt: true,
            createdAt: true,
            updatedAt: true
        }
    });
    res.json({ success: true, data: files });
}));

/**
 * @route   POST /api/whiteboard/files
 * @desc    Create a new whiteboard file
 * @access  Admin/Instructor
 */
router.post('/files', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const file = await prisma.whiteboardFile.create({
        data: {
            schoolId: req.user.schoolId,
            ownerId: req.user.id,
            title: title || 'Untitled Whiteboard',
            description,
            pageCount: 1
        }
    });
    res.status(201).json({ success: true, data: file });
}));

/**
 * @route   GET /api/whiteboard/files/:id
 * @desc    Get full data for a single whiteboard file
 * @access  Admin/Instructor
 */
router.get('/files/:id', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const file = await prisma.whiteboardFile.findUnique({
        where: { id: req.params.id }
    });
    
    if (!file || file.ownerId !== req.user.id) {
        return res.status(404).json({ success: false, message: 'Whiteboard not found' });
    }
    
    // Update last opened
    await prisma.whiteboardFile.update({
        where: { id: file.id },
        data: { lastOpenedAt: new Date() }
    });
    
    res.json({ success: true, data: file });
}));

/**
 * @route   PUT /api/whiteboard/files/:id
 * @desc    Update whiteboard metadata
 * @access  Admin/Instructor
 */
router.put('/files/:id', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { title, description, isArchived } = req.body;
    
    const file = await prisma.whiteboardFile.findUnique({
        where: { id: req.params.id }
    });
    
    if (!file || file.ownerId !== req.user.id) {
        return res.status(404).json({ success: false, message: 'Whiteboard not found' });
    }
    
    const updated = await prisma.whiteboardFile.update({
        where: { id: file.id },
        data: { title, description, isArchived }
    });
    
    res.json({ success: true, data: updated });
}));

/**
 * @route   PUT /api/whiteboard/files/:id/save
 * @desc    Save canvas data and update thumbnail
 * @access  Admin/Instructor
 */
router.put('/files/:id/save', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { canvasData, thumbnailUrl, pageCount } = req.body;
    
    const file = await prisma.whiteboardFile.findUnique({
        where: { id: req.params.id }
    });
    
    if (!file || file.ownerId !== req.user.id) {
        return res.status(404).json({ success: false, message: 'Whiteboard not found' });
    }
    
    const updated = await prisma.whiteboardFile.update({
        where: { id: file.id },
        data: { canvasData, thumbnailUrl, pageCount }
    });
    
    res.json({ success: true, message: 'Saved successfully' });
}));

/**
 * @route   DELETE /api/whiteboard/files/:id
 * @desc    Delete a whiteboard file
 * @access  Admin/Instructor
 */
router.delete('/files/:id', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const file = await prisma.whiteboardFile.findUnique({
        where: { id: req.params.id }
    });
    
    if (!file || file.ownerId !== req.user.id) {
        return res.status(404).json({ success: false, message: 'Whiteboard not found' });
    }
    
    await prisma.whiteboardFile.delete({
        where: { id: file.id }
    });
    
    res.json({ success: true, message: 'Deleted successfully' });
}));

/**
 * @route   POST /api/whiteboard/files/:id/duplicate
 * @desc    Duplicate a whiteboard file
 * @access  Admin/Instructor
 */
router.post('/files/:id/duplicate', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const file = await prisma.whiteboardFile.findUnique({
        where: { id: req.params.id }
    });
    
    if (!file || file.ownerId !== req.user.id) {
        return res.status(404).json({ success: false, message: 'Whiteboard not found' });
    }
    
    const duplicate = await prisma.whiteboardFile.create({
        data: {
            schoolId: file.schoolId,
            ownerId: file.ownerId,
            title: `${file.title} (Copy)`,
            description: file.description,
            canvasData: file.canvasData,
            thumbnailUrl: file.thumbnailUrl,
            pageCount: file.pageCount
        }
    });
    
    res.status(201).json({ success: true, data: duplicate });
}));

/**
 * @route   POST /api/whiteboard/migrate-personal
 * @desc    Migrate legacy personal workspace to whiteboard file
 * @access  Admin/Instructor
 */
router.post('/migrate-personal', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const schoolId = req.user.schoolId;

    const session = await prisma.whiteboardSession.findFirst({
        where: { schoolId, title: 'Personal Workspace', hostId: userId },
        orderBy: { createdAt: 'desc' }
    });

    if (!session || !session.canvasData) {
        return res.json({ success: true, message: 'Nothing to migrate' });
    }

    const existingFile = await prisma.whiteboardFile.findFirst({
        where: { ownerId: userId, title: 'Personal Workspace (Legacy)' }
    });

    if (!existingFile) {
        await prisma.whiteboardFile.create({
            data: {
                schoolId,
                ownerId: userId,
                title: 'Personal Workspace (Legacy)',
                description: 'Migrated from legacy workspace',
                canvasData: session.canvasData
            }
        });
    }

    res.json({ success: true, message: 'Migrated successfully' });
}));

/**
 * @route   GET /api/whiteboard/sessions
 * @desc    Get all active whiteboard sessions (admin only)
 * @access  Admin/Principal
 */
router.get('/sessions', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { status = 'active' } = req.query;
    const schoolId = req.user.schoolId;

    const sessions = await prisma.whiteboardSession.findMany({
        where: {
            schoolId,
            status: status === 'all' ? undefined : status
        },
        include: {
            host: {
                select: { id: true, firstName: true, lastName: true, role: true }
            },
            targetClass: {
                select: { id: true, name: true, gradeLevel: true, section: true }
            },
            targetGroup: {
                select: { id: true, name: true }
            },
            participants: {
                where: { isActive: true },
                select: { id: true, role: true, user: { select: { id: true, firstName: true, lastName: true } } }
            },
            _count: { select: { participants: true } }
        },
        orderBy: { startedAt: 'desc' }
    });

    res.json({
        success: true,
        data: {
            sessions: sessions.map(s => ({
                ...s,
                participantCount: s._count.participants,
                duration: s.startedAt ? Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000) : 0
            }))
        }
    });
}));

/**
 * @route   POST /api/whiteboard/screenshot
 * @desc    Upload a screenshot and save it to the Documents page under a Screenshot folder
 * @access  Admin/Instructor
 */
router.post('/screenshot', authenticate, upload.single('file'), asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const schoolId = req.user.schoolId;

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No screenshot file uploaded.' });
    }

    try {
        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
            const uploadStream = require('cloudinary').v2.uploader.upload_stream(
                { folder: `labrec/${schoolId}/screenshots`, resource_type: 'image' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        // Find or create 'Screenshots' folder
        let folder = await prisma.documentFolder.findFirst({
            where: { schoolId, name: 'Screenshots', deletedAt: null }
        });

        if (!folder) {
            folder = await prisma.documentFolder.create({
                data: {
                    name: 'Screenshots',
                    schoolId,
                    createdById: userId
                }
            });
        }

        // Save Document record
        const doc = await prisma.document.create({
            data: {
                schoolId,
                uploadedById: userId,
                folderId: folder.id,
                name: `Screenshot - ${new Date().toLocaleString()}`,
                description: 'Whiteboard screenshot',
                fileName: req.file.originalname || 'screenshot.png',
                fileType: 'png',
                mimeType: req.file.mimetype,
                fileSize: req.file.size,
                cloudinaryId: result.public_id,
                url: result.secure_url,
                category: 'Screenshot',
                isPublic: false
            }
        });

        res.status(201).json({ success: true, data: doc });
    } catch (error) {
        console.error('Screenshot upload error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload screenshot' });
    }
}));

/**
 * @route   GET /api/whiteboard/sessions/:id
 * @desc    Get session details with all participants
 * @access  Admin/Principal
 */
router.get('/sessions/:id', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const session = await prisma.whiteboardSession.findFirst({
        where: { id, schoolId },
        include: {
            host: {
                select: { id: true, firstName: true, lastName: true, email: true, role: true }
            },
            targetClass: {
                select: { id: true, name: true, gradeLevel: true, section: true }
            },
            targetGroup: {
                select: { id: true, name: true }
            },
            participants: {
                include: {
                    user: {
                        select: { id: true, firstName: true, lastName: true, role: true }
                    }
                },
                orderBy: { joinedAt: 'asc' }
            }
        }
    });

    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({ success: true, data: session });
}));

/**
 * @route   POST /api/whiteboard/sessions
 * @desc    Create a new whiteboard session (when instructor starts sharing)
 * @access  Instructor/Admin
 */
router.post('/sessions', authenticate, authorize('instructor', 'admin', 'lab_assistant'), asyncHandler(async (req, res) => {
    const { title, targetType, targetClassId, targetGroupId, scheduledAt, durationMinutes } = req.body;
    const hostId = req.user.id;
    const schoolId = req.user.schoolId;

    const session = await prisma.whiteboardSession.create({
        data: {
            schoolId,
            hostId,
            title: title || 'Whiteboard Session',
            targetType,
            targetClassId,
            targetGroupId,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
            status: scheduledAt ? 'scheduled' : 'active'
        },
        include: {
            host: { select: { id: true, firstName: true, lastName: true } }
        }
    });

    // Add host as participant
    await prisma.whiteboardParticipant.create({
        data: {
            sessionId: session.id,
            userId: hostId,
            role: 'host'
        }
    });

    res.status(201).json({ success: true, data: session });
}));

/**
 * @route   PUT /api/whiteboard/sessions/:id/end
 * @desc    End a whiteboard session
 * @access  Admin/Principal or Host
 */
router.put('/sessions/:id/end', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const schoolId = req.user.schoolId;

    const session = await prisma.whiteboardSession.findFirst({
        where: { id, schoolId }
    });

    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Only host or admin/principal can end
    if (session.hostId !== userId && !['admin', 'principal'].includes(userRole)) {
        return res.status(403).json({ success: false, message: 'Not authorized to end this session' });
    }

    const updatedSession = await prisma.whiteboardSession.update({
        where: { id },
        data: {
            status: 'ended',
            endedAt: new Date()
        }
    });

    // Mark all participants as inactive
    await prisma.whiteboardParticipant.updateMany({
        where: { sessionId: id, isActive: true },
        data: { isActive: false, leftAt: new Date() }
    });

    res.json({ success: true, data: updatedSession, message: 'Session ended successfully' });
}));

/**
 * @route   PUT /api/whiteboard/sessions/:id/record
 * @desc    Toggle recording for a session
 * @access  Admin/Principal or Host
 */
router.put('/sessions/:id/record', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isRecording } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const schoolId = req.user.schoolId;

    const session = await prisma.whiteboardSession.findFirst({
        where: { id, schoolId }
    });

    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (session.hostId !== userId && !['admin', 'principal'].includes(userRole)) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updatedSession = await prisma.whiteboardSession.update({
        where: { id },
        data: { isRecording: isRecording ?? !session.isRecording }
    });

    res.json({ success: true, data: updatedSession });
}));

/**
 * @route   POST /api/whiteboard/sessions/:id/join
 * @desc    Join a whiteboard session as participant
 * @access  Authenticated
 */
router.post('/sessions/:id/join', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const session = await prisma.whiteboardSession.findUnique({ where: { id } });
    if (!session || session.status !== 'active') {
        return res.status(404).json({ success: false, message: 'Session not found or not active' });
    }

    // Upsert participant
    const participant = await prisma.whiteboardParticipant.upsert({
        where: { sessionId_userId: { sessionId: id, userId: userId } },
        update: { isActive: true, leftAt: null },
        create: {
            sessionId: id,
            userId,
            role: ['admin', 'principal'].includes(userRole) ? 'cohost' : 'viewer'
        }
    });

    res.json({ success: true, data: participant });
}));

/**
 * @route   POST /api/whiteboard/sessions/:id/leave
 * @desc    Leave a whiteboard session
 * @access  Authenticated
 */
router.post('/sessions/:id/leave', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    await prisma.whiteboardParticipant.updateMany({
        where: { sessionId: id, userId, isActive: true },
        data: { isActive: false, leftAt: new Date() }
    });

    res.json({ success: true, message: 'Left session' });
}));

/**
 * @route   POST /api/whiteboard/sessions/:id/message
 * @desc    Send message to session participants (admin broadcast)
 * @access  Admin/Principal
 */
router.post('/sessions/:id/message', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // This would emit via socket - for now just return success
    // The socket handler will pick this up
    res.json({
        success: true,
        data: { sessionId: id, message, sentAt: new Date() },
        message: 'Message will be broadcast to participants'
    });
}));

/**
 * @route   POST /api/whiteboard/recordings
 * @desc    Save a whiteboard recording
 * @access  Admin/Instructor
 */
router.post('/recordings', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { title, description, sessionId, cloudinaryId, cloudinaryUrl, thumbnailUrl, duration, fileSize, isPublic } = req.body;
    
    if (!cloudinaryId || !cloudinaryUrl) {
        return res.status(400).json({ success: false, message: 'Cloudinary details are required' });
    }
    
    const recording = await prisma.whiteboardRecording.create({
        data: {
            userId: req.user.id,
            schoolId: req.user.schoolId,
            title: title || 'Whiteboard Recording',
            description,
            sessionId,
            cloudinaryId,
            cloudinaryUrl,
            thumbnailUrl,
            duration,
            fileSize,
            isPublic: isPublic !== undefined ? isPublic : true,
            // Generate a random 16 char token for sharing
            shareToken: Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10)
        }
    });

    res.status(201).json({
        success: true,
        data: recording,
        message: 'Recording saved successfully'
    });
}));

module.exports = router;
