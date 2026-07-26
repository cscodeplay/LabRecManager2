const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- STARTING DATABASE CLEANUP ---');

    // 1. Find all student IDs
    const students = await prisma.user.findMany({
        where: { role: 'student' },
        select: { id: true }
    });
    const studentIds = students.map(s => s.id);
    console.log(`Found ${studentIds.length} student records to delete.`);

    if (studentIds.length > 0) {
        // Delete dependent records first to avoid foreign key constraints
        await prisma.classEnrollment.deleteMany({ where: { studentId: { in: studentIds } } });
        await prisma.groupMember.deleteMany({ where: { studentId: { in: studentIds } } });
        await prisma.submission.deleteMany({ where: { studentId: { in: studentIds } } });
        await prisma.ticketComment.deleteMany({ where: { userId: { in: studentIds } } });
        await prisma.ticket.deleteMany({ where: { OR: [{ createdById: { in: studentIds } }, { assignedToId: { in: studentIds } }] } });
        await prisma.userSession.deleteMany({ where: { userId: { in: studentIds } } });
        await prisma.activityLog.deleteMany({ where: { userId: { in: studentIds } } });

        // Delete student users
        const deletedUsers = await prisma.user.deleteMany({
            where: { id: { in: studentIds } }
        });
        console.log(`Successfully deleted ${deletedUsers.count} student users.`);
    }

    // 2. Identify current academic year
    const currentYear = await prisma.academicYear.findFirst({
        where: { isCurrent: true }
    });

    if (!currentYear) {
        console.error('No current academic year found!');
        return;
    }
    console.log(`Current Academic Year: ${currentYear.yearLabel} (${currentYear.id})`);

    // 3. Remove classes from non-current academic years
    const nonCurrentClassRecords = await prisma.class.findMany({
        where: { academicYearId: { not: currentYear.id } },
        select: { id: true }
    });
    const nonCurrentClassIds = nonCurrentClassRecords.map(c => c.id);

    if (nonCurrentClassIds.length > 0) {
        await prisma.assignmentTarget.deleteMany({ where: { targetClassId: { in: nonCurrentClassIds } } });
        const oldGroups = await prisma.studentGroup.findMany({ where: { classId: { in: nonCurrentClassIds } }, select: { id: true } });
        const oldGroupIds = oldGroups.map(g => g.id);
        if (oldGroupIds.length > 0) {
            await prisma.assignmentTarget.deleteMany({ where: { targetGroupId: { in: oldGroupIds } } });
            await prisma.groupMember.deleteMany({ where: { groupId: { in: oldGroupIds } } });
            await prisma.studentGroup.deleteMany({ where: { id: { in: oldGroupIds } } });
        }
        await prisma.classSubject.deleteMany({ where: { classId: { in: nonCurrentClassIds } } });
        await prisma.timetableSlot.deleteMany({ where: { timetable: { classId: { in: nonCurrentClassIds } } } });
        await prisma.timetable.deleteMany({ where: { classId: { in: nonCurrentClassIds } } });
        await prisma.lecturePlan.deleteMany({ where: { classId: { in: nonCurrentClassIds } } });

        const nonCurrentClasses = await prisma.class.deleteMany({
            where: { id: { in: nonCurrentClassIds } }
        });
        console.log(`Removed ${nonCurrentClasses.count} classes from non-current academic years.`);
    }

    // 4. Verify remaining classes
    const remainingClasses = await prisma.class.findMany({
        select: { id: true, name: true, academicYearId: true }
    });
    console.log(`\nRemaining active classes in current session (${currentYear.yearLabel}): ${remainingClasses.length}`);
    console.log(remainingClasses.map(c => c.name));

    console.log('\n--- CLEANUP COMPLETE ---');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
