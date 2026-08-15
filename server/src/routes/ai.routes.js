const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const prisma = require('../config/prisma');
const aiService = require('../services/ai.service');
const notificationService = require('../services/notificationService');

const upload = multer({
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * @route   POST /api/ai/parse-assignments
 * @desc    Extract assignments from uploaded image and resolve target entities via AI
 * @access  Private (Instructor / Admin)
 */
router.post('/parse-assignments', authenticate, authorize('instructor', 'lab_assistant', 'admin', 'principal'), upload.single('image'), asyncHandler(async (req, res) => {
    const { prompt = '', provider = 'groq', subjectId = '' } = req.body;
    
    if (!req.file && (!prompt || !prompt.trim())) {
        return res.status(400).json({
            success: false,
            message: 'Either an image file or a prompt instruction is required'
        });
    }

    const schoolId = req.user.schoolId || null;

    // Fetch school context (Classes, Groups, Students, Subjects)
    const [classes, groups, students, subjects] = await Promise.all([
        prisma.studentClass.findMany({
            where: schoolId ? { schoolId } : {},
            select: { id: true, name: true, gradeLevel: true, section: true }
        }),
        prisma.studentGroup.findMany({
            where: schoolId ? { class: { schoolId } } : {},
            select: { id: true, name: true, class: { select: { name: true } } }
        }),
        prisma.user.findMany({
            where: { role: 'student', ...(schoolId ? { schoolId } : {}) },
            select: { id: true, firstName: true, lastName: true, admissionNumber: true }
        }),
        prisma.subject.findMany({
            select: { id: true, name: true, code: true }
        })
    ]);

    // 1. Extract assignments (via image vision AI or text-only generation AI)
    let extractedAssignments = [];
    if (req.file) {
        extractedAssignments = await aiService.extractAssignmentsFromImage(
            req.file.buffer,
            req.file.mimetype,
            prompt,
            provider
        );
    } else {
        extractedAssignments = await aiService.extractAssignmentsFromText(
            prompt,
            provider
        );
    }

    // 2. Parse targets and subject match from prompt via AI
    const targetResolution = await aiService.parseAssignmentTargets(
        prompt,
        { classes, groups, students, subjects },
        provider
    );

    // Calculate default due date (24 hours from now unless specified)
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + (targetResolution.dueDateHoursFromNow || 24));

    // Determine default status
    const shouldPublishNow = prompt.toLowerCase().includes('publish now') || prompt.toLowerCase().includes('publish immediately') || targetResolution.publishImmediately;
    const status = shouldPublishNow ? 'published' : 'published';

    // Resolved subject (use user selected subjectId if provided, else AI resolved, else CS default)
    let defaultSubjectId = subjectId || targetResolution.selectedSubjectId;
    if (!defaultSubjectId) {
        const csSubject = subjects.find(s => s.name?.toLowerCase().includes('computer'));
        defaultSubjectId = csSubject ? csSubject.id : subjects[0]?.id;
    }

    res.json({
        success: true,
        message: `Extracted ${extractedAssignments.length} assignment(s) successfully`,
        data: {
            extractedAssignments,
            targetResolution: {
                ...targetResolution,
                selectedSubjectId: defaultSubjectId,
                status,
                dueDate: dueDate.toISOString()
            },
            availableSubjects: subjects
        }
    });
}));

/**
 * @route   POST /api/ai/batch-create
 * @desc    Batch save and publish AI generated assignments
 * @access  Private (Instructor / Admin)
 */
router.post('/batch-create', authenticate, authorize('instructor', 'lab_assistant', 'admin', 'principal'), asyncHandler(async (req, res) => {
    const {
        assignments = [],
        subjectId,
        labId,
        academicYearId,
        practicalMarks = 60,
        vivaMarks = 20,
        outputMarks = 20,
        maxMarks = 100,
        status = 'published',
        dueDate,
        targetClassIds = [],
        targetGroupIds = [],
        targetStudentIds = []
    } = req.body;

    if (!assignments || assignments.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No assignments provided for creation'
        });
    }

    if (!subjectId) {
        return res.status(400).json({
            success: false,
            message: 'Subject ID is required'
        });
    }

    const sessionId = academicYearId || req.headers['x-academic-session'];
    const createdAssignments = [];

    // Default due date: 24 hours from now if not provided
    const finalDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const fallbackSchool = await prisma.school.findFirst({ select: { id: true } });
    const schoolIdToUse = req.user.schoolId || fallbackSchool?.id;

    for (let i = 0; i < assignments.length; i++) {
        const item = assignments[i];
        const title = item.title || `Lab Assignment #${i + 1}`;
        const description = item.description || item.aim || title;

        const assignment = await prisma.assignment.create({
            data: {
                schoolId: schoolIdToUse,
                createdById: req.user.id,
                subjectId,
                labId: labId || null,
                academicYearId: sessionId || null,
                title,
                description,
                aim: item.aim || null,
                theory: item.theory || null,
                procedure: item.procedure || null,
                expectedOutput: item.expectedOutput || null,
                experimentNumber: item.experimentNumber || `${i + 1}`,
                assignmentType: item.assignmentType || 'program',
                programmingLanguage: item.programmingLanguage || 'python',
                maxMarks: Number(maxMarks) || 100,
                practicalMarks: Number(practicalMarks) || 60,
                vivaMarks: Number(vivaMarks) || 20,
                outputMarks: Number(outputMarks) || 20,
                status: status || 'published',
                due_date: finalDueDate
            }
        });

        // Add Target Associations (Classes)
        for (const classId of targetClassIds) {
            await prisma.assignmentTarget.create({
                data: {
                    assignmentId: assignment.id,
                    targetType: 'class',
                    targetClassId: classId,
                    assignedById: req.user.id,
                    dueDate: finalDueDate,
                    publishDate: status === 'published' ? new Date() : null
                }
            });

            if (status === 'published') {
                try {
                    await notificationService.notifyClass({
                        classId,
                        title: `New Work Assigned: ${assignment.title}`,
                        message: `You have been assigned new lab work. Due: ${finalDueDate.toLocaleDateString('en-IN')}`,
                        type: 'work_assigned',
                        referenceType: 'assignment',
                        referenceId: assignment.id,
                        actionUrl: '/my-work'
                    });
                } catch (err) {
                    console.warn('Failed to notify class:', err.message);
                }
            }
        }

        // Add Target Associations (Groups)
        for (const groupId of targetGroupIds) {
            await prisma.assignmentTarget.create({
                data: {
                    assignmentId: assignment.id,
                    targetType: 'group',
                    targetGroupId: groupId,
                    assignedById: req.user.id,
                    dueDate: finalDueDate,
                    publishDate: status === 'published' ? new Date() : null
                }
            });

            if (status === 'published') {
                try {
                    await notificationService.notifyGroup({
                        groupId,
                        title: `New Work Assigned: ${assignment.title}`,
                        message: `You have been assigned new lab work. Due: ${finalDueDate.toLocaleDateString('en-IN')}`,
                        type: 'work_assigned',
                        referenceType: 'assignment',
                        referenceId: assignment.id,
                        actionUrl: '/my-work'
                    });
                } catch (err) {
                    console.warn('Failed to notify group:', err.message);
                }
            }
        }

        // Add Target Associations (Students)
        for (const studentId of targetStudentIds) {
            await prisma.assignmentTarget.create({
                data: {
                    assignmentId: assignment.id,
                    targetType: 'student',
                    targetStudentId: studentId,
                    assignedById: req.user.id,
                    dueDate: finalDueDate,
                    publishDate: status === 'published' ? new Date() : null
                }
            });

            if (status === 'published') {
                try {
                    await notificationService.createNotification({
                        userId: studentId,
                        title: `New Work Assigned: ${assignment.title}`,
                        message: `You have been assigned new lab work. Due: ${finalDueDate.toLocaleDateString('en-IN')}`,
                        type: 'work_assigned',
                        referenceType: 'assignment',
                        referenceId: assignment.id,
                        actionUrl: '/my-work'
                    });
                } catch (err) {
                    console.warn('Failed to notify student:', err.message);
                }
            }
        }

        // Activity log
        try {
            await prisma.activityLog.create({
                data: {
                    userId: req.user.id,
                    schoolId: req.user.schoolId || null,
                    actionType: 'assignment',
                    entityType: 'assignment',
                    entityId: assignment.id,
                    description: `AI Auto-created assignment: "${assignment.title}"`
                }
            });
        } catch (logError) {
            console.warn('Activity log failed:', logError.message);
        }

        createdAssignments.push(assignment);
    }

    res.status(201).json({
        success: true,
        message: `Successfully created and assigned ${createdAssignments.length} assignment(s)`,
        data: { createdAssignments }
    });
}));

module.exports = router;
