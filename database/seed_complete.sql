-- =====================================================
-- Lab Record Manager - Complete Seed Data
-- Matches database/schema.sql structure
-- Run in Neon SQL Editor
-- =====================================================

-- =====================================================
-- PURGE ALL TABLES
-- =====================================================

-- Delete from tables without foreign keys first, then parents
-- These are the core tables that exist in the current schema

DELETE FROM quotation_items;
DELETE FROM vendor_quotations;
DELETE FROM procurement_committee;
DELETE FROM procurement_items;
DELETE FROM procurement_requests;
DELETE FROM notifications;
DELETE FROM notification_templates;
DELETE FROM viva_sessions;
DELETE FROM viva_questions;
DELETE FROM grade_history;
DELETE FROM grades;
DELETE FROM submission_revisions;
DELETE FROM submission_files;
DELETE FROM submissions;
DELETE FROM assignment_targets;
DELETE FROM assignment_files;
DELETE FROM assignments;
DELETE FROM class_subjects;
DELETE FROM group_members;
DELETE FROM student_groups;
DELETE FROM class_enrollments;
DELETE FROM classes;
DELETE FROM labs;
DELETE FROM subjects;
DELETE FROM user_sessions;
DELETE FROM users;
DELETE FROM vendors;
DELETE FROM academic_years;
DELETE FROM schools;

-- =====================================================
-- 1. SCHOOL
-- =====================================================
INSERT INTO schools (id, name, name_hindi, code, address, state, district, board_affiliation, primary_language, secondary_languages, academic_year_start, created_at, updated_at)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Delhi Public School',
    'दिल्ली पब्लिक स्कूल',
    'DPS001',
    '123 Education Lane, New Delhi - 110001',
    'Delhi',
    'South Delhi',
    'CBSE',
    'en',
    ARRAY['hi'],
    4,
    NOW(),
    NOW()
);

-- =====================================================
-- 2. ACADEMIC YEARS (Previous + Current)
-- =====================================================
-- Previous session (read-only)
INSERT INTO academic_years (id, school_id, year_label, start_date, end_date, is_current, created_at)
VALUES (
    'b2c3d4e5-f6a7-8901-bcde-f12345678900',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '2024-2025',
    '2024-04-01',
    '2025-03-31',
    false,
    NOW()
);

-- Current session (active)
INSERT INTO academic_years (id, school_id, year_label, start_date, end_date, is_current, created_at)
VALUES (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '2025-2026',
    '2025-04-01',
    '2026-03-31',
    true,
    NOW()
);

-- =====================================================
-- 3. USERS
-- Passwords:
--   admin@dps.edu = admin123
--   instructor@dps.edu = Instructor123!
--   students = student123
-- =====================================================

-- Admin (admin123)
INSERT INTO users (id, school_id, email, password_hash, role, first_name, last_name, employee_id, is_active, created_at, updated_at)
VALUES (
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'admin@dps.edu',
    '$2b$10$1qU0Hx9rCMyvrpOPpPPyzOab9p5PspOc6K4lGhdb6QB.N406LY13G',
    'admin',
    'Admin',
    'User',
    'ADM001',
    true,
    NOW(),
    NOW()
);

-- Instructor 1 (Instructor123!)
INSERT INTO users (id, school_id, email, password_hash, role, first_name, first_name_hindi, last_name, last_name_hindi, employee_id, is_active, created_at, updated_at)
VALUES (
    'd4e5f6a7-b8c9-0123-def0-234567890123',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'instructor@dps.edu',
    '$2b$10$Nj1cC.7GrSBxROxUD3AJ5eA5L/nI0VXtJLvAbXk5Wu3TYpK.BulQq',
    'instructor',
    'Rajesh',
    'राजेश',
    'Kumar',
    'कुमार',
    'INS001',
    true,
    NOW(),
    NOW()
);

-- Additional Instructors for Procurement Committee (Instructor123!)
INSERT INTO users (id, school_id, email, password_hash, role, first_name, last_name, employee_id, is_active, created_at, updated_at)
VALUES 
    ('d4e5f6a7-b8c9-0123-def0-234567890124', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'priya@dps.edu', '$2b$10$Nj1cC.7GrSBxROxUD3AJ5eA5L/nI0VXtJLvAbXk5Wu3TYpK.BulQq', 'instructor', 'Priya', 'Singh', 'INS002', true, NOW(), NOW()),
    ('d4e5f6a7-b8c9-0123-def0-234567890125', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'manpreet@dps.edu', '$2b$10$Nj1cC.7GrSBxROxUD3AJ5eA5L/nI0VXtJLvAbXk5Wu3TYpK.BulQq', 'instructor', 'Manpreet', 'Kaur', 'INS003', true, NOW(), NOW()),
    ('d4e5f6a7-b8c9-0123-def0-234567890126', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'amit@dps.edu', '$2b$10$Nj1cC.7GrSBxROxUD3AJ5eA5L/nI0VXtJLvAbXk5Wu3TYpK.BulQq', 'instructor', 'Amit', 'Sharma', 'INS004', true, NOW(), NOW());

