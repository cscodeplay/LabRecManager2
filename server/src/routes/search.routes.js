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

    // Concurrently execute searches across all 10 domains with robust error handling
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
                    { meetingLink: textFilter }
                ]
            },
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
            where: {
                schoolId,
                OR: [
                    { title: textFilter },
                    { titleHindi: textFilter },
                    { description: textFilter },
                    { aim: textFilter }
                ]
            },
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
            where: {
                schoolId,
                deletedAt: null,
                OR: [
                    { name: textFilter },
                    { fileName: textFilter },
                    { description: textFilter },
                    { category: textFilter }
                ]
            },
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

        // 4. Notes (Admin Notes)
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

        // 5. Users (Students, Instructors, Admins)
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
            where: {
                schoolId,
                OR: [
                    { name: textFilter },
                    { nameHindi: textFilter },
                    { section: textFilter },
                    { stream: textFilter }
                ]
            },
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
            where: {
                schoolId,
                OR: [
                    { title: textFilter },
                    { titleHindi: textFilter },
                    { description: textFilter },
                    { language: textFilter }
                ]
            },
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

        // 8. Tickets
        prisma.ticket.findMany({
            where: {
                createdBy: { schoolId },
                OR: [
                    { title: textFilter },
                    { description: textFilter },
                    { ticketNumber: textFilter }
                ]
            },
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

        // 9. Labs & Rooms
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

        // 10. Teaching / Lecture Plans
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
