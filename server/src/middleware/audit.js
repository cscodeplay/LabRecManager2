/**
 * Audit Logging Middleware
 * Creates audit trail for all important actions in the system
 */
const prisma = require('../config/database');

/**
 * Log an audit event
 * @param {Object} options
 * @param {Object} options.req - Express request object (for user, IP, user-agent)
 * @param {string} options.action - Action type (create, update, delete, login, logout, etc.)
 * @param {string} options.entityType - Entity type (lab, assignment, grade, user, document)
 * @param {string} options.entityId - Entity ID (UUID)
 * @param {string} options.entityName - Human-readable entity name
 * @param {Object} options.details - Additional context/details (JSON)
 */
async function auditLog({ req, action, entityType, entityId = null, entityName = null, details = null }) {
    try {
        const userId = req?.user?.id || null;
        const schoolId = req?.user?.schoolId || null;
        const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || null;
        const userAgent = req?.headers?.['user-agent'] || null;

        await prisma.auditLog.create({
            data: {
                userId,
                schoolId,
                action,
                entityType,
                entityId,
                entityName,
                details: details ? JSON.parse(JSON.stringify(details)) : null,
                ipAddress,
                userAgent
            }
        });
    } catch (error) {
        // Log error but don't throw - audit logging should not break the main flow
        console.error('[AuditLog] Error logging audit event:', error.message);
    }
}

/**
 * Audit actions enum
 */
const AUDIT_ACTIONS = {
    // Auth
    LOGIN: 'login',
    LOGOUT: 'logout',
    PASSWORD_CHANGE: 'password_change',

    // CRUD
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',

    // Specific actions
    STATUS_CHANGE: 'status_change',
    GRADE: 'grade',
    MODIFY_GRADE: 'modify_grade',
    PUBLISH: 'publish',
    SHARE: 'share',
    UNSHARE: 'unshare',
    APPROVE: 'approve',
    REJECT: 'reject',
    UPLOAD: 'upload',
    DOWNLOAD: 'download',
    ASSIGN: 'assign',
    SUBMIT: 'submit'
};

/**
 * Entity types enum
 */
const ENTITY_TYPES = {
    USER: 'user',
    LAB: 'lab',
    LAB_ITEM: 'lab_item',
    ASSIGNMENT: 'assignment',
    SUBMISSION: 'submission',
    GRADE: 'grade',
    DOCUMENT: 'document',
    CLASS: 'class',
    SUBJECT: 'subject',
    GRADE_SCALE: 'grade_scale',
    SHIFT_REQUEST: 'shift_request',
    VIVA_SESSION: 'viva_session',
    WHITEBOARD: 'whiteboard'
};

module.exports = {
    auditLog,
    AUDIT_ACTIONS,
    ENTITY_TYPES
};
