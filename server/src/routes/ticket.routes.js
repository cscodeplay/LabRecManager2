const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const notificationService = require('../services/notificationService');

const isValidUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

/**
 * Generate unique ticket number (TKT-000001 format) with collision safety
 */
async function generateTicketNumber() {
    const lastTicket = await prisma.ticket.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { ticketNumber: true }
    });
    let nextNum = 1;
    if (lastTicket?.ticketNumber?.startsWith('TKT-')) {
        const parsed = parseInt(lastTicket.ticketNumber.replace('TKT-', ''), 10);
        if (!isNaN(parsed)) {
            nextNum = parsed + 1;
        }
    }
    const count = await prisma.ticket.count();
    if (count >= nextNum) {
        nextNum = count + 1;
    }

    let candidate = `TKT-${String(nextNum).padStart(6, '0')}`;
    while (await prisma.ticket.findUnique({ where: { ticketNumber: candidate } })) {
        nextNum++;
        candidate = `TKT-${String(nextNum).padStart(6, '0')}`;
    }
    return candidate;
}

/**
 * @route   GET /api/tickets/issue-types
 * @desc    Get all issue types (optionally filtered by category)
 * @access  Private
 */
router.get('/issue-types', authenticate, asyncHandler(async (req, res) => {
    const { category } = req.query;
    const where = { isActive: true };

    if (category) {
        where.category = category;
    }

    const issueTypes = await prisma.ticketIssueType.findMany({
        where,
        orderBy: [
            { category: 'asc' },
            { displayOrder: 'asc' }
        ]
    });

    // Group by category for easier frontend use
    const grouped = issueTypes.reduce((acc, type) => {
        if (!acc[type.category]) acc[type.category] = [];
        acc[type.category].push(type);
        return acc;
    }, {});

    res.json({
        success: true,
        data: {
            issueTypes,
            byCategory: grouped
        }
    });
}));

/**
 * @route   POST /api/tickets
 * @desc    Create a new ticket
 * @access  Private (Any authenticated user)
 */
