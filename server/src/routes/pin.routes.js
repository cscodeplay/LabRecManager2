/**
 * PIN-based Password Reset Routes
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/constants');
const prisma = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { generatePin } = require('../utils/profileHelper');
const { generate10BackupCodes, hashBackupCode, normalizeBackupCode } = require('../utils/backupCodeHelper');

/**
 * @route   POST /api/users/:id/generate-pin
 * @desc    Generate password reset PIN for a student
 * @access  Private (Admin, Principal, Instructor)
 */
router.post('/:id/generate-pin', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { expiresInHours = 24 } = req.body;

    // Find the user
    const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, firstName: true, lastName: true, role: true, schoolId: true }
    });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    // Only allow PIN generation for students in the same school
    if (user.schoolId !== req.user.schoolId) {
        return res.status(403).json({
            success: false,
            message: 'Cannot generate PIN for users in a different school'
        });
    }

    // Generate 6-digit PIN
    const pin = generatePin();

    // Hash the PIN for storage
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    // Calculate expiry
    const pinExpiresAt = new Date();
    pinExpiresAt.setHours(pinExpiresAt.getHours() + expiresInHours);

    // Store hashed PIN
    await prisma.user.update({
        where: { id },
        data: {
            resetPin: hashedPin,
            pinExpiresAt
        }
    });

    // Log the action
    await prisma.activityLog.create({
        data: {
            userId: req.user.id,
            schoolId: req.user.schoolId,
            actionType: 'other',
            entityType: 'user',
            entityId: id,
            description: `Generated password reset PIN for ${user.firstName} ${user.lastName}`
        }
    });

    res.json({
        success: true,
        message: 'PIN generated successfully. Share this PIN with the student securely.',
        messageHindi: 'पिन सफलतापूर्वक जनरेट किया गया। इस पिन को छात्र के साथ सुरक्षित रूप से साझा करें।',
        data: {
            pin, // Return plain PIN to admin (only shown once)
            expiresAt: pinExpiresAt,
            studentName: `${user.firstName} ${user.lastName}`
        }
    });
}));

/**
 * @route   POST /api/auth/reset-with-pin
 * @desc    Reset password using PIN (public endpoint)
 * @access  Public
 */
router.post('/reset-with-pin', asyncHandler(async (req, res) => {
    const { email, pin, newPassword } = req.body;

    if (!email || !pin || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Email, PIN, and new password are required'
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters'
        });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, resetPin: true, pinExpiresAt: true, firstName: true }
    });

    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'Invalid email or PIN'
        });
    }

    // Check if PIN exists
    if (!user.resetPin || !user.pinExpiresAt) {
        return res.status(400).json({
            success: false,
            message: 'No PIN has been generated for this account. Contact your administrator.'
        });
    }

    // Check if PIN has expired
    if (new Date() > user.pinExpiresAt) {
        return res.status(400).json({
            success: false,
            message: 'PIN has expired. Please request a new PIN from your administrator.'
        });
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(pin, user.resetPin);
    if (!isPinValid) {
        return res.status(400).json({
            success: false,
            message: 'Invalid PIN'
        });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password and clear PIN
    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash,
            resetPin: null,
            pinExpiresAt: null,
            mustChangePassword: false
        }
    });

    res.json({
        success: true,
        message: 'Password reset successfully. You can now login with your new password.',
        messageHindi: 'पासवर्ड सफलतापूर्वक रीसेट किया गया। अब आप अपने नए पासवर्ड से लॉगिन कर सकते हैं।'
    });
}));

/**
 * Helper to get the actual school profile dynamically from the database
 */
async function getEffectiveSchool(schoolId) {
    if (schoolId) {
        const sc = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true, code: true }
        });
        if (sc?.name) return sc;
    }
    const defaultSchool = await prisma.school.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { id: true, name: true, code: true }
    });
    return defaultSchool || { name: 'School', code: 'LAB' };
}

/**
 * Helper to verify if the requester can manage backup codes for the target user
 */
