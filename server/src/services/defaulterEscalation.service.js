/**
 * Defaulter Escalation Service for LabRecManager
 * Scans, identifies, categorizes, and executes automated multi-channel escalations
 * for overdue lab assignments, pending practicals, and attendance shortages.
 */

const prisma = require('../config/database');
const parentNotificationService = require('./parentNotification.service');

class DefaulterEscalationService {
    /**
     * Scan and categorize all academic and practical defaulters.
     */
    async scanDefaulters({ schoolId, classId = null, daysOverdueThreshold = 1 }) {
        const now = new Date();

        // 1. Fetch published assignments where due_date has elapsed
        const assignmentWhere = {
            due_date: { lt: now },
            status: 'published'
        };
        if (schoolId) assignmentWhere.schoolId = schoolId;

        const overdueAssignments = await prisma.assignment.findMany({
            where: assignmentWhere,
            include: {
                subject: { select: { id: true, name: true, nameHindi: true, code: true } },
                school: { select: { id: true, name: true, primaryLanguage: true } },
                targets: {
                    select: {
                        targetType: true,
                        targetClassId: true,
                        targetGroupId: true,
                        targetStudentId: true,
                        dueDate: true
                    }
                },
                submissions: {
                    select: {
                        id: true,
                        studentId: true,
                        status: true,
                        submittedAt: true
                    }
                }
            }
        });

        // 2. Build student target map and find missing submissions
        const studentDefaulterMap = new Map();

        for (const assignment of overdueAssignments) {
            const defaultDueDate = new Date(assignment.due_date);

            // Determine students targeted by this assignment
            for (const target of assignment.targets) {
                const effectiveDueDate = target.dueDate ? new Date(target.dueDate) : defaultDueDate;
                const daysOverdue = Math.max(1, Math.floor((now - effectiveDueDate) / (1000 * 60 * 60 * 24)));

                if (daysOverdue < daysOverdueThreshold) continue;

                let targetedStudentIds = new Set();

                if (target.targetStudentId) {
                    targetedStudentIds.add(target.targetStudentId);
                } else if (target.targetClassId) {
                    if (classId && target.targetClassId !== classId) continue;
                    const enrollments = await prisma.classEnrollment.findMany({
                        where: { classId: target.targetClassId, status: 'active' },
                        select: { studentId: true }
                    });
                    enrollments.forEach(e => targetedStudentIds.add(e.studentId));
                } else if (target.targetGroupId) {
                    const groupMembers = await prisma.groupMember.findMany({
                        where: { groupId: target.targetGroupId },
                        select: { studentId: true }
                    });
                    groupMembers.forEach(gm => targetedStudentIds.add(gm.studentId));
                }

                // Create submission lookup by studentId
                const submissionLookup = new Map();
                for (const sub of assignment.submissions) {
                    submissionLookup.set(sub.studentId, sub);
                }

                // Check each targeted student
                for (const studentId of targetedStudentIds) {
                    const sub = submissionLookup.get(studentId);
                    const isMissingOrIncomplete = !sub || ['draft', 'needs_revision'].includes(sub.status);

                    if (isMissingOrIncomplete) {
                        if (!studentDefaulterMap.has(studentId)) {
                            studentDefaulterMap.set(studentId, {
                                studentId,
                                schoolId: assignment.schoolId,
                                schoolName: assignment.school?.name || 'School Lab Portal',
                                items: []
                            });
                        }

                        studentDefaulterMap.get(studentId).items.push({
                            assignmentId: assignment.id,
                            title: assignment.title,
                            titleHindi: assignment.titleHindi,
                            subjectName: assignment.subject?.name || 'Practical Lab',
                            subjectHindi: assignment.subject?.nameHindi,
                            dueDate: effectiveDueDate,
                            daysOverdue,
                            submissionStatus: sub ? sub.status : 'not_submitted'
                        });
                    }
                }
            }
        }

        // 3. Hydrate student details and compute escalation tiers
        const defaulters = [];
        const studentIds = Array.from(studentDefaulterMap.keys());

        if (studentIds.length === 0) return [];

        const students = await prisma.user.findMany({
            where: { id: { in: studentIds }, isActive: true },
            select: {
                id: true,
                firstName: true,
                firstNameHindi: true,
                lastName: true,
                lastNameHindi: true,
                email: true,
                phone: true,
                admissionNumber: true,
                studentId: true,
                schoolId: true,
                parentName: true,
                parentPhone: true,
                parentEmail: true,
                parentRelation: true,
                parentWhatsAppEnabled: true,
                classEnrollments: {
                    where: { status: 'active' },
                    include: { class: { select: { id: true, name: true } } }
                }
            }
        });

        for (const student of students) {
            const defaulterData = studentDefaulterMap.get(student.id);
            if (!defaulterData || defaulterData.items.length === 0) continue;

            const primaryClass = student.classEnrollments[0]?.class?.name || 'Assigned Class';
            const primaryClassId = student.classEnrollments[0]?.class?.id || null;

            // If filtering by class and student is not in it, skip
            if (classId && primaryClassId !== classId) continue;

            // Maximum days overdue among all pending items
            const maxDaysOverdue = Math.max(...defaulterData.items.map(i => i.daysOverdue));

            // Escalation Level calculation:
            // Level 1 (1 - 2 days overdue): Gentle In-App + Student Email
            // Level 2 (3 - 6 days overdue): Warning Alert + Parent WhatsApp & Parent Email
            // Level 3 (7+ days overdue): Critical Defaulter Notice + SMS / WhatsApp / Email
            let escalationLevel = 1;
            let recommendedChannels = ['in_app', 'email'];

            if (maxDaysOverdue >= 7) {
                escalationLevel = 3;
                recommendedChannels = ['in_app', 'whatsapp', 'email', 'sms'];
            } else if (maxDaysOverdue >= 3) {
                escalationLevel = 2;
                recommendedChannels = ['in_app', 'whatsapp', 'email'];
            }

            const targetParentPhone = student.parentPhone || student.phone;
            const targetParentEmail = student.parentEmail || student.email;

            defaulters.push({
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`.trim(),
                studentNameHindi: student.firstNameHindi ? `${student.firstNameHindi} ${student.lastNameHindi || ''}`.trim() : null,
                admissionNumber: student.admissionNumber || student.studentId || 'N/A',
                className: primaryClass,
                classId: primaryClassId,
                schoolId: student.schoolId,
                schoolName: defaulterData.schoolName,
                parentName: student.parentName || `${student.firstName}'s Parent/Guardian`,
                parentPhone: targetParentPhone,
                parentEmail: targetParentEmail,
                parentRelation: student.parentRelation || 'Guardian',
                parentWhatsAppEnabled: student.parentWhatsAppEnabled ?? true,
                hasWhatsAppContact: Boolean(targetParentPhone),
                hasEmailContact: Boolean(targetParentEmail),
                escalationLevel,
                maxDaysOverdue,
                recommendedChannels,
                items: defaulterData.items
            });
        }

        // Sort descending by escalation level and days overdue
        defaulters.sort((a, b) => b.escalationLevel - a.escalationLevel || b.maxDaysOverdue - a.maxDaysOverdue);

        return defaulters;
    }