router.post('/', authenticate, [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').optional({ values: 'falsy' }).isIn(['hardware_issue', 'software_issue', 'maintenance_request', 'general_complaint', 'other']),
    body('priority').optional({ values: 'falsy' }).isIn(['low', 'medium', 'high', 'critical']),
    body('itemId').optional({ values: 'falsy' }).custom(val => !val || isValidUuid(val)).withMessage('Invalid item ID format'),
    body('labId').optional({ values: 'falsy' }).custom(val => !val || isValidUuid(val)).withMessage('Invalid lab ID format'),
    body('issueTypeId').optional({ values: 'falsy' }).custom(val => !val || isValidUuid(val)).withMessage('Invalid issue type ID format'),
    body('academicYearId').optional({ values: 'falsy' }).custom(val => !val || isValidUuid(val)).withMessage('Invalid academic year ID format')
], asyncHandler(async (req, res) => {
    console.log('=== POST /api/tickets - Create Ticket ===');
    console.log('User:', req.user?.email, 'Role:', req.user?.role, 'ID:', req.user?.id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
        return res.status(400).json({ success: false, errors: errors.array(), message: errors.array()[0]?.msg || 'Validation failed' });
    }

    const { title, description, category, priority, itemId, labId, issueTypeId, academicYearId } = req.body;

    // Resolve academic year: explicit body param > X-Academic-Session header > school's current active session
    let resolvedYearId = academicYearId || req.headers['x-academic-session'] || null;
    if (!isValidUuid(resolvedYearId)) {
        resolvedYearId = null;
    }
    if (!resolvedYearId && req.user?.schoolId) {
        const currentYear = await prisma.academicYear.findFirst({
            where: { schoolId: req.user.schoolId, isCurrent: true }
        });
        if (currentYear) resolvedYearId = currentYear.id;
    }

    console.log('Parsed values:', { title, description, category, priority, itemId, labId, issueTypeId, academicYearId: resolvedYearId });

    try {
        const ticketNumber = await generateTicketNumber();
        console.log('Generated ticket number:', ticketNumber);

        const validCategories = ['hardware_issue', 'software_issue', 'maintenance_request', 'general_complaint', 'other'];
        const validPriorities = ['low', 'medium', 'high', 'critical'];

        const ticketData = {
            ticketNumber,
            title: title.trim(),
            description: description.trim(),
            category: category && validCategories.includes(category) ? category : 'other',
            priority: priority && validPriorities.includes(priority) ? priority : 'medium',
            status: 'open',
            itemId: itemId && isValidUuid(itemId) ? itemId : null,
            labId: labId && isValidUuid(labId) ? labId : null,
            issueTypeId: issueTypeId && isValidUuid(issueTypeId) ? issueTypeId : null,
            academicYearId: resolvedYearId && isValidUuid(resolvedYearId) ? resolvedYearId : null,
            createdById: req.user.id
        };
        console.log('Ticket data to create:', JSON.stringify(ticketData, null, 2));

        const ticket = await prisma.ticket.create({
            data: ticketData,
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
                item: { select: { id: true, itemNumber: true, itemType: true, brand: true, modelNo: true, serialNo: true, specs: true } },
                lab: { select: { id: true, name: true, roomNumber: true } },
                issueType: { select: { id: true, name: true, category: true } }
            }
        });

        console.log('Ticket created successfully:', ticket.id, ticket.ticketNumber);

        res.status(201).json({
            success: true,
            message: `Ticket ${ticket.ticketNumber} created successfully`,
            data: { ticket }
        });

        // Notify admins about new ticket (after response)
        try {
            const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
            await notificationService.notifyAdmins({
                title: `New Ticket: ${ticket.ticketNumber}`,
                message: `${ticket.createdBy.firstName} ${ticket.createdBy.lastName} (${ticket.createdBy.role}) created ticket "${ticket.title}" at ${timestamp}`,
                type: 'ticket_created',
                referenceType: 'ticket',
                referenceId: ticket.id,
                actionUrl: '/tickets'
            });
        } catch (notifyError) {
            console.warn('Failed to send ticket creation notification:', notifyError.message);
        }
    } catch (error) {
        console.error('=== ERROR creating ticket ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error stack:', error.stack);
        throw error;
    }
}));

/**
 * @route   GET /api/tickets
 * @desc    Get all tickets (with filters)
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const { status, priority, category, labId, myTickets, academicYearId, all, page = 1, limit = 20 } = req.query;
    const rawSessionId = all === 'true' ? null : (academicYearId || req.headers['x-academic-session']);
    const sessionId = isValidUuid(rawSessionId) ? rawSessionId : null;
    const where = {};

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const validCategories = ['hardware_issue', 'software_issue', 'maintenance_request', 'general_complaint', 'other'];

    // Filter by academic session
    if (sessionId) {
        where.academicYearId = sessionId;
    }

    // Filter by status (strict enum checking)
    if (status && status !== 'all' && validStatuses.includes(status)) {
        where.status = status;
    }

    // Filter by priority (strict enum checking)
    if (priority && priority !== 'all' && validPriorities.includes(priority)) {
        where.priority = priority;
    }

    // Filter by category (strict enum checking)
    if (category && category !== 'all' && validCategories.includes(category)) {
        where.category = category;
    }

    // Filter by lab
    if (labId && isValidUuid(labId)) {
        where.labId = labId;
    }

    // Filter to show only user's tickets
    if (myTickets === 'true') {
        where.createdById = req.user.id;
    }

    // Role-based filtering
    const userRole = req.user.role;
    if (userRole === 'student') {
        // Students can only see their own tickets
        where.createdById = req.user.id;
    } else if (userRole === 'instructor') {
        // Instructors see their tickets and tickets from their classes (TODO: enhance)
        where.OR = [
            { createdById: req.user.id },
            { assignedToId: req.user.id }
        ];
    }
    // Admins, principals, lab_assistants can see all tickets

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tickets, total] = await Promise.all([
        prisma.ticket.findMany({
            where,
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
                assignedTo: { select: { id: true, firstName: true, lastName: true } },
                item: { select: { id: true, itemNumber: true, itemType: true, brand: true, modelNo: true, serialNo: true, specs: true } },
                lab: { select: { id: true, name: true, roomNumber: true } },
                academicYear: { select: { id: true, yearLabel: true, isCurrent: true } },
                _count: { select: { comments: true } }
            },
            orderBy: [
                { status: 'asc' }, // Open tickets first
                { priority: 'desc' }, // Critical first
                { createdAt: 'desc' }
            ],
            skip,
            take: parseInt(limit)
        }),
        prisma.ticket.count({ where })
    ]);

    res.json({
        success: true,
        data: {
            tickets,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        }
    });
}));

/**
 * @route   GET /api/tickets/stats
 * @desc    Get ticket statistics
 * @access  Private (Admin/Lab Assistant)
 */
