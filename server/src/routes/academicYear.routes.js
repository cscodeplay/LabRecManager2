const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/academic-years
 * @desc    Get all academic years for user's school
 * @access  Private
 */
router.get('/', authenticate, asyncHandler(async (req, res) => {
    const { schoolId } = req.user;

    const academicYears = await prisma.academicYear.findMany({
        where: { schoolId },
        orderBy: { startDate: 'desc' }
    });

    res.json({
        success: true,
        data: { academicYears }
    });
}));

/**
 * @route   GET /api/academic-years/current
 * @desc    Get current academic year
 * @access  Private
 */
router.get('/current', authenticate, asyncHandler(async (req, res) => {
    const { schoolId } = req.user;

    const academicYear = await prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true }
    });

    res.json({
        success: true,
        data: { academicYear }
    });
}));

/**
 * @route   POST /api/academic-years
 * @desc    Create a new academic year (manual or auto-calculated)
 * @access  Private (Admin, Principal)
 *
 * Body options:
 *   Auto mode (default):  { startDate?: "2026-04-01" }
 *     - startDate defaults to April 1 of the current calendar year
 *     - endDate auto-calculated as (startDate + 1 year - 1 day)
 *     - yearLabel auto-generated as "2026-27"
 *
 *   Manual mode: { yearLabel, startDate, endDate }
 */
router.post('/', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { schoolId } = req.user;
    let { yearLabel, startDate, endDate, isCurrent } = req.body;

    // Auto-compute startDate if not provided: default to April 1 of current year
    if (!startDate) {
        const now = new Date();
        const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1; // Apr=3
        startDate = `${year}-04-01`;
    }

    const start = new Date(startDate);

    // Auto-compute endDate if not provided: start + 1 year - 1 day
    if (!endDate) {
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);
        end.setDate(end.getDate() - 1);
        endDate = end.toISOString().split('T')[0];
    }

    const end = new Date(endDate);

    // Auto-compute yearLabel if not provided: "2026-27"
    if (!yearLabel) {
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
        yearLabel = `${startYear}-${String(endYear).slice(-2)}`;
    }

    // Check for duplicate: same school + overlapping label
    const existing = await prisma.academicYear.findFirst({
        where: { schoolId, yearLabel }
    });
    if (existing) {
        return res.status(400).json({
            success: false,
            message: `Session "${yearLabel}" already exists for this school`
        });
    }

    // If setting as current, unset other current years
    // Default: first session created is always current; subsequent ones are not unless explicitly set
    const sessionCount = await prisma.academicYear.count({ where: { schoolId } });
    const shouldBeCurrent = isCurrent !== undefined ? isCurrent : sessionCount === 0;

    if (shouldBeCurrent) {
        await prisma.academicYear.updateMany({
            where: { schoolId, isCurrent: true },
            data: { isCurrent: false }
        });
    }

    const academicYear = await prisma.academicYear.create({
        data: {
            schoolId,
            yearLabel,
            startDate: start,
            endDate: end,
            isCurrent: shouldBeCurrent
        }
    });

    res.status(201).json({
        success: true,
        message: `Academic session ${yearLabel} created successfully`,
        data: { academicYear }
    });
}));

/**
 * @route   PUT /api/academic-years/:id
 * @desc    Update an academic year (edit dates)
 * @access  Private (Admin, Principal)
 */
router.put('/:id', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { schoolId } = req.user;
    const { id } = req.params;
    let { yearLabel, startDate, endDate } = req.body;

    // Verify ownership
    const existing = await prisma.academicYear.findFirst({
        where: { id, schoolId }
    });
    if (!existing) {
        return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    const updateData = {};

    if (startDate) {
        const start = new Date(startDate);
        updateData.startDate = start;

        // Auto-recalculate endDate when startDate changes (unless endDate explicitly provided)
        if (!endDate) {
            const calcEnd = new Date(start);
            calcEnd.setFullYear(calcEnd.getFullYear() + 1);
            calcEnd.setDate(calcEnd.getDate() - 1);
            updateData.endDate = calcEnd;
        }

        // Auto-recalculate yearLabel
        const endForLabel = updateData.endDate || (endDate ? new Date(endDate) : existing.endDate);
        updateData.yearLabel = `${start.getFullYear()}-${String(new Date(endForLabel).getFullYear()).slice(-2)}`;
    }

    if (endDate) {
        updateData.endDate = new Date(endDate);
    }

    if (yearLabel) {
        updateData.yearLabel = yearLabel;
    }

    const academicYear = await prisma.academicYear.update({
        where: { id },
        data: updateData
    });

    res.json({
        success: true,
        message: 'Academic year updated successfully',
        data: { academicYear }
    });
}));

/**
 * @route   PUT /api/academic-years/:id/set-current
 * @desc    Set an academic year as current
 * @access  Private (Admin, Principal)
 */
router.put('/:id/set-current', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { schoolId } = req.user;
    const { id } = req.params;

    // Unset current on all other years
    await prisma.academicYear.updateMany({
        where: { schoolId, isCurrent: true },
        data: { isCurrent: false }
    });

    // Set this year as current
    const academicYear = await prisma.academicYear.update({
        where: { id },
        data: { isCurrent: true }
    });

    res.json({
        success: true,
        message: 'Academic year set as current',
        data: { academicYear }
    });
}));

/**
 * @route   DELETE /api/academic-years/:id
 * @desc    Delete an academic year (only if no data attached)
 * @access  Private (Admin, Principal)
 */
router.delete('/:id', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { schoolId } = req.user;
    const { id } = req.params;

    const existing = await prisma.academicYear.findFirst({
        where: { id, schoolId },
        include: {
            _count: {
                select: { classes: true, assignments: true, timetables: true }
            }
        }
    });

    if (!existing) {
        return res.status(404).json({ success: false, message: 'Academic year not found' });
    }

    const totalRelated = existing._count.classes + existing._count.assignments + existing._count.timetables;
    if (totalRelated > 0) {
        return res.status(400).json({
            success: false,
            message: `Cannot delete: ${existing._count.classes} classes, ${existing._count.assignments} assignments, and ${existing._count.timetables} timetables are linked to this session.`
        });
    }

    await prisma.academicYear.delete({ where: { id } });

    res.json({
        success: true,
        message: 'Academic year deleted successfully'
    });
}));

module.exports = router;
