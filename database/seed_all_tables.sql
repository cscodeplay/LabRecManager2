-- =============================================================================
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

-- 1. schools
INSERT INTO schools (id, name, name_hindi, code, address, state, district, board_affiliation, primary_language, secondary_languages, academic_year_start, email, phone1, pin_code, created_at, updated_at)
VALUES 
  ('00000001-0000-0000-0000-000000000001', 'Delhi Public School', 'दिल्ली पब्लिक स्कूल', 'DPS001', '123 Mathura Road, New Delhi', 'Delhi', 'South Delhi', 'CBSE', 'en', ARRAY['hi'], 4, 'info@dps.edu', '011-23456789', '110003', NOW(), NOW()),
  ('00000001-0000-0000-0000-000000000002', 'St. Xavier International School', 'सेंट जेवियर्स इंटरनेशनल स्कूल', 'STX002', '45 Park Street, Kolkata', 'West Bengal', 'Kolkata', 'ICSE', 'en', ARRAY['hi', 'bn'], 4, 'contact@stx.edu', '033-98765432', '700016', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. academic_years
INSERT INTO academic_years (id, school_id, year_label, start_date, end_date, is_current, created_at)
VALUES 
  ('00000002-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', '2024-2025', '2024-04-01', '2025-03-31', false, NOW()),
  ('00000002-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', '2025-2026', '2025-04-01', '2026-03-31', true, NOW()),
  ('00000002-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000002', '2024-2025', '2024-04-01', '2025-03-31', false, NOW()),
  ('00000002-0000-0000-0000-000000000004', '00000001-0000-0000-0000-000000000002', '2025-2026', '2025-04-01', '2026-03-31', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 3. users
INSERT INTO users (id, school_id, email, password_hash, role, first_name, first_name_hindi, last_name, last_name_hindi, employee_id, admission_number, student_id, gender, is_active, created_at, updated_at)
VALUES 
  ('00000003-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'admin@dps.edu', '$2b$10$1qU0Hx9rCMyvrpOPpPPyzOab9p5PspOc6K4lGhdb6QB.N406LY13G', 'admin', 'Ramesh', 'रमेश', 'Sharma', 'शर्मा', 'EMP-ADM-01', NULL, NULL, 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'principal@dps.edu', '$2b$10$1qU0Hx9rCMyvrpOPpPPyzOab9p5PspOc6K4lGhdb6QB.N406LY13G', 'principal', 'Sunita', 'सुनीता', 'Verma', 'वर्मा', 'EMP-PRN-01', NULL, NULL, 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'instructor1@dps.edu', '$2b$10$Nj1cC.7GrSBxROxUD3AJ5eA5L/nI0VXtJLvAbXk5Wu3TYpK.BulQq', 'instructor', 'Rajesh', 'राजेश', 'Kumar', 'कुमार', 'EMP-INS-01', NULL, NULL, 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000004', '00000001-0000-0000-0000-000000000001', 'instructor2@dps.edu', '$2b$10$Nj1cC.7GrSBxROxUD3AJ5eA5L/nI0VXtJLvAbXk5Wu3TYpK.BulQq', 'instructor', 'Priya', 'प्रिया', 'Singh', 'सिंह', 'EMP-INS-02', NULL, NULL, 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000005', '00000001-0000-0000-0000-000000000001', 'student1@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aarav', 'आरव', 'Patel', 'पटेल', NULL, 'ADM-2025-001', 'STU-001', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000006', '00000001-0000-0000-0000-000000000001', 'student2@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sneha', 'स्नेहा', 'Reddy', 'रेड्डी', NULL, 'ADM-2025-002', 'STU-002', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000007', '00000001-0000-0000-0000-000000000001', 'accountant@dps.edu', '$2b$10$1qU0Hx9rCMyvrpOPpPPyzOab9p5PspOc6K4lGhdb6QB.N406LY13G', 'accountant', 'Manoj', 'मनोज', 'Gupta', 'गुप्ता', 'EMP-ACC-01', NULL, NULL, 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000008', '00000001-0000-0000-0000-000000000001', 'labasst@dps.edu', '$2b$10$1qU0Hx9rCMyvrpOPpPPyzOab9p5PspOc6K4lGhdb6QB.N406LY13G', 'lab_assistant', 'Vikas', 'विकास', 'Yadav', 'यादव', 'EMP-LAB-01', NULL, NULL, 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000009', '00000001-0000-0000-0000-000000000002', 'admin@stx.edu', '$2b$10$1qU0Hx9rCMyvrpOPpPPyzOab9p5PspOc6K4lGhdb6QB.N406LY13G', 'admin', 'Father', 'फादर', 'Joseph', 'जोसेफ', 'EMP-STX-01', NULL, NULL, 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000000a', '00000001-0000-0000-0000-000000000001', 'ananya.sharma.11nma.001@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ananya', 'अनन्या', 'Sharma', 'शर्मा', NULL, 'ADM-2025-11NMA-001', 'STU-2025-11NMA-001', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000000b', '00000001-0000-0000-0000-000000000001', 'diya.patel.11nma.002@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Diya', 'दिया', 'Patel', 'पटेल', NULL, 'ADM-2025-11NMA-002', 'STU-2025-11NMA-002', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000000c', '00000001-0000-0000-0000-000000000001', 'ishita.gupta.11nma.003@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ishita', 'इशिता', 'Gupta', 'गुप्ता', NULL, 'ADM-2025-11NMA-003', 'STU-2025-11NMA-003', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000000d', '00000001-0000-0000-0000-000000000001', 'riya.singh.11nma.004@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Riya', 'रिया', 'Singh', 'सिंह', NULL, 'ADM-2025-11NMA-004', 'STU-2025-11NMA-004', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000000e', '00000001-0000-0000-0000-000000000001', 'sneha.reddy.11nma.005@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sneha', 'स्नेहा', 'Reddy', 'रेड्डी', NULL, 'ADM-2025-11NMA-005', 'STU-2025-11NMA-005', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000000f', '00000001-0000-0000-0000-000000000001', 'pooja.verma.11nma.006@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Pooja', 'पूजा', 'Verma', 'वर्मा', NULL, 'ADM-2025-11NMA-006', 'STU-2025-11NMA-006', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000010', '00000001-0000-0000-0000-000000000001', 'simran.kaur.11nma.007@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Simran', 'सिमरन', 'Kaur', 'कौर', NULL, 'ADM-2025-11NMA-007', 'STU-2025-11NMA-007', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000011', '00000001-0000-0000-0000-000000000001', 'tanvi.joshi.11nma.008@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Tanvi', 'तन्वी', 'Joshi', 'जोशी', NULL, 'ADM-2025-11NMA-008', 'STU-2025-11NMA-008', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000012', '00000001-0000-0000-0000-000000000001', 'kavya.nair.11nma.009@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kavya', 'काव्या', 'Nair', 'नायर', NULL, 'ADM-2025-11NMA-009', 'STU-2025-11NMA-009', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000013', '00000001-0000-0000-0000-000000000001', 'meera.iyer.11nma.010@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Meera', 'मीरा', 'Iyer', 'अय्यर', NULL, 'ADM-2025-11NMA-010', 'STU-2025-11NMA-010', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000014', '00000001-0000-0000-0000-000000000001', 'shreya.sen.11nma.011@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Shreya', 'श्रेया', 'Sen', 'सेन', NULL, 'ADM-2025-11NMA-011', 'STU-2025-11NMA-011', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000015', '00000001-0000-0000-0000-000000000001', 'neha.bhatia.11nma.012@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Neha', 'नेहा', 'Bhatia', 'भाटिया', NULL, 'ADM-2025-11NMA-012', 'STU-2025-11NMA-012', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000016', '00000001-0000-0000-0000-000000000001', 'aditi.rao.11nma.013@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aditi', 'अदिति', 'Rao', 'राव', NULL, 'ADM-2025-11NMA-013', 'STU-2025-11NMA-013', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000017', '00000001-0000-0000-0000-000000000001', 'priyanka.das.11nma.014@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Priyanka', 'प्रियंका', 'Das', 'दास', NULL, 'ADM-2025-11NMA-014', 'STU-2025-11NMA-014', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000018', '00000001-0000-0000-0000-000000000001', 'khushi.mehta.11nma.015@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Khushi', 'खुशी', 'Mehta', 'मेहता', NULL, 'ADM-2025-11NMA-015', 'STU-2025-11NMA-015', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000019', '00000001-0000-0000-0000-000000000001', 'roshni.saxena.11nma.016@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Roshni', 'रोशनी', 'Saxena', 'सक्सेना', NULL, 'ADM-2025-11NMA-016', 'STU-2025-11NMA-016', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000001a', '00000001-0000-0000-0000-000000000001', 'navya.choudhary.11nma.017@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Navya', 'नव्या', 'Choudhary', 'चौधरी', NULL, 'ADM-2025-11NMA-017', 'STU-2025-11NMA-017', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000001b', '00000001-0000-0000-0000-000000000001', 'mansi.agarwal.11nma.018@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Mansi', 'मानसी', 'Agarwal', 'अग्रवाल', NULL, 'ADM-2025-11NMA-018', 'STU-2025-11NMA-018', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000001c', '00000001-0000-0000-0000-000000000001', 'jaspreet.kaur.11nma.019@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Jaspreet', 'जसप्रीत', 'Kaur', 'कौर', NULL, 'ADM-2025-11NMA-019', 'STU-2025-11NMA-019', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000001d', '00000001-0000-0000-0000-000000000001', 'harleen.kaur.11nma.020@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Harleen', 'हरलीन', 'Kaur', 'कौर', NULL, 'ADM-2025-11NMA-020', 'STU-2025-11NMA-020', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000001e', '00000001-0000-0000-0000-000000000001', 'avani.deshmukh.11nma.021@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Avani', 'अवनी', 'Deshmukh', 'देशमुख', NULL, 'ADM-2025-11NMA-021', 'STU-2025-11NMA-021', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000001f', '00000001-0000-0000-0000-000000000001', 'bhavya.trivedi.11nma.022@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Bhavya', 'भव्या', 'Trivedi', 'त्रिवेदी', NULL, 'ADM-2025-11NMA-022', 'STU-2025-11NMA-022', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000020', '00000001-0000-0000-0000-000000000001', 'chhavi.singhania.11nma.023@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Chhavi', 'छवि', 'Singhania', 'सिंघानिया', NULL, 'ADM-2025-11NMA-023', 'STU-2025-11NMA-023', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000021', '00000001-0000-0000-0000-000000000001', 'drishti.malhotra.11nma.024@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Drishti', 'दृष्टि', 'Malhotra', 'मल्होत्रा', NULL, 'ADM-2025-11NMA-024', 'STU-2025-11NMA-024', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000022', '00000001-0000-0000-0000-000000000001', 'esha.pillai.11nma.025@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Esha', 'ईशा', 'Pillai', 'पिल्लई', NULL, 'ADM-2025-11NMA-025', 'STU-2025-11NMA-025', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000023', '00000001-0000-0000-0000-000000000001', 'gargi.mukherjee.11nma.026@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Gargi', 'गार्गी', 'Mukherjee', 'मुखर्जी', NULL, 'ADM-2025-11NMA-026', 'STU-2025-11NMA-026', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000024', '00000001-0000-0000-0000-000000000001', 'ishani.banerjee.11nma.027@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ishani', 'ईशानी', 'Banerjee', 'बनर्जी', NULL, 'ADM-2025-11NMA-027', 'STU-2025-11NMA-027', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000025', '00000001-0000-0000-0000-000000000001', 'jiya.kulkarni.11nma.028@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Jiya', 'जिया', 'Kulkarni', 'कुलकर्णी', NULL, 'ADM-2025-11NMA-028', 'STU-2025-11NMA-028', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000026', '00000001-0000-0000-0000-000000000001', 'kriti.menon.11nma.029@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kriti', 'कृति', 'Menon', 'मेनन', NULL, 'ADM-2025-11NMA-029', 'STU-2025-11NMA-029', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000027', '00000001-0000-0000-0000-000000000001', 'lavanya.jain.11nma.030@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Lavanya', 'लावण्या', 'Jain', 'जैन', NULL, 'ADM-2025-11NMA-030', 'STU-2025-11NMA-030', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000028', '00000001-0000-0000-0000-000000000001', 'aarav.sharma.11nma.031@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aarav', 'आरव', 'Sharma', 'शर्मा', NULL, 'ADM-2025-11NMA-031', 'STU-2025-11NMA-031', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000029', '00000001-0000-0000-0000-000000000001', 'rohan.verma.11nma.032@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Rohan', 'रोहन', 'Verma', 'वर्मा', NULL, 'ADM-2025-11NMA-032', 'STU-2025-11NMA-032', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000002a', '00000001-0000-0000-0000-000000000001', 'kabir.mehta.11nma.033@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kabir', 'कबीर', 'Mehta', 'मेहता', NULL, 'ADM-2025-11NMA-033', 'STU-2025-11NMA-033', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000002b', '00000001-0000-0000-0000-000000000001', 'vikram.malhotra.11nma.034@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Vikram', 'विक्रम', 'Malhotra', 'मल्होत्रा', NULL, 'ADM-2025-11NMA-034', 'STU-2025-11NMA-034', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000002c', '00000001-0000-0000-0000-000000000001', 'aditya.singh.11nma.035@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aditya', 'आदित्य', 'Singh', 'सिंह', NULL, 'ADM-2025-11NMA-035', 'STU-2025-11NMA-035', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000002d', '00000001-0000-0000-0000-000000000001', 'manpreet.singh.11nma.036@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Manpreet', 'मनप्रीत', 'Singh', 'सिंह', NULL, 'ADM-2025-11NMA-036', 'STU-2025-11NMA-036', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000002e', '00000001-0000-0000-0000-000000000001', 'gurpreet.singh.11nma.037@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Gurpreet', 'गुरप्रीत', 'Singh', 'सिंह', NULL, 'ADM-2025-11NMA-037', 'STU-2025-11NMA-037', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000002f', '00000001-0000-0000-0000-000000000001', 'aryan.kapoor.11nma.038@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aryan', 'आर्यन', 'Kapoor', 'कपूर', NULL, 'ADM-2025-11NMA-038', 'STU-2025-11NMA-038', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000030', '00000001-0000-0000-0000-000000000001', 'karan.johar.11nma.039@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Karan', 'करण', 'Johar', 'जौहर', NULL, 'ADM-2025-11NMA-039', 'STU-2025-11NMA-039', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000031', '00000001-0000-0000-0000-000000000001', 'yash.khanna.11nma.040@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Yash', 'यश', 'Khanna', 'खन्ना', NULL, 'ADM-2025-11NMA-040', 'STU-2025-11NMA-040', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000032', '00000001-0000-0000-0000-000000000001', 'rahul.gupta.11nma.041@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Rahul', 'राहुल', 'Gupta', 'गुप्ता', NULL, 'ADM-2025-11NMA-041', 'STU-2025-11NMA-041', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000033', '00000001-0000-0000-0000-000000000001', 'arjun.nair.11nma.042@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Arjun', 'अर्जुन', 'Nair', 'नायर', NULL, 'ADM-2025-11NMA-042', 'STU-2025-11NMA-042', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000034', '00000001-0000-0000-0000-000000000001', 'dev.patel.11nma.043@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Dev', 'देव', 'Patel', 'पटेल', NULL, 'ADM-2025-11NMA-043', 'STU-2025-11NMA-043', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000035', '00000001-0000-0000-0000-000000000001', 'kunal.bhatia.11nma.044@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kunal', 'कुणाल', 'Bhatia', 'भाटिया', NULL, 'ADM-2025-11NMA-044', 'STU-2025-11NMA-044', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000036', '00000001-0000-0000-0000-000000000001', 'sahil.sethi.11nma.045@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sahil', 'साहिल', 'Sethi', 'सेठी', NULL, 'ADM-2025-11NMA-045', 'STU-2025-11NMA-045', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000037', '00000001-0000-0000-0000-000000000001', 'pranav.joshi.11nma.046@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Pranav', 'प्रणव', 'Joshi', 'जोशी', NULL, 'ADM-2025-11NMA-046', 'STU-2025-11NMA-046', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000038', '00000001-0000-0000-0000-000000000001', 'varun.dhawan.11nma.047@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Varun', 'वरुण', 'Dhawan', 'धवन', NULL, 'ADM-2025-11NMA-047', 'STU-2025-11NMA-047', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000039', '00000001-0000-0000-0000-000000000001', 'siddharth.roy.11nma.048@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Siddharth', 'सिद्धार्थ', 'Roy', 'रॉय', NULL, 'ADM-2025-11NMA-048', 'STU-2025-11NMA-048', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000003a', '00000001-0000-0000-0000-000000000001', 'harshit.bansal.11nma.049@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Harshit', 'हर्षित', 'Bansal', 'बंसल', NULL, 'ADM-2025-11NMA-049', 'STU-2025-11NMA-049', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000003b', '00000001-0000-0000-0000-000000000001', 'ritvik.soni.11nma.050@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ritvik', 'ऋत्विक', 'Soni', 'सोनी', NULL, 'ADM-2025-11NMA-050', 'STU-2025-11NMA-050', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000003c', '00000001-0000-0000-0000-000000000001', 'ananya.sharma.11nmb.001@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ananya', 'अनन्या', 'Sharma', 'शर्मा', NULL, 'ADM-2025-11NMB-001', 'STU-2025-11NMB-001', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000003d', '00000001-0000-0000-0000-000000000001', 'diya.patel.11nmb.002@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Diya', 'दिया', 'Patel', 'पटेल', NULL, 'ADM-2025-11NMB-002', 'STU-2025-11NMB-002', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000003e', '00000001-0000-0000-0000-000000000001', 'ishita.gupta.11nmb.003@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ishita', 'इशिता', 'Gupta', 'गुप्ता', NULL, 'ADM-2025-11NMB-003', 'STU-2025-11NMB-003', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000003f', '00000001-0000-0000-0000-000000000001', 'riya.singh.11nmb.004@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Riya', 'रिया', 'Singh', 'सिंह', NULL, 'ADM-2025-11NMB-004', 'STU-2025-11NMB-004', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000040', '00000001-0000-0000-0000-000000000001', 'sneha.reddy.11nmb.005@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sneha', 'स्नेहा', 'Reddy', 'रेड्डी', NULL, 'ADM-2025-11NMB-005', 'STU-2025-11NMB-005', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000041', '00000001-0000-0000-0000-000000000001', 'pooja.verma.11nmb.006@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Pooja', 'पूजा', 'Verma', 'वर्मा', NULL, 'ADM-2025-11NMB-006', 'STU-2025-11NMB-006', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000042', '00000001-0000-0000-0000-000000000001', 'simran.kaur.11nmb.007@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Simran', 'सिमरन', 'Kaur', 'कौर', NULL, 'ADM-2025-11NMB-007', 'STU-2025-11NMB-007', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000043', '00000001-0000-0000-0000-000000000001', 'tanvi.joshi.11nmb.008@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Tanvi', 'तन्वी', 'Joshi', 'जोशी', NULL, 'ADM-2025-11NMB-008', 'STU-2025-11NMB-008', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000044', '00000001-0000-0000-0000-000000000001', 'kavya.nair.11nmb.009@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kavya', 'काव्या', 'Nair', 'नायर', NULL, 'ADM-2025-11NMB-009', 'STU-2025-11NMB-009', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000045', '00000001-0000-0000-0000-000000000001', 'meera.iyer.11nmb.010@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Meera', 'मीरा', 'Iyer', 'अय्यर', NULL, 'ADM-2025-11NMB-010', 'STU-2025-11NMB-010', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000046', '00000001-0000-0000-0000-000000000001', 'shreya.sen.11nmb.011@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Shreya', 'श्रेया', 'Sen', 'सेन', NULL, 'ADM-2025-11NMB-011', 'STU-2025-11NMB-011', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000047', '00000001-0000-0000-0000-000000000001', 'neha.bhatia.11nmb.012@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Neha', 'नेहा', 'Bhatia', 'भाटिया', NULL, 'ADM-2025-11NMB-012', 'STU-2025-11NMB-012', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000048', '00000001-0000-0000-0000-000000000001', 'aditi.rao.11nmb.013@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aditi', 'अदिति', 'Rao', 'राव', NULL, 'ADM-2025-11NMB-013', 'STU-2025-11NMB-013', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000049', '00000001-0000-0000-0000-000000000001', 'priyanka.das.11nmb.014@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Priyanka', 'प्रियंका', 'Das', 'दास', NULL, 'ADM-2025-11NMB-014', 'STU-2025-11NMB-014', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000004a', '00000001-0000-0000-0000-000000000001', 'khushi.mehta.11nmb.015@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Khushi', 'खुशी', 'Mehta', 'मेहता', NULL, 'ADM-2025-11NMB-015', 'STU-2025-11NMB-015', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000004b', '00000001-0000-0000-0000-000000000001', 'roshni.saxena.11nmb.016@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Roshni', 'रोशनी', 'Saxena', 'सक्सेना', NULL, 'ADM-2025-11NMB-016', 'STU-2025-11NMB-016', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000004c', '00000001-0000-0000-0000-000000000001', 'navya.choudhary.11nmb.017@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Navya', 'नव्या', 'Choudhary', 'चौधरी', NULL, 'ADM-2025-11NMB-017', 'STU-2025-11NMB-017', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000004d', '00000001-0000-0000-0000-000000000001', 'mansi.agarwal.11nmb.018@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Mansi', 'मानसी', 'Agarwal', 'अग्रवाल', NULL, 'ADM-2025-11NMB-018', 'STU-2025-11NMB-018', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000004e', '00000001-0000-0000-0000-000000000001', 'jaspreet.kaur.11nmb.019@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Jaspreet', 'जसप्रीत', 'Kaur', 'कौर', NULL, 'ADM-2025-11NMB-019', 'STU-2025-11NMB-019', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000004f', '00000001-0000-0000-0000-000000000001', 'harleen.kaur.11nmb.020@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Harleen', 'हरलीन', 'Kaur', 'कौर', NULL, 'ADM-2025-11NMB-020', 'STU-2025-11NMB-020', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000050', '00000001-0000-0000-0000-000000000001', 'avani.deshmukh.11nmb.021@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Avani', 'अवनी', 'Deshmukh', 'देशमुख', NULL, 'ADM-2025-11NMB-021', 'STU-2025-11NMB-021', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000051', '00000001-0000-0000-0000-000000000001', 'bhavya.trivedi.11nmb.022@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Bhavya', 'भव्या', 'Trivedi', 'त्रिवेदी', NULL, 'ADM-2025-11NMB-022', 'STU-2025-11NMB-022', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000052', '00000001-0000-0000-0000-000000000001', 'chhavi.singhania.11nmb.023@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Chhavi', 'छवि', 'Singhania', 'सिंघानिया', NULL, 'ADM-2025-11NMB-023', 'STU-2025-11NMB-023', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000053', '00000001-0000-0000-0000-000000000001', 'drishti.malhotra.11nmb.024@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Drishti', 'दृष्टि', 'Malhotra', 'मल्होत्रा', NULL, 'ADM-2025-11NMB-024', 'STU-2025-11NMB-024', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000054', '00000001-0000-0000-0000-000000000001', 'esha.pillai.11nmb.025@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Esha', 'ईशा', 'Pillai', 'पिल्लई', NULL, 'ADM-2025-11NMB-025', 'STU-2025-11NMB-025', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000055', '00000001-0000-0000-0000-000000000001', 'gargi.mukherjee.11nmb.026@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Gargi', 'गार्गी', 'Mukherjee', 'मुखर्जी', NULL, 'ADM-2025-11NMB-026', 'STU-2025-11NMB-026', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000056', '00000001-0000-0000-0000-000000000001', 'ishani.banerjee.11nmb.027@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ishani', 'ईशानी', 'Banerjee', 'बनर्जी', NULL, 'ADM-2025-11NMB-027', 'STU-2025-11NMB-027', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000057', '00000001-0000-0000-0000-000000000001', 'jiya.kulkarni.11nmb.028@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Jiya', 'जिया', 'Kulkarni', 'कुलकर्णी', NULL, 'ADM-2025-11NMB-028', 'STU-2025-11NMB-028', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000058', '00000001-0000-0000-0000-000000000001', 'kriti.menon.11nmb.029@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kriti', 'कृति', 'Menon', 'मेनन', NULL, 'ADM-2025-11NMB-029', 'STU-2025-11NMB-029', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000059', '00000001-0000-0000-0000-000000000001', 'lavanya.jain.11nmb.030@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Lavanya', 'लावण्या', 'Jain', 'जैन', NULL, 'ADM-2025-11NMB-030', 'STU-2025-11NMB-030', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000005a', '00000001-0000-0000-0000-000000000001', 'aarav.sharma.11nmb.031@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aarav', 'आरव', 'Sharma', 'शर्मा', NULL, 'ADM-2025-11NMB-031', 'STU-2025-11NMB-031', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000005b', '00000001-0000-0000-0000-000000000001', 'rohan.verma.11nmb.032@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Rohan', 'रोहन', 'Verma', 'वर्मा', NULL, 'ADM-2025-11NMB-032', 'STU-2025-11NMB-032', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000005c', '00000001-0000-0000-0000-000000000001', 'kabir.mehta.11nmb.033@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kabir', 'कबीर', 'Mehta', 'मेहता', NULL, 'ADM-2025-11NMB-033', 'STU-2025-11NMB-033', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000005d', '00000001-0000-0000-0000-000000000001', 'vikram.malhotra.11nmb.034@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Vikram', 'विक्रम', 'Malhotra', 'मल्होत्रा', NULL, 'ADM-2025-11NMB-034', 'STU-2025-11NMB-034', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000005e', '00000001-0000-0000-0000-000000000001', 'aditya.singh.11nmb.035@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aditya', 'आदित्य', 'Singh', 'सिंह', NULL, 'ADM-2025-11NMB-035', 'STU-2025-11NMB-035', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000005f', '00000001-0000-0000-0000-000000000001', 'manpreet.singh.11nmb.036@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Manpreet', 'मनप्रीत', 'Singh', 'सिंह', NULL, 'ADM-2025-11NMB-036', 'STU-2025-11NMB-036', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000060', '00000001-0000-0000-0000-000000000001', 'gurpreet.singh.11nmb.037@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Gurpreet', 'गुरप्रीत', 'Singh', 'सिंह', NULL, 'ADM-2025-11NMB-037', 'STU-2025-11NMB-037', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000061', '00000001-0000-0000-0000-000000000001', 'aryan.kapoor.11nmb.038@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aryan', 'आर्यन', 'Kapoor', 'कपूर', NULL, 'ADM-2025-11NMB-038', 'STU-2025-11NMB-038', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000062', '00000001-0000-0000-0000-000000000001', 'karan.johar.11nmb.039@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Karan', 'करण', 'Johar', 'जौहर', NULL, 'ADM-2025-11NMB-039', 'STU-2025-11NMB-039', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000063', '00000001-0000-0000-0000-000000000001', 'yash.khanna.11nmb.040@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Yash', 'यश', 'Khanna', 'खन्ना', NULL, 'ADM-2025-11NMB-040', 'STU-2025-11NMB-040', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000064', '00000001-0000-0000-0000-000000000001', 'rahul.gupta.11nmb.041@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Rahul', 'राहुल', 'Gupta', 'गुप्ता', NULL, 'ADM-2025-11NMB-041', 'STU-2025-11NMB-041', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000065', '00000001-0000-0000-0000-000000000001', 'arjun.nair.11nmb.042@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Arjun', 'अर्जुन', 'Nair', 'नायर', NULL, 'ADM-2025-11NMB-042', 'STU-2025-11NMB-042', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000066', '00000001-0000-0000-0000-000000000001', 'dev.patel.11nmb.043@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Dev', 'देव', 'Patel', 'पटेल', NULL, 'ADM-2025-11NMB-043', 'STU-2025-11NMB-043', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000067', '00000001-0000-0000-0000-000000000001', 'kunal.bhatia.11nmb.044@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kunal', 'कुणाल', 'Bhatia', 'भाटिया', NULL, 'ADM-2025-11NMB-044', 'STU-2025-11NMB-044', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000068', '00000001-0000-0000-0000-000000000001', 'sahil.sethi.11nmb.045@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sahil', 'साहिल', 'Sethi', 'सेठी', NULL, 'ADM-2025-11NMB-045', 'STU-2025-11NMB-045', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000069', '00000001-0000-0000-0000-000000000001', 'pranav.joshi.11nmb.046@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Pranav', 'प्रणव', 'Joshi', 'जोशी', NULL, 'ADM-2025-11NMB-046', 'STU-2025-11NMB-046', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000006a', '00000001-0000-0000-0000-000000000001', 'varun.dhawan.11nmb.047@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Varun', 'वरुण', 'Dhawan', 'धवन', NULL, 'ADM-2025-11NMB-047', 'STU-2025-11NMB-047', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000006b', '00000001-0000-0000-0000-000000000001', 'siddharth.roy.11nmb.048@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Siddharth', 'सिद्धार्थ', 'Roy', 'रॉय', NULL, 'ADM-2025-11NMB-048', 'STU-2025-11NMB-048', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000006c', '00000001-0000-0000-0000-000000000001', 'harshit.bansal.11nmb.049@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Harshit', 'हर्षित', 'Bansal', 'बंसल', NULL, 'ADM-2025-11NMB-049', 'STU-2025-11NMB-049', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000006d', '00000001-0000-0000-0000-000000000001', 'ritvik.soni.11nmb.050@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ritvik', 'ऋत्विक', 'Soni', 'सोनी', NULL, 'ADM-2025-11NMB-050', 'STU-2025-11NMB-050', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000006e', '00000001-0000-0000-0000-000000000001', 'ananya.sharma.11meda.001@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ananya', 'अनन्या', 'Sharma', 'शर्मा', NULL, 'ADM-2025-11MEDA-001', 'STU-2025-11MEDA-001', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000006f', '00000001-0000-0000-0000-000000000001', 'diya.patel.11meda.002@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Diya', 'दिया', 'Patel', 'पटेल', NULL, 'ADM-2025-11MEDA-002', 'STU-2025-11MEDA-002', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000070', '00000001-0000-0000-0000-000000000001', 'ishita.gupta.11meda.003@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ishita', 'इशिता', 'Gupta', 'गुप्ता', NULL, 'ADM-2025-11MEDA-003', 'STU-2025-11MEDA-003', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000071', '00000001-0000-0000-0000-000000000001', 'riya.singh.11meda.004@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Riya', 'रिया', 'Singh', 'सिंह', NULL, 'ADM-2025-11MEDA-004', 'STU-2025-11MEDA-004', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000072', '00000001-0000-0000-0000-000000000001', 'sneha.reddy.11meda.005@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sneha', 'स्नेहा', 'Reddy', 'रेड्डी', NULL, 'ADM-2025-11MEDA-005', 'STU-2025-11MEDA-005', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000073', '00000001-0000-0000-0000-000000000001', 'pooja.verma.11meda.006@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Pooja', 'पूजा', 'Verma', 'वर्मा', NULL, 'ADM-2025-11MEDA-006', 'STU-2025-11MEDA-006', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000074', '00000001-0000-0000-0000-000000000001', 'simran.kaur.11meda.007@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Simran', 'सिमरन', 'Kaur', 'कौर', NULL, 'ADM-2025-11MEDA-007', 'STU-2025-11MEDA-007', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000075', '00000001-0000-0000-0000-000000000001', 'tanvi.joshi.11meda.008@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Tanvi', 'तन्वी', 'Joshi', 'जोशी', NULL, 'ADM-2025-11MEDA-008', 'STU-2025-11MEDA-008', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000076', '00000001-0000-0000-0000-000000000001', 'kavya.nair.11meda.009@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kavya', 'काव्या', 'Nair', 'नायर', NULL, 'ADM-2025-11MEDA-009', 'STU-2025-11MEDA-009', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000077', '00000001-0000-0000-0000-000000000001', 'meera.iyer.11meda.010@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Meera', 'मीरा', 'Iyer', 'अय्यर', NULL, 'ADM-2025-11MEDA-010', 'STU-2025-11MEDA-010', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000078', '00000001-0000-0000-0000-000000000001', 'shreya.sen.11meda.011@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Shreya', 'श्रेया', 'Sen', 'सेन', NULL, 'ADM-2025-11MEDA-011', 'STU-2025-11MEDA-011', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000079', '00000001-0000-0000-0000-000000000001', 'neha.bhatia.11meda.012@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Neha', 'नेहा', 'Bhatia', 'भाटिया', NULL, 'ADM-2025-11MEDA-012', 'STU-2025-11MEDA-012', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000007a', '00000001-0000-0000-0000-000000000001', 'aditi.rao.11meda.013@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aditi', 'अदिति', 'Rao', 'राव', NULL, 'ADM-2025-11MEDA-013', 'STU-2025-11MEDA-013', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000007b', '00000001-0000-0000-0000-000000000001', 'priyanka.das.11meda.014@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Priyanka', 'प्रियंका', 'Das', 'दास', NULL, 'ADM-2025-11MEDA-014', 'STU-2025-11MEDA-014', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000007c', '00000001-0000-0000-0000-000000000001', 'khushi.mehta.11meda.015@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Khushi', 'खुशी', 'Mehta', 'मेहता', NULL, 'ADM-2025-11MEDA-015', 'STU-2025-11MEDA-015', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000007d', '00000001-0000-0000-0000-000000000001', 'roshni.saxena.11meda.016@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Roshni', 'रोशनी', 'Saxena', 'सक्सेना', NULL, 'ADM-2025-11MEDA-016', 'STU-2025-11MEDA-016', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000007e', '00000001-0000-0000-0000-000000000001', 'navya.choudhary.11meda.017@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Navya', 'नव्या', 'Choudhary', 'चौधरी', NULL, 'ADM-2025-11MEDA-017', 'STU-2025-11MEDA-017', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000007f', '00000001-0000-0000-0000-000000000001', 'mansi.agarwal.11meda.018@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Mansi', 'मानसी', 'Agarwal', 'अग्रवाल', NULL, 'ADM-2025-11MEDA-018', 'STU-2025-11MEDA-018', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000080', '00000001-0000-0000-0000-000000000001', 'jaspreet.kaur.11meda.019@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Jaspreet', 'जसप्रीत', 'Kaur', 'कौर', NULL, 'ADM-2025-11MEDA-019', 'STU-2025-11MEDA-019', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000081', '00000001-0000-0000-0000-000000000001', 'harleen.kaur.11meda.020@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Harleen', 'हरलीन', 'Kaur', 'कौर', NULL, 'ADM-2025-11MEDA-020', 'STU-2025-11MEDA-020', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000082', '00000001-0000-0000-0000-000000000001', 'avani.deshmukh.11meda.021@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Avani', 'अवनी', 'Deshmukh', 'देशमुख', NULL, 'ADM-2025-11MEDA-021', 'STU-2025-11MEDA-021', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000083', '00000001-0000-0000-0000-000000000001', 'bhavya.trivedi.11meda.022@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Bhavya', 'भव्या', 'Trivedi', 'त्रिवेदी', NULL, 'ADM-2025-11MEDA-022', 'STU-2025-11MEDA-022', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000084', '00000001-0000-0000-0000-000000000001', 'chhavi.singhania.11meda.023@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Chhavi', 'छवि', 'Singhania', 'सिंघानिया', NULL, 'ADM-2025-11MEDA-023', 'STU-2025-11MEDA-023', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000085', '00000001-0000-0000-0000-000000000001', 'drishti.malhotra.11meda.024@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Drishti', 'दृष्टि', 'Malhotra', 'मल्होत्रा', NULL, 'ADM-2025-11MEDA-024', 'STU-2025-11MEDA-024', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000086', '00000001-0000-0000-0000-000000000001', 'esha.pillai.11meda.025@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Esha', 'ईशा', 'Pillai', 'पिल्लई', NULL, 'ADM-2025-11MEDA-025', 'STU-2025-11MEDA-025', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000087', '00000001-0000-0000-0000-000000000001', 'gargi.mukherjee.11meda.026@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Gargi', 'गार्गी', 'Mukherjee', 'मुखर्जी', NULL, 'ADM-2025-11MEDA-026', 'STU-2025-11MEDA-026', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000088', '00000001-0000-0000-0000-000000000001', 'ishani.banerjee.11meda.027@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ishani', 'ईशानी', 'Banerjee', 'बनर्जी', NULL, 'ADM-2025-11MEDA-027', 'STU-2025-11MEDA-027', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000089', '00000001-0000-0000-0000-000000000001', 'jiya.kulkarni.11meda.028@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Jiya', 'जिया', 'Kulkarni', 'कुलकर्णी', NULL, 'ADM-2025-11MEDA-028', 'STU-2025-11MEDA-028', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000008a', '00000001-0000-0000-0000-000000000001', 'kriti.menon.11meda.029@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kriti', 'कृति', 'Menon', 'मेनन', NULL, 'ADM-2025-11MEDA-029', 'STU-2025-11MEDA-029', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000008b', '00000001-0000-0000-0000-000000000001', 'lavanya.jain.11meda.030@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Lavanya', 'लावण्या', 'Jain', 'जैन', NULL, 'ADM-2025-11MEDA-030', 'STU-2025-11MEDA-030', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000008c', '00000001-0000-0000-0000-000000000001', 'aarav.sharma.11meda.031@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aarav', 'आरव', 'Sharma', 'शर्मा', NULL, 'ADM-2025-11MEDA-031', 'STU-2025-11MEDA-031', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000008d', '00000001-0000-0000-0000-000000000001', 'rohan.verma.11meda.032@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Rohan', 'रोहन', 'Verma', 'वर्मा', NULL, 'ADM-2025-11MEDA-032', 'STU-2025-11MEDA-032', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000008e', '00000001-0000-0000-0000-000000000001', 'kabir.mehta.11meda.033@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kabir', 'कबीर', 'Mehta', 'मेहता', NULL, 'ADM-2025-11MEDA-033', 'STU-2025-11MEDA-033', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000008f', '00000001-0000-0000-0000-000000000001', 'vikram.malhotra.11meda.034@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Vikram', 'विक्रम', 'Malhotra', 'मल्होत्रा', NULL, 'ADM-2025-11MEDA-034', 'STU-2025-11MEDA-034', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000090', '00000001-0000-0000-0000-000000000001', 'aditya.singh.11meda.035@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aditya', 'आदित्य', 'Singh', 'सिंह', NULL, 'ADM-2025-11MEDA-035', 'STU-2025-11MEDA-035', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000091', '00000001-0000-0000-0000-000000000001', 'manpreet.singh.11meda.036@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Manpreet', 'मनप्रीत', 'Singh', 'सिंह', NULL, 'ADM-2025-11MEDA-036', 'STU-2025-11MEDA-036', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000092', '00000001-0000-0000-0000-000000000001', 'gurpreet.singh.11meda.037@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Gurpreet', 'गुरप्रीत', 'Singh', 'सिंह', NULL, 'ADM-2025-11MEDA-037', 'STU-2025-11MEDA-037', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000093', '00000001-0000-0000-0000-000000000001', 'aryan.kapoor.11meda.038@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aryan', 'आर्यन', 'Kapoor', 'कपूर', NULL, 'ADM-2025-11MEDA-038', 'STU-2025-11MEDA-038', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000094', '00000001-0000-0000-0000-000000000001', 'karan.johar.11meda.039@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Karan', 'करण', 'Johar', 'जौहर', NULL, 'ADM-2025-11MEDA-039', 'STU-2025-11MEDA-039', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000095', '00000001-0000-0000-0000-000000000001', 'yash.khanna.11meda.040@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Yash', 'यश', 'Khanna', 'खन्ना', NULL, 'ADM-2025-11MEDA-040', 'STU-2025-11MEDA-040', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000096', '00000001-0000-0000-0000-000000000001', 'rahul.gupta.11meda.041@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Rahul', 'राहुल', 'Gupta', 'गुप्ता', NULL, 'ADM-2025-11MEDA-041', 'STU-2025-11MEDA-041', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000097', '00000001-0000-0000-0000-000000000001', 'arjun.nair.11meda.042@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Arjun', 'अर्जुन', 'Nair', 'नायर', NULL, 'ADM-2025-11MEDA-042', 'STU-2025-11MEDA-042', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000098', '00000001-0000-0000-0000-000000000001', 'dev.patel.11meda.043@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Dev', 'देव', 'Patel', 'पटेल', NULL, 'ADM-2025-11MEDA-043', 'STU-2025-11MEDA-043', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000099', '00000001-0000-0000-0000-000000000001', 'kunal.bhatia.11meda.044@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kunal', 'कुणाल', 'Bhatia', 'भाटिया', NULL, 'ADM-2025-11MEDA-044', 'STU-2025-11MEDA-044', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000009a', '00000001-0000-0000-0000-000000000001', 'sahil.sethi.11meda.045@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sahil', 'साहिल', 'Sethi', 'सेठी', NULL, 'ADM-2025-11MEDA-045', 'STU-2025-11MEDA-045', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000009b', '00000001-0000-0000-0000-000000000001', 'pranav.joshi.11meda.046@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Pranav', 'प्रणव', 'Joshi', 'जोशी', NULL, 'ADM-2025-11MEDA-046', 'STU-2025-11MEDA-046', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000009c', '00000001-0000-0000-0000-000000000001', 'varun.dhawan.11meda.047@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Varun', 'वरुण', 'Dhawan', 'धवन', NULL, 'ADM-2025-11MEDA-047', 'STU-2025-11MEDA-047', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000009d', '00000001-0000-0000-0000-000000000001', 'siddharth.roy.11meda.048@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Siddharth', 'सिद्धार्थ', 'Roy', 'रॉय', NULL, 'ADM-2025-11MEDA-048', 'STU-2025-11MEDA-048', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000009e', '00000001-0000-0000-0000-000000000001', 'harshit.bansal.11meda.049@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Harshit', 'हर्षित', 'Bansal', 'बंसल', NULL, 'ADM-2025-11MEDA-049', 'STU-2025-11MEDA-049', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000009f', '00000001-0000-0000-0000-000000000001', 'ritvik.soni.11meda.050@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ritvik', 'ऋत्विक', 'Soni', 'सोनी', NULL, 'ADM-2025-11MEDA-050', 'STU-2025-11MEDA-050', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000a0', '00000001-0000-0000-0000-000000000001', 'ananya.sharma.12nma.001@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ananya', 'अनन्या', 'Sharma', 'शर्मा', NULL, 'ADM-2025-12NMA-001', 'STU-2025-12NMA-001', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000a1', '00000001-0000-0000-0000-000000000001', 'diya.patel.12nma.002@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Diya', 'दिया', 'Patel', 'पटेल', NULL, 'ADM-2025-12NMA-002', 'STU-2025-12NMA-002', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000a2', '00000001-0000-0000-0000-000000000001', 'ishita.gupta.12nma.003@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ishita', 'इशिता', 'Gupta', 'गुप्ता', NULL, 'ADM-2025-12NMA-003', 'STU-2025-12NMA-003', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000a3', '00000001-0000-0000-0000-000000000001', 'riya.singh.12nma.004@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Riya', 'रिया', 'Singh', 'सिंह', NULL, 'ADM-2025-12NMA-004', 'STU-2025-12NMA-004', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000a4', '00000001-0000-0000-0000-000000000001', 'sneha.reddy.12nma.005@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sneha', 'स्नेहा', 'Reddy', 'रेड्डी', NULL, 'ADM-2025-12NMA-005', 'STU-2025-12NMA-005', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000a5', '00000001-0000-0000-0000-000000000001', 'pooja.verma.12nma.006@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Pooja', 'पूजा', 'Verma', 'वर्मा', NULL, 'ADM-2025-12NMA-006', 'STU-2025-12NMA-006', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000a6', '00000001-0000-0000-0000-000000000001', 'simran.kaur.12nma.007@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Simran', 'सिमरन', 'Kaur', 'कौर', NULL, 'ADM-2025-12NMA-007', 'STU-2025-12NMA-007', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000a7', '00000001-0000-0000-0000-000000000001', 'tanvi.joshi.12nma.008@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Tanvi', 'तन्वी', 'Joshi', 'जोशी', NULL, 'ADM-2025-12NMA-008', 'STU-2025-12NMA-008', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000a8', '00000001-0000-0000-0000-000000000001', 'kavya.nair.12nma.009@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kavya', 'काव्या', 'Nair', 'नायर', NULL, 'ADM-2025-12NMA-009', 'STU-2025-12NMA-009', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000a9', '00000001-0000-0000-0000-000000000001', 'meera.iyer.12nma.010@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Meera', 'मीरा', 'Iyer', 'अय्यर', NULL, 'ADM-2025-12NMA-010', 'STU-2025-12NMA-010', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000aa', '00000001-0000-0000-0000-000000000001', 'shreya.sen.12nma.011@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Shreya', 'श्रेया', 'Sen', 'सेन', NULL, 'ADM-2025-12NMA-011', 'STU-2025-12NMA-011', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000ab', '00000001-0000-0000-0000-000000000001', 'neha.bhatia.12nma.012@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Neha', 'नेहा', 'Bhatia', 'भाटिया', NULL, 'ADM-2025-12NMA-012', 'STU-2025-12NMA-012', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000ac', '00000001-0000-0000-0000-000000000001', 'aditi.rao.12nma.013@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aditi', 'अदिति', 'Rao', 'राव', NULL, 'ADM-2025-12NMA-013', 'STU-2025-12NMA-013', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000ad', '00000001-0000-0000-0000-000000000001', 'priyanka.das.12nma.014@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Priyanka', 'प्रियंका', 'Das', 'दास', NULL, 'ADM-2025-12NMA-014', 'STU-2025-12NMA-014', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000ae', '00000001-0000-0000-0000-000000000001', 'khushi.mehta.12nma.015@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Khushi', 'खुशी', 'Mehta', 'मेहता', NULL, 'ADM-2025-12NMA-015', 'STU-2025-12NMA-015', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000af', '00000001-0000-0000-0000-000000000001', 'roshni.saxena.12nma.016@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Roshni', 'रोशनी', 'Saxena', 'सक्सेना', NULL, 'ADM-2025-12NMA-016', 'STU-2025-12NMA-016', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000b0', '00000001-0000-0000-0000-000000000001', 'navya.choudhary.12nma.017@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Navya', 'नव्या', 'Choudhary', 'चौधरी', NULL, 'ADM-2025-12NMA-017', 'STU-2025-12NMA-017', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000b1', '00000001-0000-0000-0000-000000000001', 'mansi.agarwal.12nma.018@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Mansi', 'मानसी', 'Agarwal', 'अग्रवाल', NULL, 'ADM-2025-12NMA-018', 'STU-2025-12NMA-018', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000b2', '00000001-0000-0000-0000-000000000001', 'jaspreet.kaur.12nma.019@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Jaspreet', 'जसप्रीत', 'Kaur', 'कौर', NULL, 'ADM-2025-12NMA-019', 'STU-2025-12NMA-019', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000b3', '00000001-0000-0000-0000-000000000001', 'harleen.kaur.12nma.020@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Harleen', 'हरलीन', 'Kaur', 'कौर', NULL, 'ADM-2025-12NMA-020', 'STU-2025-12NMA-020', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000b4', '00000001-0000-0000-0000-000000000001', 'avani.deshmukh.12nma.021@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Avani', 'अवनी', 'Deshmukh', 'देशमुख', NULL, 'ADM-2025-12NMA-021', 'STU-2025-12NMA-021', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000b5', '00000001-0000-0000-0000-000000000001', 'bhavya.trivedi.12nma.022@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Bhavya', 'भव्या', 'Trivedi', 'त्रिवेदी', NULL, 'ADM-2025-12NMA-022', 'STU-2025-12NMA-022', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000b6', '00000001-0000-0000-0000-000000000001', 'chhavi.singhania.12nma.023@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Chhavi', 'छवि', 'Singhania', 'सिंघानिया', NULL, 'ADM-2025-12NMA-023', 'STU-2025-12NMA-023', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000b7', '00000001-0000-0000-0000-000000000001', 'drishti.malhotra.12nma.024@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Drishti', 'दृष्टि', 'Malhotra', 'मल्होत्रा', NULL, 'ADM-2025-12NMA-024', 'STU-2025-12NMA-024', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000b8', '00000001-0000-0000-0000-000000000001', 'esha.pillai.12nma.025@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Esha', 'ईशा', 'Pillai', 'पिल्लई', NULL, 'ADM-2025-12NMA-025', 'STU-2025-12NMA-025', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000b9', '00000001-0000-0000-0000-000000000001', 'gargi.mukherjee.12nma.026@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Gargi', 'गार्गी', 'Mukherjee', 'मुखर्जी', NULL, 'ADM-2025-12NMA-026', 'STU-2025-12NMA-026', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000ba', '00000001-0000-0000-0000-000000000001', 'ishani.banerjee.12nma.027@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ishani', 'ईशानी', 'Banerjee', 'बनर्जी', NULL, 'ADM-2025-12NMA-027', 'STU-2025-12NMA-027', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000bb', '00000001-0000-0000-0000-000000000001', 'jiya.kulkarni.12nma.028@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Jiya', 'जिया', 'Kulkarni', 'कुलकर्णी', NULL, 'ADM-2025-12NMA-028', 'STU-2025-12NMA-028', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000bc', '00000001-0000-0000-0000-000000000001', 'kriti.menon.12nma.029@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kriti', 'कृति', 'Menon', 'मेनन', NULL, 'ADM-2025-12NMA-029', 'STU-2025-12NMA-029', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000bd', '00000001-0000-0000-0000-000000000001', 'lavanya.jain.12nma.030@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Lavanya', 'लावण्या', 'Jain', 'जैन', NULL, 'ADM-2025-12NMA-030', 'STU-2025-12NMA-030', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000be', '00000001-0000-0000-0000-000000000001', 'aarav.sharma.12nma.031@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aarav', 'आरव', 'Sharma', 'शर्मा', NULL, 'ADM-2025-12NMA-031', 'STU-2025-12NMA-031', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000bf', '00000001-0000-0000-0000-000000000001', 'rohan.verma.12nma.032@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Rohan', 'रोहन', 'Verma', 'वर्मा', NULL, 'ADM-2025-12NMA-032', 'STU-2025-12NMA-032', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000c0', '00000001-0000-0000-0000-000000000001', 'kabir.mehta.12nma.033@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kabir', 'कबीर', 'Mehta', 'मेहता', NULL, 'ADM-2025-12NMA-033', 'STU-2025-12NMA-033', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000c1', '00000001-0000-0000-0000-000000000001', 'vikram.malhotra.12nma.034@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Vikram', 'विक्रम', 'Malhotra', 'मल्होत्रा', NULL, 'ADM-2025-12NMA-034', 'STU-2025-12NMA-034', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000c2', '00000001-0000-0000-0000-000000000001', 'aditya.singh.12nma.035@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aditya', 'आदित्य', 'Singh', 'सिंह', NULL, 'ADM-2025-12NMA-035', 'STU-2025-12NMA-035', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000c3', '00000001-0000-0000-0000-000000000001', 'manpreet.singh.12nma.036@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Manpreet', 'मनप्रीत', 'Singh', 'सिंह', NULL, 'ADM-2025-12NMA-036', 'STU-2025-12NMA-036', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000c4', '00000001-0000-0000-0000-000000000001', 'gurpreet.singh.12nma.037@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Gurpreet', 'गुरप्रीत', 'Singh', 'सिंह', NULL, 'ADM-2025-12NMA-037', 'STU-2025-12NMA-037', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000c5', '00000001-0000-0000-0000-000000000001', 'aryan.kapoor.12nma.038@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aryan', 'आर्यन', 'Kapoor', 'कपूर', NULL, 'ADM-2025-12NMA-038', 'STU-2025-12NMA-038', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000c6', '00000001-0000-0000-0000-000000000001', 'karan.johar.12nma.039@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Karan', 'करण', 'Johar', 'जौहर', NULL, 'ADM-2025-12NMA-039', 'STU-2025-12NMA-039', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000c7', '00000001-0000-0000-0000-000000000001', 'yash.khanna.12nma.040@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Yash', 'यश', 'Khanna', 'खन्ना', NULL, 'ADM-2025-12NMA-040', 'STU-2025-12NMA-040', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000c8', '00000001-0000-0000-0000-000000000001', 'rahul.gupta.12nma.041@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Rahul', 'राहुल', 'Gupta', 'गुप्ता', NULL, 'ADM-2025-12NMA-041', 'STU-2025-12NMA-041', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000c9', '00000001-0000-0000-0000-000000000001', 'arjun.nair.12nma.042@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Arjun', 'अर्जुन', 'Nair', 'नायर', NULL, 'ADM-2025-12NMA-042', 'STU-2025-12NMA-042', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000ca', '00000001-0000-0000-0000-000000000001', 'dev.patel.12nma.043@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Dev', 'देव', 'Patel', 'पटेल', NULL, 'ADM-2025-12NMA-043', 'STU-2025-12NMA-043', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000cb', '00000001-0000-0000-0000-000000000001', 'kunal.bhatia.12nma.044@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kunal', 'कुणाल', 'Bhatia', 'भाटिया', NULL, 'ADM-2025-12NMA-044', 'STU-2025-12NMA-044', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000cc', '00000001-0000-0000-0000-000000000001', 'sahil.sethi.12nma.045@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sahil', 'साहिल', 'Sethi', 'सेठी', NULL, 'ADM-2025-12NMA-045', 'STU-2025-12NMA-045', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000cd', '00000001-0000-0000-0000-000000000001', 'pranav.joshi.12nma.046@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Pranav', 'प्रणव', 'Joshi', 'जोशी', NULL, 'ADM-2025-12NMA-046', 'STU-2025-12NMA-046', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000ce', '00000001-0000-0000-0000-000000000001', 'varun.dhawan.12nma.047@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Varun', 'वरुण', 'Dhawan', 'धवन', NULL, 'ADM-2025-12NMA-047', 'STU-2025-12NMA-047', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000cf', '00000001-0000-0000-0000-000000000001', 'siddharth.roy.12nma.048@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Siddharth', 'सिद्धार्थ', 'Roy', 'रॉय', NULL, 'ADM-2025-12NMA-048', 'STU-2025-12NMA-048', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000d0', '00000001-0000-0000-0000-000000000001', 'harshit.bansal.12nma.049@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Harshit', 'हर्षित', 'Bansal', 'बंसल', NULL, 'ADM-2025-12NMA-049', 'STU-2025-12NMA-049', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000d1', '00000001-0000-0000-0000-000000000001', 'ritvik.soni.12nma.050@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ritvik', 'ऋत्विक', 'Soni', 'सोनी', NULL, 'ADM-2025-12NMA-050', 'STU-2025-12NMA-050', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000d2', '00000001-0000-0000-0000-000000000001', 'ananya.sharma.12nmb.001@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ananya', 'अनन्या', 'Sharma', 'शर्मा', NULL, 'ADM-2025-12NMB-001', 'STU-2025-12NMB-001', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000d3', '00000001-0000-0000-0000-000000000001', 'diya.patel.12nmb.002@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Diya', 'दिया', 'Patel', 'पटेल', NULL, 'ADM-2025-12NMB-002', 'STU-2025-12NMB-002', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000d4', '00000001-0000-0000-0000-000000000001', 'ishita.gupta.12nmb.003@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ishita', 'इशिता', 'Gupta', 'गुप्ता', NULL, 'ADM-2025-12NMB-003', 'STU-2025-12NMB-003', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000d5', '00000001-0000-0000-0000-000000000001', 'riya.singh.12nmb.004@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Riya', 'रिया', 'Singh', 'सिंह', NULL, 'ADM-2025-12NMB-004', 'STU-2025-12NMB-004', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000d6', '00000001-0000-0000-0000-000000000001', 'sneha.reddy.12nmb.005@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sneha', 'स्नेहा', 'Reddy', 'रेड्डी', NULL, 'ADM-2025-12NMB-005', 'STU-2025-12NMB-005', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000d7', '00000001-0000-0000-0000-000000000001', 'pooja.verma.12nmb.006@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Pooja', 'पूजा', 'Verma', 'वर्मा', NULL, 'ADM-2025-12NMB-006', 'STU-2025-12NMB-006', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000d8', '00000001-0000-0000-0000-000000000001', 'simran.kaur.12nmb.007@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Simran', 'सिमरन', 'Kaur', 'कौर', NULL, 'ADM-2025-12NMB-007', 'STU-2025-12NMB-007', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000d9', '00000001-0000-0000-0000-000000000001', 'tanvi.joshi.12nmb.008@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Tanvi', 'तन्वी', 'Joshi', 'जोशी', NULL, 'ADM-2025-12NMB-008', 'STU-2025-12NMB-008', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000da', '00000001-0000-0000-0000-000000000001', 'kavya.nair.12nmb.009@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kavya', 'काव्या', 'Nair', 'नायर', NULL, 'ADM-2025-12NMB-009', 'STU-2025-12NMB-009', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000db', '00000001-0000-0000-0000-000000000001', 'meera.iyer.12nmb.010@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Meera', 'मीरा', 'Iyer', 'अय्यर', NULL, 'ADM-2025-12NMB-010', 'STU-2025-12NMB-010', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000dc', '00000001-0000-0000-0000-000000000001', 'shreya.sen.12nmb.011@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Shreya', 'श्रेया', 'Sen', 'सेन', NULL, 'ADM-2025-12NMB-011', 'STU-2025-12NMB-011', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000dd', '00000001-0000-0000-0000-000000000001', 'neha.bhatia.12nmb.012@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Neha', 'नेहा', 'Bhatia', 'भाटिया', NULL, 'ADM-2025-12NMB-012', 'STU-2025-12NMB-012', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000de', '00000001-0000-0000-0000-000000000001', 'aditi.rao.12nmb.013@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aditi', 'अदिति', 'Rao', 'राव', NULL, 'ADM-2025-12NMB-013', 'STU-2025-12NMB-013', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000df', '00000001-0000-0000-0000-000000000001', 'priyanka.das.12nmb.014@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Priyanka', 'प्रियंका', 'Das', 'दास', NULL, 'ADM-2025-12NMB-014', 'STU-2025-12NMB-014', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000e0', '00000001-0000-0000-0000-000000000001', 'khushi.mehta.12nmb.015@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Khushi', 'खुशी', 'Mehta', 'मेहता', NULL, 'ADM-2025-12NMB-015', 'STU-2025-12NMB-015', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000e1', '00000001-0000-0000-0000-000000000001', 'roshni.saxena.12nmb.016@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Roshni', 'रोशनी', 'Saxena', 'सक्सेना', NULL, 'ADM-2025-12NMB-016', 'STU-2025-12NMB-016', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000e2', '00000001-0000-0000-0000-000000000001', 'navya.choudhary.12nmb.017@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Navya', 'नव्या', 'Choudhary', 'चौधरी', NULL, 'ADM-2025-12NMB-017', 'STU-2025-12NMB-017', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000e3', '00000001-0000-0000-0000-000000000001', 'mansi.agarwal.12nmb.018@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Mansi', 'मानसी', 'Agarwal', 'अग्रवाल', NULL, 'ADM-2025-12NMB-018', 'STU-2025-12NMB-018', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000e4', '00000001-0000-0000-0000-000000000001', 'jaspreet.kaur.12nmb.019@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Jaspreet', 'जसप्रीत', 'Kaur', 'कौर', NULL, 'ADM-2025-12NMB-019', 'STU-2025-12NMB-019', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000e5', '00000001-0000-0000-0000-000000000001', 'harleen.kaur.12nmb.020@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Harleen', 'हरलीन', 'Kaur', 'कौर', NULL, 'ADM-2025-12NMB-020', 'STU-2025-12NMB-020', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000e6', '00000001-0000-0000-0000-000000000001', 'avani.deshmukh.12nmb.021@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Avani', 'अवनी', 'Deshmukh', 'देशमुख', NULL, 'ADM-2025-12NMB-021', 'STU-2025-12NMB-021', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000e7', '00000001-0000-0000-0000-000000000001', 'bhavya.trivedi.12nmb.022@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Bhavya', 'भव्या', 'Trivedi', 'त्रिवेदी', NULL, 'ADM-2025-12NMB-022', 'STU-2025-12NMB-022', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000e8', '00000001-0000-0000-0000-000000000001', 'chhavi.singhania.12nmb.023@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Chhavi', 'छवि', 'Singhania', 'सिंघानिया', NULL, 'ADM-2025-12NMB-023', 'STU-2025-12NMB-023', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000e9', '00000001-0000-0000-0000-000000000001', 'drishti.malhotra.12nmb.024@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Drishti', 'दृष्टि', 'Malhotra', 'मल्होत्रा', NULL, 'ADM-2025-12NMB-024', 'STU-2025-12NMB-024', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000ea', '00000001-0000-0000-0000-000000000001', 'esha.pillai.12nmb.025@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Esha', 'ईशा', 'Pillai', 'पिल्लई', NULL, 'ADM-2025-12NMB-025', 'STU-2025-12NMB-025', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000eb', '00000001-0000-0000-0000-000000000001', 'gargi.mukherjee.12nmb.026@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Gargi', 'गार्गी', 'Mukherjee', 'मुखर्जी', NULL, 'ADM-2025-12NMB-026', 'STU-2025-12NMB-026', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000ec', '00000001-0000-0000-0000-000000000001', 'ishani.banerjee.12nmb.027@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ishani', 'ईशानी', 'Banerjee', 'बनर्जी', NULL, 'ADM-2025-12NMB-027', 'STU-2025-12NMB-027', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000ed', '00000001-0000-0000-0000-000000000001', 'jiya.kulkarni.12nmb.028@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Jiya', 'जिया', 'Kulkarni', 'कुलकर्णी', NULL, 'ADM-2025-12NMB-028', 'STU-2025-12NMB-028', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000ee', '00000001-0000-0000-0000-000000000001', 'kriti.menon.12nmb.029@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kriti', 'कृति', 'Menon', 'मेनन', NULL, 'ADM-2025-12NMB-029', 'STU-2025-12NMB-029', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000ef', '00000001-0000-0000-0000-000000000001', 'lavanya.jain.12nmb.030@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Lavanya', 'लावण्या', 'Jain', 'जैन', NULL, 'ADM-2025-12NMB-030', 'STU-2025-12NMB-030', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000f0', '00000001-0000-0000-0000-000000000001', 'aarav.sharma.12nmb.031@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aarav', 'आरव', 'Sharma', 'शर्मा', NULL, 'ADM-2025-12NMB-031', 'STU-2025-12NMB-031', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000f1', '00000001-0000-0000-0000-000000000001', 'rohan.verma.12nmb.032@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Rohan', 'रोहन', 'Verma', 'वर्मा', NULL, 'ADM-2025-12NMB-032', 'STU-2025-12NMB-032', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000f2', '00000001-0000-0000-0000-000000000001', 'kabir.mehta.12nmb.033@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kabir', 'कबीर', 'Mehta', 'मेहता', NULL, 'ADM-2025-12NMB-033', 'STU-2025-12NMB-033', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000f3', '00000001-0000-0000-0000-000000000001', 'vikram.malhotra.12nmb.034@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Vikram', 'विक्रम', 'Malhotra', 'मल्होत्रा', NULL, 'ADM-2025-12NMB-034', 'STU-2025-12NMB-034', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000f4', '00000001-0000-0000-0000-000000000001', 'aditya.singh.12nmb.035@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aditya', 'आदित्य', 'Singh', 'सिंह', NULL, 'ADM-2025-12NMB-035', 'STU-2025-12NMB-035', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000f5', '00000001-0000-0000-0000-000000000001', 'manpreet.singh.12nmb.036@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Manpreet', 'मनप्रीत', 'Singh', 'सिंह', NULL, 'ADM-2025-12NMB-036', 'STU-2025-12NMB-036', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000f6', '00000001-0000-0000-0000-000000000001', 'gurpreet.singh.12nmb.037@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Gurpreet', 'गुरप्रीत', 'Singh', 'सिंह', NULL, 'ADM-2025-12NMB-037', 'STU-2025-12NMB-037', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000f7', '00000001-0000-0000-0000-000000000001', 'aryan.kapoor.12nmb.038@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aryan', 'आर्यन', 'Kapoor', 'कपूर', NULL, 'ADM-2025-12NMB-038', 'STU-2025-12NMB-038', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000f8', '00000001-0000-0000-0000-000000000001', 'karan.johar.12nmb.039@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Karan', 'करण', 'Johar', 'जौहर', NULL, 'ADM-2025-12NMB-039', 'STU-2025-12NMB-039', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000f9', '00000001-0000-0000-0000-000000000001', 'yash.khanna.12nmb.040@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Yash', 'यश', 'Khanna', 'खन्ना', NULL, 'ADM-2025-12NMB-040', 'STU-2025-12NMB-040', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000fa', '00000001-0000-0000-0000-000000000001', 'rahul.gupta.12nmb.041@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Rahul', 'राहुल', 'Gupta', 'गुप्ता', NULL, 'ADM-2025-12NMB-041', 'STU-2025-12NMB-041', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000fb', '00000001-0000-0000-0000-000000000001', 'arjun.nair.12nmb.042@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Arjun', 'अर्जुन', 'Nair', 'नायर', NULL, 'ADM-2025-12NMB-042', 'STU-2025-12NMB-042', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000fc', '00000001-0000-0000-0000-000000000001', 'dev.patel.12nmb.043@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Dev', 'देव', 'Patel', 'पटेल', NULL, 'ADM-2025-12NMB-043', 'STU-2025-12NMB-043', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000fd', '00000001-0000-0000-0000-000000000001', 'kunal.bhatia.12nmb.044@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kunal', 'कुणाल', 'Bhatia', 'भाटिया', NULL, 'ADM-2025-12NMB-044', 'STU-2025-12NMB-044', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000fe', '00000001-0000-0000-0000-000000000001', 'sahil.sethi.12nmb.045@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sahil', 'साहिल', 'Sethi', 'सेठी', NULL, 'ADM-2025-12NMB-045', 'STU-2025-12NMB-045', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-0000000000ff', '00000001-0000-0000-0000-000000000001', 'pranav.joshi.12nmb.046@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Pranav', 'प्रणव', 'Joshi', 'जोशी', NULL, 'ADM-2025-12NMB-046', 'STU-2025-12NMB-046', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000100', '00000001-0000-0000-0000-000000000001', 'varun.dhawan.12nmb.047@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Varun', 'वरुण', 'Dhawan', 'धवन', NULL, 'ADM-2025-12NMB-047', 'STU-2025-12NMB-047', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000101', '00000001-0000-0000-0000-000000000001', 'siddharth.roy.12nmb.048@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Siddharth', 'सिद्धार्थ', 'Roy', 'रॉय', NULL, 'ADM-2025-12NMB-048', 'STU-2025-12NMB-048', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000102', '00000001-0000-0000-0000-000000000001', 'harshit.bansal.12nmb.049@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Harshit', 'हर्षित', 'Bansal', 'बंसल', NULL, 'ADM-2025-12NMB-049', 'STU-2025-12NMB-049', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000103', '00000001-0000-0000-0000-000000000001', 'ritvik.soni.12nmb.050@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ritvik', 'ऋत्विक', 'Soni', 'सोनी', NULL, 'ADM-2025-12NMB-050', 'STU-2025-12NMB-050', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000104', '00000001-0000-0000-0000-000000000001', 'ananya.sharma.12meda.001@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ananya', 'अनन्या', 'Sharma', 'शर्मा', NULL, 'ADM-2025-12MEDA-001', 'STU-2025-12MEDA-001', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000105', '00000001-0000-0000-0000-000000000001', 'diya.patel.12meda.002@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Diya', 'दिया', 'Patel', 'पटेल', NULL, 'ADM-2025-12MEDA-002', 'STU-2025-12MEDA-002', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000106', '00000001-0000-0000-0000-000000000001', 'ishita.gupta.12meda.003@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ishita', 'इशिता', 'Gupta', 'गुप्ता', NULL, 'ADM-2025-12MEDA-003', 'STU-2025-12MEDA-003', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000107', '00000001-0000-0000-0000-000000000001', 'riya.singh.12meda.004@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Riya', 'रिया', 'Singh', 'सिंह', NULL, 'ADM-2025-12MEDA-004', 'STU-2025-12MEDA-004', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000108', '00000001-0000-0000-0000-000000000001', 'sneha.reddy.12meda.005@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sneha', 'स्नेहा', 'Reddy', 'रेड्डी', NULL, 'ADM-2025-12MEDA-005', 'STU-2025-12MEDA-005', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000109', '00000001-0000-0000-0000-000000000001', 'pooja.verma.12meda.006@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Pooja', 'पूजा', 'Verma', 'वर्मा', NULL, 'ADM-2025-12MEDA-006', 'STU-2025-12MEDA-006', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000010a', '00000001-0000-0000-0000-000000000001', 'simran.kaur.12meda.007@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Simran', 'सिमरन', 'Kaur', 'कौर', NULL, 'ADM-2025-12MEDA-007', 'STU-2025-12MEDA-007', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000010b', '00000001-0000-0000-0000-000000000001', 'tanvi.joshi.12meda.008@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Tanvi', 'तन्वी', 'Joshi', 'जोशी', NULL, 'ADM-2025-12MEDA-008', 'STU-2025-12MEDA-008', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000010c', '00000001-0000-0000-0000-000000000001', 'kavya.nair.12meda.009@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kavya', 'काव्या', 'Nair', 'नायर', NULL, 'ADM-2025-12MEDA-009', 'STU-2025-12MEDA-009', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000010d', '00000001-0000-0000-0000-000000000001', 'meera.iyer.12meda.010@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Meera', 'मीरा', 'Iyer', 'अय्यर', NULL, 'ADM-2025-12MEDA-010', 'STU-2025-12MEDA-010', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000010e', '00000001-0000-0000-0000-000000000001', 'shreya.sen.12meda.011@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Shreya', 'श्रेया', 'Sen', 'सेन', NULL, 'ADM-2025-12MEDA-011', 'STU-2025-12MEDA-011', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000010f', '00000001-0000-0000-0000-000000000001', 'neha.bhatia.12meda.012@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Neha', 'नेहा', 'Bhatia', 'भाटिया', NULL, 'ADM-2025-12MEDA-012', 'STU-2025-12MEDA-012', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000110', '00000001-0000-0000-0000-000000000001', 'aditi.rao.12meda.013@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aditi', 'अदिति', 'Rao', 'राव', NULL, 'ADM-2025-12MEDA-013', 'STU-2025-12MEDA-013', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000111', '00000001-0000-0000-0000-000000000001', 'priyanka.das.12meda.014@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Priyanka', 'प्रियंका', 'Das', 'दास', NULL, 'ADM-2025-12MEDA-014', 'STU-2025-12MEDA-014', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000112', '00000001-0000-0000-0000-000000000001', 'khushi.mehta.12meda.015@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Khushi', 'खुशी', 'Mehta', 'मेहता', NULL, 'ADM-2025-12MEDA-015', 'STU-2025-12MEDA-015', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000113', '00000001-0000-0000-0000-000000000001', 'roshni.saxena.12meda.016@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Roshni', 'रोशनी', 'Saxena', 'सक्सेना', NULL, 'ADM-2025-12MEDA-016', 'STU-2025-12MEDA-016', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000114', '00000001-0000-0000-0000-000000000001', 'navya.choudhary.12meda.017@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Navya', 'नव्या', 'Choudhary', 'चौधरी', NULL, 'ADM-2025-12MEDA-017', 'STU-2025-12MEDA-017', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000115', '00000001-0000-0000-0000-000000000001', 'mansi.agarwal.12meda.018@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Mansi', 'मानसी', 'Agarwal', 'अग्रवाल', NULL, 'ADM-2025-12MEDA-018', 'STU-2025-12MEDA-018', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000116', '00000001-0000-0000-0000-000000000001', 'jaspreet.kaur.12meda.019@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Jaspreet', 'जसप्रीत', 'Kaur', 'कौर', NULL, 'ADM-2025-12MEDA-019', 'STU-2025-12MEDA-019', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000117', '00000001-0000-0000-0000-000000000001', 'harleen.kaur.12meda.020@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Harleen', 'हरलीन', 'Kaur', 'कौर', NULL, 'ADM-2025-12MEDA-020', 'STU-2025-12MEDA-020', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000118', '00000001-0000-0000-0000-000000000001', 'avani.deshmukh.12meda.021@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Avani', 'अवनी', 'Deshmukh', 'देशमुख', NULL, 'ADM-2025-12MEDA-021', 'STU-2025-12MEDA-021', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000119', '00000001-0000-0000-0000-000000000001', 'bhavya.trivedi.12meda.022@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Bhavya', 'भव्या', 'Trivedi', 'त्रिवेदी', NULL, 'ADM-2025-12MEDA-022', 'STU-2025-12MEDA-022', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000011a', '00000001-0000-0000-0000-000000000001', 'chhavi.singhania.12meda.023@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Chhavi', 'छवि', 'Singhania', 'सिंघानिया', NULL, 'ADM-2025-12MEDA-023', 'STU-2025-12MEDA-023', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000011b', '00000001-0000-0000-0000-000000000001', 'drishti.malhotra.12meda.024@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Drishti', 'दृष्टि', 'Malhotra', 'मल्होत्रा', NULL, 'ADM-2025-12MEDA-024', 'STU-2025-12MEDA-024', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000011c', '00000001-0000-0000-0000-000000000001', 'esha.pillai.12meda.025@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Esha', 'ईशा', 'Pillai', 'पिल्लई', NULL, 'ADM-2025-12MEDA-025', 'STU-2025-12MEDA-025', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000011d', '00000001-0000-0000-0000-000000000001', 'gargi.mukherjee.12meda.026@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Gargi', 'गार्गी', 'Mukherjee', 'मुखर्जी', NULL, 'ADM-2025-12MEDA-026', 'STU-2025-12MEDA-026', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000011e', '00000001-0000-0000-0000-000000000001', 'ishani.banerjee.12meda.027@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ishani', 'ईशानी', 'Banerjee', 'बनर्जी', NULL, 'ADM-2025-12MEDA-027', 'STU-2025-12MEDA-027', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000011f', '00000001-0000-0000-0000-000000000001', 'jiya.kulkarni.12meda.028@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Jiya', 'जिया', 'Kulkarni', 'कुलकर्णी', NULL, 'ADM-2025-12MEDA-028', 'STU-2025-12MEDA-028', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000120', '00000001-0000-0000-0000-000000000001', 'kriti.menon.12meda.029@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kriti', 'कृति', 'Menon', 'मेनन', NULL, 'ADM-2025-12MEDA-029', 'STU-2025-12MEDA-029', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000121', '00000001-0000-0000-0000-000000000001', 'lavanya.jain.12meda.030@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Lavanya', 'लावण्या', 'Jain', 'जैन', NULL, 'ADM-2025-12MEDA-030', 'STU-2025-12MEDA-030', 'female', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000122', '00000001-0000-0000-0000-000000000001', 'aarav.sharma.12meda.031@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aarav', 'आरव', 'Sharma', 'शर्मा', NULL, 'ADM-2025-12MEDA-031', 'STU-2025-12MEDA-031', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000123', '00000001-0000-0000-0000-000000000001', 'rohan.verma.12meda.032@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Rohan', 'रोहन', 'Verma', 'वर्मा', NULL, 'ADM-2025-12MEDA-032', 'STU-2025-12MEDA-032', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000124', '00000001-0000-0000-0000-000000000001', 'kabir.mehta.12meda.033@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kabir', 'कबीर', 'Mehta', 'मेहता', NULL, 'ADM-2025-12MEDA-033', 'STU-2025-12MEDA-033', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000125', '00000001-0000-0000-0000-000000000001', 'vikram.malhotra.12meda.034@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Vikram', 'विक्रम', 'Malhotra', 'मल्होत्रा', NULL, 'ADM-2025-12MEDA-034', 'STU-2025-12MEDA-034', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000126', '00000001-0000-0000-0000-000000000001', 'aditya.singh.12meda.035@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aditya', 'आदित्य', 'Singh', 'सिंह', NULL, 'ADM-2025-12MEDA-035', 'STU-2025-12MEDA-035', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000127', '00000001-0000-0000-0000-000000000001', 'manpreet.singh.12meda.036@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Manpreet', 'मनप्रीत', 'Singh', 'सिंह', NULL, 'ADM-2025-12MEDA-036', 'STU-2025-12MEDA-036', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000128', '00000001-0000-0000-0000-000000000001', 'gurpreet.singh.12meda.037@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Gurpreet', 'गुरप्रीत', 'Singh', 'सिंह', NULL, 'ADM-2025-12MEDA-037', 'STU-2025-12MEDA-037', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000129', '00000001-0000-0000-0000-000000000001', 'aryan.kapoor.12meda.038@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aryan', 'आर्यन', 'Kapoor', 'कपूर', NULL, 'ADM-2025-12MEDA-038', 'STU-2025-12MEDA-038', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000012a', '00000001-0000-0000-0000-000000000001', 'karan.johar.12meda.039@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Karan', 'करण', 'Johar', 'जौहर', NULL, 'ADM-2025-12MEDA-039', 'STU-2025-12MEDA-039', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000012b', '00000001-0000-0000-0000-000000000001', 'yash.khanna.12meda.040@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Yash', 'यश', 'Khanna', 'खन्ना', NULL, 'ADM-2025-12MEDA-040', 'STU-2025-12MEDA-040', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000012c', '00000001-0000-0000-0000-000000000001', 'rahul.gupta.12meda.041@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Rahul', 'राहुल', 'Gupta', 'गुप्ता', NULL, 'ADM-2025-12MEDA-041', 'STU-2025-12MEDA-041', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000012d', '00000001-0000-0000-0000-000000000001', 'arjun.nair.12meda.042@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Arjun', 'अर्जुन', 'Nair', 'नायर', NULL, 'ADM-2025-12MEDA-042', 'STU-2025-12MEDA-042', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000012e', '00000001-0000-0000-0000-000000000001', 'dev.patel.12meda.043@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Dev', 'देव', 'Patel', 'पटेल', NULL, 'ADM-2025-12MEDA-043', 'STU-2025-12MEDA-043', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-00000000012f', '00000001-0000-0000-0000-000000000001', 'kunal.bhatia.12meda.044@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Kunal', 'कुणाल', 'Bhatia', 'भाटिया', NULL, 'ADM-2025-12MEDA-044', 'STU-2025-12MEDA-044', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000130', '00000001-0000-0000-0000-000000000001', 'sahil.sethi.12meda.045@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sahil', 'साहिल', 'Sethi', 'सेठी', NULL, 'ADM-2025-12MEDA-045', 'STU-2025-12MEDA-045', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000131', '00000001-0000-0000-0000-000000000001', 'pranav.joshi.12meda.046@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Pranav', 'प्रणव', 'Joshi', 'जोशी', NULL, 'ADM-2025-12MEDA-046', 'STU-2025-12MEDA-046', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000132', '00000001-0000-0000-0000-000000000001', 'varun.dhawan.12meda.047@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Varun', 'वरुण', 'Dhawan', 'धवन', NULL, 'ADM-2025-12MEDA-047', 'STU-2025-12MEDA-047', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000133', '00000001-0000-0000-0000-000000000001', 'siddharth.roy.12meda.048@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Siddharth', 'सिद्धार्थ', 'Roy', 'रॉय', NULL, 'ADM-2025-12MEDA-048', 'STU-2025-12MEDA-048', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000134', '00000001-0000-0000-0000-000000000001', 'harshit.bansal.12meda.049@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Harshit', 'हर्षित', 'Bansal', 'बंसल', NULL, 'ADM-2025-12MEDA-049', 'STU-2025-12MEDA-049', 'male', true, NOW(), NOW()),
  ('00000003-0000-0000-0000-000000000135', '00000001-0000-0000-0000-000000000001', 'ritvik.soni.12meda.050@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Ritvik', 'ऋत्विक', 'Soni', 'सोनी', NULL, 'ADM-2025-12MEDA-050', 'STU-2025-12MEDA-050', 'male', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. grade_scales
INSERT INTO grade_scales (id, school_id, grade_letter, grade_point, min_percentage, max_percentage, description, is_active, created_at, updated_at)
VALUES 
  ('00000004-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'A+', 10.0, 90, 100, 'Outstanding Performance', true, NOW(), NOW()),
  ('00000004-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'A', 9.0, 80, 89, 'Excellent Performance', true, NOW(), NOW()),
  ('00000004-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'B', 8.0, 70, 79, 'Very Good Performance', true, NOW(), NOW()),
  ('00000004-0000-0000-0000-000000000004', '00000001-0000-0000-0000-000000000001', 'C', 7.0, 60, 69, 'Good Performance', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. grade_scale_history
INSERT INTO grade_scale_history (id, grade_scale_id, action, previous_letter, previous_min_pct, previous_max_pct, previous_points, new_letter, new_min_pct, new_max_pct, new_points, changed_by_id, changed_at, reason)
VALUES 
  ('00000005-0000-0000-0000-000000000001', '00000004-0000-0000-0000-000000000001', 'UPDATE', 'A+', 92, 100, 10.0, 'A+', 90, 100, 10.0, '00000003-0000-0000-0000-000000000001', NOW(), 'Adjusted minimum threshold for A+ to 90% per CBSE guidelines'),
  ('00000005-0000-0000-0000-000000000002', '00000004-0000-0000-0000-000000000002', 'UPDATE', 'A', 82, 91, 9.0, 'A', 80, 89, 9.0, '00000003-0000-0000-0000-000000000001', NOW(), 'Adjusted threshold to match A+ revision')
ON CONFLICT (id) DO NOTHING;

-- 6. subjects
INSERT INTO subjects (id, school_id, code, name, name_hindi, has_lab, lab_hours_per_week, theory_hours_per_week, created_at)
VALUES 
  ('00000006-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'CS-101', 'Computer Science', 'कंप्यूटर विज्ञान', true, 4, 4, NOW()),
  ('00000006-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'PHY-101', 'Physics', 'भौतिक विज्ञान', true, 3, 4, NOW()),
  ('00000006-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'CHEM-101', 'Chemistry', 'रसायन विज्ञान', true, 3, 4, NOW()),
  ('00000006-0000-0000-0000-000000000004', '00000001-0000-0000-0000-000000000001', 'MATH-101', 'Mathematics', 'गणित', false, 0, 6, NOW())
ON CONFLICT (id) DO NOTHING;

-- 7. classes
INSERT INTO classes (id, school_id, academic_year_id, name, name_hindi, grade_level, section, stream, class_teacher_id, max_students, created_at)
VALUES 
  ('00000007-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', 'Class 11-A (Science)', 'कक्षा 11-ए (विज्ञान)', 11, 'A', 'Science', '00000003-0000-0000-0000-000000000003', 45, NOW()),
  ('00000007-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', 'Class 11-B (Science)', 'कक्षा 11-बी (विज्ञान)', 11, 'B', 'Science', '00000003-0000-0000-0000-000000000004', 45, NOW()),
  ('00000007-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', 'Class 12-A (Science)', 'कक्षा 12-ए (विज्ञान)', 12, 'A', 'Science', '00000003-0000-0000-0000-000000000003', 40, NOW()),
  ('00000007-0000-0000-0000-000000000004', '00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', '11 NM A', '11 नॉन-मेडिकल ए', 11, 'A', 'Non-Medical', '00000003-0000-0000-0000-000000000003', 50, NOW()),
  ('00000007-0000-0000-0000-000000000005', '00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', '11 NM B', '11 नॉन-मेडिकल बी', 11, 'B', 'Non-Medical', '00000003-0000-0000-0000-000000000004', 50, NOW()),
  ('00000007-0000-0000-0000-000000000006', '00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', '11 Med A', '11 मेडिकल ए', 11, 'A', 'Medical', '00000003-0000-0000-0000-000000000003', 50, NOW()),
  ('00000007-0000-0000-0000-000000000007', '00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', '12 NM A', '12 नॉन-मेडिकल ए', 12, 'A', 'Non-Medical', '00000003-0000-0000-0000-000000000003', 50, NOW()),
  ('00000007-0000-0000-0000-000000000008', '00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', '12 NM B', '12 नॉन-मेडिकल बी', 12, 'B', 'Non-Medical', '00000003-0000-0000-0000-000000000004', 50, NOW()),
  ('00000007-0000-0000-0000-000000000009', '00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', '12 Med A', '12 मेडिकल ए', 12, 'A', 'Medical', '00000003-0000-0000-0000-000000000004', 50, NOW())
ON CONFLICT (id) DO NOTHING;

-- 8. class_enrollments
INSERT INTO class_enrollments (id, student_id, class_id, roll_number, enrollment_date, status)
VALUES 
  ('00000008-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', '00000007-0000-0000-0000-000000000001', 101, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', '00000007-0000-0000-0000-000000000001', 102, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000003', '00000003-0000-0000-0000-00000000000a', '00000007-0000-0000-0000-000000000004', 1, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000004', '00000003-0000-0000-0000-00000000000b', '00000007-0000-0000-0000-000000000004', 2, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000005', '00000003-0000-0000-0000-00000000000c', '00000007-0000-0000-0000-000000000004', 3, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000006', '00000003-0000-0000-0000-00000000000d', '00000007-0000-0000-0000-000000000004', 4, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000007', '00000003-0000-0000-0000-00000000000e', '00000007-0000-0000-0000-000000000004', 5, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000008', '00000003-0000-0000-0000-00000000000f', '00000007-0000-0000-0000-000000000004', 6, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000009', '00000003-0000-0000-0000-000000000010', '00000007-0000-0000-0000-000000000004', 7, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000000a', '00000003-0000-0000-0000-000000000011', '00000007-0000-0000-0000-000000000004', 8, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000000b', '00000003-0000-0000-0000-000000000012', '00000007-0000-0000-0000-000000000004', 9, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000000c', '00000003-0000-0000-0000-000000000013', '00000007-0000-0000-0000-000000000004', 10, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000000d', '00000003-0000-0000-0000-000000000014', '00000007-0000-0000-0000-000000000004', 11, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000000e', '00000003-0000-0000-0000-000000000015', '00000007-0000-0000-0000-000000000004', 12, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000000f', '00000003-0000-0000-0000-000000000016', '00000007-0000-0000-0000-000000000004', 13, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000010', '00000003-0000-0000-0000-000000000017', '00000007-0000-0000-0000-000000000004', 14, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000011', '00000003-0000-0000-0000-000000000018', '00000007-0000-0000-0000-000000000004', 15, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000012', '00000003-0000-0000-0000-000000000019', '00000007-0000-0000-0000-000000000004', 16, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000013', '00000003-0000-0000-0000-00000000001a', '00000007-0000-0000-0000-000000000004', 17, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000014', '00000003-0000-0000-0000-00000000001b', '00000007-0000-0000-0000-000000000004', 18, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000015', '00000003-0000-0000-0000-00000000001c', '00000007-0000-0000-0000-000000000004', 19, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000016', '00000003-0000-0000-0000-00000000001d', '00000007-0000-0000-0000-000000000004', 20, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000017', '00000003-0000-0000-0000-00000000001e', '00000007-0000-0000-0000-000000000004', 21, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000018', '00000003-0000-0000-0000-00000000001f', '00000007-0000-0000-0000-000000000004', 22, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000019', '00000003-0000-0000-0000-000000000020', '00000007-0000-0000-0000-000000000004', 23, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000001a', '00000003-0000-0000-0000-000000000021', '00000007-0000-0000-0000-000000000004', 24, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000001b', '00000003-0000-0000-0000-000000000022', '00000007-0000-0000-0000-000000000004', 25, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000001c', '00000003-0000-0000-0000-000000000023', '00000007-0000-0000-0000-000000000004', 26, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000001d', '00000003-0000-0000-0000-000000000024', '00000007-0000-0000-0000-000000000004', 27, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000001e', '00000003-0000-0000-0000-000000000025', '00000007-0000-0000-0000-000000000004', 28, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000001f', '00000003-0000-0000-0000-000000000026', '00000007-0000-0000-0000-000000000004', 29, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000020', '00000003-0000-0000-0000-000000000027', '00000007-0000-0000-0000-000000000004', 30, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000021', '00000003-0000-0000-0000-000000000028', '00000007-0000-0000-0000-000000000004', 31, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000022', '00000003-0000-0000-0000-000000000029', '00000007-0000-0000-0000-000000000004', 32, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000023', '00000003-0000-0000-0000-00000000002a', '00000007-0000-0000-0000-000000000004', 33, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000024', '00000003-0000-0000-0000-00000000002b', '00000007-0000-0000-0000-000000000004', 34, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000025', '00000003-0000-0000-0000-00000000002c', '00000007-0000-0000-0000-000000000004', 35, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000026', '00000003-0000-0000-0000-00000000002d', '00000007-0000-0000-0000-000000000004', 36, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000027', '00000003-0000-0000-0000-00000000002e', '00000007-0000-0000-0000-000000000004', 37, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000028', '00000003-0000-0000-0000-00000000002f', '00000007-0000-0000-0000-000000000004', 38, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000029', '00000003-0000-0000-0000-000000000030', '00000007-0000-0000-0000-000000000004', 39, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000002a', '00000003-0000-0000-0000-000000000031', '00000007-0000-0000-0000-000000000004', 40, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000002b', '00000003-0000-0000-0000-000000000032', '00000007-0000-0000-0000-000000000004', 41, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000002c', '00000003-0000-0000-0000-000000000033', '00000007-0000-0000-0000-000000000004', 42, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000002d', '00000003-0000-0000-0000-000000000034', '00000007-0000-0000-0000-000000000004', 43, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000002e', '00000003-0000-0000-0000-000000000035', '00000007-0000-0000-0000-000000000004', 44, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000002f', '00000003-0000-0000-0000-000000000036', '00000007-0000-0000-0000-000000000004', 45, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000030', '00000003-0000-0000-0000-000000000037', '00000007-0000-0000-0000-000000000004', 46, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000031', '00000003-0000-0000-0000-000000000038', '00000007-0000-0000-0000-000000000004', 47, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000032', '00000003-0000-0000-0000-000000000039', '00000007-0000-0000-0000-000000000004', 48, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000033', '00000003-0000-0000-0000-00000000003a', '00000007-0000-0000-0000-000000000004', 49, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000034', '00000003-0000-0000-0000-00000000003b', '00000007-0000-0000-0000-000000000004', 50, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000035', '00000003-0000-0000-0000-00000000003c', '00000007-0000-0000-0000-000000000005', 1, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000036', '00000003-0000-0000-0000-00000000003d', '00000007-0000-0000-0000-000000000005', 2, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000037', '00000003-0000-0000-0000-00000000003e', '00000007-0000-0000-0000-000000000005', 3, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000038', '00000003-0000-0000-0000-00000000003f', '00000007-0000-0000-0000-000000000005', 4, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000039', '00000003-0000-0000-0000-000000000040', '00000007-0000-0000-0000-000000000005', 5, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000003a', '00000003-0000-0000-0000-000000000041', '00000007-0000-0000-0000-000000000005', 6, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000003b', '00000003-0000-0000-0000-000000000042', '00000007-0000-0000-0000-000000000005', 7, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000003c', '00000003-0000-0000-0000-000000000043', '00000007-0000-0000-0000-000000000005', 8, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000003d', '00000003-0000-0000-0000-000000000044', '00000007-0000-0000-0000-000000000005', 9, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000003e', '00000003-0000-0000-0000-000000000045', '00000007-0000-0000-0000-000000000005', 10, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000003f', '00000003-0000-0000-0000-000000000046', '00000007-0000-0000-0000-000000000005', 11, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000040', '00000003-0000-0000-0000-000000000047', '00000007-0000-0000-0000-000000000005', 12, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000041', '00000003-0000-0000-0000-000000000048', '00000007-0000-0000-0000-000000000005', 13, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000042', '00000003-0000-0000-0000-000000000049', '00000007-0000-0000-0000-000000000005', 14, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000043', '00000003-0000-0000-0000-00000000004a', '00000007-0000-0000-0000-000000000005', 15, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000044', '00000003-0000-0000-0000-00000000004b', '00000007-0000-0000-0000-000000000005', 16, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000045', '00000003-0000-0000-0000-00000000004c', '00000007-0000-0000-0000-000000000005', 17, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000046', '00000003-0000-0000-0000-00000000004d', '00000007-0000-0000-0000-000000000005', 18, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000047', '00000003-0000-0000-0000-00000000004e', '00000007-0000-0000-0000-000000000005', 19, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000048', '00000003-0000-0000-0000-00000000004f', '00000007-0000-0000-0000-000000000005', 20, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000049', '00000003-0000-0000-0000-000000000050', '00000007-0000-0000-0000-000000000005', 21, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000004a', '00000003-0000-0000-0000-000000000051', '00000007-0000-0000-0000-000000000005', 22, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000004b', '00000003-0000-0000-0000-000000000052', '00000007-0000-0000-0000-000000000005', 23, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000004c', '00000003-0000-0000-0000-000000000053', '00000007-0000-0000-0000-000000000005', 24, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000004d', '00000003-0000-0000-0000-000000000054', '00000007-0000-0000-0000-000000000005', 25, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000004e', '00000003-0000-0000-0000-000000000055', '00000007-0000-0000-0000-000000000005', 26, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000004f', '00000003-0000-0000-0000-000000000056', '00000007-0000-0000-0000-000000000005', 27, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000050', '00000003-0000-0000-0000-000000000057', '00000007-0000-0000-0000-000000000005', 28, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000051', '00000003-0000-0000-0000-000000000058', '00000007-0000-0000-0000-000000000005', 29, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000052', '00000003-0000-0000-0000-000000000059', '00000007-0000-0000-0000-000000000005', 30, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000053', '00000003-0000-0000-0000-00000000005a', '00000007-0000-0000-0000-000000000005', 31, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000054', '00000003-0000-0000-0000-00000000005b', '00000007-0000-0000-0000-000000000005', 32, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000055', '00000003-0000-0000-0000-00000000005c', '00000007-0000-0000-0000-000000000005', 33, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000056', '00000003-0000-0000-0000-00000000005d', '00000007-0000-0000-0000-000000000005', 34, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000057', '00000003-0000-0000-0000-00000000005e', '00000007-0000-0000-0000-000000000005', 35, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000058', '00000003-0000-0000-0000-00000000005f', '00000007-0000-0000-0000-000000000005', 36, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000059', '00000003-0000-0000-0000-000000000060', '00000007-0000-0000-0000-000000000005', 37, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000005a', '00000003-0000-0000-0000-000000000061', '00000007-0000-0000-0000-000000000005', 38, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000005b', '00000003-0000-0000-0000-000000000062', '00000007-0000-0000-0000-000000000005', 39, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000005c', '00000003-0000-0000-0000-000000000063', '00000007-0000-0000-0000-000000000005', 40, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000005d', '00000003-0000-0000-0000-000000000064', '00000007-0000-0000-0000-000000000005', 41, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000005e', '00000003-0000-0000-0000-000000000065', '00000007-0000-0000-0000-000000000005', 42, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000005f', '00000003-0000-0000-0000-000000000066', '00000007-0000-0000-0000-000000000005', 43, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000060', '00000003-0000-0000-0000-000000000067', '00000007-0000-0000-0000-000000000005', 44, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000061', '00000003-0000-0000-0000-000000000068', '00000007-0000-0000-0000-000000000005', 45, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000062', '00000003-0000-0000-0000-000000000069', '00000007-0000-0000-0000-000000000005', 46, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000063', '00000003-0000-0000-0000-00000000006a', '00000007-0000-0000-0000-000000000005', 47, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000064', '00000003-0000-0000-0000-00000000006b', '00000007-0000-0000-0000-000000000005', 48, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000065', '00000003-0000-0000-0000-00000000006c', '00000007-0000-0000-0000-000000000005', 49, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000066', '00000003-0000-0000-0000-00000000006d', '00000007-0000-0000-0000-000000000005', 50, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000067', '00000003-0000-0000-0000-00000000006e', '00000007-0000-0000-0000-000000000006', 1, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000068', '00000003-0000-0000-0000-00000000006f', '00000007-0000-0000-0000-000000000006', 2, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000069', '00000003-0000-0000-0000-000000000070', '00000007-0000-0000-0000-000000000006', 3, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000006a', '00000003-0000-0000-0000-000000000071', '00000007-0000-0000-0000-000000000006', 4, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000006b', '00000003-0000-0000-0000-000000000072', '00000007-0000-0000-0000-000000000006', 5, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000006c', '00000003-0000-0000-0000-000000000073', '00000007-0000-0000-0000-000000000006', 6, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000006d', '00000003-0000-0000-0000-000000000074', '00000007-0000-0000-0000-000000000006', 7, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000006e', '00000003-0000-0000-0000-000000000075', '00000007-0000-0000-0000-000000000006', 8, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000006f', '00000003-0000-0000-0000-000000000076', '00000007-0000-0000-0000-000000000006', 9, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000070', '00000003-0000-0000-0000-000000000077', '00000007-0000-0000-0000-000000000006', 10, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000071', '00000003-0000-0000-0000-000000000078', '00000007-0000-0000-0000-000000000006', 11, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000072', '00000003-0000-0000-0000-000000000079', '00000007-0000-0000-0000-000000000006', 12, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000073', '00000003-0000-0000-0000-00000000007a', '00000007-0000-0000-0000-000000000006', 13, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000074', '00000003-0000-0000-0000-00000000007b', '00000007-0000-0000-0000-000000000006', 14, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000075', '00000003-0000-0000-0000-00000000007c', '00000007-0000-0000-0000-000000000006', 15, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000076', '00000003-0000-0000-0000-00000000007d', '00000007-0000-0000-0000-000000000006', 16, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000077', '00000003-0000-0000-0000-00000000007e', '00000007-0000-0000-0000-000000000006', 17, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000078', '00000003-0000-0000-0000-00000000007f', '00000007-0000-0000-0000-000000000006', 18, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000079', '00000003-0000-0000-0000-000000000080', '00000007-0000-0000-0000-000000000006', 19, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000007a', '00000003-0000-0000-0000-000000000081', '00000007-0000-0000-0000-000000000006', 20, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000007b', '00000003-0000-0000-0000-000000000082', '00000007-0000-0000-0000-000000000006', 21, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000007c', '00000003-0000-0000-0000-000000000083', '00000007-0000-0000-0000-000000000006', 22, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000007d', '00000003-0000-0000-0000-000000000084', '00000007-0000-0000-0000-000000000006', 23, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000007e', '00000003-0000-0000-0000-000000000085', '00000007-0000-0000-0000-000000000006', 24, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000007f', '00000003-0000-0000-0000-000000000086', '00000007-0000-0000-0000-000000000006', 25, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000080', '00000003-0000-0000-0000-000000000087', '00000007-0000-0000-0000-000000000006', 26, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000081', '00000003-0000-0000-0000-000000000088', '00000007-0000-0000-0000-000000000006', 27, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000082', '00000003-0000-0000-0000-000000000089', '00000007-0000-0000-0000-000000000006', 28, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000083', '00000003-0000-0000-0000-00000000008a', '00000007-0000-0000-0000-000000000006', 29, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000084', '00000003-0000-0000-0000-00000000008b', '00000007-0000-0000-0000-000000000006', 30, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000085', '00000003-0000-0000-0000-00000000008c', '00000007-0000-0000-0000-000000000006', 31, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000086', '00000003-0000-0000-0000-00000000008d', '00000007-0000-0000-0000-000000000006', 32, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000087', '00000003-0000-0000-0000-00000000008e', '00000007-0000-0000-0000-000000000006', 33, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000088', '00000003-0000-0000-0000-00000000008f', '00000007-0000-0000-0000-000000000006', 34, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000089', '00000003-0000-0000-0000-000000000090', '00000007-0000-0000-0000-000000000006', 35, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000008a', '00000003-0000-0000-0000-000000000091', '00000007-0000-0000-0000-000000000006', 36, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000008b', '00000003-0000-0000-0000-000000000092', '00000007-0000-0000-0000-000000000006', 37, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000008c', '00000003-0000-0000-0000-000000000093', '00000007-0000-0000-0000-000000000006', 38, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000008d', '00000003-0000-0000-0000-000000000094', '00000007-0000-0000-0000-000000000006', 39, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000008e', '00000003-0000-0000-0000-000000000095', '00000007-0000-0000-0000-000000000006', 40, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000008f', '00000003-0000-0000-0000-000000000096', '00000007-0000-0000-0000-000000000006', 41, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000090', '00000003-0000-0000-0000-000000000097', '00000007-0000-0000-0000-000000000006', 42, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000091', '00000003-0000-0000-0000-000000000098', '00000007-0000-0000-0000-000000000006', 43, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000092', '00000003-0000-0000-0000-000000000099', '00000007-0000-0000-0000-000000000006', 44, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000093', '00000003-0000-0000-0000-00000000009a', '00000007-0000-0000-0000-000000000006', 45, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000094', '00000003-0000-0000-0000-00000000009b', '00000007-0000-0000-0000-000000000006', 46, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000095', '00000003-0000-0000-0000-00000000009c', '00000007-0000-0000-0000-000000000006', 47, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000096', '00000003-0000-0000-0000-00000000009d', '00000007-0000-0000-0000-000000000006', 48, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000097', '00000003-0000-0000-0000-00000000009e', '00000007-0000-0000-0000-000000000006', 49, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000098', '00000003-0000-0000-0000-00000000009f', '00000007-0000-0000-0000-000000000006', 50, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000099', '00000003-0000-0000-0000-0000000000a0', '00000007-0000-0000-0000-000000000007', 1, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000009a', '00000003-0000-0000-0000-0000000000a1', '00000007-0000-0000-0000-000000000007', 2, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000009b', '00000003-0000-0000-0000-0000000000a2', '00000007-0000-0000-0000-000000000007', 3, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000009c', '00000003-0000-0000-0000-0000000000a3', '00000007-0000-0000-0000-000000000007', 4, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000009d', '00000003-0000-0000-0000-0000000000a4', '00000007-0000-0000-0000-000000000007', 5, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000009e', '00000003-0000-0000-0000-0000000000a5', '00000007-0000-0000-0000-000000000007', 6, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000009f', '00000003-0000-0000-0000-0000000000a6', '00000007-0000-0000-0000-000000000007', 7, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000a0', '00000003-0000-0000-0000-0000000000a7', '00000007-0000-0000-0000-000000000007', 8, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000a1', '00000003-0000-0000-0000-0000000000a8', '00000007-0000-0000-0000-000000000007', 9, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000a2', '00000003-0000-0000-0000-0000000000a9', '00000007-0000-0000-0000-000000000007', 10, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000a3', '00000003-0000-0000-0000-0000000000aa', '00000007-0000-0000-0000-000000000007', 11, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000a4', '00000003-0000-0000-0000-0000000000ab', '00000007-0000-0000-0000-000000000007', 12, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000a5', '00000003-0000-0000-0000-0000000000ac', '00000007-0000-0000-0000-000000000007', 13, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000a6', '00000003-0000-0000-0000-0000000000ad', '00000007-0000-0000-0000-000000000007', 14, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000a7', '00000003-0000-0000-0000-0000000000ae', '00000007-0000-0000-0000-000000000007', 15, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000a8', '00000003-0000-0000-0000-0000000000af', '00000007-0000-0000-0000-000000000007', 16, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000a9', '00000003-0000-0000-0000-0000000000b0', '00000007-0000-0000-0000-000000000007', 17, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000aa', '00000003-0000-0000-0000-0000000000b1', '00000007-0000-0000-0000-000000000007', 18, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000ab', '00000003-0000-0000-0000-0000000000b2', '00000007-0000-0000-0000-000000000007', 19, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000ac', '00000003-0000-0000-0000-0000000000b3', '00000007-0000-0000-0000-000000000007', 20, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000ad', '00000003-0000-0000-0000-0000000000b4', '00000007-0000-0000-0000-000000000007', 21, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000ae', '00000003-0000-0000-0000-0000000000b5', '00000007-0000-0000-0000-000000000007', 22, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000af', '00000003-0000-0000-0000-0000000000b6', '00000007-0000-0000-0000-000000000007', 23, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000b0', '00000003-0000-0000-0000-0000000000b7', '00000007-0000-0000-0000-000000000007', 24, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000b1', '00000003-0000-0000-0000-0000000000b8', '00000007-0000-0000-0000-000000000007', 25, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000b2', '00000003-0000-0000-0000-0000000000b9', '00000007-0000-0000-0000-000000000007', 26, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000b3', '00000003-0000-0000-0000-0000000000ba', '00000007-0000-0000-0000-000000000007', 27, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000b4', '00000003-0000-0000-0000-0000000000bb', '00000007-0000-0000-0000-000000000007', 28, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000b5', '00000003-0000-0000-0000-0000000000bc', '00000007-0000-0000-0000-000000000007', 29, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000b6', '00000003-0000-0000-0000-0000000000bd', '00000007-0000-0000-0000-000000000007', 30, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000b7', '00000003-0000-0000-0000-0000000000be', '00000007-0000-0000-0000-000000000007', 31, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000b8', '00000003-0000-0000-0000-0000000000bf', '00000007-0000-0000-0000-000000000007', 32, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000b9', '00000003-0000-0000-0000-0000000000c0', '00000007-0000-0000-0000-000000000007', 33, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000ba', '00000003-0000-0000-0000-0000000000c1', '00000007-0000-0000-0000-000000000007', 34, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000bb', '00000003-0000-0000-0000-0000000000c2', '00000007-0000-0000-0000-000000000007', 35, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000bc', '00000003-0000-0000-0000-0000000000c3', '00000007-0000-0000-0000-000000000007', 36, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000bd', '00000003-0000-0000-0000-0000000000c4', '00000007-0000-0000-0000-000000000007', 37, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000be', '00000003-0000-0000-0000-0000000000c5', '00000007-0000-0000-0000-000000000007', 38, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000bf', '00000003-0000-0000-0000-0000000000c6', '00000007-0000-0000-0000-000000000007', 39, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000c0', '00000003-0000-0000-0000-0000000000c7', '00000007-0000-0000-0000-000000000007', 40, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000c1', '00000003-0000-0000-0000-0000000000c8', '00000007-0000-0000-0000-000000000007', 41, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000c2', '00000003-0000-0000-0000-0000000000c9', '00000007-0000-0000-0000-000000000007', 42, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000c3', '00000003-0000-0000-0000-0000000000ca', '00000007-0000-0000-0000-000000000007', 43, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000c4', '00000003-0000-0000-0000-0000000000cb', '00000007-0000-0000-0000-000000000007', 44, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000c5', '00000003-0000-0000-0000-0000000000cc', '00000007-0000-0000-0000-000000000007', 45, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000c6', '00000003-0000-0000-0000-0000000000cd', '00000007-0000-0000-0000-000000000007', 46, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000c7', '00000003-0000-0000-0000-0000000000ce', '00000007-0000-0000-0000-000000000007', 47, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000c8', '00000003-0000-0000-0000-0000000000cf', '00000007-0000-0000-0000-000000000007', 48, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000c9', '00000003-0000-0000-0000-0000000000d0', '00000007-0000-0000-0000-000000000007', 49, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000ca', '00000003-0000-0000-0000-0000000000d1', '00000007-0000-0000-0000-000000000007', 50, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000cb', '00000003-0000-0000-0000-0000000000d2', '00000007-0000-0000-0000-000000000008', 1, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000cc', '00000003-0000-0000-0000-0000000000d3', '00000007-0000-0000-0000-000000000008', 2, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000cd', '00000003-0000-0000-0000-0000000000d4', '00000007-0000-0000-0000-000000000008', 3, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000ce', '00000003-0000-0000-0000-0000000000d5', '00000007-0000-0000-0000-000000000008', 4, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000cf', '00000003-0000-0000-0000-0000000000d6', '00000007-0000-0000-0000-000000000008', 5, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000d0', '00000003-0000-0000-0000-0000000000d7', '00000007-0000-0000-0000-000000000008', 6, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000d1', '00000003-0000-0000-0000-0000000000d8', '00000007-0000-0000-0000-000000000008', 7, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000d2', '00000003-0000-0000-0000-0000000000d9', '00000007-0000-0000-0000-000000000008', 8, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000d3', '00000003-0000-0000-0000-0000000000da', '00000007-0000-0000-0000-000000000008', 9, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000d4', '00000003-0000-0000-0000-0000000000db', '00000007-0000-0000-0000-000000000008', 10, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000d5', '00000003-0000-0000-0000-0000000000dc', '00000007-0000-0000-0000-000000000008', 11, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000d6', '00000003-0000-0000-0000-0000000000dd', '00000007-0000-0000-0000-000000000008', 12, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000d7', '00000003-0000-0000-0000-0000000000de', '00000007-0000-0000-0000-000000000008', 13, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000d8', '00000003-0000-0000-0000-0000000000df', '00000007-0000-0000-0000-000000000008', 14, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000d9', '00000003-0000-0000-0000-0000000000e0', '00000007-0000-0000-0000-000000000008', 15, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000da', '00000003-0000-0000-0000-0000000000e1', '00000007-0000-0000-0000-000000000008', 16, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000db', '00000003-0000-0000-0000-0000000000e2', '00000007-0000-0000-0000-000000000008', 17, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000dc', '00000003-0000-0000-0000-0000000000e3', '00000007-0000-0000-0000-000000000008', 18, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000dd', '00000003-0000-0000-0000-0000000000e4', '00000007-0000-0000-0000-000000000008', 19, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000de', '00000003-0000-0000-0000-0000000000e5', '00000007-0000-0000-0000-000000000008', 20, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000df', '00000003-0000-0000-0000-0000000000e6', '00000007-0000-0000-0000-000000000008', 21, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000e0', '00000003-0000-0000-0000-0000000000e7', '00000007-0000-0000-0000-000000000008', 22, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000e1', '00000003-0000-0000-0000-0000000000e8', '00000007-0000-0000-0000-000000000008', 23, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000e2', '00000003-0000-0000-0000-0000000000e9', '00000007-0000-0000-0000-000000000008', 24, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000e3', '00000003-0000-0000-0000-0000000000ea', '00000007-0000-0000-0000-000000000008', 25, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000e4', '00000003-0000-0000-0000-0000000000eb', '00000007-0000-0000-0000-000000000008', 26, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000e5', '00000003-0000-0000-0000-0000000000ec', '00000007-0000-0000-0000-000000000008', 27, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000e6', '00000003-0000-0000-0000-0000000000ed', '00000007-0000-0000-0000-000000000008', 28, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000e7', '00000003-0000-0000-0000-0000000000ee', '00000007-0000-0000-0000-000000000008', 29, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000e8', '00000003-0000-0000-0000-0000000000ef', '00000007-0000-0000-0000-000000000008', 30, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000e9', '00000003-0000-0000-0000-0000000000f0', '00000007-0000-0000-0000-000000000008', 31, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000ea', '00000003-0000-0000-0000-0000000000f1', '00000007-0000-0000-0000-000000000008', 32, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000eb', '00000003-0000-0000-0000-0000000000f2', '00000007-0000-0000-0000-000000000008', 33, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000ec', '00000003-0000-0000-0000-0000000000f3', '00000007-0000-0000-0000-000000000008', 34, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000ed', '00000003-0000-0000-0000-0000000000f4', '00000007-0000-0000-0000-000000000008', 35, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000ee', '00000003-0000-0000-0000-0000000000f5', '00000007-0000-0000-0000-000000000008', 36, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000ef', '00000003-0000-0000-0000-0000000000f6', '00000007-0000-0000-0000-000000000008', 37, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000f0', '00000003-0000-0000-0000-0000000000f7', '00000007-0000-0000-0000-000000000008', 38, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000f1', '00000003-0000-0000-0000-0000000000f8', '00000007-0000-0000-0000-000000000008', 39, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000f2', '00000003-0000-0000-0000-0000000000f9', '00000007-0000-0000-0000-000000000008', 40, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000f3', '00000003-0000-0000-0000-0000000000fa', '00000007-0000-0000-0000-000000000008', 41, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000f4', '00000003-0000-0000-0000-0000000000fb', '00000007-0000-0000-0000-000000000008', 42, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000f5', '00000003-0000-0000-0000-0000000000fc', '00000007-0000-0000-0000-000000000008', 43, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000f6', '00000003-0000-0000-0000-0000000000fd', '00000007-0000-0000-0000-000000000008', 44, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000f7', '00000003-0000-0000-0000-0000000000fe', '00000007-0000-0000-0000-000000000008', 45, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000f8', '00000003-0000-0000-0000-0000000000ff', '00000007-0000-0000-0000-000000000008', 46, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000f9', '00000003-0000-0000-0000-000000000100', '00000007-0000-0000-0000-000000000008', 47, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000fa', '00000003-0000-0000-0000-000000000101', '00000007-0000-0000-0000-000000000008', 48, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000fb', '00000003-0000-0000-0000-000000000102', '00000007-0000-0000-0000-000000000008', 49, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000fc', '00000003-0000-0000-0000-000000000103', '00000007-0000-0000-0000-000000000008', 50, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000fd', '00000003-0000-0000-0000-000000000104', '00000007-0000-0000-0000-000000000009', 1, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000fe', '00000003-0000-0000-0000-000000000105', '00000007-0000-0000-0000-000000000009', 2, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-0000000000ff', '00000003-0000-0000-0000-000000000106', '00000007-0000-0000-0000-000000000009', 3, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000100', '00000003-0000-0000-0000-000000000107', '00000007-0000-0000-0000-000000000009', 4, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000101', '00000003-0000-0000-0000-000000000108', '00000007-0000-0000-0000-000000000009', 5, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000102', '00000003-0000-0000-0000-000000000109', '00000007-0000-0000-0000-000000000009', 6, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000103', '00000003-0000-0000-0000-00000000010a', '00000007-0000-0000-0000-000000000009', 7, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000104', '00000003-0000-0000-0000-00000000010b', '00000007-0000-0000-0000-000000000009', 8, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000105', '00000003-0000-0000-0000-00000000010c', '00000007-0000-0000-0000-000000000009', 9, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000106', '00000003-0000-0000-0000-00000000010d', '00000007-0000-0000-0000-000000000009', 10, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000107', '00000003-0000-0000-0000-00000000010e', '00000007-0000-0000-0000-000000000009', 11, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000108', '00000003-0000-0000-0000-00000000010f', '00000007-0000-0000-0000-000000000009', 12, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000109', '00000003-0000-0000-0000-000000000110', '00000007-0000-0000-0000-000000000009', 13, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000010a', '00000003-0000-0000-0000-000000000111', '00000007-0000-0000-0000-000000000009', 14, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000010b', '00000003-0000-0000-0000-000000000112', '00000007-0000-0000-0000-000000000009', 15, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000010c', '00000003-0000-0000-0000-000000000113', '00000007-0000-0000-0000-000000000009', 16, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000010d', '00000003-0000-0000-0000-000000000114', '00000007-0000-0000-0000-000000000009', 17, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000010e', '00000003-0000-0000-0000-000000000115', '00000007-0000-0000-0000-000000000009', 18, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000010f', '00000003-0000-0000-0000-000000000116', '00000007-0000-0000-0000-000000000009', 19, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000110', '00000003-0000-0000-0000-000000000117', '00000007-0000-0000-0000-000000000009', 20, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000111', '00000003-0000-0000-0000-000000000118', '00000007-0000-0000-0000-000000000009', 21, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000112', '00000003-0000-0000-0000-000000000119', '00000007-0000-0000-0000-000000000009', 22, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000113', '00000003-0000-0000-0000-00000000011a', '00000007-0000-0000-0000-000000000009', 23, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000114', '00000003-0000-0000-0000-00000000011b', '00000007-0000-0000-0000-000000000009', 24, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000115', '00000003-0000-0000-0000-00000000011c', '00000007-0000-0000-0000-000000000009', 25, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000116', '00000003-0000-0000-0000-00000000011d', '00000007-0000-0000-0000-000000000009', 26, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000117', '00000003-0000-0000-0000-00000000011e', '00000007-0000-0000-0000-000000000009', 27, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000118', '00000003-0000-0000-0000-00000000011f', '00000007-0000-0000-0000-000000000009', 28, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000119', '00000003-0000-0000-0000-000000000120', '00000007-0000-0000-0000-000000000009', 29, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000011a', '00000003-0000-0000-0000-000000000121', '00000007-0000-0000-0000-000000000009', 30, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000011b', '00000003-0000-0000-0000-000000000122', '00000007-0000-0000-0000-000000000009', 31, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000011c', '00000003-0000-0000-0000-000000000123', '00000007-0000-0000-0000-000000000009', 32, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000011d', '00000003-0000-0000-0000-000000000124', '00000007-0000-0000-0000-000000000009', 33, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000011e', '00000003-0000-0000-0000-000000000125', '00000007-0000-0000-0000-000000000009', 34, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000011f', '00000003-0000-0000-0000-000000000126', '00000007-0000-0000-0000-000000000009', 35, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000120', '00000003-0000-0000-0000-000000000127', '00000007-0000-0000-0000-000000000009', 36, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000121', '00000003-0000-0000-0000-000000000128', '00000007-0000-0000-0000-000000000009', 37, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000122', '00000003-0000-0000-0000-000000000129', '00000007-0000-0000-0000-000000000009', 38, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000123', '00000003-0000-0000-0000-00000000012a', '00000007-0000-0000-0000-000000000009', 39, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000124', '00000003-0000-0000-0000-00000000012b', '00000007-0000-0000-0000-000000000009', 40, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000125', '00000003-0000-0000-0000-00000000012c', '00000007-0000-0000-0000-000000000009', 41, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000126', '00000003-0000-0000-0000-00000000012d', '00000007-0000-0000-0000-000000000009', 42, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000127', '00000003-0000-0000-0000-00000000012e', '00000007-0000-0000-0000-000000000009', 43, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000128', '00000003-0000-0000-0000-00000000012f', '00000007-0000-0000-0000-000000000009', 44, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-000000000129', '00000003-0000-0000-0000-000000000130', '00000007-0000-0000-0000-000000000009', 45, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000012a', '00000003-0000-0000-0000-000000000131', '00000007-0000-0000-0000-000000000009', 46, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000012b', '00000003-0000-0000-0000-000000000132', '00000007-0000-0000-0000-000000000009', 47, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000012c', '00000003-0000-0000-0000-000000000133', '00000007-0000-0000-0000-000000000009', 48, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000012d', '00000003-0000-0000-0000-000000000134', '00000007-0000-0000-0000-000000000009', 49, CURRENT_DATE, 'active'),
  ('00000008-0000-0000-0000-00000000012e', '00000003-0000-0000-0000-000000000135', '00000007-0000-0000-0000-000000000009', 50, CURRENT_DATE, 'active')
ON CONFLICT (id) DO NOTHING;

-- 9. class_subjects
INSERT INTO class_subjects (id, class_id, subject_id, instructor_id, lab_instructor_id)
VALUES 
  ('00000009-0000-0000-0000-000000000001', '00000007-0000-0000-0000-000000000001', '00000006-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000008'),
  ('00000009-0000-0000-0000-000000000002', '00000007-0000-0000-0000-000000000001', '00000006-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000004', '00000003-0000-0000-0000-000000000008')
ON CONFLICT (id) DO NOTHING;

-- 10. student_groups
INSERT INTO student_groups (id, class_id, name, description, created_by, created_at, assigned_pc_id)
VALUES 
  ('0000000a-0000-0000-0000-000000000001', '00000007-0000-0000-0000-000000000001', 'Alpha Coders', 'Computer Science Project Team Alpha', '00000003-0000-0000-0000-000000000003', NOW(), '0000000d-0000-0000-0000-000000000005'),
  ('0000000a-0000-0000-0000-000000000002', '00000007-0000-0000-0000-000000000001', 'Beta Quantum', 'Physics Lab Group Beta', '00000003-0000-0000-0000-000000000004', NOW(), '0000000d-0000-0000-0000-000000000006'),
  ('0000000a-0000-0000-0000-000000000003', '00000007-0000-0000-0000-000000000004', '11 NM A - Python Group Alpha', 'Core Python syntax and algorithmic problem solving', '00000003-0000-0000-0000-000000000003', NOW(), '0000000d-0000-0000-0000-000000000007'),
  ('0000000a-0000-0000-0000-000000000004', '00000007-0000-0000-0000-000000000004', '11 NM A - Python Group Beta', 'Data operations and procedural logic', '00000003-0000-0000-0000-000000000003', NOW(), '0000000d-0000-0000-0000-000000000008'),
  ('0000000a-0000-0000-0000-000000000005', '00000007-0000-0000-0000-000000000005', '11 NM B - Byte Knights', 'Python control flow and looping challenges', '00000003-0000-0000-0000-000000000004', NOW(), '0000000d-0000-0000-0000-000000000009'),
  ('0000000a-0000-0000-0000-000000000006', '00000007-0000-0000-0000-000000000005', '11 NM B - CodeCrafters', 'Mathematical modeling and logic builders', '00000003-0000-0000-0000-000000000004', NOW(), '0000000d-0000-0000-0000-00000000000a'),
  ('0000000a-0000-0000-0000-000000000007', '00000007-0000-0000-0000-000000000007', '12 NM A - Turing Titans', 'Advanced Python collections and dictionary structures', '00000003-0000-0000-0000-000000000003', NOW(), '0000000d-0000-0000-0000-00000000000b'),
  ('0000000a-0000-0000-0000-000000000008', '00000007-0000-0000-0000-000000000007', '12 NM A - Binary Beasts', 'Data structures, list comprehensions, and nested mapping', '00000003-0000-0000-0000-000000000003', NOW(), '0000000d-0000-0000-0000-00000000000c'),
  ('0000000a-0000-0000-0000-000000000009', '00000007-0000-0000-0000-000000000008', '12 NM B - Logic Legends', 'Set theory and tuple serialization in Python', '00000003-0000-0000-0000-000000000004', NOW(), '0000000d-0000-0000-0000-00000000000d'),
  ('0000000a-0000-0000-0000-00000000000a', '00000007-0000-0000-0000-000000000008', '12 NM B - Syntax Stars', 'Practical lab assessments and viva preparation', '00000003-0000-0000-0000-000000000004', NOW(), '0000000d-0000-0000-0000-00000000000e')
ON CONFLICT (id) DO NOTHING;

-- 11. group_members
INSERT INTO group_members (id, group_id, student_id, role, joined_at)
VALUES 
  ('0000000b-0000-0000-0000-000000000001', '0000000a-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', 'leader', NOW()),
  ('0000000b-0000-0000-0000-000000000002', '0000000a-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', 'member', NOW()),
  ('0000000b-0000-0000-0000-000000000003', '0000000a-0000-0000-0000-000000000003', '00000003-0000-0000-0000-00000000000a', 'leader', NOW()),
  ('0000000b-0000-0000-0000-000000000004', '0000000a-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000010', 'member', NOW()),
  ('0000000b-0000-0000-0000-000000000005', '0000000a-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000016', 'member', NOW()),
  ('0000000b-0000-0000-0000-000000000006', '0000000a-0000-0000-0000-000000000003', '00000003-0000-0000-0000-00000000001c', 'member', NOW()),
  ('0000000b-0000-0000-0000-000000000007', '0000000a-0000-0000-0000-000000000004', '00000003-0000-0000-0000-000000000022', 'leader', NOW()),
  ('0000000b-0000-0000-0000-000000000008', '0000000a-0000-0000-0000-000000000004', '00000003-0000-0000-0000-000000000028', 'member', NOW()),
  ('0000000b-0000-0000-0000-000000000009', '0000000a-0000-0000-0000-000000000004', '00000003-0000-0000-0000-00000000002e', 'member', NOW()),
  ('0000000b-0000-0000-0000-00000000000a', '0000000a-0000-0000-0000-000000000004', '00000003-0000-0000-0000-000000000034', 'member', NOW()),
  ('0000000b-0000-0000-0000-00000000000b', '0000000a-0000-0000-0000-000000000005', '00000003-0000-0000-0000-00000000000b', 'leader', NOW()),
  ('0000000b-0000-0000-0000-00000000000c', '0000000a-0000-0000-0000-000000000005', '00000003-0000-0000-0000-000000000011', 'member', NOW()),
  ('0000000b-0000-0000-0000-00000000000d', '0000000a-0000-0000-0000-000000000005', '00000003-0000-0000-0000-000000000017', 'member', NOW()),
  ('0000000b-0000-0000-0000-00000000000e', '0000000a-0000-0000-0000-000000000005', '00000003-0000-0000-0000-00000000001d', 'member', NOW()),
  ('0000000b-0000-0000-0000-00000000000f', '0000000a-0000-0000-0000-000000000006', '00000003-0000-0000-0000-000000000023', 'leader', NOW()),
  ('0000000b-0000-0000-0000-000000000010', '0000000a-0000-0000-0000-000000000006', '00000003-0000-0000-0000-000000000029', 'member', NOW()),
  ('0000000b-0000-0000-0000-000000000011', '0000000a-0000-0000-0000-000000000006', '00000003-0000-0000-0000-00000000002f', 'member', NOW()),
  ('0000000b-0000-0000-0000-000000000012', '0000000a-0000-0000-0000-000000000006', '00000003-0000-0000-0000-000000000035', 'member', NOW()),
  ('0000000b-0000-0000-0000-000000000013', '0000000a-0000-0000-0000-000000000007', '00000003-0000-0000-0000-00000000000c', 'leader', NOW()),
  ('0000000b-0000-0000-0000-000000000014', '0000000a-0000-0000-0000-000000000007', '00000003-0000-0000-0000-000000000012', 'member', NOW()),
  ('0000000b-0000-0000-0000-000000000015', '0000000a-0000-0000-0000-000000000007', '00000003-0000-0000-0000-000000000018', 'member', NOW()),
  ('0000000b-0000-0000-0000-000000000016', '0000000a-0000-0000-0000-000000000007', '00000003-0000-0000-0000-00000000001e', 'member', NOW()),
  ('0000000b-0000-0000-0000-000000000017', '0000000a-0000-0000-0000-000000000008', '00000003-0000-0000-0000-000000000024', 'leader', NOW()),
  ('0000000b-0000-0000-0000-000000000018', '0000000a-0000-0000-0000-000000000008', '00000003-0000-0000-0000-00000000002a', 'member', NOW()),
  ('0000000b-0000-0000-0000-000000000019', '0000000a-0000-0000-0000-000000000008', '00000003-0000-0000-0000-000000000030', 'member', NOW()),
  ('0000000b-0000-0000-0000-00000000001a', '0000000a-0000-0000-0000-000000000008', '00000003-0000-0000-0000-000000000036', 'member', NOW()),
  ('0000000b-0000-0000-0000-00000000001b', '0000000a-0000-0000-0000-000000000009', '00000003-0000-0000-0000-00000000000d', 'leader', NOW()),
  ('0000000b-0000-0000-0000-00000000001c', '0000000a-0000-0000-0000-000000000009', '00000003-0000-0000-0000-000000000013', 'member', NOW()),
  ('0000000b-0000-0000-0000-00000000001d', '0000000a-0000-0000-0000-000000000009', '00000003-0000-0000-0000-000000000019', 'member', NOW()),
  ('0000000b-0000-0000-0000-00000000001e', '0000000a-0000-0000-0000-000000000009', '00000003-0000-0000-0000-00000000001f', 'member', NOW()),
  ('0000000b-0000-0000-0000-00000000001f', '0000000a-0000-0000-0000-00000000000a', '00000003-0000-0000-0000-000000000025', 'leader', NOW()),
  ('0000000b-0000-0000-0000-000000000020', '0000000a-0000-0000-0000-00000000000a', '00000003-0000-0000-0000-00000000002b', 'member', NOW()),
  ('0000000b-0000-0000-0000-000000000021', '0000000a-0000-0000-0000-00000000000a', '00000003-0000-0000-0000-000000000031', 'member', NOW()),
  ('0000000b-0000-0000-0000-000000000022', '0000000a-0000-0000-0000-00000000000a', '00000003-0000-0000-0000-000000000037', 'member', NOW())
ON CONFLICT (id) DO NOTHING;

-- 12. labs
INSERT INTO labs (id, school_id, name, name_hindi, room_number, capacity, subject_id, incharge_id, created_at)
VALUES 
  ('0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'Computer Lab 1 (High Performance)', 'कंप्यूटर लैब 1', 'ROOM-101', 40, '00000006-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', NOW()),
  ('0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'Physics Optics & Mechanics Lab', 'भौतिकी प्रकाशिकी एवं यांत्रिकी लैब', 'ROOM-204', 35, '00000006-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000004', NOW()),
  ('0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'Chemistry Analytical Lab', 'रसायन विश्लेषणात्मक लैब', 'ROOM-302', 35, '00000006-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000004', NOW())
ON CONFLICT (id) DO NOTHING;

-- 13. lab_items
INSERT INTO lab_items (id, lab_id, school_id, item_type, item_number, brand, model_no, serial_no, specs, status, notes, purchase_date, warranty_end, created_at, updated_at, quantity, image_url)
VALUES 
  ('0000000d-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'laptop', 'LAP-001', 'Dell', 'Latitude 3520', 'SN-DELL-001', '{"ram": "16GB", "cpu": "Intel i5 11th Gen", "storage": "512GB SSD"}'::jsonb, 'available', 'Primary student coding laptop', NOW() - INTERVAL '6 months', NOW() + INTERVAL '18 months', NOW(), NOW(), 1, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853'),
  ('0000000d-0000-0000-0000-000000000002', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'laptop', 'LAP-002', 'Lenovo', 'ThinkPad E14', 'SN-LEN-002', '{"ram": "16GB", "cpu": "AMD Ryzen 5", "storage": "512GB SSD"}'::jsonb, 'issued', 'Issued to Instructor Rajesh', NOW() - INTERVAL '6 months', NOW() + INTERVAL '18 months', NOW(), NOW(), 1, 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed'),
  ('0000000d-0000-0000-0000-000000000003', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'multimeter', 'PHY-MM-01', 'Fluke', '115 Digital', 'SN-FLK-11501', '{"range": "600V", "accuracy": "0.5%"}'::jsonb, 'available', 'Physics digital multimeter', NOW() - INTERVAL '1 year', NOW() + INTERVAL '1 year', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000004', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'spectrophotometer', 'CHM-SPEC-01', 'Shimadzu', 'UV-1900', 'SN-SHM-19001', '{"range": "190-1100nm"}'::jsonb, 'maintenance', 'Periodic optical calibration underway', NOW() - INTERVAL '2 years', NOW() + INTERVAL '1 year', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000005', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-01', 'Dell', 'OptiPlex 7090', 'SN-CL1-01', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000006', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-02', 'HP', 'ProDesk 400 G7', 'SN-CL1-02', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000007', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-03', 'Lenovo', 'ThinkCentre M70q', 'SN-CL1-03', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000008', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-04', 'HP', 'ProDesk 400 G7', 'SN-CL1-04', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000009', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-05', 'Dell', 'OptiPlex 7090', 'SN-CL1-05', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000000a', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-06', 'Lenovo', 'ThinkCentre M70q', 'SN-CL1-06', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000000b', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-07', 'Dell', 'OptiPlex 7090', 'SN-CL1-07', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000000c', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-08', 'HP', 'ProDesk 400 G7', 'SN-CL1-08', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000000d', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-09', 'Lenovo', 'ThinkCentre M70q', 'SN-CL1-09', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000000e', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-10', 'HP', 'ProDesk 400 G7', 'SN-CL1-10', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000000f', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-11', 'Dell', 'OptiPlex 7090', 'SN-CL1-11', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000010', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-12', 'Lenovo', 'ThinkCentre M70q', 'SN-CL1-12', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000011', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-13', 'Dell', 'OptiPlex 7090', 'SN-CL1-13', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000012', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-14', 'HP', 'ProDesk 400 G7', 'SN-CL1-14', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000013', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-15', 'Lenovo', 'ThinkCentre M70q', 'SN-CL1-15', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000014', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-16', 'HP', 'ProDesk 400 G7', 'SN-CL1-16', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000015', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-17', 'Dell', 'OptiPlex 7090', 'SN-CL1-17', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000016', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-18', 'Lenovo', 'ThinkCentre M70q', 'SN-CL1-18', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000017', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-19', 'Dell', 'OptiPlex 7090', 'SN-CL1-19', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000018', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-20', 'HP', 'ProDesk 400 G7', 'SN-CL1-20', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000019', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-21', 'Lenovo', 'ThinkCentre M70q', 'SN-CL1-21', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000001a', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-22', 'HP', 'ProDesk 400 G7', 'SN-CL1-22', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000001b', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-23', 'Dell', 'OptiPlex 7090', 'SN-CL1-23', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000001c', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-24', 'Lenovo', 'ThinkCentre M70q', 'SN-CL1-24', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000001d', '0000000c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'pc', 'CL1-PC-25', 'Dell', 'OptiPlex 7090', 'SN-CL1-25', '{"processor": "Intel Core i7-11700", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Ubuntu 22.04 LTS / Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Primary student coding workstation', NOW() - INTERVAL '3 months', NOW() + INTERVAL '21 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000001e', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-01', 'Dell', 'ProDesk 400 G7', 'SN-PHY-01', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000001f', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-02', 'HP', 'ProDesk 400 G7', 'SN-PHY-02', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000020', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-03', 'Dell', 'ProDesk 400 G7', 'SN-PHY-03', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000021', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-04', 'HP', 'ProDesk 400 G7', 'SN-PHY-04', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000022', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-05', 'Dell', 'ProDesk 400 G7', 'SN-PHY-05', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000023', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-06', 'HP', 'ProDesk 400 G7', 'SN-PHY-06', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000024', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-07', 'Dell', 'ProDesk 400 G7', 'SN-PHY-07', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000025', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-08', 'HP', 'ProDesk 400 G7', 'SN-PHY-08', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000026', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-09', 'Dell', 'ProDesk 400 G7', 'SN-PHY-09', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000027', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-10', 'HP', 'ProDesk 400 G7', 'SN-PHY-10', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000028', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-11', 'Dell', 'ProDesk 400 G7', 'SN-PHY-11', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000029', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-12', 'HP', 'ProDesk 400 G7', 'SN-PHY-12', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000002a', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-13', 'Dell', 'ProDesk 400 G7', 'SN-PHY-13', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000002b', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-14', 'HP', 'ProDesk 400 G7', 'SN-PHY-14', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000002c', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-15', 'Dell', 'ProDesk 400 G7', 'SN-PHY-15', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000002d', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-16', 'HP', 'ProDesk 400 G7', 'SN-PHY-16', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000002e', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-17', 'Dell', 'ProDesk 400 G7', 'SN-PHY-17', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000002f', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-18', 'HP', 'ProDesk 400 G7', 'SN-PHY-18', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000030', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-19', 'Dell', 'ProDesk 400 G7', 'SN-PHY-19', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000031', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-20', 'HP', 'ProDesk 400 G7', 'SN-PHY-20', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000032', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-21', 'Dell', 'ProDesk 400 G7', 'SN-PHY-21', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000033', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-22', 'HP', 'ProDesk 400 G7', 'SN-PHY-22', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000034', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-23', 'Dell', 'ProDesk 400 G7', 'SN-PHY-23', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000035', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-24', 'HP', 'ProDesk 400 G7', 'SN-PHY-24', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000036', '0000000c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'pc', 'PHY-PC-25', 'Dell', 'ProDesk 400 G7', 'SN-PHY-25', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Physics simulation and instrument interfacing PC', NOW() - INTERVAL '4 months', NOW() + INTERVAL '20 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000037', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-01', 'Lenovo', 'OptiPlex 7090', 'SN-CHM-01', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000038', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-02', 'Dell', 'OptiPlex 7090', 'SN-CHM-02', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000039', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-03', 'Lenovo', 'OptiPlex 7090', 'SN-CHM-03', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000003a', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-04', 'Dell', 'OptiPlex 7090', 'SN-CHM-04', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000003b', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-05', 'Lenovo', 'OptiPlex 7090', 'SN-CHM-05', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000003c', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-06', 'Dell', 'OptiPlex 7090', 'SN-CHM-06', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000003d', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-07', 'Lenovo', 'OptiPlex 7090', 'SN-CHM-07', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000003e', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-08', 'Dell', 'OptiPlex 7090', 'SN-CHM-08', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000003f', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-09', 'Lenovo', 'OptiPlex 7090', 'SN-CHM-09', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000040', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-10', 'Dell', 'OptiPlex 7090', 'SN-CHM-10', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000041', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-11', 'Lenovo', 'OptiPlex 7090', 'SN-CHM-11', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000042', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-12', 'Dell', 'OptiPlex 7090', 'SN-CHM-12', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000043', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-13', 'Lenovo', 'OptiPlex 7090', 'SN-CHM-13', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000044', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-14', 'Dell', 'OptiPlex 7090', 'SN-CHM-14', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000045', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-15', 'Lenovo', 'OptiPlex 7090', 'SN-CHM-15', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000046', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-16', 'Dell', 'OptiPlex 7090', 'SN-CHM-16', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000047', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-17', 'Lenovo', 'OptiPlex 7090', 'SN-CHM-17', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000048', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-18', 'Dell', 'OptiPlex 7090', 'SN-CHM-18', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-000000000049', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-19', 'Lenovo', 'OptiPlex 7090', 'SN-CHM-19', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000004a', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-20', 'Dell', 'OptiPlex 7090', 'SN-CHM-20', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000004b', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-21', 'Lenovo', 'OptiPlex 7090', 'SN-CHM-21', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000004c', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-22', 'Dell', 'OptiPlex 7090', 'SN-CHM-22', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000004d', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-23', 'Lenovo', 'OptiPlex 7090', 'SN-CHM-23', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000004e', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-24', 'Dell', 'OptiPlex 7090', 'SN-CHM-24', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL),
  ('0000000d-0000-0000-0000-00000000004f', '0000000c-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'pc', 'CHM-PC-25', 'Lenovo', 'OptiPlex 7090', 'SN-CHM-25', '{"processor": "Intel Core i5-11400", "ram": "16GB DDR4", "storage": "512GB SSD", "os": "Windows 11 Pro", "monitor": "24 inch FHD IPS"}'::jsonb, 'active', 'Chemistry lab analytical and data modeling terminal', NOW() - INTERVAL '5 months', NOW() + INTERVAL '19 months', NOW(), NOW(), 1, NULL)
ON CONFLICT (id) DO NOTHING;

-- 14. lab_maintenance_history
INSERT INTO lab_maintenance_history (id, lab_id, action, reason, previous_status, new_status, started_at, ended_at, expected_end_date, performed_by_id, created_at)
VALUES 
  ('0000000e-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000001', 'Cable Upgrade', 'Upgrading CAT5e cables to CAT6 for Gigabit LAN', 'active', 'under_maintenance', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW(), '00000003-0000-0000-0000-000000000008', NOW()),
  ('0000000e-0000-0000-0000-000000000002', '0000000c-0000-0000-0000-000000000003', 'Fume Hood Service', 'Annual ventilation and HEPA filter replacement', 'active', 'maintenance', NOW() - INTERVAL '1 day', NULL, NOW() + INTERVAL '2 days', '00000003-0000-0000-0000-000000000008', NOW())
ON CONFLICT (id) DO NOTHING;

-- 15. item_maintenance_history
INSERT INTO item_maintenance_history (id, item_id, recorded_by, type, description, cost, vendor, part_name, resolved_at, created_at)
VALUES 
  ('0000000f-0000-0000-0000-000000000001', '0000000d-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000008', 'Battery Replacement', 'Replaced degraded lithium-ion battery under OEM warranty', 0.00, 'Dell Authorized Service', 'Battery 54Whr', NOW() - INTERVAL '10 days', NOW()),
  ('0000000f-0000-0000-0000-000000000002', '0000000d-0000-0000-0000-000000000004', '00000003-0000-0000-0000-000000000008', 'Optical Calibration', 'Recalibrated diffraction grating and optical detector', 4500.00, 'Shimadzu Precision Labs', 'Halogen Lamp Module', NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- 16. lab_event_history
INSERT INTO lab_event_history (id, lab_id, event_type, description, item_id, item_details, old_incharge_id, new_incharge_id, performed_by_id, created_at)
VALUES 
  ('00000010-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000001', 'AUDIT', 'Quarterly inventory audit verified all 40 terminals operational', '0000000d-0000-0000-0000-000000000001', '{"status": "verified"}'::jsonb, NULL, NULL, '00000003-0000-0000-0000-000000000001', NOW()),
  ('00000010-0000-0000-0000-000000000002', '0000000c-0000-0000-0000-000000000002', 'INCHARGE_ASSIGNMENT', 'Rajesh Kumar formally assigned lab in-charge for Physics Lab', NULL, NULL, '00000003-0000-0000-0000-000000000004', '00000003-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000001', NOW())
ON CONFLICT (id) DO NOTHING;

-- 17. lab_attendance
INSERT INTO lab_attendance (id, lab_id, class_id, student_id, date, status, marked_by, remarks, created_at)
VALUES 
  ('00000011-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000001', '00000007-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', CURRENT_DATE, 'present', '00000003-0000-0000-0000-000000000008', 'Completed experiment on terminal 12', NOW()),
  ('00000011-0000-0000-0000-000000000002', '0000000c-0000-0000-0000-000000000001', '00000007-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000006', CURRENT_DATE, 'present', '00000003-0000-0000-0000-000000000008', 'Completed experiment on terminal 14', NOW())
ON CONFLICT (id) DO NOTHING;

-- 18. lab_materials
INSERT INTO lab_materials (id, lab_id, name, name_hindi, description, unit, cost_per_unit, current_stock, minimum_stock, created_at)
VALUES 
  ('00000012-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000002', 'Copper Connection Wire (Gauge 22)', 'तांबे का कनेक्शन तार', 'Insulated wire reels for circuit experiments', 'piece', 150.00, 25, 5, NOW()),
  ('00000012-0000-0000-0000-000000000002', '0000000c-0000-0000-0000-000000000003', 'Hydrochloric Acid (0.1M)', 'हाइड्रोक्लोरिक एसिड', 'Analytical reagent grade HCl solution', 'ml', 0.85, 2500, 500, NOW())
ON CONFLICT (id) DO NOTHING;

-- 19. lab_material_usage
INSERT INTO lab_material_usage (id, material_id, student_id, quantity_used, usage_date, recorded_by, remarks, created_at)
VALUES 
  ('00000013-0000-0000-0000-000000000001', '00000012-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', 2, NOW(), '00000003-0000-0000-0000-000000000008', 'Used 2 pieces for Wheatstone bridge verification', NOW()),
  ('00000013-0000-0000-0000-000000000002', '00000012-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', 50, NOW(), '00000003-0000-0000-0000-000000000008', '50ml used for titration practical', NOW())
ON CONFLICT (id) DO NOTHING;

-- 20. laptop_issuances
INSERT INTO laptop_issuances (id, laptop_id, issued_to_id, issued_by_id, voucher_number, purpose, issued_at, expected_return_date, condition_on_issue, status, school_id, created_at, updated_at)
VALUES 
  ('00000014-0000-0000-0000-000000000001', '0000000d-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000008', 'VOUCH-2025-001', 'For lecture presentation and live coding demos', NOW() - INTERVAL '5 days', CURRENT_DATE + INTERVAL '30 days', 'excellent', 'issued', '00000001-0000-0000-0000-000000000001', NOW(), NOW()),
  ('00000014-0000-0000-0000-000000000002', '0000000d-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', '00000003-0000-0000-0000-000000000008', 'VOUCH-2025-002', 'For coding contest lab session', NOW() - INTERVAL '1 day', CURRENT_DATE + INTERVAL '2 days', 'good', 'issued', '00000001-0000-0000-0000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 21. equipment_shift_requests
INSERT INTO equipment_shift_requests (id, item_id, from_lab_id, to_lab_id, requested_by, approved_by, status, reason, admin_notes, requested_at, approved_at)
VALUES 
  ('00000015-0000-0000-0000-000000000001', '0000000d-0000-0000-0000-000000000003', '0000000c-0000-0000-0000-000000000002', '0000000c-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000001', 'approved', 'Need digital multimeter for computer hardware interfacing lab', 'Approved for 1 week', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),
  ('00000015-0000-0000-0000-000000000002', '0000000d-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000004', NULL, 'pending', 'Need spare laptop for sensor data acquisition', NULL, NOW() - INTERVAL '1 day', NULL)
ON CONFLICT (id) DO NOTHING;

-- 22. equipment_shift_history
INSERT INTO equipment_shift_history (id, item_id, from_lab_id, to_lab_id, shifted_by, approved_by, shift_request_id, notes, shifted_at)
VALUES 
  ('00000016-0000-0000-0000-000000000001', '0000000d-0000-0000-0000-000000000003', '0000000c-0000-0000-0000-000000000002', '0000000c-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000008', '00000003-0000-0000-0000-000000000001', '00000015-0000-0000-0000-000000000001', 'Multimeter securely relocated to Computer Lab', NOW() - INTERVAL '2 days'),
  ('00000016-0000-0000-0000-000000000002', '0000000d-0000-0000-0000-000000000003', '0000000c-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000008', '00000003-0000-0000-0000-000000000001', NULL, 'Returned multimeter back to Physics lab storage', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- 23. training_modules
INSERT INTO training_modules (id, school_id, title, title_hindi, description, language, board_aligned, class_level, total_units, total_exercises, is_published, academic_year_id, created_at, updated_at)
VALUES 
  ('00000017-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'Python Basics & Fundamentals', 'पायथन मूल बातें और बुनियादी सिद्धांत', 'Master Python syntax, primitive types (int, float, str, bool), standard input/output, type casting, and arithmetic expressions.', 'python', 'CBSE', 11, 2, 4, true, '00000002-0000-0000-0000-000000000002', NOW(), NOW()),
  ('00000017-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'Python Control Structures: Conditionals & Loops', 'पायथन नियंत्रण संरचनाएं: स्थितियां और लूप', 'Master boolean logic, conditional branching (if-elif-else), while loops, for loops with range(), and loop control statements.', 'python', 'CBSE', 11, 2, 4, true, '00000002-0000-0000-0000-000000000002', NOW(), NOW()),
  ('00000017-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'Python Collections: Lists, Tuples, Dictionaries & Sets', 'पायथन संग्रह: सूचियाँ, टुपल्स, शब्दकोश और सेट', 'Master core composite data structures: sequence indexing, slicing, list comprehensions, immutability, key-value mappings, and set operations.', 'python', 'CBSE', 12, 2, 4, true, '00000002-0000-0000-0000-000000000002', NOW(), NOW()),
  ('00000017-0000-0000-0000-000000000004', '00000001-0000-0000-0000-000000000001', 'JavaScript Interactive Web Lab', 'जावास्क्रिप्ट इंटरएक्टिव वेब लैब', 'Front-end development and DOM manipulation fundamentals', 'javascript', 'CBSE', 12, 2, 4, true, '00000002-0000-0000-0000-000000000002', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 24. training_units
INSERT INTO training_units (id, module_id, unit_number, title, description, expected_hours, unlock_threshold, sequence_order)
VALUES 
  -- Module 1 (Basics)
  ('00000018-0000-0000-0000-000000000001', '00000017-0000-0000-0000-000000000001', 1, 'Unit 1: Variables, Memory & Built-in Types', 'Understanding Python variables, dynamic typing, type conversion, and boolean evaluations.', 4, 80, 1),
  ('00000018-0000-0000-0000-000000000002', '00000017-0000-0000-0000-000000000001', 2, 'Unit 2: Standard I/O, Arithmetic & Comparison Operators', 'Interactive input with input(), formatted output with f-strings, arithmetic precedence, and relational operators.', 4, 80, 2),
  -- Module 2 (Control Structures)
  ('00000018-0000-0000-0000-000000000003', '00000017-0000-0000-0000-000000000002', 1, 'Unit 1: Decision Making & Branching (if-elif-else)', 'Nested condition evaluations, truthiness, short-circuit boolean logic, and ternary operator.', 4, 80, 1),
  ('00000018-0000-0000-0000-000000000004', '00000017-0000-0000-0000-000000000002', 2, 'Unit 2: Iteration with for & while Loops', 'Counted loops with range(), while loops, break, continue, pass, and loop else clauses.', 5, 80, 2),
  -- Module 3 (Collections)
  ('00000018-0000-0000-0000-000000000005', '00000017-0000-0000-0000-000000000003', 1, 'Unit 1: Lists & Tuples in Python', 'Indexing, slicing, appending, inserting, list comprehensions, tuple unpacking, and immutability.', 5, 80, 1),
  ('00000018-0000-0000-0000-000000000006', '00000017-0000-0000-0000-000000000003', 2, 'Unit 2: Dictionaries & Sets', 'Key-value mapping, dict methods, membership testing, set operations (union, intersection, difference).', 5, 80, 2),
  -- Module 4 (JS Web Lab)
  ('00000018-0000-0000-0000-000000000007', '00000017-0000-0000-0000-000000000004', 1, 'Unit 1: DOM Elements', 'Selecting elements, querySelector, and updating DOM tree nodes.', 4, 80, 1),
  ('00000018-0000-0000-0000-000000000008', '00000017-0000-0000-0000-000000000004', 2, 'Unit 2: Event Listeners & Async', 'Handling click events, bubbling, callbacks, and Promises.', 6, 80, 2)
ON CONFLICT (id) DO NOTHING;

-- 25. training_exercises
INSERT INTO training_exercises (id, unit_id, title, description, difficulty, scaffold_level, exercise_type, blooms_level, learning_objective, starter_code, solution_code, test_cases, hints, time_limit, sequence_order, xp_reward)
VALUES 
  ('00000019-0000-0000-0000-000000000001', '00000018-0000-0000-0000-000000000001', 'Calculate Circle Area', 'Write a function get_circle_area(radius) that computes and returns the area of a circle with pi = 3.14159.', 'easy', 'guided', 'coding', 'Apply', 'Master basic math expressions and function returns', 'def get_circle_area(radius):
    # Write code here
    pass', 'def get_circle_area(radius):
    return 3.14159 * radius * radius', '[{"input": "5", "expected": "78.53975"}, {"input": "10", "expected": "314.159"}]'::jsonb, '["Use formula Area = pi * r * r", "Return float value"]'::jsonb, 5, 1, 20),
  ('00000019-0000-0000-0000-000000000002', '00000018-0000-0000-0000-000000000002', 'Celsius to Fahrenheit Converter', 'Write a function c_to_f(celsius) that returns Fahrenheit using F = (C * 9/5) + 32.', 'easy', 'independent', 'coding', 'Apply', 'Formula translation and numeric type operators', 'def c_to_f(celsius):
    pass', 'def c_to_f(celsius):
    return (celsius * 9/5) + 32', '[{"input": "0", "expected": "32.0"}, {"input": "100", "expected": "212.0"}]'::jsonb, '["Multiply by 9/5 first then add 32"]'::jsonb, 5, 1, 25),
  ('00000019-0000-0000-0000-000000000003', '00000018-0000-0000-0000-000000000003', 'Leap Year Checker', 'Write a function is_leap_year(year) returning True if leap year (divisible by 4 and not 100, or divisible by 400).', 'medium', 'guided', 'coding', 'Analyze', 'Compound boolean logic and calendar math', 'def is_leap_year(year):
    pass', 'def is_leap_year(year):
    return (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)', '[{"input": "2024", "expected": "True"}, {"input": "1900", "expected": "False"}, {"input": "2000", "expected": "True"}]'::jsonb, '["Check % 400 first or (year % 4 == 0 and year % 100 != 0)"]'::jsonb, 10, 1, 30),
  ('00000019-0000-0000-0000-000000000004', '00000018-0000-0000-0000-000000000004', 'Sum of Even Numbers in Range', 'Write a function sum_even(n) returning sum of all even integers from 1 up to n inclusive.', 'medium', 'independent', 'coding', 'Analyze', 'For loops with range or modulo accumulator', 'def sum_even(n):
    pass', 'def sum_even(n):
    return sum(x for x in range(2, n + 1, 2))', '[{"input": "10", "expected": "30"}, {"input": "20", "expected": "110"}]'::jsonb, '["Use range(2, n + 1, 2) or loop with if x % 2 == 0"]'::jsonb, 10, 1, 30),
  ('00000019-0000-0000-0000-000000000005', '00000018-0000-0000-0000-000000000005', 'Remove Duplicates Preserving Order', 'Write a function unique_elements(nums) returning a new list with duplicates removed preserving order.', 'medium', 'independent', 'coding', 'Synthesize', 'List traversal and linear search/visited tracking', 'def unique_elements(nums):
    pass', 'def unique_elements(nums):
    seen = set()
    res = []
    for x in nums:
        if x not in seen:
            seen.add(x)
            res.append(x)
    return res', '[{"input": "[1, 2, 2, 3, 4, 3, 5]", "expected": "[1, 2, 3, 4, 5]"}]'::jsonb, '["Use a set for seen elements and list to keep order"]'::jsonb, 10, 1, 35),
  ('00000019-0000-0000-0000-000000000006', '00000018-0000-0000-0000-000000000006', 'Word Frequency Counter', 'Write a function count_words(text) returning a dictionary mapping each lowercase word to frequency.', 'medium', 'guided', 'coding', 'Synthesize', 'String splitting and dictionary frequency mapping', 'def count_words(text):
    pass', 'def count_words(text):
    words = text.lower().split()
    counts = {}
    for w in words:
        counts[w] = counts.get(w, 0) + 1
    return counts', '[{"input": ""apple banana apple orange banana apple"", "expected": "{"apple": 3, "banana": 2, "orange": 1}"}]'::jsonb, '["Use text.lower().split() then dict.get(w, 0) + 1"]'::jsonb, 10, 1, 35)
ON CONFLICT (id) DO NOTHING;

-- 26. coding_submissions
INSERT INTO coding_submissions (id, exercise_id, student_id, code, status, output, test_results, ai_socratic_review, submitted_at)
VALUES 
  ('0000001a-0000-0000-0000-000000000001', '00000019-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', 'def get_circle_area(radius):
    return 3.14159 * radius ** 2', 'passed', '78.53975', '{"passed": 1, "failed": 0}'::jsonb, 'Great job! Your solution handles precision correctly and uses exponentiation cleanly.', NOW() - INTERVAL '1 day'),
  ('0000001a-0000-0000-0000-000000000002', '00000019-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', 'def sum_even(n):
    total = 0
    for i in range(2, n + 1, 2):
        total += i
    return total', 'passed', '30', '{"passed": 1, "failed": 0}'::jsonb, 'Well structured iterative approach. Consider also looking into sum() with a generator!', NOW() - INTERVAL '12 hours')
ON CONFLICT (id) DO NOTHING;

-- 27. student_training_progress
INSERT INTO student_training_progress (id, student_id, module_id, current_unit_id, overall_progress, total_xp, streak, last_active_at, started_at)
VALUES 
  ('0000001b-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', '00000017-0000-0000-0000-000000000001', '00000018-0000-0000-0000-000000000002', 50.0, 120, 5, NOW(), NOW() - INTERVAL '7 days'),
  ('0000001b-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', '00000017-0000-0000-0000-000000000001', '00000018-0000-0000-0000-000000000001', 25.0, 60, 2, NOW(), NOW() - INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- 28. student_unit_mastery
INSERT INTO student_unit_mastery (id, student_id, unit_id, mastery_score, exercises_done, status, unlocked_at, mastered_at)
VALUES 
  ('0000001c-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', '00000018-0000-0000-0000-000000000001', 95.0, 2, 'mastered', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
  ('0000001c-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', '00000018-0000-0000-0000-000000000001', 70.0, 1, 'in_progress', NOW() - INTERVAL '3 days', NULL)
ON CONFLICT (id) DO NOTHING;

-- 29. assignments
INSERT INTO assignments (id, school_id, subject_id, lab_id, created_by, title, title_hindi, description, experiment_number, assignment_type, programming_language, aim, max_marks, passing_marks, viva_marks, practical_marks, output_marks, status, publish_date, due_date, created_at, updated_at, academic_year_id, training_module_id)
VALUES 
  ('0000001d-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', '00000006-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'Exp 1: Matrix Multiplication in Python', 'प्रयोग 1: पायथन में मैट्रिक्स गुणन', 'Implement 2D array multiplication and calculate time complexity', 'EXP-CS-01', 'program', 'Python', 'To learn multidimensional lists and nested loops in Python', 100, 40, 20, 50, 30, 'published', NOW() - INTERVAL '5 days', NOW() + INTERVAL '10 days', NOW(), NOW(), '00000002-0000-0000-0000-000000000002', NULL),
  ('0000001d-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', '00000006-0000-0000-0000-000000000002', '0000000c-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000004', 'Exp 2: Verification of Ohm Law', 'प्रयोग 2: ओम के नियम का सत्यापन', 'Record voltage vs current values across standard resistance and plot I-V curve', 'EXP-PHY-01', 'experiment', NULL, 'To experimentally verify Ohm Law and determine wire resistivity', 100, 40, 25, 50, 25, 'published', NOW() - INTERVAL '4 days', NOW() + INTERVAL '12 days', NOW(), NOW(), '00000002-0000-0000-0000-000000000002', NULL),
  ('0000001d-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', '00000006-0000-0000-0000-000000000003', '0000000c-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000004', 'Exp 3: Acid-Base Titration (HCl vs NaOH)', 'प्रयोग 3: अम्ल-क्षार अनुमापन', 'Determine the molarity of supplied HCl solution using 0.1M standard NaOH', 'EXP-CHM-01', 'experiment', NULL, 'To master burette titration and phenolphthalein end-point detection', 100, 40, 20, 60, 20, 'published', NOW() - INTERVAL '3 days', NOW() + INTERVAL '15 days', NOW(), NOW(), '00000002-0000-0000-0000-000000000002', NULL),
  -- Python Training Module Assignments
  ('0000001d-0000-0000-0000-000000000004', '00000001-0000-0000-0000-000000000001', '00000006-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'Training: Python Basics & Fundamentals', 'प्रशिक्षण: पायथन मूल बातें और बुनियादी सिद्धांत', 'Complete all interactive exercises in Python Basics & Fundamentals', NULL, 'training_module', 'Python', 'To master Python basic syntax, types, expressions, and standard IO', 100, 40, 20, 60, 20, 'published', NOW() - INTERVAL '2 days', NOW() + INTERVAL '30 days', NOW(), NOW(), '00000002-0000-0000-0000-000000000002', '00000017-0000-0000-0000-000000000001'),
  ('0000001d-0000-0000-0000-000000000005', '00000001-0000-0000-0000-000000000001', '00000006-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'Training: Python Control Structures: Conditionals & Loops', 'प्रशिक्षण: पायथन नियंत्रण संरचनाएं: स्थितियां और लूप', 'Complete all interactive exercises in Python Control Structures', NULL, 'training_module', 'Python', 'To master branching logic, iteration, range, and loops', 100, 40, 20, 60, 20, 'published', NOW() - INTERVAL '2 days', NOW() + INTERVAL '30 days', NOW(), NOW(), '00000002-0000-0000-0000-000000000002', '00000017-0000-0000-0000-000000000002'),
  ('0000001d-0000-0000-0000-000000000006', '00000001-0000-0000-0000-000000000001', '00000006-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'Training: Python Collections: Lists, Tuples, Dictionaries & Sets', 'प्रशिक्षण: पायथन संग्रह: सूचियाँ, टुपल्स, शब्दकोश और सेट', 'Complete all interactive exercises in Python Collections', NULL, 'training_module', 'Python', 'To master list operations, comprehensions, dictionaries, and sets', 100, 40, 20, 60, 20, 'published', NOW() - INTERVAL '2 days', NOW() + INTERVAL '30 days', NOW(), NOW(), '00000002-0000-0000-0000-000000000002', '00000017-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- 30. assignment_files
INSERT INTO assignment_files (id, assignment_id, file_name, file_type, file_size, file_url, uploaded_by, uploaded_at)
VALUES 
  ('0000001e-0000-0000-0000-000000000001', '0000001d-0000-0000-0000-000000000001', 'matrix_multiplication_guideline.pdf', 'application/pdf', 245000, 'https://cdn.example.com/assignments/matrix_guideline.pdf', '00000003-0000-0000-0000-000000000003', NOW()),
  ('0000001e-0000-0000-0000-000000000002', '0000001d-0000-0000-0000-000000000002', 'ohms_law_circuit_diagram.png', 'image/png', 512000, 'https://cdn.example.com/assignments/ohms_law_circuit.png', '00000003-0000-0000-0000-000000000004', NOW())
ON CONFLICT (id) DO NOTHING;

-- 31. assignment_targets
INSERT INTO assignment_targets (id, assignment_id, target_type, target_class_id, target_group_id, assigned_by, assigned_at, is_locked)
VALUES 
  ('0000001f-0000-0000-0000-000000000001', '0000001d-0000-0000-0000-000000000001', 'class', '00000007-0000-0000-0000-000000000001', NULL, '00000003-0000-0000-0000-000000000003', NOW(), false),
  ('0000001f-0000-0000-0000-000000000002', '0000001d-0000-0000-0000-000000000002', 'class', '00000007-0000-0000-0000-000000000001', NULL, '00000003-0000-0000-0000-000000000004', NOW(), false),
  -- Python Basics assigned to 11 NM A, 11 NM B, 11 Med A + groups
  ('0000001f-0000-0000-0000-000000000003', '0000001d-0000-0000-0000-000000000004', 'class', '00000007-0000-0000-0000-000000000004', NULL, '00000003-0000-0000-0000-000000000003', NOW(), false),
  ('0000001f-0000-0000-0000-000000000004', '0000001d-0000-0000-0000-000000000004', 'class', '00000007-0000-0000-0000-000000000005', NULL, '00000003-0000-0000-0000-000000000003', NOW(), false),
  ('0000001f-0000-0000-0000-000000000005', '0000001d-0000-0000-0000-000000000004', 'class', '00000007-0000-0000-0000-000000000006', NULL, '00000003-0000-0000-0000-000000000003', NOW(), false),
  ('0000001f-0000-0000-0000-000000000006', '0000001d-0000-0000-0000-000000000004', 'group', NULL, '0000000a-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000003', NOW(), false),
  ('0000001f-0000-0000-0000-000000000007', '0000001d-0000-0000-0000-000000000004', 'group', NULL, '0000000a-0000-0000-0000-000000000004', '00000003-0000-0000-0000-000000000003', NOW(), false),
  -- Python Control Structures assigned to 11 NM A, 11 NM B, 12 NM A + groups
  ('0000001f-0000-0000-0000-000000000008', '0000001d-0000-0000-0000-000000000005', 'class', '00000007-0000-0000-0000-000000000004', NULL, '00000003-0000-0000-0000-000000000003', NOW(), false),
  ('0000001f-0000-0000-0000-000000000009', '0000001d-0000-0000-0000-000000000005', 'class', '00000007-0000-0000-0000-000000000005', NULL, '00000003-0000-0000-0000-000000000003', NOW(), false),
  ('0000001f-0000-0000-0000-00000000000a', '0000001d-0000-0000-0000-000000000005', 'class', '00000007-0000-0000-0000-000000000007', NULL, '00000003-0000-0000-0000-000000000003', NOW(), false),
  ('0000001f-0000-0000-0000-00000000000b', '0000001d-0000-0000-0000-000000000005', 'group', NULL, '0000000a-0000-0000-0000-000000000005', '00000003-0000-0000-0000-000000000003', NOW(), false),
  ('0000001f-0000-0000-0000-00000000000c', '0000001d-0000-0000-0000-000000000005', 'group', NULL, '0000000a-0000-0000-0000-000000000006', '00000003-0000-0000-0000-000000000003', NOW(), false),
  -- Python Collections assigned to 12 NM A, 12 NM B, 12 Med A + groups
  ('0000001f-0000-0000-0000-00000000000d', '0000001d-0000-0000-0000-000000000006', 'class', '00000007-0000-0000-0000-000000000007', NULL, '00000003-0000-0000-0000-000000000003', NOW(), false),
  ('0000001f-0000-0000-0000-00000000000e', '0000001d-0000-0000-0000-000000000006', 'class', '00000007-0000-0000-0000-000000000008', NULL, '00000003-0000-0000-0000-000000000003', NOW(), false),
  ('0000001f-0000-0000-0000-00000000000f', '0000001d-0000-0000-0000-000000000006', 'class', '00000007-0000-0000-0000-000000000009', NULL, '00000003-0000-0000-0000-000000000003', NOW(), false),
  ('0000001f-0000-0000-0000-000000000010', '0000001d-0000-0000-0000-000000000006', 'group', NULL, '0000000a-0000-0000-0000-000000000007', '00000003-0000-0000-0000-000000000003', NOW(), false),
  ('0000001f-0000-0000-0000-000000000011', '0000001d-0000-0000-0000-000000000006', 'group', NULL, '0000000a-0000-0000-0000-000000000008', '00000003-0000-0000-0000-000000000003', NOW(), false)
ON CONFLICT (id) DO NOTHING;

-- 32. submissions
INSERT INTO submissions (id, assignment_id, student_id, code_content, output_content, observations, conclusion, submission_number, is_late, late_days, status, submitted_at, last_modified)
VALUES 
  ('00000020-0000-0000-0000-000000000001', '0000001d-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', 'def matmul(A, B):
    return [[sum(a*b for a,b in zip(X_row, Y_col)) for Y_col in zip(*B)] for X_row in A]

print(matmul([[1,2],[3,4]], [[5,6],[7,8]]))', '[[19, 22], [43, 50]]', 'Algorithm works with O(N^3) complexity', 'Matrix multiplication verified successfully with test matrices', 1, false, 0, 'graded', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('00000020-0000-0000-0000-000000000002', '0000001d-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', NULL, NULL, 'V (Volts): [0.5, 1.0, 1.5, 2.0], I (Amps): [0.05, 0.10, 0.15, 0.20]', 'Graph is linear with slope R = 10 Ohms. Ohms Law is verified.', 1, false, 0, 'graded', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- 33. submission_files
INSERT INTO submission_files (id, submission_id, file_name, file_type, file_size, file_url, is_output, uploaded_at)
VALUES 
  ('00000021-0000-0000-0000-000000000001', '00000020-0000-0000-0000-000000000001', 'matrix_result_screenshot.png', 'image/png', 185000, 'https://cdn.example.com/submissions/matrix_run.png', true, NOW() - INTERVAL '2 days'),
  ('00000021-0000-0000-0000-000000000002', '00000020-0000-0000-0000-000000000002', 'vi_graph_plot.pdf', 'application/pdf', 320000, 'https://cdn.example.com/submissions/vi_graph.pdf', false, NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- 34. submission_revisions
INSERT INTO submission_revisions (id, submission_id, revision_number, code_content, output_content, revision_note, created_at)
VALUES 
  ('00000022-0000-0000-0000-000000000001', '00000020-0000-0000-0000-000000000001', 1, 'def matmul(A, B):
    return [[sum(a*b for a,b in zip(X_row, Y_col)) for Y_col in zip(*B)] for X_row in A]', '[[19, 22], [43, 50]]', 'Initial clean implementation using list comprehensions', NOW() - INTERVAL '2 days'),
  ('00000022-0000-0000-0000-000000000002', '00000020-0000-0000-0000-000000000002', 1, NULL, NULL, 'Initial experimental readings upload with graph', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- 35. grades
INSERT INTO grades (id, submission_id, student_id, graded_by, practical_marks, output_marks, viva_marks, total_marks, max_marks, percentage, grade_letter, late_penalty_marks, final_marks, code_feedback, general_remarks, is_published, published_at, graded_at, academic_year_id)
VALUES 
  ('00000023-0000-0000-0000-000000000001', '00000020-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', '00000003-0000-0000-0000-000000000003', 48.0, 29.0, 18.0, 95.0, 100.0, 95.0, 'A+', 0.0, 95.0, 'Excellent use of zip and list comprehension', 'Outstanding work on matrix operations', true, NOW(), NOW() - INTERVAL '1 day', '00000002-0000-0000-0000-000000000002'),
  ('00000023-0000-0000-0000-000000000002', '00000020-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', '00000003-0000-0000-0000-000000000004', 46.0, 24.0, 22.0, 92.0, 100.0, 92.0, 'A+', 0.0, 92.0, NULL, 'Accurate slope calculation on V-I graph', true, NOW(), NOW() - INTERVAL '12 hours', '00000002-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- 36. grade_history
INSERT INTO grade_history (id, grade_id, previous_marks, new_marks, reason, modified_by, modified_at)
VALUES 
  ('00000024-0000-0000-0000-000000000001', '00000023-0000-0000-0000-000000000001', '{"total": 92}'::jsonb, '{"total": 95}'::jsonb, 'Recorrected viva question 2 score', '00000003-0000-0000-0000-000000000003', NOW()),
  ('00000024-0000-0000-0000-000000000002', '00000023-0000-0000-0000-000000000002', '{"total": 90}'::jsonb, '{"total": 92}'::jsonb, 'Bonus marks for comprehensive error analysis', '00000003-0000-0000-0000-000000000004', NOW())
ON CONFLICT (id) DO NOTHING;

-- 37. final_lab_marks
INSERT INTO final_lab_marks (id, student_id, subject_id, class_id, academic_year_id, total_assignments, completed_assignments, internal_marks, viva_average, practical_exam_marks, total_marks, max_marks, percentage, grade_letter, grade_points, remarks, is_pass, finalized_by, finalized_at)
VALUES 
  ('00000025-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', '00000006-0000-0000-0000-000000000001', '00000007-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', 10, 10, 20.0, 19.0, 56.0, 95.0, 100.0, 95.0, 'A+', 9.80, 'Distinction in computer laboratory practicals', true, '00000003-0000-0000-0000-000000000003', NOW()),
  ('00000025-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', '00000006-0000-0000-0000-000000000002', '00000007-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', 10, 9, 18.0, 18.5, 54.0, 90.5, 100.0, 90.5, 'A+', 9.50, 'Excellent experimental precision', true, '00000003-0000-0000-0000-000000000004', NOW())
ON CONFLICT (id) DO NOTHING;

-- 38. document_folders
INSERT INTO document_folders (id, school_id, parent_id, name, created_by, created_at, updated_at)
VALUES 
  ('00000026-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', NULL, 'CBSE Curriculum & Syllabi 2025-26', '00000003-0000-0000-0000-000000000001', NOW(), NOW()),
  ('00000026-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', NULL, 'Lab Safety & Operating Manuals', '00000003-0000-0000-0000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 39. documents
INSERT INTO documents (id, school_id, uploaded_by, folder_id, name, description, file_name, file_type, mime_type, file_size, cloudinary_id, url, is_public, category, created_at, updated_at)
VALUES 
  ('00000027-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', '00000026-0000-0000-0000-000000000001', 'Class 11 Computer Science Syllabus', 'Official syllabus breakdown and practical mark distribution', 'cbse_cs11_syllabus.pdf', 'pdf', 'application/pdf', 1048576, 'docs/cs11_syl', 'https://res.cloudinary.com/dn9vokfx5/raw/upload/v1/docs/cs11_syl.pdf', true, 'Syllabus', NOW(), NOW()),
  ('00000027-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000008', '00000026-0000-0000-0000-000000000002', 'Chemical Handling Safety Protocol', 'Standard operating procedures for chemical reagents and emergency eyewash', 'chem_safety_sop.pdf', 'pdf', 'application/pdf', 2097152, 'docs/chem_sop', 'https://res.cloudinary.com/dn9vokfx5/raw/upload/v1/docs/chem_sop.pdf', true, 'Safety', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 40. document_shares
INSERT INTO document_shares (id, document_id, shared_by_id, target_type, target_class_id, message, permission, shared_at)
VALUES 
  ('00000028-0000-0000-0000-000000000001', '00000027-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'class', '00000007-0000-0000-0000-000000000001', 'Please download and review unit milestones', 'download', NOW()),
  ('00000028-0000-0000-0000-000000000002', '00000027-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000008', 'class', '00000007-0000-0000-0000-000000000001', 'Mandatory safety protocol for all chemistry practicals', 'download', NOW())
ON CONFLICT (id) DO NOTHING;

-- 41. folder_shares
INSERT INTO folder_shares (id, folder_id, shared_by_id, target_type, target_class_id, message, permission, shared_at)
VALUES 
  ('00000029-0000-0000-0000-000000000001', '00000026-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 'class', '00000007-0000-0000-0000-000000000001', 'Shared curriculum folder for Class 11', 'download', NOW()),
  ('00000029-0000-0000-0000-000000000002', '00000026-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000001', 'class', '00000007-0000-0000-0000-000000000001', 'All lab safety manuals and SOPs', 'download', NOW())
ON CONFLICT (id) DO NOTHING;

-- 42. document_view_logs
INSERT INTO document_view_logs (id, document_id, user_id, viewed_at, ip_address)
VALUES 
  ('0000002a-0000-0000-0000-000000000001', '00000027-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', NOW() - INTERVAL '2 hours', '192.168.1.101'),
  ('0000002a-0000-0000-0000-000000000002', '00000027-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', NOW() - INTERVAL '1 hour', '192.168.1.102')
ON CONFLICT (id) DO NOTHING;

-- 43. whiteboard_files
INSERT INTO whiteboard_files (id, school_id, owner_id, title, description, canvas_data, page_count, is_archived, created_at, updated_at)
VALUES 
  ('0000002b-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'Computer Architecture & Von Neumann Model', 'Class lecture whiteboard diagram showing CPU, ALU, and Registers', '{"elements": [{"type": "rectangle", "x": 100, "y": 100, "width": 200, "height": 100, "label": "CPU"}]}', 1, false, NOW(), NOW()),
  ('0000002b-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000004', 'Ray Optics Lens Formula Derivation', 'Convex lens ray tracing diagram with object, focal point, and virtual image', '{"elements": [{"type": "line", "x1": 50, "y1": 200, "x2": 400, "y2": 200}]}', 1, false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 44. whiteboard_sessions
INSERT INTO whiteboard_sessions (id, school_id, host_id, title, status, target_type, meeting_code, target_class_id, started_at, duration_minutes, canvas_data, created_at)
VALUES 
  ('0000002c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'Live CS Lab Session: Sorting Algorithms', 'ended', 'class', 'WBCS101', '00000007-0000-0000-0000-000000000001', NOW() - INTERVAL '3 hours', 45, '{"elements": []}', NOW()),
  ('0000002c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000004', 'Live Physics Problem Solving: Circuits', 'active', 'class', 'WBPH202', '00000007-0000-0000-0000-000000000001', NOW() - INTERVAL '20 minutes', 60, '{"elements": []}', NOW())
ON CONFLICT (id) DO NOTHING;

-- 45. whiteboard_participants
INSERT INTO whiteboard_participants (id, session_id, user_id, role, joined_at, is_active)
VALUES 
  ('0000002d-0000-0000-0000-000000000001', '0000002c-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', 'viewer', NOW() - INTERVAL '3 hours', false),
  ('0000002d-0000-0000-0000-000000000002', '0000002c-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', 'viewer', NOW() - INTERVAL '20 minutes', true)
ON CONFLICT (id) DO NOTHING;

-- 46. whiteboard_recordings
INSERT INTO whiteboard_recordings (id, user_id, school_id, title, description, session_id, cloudinary_id, cloudinary_url, duration, file_size, is_public, share_token, created_at)
VALUES 
  ('0000002e-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', '00000001-0000-0000-0000-000000000001', 'Sorting Algorithms Animated Walkthrough', 'Step-by-step trace of Bubble sort vs Quick sort', '0000002c-0000-0000-0000-000000000001', 'wb_rec/sorting_demo', 'https://res.cloudinary.com/dn9vokfx5/video/upload/v1/wb_rec/sorting_demo.mp4', 2700, 15480000, true, 'tok_rec_sort_001', NOW()),
  ('0000002e-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000004', '00000001-0000-0000-0000-000000000001', 'Kirchhoff Laws Circuit Solution', 'Solving complex multi-loop circuit equations', '0000002c-0000-0000-0000-000000000002', 'wb_rec/circuits_demo', 'https://res.cloudinary.com/dn9vokfx5/video/upload/v1/wb_rec/circuits_demo.mp4', 3600, 22100000, true, 'tok_rec_circ_002', NOW())
ON CONFLICT (id) DO NOTHING;

-- 47. whiteboard_recording_shares
INSERT INTO whiteboard_recording_shares (id, recording_id, shared_by_id, target_type, target_class_id, message, shared_at)
VALUES 
  ('0000002f-0000-0000-0000-000000000001', '0000002e-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'class', '00000007-0000-0000-0000-000000000001', 'Recording of sorting walkthrough for revision', NOW()),
  ('0000002f-0000-0000-0000-000000000002', '0000002e-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000004', 'class', '00000007-0000-0000-0000-000000000001', 'Watch circuit problem solving before tomorrow quiz', NOW())
ON CONFLICT (id) DO NOTHING;

-- 48. vendors
INSERT INTO vendors (id, name, contact_person, email, phone, address, gstin, is_local, school_id, created_at, updated_at)
VALUES 
  ('00000030-0000-0000-0000-000000000001', 'Apex Scientific Instruments Pvt Ltd', 'Anil Mehta', 'sales@apexscientific.in', '+91 9811223344', 'Plot 42, Okhla Industrial Area Phase 3, New Delhi', '07AAACA1234A1Z5', true, '00000001-0000-0000-0000-000000000001', NOW(), NOW()),
  ('00000030-0000-0000-0000-000000000002', 'Silicon Edge Computech Ltd', 'Rohit Aggarwal', 'enterprise@siliconedge.com', '+91 9822334455', 'Tower B, Cyber City, Gurugram', '06AAACS5678B2Z6', true, '00000001-0000-0000-0000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 49. procurement_requests
INSERT INTO procurement_requests (id, title, description, purpose, department, budget_code, current_step, estimated_total, approved_total, status, created_by_id, approved_by_id, approved_at, school_id, created_at, updated_at)
VALUES 
  ('00000031-0000-0000-0000-000000000001', 'Lab Computer Upgrades (20 Units)', 'Procurement of 20 Core i7 desktop workstations for Computer Lab 1', 'Replace aged 4th gen desktop machines', 'Computer Science', 'BUD-CS-2025', 4, 1200000.00, 1150000.00, 'approved', '00000003-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000002', NOW() - INTERVAL '10 days', '00000001-0000-0000-0000-000000000001', NOW(), NOW()),
  ('00000031-0000-0000-0000-000000000002', 'Precision Optics & Spectrometer Kit', 'Purchase of high-accuracy optical spectrometers for Physics Lab', 'Mandatory for CBSE Class 12 Advanced Optics', 'Physics', 'BUD-PHY-2025', 2, 450000.00, NULL, 'quotation_requested', '00000003-0000-0000-0000-000000000004', NULL, NULL, '00000001-0000-0000-0000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 50. procurement_items
INSERT INTO procurement_items (id, request_id, item_name, description, specifications, quantity, unit, estimated_unit_price, approved_unit_price, approved_vendor_id, is_received, received_qty, created_at)
VALUES 
  ('00000032-0000-0000-0000-000000000001', '00000031-0000-0000-0000-000000000001', 'Desktop Workstation i7', 'Complete tower with 24-inch IPS monitor, keyboard and mouse', 'Intel i7-13700, 16GB DDR5, 512GB NVMe, Ubuntu 22.04 LTS', 20, 'pcs', 60000.00, 57500.00, '00000030-0000-0000-0000-000000000002', false, 0, NOW()),
  ('00000032-0000-0000-0000-000000000002', '00000031-0000-0000-0000-000000000002', 'Digital Optical Spectrometer', 'High resolution diffraction grating spectrometer', '380-780nm range, USB connectivity, calibration software included', 5, 'pcs', 90000.00, NULL, NULL, false, 0, NOW())
ON CONFLICT (id) DO NOTHING;

-- 51. procurement_committee
INSERT INTO procurement_committee (id, request_id, user_id, role, designation, added_at)
VALUES 
  ('00000033-0000-0000-0000-000000000001', '00000031-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 'chairman', 'Administrative Officer', NOW()),
  ('00000033-0000-0000-0000-000000000002', '00000031-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000007', 'member', 'Senior Accountant', NOW())
ON CONFLICT (id) DO NOTHING;

-- 52. vendor_quotations
INSERT INTO vendor_quotations (id, request_id, vendor_id, quotation_number, quotation_date, valid_until, total_amount, terms, remarks, created_at)
VALUES 
  ('00000034-0000-0000-0000-000000000001', '00000031-0000-0000-0000-000000000001', '00000030-0000-0000-0000-000000000002', 'QT-SEC-2025-089', CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '45 days', 1150000.00, '30 days payment upon delivery and physical inspection; 3-year onsite warranty included', 'Best commercial quote received', NOW()),
  ('00000034-0000-0000-0000-000000000002', '00000031-0000-0000-0000-000000000002', '00000030-0000-0000-0000-000000000001', 'QT-APX-2025-042', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', 435000.00, 'Payment 50% advance, 50% post installation and calibration check', 'Includes 1-day teacher training', NOW())
ON CONFLICT (id) DO NOTHING;

-- 53. quotation_items
INSERT INTO quotation_items (id, quotation_id, procurement_item_id, unit_price, quantity, total_price, remarks)
VALUES 
  ('00000035-0000-0000-0000-000000000001', '00000034-0000-0000-0000-000000000001', '00000032-0000-0000-0000-000000000001', 57500.00, 20, 1150000.00, 'Unit price includes bulk educational discount'),
  ('00000035-0000-0000-0000-000000000002', '00000034-0000-0000-0000-000000000002', '00000032-0000-0000-0000-000000000002', 87000.00, 5, 435000.00, 'Special institutional pricing with calibration certificates')
ON CONFLICT (id) DO NOTHING;

-- 54. ticket_issue_types
INSERT INTO ticket_issue_types (id, category, name, description, display_order, is_active, created_at)
VALUES 
  ('00000036-0000-0000-0000-000000000001', 'hardware_issue', 'Display / Monitor Flickering', 'Monitor shows lines, artifacts or fails to power on', 1, true, NOW()),
  ('00000036-0000-0000-0000-000000000002', 'software_issue', 'Operating System / Boot Error', 'Grub failure, blue screen or system freezing on startup', 2, true, NOW()),
  ('00000036-0000-0000-0000-000000000003', 'maintenance_request', 'AC Cooling / Air Circulation', 'Lab temperature exceeding equipment threshold', 3, true, NOW()),
  ('00000036-0000-0000-0000-000000000004', 'general_complaint', 'Projector Audio Muted', 'Interactive whiteboard audio not routing through classroom speakers', 4, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 55. tickets
INSERT INTO tickets (id, ticket_number, title, description, category, priority, status, item_id, lab_id, issue_type_id, created_by_id, assigned_to_id, created_at, updated_at)
VALUES 
  ('00000037-0000-0000-0000-000000000001', 'TCK-2025-001', 'Terminal 14 Keyboard Not Responding', 'Keys spacebar and enter fail to register input during student lab session', 'hardware_issue', 'medium', 'open', '0000000d-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000001', '00000036-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000008', NOW(), NOW()),
  ('00000037-0000-0000-0000-000000000002', 'TCK-2025-002', 'Python 3.11 Environment Broken on Node 08', 'Virtualenv corrupted following recent package update', 'software_issue', 'high', 'in_progress', '0000000d-0000-0000-0000-000000000002', '0000000c-0000-0000-0000-000000000001', '00000036-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000003', '00000003-0000-0000-0000-000000000008', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 56. ticket_comments
INSERT INTO ticket_comments (id, ticket_id, user_id, content, created_at)
VALUES 
  ('00000038-0000-0000-0000-000000000001', '00000037-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000008', 'Inspected hardware. USB connector pins bent. Swapping with spare USB keyboard from inventory.', NOW()),
  ('00000038-0000-0000-0000-000000000002', '00000037-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000008', 'Rebuilt python virtualenv and re-installed numpy and matplotlib. Running verification tests now.', NOW())
ON CONFLICT (id) DO NOTHING;

-- 57. timetables
INSERT INTO timetables (id, school_id, class_id, academic_year_id, name, effective_from, is_active, created_at, updated_at)
VALUES 
  ('00000039-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', '00000007-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', 'Class 11-A Weekly Timetable (Odd Semester)', '2025-04-01', true, NOW(), NOW()),
  ('00000039-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', '00000007-0000-0000-0000-000000000002', '00000002-0000-0000-0000-000000000002', 'Class 11-B Weekly Timetable (Odd Semester)', '2025-04-01', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 58. timetable_slots
INSERT INTO timetable_slots (id, timetable_id, day_of_week, period_number, start_time, end_time, subject_id, instructor_id, room_number, slot_type, created_at)
VALUES 
  ('0000003a-0000-0000-0000-000000000001', '00000039-0000-0000-0000-000000000001', 'monday', 1, '08:30', '09:15', '00000006-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'ROOM-101', 'lecture', NOW()),
  ('0000003a-0000-0000-0000-000000000002', '00000039-0000-0000-0000-000000000001', 'monday', 2, '09:15', '10:00', '00000006-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'ROOM-101', 'lab', NOW()),
  ('0000003a-0000-0000-0000-000000000003', '00000039-0000-0000-0000-000000000001', 'tuesday', 1, '08:30', '09:15', '00000006-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000004', 'ROOM-204', 'lecture', NOW()),
  ('0000003a-0000-0000-0000-000000000004', '00000039-0000-0000-0000-000000000001', 'tuesday', 2, '09:15', '10:00', '00000006-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000004', 'ROOM-204', 'lab', NOW())
ON CONFLICT (id) DO NOTHING;

-- 59. school_calendar
INSERT INTO school_calendar (id, school_id, academic_year_id, date, title, title_hindi, type, is_holiday, start_time, end_time, description, source, created_by_id, created_at)
VALUES 
  ('0000003b-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', '2025-08-15', 'Independence Day Celebration', 'स्वतंत्रता दिवस समारोह', 'gazetted_holiday', true, '08:00', '11:00', 'National holiday flag hoisting ceremony and cultural events', 'punjab_govt', '00000003-0000-0000-0000-000000000001', NOW()),
  ('0000003b-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', '2025-10-02', 'Gandhi Jayanti', 'गांधी जयंती', 'gazetted_holiday', true, '00:00', '23:59', 'Birth anniversary of Mahatma Gandhi', 'punjab_govt', '00000003-0000-0000-0000-000000000001', NOW())
ON CONFLICT (id) DO NOTHING;

-- 60. lecture_plans
INSERT INTO lecture_plans (id, school_id, instructor_id, subject_id, class_id, academic_year_id, title, title_hindi, description, lecture_number, scheduled_date, scheduled_duration, lecture_type, status, created_at, updated_at)
VALUES 
  ('0000003c-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', '00000006-0000-0000-0000-000000000001', '00000007-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', 'Introduction to Dynamic Programming', 'डायनामिक प्रोग्रामिंग का परिचय', 'Memoization vs Tabulation with Fibonacci and Knapsack examples', 14, CURRENT_DATE, 45, 'theory', 'completed', NOW(), NOW()),
  ('0000003c-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000004', '00000006-0000-0000-0000-000000000002', '00000007-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', 'Electromagnetic Induction & Faraday Law', 'विद्युत चुम्बकीय प्रेरण और फैराडे का नियम', 'Magnetic flux change and induced EMF with Lenz Law applications', 15, CURRENT_DATE + INTERVAL '1 day', 45, 'theory', 'planned', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 61. lecture_sessions
INSERT INTO lecture_sessions (id, lecture_plan_id, started_at, ended_at, actual_duration, attendance_count, topics_covered, instructor_remarks, status)
VALUES 
  ('0000003d-0000-0000-0000-000000000001', '0000003c-0000-0000-0000-000000000001', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 15 minutes', 45, 2, '["Fibonacci Series", "Top-down memoization", "Bottom-up table"]'::jsonb, 'Class showed high engagement during recursive call stack visualization', 'completed'),
  ('0000003d-0000-0000-0000-000000000002', '0000003c-0000-0000-0000-000000000002', NOW() - INTERVAL '30 minutes', NULL, NULL, 2, '["Magnetic flux definition", "Faraday experiment"]'::jsonb, 'Session ongoing in smart classroom', 'active')
ON CONFLICT (id) DO NOTHING;

-- 62. lecture_resources
INSERT INTO lecture_resources (id, lecture_plan_id, lecture_session_id, title, type, url, file_size, mime_type, uploaded_by_id, sequence_order, created_at)
VALUES 
  ('0000003e-0000-0000-0000-000000000001', '0000003c-0000-0000-0000-000000000001', '0000003d-0000-0000-0000-000000000001', 'DP Lecture Slides (PDF)', 'slide', 'https://cdn.example.com/lectures/dp_slides.pdf', 3450000, 'application/pdf', '00000003-0000-0000-0000-000000000003', 1, NOW()),
  ('0000003e-0000-0000-0000-000000000002', '0000003c-0000-0000-0000-000000000002', '0000003d-0000-0000-0000-000000000002', 'Faraday Experiment Simulation Link', 'external_link', 'https://phet.colorado.edu/sims/html/faradays-law/latest/faradays-law_en.html', NULL, 'text/html', '00000003-0000-0000-0000-000000000004', 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- 63. lecture_attendance
INSERT INTO lecture_attendance (id, lecture_session_id, student_id, status, joined_at, engagement_score)
VALUES 
  ('0000003f-0000-0000-0000-000000000001', '0000003d-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', 'present', NOW() - INTERVAL '3 hours', 95),
  ('0000003f-0000-0000-0000-000000000002', '0000003d-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000006', 'present', NOW() - INTERVAL '3 hours', 90)
ON CONFLICT (id) DO NOTHING;

-- 64. lecture_polls
INSERT INTO lecture_polls (id, lecture_session_id, question, options, correct_option, is_active, created_at)
VALUES 
  ('00000040-0000-0000-0000-000000000001', '0000003d-0000-0000-0000-000000000001', 'What is the time complexity of naive recursive Fibonacci?', '["O(N)", "O(N log N)", "O(2^N)", "O(1)"]'::jsonb, 2, false, NOW()),
  ('00000040-0000-0000-0000-000000000002', '0000003d-0000-0000-0000-000000000002', 'According to Lenz Law, the direction of induced current opposes what?', '["Voltage", "The change in magnetic flux producing it", "Electric resistance", "Temperature"]'::jsonb, 1, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 65. lecture_poll_responses
INSERT INTO lecture_poll_responses (id, poll_id, student_id, selected_option, answered_at)
VALUES 
  ('00000041-0000-0000-0000-000000000001', '00000040-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', 2, NOW() - INTERVAL '2 hours 45 minutes'),
  ('00000041-0000-0000-0000-000000000002', '00000040-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000006', 2, NOW() - INTERVAL '2 hours 45 minutes')
ON CONFLICT (id) DO NOTHING;

-- 66. fee_categories
INSERT INTO fee_categories (id, school_id, name, name_hindi, description, is_recurring, frequency, created_at)
VALUES 
  ('00000042-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'Tuition Fee (Quarterly)', 'ट्यूशन शुल्क (त्रैमासिक)', 'Quarterly academic tuition and classroom instruction fee', true, 'quarterly', NOW()),
  ('00000042-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'Science & Computer Lab Maintenance Fee', 'विज्ञान एवं कंप्यूटर प्रयोगशाला शुल्क', 'Annual laboratory equipment, reagents, and software licensing fee', true, 'yearly', NOW())
ON CONFLICT (id) DO NOTHING;

-- 67. fee_structures
INSERT INTO fee_structures (id, school_id, academic_year_id, fee_category_id, class_id, subject_id, amount, currency, due_date, concession_applicable, created_at)
VALUES 
  ('00000043-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', '00000042-0000-0000-0000-000000000001', '00000007-0000-0000-0000-000000000001', '00000006-0000-0000-0000-000000000001', 18000.00, 'INR', NOW() + INTERVAL '30 days', true, NOW()),
  ('00000043-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', '00000042-0000-0000-0000-000000000002', '00000007-0000-0000-0000-000000000001', '00000006-0000-0000-0000-000000000001', 6000.00, 'INR', NOW() + INTERVAL '30 days', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 68. student_fees
INSERT INTO student_fees (id, student_id, fee_structure_id, academic_year_id, base_amount, concession_amount, final_amount, status, due_date, created_at)
VALUES 
  ('00000044-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', '00000043-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', 18000.00, 0.00, 18000.00, 'paid', NOW() + INTERVAL '30 days', NOW()),
  ('00000044-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', '00000043-0000-0000-0000-000000000002', '00000002-0000-0000-0000-000000000002', 6000.00, 1000.00, 5000.00, 'paid', NOW() + INTERVAL '30 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 69. fee_payments
INSERT INTO fee_payments (id, student_fee_id, student_id, amount, payment_mode, transaction_id, receipt_number, payment_date, collected_by, remarks, created_at)
VALUES 
  ('00000045-0000-0000-0000-000000000001', '00000044-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', 18000.00, 'upi', 'UPI-HDFC-99887766', 'REC-2025-0001', NOW() - INTERVAL '3 days', '00000003-0000-0000-0000-000000000007', 'Tuition Q1 received via UPI', NOW()),
  ('00000045-0000-0000-0000-000000000002', '00000044-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', 5000.00, 'bank_transfer', 'NEFT-SBI-11223344', 'REC-2025-0002', NOW() - INTERVAL '2 days', '00000003-0000-0000-0000-000000000007', 'Lab fee after approved merit concession', NOW())
ON CONFLICT (id) DO NOTHING;

-- 70. meetings
INSERT INTO meetings (id, school_id, title, type, target_class_id, host_id, scheduled_at, duration_minutes, mode, status, created_at, updated_at)
VALUES 
  ('00000046-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'Term 1 Parent Teacher Conference - 11A', 'ptm', '00000007-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', NOW() + INTERVAL '2 days', 30, 'online', 'scheduled', NOW(), NOW()),
  ('00000046-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'Physics Viva Voce Oral Assessment', 'viva', '00000007-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000004', NOW() - INTERVAL '1 day', 15, 'online', 'completed', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 71. meeting_participants
INSERT INTO meeting_participants (id, session_id, user_id, role, status, joined_waiting_at, is_video_enabled, is_audio_enabled)
VALUES 
  ('00000047-0000-0000-0000-000000000001', '00000046-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000005', 'student', 'in_session', NOW() - INTERVAL '1 day', true, true),
  ('00000047-0000-0000-0000-000000000002', '00000046-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', 'student', 'in_session', NOW() - INTERVAL '1 day', true, true)
ON CONFLICT (id) DO NOTHING;

-- 72. meeting_questions
INSERT INTO meeting_questions (id, subject_id, assignment_id, question, question_hindi, expected_answer, difficulty, marks, topic_tags, created_by, created_at)
VALUES 
  ('00000048-0000-0000-0000-000000000001', '00000006-0000-0000-0000-000000000001', '0000001d-0000-0000-0000-000000000001', 'What condition is required to multiply two matrices of dimensions M x K and K x N?', 'दो मैट्रिक्स जिनका आयाम M x K और K x N है, उनका गुणन करने के लिए क्या शर्त आवश्यक है?', 'The number of columns in the first matrix must equal the number of rows in the second matrix (K = K).', 'easy', 2, ARRAY['matrices', 'python', 'linear-algebra'], '00000003-0000-0000-0000-000000000003', NOW()),
  ('00000048-0000-0000-0000-000000000002', '00000006-0000-0000-0000-000000000002', '0000001d-0000-0000-0000-000000000002', 'How does wire resistance change when its diameter is doubled while keeping length constant?', 'तार की लंबाई स्थिर रखते हुए उसका व्यास दोगुना करने पर प्रतिरोध कैसे बदलता है?', 'Resistance becomes one-fourth (R proportional to 1/A, area quadruples).', 'medium', 3, ARRAY['electricity', 'ohms-law', 'physics'], '00000003-0000-0000-0000-000000000004', NOW())
ON CONFLICT (id) DO NOTHING;

-- 73. notification_templates
INSERT INTO notification_templates (id, school_id, name, subject, body_template, trigger_event, channels, is_active, created_at)
VALUES 
  ('00000049-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'Assignment Due Reminder', 'Upcoming Practical Assignment Due: {{assignment_title}}', 'Dear {{student_name}}, your practical submission for {{assignment_title}} is due on {{due_date}}. Please upload before the portal locks.', 'assignment_due', ARRAY['email', 'in_app'], true, NOW()),
  ('00000049-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'Fee Payment Acknowledgment', 'Payment Receipt Confirmed: {{receipt_number}}', 'Dear Parent, we acknowledge receipt of Rs. {{amount}} towards {{fee_title}}. Transaction ID: {{transaction_id}}.', 'fee_paid', ARRAY['sms', 'email'], true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 74. notifications
INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at, template_id, channel)
VALUES 
  ('0000004a-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', 'Practical Graded', 'Your submission for Matrix Multiplication in Python has been evaluated with Grade A+ (95%).', 'grade', false, NOW(), '00000049-0000-0000-0000-000000000001', 'in_app'),
  ('0000004a-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', 'Fee Receipt Generated', 'Your lab access fee payment of Rs. 5000 has been verified under Receipt REC-2025-0002.', 'fee', true, NOW(), '00000049-0000-0000-0000-000000000002', 'in_app')
ON CONFLICT (id) DO NOTHING;

-- 75. user_sessions
INSERT INTO user_sessions (id, user_id, token, ip_address, user_agent, expires_at, created_at)
VALUES 
  ('0000004b-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 'jwt_test_token_admin_session_001', '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', NOW() + INTERVAL '7 days', NOW()),
  ('0000004b-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000003', 'jwt_test_token_instructor_session_002', '192.168.1.15', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW() + INTERVAL '7 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- 76. device_tests
INSERT INTO device_tests (id, user_id, camera_status, camera_tested_at, camera_device_name, mic_status, mic_tested_at, mic_device_name, speaker_status, speaker_tested_at, speaker_volume, platform, browser, created_at, updated_at)
VALUES 
  ('0000004c-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000005', 'passed', NOW(), 'FaceTime HD Camera', 'passed', NOW(), 'Built-in Microphone', 'passed', NOW(), 85, 'MacIntel', 'Chrome 122', NOW(), NOW()),
  ('0000004c-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000006', 'passed', NOW(), 'Integrated Webcam', 'passed', NOW(), 'Realtek High Definition Audio', 'passed', NOW(), 90, 'Win32', 'Firefox 120', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 77. admin_notes
INSERT INTO admin_notes (id, title, content, category, is_pinned, author_id, created_at, updated_at)
VALUES 
  ('0000004d-0000-0000-0000-000000000001', 'Annual CBSE Practical Audit Schedule', 'Practical exam inspection team visits between Nov 15 and Nov 20. Ensure all lab logs and equipment tags are updated.', 'compliance', true, '00000003-0000-0000-0000-000000000001', NOW(), NOW()),
  ('0000004d-0000-0000-0000-000000000002', 'UPS Battery Maintenance Window', 'Central UPS bank backup maintenance scheduled for Saturday 3:00 PM to 6:00 PM. Server room will run on generator.', 'infrastructure', false, '00000003-0000-0000-0000-000000000001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 78. activity_logs
INSERT INTO activity_logs (id, user_id, activity_type, description, school_id, action_type, metadata, created_at)
VALUES 
  ('0000004e-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 'login', 'Administrator Ramesh Sharma signed in via portal', '00000001-0000-0000-0000-000000000001', 'USER_LOGIN', '{"browser": "Chrome", "ip": "127.0.0.1"}'::jsonb, NOW()),
  ('0000004e-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000003', 'assignment', 'Instructor Rajesh published assignment Matrix Multiplication in Python', '00000001-0000-0000-0000-000000000001', 'ASSIGNMENT_CREATE', '{"assignment_id": "0000001d-0000-0000-0000-000000000001"}'::jsonb, NOW())
ON CONFLICT (id) DO NOTHING;

-- 79. audit_logs
INSERT INTO audit_logs (id, user_id, school_id, action, entity_type, entity_id, entity_name, details, ip_address, created_at)
VALUES 
  ('0000004f-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'CREATE_SCHOOL', 'School', '00000001-0000-0000-0000-000000000001', 'Delhi Public School', '{"code": "DPS001"}'::jsonb, '127.0.0.1', NOW()),
  ('0000004f-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'UPDATE_GRADE_SCALE', 'GradeScale', '00000004-0000-0000-0000-000000000001', 'Grade A+', '{"min": 90, "max": 100}'::jsonb, '127.0.0.1', NOW())
ON CONFLICT (id) DO NOTHING;

-- 80. query_logs
INSERT INTO query_logs (id, query, params, duration, error, success, model, action, user_id, user_email, ip_address, created_at)
VALUES 
  ('00000050-0000-0000-0000-000000000001', 'SELECT * FROM users WHERE email = $1', '["admin@dps.edu"]', 45, NULL, true, 'User', 'findUnique', '00000003-0000-0000-0000-000000000001', 'admin@dps.edu', '127.0.0.1', NOW()),
  ('00000050-0000-0000-0000-000000000002', 'SELECT * FROM assignments WHERE school_id = $1', '["00000001-0000-0000-0000-000000000001"]', 62, NULL, true, 'Assignment', 'findMany', '00000003-0000-0000-0000-000000000003', 'instructor1@dps.edu', '192.168.1.15', NOW())
ON CONFLICT (id) DO NOTHING;

-- 81. site_updates
INSERT INTO site_updates (id, version, description, changes, updated_at, updated_by)
VALUES 
  ('00000051-0000-0000-0000-000000000001', 'v2.1.0', 'Comprehensive Whiteboard & Real-time Collaboration Engine', 'Enhanced canvas renderer with arrow connector alignment, export PDF and live multi-cursor sync', NOW(), 'DevOps Team'),
  ('00000051-0000-0000-0000-000000000002', 'v2.0.0', 'High Availability Neon DB & Offline Lab Records Sync', 'Upgraded database cluster with Neon connection pooling and sub-second viva scoring', NOW(), 'DevOps Team')
ON CONFLICT (id) DO NOTHING;

-- 82. system_settings
INSERT INTO system_settings (id, key, value, created_at, updated_at)
VALUES 
  ('00000052-0000-0000-0000-000000000001', 'school_branding_default', '{"theme": "indigo", "allow_dark_mode": true, "show_hindi_labels": true}'::jsonb, NOW(), NOW()),
  ('00000052-0000-0000-0000-000000000002', 'max_upload_size_mb', '{"documents": 25, "recordings": 100, "code_submissions": 5}'::jsonb, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 83. implementation_plans
INSERT INTO implementation_plans (id, school_id, created_by_id, title, description, category, status, started_at, tasks, outcomes, metadata, created_at, updated_at)
VALUES 
  ('00000053-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 'Smart Laboratory Digitization Phase 1', 'Roll out tablet interfaces for digital attendance and instant practical viva marks recording', 'Digitization', 'in_progress', NOW() - INTERVAL '30 days', '[{"task": "Procure tablets", "done": true}, {"task": "Deploy wifi mesh", "done": true}, {"task": "Teacher training", "done": false}]'::jsonb, 'Zero paper waste achieved across computer labs', '{"target_completion": "2025-12-31"}'::jsonb, NOW(), NOW()),
  ('00000053-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 'AI-Assisted Socratic Code Feedback Pilot', 'Integrate automated code review hints for CBSE Class 11 and 12 programming exercises', 'Academics', 'planning', NOW() - INTERVAL '10 days', '[{"task": "Model prompt tuning", "done": true}, {"task": "Student pilot", "done": false}]'::jsonb, 'Faster iterative learning during lab hours', '{"pilot_classes": ["11-A", "12-A"]}'::jsonb, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 84. chat_sessions
INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
VALUES 
  ('00000054-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'Generating Python Viva Questions for Class 11', NOW(), NOW()),
  ('00000054-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000005', 'Debugging Matrix Multiplication Index Error', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 85. chat_messages
INSERT INTO chat_messages (id, session_id, role, content, provider, created_at)
VALUES 
  ('00000055-0000-0000-0000-000000000001', '00000054-0000-0000-0000-000000000001', 'user', 'Can you generate 5 conceptual viva questions on Python 2D arrays and matrix multiplication with sample answers?', 'gemini-1.5-pro', NOW()),
  ('00000055-0000-0000-0000-000000000002', '00000054-0000-0000-0000-000000000001', 'assistant', 'Certainly! Here are 5 conceptual questions:
1. Why must the inner dimensions match for matrix multiplication?
2. What is the time complexity of naive O(N^3) multiplication vs Strassen algorithm?
3. How does zip(*B) transpose a matrix in Python?
4. What happens if matrices are non-square?
5. Explain memory layout of nested lists vs NumPy contiguous arrays.', 'gemini-1.5-pro', NOW())
ON CONFLICT (id) DO NOTHING;

-- 86. translations
INSERT INTO translations (id, key, language_code, value, created_at, updated_at)
VALUES 
  ('00000056-0000-0000-0000-000000000001', 'app.welcome', 'en', 'Welcome to Lab Record Manager', NOW(), NOW()),
  ('00000056-0000-0000-0000-000000000002', 'app.welcome', 'hi', 'प्रयोगशाला रिकॉर्ड प्रबंधक में आपका स्वागत है', NOW(), NOW()),
  ('00000056-0000-0000-0000-000000000003', 'nav.dashboard', 'en', 'Dashboard', NOW(), NOW()),
  ('00000056-0000-0000-0000-000000000004', 'nav.dashboard', 'hi', 'डैशबोर्ड', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 87. import_history
INSERT INTO import_history (id, school_id, lab_id, uploaded_by, file_name, file_size, items_imported, items_failed, status, created_at)
VALUES 
  ('00000057-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000001', 'initial_workstations_import.csv', 48200, 40, 0, 'completed', NOW()),
  ('00000057-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', '0000000c-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000004', 'physics_apparatus_list.csv', 32400, 25, 0, 'completed', NOW())
ON CONFLICT (id) DO NOTHING;

-- 88. report_templates
INSERT INTO report_templates (id, school_id, name, type, template_content, header_html, footer_html, is_default, created_at)
VALUES 
  ('00000058-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'CBSE Standard Practical Progress Report', 'progress', '<div><h1>Practical Progress Card</h1><p>Student: {{student_name}}</p></div>', '<header>Delhi Public School Lab Records</header>', '<footer>Page 1 of 1</footer>', true, NOW()),
  ('00000058-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000001', 'Semester Lab Attendance Summary', 'attendance', '<div><h1>Attendance Record</h1><p>Class: {{class_name}}</p></div>', '<header>Delhi Public School</header>', '<footer>Confidential</footer>', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- 89. generated_reports
INSERT INTO generated_reports (id, template_id, generated_by, file_url, parameters, generated_at)
VALUES 
  ('00000059-0000-0000-0000-000000000001', '00000058-0000-0000-0000-000000000001', '00000003-0000-0000-0000-000000000003', 'https://cdn.example.com/reports/term1_progress_aarav.pdf', '{"student_id": "00000003-0000-0000-0000-000000000005", "term": 1}'::jsonb, NOW()),
  ('00000059-0000-0000-0000-000000000002', '00000058-0000-0000-0000-000000000002', '00000003-0000-0000-0000-000000000004', 'https://cdn.example.com/reports/lab_attendance_11a.pdf', '{"class_id": "00000007-0000-0000-0000-000000000001"}'::jsonb, NOW())
ON CONFLICT (id) DO NOTHING;