function canManageBackupCodes(requester, target) {
    if (requester.role === 'admin' || requester.role === 'principal') {
        if (!requester.schoolId || !target.schoolId) return true;
        return requester.schoolId === target.schoolId;
    }
    if (requester.role === 'instructor') {
        if (target.role !== 'student') return false;
        if (!requester.schoolId || !target.schoolId) return true;
        return requester.schoolId === target.schoolId;
    }
    return false;
}

/**
 * @route   POST /api/pin/backup-codes/:id/generate
 * @desc    Generate 10 single-use emergency backup codes + 1st-time login PIN for a user
 * @access  Private (Admin, Principal, Instructor)
 */
router.post('/backup-codes/:id/generate', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            school: {
                select: { id: true, name: true, code: true }
            }
        }
    });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        });
    }

    if (!canManageBackupCodes(req.user, user)) {
        return res.status(403).json({
            success: false,
            message: 'You do not have permission to generate backup codes for this user'
        });
    }

    // Generate 6-digit first-time login PIN
    const firstTimePin = generatePin();
    const pinSalt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(firstTimePin, pinSalt);
    const pinExpiresAt = new Date();
    pinExpiresAt.setFullYear(pinExpiresAt.getFullYear() + 1); // Valid for 1 year for lab access

    // Generate 10 emergency single-use backup codes
    const generated = generate10BackupCodes();

    // Remove any older backup codes and insert the new 10 hashes
    await prisma.backupCode.deleteMany({
        where: { userId: user.id }
    });

    await prisma.backupCode.createMany({
        data: generated.map((g) => ({
            userId: user.id,
            codeHash: g.codeHash,
            turnIndex: g.turnIndex,
            isUsed: false
        }))
    });

    // Update user with the 1st-time login PIN and require password change
    await prisma.user.update({
        where: { id: user.id },
        data: {
            resetPin: hashedPin,
            pinExpiresAt,
            mustChangePassword: true
        }
    });

    await prisma.activityLog.create({
        data: {
            userId: req.user.id,
            schoolId: req.user.schoolId || null,
            actionType: 'other',
            entityType: 'user',
            entityId: id,
            description: `Generated 10 emergency backup codes and 1st-time login PIN for ${user.firstName} ${user.lastName} (${user.role})`
        }
    }).catch(err => console.warn('Activity log error:', err.message));

    const schoolProfile = user.school?.name ? user.school : await getEffectiveSchool(user.schoolId || req.user.schoolId);

    res.json({
        success: true,
        message: '10 single-use backup codes and first-time PIN generated successfully.',
        data: {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            role: user.role,
            email: user.email,
            admissionNumber: user.admissionNumber || user.employeeId || user.studentId || null,
            schoolName: schoolProfile.name,
            schoolCode: schoolProfile.code || 'LAB',
            generatedAt: new Date(),
            firstTimePin,
            totalTurns: 10,
            codes: generated.map(g => ({
                turn: g.turnIndex,
                code: g.rawCode
            }))
        }
    });
}));

/**
 * @route   POST /api/pin/backup-codes/bulk-generate
 * @desc    Bulk generate 10 backup codes + 1st-time login PINs for multiple selected users (for A4 grid printing)
 * @access  Private (Admin, Principal, Instructor)
 */
