const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

/**
 * @desc    Get lecture plans
 * @route   GET /api/teaching/plans
 * @access  Private
 */
exports.getLecturePlans = async (req, res, next) => {
    try {
        const { schoolId } = req.user;
        const { classId, subjectId, instructorId, date, academicYearId: qAcademicYearId } = req.query;

        // Resolve academicYearId: use query param or find the current active one
        let academicYearId = qAcademicYearId;
        if (!academicYearId) {
            const currentYear = await prisma.academicYear.findFirst({
                where: { schoolId, isCurrent: true },
                select: { id: true }
            });
            academicYearId = currentYear?.id;
        }

        const where = {
            schoolId,
            academicYearId
        };
        
        if (classId) where.classId = classId;
        if (subjectId) where.subjectId = subjectId;
        if (instructorId) where.instructorId = instructorId;
        if (date) {
            where.scheduledDate = new Date(date);
        }

        const plans = await prisma.lecturePlan.findMany({
            where,
            include: {
                class: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true, nameHindi: true } },
                instructor: { select: { id: true, firstName: true, lastName: true } },
                timetableSlot: true,
                resources: true,
                sessions: {
                    include: {
                        _count: { select: { attendance: true } }
                    }
                }
            },
            orderBy: { scheduledDate: 'desc' }
        });

        res.json({
            status: 'success',
            results: plans.length,
            data: { plans }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create a lecture plan
 * @route   POST /api/teaching/plans
 * @access  Private (Instructor/Admin)
 */
exports.createLecturePlan = async (req, res, next) => {
    try {
        const { schoolId } = req.user;
        const { 
            title, 
            titleHindi, 
            description, 
            classId, 
            subjectId, 
            timetableSlotId, 
            lectureNumber, 
            scheduledDate,
            scheduledDuration,
            lectureType,
            notes,
            notesHindi,
            homeworkDescription,
            academicYearId: bodyAcademicYearId
        } = req.body;

        // Resolve academicYearId
        let academicYearId = bodyAcademicYearId;
        if (!academicYearId) {
            const currentYear = await prisma.academicYear.findFirst({
                where: { schoolId, isCurrent: true },
                select: { id: true }
            });
            academicYearId = currentYear?.id;
        }
        if (!academicYearId) {
            return next(new AppError('No active academic year found for this school', 400));
        }

        const instructorId = req.user.role === 'instructor' ? req.user.id : req.body.instructorId;
        if (!instructorId) {
            return next(new AppError('Instructor ID is required', 400));
        }

        const plan = await prisma.lecturePlan.create({
            data: {
                schoolId,
                academicYearId,
                instructorId,
                classId,
                subjectId,
                timetableSlotId: timetableSlotId || null,
                title,
                titleHindi,
                description,
                lectureNumber: parseInt(lectureNumber, 10),
                scheduledDate: new Date(scheduledDate),
                scheduledDuration: parseInt(scheduledDuration, 10) || 40,
                lectureType: lectureType || 'theory',
                notes,
                notesHindi,
                homeworkDescription,
                status: 'planned'
            },
            include: {
                class: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true } },
                instructor: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        res.status(201).json({
            status: 'success',
            data: { plan }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update a lecture plan
 * @route   PUT /api/teaching/plans/:id
 * @access  Private (Instructor/Admin)
 */
exports.updateLecturePlan = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        
        // Don't allow changing some protected fields directly via update
        delete updateData.schoolId;
        delete updateData.instructorId;

        if (updateData.scheduledDate) {
            updateData.scheduledDate = new Date(updateData.scheduledDate);
        }
        if (updateData.lectureNumber) {
            updateData.lectureNumber = parseInt(updateData.lectureNumber, 10);
        }

        const plan = await prisma.lecturePlan.update({
            where: { id },
            data: updateData,
            include: {
                class: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true } },
                instructor: { select: { id: true, firstName: true, lastName: true } }
            }
        });

        res.json({
            status: 'success',
            data: { plan }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete a lecture plan
 * @route   DELETE /api/teaching/plans/:id
 * @access  Private (Instructor/Admin)
 */
exports.deleteLecturePlan = async (req, res, next) => {
    try {
        const { id } = req.params;

        await prisma.lecturePlan.delete({
            where: { id }
        });

        res.status(204).json({
            status: 'success',
            data: null
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Start a live lecture session
 * @route   POST /api/teaching/plans/:id/start
 * @access  Private (Instructor)
 */
exports.startLectureSession = async (req, res, next) => {
    try {
        const { id: lecturePlanId } = req.params;

        // Verify plan exists and is for this instructor
        const plan = await prisma.lecturePlan.findUnique({
            where: { id: lecturePlanId },
            include: { class: { select: { _count: { select: { classEnrollments: { where: { status: 'active' } } } } } } }
        });

        if (!plan) return next(new AppError('Lecture plan not found', 404));
        if (req.user.role === 'instructor' && plan.instructorId !== req.user.id) {
            return next(new AppError('Not authorized to start this lecture', 403));
        }

        // Update plan status
        await prisma.lecturePlan.update({
            where: { id: lecturePlanId },
            data: { status: 'in_progress' }
        });

        // Create the session
        const session = await prisma.lectureSession.create({
            data: {
                lecturePlanId,
                status: 'active',
                startedAt: new Date()
            }
        });

        // Fetch enrolled students to pre-seed attendance records as 'absent' until they join
        const enrollments = await prisma.classEnrollment.findMany({
            where: { classId: plan.classId, status: 'active' },
            select: { studentId: true }
        });

        if (enrollments.length > 0) {
            const attendanceData = enrollments.map(e => ({
                lectureSessionId: session.id,
                studentId: e.studentId,
                status: 'absent' // They start absent until they explicitly join
            }));
            
            await prisma.lectureAttendance.createMany({
                data: attendanceData,
                skipDuplicates: true
            });
        }

        res.status(201).json({
            status: 'success',
            data: { session }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    End a live lecture session
 * @route   PUT /api/teaching/sessions/:id/end
 * @access  Private (Instructor)
 */
exports.endLectureSession = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { topicsCovered, instructorRemarks } = req.body;

        const session = await prisma.lectureSession.findUnique({
            where: { id }
        });

        if (!session) return next(new AppError('Session not found', 404));

        const now = new Date();
        const actualDuration = Math.round((now.getTime() - session.startedAt.getTime()) / 60000);

        // Count present students
        const attendanceCount = await prisma.lectureAttendance.count({
            where: { lectureSessionId: id, status: { in: ['present', 'late'] } }
        });

        const updatedSession = await prisma.lectureSession.update({
            where: { id },
            data: {
                status: 'completed',
                endedAt: now,
                actualDuration,
                attendanceCount,
                topicsCovered: topicsCovered || session.topicsCovered,
                instructorRemarks: instructorRemarks || session.instructorRemarks
            }
        });

        // Mark plan as completed
        await prisma.lecturePlan.update({
            where: { id: session.lecturePlanId },
            data: { status: 'completed' }
        });

        res.json({
            status: 'success',
            data: { session: updatedSession }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get session details (including resources and polls)
 * @route   GET /api/teaching/sessions/:id
 * @access  Private
 */
exports.getLectureSession = async (req, res, next) => {
    try {
        const { id } = req.params;

        const session = await prisma.lectureSession.findUnique({
            where: { id },
            include: {
                lecturePlan: {
                    include: {
                        subject: { select: { id: true, name: true } },
                        class: { select: { id: true, name: true } },
                        instructor: { select: { id: true, firstName: true, lastName: true } }
                    }
                },
                resources: true,
                polls: {
                    include: {
                        _count: { select: { responses: true } }
                    }
                }
            }
        });

        if (!session) return next(new AppError('Session not found', 404));

        res.json({
            status: 'success',
            data: { session }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Mark attendance for a student
 * @route   POST /api/teaching/sessions/:id/attendance
 * @access  Private (Student marking themselves or instructor marking someone)
 */
exports.markAttendance = async (req, res, next) => {
    try {
        const { id: lectureSessionId } = req.params;
        const { status = 'present' } = req.body;
        
        let targetStudentId = req.user.id;
        if (req.user.role === 'instructor' && req.body.studentId) {
            targetStudentId = req.body.studentId;
        }

        const session = await prisma.lectureSession.findUnique({
            where: { id: lectureSessionId }
        });

        if (!session) return next(new AppError('Session not found', 404));
        if (session.status !== 'active' && req.user.role === 'student') {
            return next(new AppError('Cannot mark attendance for an inactive session', 400));
        }

        const attendance = await prisma.lectureAttendance.upsert({
            where: {
                lectureSessionId_studentId: {
                    lectureSessionId,
                    studentId: targetStudentId
                }
            },
            update: {
                status,
                joinedAt: new Date()
            },
            create: {
                lectureSessionId,
                studentId: targetStudentId,
                status,
                joinedAt: new Date()
            }
        });

        res.json({
            status: 'success',
            data: { attendance }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get attendance list for a session
 * @route   GET /api/teaching/sessions/:id/attendance
 * @access  Private (Instructor/Admin)
 */
exports.getAttendanceList = async (req, res, next) => {
    try {
        const { id: lectureSessionId } = req.params;
        
        const attendance = await prisma.lectureAttendance.findMany({
            where: { lectureSessionId },
            include: {
                student: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        studentId: true,
                        profileImage: true
                    }
                }
            },
            orderBy: {
                student: { firstName: 'asc' }
            }
        });

        res.json({
            status: 'success',
            results: attendance.length,
            data: { attendance }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create a live poll
 * @route   POST /api/teaching/sessions/:id/polls
 * @access  Private (Instructor)
 */
exports.createLivePoll = async (req, res, next) => {
    try {
        const { id: lectureSessionId } = req.params;
        const { question, options, correctOption } = req.body;

        if (!question || !Array.isArray(options) || options.length < 2) {
            return next(new AppError('Invalid poll data provided', 400));
        }

        const poll = await prisma.lecturePoll.create({
            data: {
                lectureSessionId,
                question,
                options,
                correctOption: correctOption !== undefined ? parseInt(correctOption, 10) : null,
                isActive: true
            }
        });

        // Use Socket.io to push poll to students if io exists
        const io = req.app.get('io');
        if (io) {
            // We notify the session room. Depending on room structure.
            io.to(`session-${lectureSessionId}`).emit('teaching:new-poll', poll);
        }

        res.status(201).json({
            status: 'success',
            data: { poll }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    End a live poll
 * @route   PUT /api/teaching/polls/:id/end
 * @access  Private (Instructor)
 */
exports.endLivePoll = async (req, res, next) => {
    try {
        const { id } = req.params;

        const poll = await prisma.lecturePoll.update({
            where: { id },
            data: { isActive: false }
        });

        const io = req.app.get('io');
        if (io) {
            io.to(`session-${poll.lectureSessionId}`).emit('teaching:end-poll', poll.id);
        }

        res.json({
            status: 'success',
            data: { poll }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Respond to a poll
 * @route   POST /api/teaching/polls/:id/respond
 * @access  Private (Student)
 */
exports.respondToPoll = async (req, res, next) => {
    try {
        const { id: pollId } = req.params;
        const { selectedOption } = req.body;

        const poll = await prisma.lecturePoll.findUnique({ where: { id: pollId } });
        if (!poll) return next(new AppError('Poll not found', 404));
        if (!poll.isActive) return next(new AppError('Poll is already closed', 400));

        const response = await prisma.lecturePollResponse.upsert({
            where: {
                pollId_studentId: {
                    pollId,
                    studentId: req.user.id
                }
            },
            update: {
                selectedOption: parseInt(selectedOption, 10),
                answeredAt: new Date()
            },
            create: {
                pollId,
                studentId: req.user.id,
                selectedOption: parseInt(selectedOption, 10)
            }
        });

        // Notify instructor of new response
        const io = req.app.get('io');
        if (io) {
            // Ideally notify instructor room 
            io.to(`session-${poll.lectureSessionId}-instructor`).emit('teaching:poll-response', response);
        }

        res.status(201).json({
            status: 'success',
            data: { response }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Attach a resource to a lecture plan
 * @route   POST /api/teaching/plans/:id/resources
 * @access  Private (Instructor)
 */
exports.attachPlanResource = async (req, res, next) => {
    try {
        const { id: lecturePlanId } = req.params;
        const { title, type, url, fileSize, mimeType } = req.body;

        const resource = await prisma.lectureResource.create({
            data: {
                lecturePlanId,
                title,
                type,
                url,
                fileSize: fileSize ? BigInt(fileSize) : null,
                mimeType,
                uploadedById: req.user.id
            }
        });

        res.status(201).json({
            status: 'success',
            data: { 
                resource: {
                    ...resource,
                    fileSize: resource.fileSize ? resource.fileSize.toString() : null
                } 
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Upload video/image during live lecture
 * @route   POST /api/teaching/sessions/:id/upload
 * @access  Private (Instructor/Student)
 */
exports.uploadSessionResource = async (req, res, next) => {
    try {
        const { id: lectureSessionId } = req.params;
        const { title, type, url, fileSize, mimeType } = req.body;

        // Ensure session exists
        const session = await prisma.lectureSession.findUnique({
            where: { id: lectureSessionId }
        });
        if (!session) return next(new AppError('Session not found', 404));

        const resource = await prisma.lectureResource.create({
            data: {
                lectureSessionId,
                title,
                type,
                url,
                fileSize: fileSize ? BigInt(fileSize) : null,
                mimeType,
                uploadedById: req.user.id
            }
        });

        // Use Socket.io to push real-time resource to users
        const io = req.app.get('io');
        if (io) {
            io.to(`session-${lectureSessionId}`).emit('teaching:new-resource', {
                ...resource,
                fileSize: resource.fileSize ? resource.fileSize.toString() : null
            });
        }

        res.status(201).json({
            status: 'success',
            data: { 
                resource: {
                    ...resource,
                    fileSize: resource.fileSize ? resource.fileSize.toString() : null
                } 
            }
        });
    } catch (error) {
        next(error);
    }
};