    /**
     * Dispatch multi-channel notifications to identified defaulters.
     */
    async dispatchEscalations({
        schoolId,
        classId = null,
        studentIds = null,
        forceChannels = null,
        dryRun = false,
        triggeredBy = null
    }) {
        const allDefaulters = await this.scanDefaulters({ schoolId, classId });
        const targetDefaulters = studentIds && studentIds.length > 0
            ? allDefaulters.filter(d => studentIds.includes(d.studentId))
            : allDefaulters;

        const results = {
            totalIdentified: targetDefaulters.length,
            dispatched: 0,
            skippedRecently: 0,
            failed: 0,
            details: []
        };

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        for (const defaulter of targetDefaulters) {
            // 1. Idempotency Check: Don't spam parent with duplicate alerts within 24 hours
            const recentNotification = await prisma.notification.findFirst({
                where: {
                    userId: defaulter.studentId,
                    type: 'parent_defaulter_alert',
                    createdAt: { gte: oneDayAgo }
                }
            });

            if (recentNotification && !studentIds) {
                results.skippedRecently++;
                results.details.push({
                    studentId: defaulter.studentId,
                    studentName: defaulter.studentName,
                    status: 'skipped_recent_alert',
                    lastDispatchedAt: recentNotification.createdAt
                });
                continue;
            }

            // Determine channels to use
            const channelsToUse = forceChannels || defaulter.recommendedChannels;
            const channelDispatches = {};

            // Bilingual message construction
            const subjectNames = [...new Set(defaulter.items.map(i => i.subjectName))].join(', ');
            const pendingCount = defaulter.items.length;

            const textEn = `Notice: ${defaulter.studentName} has ${pendingCount} pending practical assignment(s) in ${subjectNames} (${defaulter.maxDaysOverdue} days overdue). Please ensure completion immediately.`;
            const textHi = `सूचना: आपके पाल्य ${defaulter.studentName} के ${subjectNames} में ${pendingCount} प्रैक्टिकल असाइनमेंट बकाया हैं (${defaulter.maxDaysOverdue} दिनों से लंबित)। कृपया समय पर जमा कराएं।`;

            const actionUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/my-work`;

            if (!dryRun) {
                // A. WhatsApp Channel
                if (channelsToUse.includes('whatsapp') && defaulter.parentWhatsAppEnabled && defaulter.parentPhone) {
                    const waRes = await parentNotificationService.sendWhatsApp({
                        toPhone: defaulter.parentPhone,
                        parentName: defaulter.parentName,
                        studentName: defaulter.studentName,
                        message: textEn,
                        messageHindi: textHi,
                        schoolName: defaulter.schoolName,
                        actionUrl
                    });
                    channelDispatches.whatsapp = waRes;
                }

                // B. Email Channel
                if (channelsToUse.includes('email') && defaulter.parentEmail) {
                    const emRes = await parentNotificationService.sendEmail({
                        toEmail: defaulter.parentEmail,
                        parentName: defaulter.parentName,
                        studentName: defaulter.studentName,
                        admissionNumber: defaulter.admissionNumber,
                        className: defaulter.className,
                        schoolName: defaulter.schoolName,
                        escalationLevel: defaulter.escalationLevel,
                        items: defaulter.items,
                        actionUrl
                    });
                    channelDispatches.email = emRes;
                }

                // C. SMS Channel
                if (channelsToUse.includes('sms') && defaulter.parentPhone) {
                    const smsRes = await parentNotificationService.sendSMS({
                        toPhone: defaulter.parentPhone,
                        message: textEn,
                        schoolName: defaulter.schoolName
                    });
                    channelDispatches.sms = smsRes;
                }

                // D. In-App Notification (Student & Class Teacher)
                const inAppNotification = await prisma.notification.create({
                    data: {
                        userId: defaulter.studentId,
                        title: `Defaulter Notice: ${pendingCount} Pending Lab Practical(s)`,
                        title_hindi: `चूक सूचना: ${pendingCount} लंबित प्रैक्टिकल`,
                        message: textEn,
                        message_hindi: textHi,
                        type: 'parent_defaulter_alert',
                        reference_type: 'defaulter_escalation',
                        reference_id: `level-${defaulter.escalationLevel}`,
                        action_url: '/my-work',
                        is_read: false
                    }
                }).catch(err => console.error('[InApp Notification] Error creating alert:', err.message));

                channelDispatches.in_app = { success: Boolean(inAppNotification) };

                // Log in ActivityLog
                await prisma.activityLog.create({
                    data: {
                        userId: triggeredBy || defaulter.studentId,
                        schoolId: defaulter.schoolId,
                        action: 'defaulter_escalation_dispatched',
                        entityType: 'defaulter_notice',
                        entityId: defaulter.studentId,
                        details: {
                            studentName: defaulter.studentName,
                            escalationLevel: defaulter.escalationLevel,
                            channels: channelsToUse,
                            dispatches: channelDispatches,
                            itemCount: pendingCount
                        }
                    }
                }).catch(() => {});
            }

            results.dispatched++;
            results.details.push({
                studentId: defaulter.studentId,
                studentName: defaulter.studentName,
                escalationLevel: defaulter.escalationLevel,
                channelsUsed: channelsToUse,
                channelDispatches,
                status: dryRun ? 'simulated' : 'dispatched'
            });
        }

        return results;
    }

    /**
     * Automated Cron Handler: Runs on scheduled weekday evenings
     */
    async dispatchAutomatedEscalations() {
        console.log('[Defaulter Escalation Cron] Running automated defaulter scan & parent notifications...');
        try {
            const schools = await prisma.school.findMany({ select: { id: true, name: true } });
            let totalSent = 0;

            for (const school of schools) {
                const result = await this.dispatchEscalations({
                    schoolId: school.id,
                    dryRun: false
                });
                totalSent += result.dispatched;
                if (result.dispatched > 0) {
                    console.log(`[Defaulter Cron] Dispatched ${result.dispatched} notices for ${school.name}`);
                }
            }

            return { success: true, totalSent };
        } catch (error) {
            console.error('[Defaulter Escalation Cron] Failed:', error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new DefaulterEscalationService();