router.post('/backup-codes/bulk-generate', authenticate, authorize('admin', 'principal', 'instructor'), asyncHandler(async (req, res) => {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'userIds array is required'
        });
    }

    const users = await prisma.user.findMany({
        where: {
            id: { in: userIds }
        },
        include: {
            school: {
                select: { id: true, name: true, code: true }
            }
        }
    });

    const authorizedUsers = users.filter(u => canManageBackupCodes(req.user, u));

    if (authorizedUsers.length === 0) {
        return res.status(403).json({
            success: false,
            message: 'No authorized users found in the selection'
        });
    }

    // Resolve default school profile once to avoid repeated DB lookups
    const defaultSchoolProfile = await getEffectiveSchool(req.user.schoolId);

    // Prepare in-memory codes and PINs for all authorized users
    const pinSalt = await bcrypt.genSalt(10);
    const pinExpiresAt = new Date();
    pinExpiresAt.setFullYear(pinExpiresAt.getFullYear() + 1);

    const preparedUsers = await Promise.all(authorizedUsers.map(async (target) => {
        const firstTimePin = generatePin();
        const hashedPin = await bcrypt.hash(firstTimePin, pinSalt);
        const generated = generate10BackupCodes();

        const schoolProfile = target.school?.name ? target.school : defaultSchoolProfile;

        return {
            target,
            firstTimePin,
            hashedPin,
            pinExpiresAt,
            generatedCodes: generated,
            schoolProfile
        };
    }));

    const targetIds = preparedUsers.map(p => p.target.id);

    // 1. Batch delete previous backup codes for all targets
    await prisma.backupCode.deleteMany({
        where: { userId: { in: targetIds } }
    });

    // 2. Batch insert all new backup codes in a single query
    const allBackupRows = [];
    for (const p of preparedUsers) {
        for (const g of p.generatedCodes) {
            allBackupRows.push({
                userId: p.target.id,
                codeHash: g.codeHash,
                turnIndex: g.turnIndex,
                isUsed: false
            });
        }
    }
    await prisma.backupCode.createMany({
        data: allBackupRows
    });

    // 3. Batch update users with new PINs in parallel
    await Promise.all(preparedUsers.map(p => prisma.user.update({
        where: { id: p.target.id },
        data: {
            resetPin: p.hashedPin,
            pinExpiresAt: p.pinExpiresAt,
            mustChangePassword: true
        }
    })));

    // 4. Create activity log
    await prisma.activityLog.create({
        data: {
            userId: req.user.id,
            schoolId: req.user.schoolId || null,
            actionType: 'other',
            entityType: 'user',
            entityId: req.user.id,
            description: `Bulk generated 10-turn backup codes and 1st-time login PINs for ${preparedUsers.length} users`
        }
    }).catch(err => console.warn('Activity log error:', err.message));

    // 5. Construct print chips payload
    const printChips = preparedUsers.map(p => ({
        userId: p.target.id,
        userName: `${p.target.firstName} ${p.target.lastName}`,
        role: p.target.role,
        email: p.target.email,
        admissionNumber: p.target.admissionNumber || p.target.employeeId || p.target.studentId || null,
        schoolName: p.schoolProfile.name,
        schoolCode: p.schoolProfile.code || 'LAB',
        generatedAt: new Date(),
        firstTimePin: p.firstTimePin,
        totalTurns: 10,
        codes: p.generatedCodes.map(g => ({
            turn: g.turnIndex,
            code: g.rawCode
        }))
    }));

    res.json({
        success: true,
        message: `Successfully generated 10-turn backup codes and PINs for ${printChips.length} users.`,
        data: printChips
    });
}));

/**
 * @route   GET /api/pin/backup-codes/:id/status
 * @desc    Get status of backup codes (total turns, remaining, used history)
 * @access  Private (Admin, Principal, Instructor, or Self)
 */
router.get('/backup-codes/:id/status', authenticate, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, firstName: true, lastName: true, role: true, schoolId: true }
    });

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Must be self, or authorized manager
    const isSelf = req.user.id === id;
    if (!isSelf && !canManageBackupCodes(req.user, user)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const codes = await prisma.backupCode.findMany({
        where: { userId: id },
        orderBy: { turnIndex: 'asc' },
        select: {
            turnIndex: true,
            isUsed: true,
            usedAt: true,
            createdAt: true
        }
    });

    const totalTurns = codes.length;
    const usedTurns = codes.filter(c => c.isUsed).length;
    const remainingTurns = totalTurns - usedTurns;

    res.json({
        success: true,
        data: {
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            totalTurns,
            remainingTurns,
            usedTurns,
            turns: codes
        }
    });
}));

