const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Global Multi-Domain Search
 * @route   GET /api/search?q=...&category=...
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const { q, category } = req.query;
    const query = (q || '').trim();

    if (!query || query.length < 2) {
        return res.json({
            success: true,
            data: {
                query: '',
                totalResults: 0,
                results: {
                    meetings: [],
                    assignments: [],
                    documents: [],
                    notes: [],
                    users: [],
                    classes: [],
                    training: [],
                    tickets: [],
                    labs: [],
                    plans: []
                }
            }
        });
    }

    const { schoolId, id: userId, role } = req.user;
    const isSuperAdmin = role === 'super_admin';
    const isSchoolAdmin = role === 'admin' || isSuperAdmin;
    const isInstructor = role === 'instructor';
    const isStudent = role === 'student';

    // Safe ILIKE filter
    const textFilter = { contains: query, mode: 'insensitive' };

    // If student, resolve their active class enrollments and group memberships
    let studentClassIds = [];
    let studentGroupIds = [];
    if (isStudent) {
        const [enrollments, groupMembers] = await Promise.all([
            prisma.classEnrollment.findMany({
                where: { studentId: userId, status: 'active' },
                select: { classId: true }
            }).catch(() => []),
            prisma.studentGroupMember.findMany({
                where: { studentId: userId },
                select: { groupId: true }
            }).catch(() => [])
        ]);
        studentClassIds = enrollments.map(e => e.classId).filter(Boolean);
        studentGroupIds = groupMembers.map(g => g.groupId).filter(Boolean);
    }

    // Domain queries with role scoping
    const meetingWhere = {
        schoolId,
        OR: [
            { title: textFilter },
            { meetingLink: textFilter }
        ]
    };
    if (isStudent) {
        meetingWhere.AND = [
            {
                OR: [
                    { targetStudentId: userId },
                    { targetClassId: { in: studentClassIds } },
                    { targetGroupId: { in: studentGroupIds } },
                    { participants: { some: { userId } } }
                ]
            }
        ];
    }

    const assignmentWhere = {
        schoolId,
        OR: [
            { title: textFilter },
            { titleHindi: textFilter },
            { description: textFilter },
            { aim: textFilter }
        ]
    };
    if (isStudent) {
        assignmentWhere.status = 'published';
        assignmentWhere.AND = [
            {
                targets: {
                    some: {
                        OR: [
                            { targetStudentId: userId },
                            { targetClassId: { in: studentClassIds } },
                            { targetGroupId: { in: studentGroupIds } }
                        ]
                    }
                }
            }
        ];
    }

    const documentWhere = {
        schoolId,
        deletedAt: null,
        OR: [
            { name: textFilter },
            { fileName: textFilter },
            { description: textFilter },
            { category: textFilter }
        ]
    };
    if (isStudent) {
        documentWhere.AND = [
            {
                OR: [
                    { isPublic: true },
                    {
                        shares: {
                            some: {
                                OR: [
                                    { targetUserId: userId },
                                    { targetClassId: { in: studentClassIds } },
                                    { targetGroupId: { in: studentGroupIds } }
                                ]
                            }
                        }
                    }
                ]
            }
        ];
    }

    const trainingWhere = {
        schoolId,
        OR: [
            { title: textFilter },
            { titleHindi: textFilter },
            { description: textFilter },
            { language: textFilter }
        ]
    };
    if (isStudent) {
        trainingWhere.isPublished = true;
        trainingWhere.AND = [
            {
                OR: [
                    { assignments: { none: {} } },
                    {
                        assignments: {
                            some: {
                                targets: {
                                    some: {
                                        OR: [
                                            { targetStudentId: userId },
                                            { targetClassId: { in: studentClassIds } },
                                            { targetGroupId: { in: studentGroupIds } }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                ]
            }
        ];
    }

    const quizWhere = {
        schoolId,
        OR: [
            { title: textFilter },
            { description: textFilter },
            { code: textFilter },
            { keywords: textFilter }
        ]
    };
    if (isStudent) {
        quizWhere.status = 'published';
        quizWhere.AND = [
            {
                OR: [
                    { assignments: { none: {} } },
                    {
                        assignments: {
                            some: {
                                OR: [
                                    { targetStudentId: userId },
                                    { targetClassId: { in: studentClassIds } },
                                    { targetGroupId: { in: studentGroupIds } }
                                ]
                            }
                        }
                    }
                ]
            }
        ];
    }

    const ticketWhere = {
        createdBy: { schoolId },
        OR: [
            { title: textFilter },
            { description: textFilter },
            { ticketNumber: textFilter }
        ]
    };
    if (isStudent) {
        ticketWhere.createdById = userId;
    }

    const classWhere = {
        schoolId,
        OR: [
            { name: textFilter },
            { nameHindi: textFilter },
            { section: textFilter },
            { stream: textFilter }
        ]
    };
    if (isStudent && studentClassIds.length > 0) {
        classWhere.id = { in: studentClassIds };
    }

    // Concurrently execute searches across all domains with robust error handling
    const [
        meetings,
        assignments,
        documents,
        notes,
        users,
        classes,
        trainingModules,
        quizzes,
        tickets,
        labs,
        plans
    ] = await Promise.all([
        // 1. Meetings & Viva
        prisma.meeting.findMany({
            where: meetingWhere,
            take: 8,
            select: {
                id: true,
                title: true,
                type: true,
                status: true,
                mode: true,
                scheduledAt: true,
                host: { select: { firstName: true, lastName: true } }
            },
            orderBy: { scheduledAt: 'desc' }
        }).catch(err => {
            console.error('[Search] Meetings error:', err.message);
            return [];
        }),

        // 2. Assignments
        prisma.assignment.findMany({
            where: assignmentWhere,
            take: 8,
            select: {
                id: true,
                title: true,
                titleHindi: true,
                description: true,
                assignmentType: true,
                due_date: true,
                subject: { select: { name: true, code: true } }
            },
            orderBy: { createdAt: 'desc' }
        }).catch(err => {
            console.error('[Search] Assignments error:', err.message);
            return [];
        }),

        // 3. Documents
        prisma.document.findMany({
            where: documentWhere,
            take: 8,
            select: {
                id: true,
                name: true,
                fileName: true,
                description: true,
                category: true,
                fileType: true,
                fileSize: true,
                folder: { select: { name: true } },
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        }).catch(err => {
            console.error('[Search] Documents error:', err.message);
            return [];
        }),

        // 4. Notes (Admin Notes - Staff Only)
        (isSchoolAdmin || isInstructor) ? prisma.adminNote.findMany({
            where: {
                author: { schoolId },
                OR: [
                    { title: textFilter },
                    { content: textFilter },
                    { category: textFilter }
                ]
            },
            take: 8,
            select: {
                id: true,
                title: true,
                content: true,
                category: true,
                updatedAt: true
            },
            orderBy: { updatedAt: 'desc' }
        }).catch(err => {
            console.error('[Search] Notes error:', err.message);
            return [];
        }) : Promise.resolve([]),

        // 5. Users (Staff Only)
        (isSchoolAdmin || isInstructor) ? prisma.user.findMany({
            where: {
                schoolId,
                isActive: true,
                OR: [
                    { firstName: textFilter },
                    { firstNameHindi: textFilter },
                    { lastName: textFilter },
                    { lastNameHindi: textFilter },
                    { email: textFilter },
                    { studentId: textFilter },
                    { admissionNumber: textFilter }
                ]
            },
            take: 8,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                profileImageUrl: true,
                studentId: true,
                admissionNumber: true
            },
            orderBy: { firstName: 'asc' }
        }).catch(err => {
            console.error('[Search] Users error:', err.message);
            return [];
        }) : Promise.resolve([]),

        // 6. Classes
        prisma.class.findMany({
            where: classWhere,
            take: 8,
            select: {
                id: true,
                name: true,
                nameHindi: true,
                gradeLevel: true,
                section: true,
                stream: true
            },
            orderBy: { name: 'asc' }
        }).catch(err => {
            console.error('[Search] Classes error:', err.message);
            return [];
        }),

        // 7. Training Modules
        prisma.trainingModule.findMany({
            where: trainingWhere,
            take: 8,
            select: {
                id: true,
                title: true,
                titleHindi: true,
                description: true,
                language: true,
                totalUnits: true,
                totalExercises: true
            },
            orderBy: { title: 'asc' }
        }).catch(err => {
            console.error('[Search] Training error:', err.message);
            return [];
        }),

        // 8. Quizzes
        prisma.quiz.findMany({
            where: quizWhere,
            take: 8,
            select: {
                id: true,
                title: true,
                description: true,
                code: true,
                difficulty: true,
                totalQuestions: true,
                timeLimitMinutes: true,
                status: true
            },
            orderBy: { createdAt: 'desc' }
        }).catch(err => {
            console.error('[Search] Quizzes error:', err.message);
            return [];
        }),

        // 9. Tickets
        prisma.ticket.findMany({
            where: ticketWhere,
            take: 8,
            select: {
                id: true,
                ticketNumber: true,
                title: true,
                description: true,
                category: true,
                priority: true,
                status: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        }).catch(err => {
            console.error('[Search] Tickets error:', err.message);
            return [];
        }),

        // 10. Labs & Rooms (Staff Only)
        (isSchoolAdmin || isInstructor) ? prisma.lab.findMany({
            where: {
                schoolId,
                OR: [
                    { name: textFilter },
                    { nameHindi: textFilter },
                    { roomNumber: textFilter }
                ]
            },
            take: 8,
            select: {
                id: true,
                name: true,
                nameHindi: true,
                roomNumber: true,
                capacity: true,
                status: true
            },
            orderBy: { name: 'asc' }
        }).catch(err => {
            console.error('[Search] Labs error:', err.message);
            return [];
        }) : Promise.resolve([]),

        // 11. Teaching / Lecture Plans (Staff Only)
        (isSchoolAdmin || isInstructor) ? prisma.lecturePlan.findMany({
            where: {
                schoolId,
                OR: [
                    { title: textFilter },
                    { titleHindi: textFilter },
                    { description: textFilter },
                    { notes: textFilter }
                ]
            },
            take: 8,
            select: {
                id: true,
                title: true,
                titleHindi: true,
                description: true,
                scheduledDate: true,
                lectureType: true,
                class: { select: { name: true } },
                subject: { select: { name: true } }
            },
            orderBy: { scheduledDate: 'desc' }
        }).catch(err => {
            console.error('[Search] Plans error:', err.message);
            return [];
        }) : Promise.resolve([])
    ]);

    const totalResults =
        meetings.length +
        assignments.length +
        documents.length +
        notes.length +
        users.length +
        classes.length +
        trainingModules.length +
        quizzes.length +
        tickets.length +
        labs.length +
        plans.length;

    res.json({
        success: true,
        data: {
            query,
            totalResults,
            results: {
                meetings,
                assignments,
                documents,
                notes,
                users,
                classes,
                training: trainingModules,
                quizzes,
                tickets,
                labs,
                plans
            }
        }
    });
}));

module.exports = router;
