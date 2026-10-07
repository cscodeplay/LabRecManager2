/**
 * Import Loom CSV Students Migration Script
 * 
 * Objectives:
 * 1. Safely backup existing student data before deletion
 * 2. Delete existing 354 student user records and their dependent rows
 * 3. Clean up the 6 old demo classes in current academic year 2026-27
 * 4. Create the 19 actual classes for Grade 11 & 12 (Sections A-J) in 2026-27
 * 5. Import 769 students from server/uploads/loom.csv with:
 *    - 8-digit studentId: 20260001 to 20260769
 *    - email ending with @msschool.com (firstname.lastname@msschool.com, deduplicated)
 *    - default password 'Student@123'
 *    - sequential rollNumber per class section
 *    - active ClassEnrollment
 * 6. Verify non-student staff/admin accounts remain untouched
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('../server/node_modules/bcryptjs');
const csv = require('../server/node_modules/csv-parser');
const prisma = require('../server/src/config/database');

const CSV_PATH = path.resolve(__dirname, '../server/uploads/loom.csv');
const BACKUP_PATH = path.resolve(__dirname, 'backup_students_before_loom.json');

function toTitleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .trim();
}

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', data => results.push(data))
      .on('end', () => resolve(results))
      .on('error', err => reject(err));
  });
}

// 19 Class definitions
const CLASS_DEFINITIONS = [
  // Grade 11
  { grade: 11, sec: 'A', name: 'Class 11-A', stream: 'Science' },
  { grade: 11, sec: 'B', name: 'Class 11-B', stream: 'Science' },
  { grade: 11, sec: 'C', name: 'Class 11-C', stream: 'Science' },
  { grade: 11, sec: 'D', name: 'Class 11-D', stream: 'Science' },
  { grade: 11, sec: 'E', name: 'Class 11-E', stream: 'General' },
  { grade: 11, sec: 'G', name: 'Class 11-G', stream: 'Science' },
  { grade: 11, sec: 'H', name: 'Class 11-H', stream: 'General' },
  { grade: 11, sec: 'I', name: 'Class 11-I', stream: 'General' },
  { grade: 11, sec: 'J', name: 'Class 11-J', stream: 'General' },
  // Grade 12
  { grade: 12, sec: 'A', name: 'Class 12-A', stream: 'Science' },
  { grade: 12, sec: 'B', name: 'Class 12-B', stream: 'Science' },
  { grade: 12, sec: 'C', name: 'Class 12-C', stream: 'Science' },
  { grade: 12, sec: 'D', name: 'Class 12-D', stream: 'Science' },
  { grade: 12, sec: 'E', name: 'Class 12-E', stream: 'Science' },
  { grade: 12, sec: 'F', name: 'Class 12-F', stream: 'Science' },
  { grade: 12, sec: 'G', name: 'Class 12-G', stream: 'Science' },
  { grade: 12, sec: 'H', name: 'Class 12-H', stream: 'Science' },
  { grade: 12, sec: 'I', name: 'Class 12-I', stream: 'Commerce' },
  { grade: 12, sec: 'J', name: 'Class 12-J', stream: 'Commerce' },
];

async function main() {
  console.log('====================================================');
  console.log('🚀 STARTING LOOM CSV STUDENT DATA IMPORT MIGRATION');
  console.log('====================================================');

  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV file not found at: ${CSV_PATH}`);
  }

  const activeYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true }
  });
  if (!activeYear) throw new Error('No active academic year found in database!');

  // 1. Get School linked to the Active Academic Year
  const school = await prisma.school.findUnique({
    where: { id: activeYear.schoolId }
  });
  if (!school) throw new Error(`School ${activeYear.schoolId} not found in database!`);

  console.log(`🏫 School: ${school.name} (${school.id})`);
  console.log(`📅 Academic Year: ${activeYear.yearLabel} (${activeYear.id})`);

  // Verify non-student staff/admins before doing anything
  const staffUsers = await prisma.user.findMany({
    where: { role: { not: 'student' } },
    select: { id: true, email: true, role: true, firstName: true, lastName: true }
  });
  console.log(`🛡️  Verified ${staffUsers.length} staff/admin accounts will be preserved:`);
  staffUsers.forEach(s => console.log(`   - [${s.role}] ${s.firstName} ${s.lastName} (${s.email})`));

  // 2. Fetch and Backup Existing Students
  const existingStudents = await prisma.user.findMany({
    where: { role: 'student' },
    include: {
      classEnrollments: true
    }
  });
  console.log(`\n📦 Backing up ${existingStudents.length} existing student records...`);
  fs.writeFileSync(
    BACKUP_PATH,
    JSON.stringify(existingStudents, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2),
    'utf8'
  );
  console.log(`✅ Backup successfully saved to: ${BACKUP_PATH}`);

  const studentIds = existingStudents.map(s => s.id);

  // 3. Delete dependent rows for existing students
  if (studentIds.length > 0) {
    console.log(`\n🧹 Cleaning up dependent data for ${studentIds.length} existing students...`);

    const delLaptops = await prisma.laptopIssuance.deleteMany({
      where: {
        OR: [
          { issuedToId: { in: studentIds } },
          { issuedById: { in: studentIds } },
          { receivedById: { in: studentIds } }
        ]
      }
    });
    console.log(`   - Deleted ${delLaptops.count} laptop issuance records`);

    const delCoding = await prisma.codingSubmission.deleteMany({
      where: { studentId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delCoding.count} coding submissions`);

    const delProg = await prisma.studentTrainingProgress.deleteMany({
      where: { studentId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delProg.count} student training progress records`);

    const delMastery = await prisma.studentUnitMastery.deleteMany({
      where: { studentId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delMastery.count} student unit mastery records`);

    const delFinalMarks = await prisma.finalLabMarks.deleteMany({
      where: { studentId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delFinalMarks.count} final lab marks records`);

    const delLabAtt = await prisma.labAttendance.deleteMany({
      where: { studentId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delLabAtt.count} lab attendance records`);

    const delLecAtt = await prisma.lectureAttendance.deleteMany({
      where: { studentId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delLecAtt.count} lecture attendance records`);

    const delUsage = await prisma.labMaterialUsage.deleteMany({
      where: { studentId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delUsage.count} material usage records`);

    const delQuizSubs = await prisma.quizSubmission.deleteMany({
      where: { userId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delQuizSubs.count} quiz submissions`);

    const delQuizAssigns = await prisma.quizAssignment.deleteMany({
      where: { targetStudentId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delQuizAssigns.count} quiz target assignments`);

    const delEnrollments = await prisma.classEnrollment.deleteMany({
      where: { studentId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delEnrollments.count} class enrollments`);

    const delGroupMembers = await prisma.groupMember.deleteMany({
      where: { studentId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delGroupMembers.count} group member records`);

    const delSubmissions = await prisma.submission.deleteMany({
      where: { studentId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delSubmissions.count} submissions`);

    const delTicketComments = await prisma.ticketComment.deleteMany({
      where: { userId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delTicketComments.count} ticket comments`);

    const delTickets = await prisma.ticket.deleteMany({
      where: {
        OR: [
          { createdById: { in: studentIds } },
          { assignedToId: { in: studentIds } }
        ]
      }
    });
    console.log(`   - Deleted ${delTickets.count} tickets`);

    const delSessions = await prisma.userSession.deleteMany({
      where: { userId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delSessions.count} user sessions`);

    const delActivity = await prisma.activityLog.deleteMany({
      where: { userId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delActivity.count} activity logs`);

    const delAudit = await prisma.auditLog.deleteMany({
      where: { userId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delAudit.count} audit logs`);

    const delNotifications = await prisma.notification.deleteMany({
      where: { userId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delNotifications.count} notifications`);

    const delParticipants = await prisma.meetingParticipant.deleteMany({
      where: { userId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delParticipants.count} meeting participants`);

    const delMeetings = await prisma.meeting.deleteMany({
      where: {
        OR: [
          { targetStudentId: { in: studentIds } },
          { hostId: { in: studentIds } }
        ]
      }
    });
    console.log(`   - Deleted ${delMeetings.count} meetings`);

    const delDocViews = await prisma.documentViewLog.deleteMany({
      where: { userId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delDocViews.count} document view logs`);

    const delDocShares = await prisma.documentShare.deleteMany({
      where: {
        OR: [
          { sharedById: { in: studentIds } },
          { targetUserId: { in: studentIds } }
        ]
      }
    });
    console.log(`   - Deleted ${delDocShares.count} document shares`);

    const delDocs = await prisma.document.deleteMany({
      where: {
        OR: [
          { uploadedById: { in: studentIds } },
          { deletedById: { in: studentIds } }
        ]
      }
    });
    console.log(`   - Deleted ${delDocs.count} documents`);

    const delFolderShares = await prisma.folderShare.deleteMany({
      where: {
        OR: [
          { sharedById: { in: studentIds } },
          { targetUserId: { in: studentIds } }
        ]
      }
    });
    console.log(`   - Deleted ${delFolderShares.count} folder shares`);

    const delFolders = await prisma.documentFolder.deleteMany({
      where: { createdById: { in: studentIds } }
    });
    console.log(`   - Deleted ${delFolders.count} document folders`);

    const delPolls = await prisma.lecturePollResponse.deleteMany({
      where: { studentId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delPolls.count} lecture poll responses`);

    const delWbShares = await prisma.whiteboardRecordingShare.deleteMany({
      where: {
        OR: [
          { sharedById: { in: studentIds } },
          { targetUserId: { in: studentIds } }
        ]
      }
    });
    console.log(`   - Deleted ${delWbShares.count} whiteboard shares`);

    const delWbFiles = await prisma.whiteboardFile.deleteMany({
      where: { ownerId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delWbFiles.count} whiteboard files`);

    const delWbParticipants = await prisma.whiteboardParticipant.deleteMany({
      where: { userId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delWbParticipants.count} whiteboard participants`);

    const delWbSessions = await prisma.whiteboardSession.deleteMany({
      where: { hostId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delWbSessions.count} whiteboard sessions`);

    const delDeviceTests = await prisma.deviceTest.deleteMany({
      where: { userId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delDeviceTests.count} device tests`);

    const delChats = await prisma.chatSession.deleteMany({
      where: { userId: { in: studentIds } }
    });
    console.log(`   - Deleted ${delChats.count} chat sessions`);

    const delCreatedGroups = await prisma.studentGroup.deleteMany({
      where: { createdById: { in: studentIds } }
    });
    console.log(`   - Deleted ${delCreatedGroups.count} student groups created by students`);

    // Delete existing student users
    const delUsers = await prisma.user.deleteMany({
      where: { id: { in: studentIds } }
    });
    console.log(`🗑️  Successfully deleted ${delUsers.count} existing student user accounts.`);
  }

  // 4. Remove old demo classes for active academic year (2026-27)
  const oldDemoClasses = await prisma.class.findMany({
    where: {
      academicYearId: activeYear.id,
      name: { in: ['11 Med A', '12 NM A', '11 NM A', '11 NM B', '12 NM B', '12 Med A'] }
    }
  });
  if (oldDemoClasses.length > 0) {
    const oldClassIds = oldDemoClasses.map(c => c.id);
    const oldGroups = await prisma.studentGroup.findMany({
      where: { classId: { in: oldClassIds } },
      select: { id: true }
    });
    const oldGroupIds = oldGroups.map(g => g.id);
    if (oldGroupIds.length > 0) {
      await prisma.assignmentTarget.deleteMany({ where: { targetGroupId: { in: oldGroupIds } } });
      await prisma.groupMember.deleteMany({ where: { groupId: { in: oldGroupIds } } });
      await prisma.quizAssignment.deleteMany({ where: { targetGroupId: { in: oldGroupIds } } });
      await prisma.meeting.deleteMany({ where: { targetGroupId: { in: oldGroupIds } } });
      await prisma.studentGroup.deleteMany({ where: { id: { in: oldGroupIds } } });
    }
    await prisma.quizAssignment.deleteMany({ where: { targetClassId: { in: oldClassIds } } });
    await prisma.assignmentTarget.deleteMany({ where: { targetClassId: { in: oldClassIds } } });
    await prisma.class.deleteMany({ where: { id: { in: oldClassIds } } });
    console.log(`🧹 Removed ${oldDemoClasses.length} old demo classes from academic year ${activeYear.yearLabel}.`);
  }

  // 5. Ensure the 19 Classes in current academic year
  console.log(`\n🏫 Ensuring 19 classes exist for Academic Year ${activeYear.yearLabel}...`);
  const classMap = new Map(); // Key: 'XI-A' -> Class, 'XII-A' -> Class
  for (const cDef of CLASS_DEFINITIONS) {
    const cls = await prisma.class.upsert({
      where: {
        unique_class_name_per_school: {
          schoolId: school.id,
          name: cDef.name,
          academicYearId: activeYear.id
        }
      },
      update: {
        gradeLevel: cDef.grade,
        section: cDef.sec,
        stream: cDef.stream,
        maxStudents: 60
      },
      create: {
        schoolId: school.id,
        academicYearId: activeYear.id,
        name: cDef.name,
        gradeLevel: cDef.grade,
        section: cDef.sec,
        stream: cDef.stream,
        maxStudents: 60
      }
    });

    const romanGrade = cDef.grade === 11 ? 'XI' : 'XII';
    const key = `${romanGrade}-${cDef.sec}`;
    classMap.set(key, cls);
    console.log(`   - Ready: ${cls.name} (${key}, Stream: ${cDef.stream})`);
  }

  // 6. Parse and Prepare CSV Data
  console.log(`\n📄 Parsing ${CSV_PATH}...`);
  const rawRows = await parseCSV(CSV_PATH);
  console.log(`   Found ${rawRows.length} student rows.`);

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('Student@123', salt);

  const studentsToInsert = [];
  const emailSet = new Set();
  const rollPerSection = {}; // Tracks roll numbers: key 'XI-C' -> 1, 2, 3...

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rawName = (row['Name'] || '').trim();
    const rawFather = (row['Father Name'] || '').trim();
    const rawGender = (row['Gender'] || '').trim().toLowerCase();
    const rawClass = (row['Class'] || '').trim().toUpperCase();
    const rawSec = (row['Section'] || '').trim().toUpperCase();
    const classKey = `${rawClass}-${rawSec}`;

    const targetClass = classMap.get(classKey);
    if (!targetClass) {
      console.warn(`⚠️ Row ${i + 2}: Unknown class ${classKey} for student ${rawName}`);
    }

    // Name formatting
    const parts = rawName.split(/\s+/).filter(Boolean);
    let firstName = '';
    let lastName = '';

    if (parts.length > 1) {
      firstName = toTitleCase(parts[0]);
      lastName = toTitleCase(parts.slice(1).join(' '));
    } else if (parts.length === 1) {
      firstName = toTitleCase(parts[0]);
      const fatherParts = rawFather.split(/\s+/).filter(p => p && p !== 'NA');
      if (fatherParts.length > 1) {
        lastName = toTitleCase(fatherParts.slice(1).join(' '));
      } else if (fatherParts.length === 1) {
        lastName = toTitleCase(fatherParts[0]);
      } else {
        lastName = rawGender === 'female' ? 'Kaur' : 'Singh';
      }
    } else {
      firstName = 'Student';
      lastName = 'User';
    }

    // Sequential 8-digit ID: 20260001 + i
    const studentId = String(20260001 + i);

    // Email generation: clean names + @msschool.com
    const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
    let email = `${cleanFirst}.${cleanLast}@msschool.com`;
    if (emailSet.has(email)) {
      email = `${cleanFirst}.${cleanLast}.${studentId}@msschool.com`;
    }
    emailSet.add(email);

    // Admission Number
    const rawAdm = (row['Admission No.'] || '').trim();
    const admissionNumber = rawAdm && rawAdm !== 'NA' ? rawAdm : studentId;

    // Roll number sequentially per class section
    rollPerSection[classKey] = (rollPerSection[classKey] || 0) + 1;
    const rollNumber = rollPerSection[classKey];

    studentsToInsert.push({
      firstName,
      lastName,
      email,
      studentId,
      admissionNumber,
      gender: rawGender === 'female' ? 'female' : 'male',
      classId: targetClass ? targetClass.id : null,
      className: targetClass ? targetClass.name : null,
      rollNumber,
      classKey
    });
  }

  console.log(`\n📊 Prepared ${studentsToInsert.length} students with unique 8-digit IDs & emails.`);
  console.log('Sample 3 prepared students:');
  console.log(studentsToInsert.slice(0, 3).map(s => ({
    name: `${s.firstName} ${s.lastName}`,
    email: s.email,
    id: s.studentId,
    class: s.className,
    roll: s.rollNumber
  })));

  // 7. Insert Students and Enrollments using createMany in batches
  const usersToInsert = [];
  const enrollmentsToInsert = [];

  for (const item of studentsToInsert) {
    const userId = crypto.randomUUID();
    usersToInsert.push({
      id: userId,
      schoolId: school.id,
      email: item.email,
      passwordHash: defaultPasswordHash,
      role: 'student',
      firstName: item.firstName,
      lastName: item.lastName,
      studentId: item.studentId,
      admissionNumber: item.admissionNumber,
      gender: item.gender,
      isActive: true
    });

    if (item.classId) {
      enrollmentsToInsert.push({
        id: crypto.randomUUID(),
        studentId: userId,
        classId: item.classId,
        rollNumber: item.rollNumber,
        status: 'active'
      });
    }
  }

  console.log(`\n💾 Inserting ${usersToInsert.length} students into database...`);
  const BATCH_SIZE = 200;
  for (let b = 0; b < usersToInsert.length; b += BATCH_SIZE) {
    const chunk = usersToInsert.slice(b, b + BATCH_SIZE);
    await prisma.user.createMany({ data: chunk });
    console.log(`   ✓ Inserted users ${Math.min(b + BATCH_SIZE, usersToInsert.length)} / ${usersToInsert.length}...`);
  }

  console.log(`\n💾 Inserting ${enrollmentsToInsert.length} class enrollments into database...`);
  for (let b = 0; b < enrollmentsToInsert.length; b += BATCH_SIZE) {
    const chunk = enrollmentsToInsert.slice(b, b + BATCH_SIZE);
    await prisma.classEnrollment.createMany({ data: chunk });
    console.log(`   ✓ Inserted enrollments ${Math.min(b + BATCH_SIZE, enrollmentsToInsert.length)} / ${enrollmentsToInsert.length}...`);
  }

  // 8. Verification and Final Report
  console.log('\n====================================================');
  console.log('🔍 VERIFYING IMPORT RESULTS');
  console.log('====================================================');

  const totalStudentsInDb = await prisma.user.count({ where: { role: 'student' } });
  const totalEnrollmentsInDb = await prisma.classEnrollment.count();
  const preservedStaffCount = await prisma.user.count({ where: { role: { not: 'student' } } });

  console.log(`Total Students in DB: ${totalStudentsInDb} (Expected: 769)`);
  console.log(`Total Enrollments in DB: ${totalEnrollmentsInDb} (Expected: 769)`);
  console.log(`Preserved Staff / Admin Users: ${preservedStaffCount} (Expected: ${staffUsers.length})`);

  // Verify ID and Email rules on all students in DB
  const invalidIds = await prisma.user.count({
    where: {
      role: 'student',
      NOT: { studentId: { startsWith: '2026' } }
    }
  });

  const nonMsSchoolEmails = await prisma.user.count({
    where: {
      role: 'student',
      NOT: { email: { endsWith: '@msschool.com' } }
    }
  });

  console.log(`Students with invalid IDs: ${invalidIds} (Expected: 0)`);
  console.log(`Students with non-@msschool.com emails: ${nonMsSchoolEmails} (Expected: 0)`);

  // Print section breakdown
  console.log('\nEnrollment count per class:');
  for (const cDef of CLASS_DEFINITIONS) {
    const cls = classMap.get(`${cDef.grade === 11 ? 'XI' : 'XII'}-${cDef.sec}`);
    if (cls) {
      const count = await prisma.classEnrollment.count({ where: { classId: cls.id } });
      console.log(`   - ${cls.name}: ${count} students`);
    }
  }

  console.log('\n🎉 ALL DONE! Migration completed successfully.');
}

main()
  .catch(err => {
    console.error('❌ MIGRATION FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
