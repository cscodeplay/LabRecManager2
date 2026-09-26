const fs = require('fs');
const path = require('path');

// Fixed UUID generator helper
function uuid(prefix, num) {
  const hex = num.toString(16).padStart(4, '0');
  return `${prefix}-0000-0000-0000-${hex.padStart(12, '0')}`;
}

// Fixed UUID prefixes
const U = {
  school: '00000001',
  year: '00000002',
  user: '00000003',
  gradeScale: '00000004',
  gradeScaleHist: '00000005',
  subject: '00000006',
  class: '00000007',
  enrollment: '00000008',
  classSubject: '00000009',
  group: '0000000a',
  groupMember: '0000000b',
  lab: '0000000c',
  item: '0000000d',
  labMaint: '0000000e',
  itemMaint: '0000000f',
  labEvent: '00000010',
  labAttendance: '00000011',
  labMaterial: '00000012',
  labMaterialUsage: '00000013',
  laptopIssuance: '00000014',
  shiftRequest: '00000015',
  shiftHistory: '00000016',
  trainingModule: '00000017',
  trainingUnit: '00000018',
  trainingExercise: '00000019',
  codingSub: '0000001a',
  trainingProg: '0000001b',
  unitMastery: '0000001c',
  assignment: '0000001d',
  assignmentFile: '0000001e',
  assignmentTarget: '0000001f',
  submission: '00000020',
  submissionFile: '00000021',
  submissionRevision: '00000022',
  grade: '00000023',
  gradeHist: '00000024',
  finalLabMark: '00000025',
  docFolder: '00000026',
  doc: '00000027',
  docShare: '00000028',
  folderShare: '00000029',
  docViewLog: '0000002a',
  whiteboardFile: '0000002b',
  whiteboardSession: '0000002c',
  whiteboardParticipant: '0000002d',
  whiteboardRecording: '0000002e',
  whiteboardShare: '0000002f',
  vendor: '00000030',
  procRequest: '00000031',
  procItem: '00000032',
  procCommittee: '00000033',
  vendorQuote: '00000034',
  quoteItem: '00000035',
  ticketIssueType: '00000036',
  ticket: '00000037',
  ticketComment: '00000038',
  timetable: '00000039',
  timetableSlot: '0000003a',
  calendar: '0000003b',
  lecturePlan: '0000003c',
  lectureSession: '0000003d',
  lectureResource: '0000003e',
  lectureAttendance: '0000003f',
  lecturePoll: '00000040',
  lecturePollResp: '00000041',
  feeCategory: '00000042',
  feeStructure: '00000043',
  studentFee: '00000044',
  feePayment: '00000045',
  meeting: '00000046',
  meetingParticipant: '00000047',
  meetingQuestion: '00000048',
  notifTemplate: '00000049',
  notif: '0000004a',
  userSession: '0000004b',
  deviceTest: '0000004c',
  adminNote: '0000004d',
  activityLog: '0000004e',
  auditLog: '0000004f',
  queryLog: '00000050',
  siteUpdate: '00000051',
  systemSetting: '00000052',
  implPlan: '00000053',
  chatSession: '00000054',
  chatMessage: '00000055',
  translation: '00000056',
  importHistory: '00000057',
  reportTemplate: '00000058',
  generatedReport: '00000059'
};

// Common hashes:
// admin123: $2b$10$1qU0Hx9rCMyvrpOPpPPyzOab9p5PspOc6K4lGhdb6QB.N406LY13G
// Instructor123!: $2b$10$Nj1cC.7GrSBxROxUD3AJ5eA5L/nI0VXtJLvAbXk5Wu3TYpK.BulQq
// student123: $2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa



const targetClasses = [
  { name: '11 NM A', classNum: 4, tag: '11nma' },
  { name: '11 NM B', classNum: 5, tag: '11nmb' },
  { name: '11 Med A', classNum: 6, tag: '11meda' },
  { name: '12 NM A', classNum: 7, tag: '12nma' },
  { name: '12 NM B', classNum: 8, tag: '12nmb' },
  { name: '12 Med A', classNum: 9, tag: '12meda' }
];

const femaleNames = [
  { first: 'Ananya', hindiFirst: 'अनन्या', last: 'Sharma', hindiLast: 'शर्मा' },
  { first: 'Diya', hindiFirst: 'दिया', last: 'Patel', hindiLast: 'पटेल' },
  { first: 'Ishita', hindiFirst: 'इशिता', last: 'Gupta', hindiLast: 'गुप्ता' },
  { first: 'Riya', hindiFirst: 'रिया', last: 'Singh', hindiLast: 'सिंह' },
  { first: 'Sneha', hindiFirst: 'स्नेहा', last: 'Reddy', hindiLast: 'रेड्डी' },
  { first: 'Pooja', hindiFirst: 'पूजा', last: 'Verma', hindiLast: 'वर्मा' },
  { first: 'Simran', hindiFirst: 'सिमरन', last: 'Kaur', hindiLast: 'कौर' },
  { first: 'Tanvi', hindiFirst: 'तन्वी', last: 'Joshi', hindiLast: 'जोशी' },
  { first: 'Kavya', hindiFirst: 'काव्या', last: 'Nair', hindiLast: 'नायर' },
  { first: 'Meera', hindiFirst: 'मीरा', last: 'Iyer', hindiLast: 'अय्यर' },
  { first: 'Shreya', hindiFirst: 'श्रेया', last: 'Sen', hindiLast: 'सेन' },
  { first: 'Neha', hindiFirst: 'नेहा', last: 'Bhatia', hindiLast: 'भाटिया' },
  { first: 'Aditi', hindiFirst: 'अदिति', last: 'Rao', hindiLast: 'राव' },
  { first: 'Priyanka', hindiFirst: 'प्रियंका', last: 'Das', hindiLast: 'दास' },
  { first: 'Khushi', hindiFirst: 'खुशी', last: 'Mehta', hindiLast: 'मेहता' },
  { first: 'Roshni', hindiFirst: 'रोशनी', last: 'Saxena', hindiLast: 'सक्सेना' },
  { first: 'Navya', hindiFirst: 'नव्या', last: 'Choudhary', hindiLast: 'चौधरी' },
  { first: 'Mansi', hindiFirst: 'मानसी', last: 'Agarwal', hindiLast: 'अग्रवाल' },
  { first: 'Jaspreet', hindiFirst: 'जसप्रीत', last: 'Kaur', hindiLast: 'कौर' },
  { first: 'Harleen', hindiFirst: 'हरलीन', last: 'Kaur', hindiLast: 'कौर' },
  { first: 'Avani', hindiFirst: 'अवनी', last: 'Deshmukh', hindiLast: 'देशमुख' },
  { first: 'Bhavya', hindiFirst: 'भव्या', last: 'Trivedi', hindiLast: 'त्रिवेदी' },
  { first: 'Chhavi', hindiFirst: 'छवि', last: 'Singhania', hindiLast: 'सिंघानिया' },
  { first: 'Drishti', hindiFirst: 'दृष्टि', last: 'Malhotra', hindiLast: 'मल्होत्रा' },
  { first: 'Esha', hindiFirst: 'ईशा', last: 'Pillai', hindiLast: 'पिल्लई' },
  { first: 'Gargi', hindiFirst: 'गार्गी', last: 'Mukherjee', hindiLast: 'मुखर्जी' },
  { first: 'Ishani', hindiFirst: 'ईशानी', last: 'Banerjee', hindiLast: 'बनर्जी' },
  { first: 'Jiya', hindiFirst: 'जिया', last: 'Kulkarni', hindiLast: 'कुलकर्णी' },
  { first: 'Kriti', hindiFirst: 'कृति', last: 'Menon', hindiLast: 'मेनन' },
  { first: 'Lavanya', hindiFirst: 'लावण्या', last: 'Jain', hindiLast: 'जैन' }
];

const maleNames = [
  { first: 'Aarav', hindiFirst: 'आरव', last: 'Sharma', hindiLast: 'शर्मा' },
  { first: 'Rohan', hindiFirst: 'रोहन', last: 'Verma', hindiLast: 'वर्मा' },
  { first: 'Kabir', hindiFirst: 'कबीर', last: 'Mehta', hindiLast: 'मेहता' },
  { first: 'Vikram', hindiFirst: 'विक्रम', last: 'Malhotra', hindiLast: 'मल्होत्रा' },
  { first: 'Aditya', hindiFirst: 'आदित्य', last: 'Singh', hindiLast: 'सिंह' },
  { first: 'Manpreet', hindiFirst: 'मनप्रीत', last: 'Singh', hindiLast: 'सिंह' },
  { first: 'Gurpreet', hindiFirst: 'गुरप्रीत', last: 'Singh', hindiLast: 'सिंह' },
  { first: 'Aryan', hindiFirst: 'आर्यन', last: 'Kapoor', hindiLast: 'कपूर' },
  { first: 'Karan', hindiFirst: 'करण', last: 'Johar', hindiLast: 'जौहर' },
  { first: 'Yash', hindiFirst: 'यश', last: 'Khanna', hindiLast: 'खन्ना' },
  { first: 'Rahul', hindiFirst: 'राहुल', last: 'Gupta', hindiLast: 'गुप्ता' },
  { first: 'Arjun', hindiFirst: 'अर्जुन', last: 'Nair', hindiLast: 'नायर' },
  { first: 'Dev', hindiFirst: 'देव', last: 'Patel', hindiLast: 'पटेल' },
  { first: 'Kunal', hindiFirst: 'कुणाल', last: 'Bhatia', hindiLast: 'भाटिया' },
  { first: 'Sahil', hindiFirst: 'साहिल', last: 'Sethi', hindiLast: 'सेठी' },
  { first: 'Pranav', hindiFirst: 'प्रणव', last: 'Joshi', hindiLast: 'जोशी' },
  { first: 'Varun', hindiFirst: 'वरुण', last: 'Dhawan', hindiLast: 'धवन' },
  { first: 'Siddharth', hindiFirst: 'सिद्धार्थ', last: 'Roy', hindiLast: 'रॉय' },
  { first: 'Harshit', hindiFirst: 'हर्षित', last: 'Bansal', hindiLast: 'बंसल' },
  { first: 'Ritvik', hindiFirst: 'ऋत्विक', last: 'Soni', hindiLast: 'सोनी' }
];

// Generate 300 students: 30 girls + 20 boys for each of the 6 classes
const generatedStudents = [];
let globalStudentNum = 1;

targetClasses.forEach((cls) => {
  // 30 Girls (Roll 1-30)
  for (let i = 0; i < 30; i++) {
    const t = femaleNames[i % femaleNames.length];
    const roll = i + 1;
    const rollStr = roll.toString().padStart(3, '0');
    generatedStudents.push({
      num: globalStudentNum++,
      classNum: cls.classNum,
      className: cls.name,
      tag: cls.tag,
      first: t.first,
      hindiFirst: t.hindiFirst,
      last: t.last,
      hindiLast: t.hindiLast,
      gender: 'female',
      roll: roll,
      email: `${t.first.toLowerCase()}.${t.last.toLowerCase()}.${cls.tag}.${rollStr}@dps.edu`,
      admNo: `ADM-2025-${cls.tag.toUpperCase()}-${rollStr}`,
      stuId: `STU-2025-${cls.tag.toUpperCase()}-${rollStr}`
    });
  }
  // 20 Boys (Roll 31-50)
  for (let i = 0; i < 20; i++) {
    const t = maleNames[i % maleNames.length];
    const roll = 31 + i;
    const rollStr = roll.toString().padStart(3, '0');
    generatedStudents.push({
      num: globalStudentNum++,
      classNum: cls.classNum,
      className: cls.name,
      tag: cls.tag,
      first: t.first,
      hindiFirst: t.hindiFirst,
      last: t.last,
      hindiLast: t.hindiLast,
      gender: 'male',
      roll: roll,
      email: `${t.first.toLowerCase()}.${t.last.toLowerCase()}.${cls.tag}.${rollStr}@dps.edu`,
      admNo: `ADM-2025-${cls.tag.toUpperCase()}-${rollStr}`,
      stuId: `STU-2025-${cls.tag.toUpperCase()}-${rollStr}`
    });
  }
});

const sqlParts = [];

sqlParts.push(`-- =============================================================================
-- Lab Record Manager - Comprehensive All-Tables Test Seed Script
-- Covers all 89 tables with realistic test data (min 2 rows per table)
-- 
-- Credentials:
--   admin@dps.edu        / admin123       (Role: admin)
--   principal@dps.edu    / admin123       (Role: principal)
--   instructor1@dps.edu  / Instructor123! (Role: instructor)
--   instructor2@dps.edu  / Instructor123! (Role: instructor)
--   student1@dps.edu     / student123     (Role: student)
--   student2@dps.edu     / student123     (Role: student)
--   accountant@dps.edu   / admin123       (Role: accountant)
--   labasst@dps.edu      / admin123       (Role: lab_assistant)
--   admin@stx.edu        / admin123       (Role: admin, School 2)
-- =============================================================================

-- =============================================================================
-- 0. CLEANUP (TRUNCATE ALL TABLES CASCADE)
-- =============================================================================
TRUNCATE TABLE
  quotation_items, vendor_quotations, procurement_committee, procurement_items, procurement_requests, vendors,
  chat_messages, chat_sessions,
  device_tests, user_sessions, admin_notes,
  ticket_comments, tickets, ticket_issue_types,
  meeting_questions, meeting_participants, meetings,
  lecture_poll_responses, lecture_polls, lecture_attendance, lecture_resources, lecture_sessions, lecture_plans,
  timetable_slots, timetables, school_calendar,
  fee_payments, student_fees, fee_structures, fee_categories,
  document_view_logs, folder_shares, document_shares, documents, document_folders,
  whiteboard_recording_shares, whiteboard_recordings, whiteboard_participants, whiteboard_sessions, whiteboard_files,
  final_lab_marks, grade_history, grades,
  submission_revisions, submission_files, submissions,
  assignment_targets, assignment_files, assignments,
  student_unit_mastery, student_training_progress, coding_submissions, training_exercises, training_units, training_modules,
  equipment_shift_history, equipment_shift_requests, laptop_issuances,
  lab_material_usage, lab_materials, lab_attendance, lab_event_history, item_maintenance_history, lab_maintenance_history, lab_items, labs,
  group_members, student_groups, class_subjects, class_enrollments, classes, subjects,
  grade_scale_history, grade_scales,
  notifications, notification_templates,
  generated_reports, report_templates, import_history, translations,
  site_updates, system_settings, implementation_plans, activity_logs, audit_logs, query_logs,
  users, academic_years, schools
CASCADE;
`);

