const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const exportService = require('../services/implementation-export.service');
const emailService = require('../services/email.service');

// Require authentication and restrict to admin or principal roles
router.use(authenticate);
router.use(authorize('admin', 'principal'));

/**
 * Helper to normalize and format a raw implementation plan record
 */
function formatPlan(row) {
    let tasks = [];
    if (row.tasks) {
        if (Array.isArray(row.tasks)) {
            tasks = row.tasks;
        } else if (typeof row.tasks === 'string') {
            try {
                tasks = JSON.parse(row.tasks);
            } catch (e) {
                tasks = [];
            }
        }
    }

    let metadata = {};
    if (row.metadata) {
        if (typeof row.metadata === 'object') {
            metadata = row.metadata;
        } else if (typeof row.metadata === 'string') {
            try {
                metadata = JSON.parse(row.metadata);
            } catch (e) {
                metadata = {};
            }
        }
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (row.status === 'completed' ? 100 : 0);

    const duration = exportService.calculateDuration(row.started_at, row.ended_at);

    const serialNo = Number(row.serial_no || (index !== undefined ? index + 1 : 1));
    const serialId = metadata.serial_id || `PLAN-${String(serialNo).padStart(3, '0')}`;

    // Ensure tasks have structured sequential IDs
    tasks = tasks.map((t, idx) => ({
        ...t,
        task_num: idx + 1,
        serial_id: t.id || `${serialId}-T${idx + 1}`
    }));

    return {
        id: row.id,
        serial_no: serialNo,
        serial_id: serialId,
        school_id: row.school_id,
        created_by_id: row.created_by_id,
        title: row.title,
        description: row.description || '',
        category: row.category || 'General',
        status: row.status,
        started_at: row.started_at,
        ended_at: row.ended_at,
        duration,
        tasks,
        totalTasks,
        completedTasks,
        progress,
        outcomes: row.outcomes || '',
        metadata: {
            ...metadata,
            serial_id: serialId,
            serial_no: serialNo
        },
        created_at: row.created_at,
        updated_at: row.updated_at,
        creator: row.first_name ? {
            name: `${row.first_name} ${row.last_name || ''}`.trim(),
            email: row.creator_email
        } : null
    };
}

/**
 * Helper to fetch plans matching criteria
 */
async function fetchPlansWithFilters({ status, category, search, startDate, endDate, planId, schoolId }) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (planId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(planId).trim());
        if (isUuid) {
            conditions.push(`rp.id = $${idx++}::uuid`);
            values.push(String(planId).trim());
        } else {
            const cleanId = String(planId).trim().toLowerCase();
            const cleanNum = cleanId.replace(/\D/g, '') || '-1';
            conditions.push(`(
                LOWER(COALESCE(rp.metadata->>'serial_id', '')) = $${idx} OR 
                LOWER(rp.title) LIKE $${idx + 1} OR
                rp.serial_no::text = $${idx + 2}
            )`);
            values.push(cleanId, `%${cleanId}%`, cleanNum);
            idx += 3;
        }
    }

    if (status && status !== 'all') {
        conditions.push(`rp.status = $${idx++}`);
        values.push(status);
    }

    if (category && category !== 'all') {
        conditions.push(`rp.category = $${idx++}`);
        values.push(category);
    }

    if (search && search.trim()) {
        const query = `%${search.trim().toLowerCase()}%`;
        conditions.push(`(
            LOWER(rp.title) LIKE $${idx} OR 
            LOWER(COALESCE(rp.description, '')) LIKE $${idx} OR 
            LOWER(rp.category) LIKE $${idx} OR 
            LOWER(COALESCE(rp.metadata->>'serial_id', '')) LIKE $${idx} OR
            LOWER('plan-' || LPAD(rp.serial_no::text, 3, '0')) LIKE $${idx} OR
            ('#' || rp.serial_no::text) LIKE $${idx} OR
            LOWER(COALESCE(rp.outcomes, '')) LIKE $${idx}
        )`);
        values.push(query);
        idx++;
    }

    if (startDate) {
        conditions.push(`rp.started_at >= $${idx++}::timestamp`);
        values.push(new Date(startDate).toISOString());
    }

    if (endDate) {
        conditions.push(`rp.ended_at <= $${idx++}::timestamp`);
        values.push(new Date(endDate).toISOString());
    }

    if (schoolId) {
        conditions.push(`(rp.school_id = $${idx++}::uuid OR rp.school_id IS NULL)`);
        values.push(schoolId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
        WITH ranked_plans AS (
            SELECT p.*,
                   DENSE_RANK() OVER (ORDER BY p.created_at ASC) as serial_no
            FROM implementation_plans p
        )
        SELECT rp.*, u.first_name, u.last_name, u.email as creator_email
        FROM ranked_plans rp
        LEFT JOIN users u ON rp.created_by_id = u.id
        ${whereClause}
        ORDER BY 
            CASE 
                WHEN rp.status = 'in_progress' THEN 1
                WHEN rp.status = 'draft' THEN 2
                WHEN rp.status = 'on_hold' THEN 3
                WHEN rp.status = 'completed' THEN 4
                ELSE 5
            END,
            COALESCE(rp.started_at, rp.created_at) DESC
    `;

    const rows = await prisma.$queryRawUnsafe(sql, ...values);
    return rows.map((r, i) => formatPlan(r, i));
}

/**
 * @route   GET /api/admin/implementation-plans
 * @desc    Get all implementation plans with filters and KPI metrics
 * @access  Private (Admin/Principal)
 */
router.get('/', asyncHandler(async (req, res) => {
    const { status, category, search, startDate, endDate } = req.query;
    const schoolId = req.user.schoolId || null;

    const plans = await fetchPlansWithFilters({
        status,
        category,
        search,
        startDate,
        endDate,
        schoolId
    });

    // Compute overall KPI metrics
    const allRows = await prisma.$queryRawUnsafe(`
        SELECT status, started_at, ended_at, tasks
        FROM implementation_plans
        ${schoolId ? `WHERE school_id = '${schoolId}' OR school_id IS NULL` : ''}
    `);

    let totalDurationMs = 0;
    const kpis = {
        total: allRows.length,
        completed: 0,
        in_progress: 0,
        draft: 0,
        on_hold: 0,
        failed: 0,
        totalTasks: 0,
        completedTasks: 0,
        totalDurationFormatted: '0h 0m'
    };

    allRows.forEach(row => {
        kpis[row.status] = (kpis[row.status] || 0) + 1;
        if (row.started_at) {
            const start = new Date(row.started_at).getTime();
            const end = row.ended_at ? new Date(row.ended_at).getTime() : Date.now();
            totalDurationMs += Math.max(0, end - start);
        }

        let tasks = [];
        if (Array.isArray(row.tasks)) tasks = row.tasks;
        else if (typeof row.tasks === 'string') {
            try { tasks = JSON.parse(row.tasks); } catch (e) { tasks = []; }
        }
        kpis.totalTasks += tasks.length;
        kpis.completedTasks += tasks.filter(t => t.completed).length;
    });

    const totalHours = Math.floor(totalDurationMs / (1000 * 60 * 60));
    const totalMinutes = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));
    kpis.totalDurationFormatted = `${totalHours}h ${totalMinutes}m`;

    // Extract unique categories for filter dropdown
    const categoriesRaw = await prisma.$queryRawUnsafe(`
        SELECT DISTINCT category FROM implementation_plans 
        WHERE category IS NOT NULL AND category != ''
        ORDER BY category ASC
    `);
    const categories = categoriesRaw.map(c => c.category);

    res.json({
        success: true,
        data: {
            plans,
            kpis,
            categories
        }
    });
}));

/**
 * @route   GET /api/admin/implementation-plans/export/pdf
 * @desc    Export filtered plans to PDF
 */
router.get('/export/pdf', asyncHandler(async (req, res) => {
    const { status, category, search, startDate, endDate, planId } = req.query;
    const schoolId = req.user.schoolId || null;

    const plans = await fetchPlansWithFilters({
        status,
        category,
        search,
        startDate,
        endDate,
        planId,
        schoolId
    });

    const pdfBuffer = await exportService.generatePdf(plans, {
        title: planId && plans.length === 1 
            ? `Implementation Plan: ${plans[0].title}`
            : 'LabRecManager - Implementation Plans Execution Report'
    });

    const filename = planId && plans.length === 1
        ? `implementation_plan_${plans[0].title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`
        : `implementation_plans_${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
}));

/**
 * @route   GET /api/admin/implementation-plans/export/xlsx
 * @desc    Export filtered plans to Excel XLSX
 */
router.get('/export/xlsx', asyncHandler(async (req, res) => {
    const { status, category, search, startDate, endDate, planId } = req.query;
    const schoolId = req.user.schoolId || null;

    const plans = await fetchPlansWithFilters({
        status,
        category,
        search,
        startDate,
        endDate,
        planId,
        schoolId
    });

    const xlsxBuffer = exportService.generateXlsx(plans);
    const filename = `implementation_plans_${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', xlsxBuffer.length);
    return res.end(xlsxBuffer);
}));

/**
 * @route   GET /api/admin/implementation-plans/export/csv
 * @desc    Export filtered plans to CSV
 */
router.get('/export/csv', asyncHandler(async (req, res) => {
    const { status, category, search, startDate, endDate, planId } = req.query;
    const schoolId = req.user.schoolId || null;

    const plans = await fetchPlansWithFilters({
        status,
        category,
        search,
        startDate,
        endDate,
        planId,
        schoolId
    });

    const csvBuffer = exportService.generateCsv(plans);
    const filename = `implementation_plans_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', csvBuffer.length);
    return res.end(csvBuffer);
}));

/**
 * @route   POST /api/admin/implementation-plans/export/email
 * @desc    Generate report attachments and email them to specified recipients
 */
router.post('/export/email', asyncHandler(async (req, res) => {
    const {
        recipients,
        formats = ['pdf'],
        subject,
        message,
        planId,
        status,
        category,
        search,
        startDate,
        endDate
    } = req.body;

    const targetRecipients = recipients || req.user.email;
    if (!targetRecipients) {
        return res.status(400).json({ success: false, message: 'Recipient email is required' });
    }

    const schoolId = req.user.schoolId || null;
    const plans = await fetchPlansWithFilters({
        status,
        category,
        search,
        startDate,
        endDate,
        planId,
        schoolId
    });

    const attachments = [];
    const dateStr = new Date().toISOString().slice(0, 10);

    if (formats.includes('pdf')) {
        const pdfBuf = await exportService.generatePdf(plans, {
            title: planId && plans.length === 1 
                ? `Implementation Plan: ${plans[0].title}`
                : 'LabRecManager - Implementation Plans Execution Report'
        });
        attachments.push({
            filename: `implementation_plans_${dateStr}.pdf`,
            content: pdfBuf,
            contentType: 'application/pdf'
        });
    }

    if (formats.includes('xlsx')) {
        const xlsxBuf = exportService.generateXlsx(plans);
        attachments.push({
            filename: `implementation_plans_${dateStr}.xlsx`,
            content: xlsxBuf,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
    }

    if (formats.includes('csv')) {
        const csvBuf = exportService.generateCsv(plans);
        attachments.push({
            filename: `implementation_plans_${dateStr}.csv`,
            content: csvBuf,
            contentType: 'text/csv'
        });
    }

    const emailResult = await emailService.sendImplementationReport({
        to: targetRecipients,
        subject: subject || (planId && plans.length === 1 
            ? `[LabRecManager] Implementation Report: ${plans[0].title}`
            : `[LabRecManager] Implementation Plans Report (${plans.length} plans)`),
        message,
        attachments,
        plans,
        summary: {
            total: plans.length,
            completed: plans.filter(p => p.status === 'completed').length,
            in_progress: plans.filter(p => p.status === 'in_progress').length,
            draft: plans.filter(p => p.status === 'draft').length
        }
    });

    res.json({
        success: true,
        data: emailResult
    });
}));

/**
 * @route   GET /api/admin/implementation-plans/by-serial/:serialId
 * @desc    Get single implementation plan by Serial ID (e.g. PLAN-001, #1, 1)
 */
router.get('/by-serial/:serialId', asyncHandler(async (req, res) => {
    const { serialId } = req.params;
    const schoolId = req.user.schoolId || null;

    const plans = await fetchPlansWithFilters({ planId: serialId, schoolId });
    if (!plans || plans.length === 0) {
        return res.status(404).json({ success: false, message: `Implementation plan "${serialId}" not found` });
    }

    res.json({
        success: true,
        data: plans[0]
    });
}));

/**
 * @route   GET /api/admin/implementation-plans/:id
 * @desc    Get single implementation plan by UUID or Serial ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const schoolId = req.user.schoolId || null;

    let plans = await fetchPlansWithFilters({ planId: id, schoolId });
    if (!plans || plans.length === 0) {
        // Fallback to checking by serial_id or serial_no across all plans
        const allPlans = await fetchPlansWithFilters({ schoolId });
        const cleanId = String(id).trim().toLowerCase();
        const target = allPlans.find(p => 
            p.serial_id?.toLowerCase() === cleanId ||
            String(p.serial_no) === cleanId.replace(/\D/g, '') ||
            p.id === id
        );
        if (target) {
            plans = [target];
        }
    }

    if (!plans || plans.length === 0) {
        return res.status(404).json({ success: false, message: 'Implementation plan not found' });
    }

    res.json({
        success: true,
        data: plans[0]
    });
}));

/**
 * @route   POST /api/admin/implementation-plans
 * @desc    Create a new implementation plan
 */
router.post('/', asyncHandler(async (req, res) => {
    const {
        title,
        description = '',
        category = 'General',
        status = 'draft',
        started_at = null,
        ended_at = null,
        tasks = [],
        outcomes = '',
        metadata = {}
    } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Plan title is required' });
    }

    const schoolId = req.user.schoolId || null;
    const userId = req.user.id;

    const tasksJson = JSON.stringify(Array.isArray(tasks) ? tasks : []);
    const metaJson = JSON.stringify(metadata && typeof metadata === 'object' ? metadata : {});

    const startedAtVal = started_at ? new Date(started_at).toISOString() : null;
    const endedAtVal = ended_at ? new Date(ended_at).toISOString() : null;

    const result = await prisma.$queryRawUnsafe(`
        INSERT INTO implementation_plans (
            title, description, category, status,
            started_at, ended_at, tasks, outcomes, metadata,
            school_id, created_by_id, created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4,
            $5::timestamp, $6::timestamp, $7::jsonb, $8, $9::jsonb,
            $10::uuid, $11::uuid, NOW(), NOW()
        )
        RETURNING *
    `,
        title.trim(),
        description.trim(),
        category.trim(),
        status,
        startedAtVal,
        endedAtVal,
        tasksJson,
        outcomes.trim(),
        metaJson,
        schoolId,
        userId
    );

    const created = formatPlan(result[0]);

    res.status(201).json({
        success: true,
        message: 'Implementation plan created successfully',
        data: created
    });
}));

/**
 * @route   PUT /api/admin/implementation-plans/:id
 * @desc    Update an implementation plan
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        title,
        description,
        category,
        status,
        started_at,
        ended_at,
        tasks,
        outcomes,
        metadata
    } = req.body;

    const existing = await prisma.$queryRawUnsafe(`SELECT * FROM implementation_plans WHERE id = $1::uuid`, id);
    if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Implementation plan not found' });
    }

    const current = existing[0];

    const newTitle = title !== undefined ? title.trim() : current.title;
    const newDesc = description !== undefined ? description : current.description;
    const newCategory = category !== undefined ? category.trim() : current.category;
    const newStatus = status !== undefined ? status : current.status;
    const newStartedAt = started_at !== undefined 
        ? (started_at ? new Date(started_at).toISOString() : null)
        : current.started_at;
    const newEndedAt = ended_at !== undefined
        ? (ended_at ? new Date(ended_at).toISOString() : null)
        : current.ended_at;

    const newTasksJson = tasks !== undefined ? JSON.stringify(tasks) : JSON.stringify(current.tasks || []);
    const newOutcomes = outcomes !== undefined ? outcomes : current.outcomes;
    const newMetaJson = metadata !== undefined ? JSON.stringify(metadata) : JSON.stringify(current.metadata || {});

    const result = await prisma.$queryRawUnsafe(`
        UPDATE implementation_plans SET
            title = $1,
            description = $2,
            category = $3,
            status = $4,
            started_at = $5::timestamp,
            ended_at = $6::timestamp,
            tasks = $7::jsonb,
            outcomes = $8,
            metadata = $9::jsonb,
            updated_at = NOW()
        WHERE id = $10::uuid
        RETURNING *
    `,
        newTitle,
        newDesc,
        newCategory,
        newStatus,
        newStartedAt,
        newEndedAt,
        newTasksJson,
        newOutcomes,
        newMetaJson,
        id
    );

    const updated = formatPlan(result[0]);

    res.json({
        success: true,
        message: 'Implementation plan updated successfully',
        data: updated
    });
}));

/**
 * @route   DELETE /api/admin/implementation-plans/:id
 * @desc    Delete an implementation plan
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existing = await prisma.$queryRawUnsafe(`SELECT id FROM implementation_plans WHERE id = $1::uuid`, id);
    if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Implementation plan not found' });
    }

    await prisma.$queryRawUnsafe(`DELETE FROM implementation_plans WHERE id = $1::uuid`, id);

    res.json({
        success: true,
        message: 'Implementation plan deleted successfully'
    });
}));

/**
 * @route   POST /api/admin/implementation-plans/:id/start
 * @desc    Quick Action: Start plan (sets started_at to NOW, status to in_progress)
 */
router.post('/:id/start', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existing = await prisma.$queryRawUnsafe(`SELECT * FROM implementation_plans WHERE id = $1::uuid`, id);
    if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Implementation plan not found' });
    }

    const result = await prisma.$queryRawUnsafe(`
        UPDATE implementation_plans SET
            started_at = COALESCE(started_at, NOW()),
            status = 'in_progress',
            updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING *
    `, id);

    res.json({
        success: true,
        message: 'Plan marked as in progress',
        data: formatPlan(result[0])
    });
}));