const STANDARD_SECURITY_QUESTIONS = [
    "What was the name of your first elementary/primary school?",
    "What is your mother's maiden name?",
    "What city or town was your birthplace?",
    "What was the name of your first childhood pet?",
    "What is the name of your favorite subject teacher?",
    "What was your childhood nickname?"
];

/**
 * @route   POST /api/pin/reset-with-backup-code
 * @desc    Reset password using any 1 of the 10 emergency backup codes (public endpoint)
 *          Displays specific alert with datetime if code was already used.
 * @access  Public
 */
router.post('/reset-with-backup-code', asyncHandler(async (req, res) => {
    const { email, backupCode, newPassword } = req.body;

    if (!email || !backupCode || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Email, backup code, and new password are required.'
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters long.'
        });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find user
    const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
        select: { id: true, firstName: true, lastName: true, schoolId: true }
    });

    if (!user) {
        return res.status(400).json({
            success: false,
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or code.'
        });
    }

    // Get all backup codes (both used and unused) for this user
    const allCodes = await prisma.backupCode.findMany({
        where: { userId: user.id },
        orderBy: { turnIndex: 'asc' }
    });

    if (allCodes.length === 0) {
        return res.status(400).json({
            success: false,
            code: 'NO_CODES_GENERATED',
            message: 'No backup codes have been generated for this account. Please request a paper chip from your lab instructor or administrator.'
        });
    }

    const inputHash = hashBackupCode(backupCode);
    const unusedMatch = allCodes.find(c => !c.isUsed && c.codeHash === inputHash);
    const usedMatch = allCodes.find(c => c.isUsed && c.codeHash === inputHash);

    // If user enters an already used backup code, alert with exact datetime
    if (usedMatch) {
        const formattedDateTime = usedMatch.usedAt
            ? new Date(usedMatch.usedAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
            })
            : 'a previous session';

        return res.status(400).json({
            success: false,
            code: 'BACKUP_CODE_ALREADY_USED',
            message: `This backup code (Turn #${usedMatch.turnIndex}) was already used on ${formattedDateTime}. Please use an unused turn from your paper chip.`,
            messageHindi: `यह बैकअप कोड (टर्न #${usedMatch.turnIndex}) पहले ही ${formattedDateTime} को उपयोग किया जा चुका है। कृपया किसी अप्रयुक्त टर्न का उपयोग करें।`,
            data: {
                turnIndex: usedMatch.turnIndex,
                usedAt: usedMatch.usedAt,
                formattedDateTime
            }
        });
    }

    // If user enters a wrong/invalid code
    if (!unusedMatch) {
        return res.status(400).json({
            success: false,
            code: 'INVALID_CODE',
            message: 'Invalid code. Please check your paper slip and try again.',
            messageHindi: 'अमान्य कोड। कृपया अपनी पेपर पर्ची जांचें और पुनः प्रयास करें।'
        });
    }

    // Burn this turn and update the password in a transaction
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    const remainingAfter = allCodes.filter(c => !c.isUsed).length - 1;

    await prisma.$transaction(async (tx) => {
        // Mark code as used with current timestamp
        await tx.backupCode.update({
            where: { id: unusedMatch.id },
            data: {
                isUsed: true,
                usedAt: new Date()
            }
        });

        // Set new password, and clear temporary PIN if any
        await tx.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetPin: null,
                pinExpiresAt: null,
                mustChangePassword: false
            }
        });

        // Activity log
        await tx.activityLog.create({
            data: {
                userId: user.id,
                schoolId: user.schoolId,
                actionType: 'other',
                entityType: 'user',
                entityId: user.id,
                description: `Password reset using Backup Code (Turn #${unusedMatch.turnIndex}). ${remainingAfter} turn(s) remaining.`
            }
        });
    });

    res.json({
        success: true,
        message: `Password reset successfully! You have used Turn #${unusedMatch.turnIndex}. You have ${remainingAfter} backup turn(s) remaining.`,
        messageHindi: `पासवर्ड सफलतापूर्वक रीसेट किया गया! आपने टर्न #${unusedMatch.turnIndex} का उपयोग किया है। आपके पास ${remainingAfter} बैकअप टर्न शेष हैं।`,
        data: {
            usedTurn: unusedMatch.turnIndex,
            remainingTurns: remainingAfter
        }
    });
}));

