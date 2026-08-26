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

    // Concurrently execute searches across domains
    const [
        meetings,
        assignments,
        documents,
        notes,
        users,
        classes,
        trainingModules,
        tickets,
        labs,
        plans
    ] = await Promise.all([
        // 1. Meetings & Viva
        prisma.meeting.findMany({
            where: {
                schoolId,
                OR: [
                    { title: textFilter },
                    { description: textFilter },
                    { meetingLink: textFilter }
                ],
                deletedAt: null
            },
            take: 6,
            select: {
                id: true,
                title: true,
                description: true,
                type: true,
                status: true,
                mode: true,
                scheduledAt: true,
                host: { select: { firstName: true, lastName: true } }
            },
            orderBy: { scheduledAt: 'desc' }
        }).catch(() => []),

        // 2. Assignments
        prisma.assignment.findMany({
            where: {
                schoolId,
                OR: [
                    { title: textFilter },
                    { description: textFilter }
                ],
                deletedAt: null
            },
            take: 6,
            select: {
                id: true,
                title: true,
                description: true,
                type: true,
                dueDate: true,
                subject: { select: { name: true, code: true } }
            },
            orderBy: { createdAt: 'desc' }
        }).catch(() => []),

        // 3. Documents
        prisma.document.findMany({
            where: {
                schoolId,
                OR: [
                    { title: textFilter },
                    { description: textFilter },
                    { originalName: textFilter },
                    { tags: { has: query } }
                ],
                isDeleted: false
            },
            take: 6,
            select: {
                id: true,
                title: true,
                description: true,
                originalName: true,
                fileType: true,
                fileSize: true,
                folder: { select: { name: true } },
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        }).catch(() => []),

        // 4. Notes (Admin Notes)
        (isSchoolAdmin || isInstructor) ? prisma.adminNote.findMany({
            where: {
                schoolId,
                OR: [
                    { title: textFilter },
                    { content: textFilter }
                ]
            },
            take: 6,
            select: {
                id: true,
                title: true,
                content: true,
                color: true,
                updatedAt: true
            },
            orderBy: { updatedAt: 'desc' }
        }).catch(() => []) : Promise.resolve([]),

        // 5. Users (Students, Instructors, Admins)
        (isSchoolAdmin || isInstructor) ? prisma.user.findMany({
            where: {
                schoolId,
                OR: [
                    { firstName: textFilter },
                    { lastName: textFilter },
                    { email: textFilter },
                    { studentId: textFilter },
                    { admissionNumber: textFilter }
                ]
            },
            take: 6,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                avatar: true,
                studentId: true,
                admissionNumber: true
            },
            orderBy: { firstName: 'asc' }
        }).catch(() => []) : Promise.resolve([]),

        // 6. Classes
        prisma.class.findMany({
            where: {
                schoolId,
                OR: [
                    { name: textFilter },
                    { gradeLevel: textFilter },
                    { section: textFilter }
                ]
            },
            take: 6,
            select: {
                id: true,
                name: true,
                gradeLevel: true,
                section: true
            },
            orderBy: { name: 'asc' }
        }).catch(() => []),

        // 7. Training Modules
        prisma.trainingModule.findMany({
            where: {
                schoolId,
                OR: [
                    { title: textFilter },
                    { description: textFilter }
                ]
            },
            take: 6,
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                points: true
            },
            orderBy: { title: 'asc' }
        }).catch(() => []),

        // 8. Tickets
        prisma.ticket.findMany({
            where: {
                schoolId,
                OR: [
                    { title: textFilter },
                    { description: textFilter }
                ]
            },
            take: 6,
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        }).catch(() => []),

        // 9. Labs & Items
        (isSchoolAdmin || isInstructor) ? prisma.lab.findMany({
            where: {
                schoolId,
                OR: [
                    { name: textFilter },
                    { code: textFilter },
                    { roomNumber: textFilter },
                    { description: textFilter }
                ]
            },
            take: 6,
            select: {
                id: true,
                name: true,
                code: true,
                roomNumber: true,
                building: true
            },
            orderBy: { name: 'asc' }
        }).catch(() => []) : Promise.resolve([]),

        // 10. Teaching / Lecture Plans
        (isSchoolAdmin || isInstructor) ? prisma.lecturePlan.findMany({
            where: {
                schoolId,
                OR: [
                    { title: textFilter },
                    { description: textFilter },
                    { notes: textFilter }
                ]
            },
            take: 6,
            select: {
                id: true,
                title: true,
                description: true,
                scheduledDate: true,
                lectureType: true,
                class: { select: { name: true } },
                subject: { select: { name: true } }
            },
            orderBy: { scheduledDate: 'desc' }
        }).catch(() => []) : Promise.resolve([])
    ]);

    const totalResults =
        meetings.length +
        assignments.length +
        documents.length +
        notes.length +
        users.length +
        classes.length +
        trainingModules.length +
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
                tickets,
                labs,
                plans
            }
        }
    });
}));

module.exports = router;