/**
 * @route   POST /api/admin/implementation-plans/:id/complete
 * @desc    Quick Action: Complete plan (sets ended_at to NOW, status to completed, checks auto-mail)
 */
router.post('/:id/complete', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { autoMail = false, recipient = null } = req.body;

    const existing = await prisma.$queryRawUnsafe(`SELECT * FROM implementation_plans WHERE id = $1::uuid`, id);
    if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Implementation plan not found' });
    }

    const result = await prisma.$queryRawUnsafe(`
        UPDATE implementation_plans SET
            ended_at = NOW(),
            status = 'completed',
            updated_at = NOW()
        WHERE id = $1::uuid
        RETURNING *
    `, id);

    const completedPlan = formatPlan(result[0]);

    // Check if auto-mail on completion was requested
    let emailDispatch = null;
    if (autoMail) {
        try {
            const targetRecipient = recipient || req.user.email;
            const pdfBuf = await exportService.generatePdf([completedPlan], {
                title: `Implementation Plan: ${completedPlan.title}`
            });

            emailDispatch = await emailService.sendImplementationReport({
                to: targetRecipient,
                subject: `[Plan Completed] ${completedPlan.title}`,
                message: `The implementation plan "${completedPlan.title}" has been marked as completed on ${new Date().toLocaleString()}.\n\nTotal Duration: ${completedPlan.duration}\nOutcomes:\n${completedPlan.outcomes || 'None specified'}`,
                attachments: [{
                    filename: `completion_report_${completedPlan.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
                    content: pdfBuf,
                    contentType: 'application/pdf'
                }],
                plans: [completedPlan],
                summary: {
                    total: 1,
                    completed: 1,
                    in_progress: 0,
                    draft: 0
                }
            });
        } catch (mailErr) {
            console.error('[ImplementationPlans] Auto-mail on completion failed:', mailErr);
            emailDispatch = { success: false, error: mailErr.message };
        }
    }

    res.json({
        success: true,
        message: 'Plan marked as completed successfully',
        data: completedPlan,
        emailDispatch
    });
}));

/**
 * @route   POST /api/admin/implementation-plans/:id/toggle-task
 * @desc    Toggle task checkbox within a plan
 */
router.post('/:id/toggle-task', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { taskIndex, completed } = req.body;

    if (taskIndex === undefined || typeof taskIndex !== 'number') {
        return res.status(400).json({ success: false, message: 'Valid taskIndex is required' });
    }

    const existing = await prisma.$queryRawUnsafe(`SELECT tasks, status FROM implementation_plans WHERE id = $1::uuid`, id);
    if (!existing || existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Implementation plan not found' });
    }

    let tasks = existing[0].tasks;
    if (typeof tasks === 'string') {
        try { tasks = JSON.parse(tasks); } catch (e) { tasks = []; }
    }
    if (!Array.isArray(tasks)) tasks = [];

    if (taskIndex < 0 || taskIndex >= tasks.length) {
        return res.status(400).json({ success: false, message: 'Task index out of bounds' });
    }

    const isDone = completed !== undefined ? Boolean(completed) : !tasks[taskIndex].completed;
    tasks[taskIndex].completed = isDone;
    tasks[taskIndex].completedAt = isDone ? new Date().toISOString() : null;

    const result = await prisma.$queryRawUnsafe(`
        UPDATE implementation_plans SET
            tasks = $1::jsonb,
            updated_at = NOW()
        WHERE id = $2::uuid
        RETURNING *
    `, JSON.stringify(tasks), id);

    res.json({
        success: true,
        message: `Task ${isDone ? 'completed' : 'uncompleted'}`,
        data: formatPlan(result[0])
    });
}));

module.exports = router;
