/**
 * Audit Logs Routes
 * API endpoints for viewing and managing audit logs
 */
const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   GET /api/audit/logs
 * @desc    Get paginated audit logs with filters
 * @access  Private (Admin/Principal)
 */
router.get('/logs', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const {
        page = 1,
        limit = 50,
        action,
        entityType,
        userId,
        startDate,
        endDate,
        search
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    let where = { schoolId };

    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
        where.OR = [
            { entityName: { contains: search, mode: 'insensitive' } },
            { action: { contains: search, mode: 'insensitive' } },
            { entityType: { contains: search, mode: 'insensitive' } }
        ];
    }

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            skip,
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } }
            }
        }),
        prisma.auditLog.count({ where })
    ]);

    res.json({
        success: true,
        data: {
            logs,
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
 * @route   GET /api/audit/logs/entity/:entityType/:entityId
 * @desc    Get audit history for a specific entity
 * @access  Private (Admin/Principal)
 */
router.get('/logs/entity/:entityType/:entityId', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.params;
    const schoolId = req.user.schoolId;

    const logs = await prisma.auditLog.findMany({
        where: {
            schoolId,
            entityType,
            entityId
        },
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { id: true, firstName: true, lastName: true } }
        },
        take: 100
    });

    res.json({
        success: true,
        data: { logs }
    });
}));

/**
 * @route   GET /api/audit/stats
 * @desc    Get audit log statistics
 * @access  Private (Admin/Principal)
 */
router.get('/stats', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Count logs by action type in last 24h
    const actionCounts = await prisma.auditLog.groupBy({
        by: ['action'],
        where: {
            schoolId,
            createdAt: { gte: last24h }
        },
        _count: { id: true }
    });

    // Count logs by entity type in last 7 days
    const entityCounts = await prisma.auditLog.groupBy({
        by: ['entityType'],
        where: {
            schoolId,
            createdAt: { gte: last7d }
        },
        _count: { id: true }
    });

    // Total counts
    const [total24h, total7d, totalAll] = await Promise.all([
        prisma.auditLog.count({ where: { schoolId, createdAt: { gte: last24h } } }),
        prisma.auditLog.count({ where: { schoolId, createdAt: { gte: last7d } } }),
        prisma.auditLog.count({ where: { schoolId } })
    ]);

    res.json({
        success: true,
        data: {
            totals: { last24h: total24h, last7d: total7d, all: totalAll },
            byAction: actionCounts.map(a => ({ action: a.action, count: a._count.id })),
            byEntityType: entityCounts.map(e => ({ entityType: e.entityType, count: e._count.id }))
        }
    });
}));

/**
 * @route   GET /api/audit/actions
 * @desc    Get list of available audit actions
 * @access  Private (Admin/Principal)
 */
router.get('/actions', authenticate, authorize('admin', 'principal'), asyncHandler(async (req, res) => {
    const { AUDIT_ACTIONS, ENTITY_TYPES } = require('../middleware/audit');

    res.json({
        success: true,
        data: {
            actions: Object.values(AUDIT_ACTIONS),
            entityTypes: Object.values(ENTITY_TYPES)
        }
    });
}));

module.exports = router;
