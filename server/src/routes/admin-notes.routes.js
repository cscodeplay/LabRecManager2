const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Require authentication for all routes
router.use(authenticate);
// Restrict to admin and principal roles
router.use(authorize('admin', 'principal'));

/**
 * @route   GET /api/admin-notes
 * @desc    Get all admin notes
 * @access  Private (Admin/Principal)
 */
router.get('/', asyncHandler(async (req, res) => {
    const notes = await prisma.adminNote.findMany({
        orderBy: {
            createdAt: 'desc'
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

module.exports = router;
