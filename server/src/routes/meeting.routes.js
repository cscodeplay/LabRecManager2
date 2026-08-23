const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const notificationService = require('../services/notificationService');

const recordingsDir = path.join(__dirname, '../../uploads/recordings');
if (!fs.existsSync(recordingsDir)) {
    fs.mkdirSync(recordingsDir, { recursive: true });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(str) {
    return typeof str === 'string' && UUID_REGEX.test(str.trim());
}

function generate10DigitRoomCode() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

function generate8CharPasscode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function formatRoomCode(code) {
    if (!code) return '';
    const str = code.toString().replace(/[^0-9]/g, '');
    if (str.length === 10) {
        return `${str.slice(0, 3)}-${str.slice(3, 6)}-${str.slice(6)}`;
    }
    return code;
}

async function findMeetingByIdOrLink(idParam, options = {}) {
    if (!idParam) return null;
    const strParam = idParam.toString().trim();
    const cleanDigits = strParam.replace(/[^0-9]/g, '');

    const orList = [];
    if (isUUID(strParam)) {
        orList.push({ id: strParam });
    }
    orList.push({ meetingLink: { contains: strParam } });
    if (cleanDigits && cleanDigits.length >= 6) {
        orList.push({ meetingLink: { contains: cleanDigits } });
    }

    let queryOptions = {};
    if (options.include) {
        queryOptions.include = options.include;
    } else if (options.select) {
        queryOptions.select = options.select;
    } else if (Object.keys(options).length > 0) {
        queryOptions.include = options;
    }

    let meeting = await prisma.meeting.findFirst({
        where: { OR: orList },
        ...queryOptions
    });

    // Fallback: search recent meetings for roomCode in questionsAsked JSON
    if (!meeting && cleanDigits && cleanDigits.length >= 6) {
        try {
            const potentialMatches = await prisma.meeting.findMany({
                where: {
                    questionsAsked: { not: null }
                },
                take: 50,
                orderBy: { createdAt: 'desc' },
                ...queryOptions
            });
            meeting = potentialMatches.find(m => {
                const q = typeof m.questionsAsked === 'object' ? m.questionsAsked : {};
                return q?.roomCode?.toString() === cleanDigits || q?.roomCode?.toString() === strParam;
            }) || null;
        } catch (e) {
            // Ignore JSON query error
        }
    }

    return meeting;
}

/**
 * @route   DELETE /api/meetings/clear-all
 * @desc    Delete all meetings and associated recording files
 * @access  Private (Instructor, Admin, Principal)
 */
router.delete('/clear-all', authenticate, authorize('instructor', 'admin', 'principal'), asyncHandler(async (req, res) => {
    try {
        await prisma.meetingParticipant.deleteMany();
    } catch (e) {
        console.warn('MeetingParticipant deleteMany error (non-fatal):', e.message);
    }
    
    try {
        await prisma.submission.updateMany({
            where: { status: 'viva_scheduled' },
            data: { status: 'submitted' }
        });
    } catch (e) {
        console.warn('Submission reset error (non-fatal):', e.message);
    }

    const deleted = await prisma.meeting.deleteMany();

    // Clean physical recording files
    try {
        if (fs.existsSync(recordingsDir)) {
            const files = fs.readdirSync(recordingsDir);
            for (const f of files) {
                if (f !== '.gitkeep') {
                    try { fs.unlinkSync(path.join(recordingsDir, f)); } catch (err) {}
                }
            }
        }
    } catch (fsErr) {
        console.error('Error removing recording files:', fsErr);
    }

    res.json({
        success: true,
        message: `Successfully deleted ${deleted.count} meeting sessions and all recording files.`
    });
}));

/**
 * @route   POST /api/meetings/create-demotest
 * @desc    Create a demo verification meeting session with 10-digit room code & 8-char passcode
 * @access  Private (Instructor, Admin, Principal)
 */
router.post('/create-demotest', authenticate, authorize('instructor', 'admin', 'principal'), asyncHandler(async (req, res) => {
    let student = await prisma.user.findFirst({
        where: { role: 'student', schoolId: req.user.schoolId }
    });

    if (!student) {
        student = await prisma.user.findFirst({
            where: { role: 'student' }
        });
    }

    const sessionId = require('uuid').v4();
    const roomCode = generate10DigitRoomCode();
    const passcode = generate8CharPasscode();
    const meetingLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/meeting/${roomCode}`;

    const session = await prisma.meeting.create({
        data: {
            id: sessionId,
            schoolId: req.user.schoolId || student?.schoolId,
            title: 'Demo Test Verification Meeting',
            type: 'scheduled',
            hostId: req.user.id,
            targetStudentId: student ? student.id : null,
            scheduledAt: new Date(),
            durationMinutes: 15,
            meetingLink,
            status: 'scheduled',
            autoStart: true,
            questionsAsked: {
                roomCode,
                passcode,
                formattedRoomCode: formatRoomCode(roomCode),
                autoAdmit: false,
                sessionTitle: 'Demo Test Verification Meeting'
            }
        },
        include: {
            targetStudent: { select: { id: true, firstName: true, lastName: true, email: true, admissionNumber: true } },
            host: { select: { id: true, firstName: true, lastName: true } }
        }
    });

    res.status(201).json({
        success: true,
        message: 'Demo test meeting created successfully',
        data: { session }
    });
}));

/**
 * @route   GET /api/viva/sessions
 * @desc    Get viva sessions
 * @access  Private
 */
router.get('/sessions', authenticate, asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, submissionId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sessionId = req.headers['x-academic-session'];

    let where = {};

    let classIds = [];
    if (req.user.role === 'student') {
        const enrollments = await prisma.classEnrollment.findMany({
            where: { studentId: req.user.id, status: 'active' },
            select: { classId: true }
        });
        classIds = enrollments.map(e => e.classId);
        
        where = {
            OR: [
                { targetStudentId: req.user.id },
                { targetClassId: { in: classIds } },
                { targetClassId: null, targetStudentId: null },
                { hostId: req.user.id }
            ]
        };
    } else if (req.user.role === 'instructor' || req.user.role === 'lab_assistant') {
        where = {
            OR: [
                { hostId: req.user.id },
                { schoolId: req.user.schoolId }
            ]
        };
    } else if (req.user.role === 'admin' || req.user.role === 'principal') {
        if (req.user.schoolId) {
            where.schoolId = req.user.schoolId;
        }
    }

    if (status) {
        where.status = status;
    }

    if (submissionId) {
        where.submissionId = submissionId;
    }

    // Filter by academic session through submission -> assignment or standalone
    if (sessionId) {
        where.AND = [
            {
                OR: [
                    { submission: { assignment: { academicYearId: sessionId } } },
                    { submissionId: null }
                ]
            }
        ];
    }

    // On-the-fly lifecycle check: auto-complete active sessions whose duration has elapsed
    const now = new Date();
    try {
        const activeSessions = await prisma.meeting.findMany({
            where: { status: 'in_progress' }
        });
        for (const s of activeSessions) {
            const start = new Date(s.actualStartTime || s.scheduledAt || s.createdAt);
            const duration = s.durationMinutes || 15;
            const end = new Date(start.getTime() + duration * 60 * 1000);
            if (now >= end) {
                await prisma.meeting.update({
                    where: { id: s.id },
                    data: {
                        status: 'completed',
                        actualEndTime: now,
                        examinerRemarks: s.examinerRemarks || 'Meeting duration completed'
                    }
                }).catch(() => {});
            }
        }
    } catch (e) {
        // Non-fatal
    }

    const [sessions, total] = await Promise.all([

        prisma.meeting.findMany({
            where,
            skip,
            take: parseInt(limit),
            orderBy: { scheduledAt: 'desc' },
            include: {
                submission: {
                    include: {
                        assignment: {
                            select: { id: true, title: true, titleHindi: true }
                        }
                    }
                },
                targetStudent: {
                    select: { id: true, firstName: true, lastName: true, admissionNumber: true, email: true }
                },
                targetClass: {
                    select: { id: true, name: true, section: true }
                },
                targetGroup: {
                    select: { id: true, name: true }
                },
                host: {
                    select: { id: true, firstName: true, lastName: true }
                }
            }
        }),
        prisma.meeting.count({ where })
    ]);

    res.json({
        success: true,
        data: {
            sessions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        }
    });
}));

/**
 * @route   GET /api/viva/sessions/check-auto-start
 * @desc    Check and auto-start sessions that are scheduled to start now
 * @access  Private (Admin/System)
 */
router.get('/sessions/check-auto-start', authenticate, asyncHandler(async (req, res) => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);

    // Find sessions that should be auto-started
    const sessionsToStart = await prisma.meeting.findMany({
        where: {
            status: 'scheduled',
            autoStart: true,
            scheduledAt: {
                gte: fiveMinutesAgo,
                lte: fiveMinutesLater
            }
        },
        include: {
            targetStudent: { select: { id: true, firstName: true, lastName: true } },
            host: { select: { id: true, firstName: true, lastName: true } }
        }
    });

    const startedSessions = [];
    for (const session of sessionsToStart) {
        await prisma.meeting.update({
            where: { id: session.id },
            data: {
                status: 'in_progress',
                actualStartTime: now
            }
        });

        // Auto-admit participants if enabled
        if (session.autoAdmit) {
            await prisma.meetingParticipant.updateMany({
                where: { sessionId: session.id },
                data: { status: 'admitted', admittedAt: now }
            });
        }

        startedSessions.push(session);
    }

    res.json({
        success: true,
        message: `Auto-started ${startedSessions.length} session(s)`,
        data: { startedSessions }
    });
}));

/**
 * @route   GET /api/viva/sessions/cleanup-expired
 * @desc    Auto-cancel sessions that are way past their duration (e.g., 1 hour after scheduled end)
 * @access  Private (Admin)
 */
router.get('/sessions/cleanup-expired', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const now = new Date();

    // Find scheduled sessions that are more than 1 hour past their end time
    const allScheduledSessions = await prisma.meeting.findMany({
        where: {
            status: 'scheduled'
        }
    });

    const expiredSessions = allScheduledSessions.filter(session => {
        if (!session.scheduledAt) return false;
        const startTime = new Date(session.scheduledAt);
        const endTime = new Date(startTime.getTime() + (session.durationMinutes || 15) * 60 * 1000);
        const graceEndTime = new Date(endTime.getTime() + 60 * 60 * 1000); // 1 hour grace
        return now > graceEndTime;
    });

    const cancelledIds = [];
    for (const session of expiredSessions) {
        await prisma.meeting.update({
            where: { id: session.id },
            data: {
                status: 'cancelled',
                examinerRemarks: 'Auto-cancelled - session time slot expired without being conducted'
            }
        });
        cancelledIds.push(session.id);
    }

    res.json({
        success: true,
        message: `Cleaned up ${cancelledIds.length} expired session(s)`,
        data: { cancelledCount: cancelledIds.length, cancelledIds }
    });
}));

/**
 * @route   GET /api/viva/sessions/:id
 * @desc    Get single viva session
 * @access  Private
 */
router.get('/sessions/:id', authenticate, asyncHandler(async (req, res) => {
    let session = await findMeetingByIdOrLink(req.params.id, {
        include: {
            submission: {
                include: {
                    assignment: true,
                    files: true
                }
            },
            targetStudent: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    firstNameHindi: true,
                    lastNameHindi: true,
                    admissionNumber: true,
                    profileImageUrl: true,
                    email: true
                }
            },
            targetClass: {
                include: {
                    enrollments: {
                        where: { status: 'active' },
                        include: {
                            student: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    admissionNumber: true,
                                    email: true
                                }
                            }
                        }
                    }
                }
            },
            targetGroup: {
                include: {
                    members: {
                        include: {
                            student: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    admissionNumber: true
                                }
                            }
                        }
                    }
                }
            },
            host: {
                select: { id: true, firstName: true, lastName: true, role: true }
            }
        }
    });

    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Meeting session not found'
        });
    }

    // Check permissions
    const isHost = session.hostId === req.user.id;
    const isTargetStudent = session.targetStudentId === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'principal' || req.user.role === 'instructor';
    
    let isAuthorized = isHost || isTargetStudent || isAdmin;

    if (!isAuthorized && session.targetClassId) {
        const isEnrolled = await prisma.classEnrollment.findFirst({
            where: { classId: session.targetClassId, studentId: req.user.id, status: 'active' }
        });
        if (isEnrolled) isAuthorized = true;
    }

    if (!isAuthorized && session.targetGroupId) {
        const isGroupMember = await prisma.studentGroupMember.findFirst({
            where: { groupId: session.targetGroupId, studentId: req.user.id }
        }).catch(() => null);
        if (isGroupMember) isAuthorized = true;
    }

    // Check if participant record exists or open meeting
    if (!isAuthorized) {
        const existingParticipant = await prisma.meetingParticipant.findFirst({
            where: { sessionId: session.id, studentId: req.user.id }
        }).catch(() => null);
        if (existingParticipant) isAuthorized = true;
    }

    // Fallback: If not explicitly restricted or open room link, grant access to authenticated user in same school
    if (!isAuthorized && (!session.targetStudentId || session.schoolId === req.user.schoolId)) {
        isAuthorized = true; // School-wide / open meeting room
    }

    res.json({
        success: true,
        data: { session }
    });
}));

/**
 * @route   POST /api/viva/sessions
 * @desc    Schedule a viva session
 * @access  Private (Instructor)
 */
router.post('/sessions', authenticate, authorize('instructor', 'lab_assistant', 'admin'), [
    body('submissionId').isUUID().withMessage('Valid submission ID required'),
    body('scheduledAt').isISO8601().withMessage('Valid scheduled date required'),
    body('durationMinutes').optional().isInt({ min: 5, max: 60 })
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const { submissionId, scheduledAt, durationMinutes, mode } = req.body;

    // Get submission
    const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: { student: true }
    });

    if (!submission) {
        return res.status(404).json({
            success: false,
            message: 'Submission not found'
        });
    }

    // Generate meeting link for online viva
    const meetingLink = mode === 'online'
        ? `${process.env.CLIENT_URL}/viva/room/${submissionId}`
        : null;

    const session = await prisma.meeting.create({
        data: {
            schoolId: req.user.schoolId,
            title: 'Viva Session',
            submissionId,
            targetStudentId: submission.studentId,
            hostId: req.user.id,
            scheduledAt: new Date(scheduledAt),
            durationMinutes: durationMinutes || 10,
            mode: mode || 'online',
            meetingLink,
            status: 'scheduled'
        },
        include: {
            targetStudent: {
                select: { id: true, firstName: true, lastName: true, email: true }
            }
        }
    });

    // Update submission status
    await prisma.submission.update({
        where: { id: submissionId },
        data: { status: 'viva_scheduled' }
    });

    // TODO: Send notification to student

    res.status(201).json({
        success: true,
        message: 'Viva session scheduled',
        messageHindi: 'वाइवा सत्र निर्धारित',
        data: { session }
    });
}));

/**
 * @route   PUT /api/viva/sessions/:id/start
 * @desc    Start a viva session
 * @access  Private (Examiner)
 */
router.put('/sessions/:id/start', authenticate, authorize('instructor', 'lab_assistant'), asyncHandler(async (req, res) => {
    const session = await findMeetingByIdOrLink(req.params.id);

    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }

    if (session.hostId !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized'
        });
    }

    const updatedSession = await prisma.meeting.update({
        where: { id: session.id },
        data: {
            status: 'in_progress',
            actualStartTime: new Date()
        }
    });

    // Emit socket event for student to join
    const io = req.app.get('io');
    io.to(`user-${session.targetStudentId}`).emit('viva-started', {
        sessionId: session.id,
        meetingLink: session.meetingLink
    });

    res.json({
        success: true,
        message: 'Viva session started',
        data: { session: updatedSession }
    });
}));

/**
 * @route   PUT /api/viva/sessions/:id/complete
 * @desc    Complete a viva session with evaluation
 * @access  Private (Examiner)
 */
router.put('/sessions/:id/complete', authenticate, authorize('instructor', 'lab_assistant', 'admin'), [], asyncHandler(async (req, res) => {
    const {
        marksObtained, maxMarks, performanceRating,
        questionsAsked, studentResponses,
        examinerRemarks, examinerRemarksHindi, improvementSuggestions
    } = req.body;

    console.log('=== Complete Session Debug ===');
    console.log('Session ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    try {
        // First, check if the session exists
        const existingSession = await findMeetingByIdOrLink(req.params.id, { submission: true });

        console.log('Existing session:', existingSession ? { id: existingSession.id, status: existingSession.status, submissionId: existingSession.submissionId } : 'NOT FOUND');

        if (!existingSession) {
            return res.status(404).json({
                success: false,
                message: 'Viva session not found'
            });
        }

        // Update the session
        console.log('Updating session with data:', {
            status: 'completed',
            actualEndTime: new Date(),
            marksObtained: parseFloat(marksObtained),
            maxMarks: parseFloat(maxMarks),
            performanceRating,
            examinerRemarks
        });

        const session = await prisma.meeting.update({
            where: { id: existingSession.id },
            data: {
                status: 'completed',
                actualEndTime: new Date(),
                marksObtained: marksObtained !== undefined ? parseFloat(marksObtained) : null,
                maxMarks: maxMarks !== undefined ? parseFloat(maxMarks) : null,
                performanceRating: performanceRating || null,
                questionsAsked: questionsAsked || null,
                studentResponses: studentResponses || null,
                examinerRemarks: examinerRemarks || null,
                examinerRemarksHindi: examinerRemarksHindi || null,
                improvementSuggestions: improvementSuggestions || null
            },
            include: { submission: true }
        });

        console.log('Session updated successfully:', session.id);

        // Update submission status if submission exists
        if (session.submissionId) {
            try {
                await prisma.submission.update({
                    where: { id: session.submissionId },
                    data: { status: 'viva_completed' }
                });
            } catch (subErr) {
                console.warn('Failed to update submission status:', subErr.message);
            }
        }

        // Emit socket events to close room and notify all clients
        const io = req.app.get('io');
        if (io) {
            io.to(`meeting-${session.id}`).emit('meeting:session-ended', { sessionId: session.id });
            if (session.meetingLink) {
                io.to(`meeting-${session.meetingLink}`).emit('meeting:session-ended', { sessionId: session.id });
            }
            io.emit('meetings:updated');
        }

        res.json({
            success: true,
            message: 'Viva completed successfully',
            messageHindi: 'वाइवा सफलतापूर्वक पूरा हुआ',
            data: { session }
        });
    } catch (error) {
        console.error('=== Complete Session Error ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error meta:', error.meta);
        console.error('Full error:', error);

        return res.status(500).json({
            success: false,
            message: 'Failed to complete viva session',
            error: error.message,
            code: error.code,
            meta: error.meta
        });
    }
}));

/**
 * @route   GET /api/viva/questions
 * @desc    Get viva question bank
 * @access  Private (Instructor)
 */
router.get('/questions', authenticate, authorize('instructor', 'lab_assistant', 'admin'), asyncHandler(async (req, res) => {
    const { subjectId, assignmentId, difficulty, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where = {};

    if (subjectId) {
        where.subjectId = subjectId;
    }

    if (assignmentId) {
        where.assignmentId = assignmentId;
    }

    if (difficulty) {
        where.difficulty = difficulty;
    }

    const [questions, total] = await Promise.all([
        prisma.meetingQuestion.findMany({
            where,
            skip,
            take: parseInt(limit),
            include: {
                subject: {
                    select: { id: true, name: true, nameHindi: true }
                },
                assignment: {
                    select: { id: true, title: true }
                }
            }
        }),
        prisma.meetingQuestion.count({ where })
    ]);

    res.json({
        success: true,
        data: {
            questions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        }
    });
}));

/**
 * @route   POST /api/viva/questions
 * @desc    Add question to bank
 * @access  Private (Instructor)
 */
router.post('/questions', authenticate, authorize('instructor', 'lab_assistant', 'admin'), [
    body('subjectId').isUUID().withMessage('Valid subject ID required'),
    body('question').trim().notEmpty().withMessage('Question is required')
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

    const {
        subjectId, assignmentId,
        question, questionHindi,
        expectedAnswer, expectedAnswerHindi,
        difficulty, marks, topicTags
    } = req.body;

    const meetingQuestion = await prisma.meetingQuestion.create({
        data: {
            subjectId,
            assignmentId,
            question,
            questionHindi,
            expectedAnswer,
            expectedAnswerHindi,
            difficulty: difficulty || 'medium',
            marks: marks || 2,
            topicTags: topicTags || [],
            createdById: req.user.id
        }
    });

    res.status(201).json({
        success: true,
        message: 'Question added to bank',
        messageHindi: 'प्रश्न बैंक में जोड़ा गया',
        data: { question: meetingQuestion }
    });
}));

/**
 * @route   POST /api/viva/sessions/schedule
 * @desc    Schedule a standalone viva session for a student (without requiring submission)
 * @access  Private (Instructor, Admin)
 */
router.post("/sessions/schedule", authenticate, authorize("instructor", "lab_assistant", "admin", "principal"), [
    body("type").optional().isIn(["instant", "scheduled"]),
    body("scheduledAt").optional().isISO8601(),
    body("durationMinutes").optional().isInt({ min: 5, max: 240 }),
    body("title").notEmpty().withMessage("Title is required")
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { type, targetType, targetId, targets, scheduledAt, durationMinutes, title, description, autoAdmit } = req.body;
    
    // Normalize target list
    let targetList = Array.isArray(targets) && targets.length > 0 ? targets : [];
    if (targetList.length === 0 && targetType && targetId) {
        targetList.push({ type: targetType, id: targetId });
    }

    let targetClassId = null;
    let targetGroupId = null;
    let targetStudentId = null;

    if (targetList.length > 0) {
        const primaryTarget = targetList[0];
        if (primaryTarget.type === "student") targetStudentId = primaryTarget.id;
        if (primaryTarget.type === "group") targetGroupId = primaryTarget.id;
        if (primaryTarget.type === "class") targetClassId = primaryTarget.id;
    }

    const sessionId = require("uuid").v4();
    const roomCode = generate10DigitRoomCode();
    const passcode = generate8CharPasscode();
    const meetingLink = `${process.env.CLIENT_URL || "http://localhost:3000"}/meeting/${roomCode}`;
    const meetingType = type || "scheduled";
    const finalScheduledAt = meetingType === "instant" ? new Date() : new Date(scheduledAt || Date.now());
    const finalStatus = meetingType === "instant" ? "in_progress" : "scheduled";
    const hostName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Host';

    const session = await prisma.meeting.create({
        data: {
            id: sessionId,
            schoolId: req.user.schoolId,
            title,
            type: meetingType,
            hostId: req.user.id,
            targetClassId,
            targetGroupId,
            targetStudentId,
            scheduledAt: finalScheduledAt,
            durationMinutes: durationMinutes || 15,
            meetingLink,
            status: finalStatus,
            autoStart: typeof autoAdmit === 'boolean' ? autoAdmit : true,
            questionsAsked: {
                roomCode,
                passcode,
                formattedRoomCode: formatRoomCode(roomCode),
                assignedTargets: targetList,
                autoAdmit: typeof autoAdmit === 'boolean' ? autoAdmit : true,
                ...(description ? { description } : {})
            },
            actualStartTime: meetingType === "instant" ? new Date() : null
        },
        include: {
            targetStudent: { select: { id: true, firstName: true, lastName: true, admissionNumber: true, email: true } },
            targetClass: { select: { id: true, name: true, section: true } },
            targetGroup: { select: { id: true, name: true } },
            host: { select: { id: true, firstName: true, lastName: true } }
        }
    });

    try {
        await prisma.activityLog.create({
            data: {
                userId: req.user.id,
                schoolId: req.user.schoolId,
                actionType: "meeting",
                description: `Scheduled meeting: ${title} (${targetList.length} targets)`,
                entityType: "meeting_session",
                entityId: session.id,
                ipAddress: req.ip,
                userAgent: req.get("User-Agent")
            }
        });
    } catch (logError) {}

    // Send notifications to all assigned targets
    const inviteMessage = `${hostName} has scheduled a meeting "${title}" for ${new Date(finalScheduledAt).toLocaleString()}.`;
    const actionUrl = `/meeting/${roomCode}`;

    for (const tgt of targetList) {
        try {
            if (tgt.type === 'student' && tgt.id) {
                await notificationService.createNotification({
                    userId: tgt.id,
                    title: `Meeting Invitation: ${title}`,
                    message: inviteMessage,
                    type: 'meeting_invite',
                    actionUrl
                });
            } else if (tgt.type === 'class' && tgt.id) {
                await notificationService.notifyClass({
                    classId: tgt.id,
                    title: `Class Meeting: ${title}`,
                    message: inviteMessage,
                    type: 'meeting_invite',
                    actionUrl
                });
            } else if (tgt.type === 'group' && tgt.id) {
                await notificationService.notifyGroup({
                    groupId: tgt.id,
                    title: `Group Meeting: ${title}`,
                    message: inviteMessage,
                    type: 'meeting_invite',
                    actionUrl
                });
            }
        } catch (notifErr) {
            console.warn('Target notification error (non-fatal):', notifErr.message);
        }
    }

    // Broadcast real-time meeting notification to other devices
    try {
        const io = req.app.get('io') || global.io;
        if (io) {
            io.to(`user-${req.user.id}`).emit('meeting:created', { session });
            for (const tgt of targetList) {
                if (tgt.type === 'student') io.to(`user-${tgt.id}`).emit('meeting:created', { session });
                if (tgt.type === 'class') io.to(`class-${tgt.id}`).emit('meeting:created', { session });
            }
            io.emit('meetings:updated', { session });
        }
    } catch (ioErr) {
        console.log('Socket broadcast error (non-fatal):', ioErr);
    }

    res.json({
        success: true,
        message: "Meeting session scheduled successfully",
        data: { session }
    });
}));

/**
 * @route   GET /api/meetings/search-targets
 * @desc    Global search across students, classes, and groups in school
 * @access  Private
 */
router.get('/search-targets', authenticate, asyncHandler(async (req, res) => {
    const { q = '', type = 'all' } = req.query;
    const searchTerm = q.trim();
    const schoolId = req.user.schoolId;

    let students = [];
    let classes = [];
    let groups = [];

    const userWhere = {
        role: 'student',
        ...(schoolId ? { schoolId } : {})
    };

    const classWhere = {
        ...(schoolId ? { schoolId } : {})
    };

    const groupWhere = {
        ...(schoolId ? { class: { schoolId } } : {})
    };

    if (type === 'all' || type === 'student') {
        const rawStudents = await prisma.user.findMany({
            where: {
                ...userWhere,
                ...(searchTerm.length >= 1 ? {
                    OR: [
                        { firstName: { contains: searchTerm, mode: 'insensitive' } },
                        { lastName: { contains: searchTerm, mode: 'insensitive' } },
                        { admissionNumber: { contains: searchTerm, mode: 'insensitive' } },
                        { studentId: { contains: searchTerm, mode: 'insensitive' } },
                        { email: { contains: searchTerm, mode: 'insensitive' } }
                    ]
                } : {})
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                admissionNumber: true,
                studentId: true,
                role: true,
                classEnrollments: {
                    select: {
                        classId: true,
                        class: {
                            select: { id: true, name: true, section: true }
                        }
                    },
                    take: 5
                }
            },
            orderBy: [
                { firstName: 'asc' },
                { lastName: 'asc' }
            ],
            take: 1000
        });

        students = rawStudents.map(s => ({
            ...s,
            enrollments: s.classEnrollments || []
        }));
    }

    if (type === 'all' || type === 'class') {
        classes = await prisma.class.findMany({
            where: {
                ...classWhere,
                ...(searchTerm.length >= 1 ? {
                    OR: [
                        { name: { contains: searchTerm, mode: 'insensitive' } },
                        { section: { contains: searchTerm, mode: 'insensitive' } }
                    ]
                } : {})
            },
            select: {
                id: true,
                name: true,
                section: true,
                gradeLevel: true,
                academicYearId: true,
                _count: { select: { enrollments: true, groups: true } }
            },
            orderBy: [
                { gradeLevel: 'asc' },
                { name: 'asc' }
            ],
            take: 300
        });
    }

    if (type === 'all' || type === 'group') {
        groups = await prisma.studentGroup.findMany({
            where: {
                ...groupWhere,
                ...(searchTerm.length >= 1 ? {
                    OR: [
                        { name: { contains: searchTerm, mode: 'insensitive' } },
                        { description: { contains: searchTerm, mode: 'insensitive' } },
                        { class: { name: { contains: searchTerm, mode: 'insensitive' } } }
                    ]
                } : {})
            },
            select: {
                id: true,
                name: true,
                description: true,
                classId: true,
                class: {
                    select: { name: true, section: true }
                },
                _count: { select: { members: true } }
            },
            orderBy: [
                { name: 'asc' }
            ],
            take: 500
        });
    }

    res.json({
        success: true,
        data: {
            students,
            classes,
            groups
        }
    });
}));

/**
 * @route   PUT /api/meetings/sessions/:id
 * @desc    Edit scheduled meeting details (Title, Target, Scheduled Time, Duration, Auto-admit)
 * @access  Private (Host, Admin, Principal)
 */
router.put('/sessions/:id', authenticate, authorize('instructor', 'lab_assistant', 'admin', 'principal'), [
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('targetType').optional().isIn(['student', 'group', 'class']),
    body('targetId').optional().isUUID().withMessage('Valid target ID required'),
    body('scheduledAt').optional().isISO8601(),
    body('durationMinutes').optional().isInt({ min: 5, max: 240 })
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const session = await findMeetingByIdOrLink(req.params.id);
    if (!session) {
        return res.status(404).json({ success: false, message: 'Meeting session not found' });
    }

    // Only host or admin can edit
    const isHost = session.hostId === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'principal';
    if (!isHost && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Not authorized to edit this meeting session' });
    }

    if (session.status !== 'scheduled') {
        return res.status(400).json({ success: false, message: 'Only scheduled meetings can be modified' });
    }

    const { title, targetType, targetId, targets, scheduledAt, durationMinutes, autoAdmit, description } = req.body;

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);
    if (durationMinutes) updateData.durationMinutes = parseInt(durationMinutes);
    if (typeof autoAdmit === 'boolean') updateData.autoAdmit = autoAdmit;

    // Handle composite targets if provided
    let targetList = [];
    if (Array.isArray(targets) && targets.length > 0) {
        targetList = targets;
    } else if (targetType && targetId) {
        targetList.push({ type: targetType, id: targetId });
    }

    if (targetList.length > 0) {
        updateData.targetStudentId = null;
        updateData.targetGroupId = null;
        updateData.targetClassId = null;
        
        const primaryTarget = targetList[0];
        if (primaryTarget.type === 'student') updateData.targetStudentId = primaryTarget.id;
        if (primaryTarget.type === 'group') updateData.targetGroupId = primaryTarget.id;
        if (primaryTarget.type === 'class') updateData.targetClassId = primaryTarget.id;

        // Update the JSON field with the new composite targets
        updateData.questionsAsked = {
            ...(session.questionsAsked || {}),
            assignedTargets: targetList
        };
    }

    if (description !== undefined) {
        updateData.questionsAsked = {
            ...(updateData.questionsAsked || session.questionsAsked || {}),
            description

        };
    }

    const updatedSession = await prisma.meeting.update({
        where: { id: session.id },
        data: updateData,
        include: {
            targetStudent: { select: { id: true, firstName: true, lastName: true, admissionNumber: true, email: true } },
            targetClass: { select: { id: true, name: true, section: true } },
            targetGroup: { select: { id: true, name: true } },
            host: { select: { id: true, firstName: true, lastName: true } }
        }
    });

    try {
        const io = req.app.get('io') || global.io;
        if (io) {
            io.emit('meetings:updated', { session: updatedSession });
        }
    } catch (ioErr) {}

    res.json({
        success: true,
        message: 'Meeting session updated successfully',
        data: { session: updatedSession }
    });
}));

/**
 * @route   POST /api/meetings/sessions/:id/invite
 * @desc    Send meeting invite link to participant/class/group during or before meeting
 * @access  Private
 */
router.post('/sessions/:id/invite', authenticate, asyncHandler(async (req, res) => {
    try {
        const { targetType, targetId, message } = req.body;
        if (!targetType || !targetId) {
            return res.status(400).json({ success: false, message: 'targetType and targetId are required' });
        }

        let session = null;
        try {
            session = await findMeetingByIdOrLink(req.params.id);
        } catch (e) {
            console.warn('findMeetingByIdOrLink warning:', e.message);
        }

        const rawCode = (req.params.id || '').toString().replace(/[^0-9a-zA-Z]/g, '');
        const roomCode = session?.questionsAsked?.roomCode || session?.id || rawCode || 'meeting';
        const meetingTitle = session?.title || 'Live Meeting Session';
        const hostName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Host';
        const inviteMessage = message || `${hostName} has invited you to join the live meeting "${meetingTitle}".`;
        const actionUrl = `/meeting/${roomCode}`;

        let invitedCount = 0;

        if (targetType === 'student') {
            await notificationService.createNotification({
                userId: targetId,
                title: `Meeting Invitation: ${meetingTitle}`,
                message: inviteMessage,
                type: 'meeting_invite',
                actionUrl
            }).catch(() => {});
            invitedCount = 1;
        } else if (targetType === 'class') {
            const result = await notificationService.notifyClass({
                classId: targetId,
                title: `Meeting Invitation: ${meetingTitle}`,
                message: inviteMessage,
                type: 'meeting_invite',
                actionUrl
            }).catch(() => {});
            invitedCount = typeof result === 'object' && result?.count !== undefined ? result.count : (Array.isArray(result) ? result.length : 1);
        } else if (targetType === 'group') {
            const result = await notificationService.notifyGroup({
                groupId: targetId,
                title: `Meeting Invitation: ${meetingTitle}`,
                message: inviteMessage,
                type: 'meeting_invite',
                actionUrl
            }).catch(() => {});
            invitedCount = typeof result === 'object' && result?.count !== undefined ? result.count : (Array.isArray(result) ? result.length : 1);
        }

        // Socket real-time broadcast
        try {
            const io = req.app.get('io') || global.io;
            if (io) {
                const payload = {
                    sessionId: session?.id || null,
                    roomCode,
                    title: meetingTitle,
                    hostName,
                    inviteMessage,
                    actionUrl
                };
                if (targetType === 'student') {
                    io.to(`user-${targetId}`).emit('meeting:invitation-received', payload);
                } else if (targetType === 'class') {
                    io.to(`class-${targetId}`).emit('meeting:invitation-received', payload);
                } else if (targetType === 'group') {
                    io.to(`group-${targetId}`).emit('meeting:invitation-received', payload);
                }
            }
        } catch (err) {}

        return res.json({
            success: true,
            message: `Meeting invitation sent successfully`,
            data: { invitedCount, roomCode, joinUrl: `/meeting/${roomCode}` }
        });
    } catch (err) {
        console.error('Invite endpoint error:', err);
        return res.status(500).json({ success: false, message: err.message || 'Failed to send invite' });
    }
}));


/**
 * @route   GET /api/viva/available-students
 * @desc    Get students available for viva scheduling
 * @access  Private (Instructor, Admin)
 */
router.get('/available-students', authenticate, authorize('instructor', 'lab_assistant', 'admin'), asyncHandler(async (req, res) => {
    const { search, classId, limit = 50 } = req.query;

    let where = {
        role: 'student',
        isActive: true,
        schoolId: req.user.schoolId
    };

    if (search) {
        where.OR = [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { admissionNumber: { contains: search, mode: 'insensitive' } }
        ];
    }

    if (classId) {
        where.classEnrollments = {
            some: { classId, status: 'active' }
        };
    }

    const students = await prisma.user.findMany({
        where,
        take: parseInt(limit),
        orderBy: { firstName: 'asc' },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            admissionNumber: true,
            profileImageUrl: true,
            classEnrollments: {
                where: { status: 'active' },
                include: {
                    class: {
                        select: { id: true, name: true, gradeLevel: true, section: true }
                    }
                }
            }
        }
    });

    res.json({
        success: true,
        data: { students }
    });
}));

// ==================== WAITING ROOM ENDPOINTS ====================

/**
 * @route   POST /api/viva/sessions/:id/join
 * @desc    Join waiting room for a viva session
 * @access  Private
 */
router.post('/sessions/:id/join', authenticate, asyncHandler(async (req, res) => {
    const session = await findMeetingByIdOrLink(req.params.id, {
        include: {
            targetStudent: { select: { id: true, firstName: true, lastName: true } },
            host: { select: { id: true, firstName: true, lastName: true } }
        }
    });

    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Viva session not found'
        });
    }

    const sessionId = session.id;
    const userId = req.user.id;

    // Check if user is allowed (student of this session or examiner)
    const isStudent = session.targetStudentId === userId;
    const isExaminer = session.hostId === userId;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'principal';

    // Students can only join their own sessions
    if (req.user.role === 'student' && !isStudent) {
        return res.status(403).json({
            success: false,
            message: 'This viva session is not assigned to you',
            messageHindi: 'यह वाइवा सत्र आपको असाइन नहीं किया गया है'
        });
    }

    // Instructors can only join sessions they are examining (unless admin)
    if ((req.user.role === 'instructor' || req.user.role === 'lab_assistant') && !isExaminer && !isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'You are not the examiner for this session',
            messageHindi: 'आप इस सत्र के परीक्षक नहीं हैं'
        });
    }

    // Check if session is in a joinable state
    if (session.status === 'completed') {
        return res.status(400).json({
            success: false,
            message: 'This viva session has already been completed',
            messageHindi: 'यह वाइवा सत्र पहले ही पूरा हो चुका है'
        });
    }

    if (session.status === 'cancelled') {
        return res.status(400).json({
            success: false,
            message: 'This viva session has been cancelled',
            messageHindi: 'यह वाइवा सत्र रद्द कर दिया गया है'
        });
    }

    // Determine role and initial status
    let role = 'student';
    let status = 'admitted'; // Auto admit everyone

    if (isExaminer) {
        role = 'examiner';
    }

    // Upsert participant record
    const participant = await prisma.meetingParticipant.upsert({
        where: {
            sessionId_userId: { sessionId, userId }
        },
        create: {
            sessionId,
            userId,
            role,
            status,
            joinedWaitingAt: new Date(),
            admittedAt: status === 'admitted' ? new Date() : null
        },
        update: {
            status: status,
            socketId: null, // Will be set when WebRTC connects
            leftAt: null // Reset left time if rejoining
        },
        include: {
            user: {
                select: { id: true, firstName: true, lastName: true, email: true, admissionNumber: true }
            }
        }
    });

    res.json({
        success: true,
        message: status === 'admitted' ? 'Joined session' : 'Joined waiting room',
        data: {
            participant,
            session: {
                id: session.id,
                status: session.status,
                hostId: session.hostId,
                targetStudentId: session.targetStudentId,
                host: session.host,
                targetStudent: session.targetStudent
            },
            isHost: isExaminer
        }
    });
}));

/**
 * @route   GET /api/viva/sessions/:id/participants
 * @desc    Get all participants in waiting room and session
 * @access  Private (Examiner)
 */
router.get('/sessions/:id/participants', authenticate, asyncHandler(async (req, res) => {
    const session = await findMeetingByIdOrLink(req.params.id);

    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }

    const sessionId = session.id;

    // Get all participants
    const participants = await prisma.meetingParticipant.findMany({
        where: { sessionId },
        include: {
            user: {
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    admissionNumber: true,
                    role: true
                }
            }
        },
        orderBy: { joinedWaitingAt: 'asc' }
    });

    // Split by status
    const waiting = participants.filter(p => p.status === 'waiting');
    const admitted = participants.filter(p => ['admitted', 'in_session'].includes(p.status));

    res.json({
        success: true,
        data: {
            participants,
            waiting,
            admitted,
            counts: {
                total: participants.length,
                waiting: waiting.length,
                admitted: admitted.length
            }
        }
    });
}));

/**
 * @route   PUT /api/viva/sessions/:id/admit/:participantId
 * @desc    Admit a participant from waiting room
 * @access  Private (Examiner)
 */
router.put('/sessions/:id/admit/:participantId', authenticate, authorize('instructor', 'lab_assistant', 'admin'), asyncHandler(async (req, res) => {
    const { participantId } = req.params;
    const session = await findMeetingByIdOrLink(req.params.id);

    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }

    // Admit the participant
    const participant = await prisma.meetingParticipant.update({
        where: { id: participantId },
        data: {
            status: 'admitted',
            admittedAt: new Date()
        },
        include: {
            user: {
                select: { id: true, firstName: true, lastName: true, email: true }
            }
        }
    });

    res.json({
        success: true,
        message: `${participant.user.firstName} has been admitted`,
        data: { participant }
    });
}));

/**
 * @route   PUT /api/viva/sessions/:id/reject/:participantId
 * @desc    Reject a participant from waiting room
 * @access  Private (Examiner)
 */
router.put('/sessions/:id/reject/:participantId', authenticate, authorize('instructor', 'lab_assistant', 'admin'), asyncHandler(async (req, res) => {
    const { participantId } = req.params;
    const session = await findMeetingByIdOrLink(req.params.id);

    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }

    // Reject the participant
    const participant = await prisma.meetingParticipant.update({
        where: { id: participantId },
        data: {
            status: 'rejected',
            leftAt: new Date()
        },
        include: {
            user: {
                select: { id: true, firstName: true, lastName: true }
            }
        }
    });

    res.json({
        success: true,
        message: `${participant.user.firstName} has been removed from waiting room`,
        data: { participant }
    });
}));

/**
 * @route   PUT /api/viva/sessions/:id/leave
 * @desc    Leave a viva session
 * @access  Private
 */
router.put('/sessions/:id/leave', authenticate, asyncHandler(async (req, res) => {
    const session = await findMeetingByIdOrLink(req.params.id);
    const sessionId = session ? session.id : (isUUID(req.params.id) ? req.params.id : null);
    const userId = req.user.id;

    if (!sessionId) {
        return res.json({ success: true, message: 'Left the session', data: { updated: 0 } });
    }

    // Update participant status
    const participant = await prisma.meetingParticipant.updateMany({
        where: {
            sessionId,
            userId
        },
        data: {
            status: 'left',
            leftAt: new Date()
        }
    });

    res.json({
        success: true,
        message: 'Left the session',
        data: { updated: participant.count }
    });
}));

/**
 * @route   GET /api/viva/sessions/:id/my-status
 * @desc    Get current user's participant status
 * @access  Private
 */
router.get('/sessions/:id/my-status', authenticate, asyncHandler(async (req, res) => {
    const session = await findMeetingByIdOrLink(req.params.id);
    if (!session) {
        return res.status(404).json({
            success: false,
            message: 'Session not found'
        });
    }

    const sessionId = session.id;
    const userId = req.user.id;

    const participant = await prisma.meetingParticipant.findUnique({
        where: {
            sessionId_userId: { sessionId, userId }
        },
        include: {
            session: {
                select: {
                    id: true,
                    status: true,
                    hostId: true,
                    host: {
                        select: { id: true, firstName: true, lastName: true }
                    }
                }
            }
        }
    });

    if (!participant) {
        return res.status(404).json({
            success: false,
            message: 'You have not joined this session'
        });
    }

    res.json({
        success: true,
        data: { participant }
    });
}));

/**
 * @route   PUT /api/viva/sessions/:id/admit-all
 * @desc    Admit all waiting participants
 * @access  Private (Examiner)
 */
router.put('/sessions/:id/admit-all', authenticate, authorize('instructor', 'lab_assistant', 'admin'), asyncHandler(async (req, res) => {
    const session = await findMeetingByIdOrLink(req.params.id);
    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const result = await prisma.meetingParticipant.updateMany({
        where: {
            sessionId: session.id,
            status: 'waiting'
        },
        data: {
            status: 'admitted',
            admittedAt: new Date()
        }
    });

    res.json({
        success: true,
        message: `Admitted ${result.count} participant(s)`,
        data: { admittedCount: result.count }
    });
}));

/**
 * @route   GET /api/viva/sessions/:id/time-status
 * @desc    Get session time remaining and status
 * @access  Private
 */
router.get('/sessions/:id/time-status', authenticate, asyncHandler(async (req, res) => {
    const session = await findMeetingByIdOrLink(req.params.id, {
        select: {
            id: true,
            status: true,
            scheduledAt: true,
            scheduledEndTime: true,
            durationMinutes: true,
            actualStartTime: true,
            actualEndTime: true,
            autoStart: true,
            autoAdmit: true
        }
    });

    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const now = new Date();
    let timeRemaining = null;
    let shouldAutoStart = false;
    let shouldAutoEnd = false;
    let isWithinSchedule = false;

    if (session.scheduledAt) {
        const scheduledStart = new Date(session.scheduledAt);
        const scheduledEnd = session.scheduledEndTime
            ? new Date(session.scheduledEndTime)
            : new Date(scheduledStart.getTime() + session.durationMinutes * 60 * 1000);

        isWithinSchedule = now >= scheduledStart && now <= scheduledEnd;

        // Check if should auto-start (within 1 minute of scheduled time)
        if (session.status === 'scheduled' && session.autoStart) {
            const timeDiff = (now - scheduledStart) / 1000 / 60; // in minutes
            shouldAutoStart = timeDiff >= -1 && timeDiff <= 5; // 1 min before to 5 mins after
        }

        // Calculate time remaining
        if (session.status === 'in_progress' && session.actualStartTime) {
            const actualStart = new Date(session.actualStartTime);
            const endTime = new Date(actualStart.getTime() + session.durationMinutes * 60 * 1000);
            timeRemaining = Math.max(0, Math.floor((endTime - now) / 1000)); // seconds
            shouldAutoEnd = timeRemaining <= 0;
        } else if (session.status === 'scheduled') {
            // Time until start
            timeRemaining = Math.floor((scheduledStart - now) / 1000);
        }
    }

    res.json({
        success: true,
        data: {
            session: {
                ...session,
                timeRemaining,
                shouldAutoStart,
                shouldAutoEnd,
                isWithinSchedule,
                now: now.toISOString()
            }
        }
    });
}));

/**
 * @route   PUT /api/viva/sessions/:id/auto-start
 * @desc    Auto-start a session if within schedule
 * @access  Private
 */
router.put('/sessions/:id/auto-start', authenticate, asyncHandler(async (req, res) => {
    const session = await findMeetingByIdOrLink(req.params.id);

    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (session.status !== 'scheduled') {
        return res.status(400).json({ success: false, message: 'Session already started or completed' });
    }

    const now = new Date();
    const scheduledStart = new Date(session.scheduledAt);
    const timeDiff = (now - scheduledStart) / 1000 / 60;

    // Allow start 5 mins before to 30 mins after scheduled time
    if (timeDiff < -5 || timeDiff > 30) {
        return res.status(400).json({
            success: false,
            message: 'Session can only be started within schedule window',
            data: { scheduledAt: session.scheduledAt, currentTime: now, timeDiffMinutes: timeDiff }
        });
    }

    const updatedSession = await prisma.meeting.update({
        where: { id: session.id },
        data: {
            status: 'in_progress',
            actualStartTime: now
        }
    });

    // Auto-admit student if enabled
    if (session.autoAdmit) {
        await prisma.meetingParticipant.updateMany({
            where: { sessionId: session.id, role: 'student' },
            data: { status: 'admitted', admittedAt: now }
        });
    }

    res.json({
        success: true,
        message: 'Session auto-started',
        data: { session: updatedSession }
    });
}));

/**
 * @route   PUT /api/viva/sessions/:id/auto-end
 * @desc    Auto-end a session when time expires
 * @access  Private
 */
router.put('/sessions/:id/auto-end', authenticate, asyncHandler(async (req, res) => {
    const session = await findMeetingByIdOrLink(req.params.id);

    if (!session || session.status !== 'in_progress') {
        return res.status(400).json({ success: false, message: 'Session not in progress' });
    }

    const now = new Date();
    const startTime = new Date(session.actualStartTime);
    const endTime = new Date(startTime.getTime() + session.durationMinutes * 60 * 1000);

    if (now < endTime) {
        return res.status(400).json({
            success: false,
            message: 'Session time not expired yet',
            data: { timeRemaining: Math.floor((endTime - now) / 1000) }
        });
    }

    const updatedSession = await prisma.meeting.update({
        where: { id: session.id },
        data: {
            status: 'completed',
            actualEndTime: now,
            examinerRemarks: session.examinerRemarks || 'Session auto-completed due to time limit'
        }
    });

    res.json({
        success: true,
        message: 'Session auto-ended due to time limit',
        data: { session: updatedSession }
    });
}));

/**
 * @route   POST /api/meetings/sessions/:id/recording
 * @desc    Upload session recording
 * @access  Private
 */
const multer = require('multer');

const recordingStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, recordingsDir),
    filename: (req, file, cb) => {
        const sessionId = req.params.id || 'meeting';
        const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const ext = path.extname(file.originalname) || '.webm';
        cb(null, `meeting-${safeId}-${Date.now()}${ext}`);
    }
});

const uploadRecording = multer({
    storage: recordingStorage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/webm', 'video/mp4', 'audio/webm', 'audio/mpeg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only video/audio files allowed.'));
        }
    }
});

router.post('/sessions/:id/recording', authenticate, uploadRecording.single('recording'), asyncHandler(async (req, res) => {
    const sessionId = req.params.id;

    const session = await findMeetingByIdOrLink(sessionId);

    if (!session) {
        return res.status(404).json({ success: false, message: 'Meeting session not found' });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No recording file uploaded' });
    }

    const filename = path.basename(req.file.path);
    const recordingUrl = `/api/meetings/recordings/${filename}`;

    const updatedSession = await prisma.meeting.update({
        where: { id: session.id },
        data: {
            recordingUrl,
            recordingFilePath: req.file.path,
            recordingSize: req.file.size,
            recordingDuration: parseInt(req.body.duration) || null
        }
    });

    res.json({
        success: true,
        message: 'Recording uploaded successfully',
        data: {
            session: updatedSession,
            recording: {
                url: recordingUrl,
                size: req.file.size,
                filename
            }
        }
    });
}));

/**
 * @route   GET /api/meetings/recordings/:filename
 * @desc    Stream recording file
 * @access  Public / Optional Auth for HTML5 Video tags
 */
router.get('/recordings/:filename', optionalAuth, asyncHandler(async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(recordingsDir, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'Recording not found' });
    }

    // Verify access if user is authenticated
    if (req.user) {
        const session = await prisma.meeting.findFirst({
            where: { recordingFilePath: { contains: filename } }
        });

        if (session) {
            const isAuthorized = req.user.id === session.targetStudentId ||
                req.user.id === session.hostId ||
                req.user.role === 'admin' ||
                req.user.role === 'principal';

            if (!isAuthorized) {
                return res.status(403).json({ success: false, message: 'Not authorized to view this recording' });
            }
        }
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const isMp4 = filename.toLowerCase().endsWith('.mp4');
    const contentType = isMp4 ? 'video/mp4' : 'video/webm';

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': contentType,
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/webm',
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
    }
}));

/**
 * @route   PUT /api/viva/sessions/:id/mark-missed
 * @desc    Mark an expired session as missed/cancelled
 * @access  Private (Instructor)
 */
router.put('/sessions/:id/mark-missed', authenticate, authorize('instructor', 'lab_assistant', 'admin'), asyncHandler(async (req, res) => {
    const session = await findMeetingByIdOrLink(req.params.id);

    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (session.status !== 'scheduled') {
        return res.status(400).json({ success: false, message: 'Can only mark scheduled sessions as missed' });
    }

    const updatedSession = await prisma.meeting.update({
        where: { id: session.id },
        data: {
            status: 'cancelled',
            examinerRemarks: req.body.reason || 'Session marked as missed - time slot expired'
        }
    });

    res.json({
        success: true,
        message: 'Session marked as missed',
        data: { session: updatedSession }
    });
}));



module.exports = router;