// 1. schools (2)
sqlParts.push(`-- 1. schools
INSERT INTO schools (id, name, name_hindi, code, address, state, district, board_affiliation, primary_language, secondary_languages, academic_year_start, email, phone1, pin_code, created_at, updated_at)
VALUES 
  ('${uuid(U.school, 1)}', 'Delhi Public School', 'दिल्ली पब्लिक स्कूल', 'DPS001', '123 Mathura Road, New Delhi', 'Delhi', 'South Delhi', 'CBSE', 'en', ARRAY['hi'], 4, 'info@dps.edu', '011-23456789', '110003', NOW(), NOW()),
  ('${uuid(U.school, 2)}', 'St. Xavier International School', 'सेंट जेवियर्स इंटरनेशनल स्कूल', 'STX002', '45 Park Street, Kolkata', 'West Bengal', 'Kolkata', 'ICSE', 'en', ARRAY['hi', 'bn'], 4, 'contact@stx.edu', '033-98765432', '700016', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 2. academic_years (4: 2 per school)
sqlParts.push(`-- 2. academic_years
INSERT INTO academic_years (id, school_id, year_label, start_date, end_date, is_current, created_at)
VALUES 
  ('${uuid(U.year, 1)}', '${uuid(U.school, 1)}', '2024-2025', '2024-04-01', '2025-03-31', false, NOW()),
  ('${uuid(U.year, 2)}', '${uuid(U.school, 1)}', '2025-2026', '2025-04-01', '2026-03-31', true, NOW()),
  ('${uuid(U.year, 3)}', '${uuid(U.school, 2)}', '2024-2025', '2024-04-01', '2025-03-31', false, NOW()),
  ('${uuid(U.year, 4)}', '${uuid(U.school, 2)}', '2025-2026', '2025-04-01', '2026-03-31', true, NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 3. users (311 users: 9 staff/admin + 2 initial students + 300 students [30 girls & 20 boys in each of the 6 classes])
const studentUserRows = generatedStudents.map(s => {
  const userId = uuid(U.user, 9 + s.num);
  return `  ('${userId}', '${uuid(U.school, 1)}', '${s.email}', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', '${s.first}', '${s.hindiFirst}', '${s.last}', '${s.hindiLast}', NULL, '${s.admNo}', '${s.stuId}', '${s.gender}', true, NOW(), NOW())`;
}).join(',\n');

sqlParts.push(`-- 3. users
INSERT INTO users (id, school_id, email, password_hash, role, first_name, first_name_hindi, last_name, last_name_hindi, employee_id, admission_number, student_id, gender, is_active, created_at, updated_at)
VALUES 
  ('${uuid(U.user, 1)}', '${uuid(U.school, 1)}', 'admin@dps.edu', '$2b$10$1qU0Hx9rCMyvrpOPpPPyzOab9p5PspOc6K4lGhdb6QB.N406LY13G', 'admin', 'Ramesh', 'रमेश', 'Sharma', 'शर्मा', 'EMP-ADM-01', NULL, NULL, 'male', true, NOW(), NOW()),
  ('${uuid(U.user, 2)}', '${uuid(U.school, 1)}', 'principal@dps.edu', '$2b$10$1qU0Hx9rCMyvrpOPpPPyzOab9p5PspOc6K4lGhdb6QB.N406LY13G', 'principal', 'Sunita', 'सुनीता', 'Verma', 'वर्मा', 'EMP-PRN-01', NULL, NULL, 'female', true, NOW(), NOW()),
  ('${uuid(U.user, 3)}', '${uuid(U.school, 1)}', 'instructor1@dps.edu', '$2b$10$Nj1cC.7GrSBxROxUD3AJ5eA5L/nI0VXtJLvAbXk5Wu3TYpK.BulQq', 'instructor', 'Rajesh', 'राजेश', 'Kumar', 'कुमार', 'EMP-INS-01', NULL, NULL, 'male', true, NOW(), NOW()),
  ('${uuid(U.user, 4)}', '${uuid(U.school, 1)}', 'instructor2@dps.edu', '$2b$10$Nj1cC.7GrSBxROxUD3AJ5eA5L/nI0VXtJLvAbXk5Wu3TYpK.BulQq', 'instructor', 'Priya', 'प्रिया', 'Singh', 'सिंह', 'EMP-INS-02', NULL, NULL, 'female', true, NOW(), NOW()),
  ('${uuid(U.user, 5)}', '${uuid(U.school, 1)}', 'student1@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aarav', 'आरव', 'Patel', 'पटेल', NULL, 'ADM-2025-001', 'STU-001', 'male', true, NOW(), NOW()),
  ('${uuid(U.user, 6)}', '${uuid(U.school, 1)}', 'student2@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sneha', 'स्नेहा', 'Reddy', 'रेड्डी', NULL, 'ADM-2025-002', 'STU-002', 'female', true, NOW(), NOW()),
  ('${uuid(U.user, 7)}', '${uuid(U.school, 1)}', 'accountant@dps.edu', '$2b$10$1qU0Hx9rCMyvrpOPpPPyzOab9p5PspOc6K4lGhdb6QB.N406LY13G', 'accountant', 'Manoj', 'मनोज', 'Gupta', 'गुप्ता', 'EMP-ACC-01', NULL, NULL, 'male', true, NOW(), NOW()),
  ('${uuid(U.user, 8)}', '${uuid(U.school, 1)}', 'labasst@dps.edu', '$2b$10$1qU0Hx9rCMyvrpOPpPPyzOab9p5PspOc6K4lGhdb6QB.N406LY13G', 'lab_assistant', 'Vikas', 'विकास', 'Yadav', 'यादव', 'EMP-LAB-01', NULL, NULL, 'male', true, NOW(), NOW()),
  ('${uuid(U.user, 9)}', '${uuid(U.school, 2)}', 'admin@stx.edu', '$2b$10$1qU0Hx9rCMyvrpOPpPPyzOab9p5PspOc6K4lGhdb6QB.N406LY13G', 'admin', 'Father', 'फादर', 'Joseph', 'जोसेफ', 'EMP-STX-01', NULL, NULL, 'male', true, NOW(), NOW()),
${studentUserRows}
ON CONFLICT (id) DO NOTHING;
`);

// 4. grade_scales (4 rows)
sqlParts.push(`-- 4. grade_scales
INSERT INTO grade_scales (id, school_id, grade_letter, grade_point, min_percentage, max_percentage, description, is_active, created_at, updated_at)
VALUES 
  ('${uuid(U.gradeScale, 1)}', '${uuid(U.school, 1)}', 'A+', 10.0, 90, 100, 'Outstanding Performance', true, NOW(), NOW()),
  ('${uuid(U.gradeScale, 2)}', '${uuid(U.school, 1)}', 'A', 9.0, 80, 89, 'Excellent Performance', true, NOW(), NOW()),
  ('${uuid(U.gradeScale, 3)}', '${uuid(U.school, 1)}', 'B', 8.0, 70, 79, 'Very Good Performance', true, NOW(), NOW()),
  ('${uuid(U.gradeScale, 4)}', '${uuid(U.school, 1)}', 'C', 7.0, 60, 69, 'Good Performance', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 5. grade_scale_history (2 rows)
sqlParts.push(`-- 5. grade_scale_history
INSERT INTO grade_scale_history (id, grade_scale_id, action, previous_letter, previous_min_pct, previous_max_pct, previous_points, new_letter, new_min_pct, new_max_pct, new_points, changed_by_id, changed_at, reason)
VALUES 
  ('${uuid(U.gradeScaleHist, 1)}', '${uuid(U.gradeScale, 1)}', 'UPDATE', 'A+', 92, 100, 10.0, 'A+', 90, 100, 10.0, '${uuid(U.user, 1)}', NOW(), 'Adjusted minimum threshold for A+ to 90% per CBSE guidelines'),
  ('${uuid(U.gradeScaleHist, 2)}', '${uuid(U.gradeScale, 2)}', 'UPDATE', 'A', 82, 91, 9.0, 'A', 80, 89, 9.0, '${uuid(U.user, 1)}', NOW(), 'Adjusted threshold to match A+ revision')
ON CONFLICT (id) DO NOTHING;
`);

// 6. subjects (4 rows)
sqlParts.push(`-- 6. subjects
INSERT INTO subjects (id, school_id, code, name, name_hindi, has_lab, lab_hours_per_week, theory_hours_per_week, created_at)
VALUES 
  ('${uuid(U.subject, 1)}', '${uuid(U.school, 1)}', 'CS-101', 'Computer Science', 'कंप्यूटर विज्ञान', true, 4, 4, NOW()),
  ('${uuid(U.subject, 2)}', '${uuid(U.school, 1)}', 'PHY-101', 'Physics', 'भौतिक विज्ञान', true, 3, 4, NOW()),
  ('${uuid(U.subject, 3)}', '${uuid(U.school, 1)}', 'CHEM-101', 'Chemistry', 'रसायन विज्ञान', true, 3, 4, NOW()),
  ('${uuid(U.subject, 4)}', '${uuid(U.school, 1)}', 'MATH-101', 'Mathematics', 'गणित', false, 0, 6, NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 7. classes (9 rows: 11-A, 11-B, 12-A, 11 NM A, 11 NM B, 11 Med A, 12 NM A, 12 NM B, 12 Med A)
sqlParts.push(`-- 7. classes
INSERT INTO classes (id, school_id, academic_year_id, name, name_hindi, grade_level, section, stream, class_teacher_id, max_students, created_at)
VALUES 
  ('${uuid(U.class, 1)}', '${uuid(U.school, 1)}', '${uuid(U.year, 2)}', 'Class 11-A (Science)', 'कक्षा 11-ए (विज्ञान)', 11, 'A', 'Science', '${uuid(U.user, 3)}', 45, NOW()),
  ('${uuid(U.class, 2)}', '${uuid(U.school, 1)}', '${uuid(U.year, 2)}', 'Class 11-B (Science)', 'कक्षा 11-बी (विज्ञान)', 11, 'B', 'Science', '${uuid(U.user, 4)}', 45, NOW()),
  ('${uuid(U.class, 3)}', '${uuid(U.school, 1)}', '${uuid(U.year, 2)}', 'Class 12-A (Science)', 'कक्षा 12-ए (विज्ञान)', 12, 'A', 'Science', '${uuid(U.user, 3)}', 40, NOW()),
  ('${uuid(U.class, 4)}', '${uuid(U.school, 1)}', '${uuid(U.year, 2)}', '11 NM A', '11 नॉन-मेडिकल ए', 11, 'A', 'Non-Medical', '${uuid(U.user, 3)}', 50, NOW()),
  ('${uuid(U.class, 5)}', '${uuid(U.school, 1)}', '${uuid(U.year, 2)}', '11 NM B', '11 नॉन-मेडिकल बी', 11, 'B', 'Non-Medical', '${uuid(U.user, 4)}', 50, NOW()),
  ('${uuid(U.class, 6)}', '${uuid(U.school, 1)}', '${uuid(U.year, 2)}', '11 Med A', '11 मेडिकल ए', 11, 'A', 'Medical', '${uuid(U.user, 3)}', 50, NOW()),
  ('${uuid(U.class, 7)}', '${uuid(U.school, 1)}', '${uuid(U.year, 2)}', '12 NM A', '12 नॉन-मेडिकल ए', 12, 'A', 'Non-Medical', '${uuid(U.user, 3)}', 50, NOW()),
  ('${uuid(U.class, 8)}', '${uuid(U.school, 1)}', '${uuid(U.year, 2)}', '12 NM B', '12 नॉन-मेडिकल बी', 12, 'B', 'Non-Medical', '${uuid(U.user, 4)}', 50, NOW()),
  ('${uuid(U.class, 9)}', '${uuid(U.school, 1)}', '${uuid(U.year, 2)}', '12 Med A', '12 मेडिकल ए', 12, 'A', 'Medical', '${uuid(U.user, 4)}', 50, NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 8. class_enrollments (302 rows: 2 initial + 300 students enrolled: 50 per class)
const studentEnrollmentRows = generatedStudents.map((s, idx) => {
  const enrollId = uuid(U.enrollment, 2 + s.num);
  const userId = uuid(U.user, 9 + s.num);
  const classId = uuid(U.class, s.classNum);
  return `  ('${enrollId}', '${userId}', '${classId}', ${s.roll}, CURRENT_DATE, 'active')`;
}).join(',\n');

sqlParts.push(`-- 8. class_enrollments
INSERT INTO class_enrollments (id, student_id, class_id, roll_number, enrollment_date, status)
VALUES 
  ('${uuid(U.enrollment, 1)}', '${uuid(U.user, 5)}', '${uuid(U.class, 1)}', 101, CURRENT_DATE, 'active'),
  ('${uuid(U.enrollment, 2)}', '${uuid(U.user, 6)}', '${uuid(U.class, 1)}', 102, CURRENT_DATE, 'active'),
${studentEnrollmentRows}
ON CONFLICT (id) DO NOTHING;
`);

// 9. class_subjects (2 rows)
sqlParts.push(`-- 9. class_subjects
INSERT INTO class_subjects (id, class_id, subject_id, instructor_id, lab_instructor_id)
VALUES 
  ('${uuid(U.classSubject, 1)}', '${uuid(U.class, 1)}', '${uuid(U.subject, 1)}', '${uuid(U.user, 3)}', '${uuid(U.user, 8)}'),
  ('${uuid(U.classSubject, 2)}', '${uuid(U.class, 1)}', '${uuid(U.subject, 2)}', '${uuid(U.user, 4)}', '${uuid(U.user, 8)}')
ON CONFLICT (id) DO NOTHING;
`);

// 10. student_groups (10 rows: 2 initial + 8 python groups across 11 NM A, 11 NM B, 12 NM A, 12 NM B with assigned PCs)
sqlParts.push(`-- 10. student_groups
INSERT INTO student_groups (id, class_id, name, description, created_by, created_at, assigned_pc_id)
VALUES 
  ('${uuid(U.group, 1)}', '${uuid(U.class, 1)}', 'Alpha Coders', 'Computer Science Project Team Alpha', '${uuid(U.user, 3)}', NOW(), '${uuid(U.item, 5)}'),
  ('${uuid(U.group, 2)}', '${uuid(U.class, 1)}', 'Beta Quantum', 'Physics Lab Group Beta', '${uuid(U.user, 4)}', NOW(), '${uuid(U.item, 6)}'),
  ('${uuid(U.group, 3)}', '${uuid(U.class, 4)}', '11 NM A - Python Group Alpha', 'Core Python syntax and algorithmic problem solving', '${uuid(U.user, 3)}', NOW(), '${uuid(U.item, 7)}'),
  ('${uuid(U.group, 4)}', '${uuid(U.class, 4)}', '11 NM A - Python Group Beta', 'Data operations and procedural logic', '${uuid(U.user, 3)}', NOW(), '${uuid(U.item, 8)}'),
  ('${uuid(U.group, 5)}', '${uuid(U.class, 5)}', '11 NM B - Byte Knights', 'Python control flow and looping challenges', '${uuid(U.user, 4)}', NOW(), '${uuid(U.item, 9)}'),
  ('${uuid(U.group, 6)}', '${uuid(U.class, 5)}', '11 NM B - CodeCrafters', 'Mathematical modeling and logic builders', '${uuid(U.user, 4)}', NOW(), '${uuid(U.item, 10)}'),
  ('${uuid(U.group, 7)}', '${uuid(U.class, 7)}', '12 NM A - Turing Titans', 'Advanced Python collections and dictionary structures', '${uuid(U.user, 3)}', NOW(), '${uuid(U.item, 11)}'),
  ('${uuid(U.group, 8)}', '${uuid(U.class, 7)}', '12 NM A - Binary Beasts', 'Data structures, list comprehensions, and nested mapping', '${uuid(U.user, 3)}', NOW(), '${uuid(U.item, 12)}'),
  ('${uuid(U.group, 9)}', '${uuid(U.class, 8)}', '12 NM B - Logic Legends', 'Set theory and tuple serialization in Python', '${uuid(U.user, 4)}', NOW(), '${uuid(U.item, 13)}'),
  ('${uuid(U.group, 10)}', '${uuid(U.class, 8)}', '12 NM B - Syntax Stars', 'Practical lab assessments and viva preparation', '${uuid(U.user, 4)}', NOW(), '${uuid(U.item, 14)}')
ON CONFLICT (id) DO NOTHING;
`);

// 11. group_members (34 rows: 2 initial + 32 members: 4 per python group)
// Groups 3 & 4: Class 4 students (indices 0, 6, 12, 18, 24, 30, 36, 42)
// Groups 5 & 6: Class 5 students (indices 1, 7, 13, 19, 25, 31, 37, 43)
// Groups 7 & 8: Class 7 students (indices 2, 8, 14, 20, 26, 32, 38, 44)
// Groups 9 & 10: Class 8 students (indices 3, 9, 15, 21, 27, 33, 39, 45)
const pythonGroupMembers = [];
let gmId = 3;

const groupAssignments = [
  { groupNum: 3, studentIndices: [0, 6, 12, 18] },
  { groupNum: 4, studentIndices: [24, 30, 36, 42] },
  { groupNum: 5, studentIndices: [1, 7, 13, 19] },
  { groupNum: 6, studentIndices: [25, 31, 37, 43] },
  { groupNum: 7, studentIndices: [2, 8, 14, 20] },
  { groupNum: 8, studentIndices: [26, 32, 38, 44] },
  { groupNum: 9, studentIndices: [3, 9, 15, 21] },
  { groupNum: 10, studentIndices: [27, 33, 39, 45] }
];

groupAssignments.forEach(ga => {
  ga.studentIndices.forEach((sIdx, mIdx) => {
    const student = generatedStudents[sIdx];
    const role = mIdx === 0 ? 'leader' : 'member';
    pythonGroupMembers.push(`  ('${uuid(U.groupMember, gmId++)}', '${uuid(U.group, ga.groupNum)}', '${uuid(U.user, 9 + student.num)}', '${role}', NOW())`);
  });
});

sqlParts.push(`-- 11. group_members
INSERT INTO group_members (id, group_id, student_id, role, joined_at)
VALUES 
  ('${uuid(U.groupMember, 1)}', '${uuid(U.group, 1)}', '${uuid(U.user, 5)}', 'leader', NOW()),
  ('${uuid(U.groupMember, 2)}', '${uuid(U.group, 2)}', '${uuid(U.user, 6)}', 'member', NOW()),
${pythonGroupMembers.join(',\n')}
ON CONFLICT (id) DO NOTHING;
`);

// 12. labs (3 rows)
sqlParts.push(`-- 12. labs
INSERT INTO labs (id, school_id, name, name_hindi, room_number, capacity, subject_id, incharge_id, created_at)
VALUES 
  ('${uuid(U.lab, 1)}', '${uuid(U.school, 1)}', 'Computer Lab 1 (High Performance)', 'कंप्यूटर लैब 1', 'ROOM-101', 40, '${uuid(U.subject, 1)}', '${uuid(U.user, 3)}', NOW()),
  ('${uuid(U.lab, 2)}', '${uuid(U.school, 1)}', 'Physics Optics & Mechanics Lab', 'भौतिकी प्रकाशिकी एवं यांत्रिकी लैब', 'ROOM-204', 35, '${uuid(U.subject, 2)}', '${uuid(U.user, 4)}', NOW()),
  ('${uuid(U.lab, 3)}', '${uuid(U.school, 1)}', 'Chemistry Analytical Lab', 'रसायन विश्लेषणात्मक लैब', 'ROOM-302', 35, '${uuid(U.subject, 3)}', '${uuid(U.user, 4)}', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 13. lab_items (79 rows: 4 classic items + 25 PCs in Computer Lab 1 + 25 PCs in Physics Lab + 25 PCs in Chemistry Lab)
const labPcRows = [];
let pcItemCounter = 5;

// Lab 1: Computer Lab 1 -> 25 PCs (CL1-PC-01 to CL1-PC-25)
for (let i = 1; i <= 25; i++) {
  const numStr = i.toString().padStart(2, '0');
  const brand = i % 3 === 0 ? 'Lenovo' : (i % 2 === 0 ? 'HP' : 'Dell');
  const model = brand === 'Dell' ? 'OptiPlex 7090' : (brand === 'HP' ? 'ProDesk 400 G7' : 'ThinkCentre M70q');
  labPcRows.push(`  ('${uuid(U.item, pcItemCounter++)}', '${uuid(U.lab, 1)}', '${uuid(U.school, 1)}', 'pc', 'CL1-PC-${numStr}', '${brand}', '${model}', 'SN-CL1-${numStr}', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL)`);
}

// Lab 2: Physics Lab -> 25 PCs (PHY-PC-01 to PHY-PC-25)
for (let i = 1; i <= 25; i++) {
  const numStr = i.toString().padStart(2, '0');
  const brand = i % 2 === 0 ? 'HP' : 'Dell';
  labPcRows.push(`  ('${uuid(U.item, pcItemCounter++)}', '${uuid(U.lab, 2)}', '${uuid(U.school, 1)}', 'pc', 'PHY-PC-${numStr}', '${brand}', 'ProDesk 400 G7', 'SN-PHY-${numStr}', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL)`);
}

// Lab 3: Chemistry Lab -> 25 PCs (CHM-PC-01 to CHM-PC-25)
for (let i = 1; i <= 25; i++) {
  const numStr = i.toString().padStart(2, '0');
  const brand = i % 2 === 0 ? 'Dell' : 'Lenovo';
  labPcRows.push(`  ('${uuid(U.item, pcItemCounter++)}', '${uuid(U.lab, 3)}', '${uuid(U.school, 1)}', 'pc', 'CHM-PC-${numStr}', '${brand}', 'OptiPlex 7090', 'SN-CHM-${numStr}', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL)`);
}

sqlParts.push(`-- 13. lab_items
INSERT INTO lab_items (id, lab_id, school_id, item_type, item_number, brand, model_no, serial_no, specs, status, notes, purchase_date, warranty_end, created_at, updated_at, quantity, image_url)
VALUES 
  ('${uuid(U.item, 1)}', '${uuid(U.lab, 1)}', '${uuid(U.school, 1)}', 'laptop', 'LAP-001', 'Dell', 'Latitude 3520', 'SN-DELL-001', '{"ram": "16GB", "cpu": "Intel i5 11th Gen", "storage": "512GB SSD"}'::jsonb, 'available', 'Primary student coding laptop', NOW() - INTERVAL '6 months', NOW() + INTERVAL '18 months', NOW(), NOW(), 1, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853'),
  ('${uuid(U.item, 2)}', '${uuid(U.lab, 1)}', '${uuid(U.school, 1)}', 'laptop', 'LAP-002', 'Lenovo', 'ThinkPad E14', 'SN-LEN-002', '{"ram": "16GB", "cpu": "AMD Ryzen 5", "storage": "512GB SSD"}'::jsonb, 'issued', 'Issued to Instructor Rajesh', NOW() - INTERVAL '6 months', NOW() + INTERVAL '18 months', NOW(), NOW(), 1, 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed'),
  ('${uuid(U.item, 3)}', '${uuid(U.lab, 2)}', '${uuid(U.school, 1)}', 'multimeter', 'PHY-MM-01', 'Fluke', '115 Digital', 'SN-FLK-11501', '{"range": "600V", "accuracy": "0.5%"}'::jsonb, 'available', 'Physics digital multimeter', NOW() - INTERVAL '1 year', NOW() + INTERVAL '1 year', NOW(), NOW(), 1, NULL),
  ('${uuid(U.item, 4)}', '${uuid(U.lab, 3)}', '${uuid(U.school, 1)}', 'spectrophotometer', 'CHM-SPEC-01', 'Shimadzu', 'UV-1900', 'SN-SHM-19001', '{"range": "190-1100nm"}'::jsonb, 'maintenance', 'Periodic optical calibration underway', NOW() - INTERVAL '2 years', NOW() + INTERVAL '1 year', NOW(), NOW(), 1, NULL),
${labPcRows.join(',\n')}
ON CONFLICT (id) DO NOTHING;
`);

// 14. lab_maintenance_history (2 rows)
sqlParts.push(`-- 14. lab_maintenance_history
INSERT INTO lab_maintenance_history (id, lab_id, action, reason, previous_status, new_status, started_at, ended_at, expected_end_date, performed_by_id, created_at)
VALUES 
  ('${uuid(U.labMaint, 1)}', '${uuid(U.lab, 1)}', 'Cable Upgrade', 'Upgrading CAT5e cables to CAT6 for Gigabit LAN', 'active', 'under_maintenance', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW(), '${uuid(U.user, 8)}', NOW()),
  ('${uuid(U.labMaint, 2)}', '${uuid(U.lab, 3)}', 'Fume Hood Service', 'Annual ventilation and HEPA filter replacement', 'active', 'maintenance', NOW() - INTERVAL '1 day', NULL, NOW() + INTERVAL '2 days', '${uuid(U.user, 8)}', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 15. item_maintenance_history (2 rows)
sqlParts.push(`-- 15. item_maintenance_history
INSERT INTO item_maintenance_history (id, item_id, recorded_by, type, description, cost, vendor, part_name, resolved_at, created_at)
VALUES 
  ('${uuid(U.itemMaint, 1)}', '${uuid(U.item, 1)}', '${uuid(U.user, 8)}', 'Battery Replacement', 'Replaced degraded lithium-ion battery under OEM warranty', 0.00, 'Dell Authorized Service', 'Battery 54Whr', NOW() - INTERVAL '10 days', NOW()),
  ('${uuid(U.itemMaint, 2)}', '${uuid(U.item, 4)}', '${uuid(U.user, 8)}', 'Optical Calibration', 'Recalibrated diffraction grating and optical detector', 4500.00, 'Shimadzu Precision Labs', 'Halogen Lamp Module', NULL, NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 16. lab_event_history (2 rows)
sqlParts.push(`-- 16. lab_event_history
INSERT INTO lab_event_history (id, lab_id, event_type, description, item_id, item_details, old_incharge_id, new_incharge_id, performed_by_id, created_at)
VALUES 
  ('${uuid(U.labEvent, 1)}', '${uuid(U.lab, 1)}', 'AUDIT', 'Quarterly inventory audit verified all 40 terminals operational', '${uuid(U.item, 1)}', '{"status": "verified"}'::jsonb, NULL, NULL, '${uuid(U.user, 1)}', NOW()),
  ('${uuid(U.labEvent, 2)}', '${uuid(U.lab, 2)}', 'INCHARGE_ASSIGNMENT', 'Rajesh Kumar formally assigned lab in-charge for Physics Lab', NULL, NULL, '${uuid(U.user, 4)}', '${uuid(U.user, 3)}', '${uuid(U.user, 1)}', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 17. lab_attendance (2 rows)
sqlParts.push(`-- 17. lab_attendance
INSERT INTO lab_attendance (id, lab_id, class_id, student_id, date, status, marked_by, remarks, created_at)
VALUES 
  ('${uuid(U.labAttendance, 1)}', '${uuid(U.lab, 1)}', '${uuid(U.class, 1)}', '${uuid(U.user, 5)}', CURRENT_DATE, 'present', '${uuid(U.user, 8)}', 'Completed experiment on terminal 12', NOW()),
  ('${uuid(U.labAttendance, 2)}', '${uuid(U.lab, 1)}', '${uuid(U.class, 1)}', '${uuid(U.user, 6)}', CURRENT_DATE, 'present', '${uuid(U.user, 8)}', 'Completed experiment on terminal 14', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 18. lab_materials (2 rows)
sqlParts.push(`-- 18. lab_materials
INSERT INTO lab_materials (id, lab_id, name, name_hindi, description, unit, cost_per_unit, current_stock, minimum_stock, created_at)
VALUES 
  ('${uuid(U.labMaterial, 1)}', '${uuid(U.lab, 2)}', 'Copper Connection Wire (Gauge 22)', 'तांबे का कनेक्शन तार', 'Insulated wire reels for circuit experiments', 'piece', 150.00, 25, 5, NOW()),
  ('${uuid(U.labMaterial, 2)}', '${uuid(U.lab, 3)}', 'Hydrochloric Acid (0.1M)', 'हाइड्रोक्लोरिक एसिड', 'Analytical reagent grade HCl solution', 'ml', 0.85, 2500, 500, NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 19. lab_material_usage (2 rows)
sqlParts.push(`-- 19. lab_material_usage
INSERT INTO lab_material_usage (id, material_id, student_id, quantity_used, usage_date, recorded_by, remarks, created_at)
VALUES 
  ('${uuid(U.labMaterialUsage, 1)}', '${uuid(U.labMaterial, 1)}', '${uuid(U.user, 5)}', 2, NOW(), '${uuid(U.user, 8)}', 'Used 2 pieces for Wheatstone bridge verification', NOW()),
  ('${uuid(U.labMaterialUsage, 2)}', '${uuid(U.labMaterial, 2)}', '${uuid(U.user, 6)}', 50, NOW(), '${uuid(U.user, 8)}', '50ml used for titration practical', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 20. laptop_issuances (2 rows)
sqlParts.push(`-- 20. laptop_issuances
INSERT INTO laptop_issuances (id, laptop_id, issued_to_id, issued_by_id, voucher_number, purpose, issued_at, expected_return_date, condition_on_issue, status, school_id, created_at, updated_at)
VALUES 
  ('${uuid(U.laptopIssuance, 1)}', '${uuid(U.item, 2)}', '${uuid(U.user, 3)}', '${uuid(U.user, 8)}', 'VOUCH-2025-001', 'For lecture presentation and live coding demos', NOW() - INTERVAL '5 days', CURRENT_DATE + INTERVAL '30 days', 'excellent', 'issued', '${uuid(U.school, 1)}', NOW(), NOW()),
  ('${uuid(U.laptopIssuance, 2)}', '${uuid(U.item, 1)}', '${uuid(U.user, 5)}', '${uuid(U.user, 8)}', 'VOUCH-2025-002', 'For coding contest lab session', NOW() - INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', 'good', 'issued', '${uuid(U.school, 1)}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 21. equipment_shift_requests (2 rows)
sqlParts.push(`-- 21. equipment_shift_requests
INSERT INTO equipment_shift_requests (id, item_id, from_lab_id, to_lab_id, requested_by, approved_by, status, reason, admin_notes, requested_at, approved_at)
VALUES 
  ('${uuid(U.shiftRequest, 1)}', '${uuid(U.item, 3)}', '${uuid(U.lab, 2)}', '${uuid(U.lab, 1)}', '${uuid(U.user, 3)}', '${uuid(U.user, 1)}', 'approved', 'Need digital multimeter for computer hardware interfacing lab', 'Approved for 1 week', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
  ('${uuid(U.shiftRequest, 2)}', '${uuid(U.item, 1)}', '${uuid(U.lab, 1)}', '${uuid(U.lab, 2)}', '${uuid(U.user, 4)}', NULL, 'pending', 'Need spare laptop for sensor data acquisition', NULL, NOW() - INTERVAL '1 day', NULL)
ON CONFLICT (id) DO NOTHING;
`);

// 22. equipment_shift_history (2 rows)
sqlParts.push(`-- 22. equipment_shift_history
INSERT INTO equipment_shift_history (id, item_id, from_lab_id, to_lab_id, shifted_by, approved_by, shift_request_id, notes, shifted_at)
VALUES 
  ('${uuid(U.shiftHistory, 1)}', '${uuid(U.item, 3)}', '${uuid(U.lab, 2)}', '${uuid(U.lab, 1)}', '${uuid(U.user, 8)}', '${uuid(U.user, 1)}', '${uuid(U.shiftRequest, 1)}', 'Multimeter securely relocated to Computer Lab', NOW() - INTERVAL '2 days'),
  ('${uuid(U.shiftHistory, 2)}', '${uuid(U.item, 3)}', '${uuid(U.lab, 1)}', '${uuid(U.lab, 2)}', '${uuid(U.user, 8)}', '${uuid(U.user, 1)}', NULL, 'Returned multimeter back to Physics lab storage', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;
`);

// 23. training_modules (4 rows: Python Basics, Python Control Structures, Python Collections, JS Web Lab)
sqlParts.push(`-- 23. training_modules
INSERT INTO training_modules (id, school_id, title, title_hindi, description, language, board_aligned, class_level, total_units, total_exercises, is_published, academic_year_id, created_at, updated_at)
VALUES 
  ('${uuid(U.trainingModule, 1)}', '${uuid(U.school, 1)}', 'Python Basics & Fundamentals', 'पायथन मूल बातें और बुनियादी सिद्धांत', 'Master Python syntax, primitive types (int, float, str, bool), standard input/output, type casting, and arithmetic expressions.', 'python', 'CBSE', 11, 2, 4, true, '${uuid(U.year, 2)}', NOW(), NOW()),
  ('${uuid(U.trainingModule, 2)}', '${uuid(U.school, 1)}', 'Python Control Structures: Conditionals & Loops', 'पायथन नियंत्रण संरचनाएं: स्थितियां और लूप', 'Master boolean logic, conditional branching (if-elif-else), while loops, for loops with range(), and loop control statements.', 'python', 'CBSE', 11, 2, 4, true, '${uuid(U.year, 2)}', NOW(), NOW()),
  ('${uuid(U.trainingModule, 3)}', '${uuid(U.school, 1)}', 'Python Collections: Lists, Tuples, Dictionaries & Sets', 'पायथन संग्रह: सूचियाँ, टुपल्स, शब्दकोश और सेट', 'Master core composite data structures: sequence indexing, slicing, list comprehensions, immutability, key-value mappings, and set operations.', 'python', 'CBSE', 12, 2, 4, true, '${uuid(U.year, 2)}', NOW(), NOW()),
  ('${uuid(U.trainingModule, 4)}', '${uuid(U.school, 1)}', 'JavaScript Interactive Web Lab', 'जावास्क्रिप्ट इंटरएक्टिव वेब लैब', 'Front-end development and DOM manipulation fundamentals', 'javascript', 'CBSE', 12, 2, 4, true, '${uuid(U.year, 2)}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 24. training_units (8 rows: 2 per module)
sqlParts.push(`-- 24. training_units
INSERT INTO training_units (id, module_id, unit_number, title, description, expected_hours, unlock_threshold, sequence_order)
VALUES 
  -- Module 1 (Basics)
  ('${uuid(U.trainingUnit, 1)}', '${uuid(U.trainingModule, 1)}', 1, 'Unit 1: Variables, Memory & Built-in Types', 'Understanding Python variables, dynamic typing, type conversion, and boolean evaluations.', 4, 80, 1),
  ('${uuid(U.trainingUnit, 2)}', '${uuid(U.trainingModule, 1)}', 2, 'Unit 2: Standard I/O, Arithmetic & Comparison Operators', 'Interactive input with input(), formatted output with f-strings, arithmetic precedence, and relational operators.', 4, 80, 2),
  -- Module 2 (Control Structures)
  ('${uuid(U.trainingUnit, 3)}', '${uuid(U.trainingModule, 2)}', 1, 'Unit 1: Decision Making & Branching (if-elif-else)', 'Nested condition evaluations, truthiness, short-circuit boolean logic, and ternary operator.', 4, 80, 1),
  ('${uuid(U.trainingUnit, 4)}', '${uuid(U.trainingModule, 2)}', 2, 'Unit 2: Iteration with for & while Loops', 'Counted loops with range(), while loops, break, continue, pass, and loop else clauses.', 5, 80, 2),
  -- Module 3 (Collections)
  ('${uuid(U.trainingUnit, 5)}', '${uuid(U.trainingModule, 3)}', 1, 'Unit 1: Lists & Tuples in Python', 'Indexing, slicing, appending, inserting, list comprehensions, tuple unpacking, and immutability.', 5, 80, 1),
  ('${uuid(U.trainingUnit, 6)}', '${uuid(U.trainingModule, 3)}', 2, 'Unit 2: Dictionaries & Sets', 'Key-value mapping, dict methods, membership testing, set operations (union, intersection, difference).', 5, 80, 2),
  -- Module 4 (JS Web Lab)
  ('${uuid(U.trainingUnit, 7)}', '${uuid(U.trainingModule, 4)}', 1, 'Unit 1: DOM Elements', 'Selecting elements, querySelector, and updating DOM tree nodes.', 4, 80, 1),
  ('${uuid(U.trainingUnit, 8)}', '${uuid(U.trainingModule, 4)}', 2, 'Unit 2: Event Listeners & Async', 'Handling click events, bubbling, callbacks, and Promises.', 6, 80, 2)
ON CONFLICT (id) DO NOTHING;
`);

// 25. training_exercises (6 interactive coding exercises)
sqlParts.push(`-- 25. training_exercises
INSERT INTO training_exercises (id, unit_id, title, description, difficulty, scaffold_level, exercise_type, blooms_level, learning_objective, starter_code, solution_code, test_cases, hints, time_limit, sequence_order, xp_reward)
VALUES 
  ('${uuid(U.trainingExercise, 1)}', '${uuid(U.trainingUnit, 1)}', 'Calculate Circle Area', 'Write a function get_circle_area(radius) that computes and returns the area of a circle with pi = 3.14159.', 'easy', 'guided', 'coding', 'Apply', 'Master basic math expressions and function returns', 'def get_circle_area(radius):\n    # Write code here\n    pass', 'def get_circle_area(radius):\n    return 3.14159 * radius * radius', '[{"input": "5", "expected": "78.53975"}, {"input": "10", "expected": "314.159"}]'::jsonb, '["Use formula Area = pi * r * r", "Return float value"]'::jsonb, 5, 1, 20),
  ('${uuid(U.trainingExercise, 2)}', '${uuid(U.trainingUnit, 2)}', 'Celsius to Fahrenheit Converter', 'Write a function c_to_f(celsius) that returns Fahrenheit using F = (C * 9/5) + 32.', 'easy', 'independent', 'coding', 'Apply', 'Formula translation and numeric type operators', 'def c_to_f(celsius):\n    pass', 'def c_to_f(celsius):\n    return (celsius * 9/5) + 32', '[{"input": "0", "expected": "32.0"}, {"input": "100", "expected": "212.0"}]'::jsonb, '["Multiply by 9/5 first then add 32"]'::jsonb, 5, 1, 25),
  ('${uuid(U.trainingExercise, 3)}', '${uuid(U.trainingUnit, 3)}', 'Leap Year Checker', 'Write a function is_leap_year(year) returning True if leap year (divisible by 4 and not 100, or divisible by 400).', 'medium', 'guided', 'coding', 'Analyze', 'Compound boolean logic and calendar math', 'def is_leap_year(year):\n    pass', 'def is_leap_year(year):\n    return (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)', '[{"input": "2024", "expected": "True"}, {"input": "1900", "expected": "False"}, {"input": "2000", "expected": "True"}]'::jsonb, '["Check % 400 first or (year % 4 == 0 and year % 100 != 0)"]'::jsonb, 10, 1, 30),
  ('${uuid(U.trainingExercise, 4)}', '${uuid(U.trainingUnit, 4)}', 'Sum of Even Numbers in Range', 'Write a function sum_even(n) returning sum of all even integers from 1 up to n inclusive.', 'medium', 'independent', 'coding', 'Analyze', 'For loops with range or modulo accumulator', 'def sum_even(n):\n    pass', 'def sum_even(n):\n    return sum(x for x in range(2, n + 1, 2))', '[{"input": "10", "expected": "30"}, {"input": "20", "expected": "110"}]'::jsonb, '["Use range(2, n + 1, 2) or loop with if x % 2 == 0"]'::jsonb, 10, 1, 30),
  ('${uuid(U.trainingExercise, 5)}', '${uuid(U.trainingUnit, 5)}', 'Remove Duplicates Preserving Order', 'Write a function unique_elements(nums) returning a new list with duplicates removed preserving order.', 'medium', 'independent', 'coding', 'Synthesize', 'List traversal and linear search/visited tracking', 'def unique_elements(nums):\n    pass', 'def unique_elements(nums):\n    seen = set()\n    res = []\n    for x in nums:\n        if x not in seen:\n            seen.add(x)\n            res.append(x)\n    return res', '[{"input": "[1, 2, 2, 3, 4, 3, 5]", "expected": "[1, 2, 3, 4, 5]"}]'::jsonb, '["Use a set for seen elements and list to keep order"]'::jsonb, 10, 1, 35),
  ('${uuid(U.trainingExercise, 6)}', '${uuid(U.trainingUnit, 6)}', 'Word Frequency Counter', 'Write a function count_words(text) returning a dictionary mapping each lowercase word to frequency.', 'medium', 'guided', 'coding', 'Synthesize', 'String splitting and dictionary frequency mapping', 'def count_words(text):\n    pass', 'def count_words(text):\n    words = text.lower().split()\n    counts = {}\n    for w in words:\n        counts[w] = counts.get(w, 0) + 1\n    return counts', '[{"input": "\"apple banana apple orange banana apple\"", "expected": "{\"apple\": 3, \"banana\": 2, \"orange\": 1}"}]'::jsonb, '["Use text.lower().split() then dict.get(w, 0) + 1"]'::jsonb, 10, 1, 35)
ON CONFLICT (id) DO NOTHING;
`);

// 26. coding_submissions (2 rows)
sqlParts.push(`-- 26. coding_submissions
INSERT INTO coding_submissions (id, exercise_id, student_id, code, status, output, test_results, ai_socratic_review, submitted_at)
VALUES 
  ('${uuid(U.codingSub, 1)}', '${uuid(U.trainingExercise, 1)}', '${uuid(U.user, 5)}', 'def get_circle_area(radius):\n    return 3.14159 * radius ** 2', 'passed', '78.53975', '{"passed": 1, "failed": 0}'::jsonb, 'Great job! Your solution handles precision correctly and uses exponentiation cleanly.', NOW() - INTERVAL '1 day'),
  ('${uuid(U.codingSub, 2)}', '${uuid(U.trainingExercise, 2)}', '${uuid(U.user, 6)}', 'def sum_even(n):\n    total = 0\n    for i in range(2, n + 1, 2):\n        total += i\n    return total', 'passed', '30', '{"passed": 1, "failed": 0}'::jsonb, 'Well structured iterative approach. Consider also looking into sum() with a generator!', NOW() - INTERVAL '12 hours')
ON CONFLICT (id) DO NOTHING;
`);

// 27. student_training_progress (2 rows)
sqlParts.push(`-- 27. student_training_progress
INSERT INTO student_training_progress (id, student_id, module_id, current_unit_id, overall_progress, total_xp, streak, last_active_at, started_at)
VALUES 
  ('${uuid(U.trainingProg, 1)}', '${uuid(U.user, 5)}', '${uuid(U.trainingModule, 1)}', '${uuid(U.trainingUnit, 2)}', 50.0, 120, 5, NOW(), NOW() - INTERVAL '7 days'),
  ('${uuid(U.trainingProg, 2)}', '${uuid(U.user, 6)}', '${uuid(U.trainingModule, 1)}', '${uuid(U.trainingUnit, 1)}', 25.0, 60, 2, NOW(), NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;
`);

// 28. student_unit_mastery (2 rows)
sqlParts.push(`-- 28. student_unit_mastery
INSERT INTO student_unit_mastery (id, student_id, unit_id, mastery_score, exercises_done, status, unlocked_at, mastered_at)
VALUES 
  ('${uuid(U.unitMastery, 1)}', '${uuid(U.user, 5)}', '${uuid(U.trainingUnit, 1)}', 95.0, 2, 'mastered', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
  ('${uuid(U.unitMastery, 2)}', '${uuid(U.user, 6)}', '${uuid(U.trainingUnit, 1)}', 70.0, 1, 'in_progress', NOW() - INTERVAL '3 days', NULL)
ON CONFLICT (id) DO NOTHING;
`);

// 29. assignments (6 rows: 3 classic experiments + 3 Python training module assignments)
sqlParts.push(`-- 29. assignments
INSERT INTO assignments (id, school_id, subject_id, lab_id, created_by, title, title_hindi, description, experiment_number, assignment_type, programming_language, aim, max_marks, passing_marks, viva_marks, practical_marks, output_marks, status, publish_date, due_date, created_at, updated_at, academic_year_id, training_module_id)
VALUES 
  ('${uuid(U.assignment, 1)}', '${uuid(U.school, 1)}', '${uuid(U.subject, 1)}', '${uuid(U.lab, 1)}', '${uuid(U.user, 3)}', 'Exp 1: Matrix Multiplication in Python', 'प्रयोग 1: पायथन में मैट्रिक्स गुणन', 'Implement 2D array multiplication and calculate time complexity', 'EXP-CS-01', 'program', 'Python', 'To learn multidimensional lists and nested loops in Python', 100, 40, 20, 50, 30, 'published', NOW() - INTERVAL '5 days', NOW() + INTERVAL '10 days', NOW(), NOW(), '${uuid(U.year, 2)}', NULL),
  ('${uuid(U.assignment, 2)}', '${uuid(U.school, 1)}', '${uuid(U.subject, 2)}', '${uuid(U.lab, 2)}', '${uuid(U.user, 4)}', 'Exp 2: Verification of Ohm Law', 'प्रयोग 2: ओम के नियम का सत्यापन', 'Record voltage vs current values across standard resistance and plot I-V curve', 'EXP-PHY-01', 'experiment', NULL, 'To experimentally verify Ohm Law and determine wire resistivity', 100, 40, 25, 50, 25, 'published', NOW() - INTERVAL '4 days', NOW() + INTERVAL '12 days', NOW(), NOW(), '${uuid(U.year, 2)}', NULL),
  ('${uuid(U.assignment, 3)}', '${uuid(U.school, 1)}', '${uuid(U.subject, 3)}', '${uuid(U.lab, 3)}', '${uuid(U.user, 4)}', 'Exp 3: Acid-Base Titration (HCl vs NaOH)', 'प्रयोग 3: अम्ल-क्षार अनुमापन', 'Determine the molarity of supplied HCl solution using 0.1M standard NaOH', 'EXP-CHM-01', 'experiment', NULL, 'To master burette titration and phenolphthalein end-point detection', 100, 40, 20, 60, 20, 'published', NOW() - INTERVAL '3 days', NOW() + INTERVAL '15 days', NOW(), NOW(), '${uuid(U.year, 2)}', NULL),
  -- Python Training Module Assignments
  ('${uuid(U.assignment, 4)}', '${uuid(U.school, 1)}', '${uuid(U.subject, 1)}', '${uuid(U.lab, 1)}', '${uuid(U.user, 3)}', 'Training: Python Basics & Fundamentals', 'प्रशिक्षण: पायथन मूल बातें और बुनियादी सिद्धांत', 'Complete all interactive exercises in Python Basics & Fundamentals', NULL, 'training_module', 'Python', 'To master Python basic syntax, types, expressions, and standard IO', 100, 40, 20, 60, 20, 'published', NOW() - INTERVAL '2 days', NOW() + INTERVAL '30 days', NOW(), NOW(), '${uuid(U.year, 2)}', '${uuid(U.trainingModule, 1)}'),
  ('${uuid(U.assignment, 5)}', '${uuid(U.school, 1)}', '${uuid(U.subject, 1)}', '${uuid(U.lab, 1)}', '${uuid(U.user, 3)}', 'Training: Python Control Structures: Conditionals & Loops', 'प्रशिक्षण: पायथन नियंत्रण संरचनाएं: स्थितियां और लूप', 'Complete all interactive exercises in Python Control Structures', NULL, 'training_module', 'Python', 'To master branching logic, iteration, range, and loops', 100, 40, 20, 60, 20, 'published', NOW() - INTERVAL '2 days', NOW() + INTERVAL '30 days', NOW(), NOW(), '${uuid(U.year, 2)}', '${uuid(U.trainingModule, 2)}'),
  ('${uuid(U.assignment, 6)}', '${uuid(U.school, 1)}', '${uuid(U.subject, 1)}', '${uuid(U.lab, 1)}', '${uuid(U.user, 3)}', 'Training: Python Collections: Lists, Tuples, Dictionaries & Sets', 'प्रशिक्षण: पायथन संग्रह: सूचियाँ, टुपल्स, शब्दकोश और सेट', 'Complete all interactive exercises in Python Collections', NULL, 'training_module', 'Python', 'To master list operations, comprehensions, dictionaries, and sets', 100, 40, 20, 60, 20, 'published', NOW() - INTERVAL '2 days', NOW() + INTERVAL '30 days', NOW(), NOW(), '${uuid(U.year, 2)}', '${uuid(U.trainingModule, 3)}')
ON CONFLICT (id) DO NOTHING;
`);

// 30. assignment_files (2 rows)
sqlParts.push(`-- 30. assignment_files
INSERT INTO assignment_files (id, assignment_id, file_name, file_type, file_size, file_url, uploaded_by, uploaded_at)
VALUES 
  ('${uuid(U.assignmentFile, 1)}', '${uuid(U.assignment, 1)}', 'matrix_multiplication_guideline.pdf', 'application/pdf', 245000, 'https://cdn.example.com/assignments/matrix_guideline.pdf', '${uuid(U.user, 3)}', NOW()),
  ('${uuid(U.assignmentFile, 2)}', '${uuid(U.assignment, 2)}', 'ohms_law_circuit_diagram.png', 'image/png', 512000, 'https://cdn.example.com/assignments/ohms_law_circuit.png', '${uuid(U.user, 4)}', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 31. assignment_targets (targets for experiments + python training modules)
sqlParts.push(`-- 31. assignment_targets
INSERT INTO assignment_targets (id, assignment_id, target_type, target_class_id, target_group_id, assigned_by, assigned_at, is_locked)
VALUES 
  ('${uuid(U.assignmentTarget, 1)}', '${uuid(U.assignment, 1)}', 'class', '${uuid(U.class, 1)}', NULL, '${uuid(U.user, 3)}', NOW(), false),
  ('${uuid(U.assignmentTarget, 2)}', '${uuid(U.assignment, 2)}', 'class', '${uuid(U.class, 1)}', NULL, '${uuid(U.user, 4)}', NOW(), false),
  -- Python Basics assigned to 11 NM A, 11 NM B, 11 Med A + groups
  ('${uuid(U.assignmentTarget, 3)}', '${uuid(U.assignment, 4)}', 'class', '${uuid(U.class, 4)}', NULL, '${uuid(U.user, 3)}', NOW(), false),
  ('${uuid(U.assignmentTarget, 4)}', '${uuid(U.assignment, 4)}', 'class', '${uuid(U.class, 5)}', NULL, '${uuid(U.user, 3)}', NOW(), false),
  ('${uuid(U.assignmentTarget, 5)}', '${uuid(U.assignment, 4)}', 'class', '${uuid(U.class, 6)}', NULL, '${uuid(U.user, 3)}', NOW(), false),
  ('${uuid(U.assignmentTarget, 6)}', '${uuid(U.assignment, 4)}', 'group', NULL, '${uuid(U.group, 3)}', '${uuid(U.user, 3)}', NOW(), false),
  ('${uuid(U.assignmentTarget, 7)}', '${uuid(U.assignment, 4)}', 'group', NULL, '${uuid(U.group, 4)}', '${uuid(U.user, 3)}', NOW(), false),
  -- Python Control Structures assigned to 11 NM A, 11 NM B, 12 NM A + groups
  ('${uuid(U.assignmentTarget, 8)}', '${uuid(U.assignment, 5)}', 'class', '${uuid(U.class, 4)}', NULL, '${uuid(U.user, 3)}', NOW(), false),
  ('${uuid(U.assignmentTarget, 9)}', '${uuid(U.assignment, 5)}', 'class', '${uuid(U.class, 5)}', NULL, '${uuid(U.user, 3)}', NOW(), false),
  ('${uuid(U.assignmentTarget, 10)}', '${uuid(U.assignment, 5)}', 'class', '${uuid(U.class, 7)}', NULL, '${uuid(U.user, 3)}', NOW(), false),
  ('${uuid(U.assignmentTarget, 11)}', '${uuid(U.assignment, 5)}', 'group', NULL, '${uuid(U.group, 5)}', '${uuid(U.user, 3)}', NOW(), false),
  ('${uuid(U.assignmentTarget, 12)}', '${uuid(U.assignment, 5)}', 'group', NULL, '${uuid(U.group, 6)}', '${uuid(U.user, 3)}', NOW(), false),
  -- Python Collections assigned to 12 NM A, 12 NM B, 12 Med A + groups
  ('${uuid(U.assignmentTarget, 13)}', '${uuid(U.assignment, 6)}', 'class', '${uuid(U.class, 7)}', NULL, '${uuid(U.user, 3)}', NOW(), false),
  ('${uuid(U.assignmentTarget, 14)}', '${uuid(U.assignment, 6)}', 'class', '${uuid(U.class, 8)}', NULL, '${uuid(U.user, 3)}', NOW(), false),
  ('${uuid(U.assignmentTarget, 15)}', '${uuid(U.assignment, 6)}', 'class', '${uuid(U.class, 9)}', NULL, '${uuid(U.user, 3)}', NOW(), false),
  ('${uuid(U.assignmentTarget, 16)}', '${uuid(U.assignment, 6)}', 'group', NULL, '${uuid(U.group, 7)}', '${uuid(U.user, 3)}', NOW(), false),
  ('${uuid(U.assignmentTarget, 17)}', '${uuid(U.assignment, 6)}', 'group', NULL, '${uuid(U.group, 8)}', '${uuid(U.user, 3)}', NOW(), false)
ON CONFLICT (id) DO NOTHING;
`);

// 32. submissions (2 rows)
sqlParts.push(`-- 32. submissions
INSERT INTO submissions (id, assignment_id, student_id, code_content, output_content, observations, conclusion, submission_number, is_late, late_days, status, submitted_at, last_modified)
VALUES 
  ('${uuid(U.submission, 1)}', '${uuid(U.assignment, 1)}', '${uuid(U.user, 5)}', 'def matmul(A, B):\n    return [[sum(a*b for a,b in zip(X_row, Y_col)) for Y_col in zip(*B)] for X_row in A]\n\nprint(matmul([[1,2],[3,4]], [[5,6],[7,8]]))', '[[19, 22], [43, 50]]', 'Algorithm works with O(N^3) complexity', 'Matrix multiplication verified successfully with test matrices', 1, false, 0, 'graded', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('${uuid(U.submission, 2)}', '${uuid(U.assignment, 2)}', '${uuid(U.user, 6)}', NULL, NULL, 'V (Volts): [0.5, 1.0, 1.5, 2.0], I (Amps): [0.05, 0.10, 0.15, 0.20]', 'Graph is linear with slope R = 10 Ohms. Ohms Law is verified.', 1, false, 0, 'graded', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;
`);

// 33. submission_files (2 rows)
sqlParts.push(`-- 33. submission_files
INSERT INTO submission_files (id, submission_id, file_name, file_type, file_size, file_url, is_output, uploaded_at)
VALUES 
  ('${uuid(U.submissionFile, 1)}', '${uuid(U.submission, 1)}', 'matrix_result_screenshot.png', 'image/png', 185000, 'https://cdn.example.com/submissions/matrix_run.png', true, NOW() - INTERVAL '2 days'),
  ('${uuid(U.submissionFile, 2)}', '${uuid(U.submission, 2)}', 'vi_graph_plot.pdf', 'application/pdf', 320000, 'https://cdn.example.com/submissions/vi_graph.pdf', false, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;
`);

// 34. submission_revisions (2 rows)
sqlParts.push(`-- 34. submission_revisions
INSERT INTO submission_revisions (id, submission_id, revision_number, code_content, output_content, revision_note, created_at)
VALUES 
  ('${uuid(U.submissionRevision, 1)}', '${uuid(U.submission, 1)}', 1, 'def matmul(A, B):\n    return [[sum(a*b for a,b in zip(X_row, Y_col)) for Y_col in zip(*B)] for X_row in A]', '[[19, 22], [43, 50]]', 'Initial clean implementation using list comprehensions', NOW() - INTERVAL '2 days'),
  ('${uuid(U.submissionRevision, 2)}', '${uuid(U.submission, 2)}', 1, NULL, NULL, 'Initial experimental readings upload with graph', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;
`);

// 35. grades (2 rows)
sqlParts.push(`-- 35. grades
INSERT INTO grades (id, submission_id, student_id, graded_by, practical_marks, output_marks, viva_marks, total_marks, max_marks, percentage, grade_letter, late_penalty_marks, final_marks, code_feedback, general_remarks, is_published, published_at, graded_at, academic_year_id)
VALUES 
  ('${uuid(U.grade, 1)}', '${uuid(U.submission, 1)}', '${uuid(U.user, 5)}', '${uuid(U.user, 3)}', 48.0, 29.0, 18.0, 95.0, 100.0, 95.0, 'A+', 0.0, 95.0, 'Excellent use of zip and list comprehension', 'Outstanding work on matrix operations', true, NOW(), NOW() - INTERVAL '1 day', '${uuid(U.year, 2)}'),
  ('${uuid(U.grade, 2)}', '${uuid(U.submission, 2)}', '${uuid(U.user, 6)}', '${uuid(U.user, 4)}', 46.0, 24.0, 22.0, 92.0, 100.0, 92.0, 'A+', 0.0, 92.0, NULL, 'Accurate slope calculation on V-I graph', true, NOW(), NOW() - INTERVAL '12 hours', '${uuid(U.year, 2)}')
ON CONFLICT (id) DO NOTHING;
`);

// 36. grade_history (2 rows)
sqlParts.push(`-- 36. grade_history
INSERT INTO grade_history (id, grade_id, previous_marks, new_marks, reason, modified_by, modified_at)
VALUES 
  ('${uuid(U.gradeHist, 1)}', '${uuid(U.grade, 1)}', '{"total": 92}'::jsonb, '{"total": 95}'::jsonb, 'Recorrected viva question 2 score', '${uuid(U.user, 3)}', NOW()),
  ('${uuid(U.gradeHist, 2)}', '${uuid(U.grade, 2)}', '{"total": 90}'::jsonb, '{"total": 92}'::jsonb, 'Bonus marks for comprehensive error analysis', '${uuid(U.user, 4)}', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 37. final_lab_marks (2 rows)
sqlParts.push(`-- 37. final_lab_marks
INSERT INTO final_lab_marks (id, student_id, subject_id, class_id, academic_year_id, total_assignments, completed_assignments, internal_marks, viva_average, practical_exam_marks, total_marks, max_marks, percentage, grade_letter, grade_points, remarks, is_pass, finalized_by, finalized_at)
VALUES 
  ('${uuid(U.finalLabMark, 1)}', '${uuid(U.user, 5)}', '${uuid(U.subject, 1)}', '${uuid(U.class, 1)}', '${uuid(U.year, 2)}', 10, 10, 20.0, 19.0, 56.0, 95.0, 100.0, 95.0, 'A+', 9.80, 'Distinction in computer laboratory practicals', true, '${uuid(U.user, 3)}', NOW()),
  ('${uuid(U.finalLabMark, 2)}', '${uuid(U.user, 6)}', '${uuid(U.subject, 2)}', '${uuid(U.class, 1)}', '${uuid(U.year, 2)}', 10, 9, 18.0, 18.5, 54.0, 90.5, 100.0, 90.5, 'A+', 9.50, 'Excellent experimental precision', true, '${uuid(U.user, 4)}', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 38. document_folders (2 rows)
sqlParts.push(`-- 38. document_folders
INSERT INTO document_folders (id, school_id, parent_id, name, created_by, created_at, updated_at)
VALUES 
  ('${uuid(U.docFolder, 1)}', '${uuid(U.school, 1)}', NULL, 'CBSE Curriculum & Syllabi 2025-26', '${uuid(U.user, 1)}', NOW(), NOW()),
  ('${uuid(U.docFolder, 2)}', '${uuid(U.school, 1)}', NULL, 'Lab Safety & Operating Manuals', '${uuid(U.user, 1)}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 39. documents (2 rows)
sqlParts.push(`-- 39. documents
INSERT INTO documents (id, school_id, uploaded_by, folder_id, name, description, file_name, file_type, mime_type, file_size, cloudinary_id, url, is_public, category, created_at, updated_at)
VALUES 
  ('${uuid(U.doc, 1)}', '${uuid(U.school, 1)}', '${uuid(U.user, 3)}', '${uuid(U.docFolder, 1)}', 'Class 11 Computer Science Syllabus', 'Official syllabus breakdown and practical mark distribution', 'cbse_cs11_syllabus.pdf', 'pdf', 'application/pdf', 1048576, 'docs/cs11_syl', 'https://res.cloudinary.com/dn9vokfx5/raw/upload/v1/docs/cs11_syl.pdf', true, 'Syllabus', NOW(), NOW()),
  ('${uuid(U.doc, 2)}', '${uuid(U.school, 1)}', '${uuid(U.user, 8)}', '${uuid(U.docFolder, 2)}', 'Chemical Handling Safety Protocol', 'Standard operating procedures for chemical reagents and emergency eyewash', 'chem_safety_sop.pdf', 'pdf', 'application/pdf', 2097152, 'docs/chem_sop', 'https://res.cloudinary.com/dn9vokfx5/raw/upload/v1/docs/chem_sop.pdf', true, 'Safety', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 40. document_shares (2 rows)
sqlParts.push(`-- 40. document_shares
INSERT INTO document_shares (id, document_id, shared_by_id, target_type, target_class_id, message, permission, shared_at)
VALUES 
  ('${uuid(U.docShare, 1)}', '${uuid(U.doc, 1)}', '${uuid(U.user, 3)}', 'class', '${uuid(U.class, 1)}', 'Please download and review unit milestones', 'download', NOW()),
  ('${uuid(U.docShare, 2)}', '${uuid(U.doc, 2)}', '${uuid(U.user, 8)}', 'class', '${uuid(U.class, 1)}', 'Mandatory safety protocol for all chemistry practicals', 'download', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 41. folder_shares (2 rows)
sqlParts.push(`-- 41. folder_shares
INSERT INTO folder_shares (id, folder_id, shared_by_id, target_type, target_class_id, message, permission, shared_at)
VALUES 
  ('${uuid(U.folderShare, 1)}', '${uuid(U.docFolder, 1)}', '${uuid(U.user, 1)}', 'class', '${uuid(U.class, 1)}', 'Shared curriculum folder for Class 11', 'download', NOW()),
  ('${uuid(U.folderShare, 2)}', '${uuid(U.docFolder, 2)}', '${uuid(U.user, 1)}', 'class', '${uuid(U.class, 1)}', 'All lab safety manuals and SOPs', 'download', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 42. document_view_logs (2 rows)
sqlParts.push(`-- 42. document_view_logs
INSERT INTO document_view_logs (id, document_id, user_id, viewed_at, ip_address)
VALUES 
  ('${uuid(U.docViewLog, 1)}', '${uuid(U.doc, 1)}', '${uuid(U.user, 5)}', NOW() - INTERVAL '2 hours', '192.168.1.101'),
  ('${uuid(U.docViewLog, 2)}', '${uuid(U.doc, 2)}', '${uuid(U.user, 6)}', NOW() - INTERVAL '1 hour', '192.168.1.102')
ON CONFLICT (id) DO NOTHING;
`);

// 43. whiteboard_files (2 rows)
sqlParts.push(`-- 43. whiteboard_files
INSERT INTO whiteboard_files (id, school_id, owner_id, title, description, canvas_data, page_count, is_archived, created_at, updated_at)
VALUES 
  ('${uuid(U.whiteboardFile, 1)}', '${uuid(U.school, 1)}', '${uuid(U.user, 3)}', 'Computer Architecture & Von Neumann Model', 'Class lecture whiteboard diagram showing CPU, ALU, and Registers', '{"elements": [{"type": "rectangle", "x": 100, "y": 100, "width": 200, "height": 100, "label": "CPU"}]}', 1, false, NOW(), NOW()),
  ('${uuid(U.whiteboardFile, 2)}', '${uuid(U.school, 1)}', '${uuid(U.user, 4)}', 'Ray Optics Lens Formula Derivation', 'Convex lens ray tracing diagram with object, focal point, and virtual image', '{"elements": [{"type": "line", "x1": 50, "y1": 200, "x2": 400, "y2": 200}]}', 1, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 44. whiteboard_sessions (2 rows)
sqlParts.push(`-- 44. whiteboard_sessions
INSERT INTO whiteboard_sessions (id, school_id, host_id, title, status, target_type, meeting_code, target_class_id, started_at, duration_minutes, canvas_data, created_at)
VALUES 
  ('${uuid(U.whiteboardSession, 1)}', '${uuid(U.school, 1)}', '${uuid(U.user, 3)}', 'Live CS Lab Session: Sorting Algorithms', 'ended', 'class', 'WBCS101', '${uuid(U.class, 1)}', NOW() - INTERVAL '3 hours', 45, '{"elements": []}', NOW()),
  ('${uuid(U.whiteboardSession, 2)}', '${uuid(U.school, 1)}', '${uuid(U.user, 4)}', 'Live Physics Problem Solving: Circuits', 'active', 'class', 'WBPH202', '${uuid(U.class, 1)}', NOW() - INTERVAL '20 minutes', 60, '{"elements": []}', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 45. whiteboard_participants (2 rows)
sqlParts.push(`-- 45. whiteboard_participants
INSERT INTO whiteboard_participants (id, session_id, user_id, role, joined_at, is_active)
VALUES 
  ('${uuid(U.whiteboardParticipant, 1)}', '${uuid(U.whiteboardSession, 1)}', '${uuid(U.user, 5)}', 'viewer', NOW() - INTERVAL '3 hours', false),
  ('${uuid(U.whiteboardParticipant, 2)}', '${uuid(U.whiteboardSession, 2)}', '${uuid(U.user, 6)}', 'viewer', NOW() - INTERVAL '20 minutes', true)
ON CONFLICT (id) DO NOTHING;
`);

// 46. whiteboard_recordings (2 rows)
sqlParts.push(`-- 46. whiteboard_recordings
INSERT INTO whiteboard_recordings (id, user_id, school_id, title, description, session_id, cloudinary_id, cloudinary_url, duration, file_size, is_public, share_token, created_at)
VALUES 
  ('${uuid(U.whiteboardRecording, 1)}', '${uuid(U.user, 3)}', '${uuid(U.school, 1)}', 'Sorting Algorithms Animated Walkthrough', 'Step-by-step trace of Bubble sort vs Quick sort', '${uuid(U.whiteboardSession, 1)}', 'wb_rec/sorting_demo', 'https://res.cloudinary.com/dn9vokfx5/video/upload/v1/wb_rec/sorting_demo.mp4', 2700, 15480000, true, 'tok_rec_sort_001', NOW()),
  ('${uuid(U.whiteboardRecording, 2)}', '${uuid(U.user, 4)}', '${uuid(U.school, 1)}', 'Kirchhoff Laws Circuit Solution', 'Solving complex multi-loop circuit equations', '${uuid(U.whiteboardSession, 2)}', 'wb_rec/circuits_demo', 'https://res.cloudinary.com/dn9vokfx5/video/upload/v1/wb_rec/circuits_demo.mp4', 3600, 22100000, true, 'tok_rec_circ_002', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 47. whiteboard_recording_shares (2 rows)
sqlParts.push(`-- 47. whiteboard_recording_shares
INSERT INTO whiteboard_recording_shares (id, recording_id, shared_by_id, target_type, target_class_id, message, shared_at)
VALUES 
  ('${uuid(U.whiteboardShare, 1)}', '${uuid(U.whiteboardRecording, 1)}', '${uuid(U.user, 3)}', 'class', '${uuid(U.class, 1)}', 'Recording of sorting walkthrough for revision', NOW()),
  ('${uuid(U.whiteboardShare, 2)}', '${uuid(U.whiteboardRecording, 2)}', '${uuid(U.user, 4)}', 'class', '${uuid(U.class, 1)}', 'Watch circuit problem solving before tomorrow quiz', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 48. vendors (2 rows)
sqlParts.push(`-- 48. vendors
INSERT INTO vendors (id, name, contact_person, email, phone, address, gstin, is_local, school_id, created_at, updated_at)
VALUES 
  ('${uuid(U.vendor, 1)}', 'Apex Scientific Instruments Pvt Ltd', 'Anil Mehta', 'sales@apexscientific.in', '+91 9811223344', 'Plot 42, Okhla Industrial Area Phase 3, New Delhi', '07AAACA1234A1Z5', true, '${uuid(U.school, 1)}', NOW(), NOW()),
  ('${uuid(U.vendor, 2)}', 'Silicon Edge Computech Ltd', 'Rohit Aggarwal', 'enterprise@siliconedge.com', '+91 9822334455', 'Tower B, Cyber City, Gurugram', '06AAACS5678B2Z6', true, '${uuid(U.school, 1)}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 49. procurement_requests (2 rows)
sqlParts.push(`-- 49. procurement_requests
INSERT INTO procurement_requests (id, title, description, purpose, department, budget_code, current_step, estimated_total, approved_total, status, created_by_id, approved_by_id, approved_at, school_id, created_at, updated_at)
VALUES 
  ('${uuid(U.procRequest, 1)}', 'Lab Computer Upgrades (20 Units)', 'Procurement of 20 Core i7 desktop workstations for Computer Lab 1', 'Replace aged 4th gen desktop machines', 'Computer Science', 'BUD-CS-2025', 4, 1200000.00, 1150000.00, 'approved', '${uuid(U.user, 3)}', '${uuid(U.user, 2)}', NOW() - INTERVAL '10 days', '${uuid(U.school, 1)}', NOW(), NOW()),
  ('${uuid(U.procRequest, 2)}', 'Precision Optics & Spectrometer Kit', 'Purchase of high-accuracy optical spectrometers for Physics Lab', 'Mandatory for CBSE Class 12 Advanced Optics', 'Physics', 'BUD-PHY-2025', 2, 450000.00, NULL, 'quotation_requested', '${uuid(U.user, 4)}', NULL, NULL, '${uuid(U.school, 1)}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 50. procurement_items (2 rows)
sqlParts.push(`-- 50. procurement_items
INSERT INTO procurement_items (id, request_id, item_name, description, specifications, quantity, unit, estimated_unit_price, approved_unit_price, approved_vendor_id, is_received, received_qty, created_at)
VALUES 
  ('${uuid(U.procItem, 1)}', '${uuid(U.procRequest, 1)}', 'Desktop Workstation i7', 'Complete tower with 24-inch IPS monitor, keyboard and mouse', 'Intel i7-13700, 16GB DDR5, 512GB NVMe, Ubuntu 22.04 LTS', 20, 'pcs', 60000.00, 57500.00, '${uuid(U.vendor, 2)}', false, 0, NOW()),
  ('${uuid(U.procItem, 2)}', '${uuid(U.procRequest, 2)}', 'Digital Optical Spectrometer', 'High resolution diffraction grating spectrometer', '380-780nm range, USB connectivity, calibration software included', 5, 'pcs', 90000.00, NULL, NULL, false, 0, NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 51. procurement_committee (2 rows)
sqlParts.push(`-- 51. procurement_committee
INSERT INTO procurement_committee (id, request_id, user_id, role, designation, added_at)
VALUES 
  ('${uuid(U.procCommittee, 1)}', '${uuid(U.procRequest, 1)}', '${uuid(U.user, 1)}', 'chairman', 'Administrative Officer', NOW()),
  ('${uuid(U.procCommittee, 2)}', '${uuid(U.procRequest, 1)}', '${uuid(U.user, 7)}', 'member', 'Senior Accountant', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 52. vendor_quotations (2 rows)
sqlParts.push(`-- 52. vendor_quotations
INSERT INTO vendor_quotations (id, request_id, vendor_id, quotation_number, quotation_date, valid_until, total_amount, terms, remarks, created_at)
VALUES 
  ('${uuid(U.vendorQuote, 1)}', '${uuid(U.procRequest, 1)}', '${uuid(U.vendor, 2)}', 'QT-SEC-2025-089', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '45 days', 1150000.00, '30 days payment upon delivery and physical inspection; 3-year onsite warranty included', 'Best commercial quote received', NOW()),
  ('${uuid(U.vendorQuote, 2)}', '${uuid(U.procRequest, 2)}', '${uuid(U.vendor, 1)}', 'QT-APX-2025-042', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', 435000.00, 'Payment 50% advance, 50% post installation and calibration check', 'Includes 1-day teacher training', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 53. quotation_items (2 rows)
sqlParts.push(`-- 53. quotation_items
INSERT INTO quotation_items (id, quotation_id, procurement_item_id, unit_price, quantity, total_price, remarks)
VALUES 
  ('${uuid(U.quoteItem, 1)}', '${uuid(U.vendorQuote, 1)}', '${uuid(U.procItem, 1)}', 57500.00, 20, 1150000.00, 'Unit price includes bulk educational discount'),
  ('${uuid(U.quoteItem, 2)}', '${uuid(U.vendorQuote, 2)}', '${uuid(U.procItem, 2)}', 87000.00, 5, 435000.00, 'Special institutional pricing with calibration certificates')
ON CONFLICT (id) DO NOTHING;
`);

// 54. ticket_issue_types (4 rows)
sqlParts.push(`-- 54. ticket_issue_types
INSERT INTO ticket_issue_types (id, category, name, description, display_order, is_active, created_at)
VALUES 
  ('${uuid(U.ticketIssueType, 1)}', 'hardware_issue', 'Display / Monitor Flickering', 'Monitor shows lines, artifacts or fails to power on', 1, true, NOW()),
  ('${uuid(U.ticketIssueType, 2)}', 'software_issue', 'Operating System / Boot Error', 'Grub failure, blue screen or system freezing on startup', 2, true, NOW()),
  ('${uuid(U.ticketIssueType, 3)}', 'maintenance_request', 'AC Cooling / Air Circulation', 'Lab temperature exceeding equipment threshold', 3, true, NOW()),
  ('${uuid(U.ticketIssueType, 4)}', 'general_complaint', 'Projector Audio Muted', 'Interactive whiteboard audio not routing through classroom speakers', 4, true, NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 55. tickets (2 rows)
sqlParts.push(`-- 55. tickets
INSERT INTO tickets (id, ticket_number, title, description, category, priority, status, item_id, lab_id, issue_type_id, created_by_id, assigned_to_id, created_at, updated_at)
VALUES 
  ('${uuid(U.ticket, 1)}', 'TCK-2025-001', 'Terminal 14 Keyboard Not Responding', 'Keys spacebar and enter fail to register input during student lab session', 'hardware_issue', 'medium', 'open', '${uuid(U.item, 1)}', '${uuid(U.lab, 1)}', '${uuid(U.ticketIssueType, 1)}', '${uuid(U.user, 3)}', '${uuid(U.user, 8)}', NOW(), NOW()),
  ('${uuid(U.ticket, 2)}', 'TCK-2025-002', 'Python 3.11 Environment Broken on Node 08', 'Virtualenv corrupted following recent package update', 'software_issue', 'high', 'in_progress', '${uuid(U.item, 2)}', '${uuid(U.lab, 1)}', '${uuid(U.ticketIssueType, 2)}', '${uuid(U.user, 3)}', '${uuid(U.user, 8)}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 56. ticket_comments (2 rows)
sqlParts.push(`-- 56. ticket_comments
INSERT INTO ticket_comments (id, ticket_id, user_id, content, created_at)
VALUES 
  ('${uuid(U.ticketComment, 1)}', '${uuid(U.ticket, 1)}', '${uuid(U.user, 8)}', 'Inspected hardware. USB connector pins bent. Swapping with spare USB keyboard from inventory.', NOW()),
  ('${uuid(U.ticketComment, 2)}', '${uuid(U.ticket, 2)}', '${uuid(U.user, 8)}', 'Rebuilt python virtualenv and re-installed numpy and matplotlib. Running verification tests now.', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 57. timetables (2 rows)
sqlParts.push(`-- 57. timetables
INSERT INTO timetables (id, school_id, class_id, academic_year_id, name, effective_from, is_active, created_at, updated_at)
VALUES 
  ('${uuid(U.timetable, 1)}', '${uuid(U.school, 1)}', '${uuid(U.class, 1)}', '${uuid(U.year, 2)}', 'Class 11-A Weekly Timetable (Odd Semester)', '2025-04-01', true, NOW(), NOW()),
  ('${uuid(U.timetable, 2)}', '${uuid(U.school, 1)}', '${uuid(U.class, 2)}', '${uuid(U.year, 2)}', 'Class 11-B Weekly Timetable (Odd Semester)', '2025-04-01', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 58. timetable_slots (4 rows)
sqlParts.push(`-- 58. timetable_slots
INSERT INTO timetable_slots (id, timetable_id, day_of_week, period_number, start_time, end_time, subject_id, instructor_id, room_number, slot_type, created_at)
VALUES 
  ('${uuid(U.timetableSlot, 1)}', '${uuid(U.timetable, 1)}', 'monday', 1, '08:30', '09:15', '${uuid(U.subject, 1)}', '${uuid(U.user, 3)}', 'ROOM-101', 'lecture', NOW()),
  ('${uuid(U.timetableSlot, 2)}', '${uuid(U.timetable, 1)}', 'monday', 2, '09:15', '10:00', '${uuid(U.subject, 1)}', '${uuid(U.user, 3)}', 'ROOM-101', 'lab', NOW()),
  ('${uuid(U.timetableSlot, 3)}', '${uuid(U.timetable, 1)}', 'tuesday', 1, '08:30', '09:15', '${uuid(U.subject, 2)}', '${uuid(U.user, 4)}', 'ROOM-204', 'lecture', NOW()),
  ('${uuid(U.timetableSlot, 4)}', '${uuid(U.timetable, 1)}', 'tuesday', 2, '09:15', '10:00', '${uuid(U.subject, 2)}', '${uuid(U.user, 4)}', 'ROOM-204', 'lab', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 59. school_calendar (2 rows)
sqlParts.push(`-- 59. school_calendar
INSERT INTO school_calendar (id, school_id, academic_year_id, date, title, title_hindi, type, is_holiday, start_time, end_time, description, source, created_by_id, created_at)
VALUES 
  ('${uuid(U.calendar, 1)}', '${uuid(U.school, 1)}', '${uuid(U.year, 2)}', '2025-08-15', 'Independence Day Celebration', 'स्वतंत्रता दिवस समारोह', 'gazetted_holiday', true, '08:00', '11:00', 'National holiday flag hoisting ceremony and cultural events', 'punjab_govt', '${uuid(U.user, 1)}', NOW()),
  ('${uuid(U.calendar, 2)}', '${uuid(U.school, 1)}', '${uuid(U.year, 2)}', '2025-10-02', 'Gandhi Jayanti', 'गांधी जयंती', 'gazetted_holiday', true, '00:00', '23:59', 'Birth anniversary of Mahatma Gandhi', 'punjab_govt', '${uuid(U.user, 1)}', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 60. lecture_plans (2 rows)
sqlParts.push(`-- 60. lecture_plans
INSERT INTO lecture_plans (id, school_id, instructor_id, subject_id, class_id, academic_year_id, title, title_hindi, description, lecture_number, scheduled_date, scheduled_duration, lecture_type, status, created_at, updated_at)
VALUES 
  ('${uuid(U.lecturePlan, 1)}', '${uuid(U.school, 1)}', '${uuid(U.user, 3)}', '${uuid(U.subject, 1)}', '${uuid(U.class, 1)}', '${uuid(U.year, 2)}', 'Introduction to Dynamic Programming', 'डायनामिक प्रोग्रामिंग का परिचय', 'Memoization vs Tabulation with Fibonacci and Knapsack examples', 14, CURRENT_DATE, 45, 'theory', 'completed', NOW(), NOW()),
  ('${uuid(U.lecturePlan, 2)}', '${uuid(U.school, 1)}', '${uuid(U.user, 4)}', '${uuid(U.subject, 2)}', '${uuid(U.class, 1)}', '${uuid(U.year, 2)}', 'Electromagnetic Induction & Faraday Law', 'विद्युत चुम्बकीय प्रेरण और फैराडे का नियम', 'Magnetic flux change and induced EMF with Lenz Law applications', 15, CURRENT_DATE + INTERVAL '1 day', 45, 'theory', 'planned', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 61. lecture_sessions (2 rows)
sqlParts.push(`-- 61. lecture_sessions
INSERT INTO lecture_sessions (id, lecture_plan_id, started_at, ended_at, actual_duration, attendance_count, topics_covered, instructor_remarks, status)
VALUES 
  ('${uuid(U.lectureSession, 1)}', '${uuid(U.lecturePlan, 1)}', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 15 minutes', 45, 2, '["Fibonacci Series", "Top-down memoization", "Bottom-up table"]'::jsonb, 'Class showed high engagement during recursive call stack visualization', 'completed'),
  ('${uuid(U.lectureSession, 2)}', '${uuid(U.lecturePlan, 2)}', NOW() - INTERVAL '30 minutes', NULL, NULL, 2, '["Magnetic flux definition", "Faraday experiment"]'::jsonb, 'Session ongoing in smart classroom', 'active')
ON CONFLICT (id) DO NOTHING;
`);

// 62. lecture_resources (2 rows)
sqlParts.push(`-- 62. lecture_resources
INSERT INTO lecture_resources (id, lecture_plan_id, lecture_session_id, title, type, url, file_size, mime_type, uploaded_by_id, sequence_order, created_at)
VALUES 
  ('${uuid(U.lectureResource, 1)}', '${uuid(U.lecturePlan, 1)}', '${uuid(U.lectureSession, 1)}', 'DP Lecture Slides (PDF)', 'slide', 'https://cdn.example.com/lectures/dp_slides.pdf', 3450000, 'application/pdf', '${uuid(U.user, 3)}', 1, NOW()),
  ('${uuid(U.lectureResource, 2)}', '${uuid(U.lecturePlan, 2)}', '${uuid(U.lectureSession, 2)}', 'Faraday Experiment Simulation Link', 'external_link', 'https://phet.colorado.edu/sims/html/faradays-law/latest/faradays-law_en.html', NULL, 'text/html', '${uuid(U.user, 4)}', 1, NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 63. lecture_attendance (2 rows)
sqlParts.push(`-- 63. lecture_attendance
INSERT INTO lecture_attendance (id, lecture_session_id, student_id, status, joined_at, engagement_score)
VALUES 
  ('${uuid(U.lectureAttendance, 1)}', '${uuid(U.lectureSession, 1)}', '${uuid(U.user, 5)}', 'present', NOW() - INTERVAL '3 hours', 95),
  ('${uuid(U.lectureAttendance, 2)}', '${uuid(U.lectureSession, 1)}', '${uuid(U.user, 6)}', 'present', NOW() - INTERVAL '3 hours', 90)
ON CONFLICT (id) DO NOTHING;
`);

// 64. lecture_polls (2 rows)
sqlParts.push(`-- 64. lecture_polls
INSERT INTO lecture_polls (id, lecture_session_id, question, options, correct_option, is_active, created_at)
VALUES 
  ('${uuid(U.lecturePoll, 1)}', '${uuid(U.lectureSession, 1)}', 'What is the time complexity of naive recursive Fibonacci?', '["O(N)", "O(N log N)", "O(2^N)", "O(1)"]'::jsonb, 2, false, NOW()),
  ('${uuid(U.lecturePoll, 2)}', '${uuid(U.lectureSession, 2)}', 'According to Lenz Law, the direction of induced current opposes what?', '["Voltage", "The change in magnetic flux producing it", "Electric resistance", "Temperature"]'::jsonb, 1, true, NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 65. lecture_poll_responses (2 rows)
sqlParts.push(`-- 65. lecture_poll_responses
INSERT INTO lecture_poll_responses (id, poll_id, student_id, selected_option, answered_at)
VALUES 
  ('${uuid(U.lecturePollResp, 1)}', '${uuid(U.lecturePoll, 1)}', '${uuid(U.user, 5)}', 2, NOW() - INTERVAL '2 hours 45 minutes'),
  ('${uuid(U.lecturePollResp, 2)}', '${uuid(U.lecturePoll, 1)}', '${uuid(U.user, 6)}', 2, NOW() - INTERVAL '2 hours 45 minutes')
ON CONFLICT (id) DO NOTHING;
`);

// 66. fee_categories (2 rows)
sqlParts.push(`-- 66. fee_categories
INSERT INTO fee_categories (id, school_id, name, name_hindi, description, is_recurring, frequency, created_at)
VALUES 
  ('${uuid(U.feeCategory, 1)}', '${uuid(U.school, 1)}', 'Tuition Fee (Quarterly)', 'ट्यूशन शुल्क (त्रैमासिक)', 'Quarterly academic tuition and classroom instruction fee', true, 'quarterly', NOW()),
  ('${uuid(U.feeCategory, 2)}', '${uuid(U.school, 1)}', 'Science & Computer Lab Maintenance Fee', 'विज्ञान एवं कंप्यूटर प्रयोगशाला शुल्क', 'Annual laboratory equipment, reagents, and software licensing fee', true, 'yearly', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 67. fee_structures (2 rows)
sqlParts.push(`-- 67. fee_structures
INSERT INTO fee_structures (id, school_id, academic_year_id, fee_category_id, class_id, subject_id, amount, currency, due_date, concession_applicable, created_at)
VALUES 
  ('${uuid(U.feeStructure, 1)}', '${uuid(U.school, 1)}', '${uuid(U.year, 2)}', '${uuid(U.feeCategory, 1)}', '${uuid(U.class, 1)}', '${uuid(U.subject, 1)}', 18000.00, 'INR', NOW() + INTERVAL '30 days', true, NOW()),
  ('${uuid(U.feeStructure, 2)}', '${uuid(U.school, 1)}', '${uuid(U.year, 2)}', '${uuid(U.feeCategory, 2)}', '${uuid(U.class, 1)}', '${uuid(U.subject, 1)}', 6000.00, 'INR', NOW() + INTERVAL '30 days', true, NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 68. student_fees (2 rows)
sqlParts.push(`-- 68. student_fees
INSERT INTO student_fees (id, student_id, fee_structure_id, academic_year_id, base_amount, concession_amount, final_amount, status, due_date, created_at)
VALUES 
  ('${uuid(U.studentFee, 1)}', '${uuid(U.user, 5)}', '${uuid(U.feeStructure, 1)}', '${uuid(U.year, 2)}', 18000.00, 0.00, 18000.00, 'paid', NOW() + INTERVAL '30 days', NOW()),
  ('${uuid(U.studentFee, 2)}', '${uuid(U.user, 6)}', '${uuid(U.feeStructure, 2)}', '${uuid(U.year, 2)}', 6000.00, 1000.00, 5000.00, 'paid', NOW() + INTERVAL '30 days', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 69. fee_payments (2 rows)
sqlParts.push(`-- 69. fee_payments
INSERT INTO fee_payments (id, student_fee_id, student_id, amount, payment_mode, transaction_id, receipt_number, payment_date, collected_by, remarks, created_at)
VALUES 
  ('${uuid(U.feePayment, 1)}', '${uuid(U.studentFee, 1)}', '${uuid(U.user, 5)}', 18000.00, 'upi', 'UPI-HDFC-99887766', 'REC-2025-0001', NOW() - INTERVAL '3 days', '${uuid(U.user, 7)}', 'Tuition Q1 received via UPI', NOW()),
  ('${uuid(U.feePayment, 2)}', '${uuid(U.studentFee, 2)}', '${uuid(U.user, 6)}', 5000.00, 'bank_transfer', 'NEFT-SBI-11223344', 'REC-2025-0002', NOW() - INTERVAL '2 days', '${uuid(U.user, 7)}', 'Lab fee after approved merit concession', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 70. meetings (2 rows)
sqlParts.push(`-- 70. meetings
INSERT INTO meetings (id, school_id, title, type, target_class_id, host_id, scheduled_at, duration_minutes, mode, status, created_at, updated_at)
VALUES 
  ('${uuid(U.meeting, 1)}', '${uuid(U.school, 1)}', 'Term 1 Parent Teacher Conference - 11A', 'ptm', '${uuid(U.class, 1)}', '${uuid(U.user, 3)}', NOW() + INTERVAL '2 days', 30, 'online', 'scheduled', NOW(), NOW()),
  ('${uuid(U.meeting, 2)}', '${uuid(U.school, 1)}', 'Physics Viva Voce Oral Assessment', 'viva', '${uuid(U.class, 1)}', '${uuid(U.user, 4)}', NOW() - INTERVAL '1 day', 15, 'online', 'completed', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 71. meeting_participants (2 rows)
sqlParts.push(`-- 71. meeting_participants
INSERT INTO meeting_participants (id, session_id, user_id, role, status, joined_waiting_at, is_video_enabled, is_audio_enabled)
VALUES 
  ('${uuid(U.meetingParticipant, 1)}', '${uuid(U.meeting, 2)}', '${uuid(U.user, 5)}', 'student', 'in_session', NOW() - INTERVAL '1 day', true, true),
  ('${uuid(U.meetingParticipant, 2)}', '${uuid(U.meeting, 2)}', '${uuid(U.user, 6)}', 'student', 'in_session', NOW() - INTERVAL '1 day', true, true)
ON CONFLICT (id) DO NOTHING;
`);

// 72. meeting_questions (2 rows)
sqlParts.push(`-- 72. meeting_questions
INSERT INTO meeting_questions (id, subject_id, assignment_id, question, question_hindi, expected_answer, difficulty, marks, topic_tags, created_by, created_at)
VALUES 
  ('${uuid(U.meetingQuestion, 1)}', '${uuid(U.subject, 1)}', '${uuid(U.assignment, 1)}', 'What condition is required to multiply two matrices of dimensions M x K and K x N?', 'दो मैट्रिक्स जिनका आयाम M x K और K x N है, उनका गुणन करने के लिए क्या शर्त आवश्यक है?', 'The number of columns in the first matrix must equal the number of rows in the second matrix (K = K).', 'easy', 2, ARRAY['matrices', 'python', 'linear-algebra'], '${uuid(U.user, 3)}', NOW()),
  ('${uuid(U.meetingQuestion, 2)}', '${uuid(U.subject, 2)}', '${uuid(U.assignment, 2)}', 'How does wire resistance change when its diameter is doubled while keeping length constant?', 'तार की लंबाई स्थिर रखते हुए उसका व्यास दोगुना करने पर प्रतिरोध कैसे बदलता है?', 'Resistance becomes one-fourth (R proportional to 1/A, area quadruples).', 'medium', 3, ARRAY['electricity', 'ohms-law', 'physics'], '${uuid(U.user, 4)}', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 73. notification_templates (2 rows)
sqlParts.push(`-- 73. notification_templates
INSERT INTO notification_templates (id, school_id, name, subject, body_template, trigger_event, channels, is_active, created_at)
VALUES 
  ('${uuid(U.notifTemplate, 1)}', '${uuid(U.school, 1)}', 'Assignment Due Reminder', 'Upcoming Practical Assignment Due: {{assignment_title}}', 'Dear {{student_name}}, your practical submission for {{assignment_title}} is due on {{due_date}}. Please upload before the portal locks.', 'assignment_due', ARRAY['email', 'in_app'], true, NOW()),
  ('${uuid(U.notifTemplate, 2)}', '${uuid(U.school, 1)}', 'Fee Payment Acknowledgment', 'Payment Receipt Confirmed: {{receipt_number}}', 'Dear Parent, we acknowledge receipt of Rs. {{amount}} towards {{fee_title}}. Transaction ID: {{transaction_id}}.', 'fee_paid', ARRAY['sms', 'email'], true, NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 74. notifications (2 rows)
sqlParts.push(`-- 74. notifications
INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at, template_id, channel)
VALUES 
  ('${uuid(U.notif, 1)}', '${uuid(U.user, 5)}', 'Practical Graded', 'Your submission for Matrix Multiplication in Python has been evaluated with Grade A+ (95%).', 'grade', false, NOW(), '${uuid(U.notifTemplate, 1)}', 'in_app'),
  ('${uuid(U.notif, 2)}', '${uuid(U.user, 6)}', 'Fee Receipt Generated', 'Your lab access fee payment of Rs. 5000 has been verified under Receipt REC-2025-0002.', 'fee', true, NOW(), '${uuid(U.notifTemplate, 2)}', 'in_app')
ON CONFLICT (id) DO NOTHING;
`);

// 75. user_sessions (2 rows)
sqlParts.push(`-- 75. user_sessions
INSERT INTO user_sessions (id, user_id, token, ip_address, user_agent, expires_at, created_at)
VALUES 
  ('${uuid(U.userSession, 1)}', '${uuid(U.user, 1)}', 'jwt_test_token_admin_session_001', '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', NOW() + INTERVAL '7 days', NOW()),
  ('${uuid(U.userSession, 2)}', '${uuid(U.user, 3)}', 'jwt_test_token_instructor_session_002', '192.168.1.15', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() + INTERVAL '7 days', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 76. device_tests (2 rows)
sqlParts.push(`-- 76. device_tests
INSERT INTO device_tests (id, user_id, camera_status, camera_tested_at, camera_device_name, mic_status, mic_tested_at, mic_device_name, speaker_status, speaker_tested_at, speaker_volume, platform, browser, created_at, updated_at)
VALUES 
  ('${uuid(U.deviceTest, 1)}', '${uuid(U.user, 5)}', 'passed', NOW(), 'FaceTime HD Camera', 'passed', NOW(), 'Built-in Microphone', 'passed', NOW(), 85, 'MacIntel', 'Chrome 122', NOW(), NOW()),
  ('${uuid(U.deviceTest, 2)}', '${uuid(U.user, 6)}', 'passed', NOW(), 'Integrated Webcam', 'passed', NOW(), 'Realtek High Definition Audio', 'passed', NOW(), 90, 'Win32', 'Firefox 120', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 77. admin_notes (2 rows)
sqlParts.push(`-- 77. admin_notes
INSERT INTO admin_notes (id, title, content, category, is_pinned, author_id, created_at, updated_at)
VALUES 
  ('${uuid(U.adminNote, 1)}', 'Annual CBSE Practical Audit Schedule', 'Practical exam inspection team visits between Nov 15 and Nov 20. Ensure all lab logs and equipment tags are updated.', 'compliance', true, '${uuid(U.user, 1)}', NOW(), NOW()),
  ('${uuid(U.adminNote, 2)}', 'UPS Battery Maintenance Window', 'Central UPS bank backup maintenance scheduled for Saturday 3:00 PM to 6:00 PM. Server room will run on generator.', 'infrastructure', false, '${uuid(U.user, 1)}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 78. activity_logs (2 rows)
sqlParts.push(`-- 78. activity_logs
INSERT INTO activity_logs (id, user_id, activity_type, description, school_id, action_type, metadata, created_at)
VALUES 
  ('${uuid(U.activityLog, 1)}', '${uuid(U.user, 1)}', 'login', 'Administrator Ramesh Sharma signed in via portal', '${uuid(U.school, 1)}', 'USER_LOGIN', '{"browser": "Chrome", "ip": "127.0.0.1"}'::jsonb, NOW()),
  ('${uuid(U.activityLog, 2)}', '${uuid(U.user, 3)}', 'assignment', 'Instructor Rajesh published assignment Matrix Multiplication in Python', '${uuid(U.school, 1)}', 'ASSIGNMENT_CREATE', '{"assignment_id": "${uuid(U.assignment, 1)}"}'::jsonb, NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 79. audit_logs (2 rows)
sqlParts.push(`-- 79. audit_logs
INSERT INTO audit_logs (id, user_id, school_id, action, entity_type, entity_id, entity_name, details, ip_address, created_at)
VALUES 
  ('${uuid(U.auditLog, 1)}', '${uuid(U.user, 1)}', '${uuid(U.school, 1)}', 'CREATE_SCHOOL', 'School', '${uuid(U.school, 1)}', 'Delhi Public School', '{"code": "DPS001"}'::jsonb, '127.0.0.1', NOW()),
  ('${uuid(U.auditLog, 2)}', '${uuid(U.user, 1)}', '${uuid(U.school, 1)}', 'UPDATE_GRADE_SCALE', 'GradeScale', '${uuid(U.gradeScale, 1)}', 'Grade A+', '{"min": 90, "max": 100}'::jsonb, '127.0.0.1', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 80. query_logs (2 rows)
sqlParts.push(`-- 80. query_logs
INSERT INTO query_logs (id, query, params, duration, error, success, model, action, user_id, user_email, ip_address, created_at)
VALUES 
  ('${uuid(U.queryLog, 1)}', 'SELECT * FROM users WHERE email = $1', '["admin@dps.edu"]', 45, NULL, true, 'User', 'findUnique', '${uuid(U.user, 1)}', 'admin@dps.edu', '127.0.0.1', NOW()),
  ('${uuid(U.queryLog, 2)}', 'SELECT * FROM assignments WHERE school_id = $1', '["${uuid(U.school, 1)}"]', 62, NULL, true, 'Assignment', 'findMany', '${uuid(U.user, 3)}', 'instructor1@dps.edu', '192.168.1.15', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 81. site_updates (2 rows)
sqlParts.push(`-- 81. site_updates
INSERT INTO site_updates (id, version, description, changes, updated_at, updated_by)
VALUES 
  ('${uuid(U.siteUpdate, 1)}', 'v2.1.0', 'Comprehensive Whiteboard & Real-time Collaboration Engine', 'Enhanced canvas renderer with arrow connector alignment, export PDF and live multi-cursor sync', NOW(), 'DevOps Team'),
  ('${uuid(U.siteUpdate, 2)}', 'v2.0.0', 'High Availability Neon DB & Offline Lab Records Sync', 'Upgraded database cluster with Neon connection pooling and sub-second viva scoring', NOW(), 'DevOps Team')
ON CONFLICT (id) DO NOTHING;
`);

// 82. system_settings (2 rows)
sqlParts.push(`-- 82. system_settings
INSERT INTO system_settings (id, key, value, created_at, updated_at)
VALUES 
  ('${uuid(U.systemSetting, 1)}', 'school_branding_default', '{"theme": "indigo", "allow_dark_mode": true, "show_hindi_labels": true}'::jsonb, NOW(), NOW()),
  ('${uuid(U.systemSetting, 2)}', 'max_upload_size_mb', '{"documents": 25, "recordings": 100, "code_submissions": 5}'::jsonb, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 83. implementation_plans (2 rows)
sqlParts.push(`-- 83. implementation_plans
INSERT INTO implementation_plans (id, school_id, created_by_id, title, description, category, status, started_at, tasks, outcomes, metadata, created_at, updated_at)
VALUES 
  ('${uuid(U.implPlan, 1)}', '${uuid(U.school, 1)}', '${uuid(U.user, 1)}', 'Smart Laboratory Digitization Phase 1', 'Roll out tablet interfaces for digital attendance and instant practical viva marks recording', 'Digitization', 'in_progress', NOW() - INTERVAL '30 days', '[{"task": "Procure tablets", "done": true}, {"task": "Deploy wifi mesh", "done": true}, {"task": "Teacher training", "done": false}]'::jsonb, 'Zero paper waste achieved across computer labs', '{"target_completion": "2025-12-31"}'::jsonb, NOW(), NOW()),
  ('${uuid(U.implPlan, 2)}', '${uuid(U.school, 1)}', '${uuid(U.user, 1)}', 'AI-Assisted Socratic Code Feedback Pilot', 'Integrate automated code review hints for CBSE Class 11 and 12 programming exercises', 'Academics', 'planning', NOW() - INTERVAL '10 days', '[{"task": "Model prompt tuning", "done": true}, {"task": "Student pilot", "done": false}]'::jsonb, 'Faster iterative learning during lab hours', '{"pilot_classes": ["11-A", "12-A"]}'::jsonb, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 84. chat_sessions (2 rows)
sqlParts.push(`-- 84. chat_sessions
INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
VALUES 
  ('${uuid(U.chatSession, 1)}', '${uuid(U.user, 3)}', 'Generating Python Viva Questions for Class 11', NOW(), NOW()),
  ('${uuid(U.chatSession, 2)}', '${uuid(U.user, 5)}', 'Debugging Matrix Multiplication Index Error', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 85. chat_messages (2 rows)
sqlParts.push(`-- 85. chat_messages
INSERT INTO chat_messages (id, session_id, role, content, provider, created_at)
VALUES 
  ('${uuid(U.chatMessage, 1)}', '${uuid(U.chatSession, 1)}', 'user', 'Can you generate 5 conceptual viva questions on Python 2D arrays and matrix multiplication with sample answers?', 'gemini-1.5-pro', NOW()),
  ('${uuid(U.chatMessage, 2)}', '${uuid(U.chatSession, 1)}', 'assistant', 'Certainly! Here are 5 conceptual questions:\n1. Why must the inner dimensions match for matrix multiplication?\n2. What is the time complexity of naive O(N^3) multiplication vs Strassen algorithm?\n3. How does zip(*B) transpose a matrix in Python?\n4. What happens if matrices are non-square?\n5. Explain memory layout of nested lists vs NumPy contiguous arrays.', 'gemini-1.5-pro', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 86. translations (4 rows: en and hi pairs)
sqlParts.push(`-- 86. translations
INSERT INTO translations (id, key, language_code, value, created_at, updated_at)
VALUES 
  ('${uuid(U.translation, 1)}', 'app.welcome', 'en', 'Welcome to Lab Record Manager', NOW(), NOW()),
  ('${uuid(U.translation, 2)}', 'app.welcome', 'hi', 'प्रयोगशाला रिकॉर्ड प्रबंधक में आपका स्वागत है', NOW(), NOW()),
  ('${uuid(U.translation, 3)}', 'nav.dashboard', 'en', 'Dashboard', NOW(), NOW()),
  ('${uuid(U.translation, 4)}', 'nav.dashboard', 'hi', 'डैशबोर्ड', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 87. import_history (2 rows)
sqlParts.push(`-- 87. import_history
INSERT INTO import_history (id, school_id, lab_id, uploaded_by, file_name, file_size, items_imported, items_failed, status, created_at)
VALUES 
  ('${uuid(U.importHistory, 1)}', '${uuid(U.school, 1)}', '${uuid(U.lab, 1)}', '${uuid(U.user, 1)}', 'initial_workstations_import.csv', 48200, 40, 0, 'completed', NOW()),
  ('${uuid(U.importHistory, 2)}', '${uuid(U.school, 1)}', '${uuid(U.lab, 2)}', '${uuid(U.user, 4)}', 'physics_apparatus_list.csv', 32400, 25, 0, 'completed', NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 88. report_templates (2 rows)
sqlParts.push(`-- 88. report_templates
INSERT INTO report_templates (id, school_id, name, type, template_content, header_html, footer_html, is_default, created_at)
VALUES 
  ('${uuid(U.reportTemplate, 1)}', '${uuid(U.school, 1)}', 'CBSE Standard Practical Progress Report', 'progress', '<div><h1>Practical Progress Card</h1><p>Student: {{student_name}}</p></div>', '<header>Delhi Public School Lab Records</header>', '<footer>Page 1 of 1</footer>', true, NOW()),
  ('${uuid(U.reportTemplate, 2)}', '${uuid(U.school, 1)}', 'Semester Lab Attendance Summary', 'attendance', '<div><h1>Attendance Record</h1><p>Class: {{class_name}}</p></div>', '<header>Delhi Public School</header>', '<footer>Confidential</footer>', true, NOW())
ON CONFLICT (id) DO NOTHING;
`);

// 89. generated_reports (2 rows)
sqlParts.push(`-- 89. generated_reports
INSERT INTO generated_reports (id, template_id, generated_by, file_url, parameters, generated_at)
VALUES 
  ('${uuid(U.generatedReport, 1)}', '${uuid(U.reportTemplate, 1)}', '${uuid(U.user, 3)}', 'https://cdn.example.com/reports/term1_progress_aarav.pdf', '{"student_id": "${uuid(U.user, 5)}", "term": 1}'::jsonb, NOW()),
  ('${uuid(U.generatedReport, 2)}', '${uuid(U.reportTemplate, 2)}', '${uuid(U.user, 4)}', 'https://cdn.example.com/reports/lab_attendance_11a.pdf', '{"class_id": "${uuid(U.class, 1)}"}'::jsonb, NOW())
ON CONFLICT (id) DO NOTHING;
`);

const finalSql = sqlParts.join('\n');
const outputPath = path.resolve(__dirname, '../database/seed_all_tables.sql');
fs.writeFileSync(outputPath, finalSql, 'utf8');
console.log('Successfully generated ' + outputPath + ' (' + finalSql.length + ' bytes, ' + sqlParts.length + ' sections)');
