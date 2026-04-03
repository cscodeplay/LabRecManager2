const cron = require('node-cron');
const prisma = require('../config/database');
const logger = console; // Use console as logger fallback

let ioInstance = null;

const setSocketIO = (io) => {
    ioInstance = io;
};

const initCronJobs = () => {
    // Run every day at midnight
    cron.schedule('0 0 * * *', async () => {
        logger.info('Running cron job: Cleaning up trash items older than 30 days');
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Find documents to delete
            const documentsToDelete = await prisma.document.findMany({
                where: {
                    deletedAt: {
                        lt: thirtyDaysAgo
                    }
                }
            });

            if (documentsToDelete.length > 0) {
                // Determine unique users to update storage
                const userStorageUpdates = {};
                for (const doc of documentsToDelete) {
                    if (doc.updatedById) { // Assuming uploadedById is the owner, or we use createdBy. Document model has uploadedById ? 
                        // Let's check schema. It has `uploadedById`.
                        // But wait, the previous code for permanent delete used `uploadedBy`.
                        // Let's assume `uploadedById` is the field.
                        if (!userStorageUpdates[doc.uploadedById]) {
                            userStorageUpdates[doc.uploadedById] = 0n;
                        }
                        userStorageUpdates[doc.uploadedById] += BigInt(doc.fileSize);
                    }
                }

                // Delete documents
                const deleteResult = await prisma.document.deleteMany({
                    where: {
                        deletedAt: {
                            lt: thirtyDaysAgo
                        }
                    }
                });

                logger.info(`Deleted ${deleteResult.count} old documents from trash`);

                // Update storage for users
                for (const [userId, bytesToRemove] of Object.entries(userStorageUpdates)) {
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            storageUsedBytes: {
                                decrement: bytesToRemove
                            }
                        }
                    }).catch(err => logger.error(`Failed to update storage for user ${userId} in cron: ${err.message}`));
                }
            } else {
                logger.info('No documents to clean up');
            }
        } catch (error) {
            logger.error('Error running trash cleanup cron job:', error);
        }
    });

    // Keep-alive ping every 4 minutes to prevent Neon DB cold starts
    cron.schedule('*/4 * * * *', async () => {
        try {
            await prisma.$queryRaw`SELECT 1`;
            logger.info('DB keep-alive ping OK');
        } catch (error) {
            logger.error('DB keep-alive ping failed:', error.message);
        }
    });

    // ===========================================
    // TIMETABLE: 5-minute-before notification
    // Runs every minute, checks for periods starting within 5 minutes
    // ===========================================
    cron.schedule('* * * * *', async () => {
        if (!ioInstance) return;

        try {
            const now = new Date();
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayOfWeek = days[now.getDay()];

            // Skip weekday check — just skip Sunday
            if (dayOfWeek === 'sunday') return;

            // Check if today is a holiday for any school
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const holidays = await prisma.schoolCalendar.findMany({
                where: { date: todayStart, isHoliday: true },
                select: { schoolId: true }
            });
            const holidaySchoolIds = new Set(holidays.map(h => h.schoolId));

            // Current time + 5 minutes
            const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);
            const targetTime = `${String(fiveMinLater.getHours()).padStart(2, '0')}:${String(fiveMinLater.getMinutes()).padStart(2, '0')}`;

            // Find slots that start at exactly targetTime today
            const upcomingSlots = await prisma.timetableSlot.findMany({
                where: {
                    dayOfWeek,
                    startTime: targetTime,
                    timetable: { isActive: true },
                    slotType: { in: ['lecture', 'lab'] } // Only notify for real periods, not breaks
                },
                include: {
                    subject: { select: { name: true, nameHindi: true, code: true } },
                    instructor: { select: { id: true, firstName: true, lastName: true } },
                    timetable: {
                        select: {
                            schoolId: true,
                            class: {
                                select: {
                                    id: true, name: true,
                                    classEnrollments: {
                                        where: { status: 'active' },
                                        select: { studentId: true }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (upcomingSlots.length === 0) return;

            for (const slot of upcomingSlots) {
                const schoolId = slot.timetable.schoolId;

                // Skip if school is on holiday
                if (holidaySchoolIds.has(schoolId)) continue;

                const notification = {
                    type: 'timetable:period-starting',
                    periodNumber: slot.periodNumber,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    subject: slot.subject?.name || 'Period',
                    subjectHindi: slot.subject?.nameHindi || null,
                    subjectCode: slot.subject?.code || null,
                    roomNumber: slot.roomNumber,
                    instructor: slot.instructor ? `${slot.instructor.firstName} ${slot.instructor.lastName}` : null,
                    className: slot.timetable.class?.name || '',
                    minutesUntil: 5,
                    message: `${slot.subject?.name || 'Next period'} starts in 5 minutes`,
                    messageHindi: `${slot.subject?.nameHindi || 'अगली कक्षा'} 5 मिनट में शुरू होगी`
                };

                // Notify the instructor
                if (slot.instructor?.id) {
                    ioInstance.to(`user-${slot.instructor.id}`).emit('timetable:period-starting', notification);
                }

                // Notify all enrolled students
                const studentIds = slot.timetable.class?.classEnrollments?.map(e => e.studentId) || [];
                for (const studentId of studentIds) {
                    ioInstance.to(`user-${studentId}`).emit('timetable:period-starting', notification);
                }
            }

            if (upcomingSlots.length > 0) {
                logger.info(`[Timetable Cron] Sent ${upcomingSlots.length} period notifications for ${targetTime}`);
            }
        } catch (error) {
            // Quiet fail — don't crash the server
            logger.error('[Timetable Cron] Error:', error.message);
        }
    });

    logger.info('Cron jobs initialized (with DB keep-alive + timetable notifications)');
};

module.exports = { initCronJobs, setSocketIO };