router.get('/stats', authenticate, authorize('admin', 'principal', 'lab_assistant'), asyncHandler(async (req, res) => {
    const { academicYearId, all } = req.query;
    const rawSessionId = all === 'true' ? null : (academicYearId || req.headers['x-academic-session']);
    const sessionId = isValidUuid(rawSessionId) ? rawSessionId : null;
    const statsWhere = sessionId ? { academicYearId: sessionId } : {};

    const [byStatus, byPriority, byCategory, recentActivity] = await Promise.all([
        prisma.ticket.groupBy({
            by: ['status'],
            where: statsWhere,
            _count: { id: true }
        }),
        prisma.ticket.groupBy({
            by: ['priority'],
            where: statsWhere,
            _count: { id: true }
        }),
        prisma.ticket.groupBy({
            by: ['category'],
            where: statsWhere,
            _count: { id: true }
        }),
        prisma.ticket.findMany({
            where: {
                ...statsWhere,
                updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            },
            select: { id: true, ticketNumber: true, title: true, status: true, updatedAt: true, academicYear: { select: { id: true, yearLabel: true } } },
            orderBy: { updatedAt: 'desc' },
            take: 10
        })
    ]);

    res.json({
        success: true,
        data: {
            byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count.id }), {}),
            byPriority: byPriority.reduce((acc, p) => ({ ...acc, [p.priority]: p._count.id }), {}),
            byCategory: byCategory.reduce((acc, c) => ({ ...acc, [c.category]: c._count.id }), {}),
            recentActivity
        }
    });
}));

/**
 * @route   GET /api/tickets/:id
 * @desc    Get ticket by ID with comments
 * @access  Private
 */
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        include: {
            createdBy: { select: { id: true, firstName: true, lastName: true, role: true, email: true } },
            assignedTo: { select: { id: true, firstName: true, lastName: true, role: true } },
            resolvedBy: { select: { id: true, firstName: true, lastName: true } },
            item: { select: { id: true, itemNumber: true, itemType: true, brand: true, modelNo: true, serialNo: true, specs: true, lab: { select: { id: true, name: true } } } },
            lab: { select: { id: true, name: true, roomNumber: true } },
            academicYear: { select: { id: true, yearLabel: true, isCurrent: true, startDate: true, endDate: true } },
            comments: {
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, role: true } }
                },
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Check access for students
    if (req.user.role === 'student' && ticket.createdById !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: { ticket } });
}));

/**
 * @route   PUT /api/tickets/:id
 * @desc    Update ticket (status, assign, priority)
 * @access  Private (Admin/Lab Assistant)
 */
router.put('/:id', authenticate, authorize('admin', 'principal', 'lab_assistant', 'instructor'), asyncHandler(async (req, res) => {
    const { status, priority, assignedToId } = req.body;

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;

    const updated = await prisma.ticket.update({
        where: { id: req.params.id },
        data: updateData,
        include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
            assignedTo: { select: { id: true, firstName: true, lastName: true } }
        }
    });

    res.json({
        success: true,
        message: 'Ticket updated',
        data: { ticket: updated }
    });
}));

/**
 * @route   PUT /api/tickets/:id/resolve
 * @desc    Resolve a ticket
 * @access  Private (Admin/Lab Assistant)
 */