/**
 * @route   POST /api/pin/login-with-backup-code
 * @desc    First-time login with Backup Code.
 *          User cannot access app until password is set.
 * @access  Public
 */
router.post('/login-with-backup-code', asyncHandler(async (req, res) => {
    const { email, backupCode, newPassword } = req.body;

    if (!email || !backupCode) {
        return res.status(400).json({
            success: false,
            message: 'Email and backup code are required.'
        });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
        include: {
            school: {
                select: { id: true, name: true, nameHindi: true, primaryLanguage: true }
            }
        }
    });

    if (!user) {
        return res.status(401).json({
            success: false,
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or backup code.'
        });
    }

    if (!user.isActive) {
        return res.status(401).json({
            success: false,
            message: 'Account is deactivated. Contact administrator.'
        });
    }

    const allCodes = await prisma.backupCode.findMany({
        where: { userId: user.id },
        orderBy: { turnIndex: 'asc' }
    });

    const inputHash = hashBackupCode(backupCode);
    const unusedMatch = allCodes.find(c => !c.isUsed && c.codeHash === inputHash);
    const usedMatch = allCodes.find(c => c.isUsed && c.codeHash === inputHash);

    // If backup code was already used
    if (usedMatch) {
        const formattedDateTime = usedMatch.usedAt
            ? new Date(usedMatch.usedAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short'
            })
            : 'a previous session';

        return res.status(400).json({
            success: false,
            code: 'BACKUP_CODE_ALREADY_USED',
            message: `This backup code (Turn #${usedMatch.turnIndex}) was already used on ${formattedDateTime}. Please use an unused turn from your paper chip.`,
            data: {
                turnIndex: usedMatch.turnIndex,
                usedAt: usedMatch.usedAt,
                formattedDateTime
            }
        });
    }

    // If code is wrong
    if (!unusedMatch) {
        return res.status(400).json({
            success: false,
            code: 'INVALID_CODE',
            message: 'Invalid code. Please check your paper slip and try again.'
        });
    }

    // Step 1: Code verified, now require setting a password
    if (!newPassword) {
        return res.json({
            success: true,
            requiresPasswordSetup: true,
            message: `Backup code verified (Turn #${unusedMatch.turnIndex}). Please set your password to activate your account.`,
            data: {
                email: user.email,
                firstName: user.firstName,
                turnIndex: unusedMatch.turnIndex,
                remainingTurns: allCodes.filter(c => !c.isUsed).length
            }
        });
    }

    // Step 2: Set password and log user in
    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters long.'
        });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    const remainingAfter = allCodes.filter(c => !c.isUsed).length - 1;

    await prisma.$transaction(async (tx) => {
        await tx.backupCode.update({
            where: { id: unusedMatch.id },
            data: { isUsed: true, usedAt: new Date() }
        });

        await tx.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetPin: null,
                pinExpiresAt: null,
                mustChangePassword: false,
                lastLogin: new Date()
            }
        });

        await tx.activityLog.create({
            data: {
                userId: user.id,
                schoolId: user.schoolId,
                actionType: 'other',
                entityType: 'user',
                entityId: user.id,
                description: `First-time login completed using Backup Code (Turn #${unusedMatch.turnIndex}). ${remainingAfter} turn(s) remaining.`
            }
        });
    });

    const accessToken = jwt.sign(
        { userId: user.id, role: user.role },
        jwtConfig.secret,
        { expiresIn: jwtConfig.expiresIn }
    );
    const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        jwtConfig.secret,
        { expiresIn: jwtConfig.refreshExpiresIn }
    );

    res.json({
        success: true,
        message: `Password set successfully! Welcome, ${user.firstName}. You have ${remainingAfter} backup turn(s) remaining.`,
        data: {
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                schoolId: user.schoolId,
                school: user.school
            },
            accessToken,
            refreshToken,
            remainingTurns: remainingAfter
        }
    });
}));

