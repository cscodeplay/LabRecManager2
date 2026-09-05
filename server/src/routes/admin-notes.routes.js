const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const aiService = require('../services/ai.service');

// Require authentication for all routes
router.use(authenticate);
// Restrict to admin and principal roles
router.use(authorize('admin', 'principal'));

/**
 * @route   GET /api/admin-notes
 * @desc    Get all admin notes with optional search, sort, and pagination
 * @access  Private (Admin/Principal)
 */
router.get('/', asyncHandler(async (req, res) => {
    const { search, sortBy = 'createdAt', sortOrder = 'desc', page, limit } = req.query;

    const where = {};
    if (search && search.trim()) {
        const query = search.trim();
        where.OR = [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
            {
                author: {
                    OR: [
                        { firstName: { contains: query, mode: 'insensitive' } },
                        { lastName: { contains: query, mode: 'insensitive' } },
                        { email: { contains: query, mode: 'insensitive' } }
                    ]
                }
            }
        ];
    }

    // Build orderBy
    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'title') {
        orderBy = { title: sortOrder === 'asc' ? 'asc' : 'desc' };
    } else if (sortBy === 'updatedAt') {
        orderBy = { updatedAt: sortOrder === 'asc' ? 'asc' : 'desc' };
    } else if (sortBy === 'createdAt') {
        orderBy = { createdAt: sortOrder === 'asc' ? 'asc' : 'desc' };
    }

    // Check pagination
    if (page && limit) {
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.max(1, parseInt(limit, 10) || 10);
        const skip = (pageNum - 1) * limitNum;

        const [total, notes] = await Promise.all([
            prisma.adminNote.count({ where }),
            prisma.adminNote.findMany({
                where,
                orderBy,
                skip,
                take: limitNum,
                include: {
                    author: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    }
                }
            })
        ]);

        return res.json({
            success: true,
            data: notes,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    }

    const notes = await prisma.adminNote.findMany({
        where,
        orderBy,
        include: {
            author: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });
    res.json({ success: true, data: notes });
}));

/**
 * @route   POST /api/admin-notes
 * @desc    Create a new admin note
 * @access  Private (Admin/Principal)
 */
router.post('/', asyncHandler(async (req, res) => {
    const { title, content } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({ success: false, error: 'Title and content are required' });
    }

    const note = await prisma.adminNote.create({
        data: {
            title,
            content,
            authorId: req.user.id
        },
        include: {
            author: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });
    
    res.status(201).json({ success: true, data: note });
}));

/**
 * @route   PUT /api/admin-notes/:id
 * @desc    Update an admin note
 * @access  Private (Admin/Principal)
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const { title, content } = req.body;
    const { id } = req.params;

    // Check if note exists
    const existingNote = await prisma.adminNote.findUnique({ where: { id } });
    if (!existingNote) {
        return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const note = await prisma.adminNote.update({
        where: { id },
        data: {
            title: title !== undefined ? title : existingNote.title,
            content: content !== undefined ? content : existingNote.content
        },
        include: {
            author: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true
                }
            }
        }
    });

    res.json({ success: true, data: note });
}));

/**
 * @route   DELETE /api/admin-notes/:id
 * @desc    Delete an admin note
 * @access  Private (Admin/Principal)
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existingNote = await prisma.adminNote.findUnique({ where: { id } });
    if (!existingNote) {
        return res.status(404).json({ success: false, error: 'Note not found' });
    }

    await prisma.adminNote.delete({
        where: { id }
    });

    res.json({ success: true, data: {} });
}));

/**
 * @route   POST /api/admin-notes/ai-assist
 * @desc    AI Note Assistant: Write, Rewrite, Bulletize, Number, Polish, Summarize, Expand
 * @access  Private (Admin/Principal)
 */
router.post('/ai-assist', asyncHandler(async (req, res) => {
    const { action = 'write', prompt = '', content = '', title = '', tone = 'professional' } = req.body;

    try {
        const result = await aiService.assistAdminNotes({
            action,
            prompt,
            content,
            title,
            tone
        });

        res.json({
            success: true,
            data: result
        });
    } catch (err) {
        console.error('Admin Notes AI Assist Error:', err.message);
        res.status(500).json({
            success: false,
            message: err.message || 'Failed to generate note content using AI.',
            error: err.message
        });
    }
}));

module.exports = router;