router.put('/:id/resolve', authenticate, authorize('admin', 'principal', 'lab_assistant'), [
    body('resolutionNotes').optional().isString()
], asyncHandler(async (req, res) => {
    const { resolutionNotes } = req.body;

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const resolved = await prisma.ticket.update({
        where: { id: req.params.id },
        data: {
            status: 'resolved',
            resolvedById: req.user.id,
            resolvedAt: new Date(),
            resolutionNotes: resolutionNotes || null
        },
        include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
            resolvedBy: { select: { id: true, firstName: true, lastName: true } }
        }
    });

    res.json({
        success: true,
        message: `Ticket ${resolved.ticketNumber} resolved`,
        data: { ticket: resolved }
    });

    // Send notification to ticket creator (after response to not delay)
    try {
        await notificationService.createNotification({
            userId: ticket.createdById,
            title: `Ticket Resolved: ${resolved.ticketNumber}`,
            message: `Your ticket "${resolved.title}" has been resolved.${resolutionNotes ? ` Notes: ${resolutionNotes}` : ''}`,
            type: 'ticket_resolved',
            referenceType: 'ticket',
            referenceId: resolved.id,
            actionUrl: '/tickets'
        });
    } catch (notifyError) {
        console.warn('Failed to send ticket resolution notification:', notifyError.message);
    }
}));

/**
 * @route   PUT /api/tickets/:id/close
 * @desc    Close a ticket
 * @access  Private (Admin/Ticket Creator)
 */
router.put('/:id/close', authenticate, asyncHandler(async (req, res) => {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Only admin or ticket creator can close
    if (req.user.role !== 'admin' && req.user.role !== 'principal' && ticket.createdById !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Only admins or ticket creator can close tickets' });
    }

    const closed = await prisma.ticket.update({
        where: { id: req.params.id },
        data: { status: 'closed' }
    });

    res.json({
        success: true,
        message: `Ticket ${closed.ticketNumber} closed`,
        data: { ticket: closed }
    });
}));

/**
 * @route   POST /api/tickets/:id/comments
 * @desc    Add comment to ticket
 * @access  Private
 */
router.post('/:id/comments', authenticate, [
    body('content').trim().notEmpty().withMessage('Comment content is required')
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.id },
        select: { id: true, ticketNumber: true, title: true, createdById: true }
    });
    if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    // Check access for students
    if (req.user.role === 'student' && ticket.createdById !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const comment = await prisma.ticketComment.create({
        data: {
            ticketId: req.params.id,
            userId: req.user.id,
            content: req.body.content
        },
        include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true } }
        }
    });

    // Update ticket's updatedAt
    await prisma.ticket.update({
        where: { id: req.params.id },
        data: { updatedAt: new Date() }
    });

    res.status(201).json({
        success: true,
        message: 'Comment added',
        data: { comment }
    });

    // Notify concerned parties about new comment (after response)
    try {
        const commenterName = `${comment.user.firstName} ${comment.user.lastName}`;
        const isAdmin = ['admin', 'principal', 'lab_assistant', 'instructor'].includes(req.user.role);

        if (isAdmin) {
            // Admin/instructor commented - notify the ticket creator (student)
            await notificationService.createNotification({
                userId: ticket.createdById,
                title: `Comment on Ticket: ${ticket.ticketNumber}`,
                message: `${commenterName} commented on your ticket "${ticket.title}"`,
                type: 'ticket_comment',
                referenceType: 'ticket',
                referenceId: ticket.id,
                actionUrl: '/tickets'
            });
        } else {
            // Student commented - notify admins and assigned person
            await notificationService.notifyAdmins({
                title: `Comment on Ticket: ${ticket.ticketNumber}`,
                message: `${commenterName} commented on ticket "${ticket.title}"`,
                type: 'ticket_comment',
                referenceType: 'ticket',
                referenceId: ticket.id,
                actionUrl: '/tickets'
            });
        }
    } catch (notifyError) {
        console.warn('Failed to send comment notification:', notifyError.message);
    }
}));

/**
 * @route   DELETE /api/tickets/:id
 * @desc    Delete a ticket
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    await prisma.ticket.delete({ where: { id: req.params.id } });

    res.json({
        success: true,
        message: `Ticket ${ticket.ticketNumber} deleted`
    });
}));

module.exports = router;
