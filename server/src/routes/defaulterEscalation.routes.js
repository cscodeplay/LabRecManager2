const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const defaulterEscalationService = require('../services/defaulterEscalation.service');
const parentNotificationService = require('../services/parentNotification.service');

/**
 * @route   GET /api/defaulter-escalation/status
 * @desc    Get system status, gateway configuration & summary counts
 * @access  Private (Admin, Principal, Instructor)
 */
router.get('/status', authenticate, asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const defaulters = await defaulterEscalationService.scanDefaulters({ schoolId });

    const levelCounts = { level1: 0, level2: 0, level3: 0 };
    let totalPendingItems = 0;

    defaulters.forEach(d => {
        if (d.escalationLevel === 3) levelCounts.level3++;
        else if (d.escalationLevel === 2) levelCounts.level2++;
        else levelCounts.level1++;
        totalPendingItems += d.items.length;
    });

    res.json({
        success: true,
        data: {
            totalDefaulters: defaulters.length,
            totalPendingItems,
            levelCounts,
            gateways: {
                whatsApp: {
                    configured: parentNotificationService.isWhatsAppConfigured(),
                    mode: parentNotificationService.isWhatsAppConfigured() ? 'live_twilio' : 'simulated_fallback'
                },
                email: {
                    configured: true,
                    mode: 'nodemailer_resend_smtp'
                },
                sms: {
                    configured: parentNotificationService.isSmsConfigured(),
                    mode: parentNotificationService.isSmsConfigured() ? 'live_gateway' : 'simulated_fallback'
                }
            }
        }
    });
}));

/**
 * @route   GET /api/defaulter-escalation/scan
 * @desc    Scan and retrieve all current academic and practical defaulters
 * @access  Private (Admin, Principal, Instructor)
 */
router.get('/scan', authenticate, asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { classId, threshold } = req.query;

    const defaulters = await defaulterEscalationService.scanDefaulters({
        schoolId,
        classId: classId || null,
        daysOverdueThreshold: threshold ? parseInt(threshold) : 1
    });

    res.json({
        success: true,
        count: defaulters.length,
        data: defaulters
    });
}));

/**
 * @route   POST /api/defaulter-escalation/dispatch
 * @desc    Trigger notifications to selected students or entire class/defaulter cohort
 * @access  Private (Admin, Principal, Instructor)
 */
router.post('/dispatch', authenticate, asyncHandler(async (req, res) => {
    const schoolId = req.user.schoolId;
    const { classId, studentIds, forceChannels, dryRun } = req.body;

    const result = await defaulterEscalationService.dispatchEscalations({
        schoolId,
        classId,
        studentIds,
        forceChannels,
        dryRun: Boolean(dryRun),
        triggeredBy: req.user.id
    });

    res.json({
        success: true,
        message: dryRun
            ? `Simulation complete for ${result.totalIdentified} defaulter(s).`
            : `Successfully dispatched parent notifications for ${result.dispatched} student(s).`,
        data: result
    });
}));

/**
 * @route   GET /api/defaulter-escalation/logs
 * @desc    Retrieve recent multi-channel dispatch audit logs
 * @access  Private (Admin, Principal, Instructor)
 */
router.get('/logs', authenticate, asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 30;
    const logs = parentNotificationService.getRecentLogs(limit);

    res.json({
        success: true,
        count: logs.length,
        data: logs
    });
}));

module.exports = router;