/**
 * @route   GET /api/pin/security-questions/list
 * @desc    Get list of standard security questions
 * @access  Public
 */
router.get('/security-questions/list', (req, res) => {
    res.json({
        success: true,
        data: STANDARD_SECURITY_QUESTIONS
    });
});

/**
 * @route   POST /api/pin/security-questions/lookup
 * @desc    Lookup configured security question for an email address
 * @access  Public
 */
router.post('/security-questions/lookup', asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
        select: { id: true, firstName: true, securityQuestion: true }
    });

    if (!user || !user.securityQuestion) {
        return res.status(404).json({
            success: false,
            hasSecurityQuestion: false,
            message: 'No security question is configured for this account. Please use your 10-turn paper slip or contact your teacher.'
        });
    }

    res.json({
        success: true,
        hasSecurityQuestion: true,
        data: {
            question: user.securityQuestion,
            firstName: user.firstName
        }
    });
}));

/**
 * @route   POST /api/pin/security-questions/setup
 * @desc    Save security question & answer for the logged-in user
 * @access  Private
 */
router.post('/security-questions/setup', authenticate, asyncHandler(async (req, res) => {
    const { question, answer } = req.body;

    if (!question || !answer || answer.trim().length < 2) {
        return res.status(400).json({
            success: false,
            message: 'Please choose a question and provide an answer with at least 2 characters.'
        });
    }

    const cleanAnswer = answer.trim().toLowerCase();
    const salt = await bcrypt.genSalt(10);
    const securityAnswerHash = await bcrypt.hash(cleanAnswer, salt);

    await prisma.user.update({
        where: { id: req.user.id },
        data: {
            securityQuestion: question.trim(),
            securityAnswerHash
        }
    });

    await prisma.activityLog.create({
        data: {
            userId: req.user.id,
            schoolId: req.user.schoolId,
            actionType: 'other',
            entityType: 'user',
            entityId: req.user.id,
            description: 'Configured security question for password recovery.'
        }
    });

    res.json({
        success: true,
        message: 'Security question saved! You can now reset your password anytime by answering this question without requiring a phone.',
        data: {
            question: question.trim()
        }
    });
}));

/**
 * @route   POST /api/pin/reset-with-security-question
 * @desc    Reset password by answering the configured security question
 * @access  Public
 */
router.post('/reset-with-security-question', asyncHandler(async (req, res) => {
    const { email, answer, newPassword } = req.body;

    if (!email || !answer || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Email, answer, and new password are required.'
        });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters long.'
        });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
        where: { email: cleanEmail },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            schoolId: true,
            securityQuestion: true,
            securityAnswerHash: true
        }
    });

    if (!user || !user.securityQuestion || !user.securityAnswerHash) {
        return res.status(400).json({
            success: false,
            message: 'No security question is configured for this account. Please use an emergency backup code or contact your administrator.'
        });
    }

    const cleanAnswer = answer.trim().toLowerCase();
    const isAnswerCorrect = await bcrypt.compare(cleanAnswer, user.securityAnswerHash);

    if (!isAnswerCorrect) {
        return res.status(401).json({
            success: false,
            code: 'INCORRECT_ANSWER',
            message: 'Incorrect answer to the security question. Please try again.'
        });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordHash,
            resetPin: null,
            pinExpiresAt: null,
            mustChangePassword: false
        }
    });

    await prisma.activityLog.create({
        data: {
            userId: user.id,
            schoolId: user.schoolId,
            actionType: 'other',
            entityType: 'user',
            entityId: user.id,
            description: `Password reset successfully using Security Question for ${user.firstName} ${user.lastName}`
        }
    });

    res.json({
        success: true,
        message: 'Password reset successfully! You can now login with your new password.',
        messageHindi: 'पासवर्ड सफलतापूर्वक रीसेट किया गया! अब आप अपने नए पासवर्ड से लॉगिन कर सकते हैं।'
    });
}));

module.exports = router;