-- Students (student123)
INSERT INTO users (id, school_id, email, password_hash, role, first_name, first_name_hindi, last_name, admission_number, is_active, created_at, updated_at)
VALUES 
    ('e5f6a7b8-c9d0-1234-ef01-345678901234', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'student1@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Aarav', 'आरव', 'Patel', 'STU001', true, NOW(), NOW()),
    ('e5f6a7b8-c9d0-1234-ef01-345678901235', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'student2@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Priya', 'प्रिया', 'Singh', 'STU002', true, NOW(), NOW()),
    ('e5f6a7b8-c9d0-1234-ef01-345678901236', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'student3@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Rahul', 'राहुल', 'Gupta', 'STU003', true, NOW(), NOW()),
    ('e5f6a7b8-c9d0-1234-ef01-345678901237', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'student4@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Sneha', 'स्नेहा', 'Reddy', 'STU004', true, NOW(), NOW()),
    ('e5f6a7b8-c9d0-1234-ef01-345678901238', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'student5@dps.edu', '$2b$10$MYGc0dD.qTR.q2jk8.vgNecKebRnLacNVTu//wJkKBUK3xPOtPxfa', 'student', 'Vikram', 'विक्रम', 'Joshi', 'STU005', true, NOW(), NOW());

-- =====================================================
-- 4. SUBJECTS
-- =====================================================
INSERT INTO subjects (id, school_id, code, name, name_hindi, has_lab, lab_hours_per_week, theory_hours_per_week, created_at)
VALUES 
    ('f6a7b8c9-d0e1-2345-f012-456789012345', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CS', 'Computer Science', 'कंप्यूटर विज्ञान', true, 4, 4, NOW()),
    ('f6a7b8c9-d0e1-2345-f012-456789012346', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PHY', 'Physics', 'भौतिक विज्ञान', true, 2, 4, NOW()),
    ('f6a7b8c9-d0e1-2345-f012-456789012347', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CHEM', 'Chemistry', 'रसायन विज्ञान', true, 2, 4, NOW());

-- =====================================================
-- 5. LABS
-- =====================================================
INSERT INTO labs (id, school_id, name, name_hindi, room_number, capacity, subject_id, incharge_id, created_at)
VALUES 
    ('a7b8c9d0-e1f2-3456-0123-567890123456', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Computer Lab 1', 'कंप्यूटर लैब 1', 'LAB-101', 30, 'f6a7b8c9-d0e1-2345-f012-456789012345', 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW()),
    ('a7b8c9d0-e1f2-3456-0123-567890123457', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Physics Lab', 'भौतिक विज्ञान लैब', 'LAB-201', 25, 'f6a7b8c9-d0e1-2345-f012-456789012346', 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW()),
    ('a7b8c9d0-e1f2-3456-0123-567890123458', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Chemistry Lab', 'रसायन विज्ञान लैब', 'LAB-301', 25, 'f6a7b8c9-d0e1-2345-f012-456789012347', 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW());

-- =====================================================
-- 6. CLASSES
-- =====================================================
INSERT INTO classes (id, school_id, academic_year_id, name, name_hindi, grade_level, section, stream, class_teacher_id, max_students, created_at)
VALUES 
    ('b8c9d0e1-f2a3-4567-1234-678901234567', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '11-A Science', '11-ए विज्ञान', 11, 'A', 'Science', 'd4e5f6a7-b8c9-0123-def0-234567890123', 60, NOW()),
    ('b8c9d0e1-f2a3-4567-1234-678901234568', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '11-B Science', '11-बी विज्ञान', 11, 'B', 'Science', 'd4e5f6a7-b8c9-0123-def0-234567890123', 60, NOW()),
    ('b8c9d0e1-f2a3-4567-1234-678901234569', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '12-A Science', '12-ए विज्ञान', 12, 'A', 'Science', 'd4e5f6a7-b8c9-0123-def0-234567890123', 60, NOW());

-- =====================================================
-- 7. CLASS ENROLLMENTS
-- =====================================================
INSERT INTO class_enrollments (id, student_id, class_id, roll_number, enrollment_date, status)
VALUES 
    (gen_random_uuid(), 'e5f6a7b8-c9d0-1234-ef01-345678901234', 'b8c9d0e1-f2a3-4567-1234-678901234567', 1, CURRENT_DATE, 'active'),
    (gen_random_uuid(), 'e5f6a7b8-c9d0-1234-ef01-345678901235', 'b8c9d0e1-f2a3-4567-1234-678901234567', 2, CURRENT_DATE, 'active'),
    (gen_random_uuid(), 'e5f6a7b8-c9d0-1234-ef01-345678901236', 'b8c9d0e1-f2a3-4567-1234-678901234567', 3, CURRENT_DATE, 'active'),
    (gen_random_uuid(), 'e5f6a7b8-c9d0-1234-ef01-345678901237', 'b8c9d0e1-f2a3-4567-1234-678901234567', 4, CURRENT_DATE, 'active'),
    (gen_random_uuid(), 'e5f6a7b8-c9d0-1234-ef01-345678901238', 'b8c9d0e1-f2a3-4567-1234-678901234567', 5, CURRENT_DATE, 'active');

-- =====================================================
-- 8. CLASS-SUBJECT MAPPINGS
-- =====================================================
INSERT INTO class_subjects (id, class_id, subject_id, instructor_id, lab_instructor_id)
VALUES 
    (gen_random_uuid(), 'b8c9d0e1-f2a3-4567-1234-678901234567', 'f6a7b8c9-d0e1-2345-f012-456789012345', 'd4e5f6a7-b8c9-0123-def0-234567890123', 'd4e5f6a7-b8c9-0123-def0-234567890124'),
    (gen_random_uuid(), 'b8c9d0e1-f2a3-4567-1234-678901234567', 'f6a7b8c9-d0e1-2345-f012-456789012346', 'd4e5f6a7-b8c9-0123-def0-234567890124', 'd4e5f6a7-b8c9-0123-def0-234567890125'),
    (gen_random_uuid(), 'b8c9d0e1-f2a3-4567-1234-678901234567', 'f6a7b8c9-d0e1-2345-f012-456789012347', 'd4e5f6a7-b8c9-0123-def0-234567890125', 'd4e5f6a7-b8c9-0123-def0-234567890126');

-- =====================================================
-- 9. VENDORS (for Procurement)
-- =====================================================
INSERT INTO vendors (id, name, contact_person, phone, email, address, gstin, is_local, school_id, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'ABC Supplies Pvt Ltd', 'Vikram Singh', '9876543210', 'vikram@abcsupplies.com', '45 Market Road, Delhi', '29ABCDE1234F1Z5', true, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW(), NOW()),
    (gen_random_uuid(), 'XYZ Tech Solutions', 'Amit Patel', '9876543211', 'amit@xyztech.com', '78 Tech Park, Mumbai', '29XYZAB5678G2Z6', false, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW(), NOW()),
    (gen_random_uuid(), 'Global Equipment Co', 'Neha Gupta', '9876543212', 'neha@globalequip.com', '123 Industrial Area, Chennai', '29GLOBA9012H3Z7', false, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW(), NOW()),
    (gen_random_uuid(), 'Local Lab Supplies', 'Ramesh Verma', '9876543213', 'ramesh@localsupplies.com', '56 Local Market, Delhi', '29LOCAL3456I4Z8', true, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', NOW(), NOW());

-- =====================================================
-- 10. ASSIGNMENTS
-- =====================================================
INSERT INTO assignments (id, school_id, subject_id, lab_id, created_by, title, title_hindi, description, description_hindi, experiment_number, assignment_type, programming_language, aim, aim_hindi, max_marks, passing_marks, viva_marks, practical_marks, output_marks, status, publish_date, due_date, created_at, updated_at)
VALUES 
    ('c9d0e1f2-a3b4-5678-2345-789012345678', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'f6a7b8c9-d0e1-2345-f012-456789012345', 'a7b8c9d0-e1f2-3456-0123-567890123456', 'd4e5f6a7-b8c9-0123-def0-234567890123', 
    'Python: Hello World Program', 'पायथन: हैलो वर्ल्ड प्रोग्राम',
    'Write a simple Python program that prints Hello World to the console.',
    'एक सरल पायथन प्रोग्राम लिखें जो कंसोल पर Hello World प्रिंट करे।',
    'EXP-01', 'program', 'Python',
    'To understand basic Python syntax and print function',
    'बुनियादी पायथन सिंटैक्स और प्रिंट फ़ंक्शन को समझना',
    100, 35, 20, 60, 20, 'published', NOW(), NOW() + INTERVAL '7 days', NOW(), NOW()),
    
    ('c9d0e1f2-a3b4-5678-2345-789012345679', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'f6a7b8c9-d0e1-2345-f012-456789012345', 'a7b8c9d0-e1f2-3456-0123-567890123456', 'd4e5f6a7-b8c9-0123-def0-234567890123',
    'Python: Calculator Program', 'पायथन: कैलकुलेटर प्रोग्राम',
    'Create a simple calculator that can perform addition, subtraction, multiplication, and division.',
    'एक साधारण कैलकुलेटर बनाएं जो जोड़, घटाव, गुणा और भाग कर सके।',
    'EXP-02', 'program', 'Python',
    'To learn arithmetic operations and user input in Python',
    'पायथन में अंकगणितीय संचालन और उपयोगकर्ता इनपुट सीखना',
    100, 35, 20, 60, 20, 'published', NOW(), NOW() + INTERVAL '14 days', NOW(), NOW()),
    
    ('c9d0e1f2-a3b4-5678-2345-789012345680', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'f6a7b8c9-d0e1-2345-f012-456789012346', 'a7b8c9d0-e1f2-3456-0123-567890123457', 'd4e5f6a7-b8c9-0123-def0-234567890123',
    'Physics: Ohms Law Verification', 'भौतिकी: ओम के नियम का सत्यापन',
    'Verify Ohms Law by plotting the V-I characteristics of a resistor.',
    'प्रतिरोधक की V-I विशेषताओं को प्लॉट करके ओम के नियम का सत्यापन करें।',
    'PHY-01', 'experiment', NULL,
    'To verify Ohms Law and understand the relationship between voltage and current',
    'ओम के नियम का सत्यापन करना और वोल्टेज और करंट के बीच संबंध को समझना',
    100, 35, 25, 50, 25, 'published', NOW(), NOW() + INTERVAL '10 days', NOW(), NOW());

-- =====================================================
-- 11. ASSIGNMENT TARGETS
-- =====================================================
INSERT INTO assignment_targets (id, assignment_id, target_type, target_class_id, assigned_by, assigned_at)
VALUES 
    (gen_random_uuid(), 'c9d0e1f2-a3b4-5678-2345-789012345678', 'class', 'b8c9d0e1-f2a3-4567-1234-678901234567', 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW()),
    (gen_random_uuid(), 'c9d0e1f2-a3b4-5678-2345-789012345679', 'class', 'b8c9d0e1-f2a3-4567-1234-678901234567', 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW()),
    (gen_random_uuid(), 'c9d0e1f2-a3b4-5678-2345-789012345680', 'class', 'b8c9d0e1-f2a3-4567-1234-678901234567', 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW());

-- =====================================================
-- 12. VIVA QUESTIONS
-- =====================================================
INSERT INTO viva_questions (id, subject_id, assignment_id, question, question_hindi, expected_answer, difficulty, marks, topic_tags, created_by, created_at)
VALUES 
    (gen_random_uuid(), 'f6a7b8c9-d0e1-2345-f012-456789012345', 'c9d0e1f2-a3b4-5678-2345-789012345678', 'What is the print function used for in Python?', 'पायथन में प्रिंट फ़ंक्शन का क्या उपयोग है?', 'The print function is used to output text or values to the console.', 'easy', 2, ARRAY['python', 'basics'], 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW()),
    (gen_random_uuid(), 'f6a7b8c9-d0e1-2345-f012-456789012345', 'c9d0e1f2-a3b4-5678-2345-789012345678', 'What is a string in Python?', 'पायथन में स्ट्रिंग क्या है?', 'A string is a sequence of characters enclosed in quotes.', 'easy', 2, ARRAY['python', 'data-types'], 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW()),
    (gen_random_uuid(), 'f6a7b8c9-d0e1-2345-f012-456789012345', 'c9d0e1f2-a3b4-5678-2345-789012345679', 'Explain the difference between / and // operators', '/ और // ऑपरेटरों में क्या अंतर है?', '/ performs true division returning float, // performs floor division returning integer', 'medium', 3, ARRAY['python', 'operators'], 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW()),
    (gen_random_uuid(), 'f6a7b8c9-d0e1-2345-f012-456789012346', 'c9d0e1f2-a3b4-5678-2345-789012345680', 'State Ohms Law', 'ओम का नियम बताएं', 'V = IR, where V is voltage, I is current, and R is resistance', 'easy', 2, ARRAY['physics', 'electricity'], 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW());

-- NOTE: notification_templates and departments tables have different schema
-- Skipping those inserts - add manually if needed

-- =====================================================
-- DONE! 
-- Login Credentials:
--   admin@dps.edu / admin123
--   instructor@dps.edu / Instructor123!
--   priya@dps.edu / Instructor123!
--   manpreet@dps.edu / Instructor123!
--   amit@dps.edu / Instructor123!
--   student1@dps.edu to student5@dps.edu / student123
-- =====================================================
