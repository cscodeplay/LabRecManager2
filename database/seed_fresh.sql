-- =====================================================
-- Lab Record Manager - Fresh Seed Data
-- Matches current Prisma schema
-- =====================================================

-- 1. CREATE SCHOOL
INSERT INTO schools (id, name, name_hindi, code, address, state, district, board_affiliation, primary_language, secondary_languages, created_at, updated_at)
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
    NOW(),
    NOW()
);

-- 2. CREATE ACADEMIC YEAR
INSERT INTO academic_years (id, school_id, year_label, start_date, end_date, is_current, created_at)
VALUES (
    'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '2024-25',
    '2024-04-01',
    '2025-03-31',
    true,
    NOW()
);

-- 3. CREATE USERS
-- Password hash for 'admin123' using bcrypt
-- All users use: admin123

-- Admin User
INSERT INTO users (id, school_id, email, password_hash, role, first_name, last_name, employee_id, is_active, created_at, updated_at)
VALUES (
    'c3d4e5f6-a7b8-9012-cdef-123456789012',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'admin@dps.edu',
    '$2b$10$rG6.q6TQoLc8VwK1Ls8eLeZz6VX1GrBwVZXnJw6Ey/J5z.rKJBmce',
    'admin',
    'Admin',
    'User',
    'ADM001',
    true,
    NOW(),
    NOW()
);

-- Principal
INSERT INTO users (id, school_id, email, password_hash, role, first_name, first_name_hindi, last_name, last_name_hindi, employee_id, is_active, created_at, updated_at)
VALUES (
    'c3d4e5f6-a7b8-9012-cdef-123456789099',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'principal@dps.edu',
    '$2b$10$rG6.q6TQoLc8VwK1Ls8eLeZz6VX1GrBwVZXnJw6Ey/J5z.rKJBmce',
    'principal',
    'Anita',
    'अनीता',
    'Sharma',
    'शर्मा',
    'PRI001',
    true,
    NOW(),
    NOW()
);

-- Instructor
INSERT INTO users (id, school_id, email, password_hash, role, first_name, first_name_hindi, last_name, last_name_hindi, employee_id, is_active, created_at, updated_at)
VALUES (
    'd4e5f6a7-b8c9-0123-def0-234567890123',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'instructor@dps.edu',
    '$2b$10$rG6.q6TQoLc8VwK1Ls8eLeZz6VX1GrBwVZXnJw6Ey/J5z.rKJBmce',
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

-- Lab Assistant
INSERT INTO users (id, school_id, email, password_hash, role, first_name, last_name, employee_id, is_active, created_at, updated_at)
VALUES (
    'd4e5f6a7-b8c9-0123-def0-234567890199',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'labassist@dps.edu',
    '$2b$10$rG6.q6TQoLc8VwK1Ls8eLeZz6VX1GrBwVZXnJw6Ey/J5z.rKJBmce',
    'lab_assistant',
    'Suresh',
    'Verma',
    'LAB001',
    true,
    NOW(),
    NOW()
);

-- Additional Instructors for Procurement Committee
INSERT INTO users (id, school_id, email, password_hash, role, first_name, last_name, employee_id, is_active, created_at, updated_at)
VALUES 
    ('d4e5f6a7-b8c9-0123-def0-234567890124', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'priya@dps.edu', '$2b$10$rG6.q6TQoLc8VwK1Ls8eLeZz6VX1GrBwVZXnJw6Ey/J5z.rKJBmce', 'instructor', 'Priya', 'Singh', 'INS002', true, NOW(), NOW()),
    ('d4e5f6a7-b8c9-0123-def0-234567890125', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'manpreet@dps.edu', '$2b$10$rG6.q6TQoLc8VwK1Ls8eLeZz6VX1GrBwVZXnJw6Ey/J5z.rKJBmce', 'instructor', 'Manpreet', 'Kaur', 'INS003', true, NOW(), NOW());

-- Students
INSERT INTO users (id, school_id, email, password_hash, role, first_name, first_name_hindi, last_name, admission_number, student_id, is_active, created_at, updated_at)
VALUES 
    ('e5f6a7b8-c9d0-1234-ef01-345678901234', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'student1@dps.edu', '$2b$10$rG6.q6TQoLc8VwK1Ls8eLeZz6VX1GrBwVZXnJw6Ey/J5z.rKJBmce', 'student', 'Aarav', 'आरव', 'Patel', 'STU001', 'STU001', true, NOW(), NOW()),
    ('e5f6a7b8-c9d0-1234-ef01-345678901235', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'student2@dps.edu', '$2b$10$rG6.q6TQoLc8VwK1Ls8eLeZz6VX1GrBwVZXnJw6Ey/J5z.rKJBmce', 'student', 'Priya', 'प्रिया', 'Singh', 'STU002', 'STU002', true, NOW(), NOW()),
    ('e5f6a7b8-c9d0-1234-ef01-345678901236', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'student3@dps.edu', '$2b$10$rG6.q6TQoLc8VwK1Ls8eLeZz6VX1GrBwVZXnJw6Ey/J5z.rKJBmce', 'student', 'Rahul', 'राहुल', 'Gupta', 'STU003', 'STU003', true, NOW(), NOW()),
    ('e5f6a7b8-c9d0-1234-ef01-345678901237', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'student4@dps.edu', '$2b$10$rG6.q6TQoLc8VwK1Ls8eLeZz6VX1GrBwVZXnJw6Ey/J5z.rKJBmce', 'student', 'Sneha', 'स्नेहा', 'Reddy', 'STU004', 'STU004', true, NOW(), NOW()),
    ('e5f6a7b8-c9d0-1234-ef01-345678901238', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'student5@dps.edu', '$2b$10$rG6.q6TQoLc8VwK1Ls8eLeZz6VX1GrBwVZXnJw6Ey/J5z.rKJBmce', 'student', 'Vikram', 'विक्रम', 'Joshi', 'STU005', 'STU005', true, NOW(), NOW());

-- 4. CREATE SUBJECTS
INSERT INTO subjects (id, school_id, code, name, name_hindi, has_lab, lab_hours_per_week, theory_hours_per_week, created_at, updated_at)
VALUES 
    ('f6a7b8c9-d0e1-2345-f012-456789012345', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CS', 'Computer Science', 'कंप्यूटर विज्ञान', true, 4, 4, NOW(), NOW()),
    ('f6a7b8c9-d0e1-2345-f012-456789012346', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'PHY', 'Physics', 'भौतिक विज्ञान', true, 2, 4, NOW(), NOW()),
    ('f6a7b8c9-d0e1-2345-f012-456789012347', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'CHEM', 'Chemistry', 'रसायन विज्ञान', true, 2, 4, NOW(), NOW());

-- 5. CREATE LABS
INSERT INTO labs (id, school_id, name, name_hindi, room_number, capacity, subject_id, incharge_id, created_at, updated_at)
VALUES 
    ('a7b8c9d0-e1f2-3456-0123-567890123456', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Computer Lab 1', 'कंप्यूटर लैब 1', 'LAB-101', 30, 'f6a7b8c9-d0e1-2345-f012-456789012345', 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW(), NOW()),
    ('a7b8c9d0-e1f2-3456-0123-567890123457', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Physics Lab', 'भौतिक विज्ञान लैब', 'LAB-201', 25, 'f6a7b8c9-d0e1-2345-f012-456789012346', 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW(), NOW()),
    ('a7b8c9d0-e1f2-3456-0123-567890123458', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Chemistry Lab', 'रसायन विज्ञान लैब', 'LAB-301', 25, 'f6a7b8c9-d0e1-2345-f012-456789012347', 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW(), NOW());

-- 6. CREATE CLASSES
INSERT INTO classes (id, school_id, academic_year_id, name, name_hindi, grade_level, section, stream, class_teacher_id, created_at, updated_at)
VALUES 
    ('b8c9d0e1-f2a3-4567-1234-678901234567', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '11-A Science', '11-ए विज्ञान', 11, 'A', 'Science', 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW(), NOW()),
    ('b8c9d0e1-f2a3-4567-1234-678901234568', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '11-B Science', '11-बी विज्ञान', 11, 'B', 'Science', 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW(), NOW()),
    ('b8c9d0e1-f2a3-4567-1234-678901234569', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '12-A Science', '12-ए विज्ञान', 12, 'A', 'Science', 'd4e5f6a7-b8c9-0123-def0-234567890123', NOW(), NOW());

-- 7. ENROLL STUDENTS
INSERT INTO class_enrollments (student_id, class_id, roll_number, status, created_at)
VALUES 
    ('e5f6a7b8-c9d0-1234-ef01-345678901234', 'b8c9d0e1-f2a3-4567-1234-678901234567', 1, 'active', NOW()),
    ('e5f6a7b8-c9d0-1234-ef01-345678901235', 'b8c9d0e1-f2a3-4567-1234-678901234567', 2, 'active', NOW()),
    ('e5f6a7b8-c9d0-1234-ef01-345678901236', 'b8c9d0e1-f2a3-4567-1234-678901234567', 3, 'active', NOW()),
    ('e5f6a7b8-c9d0-1234-ef01-345678901237', 'b8c9d0e1-f2a3-4567-1234-678901234567', 4, 'active', NOW()),
    ('e5f6a7b8-c9d0-1234-ef01-345678901238', 'b8c9d0e1-f2a3-4567-1234-678901234567', 5, 'active', NOW());

-- 8. CREATE CLASS-SUBJECT MAPPINGS
INSERT INTO class_subjects (class_id, subject_id, instructor_id, lab_instructor_id)
VALUES 
    ('b8c9d0e1-f2a3-4567-1234-678901234567', 'f6a7b8c9-d0e1-2345-f012-456789012345', 'd4e5f6a7-b8c9-0123-def0-234567890123', 'd4e5f6a7-b8c9-0123-def0-234567890199'),
    ('b8c9d0e1-f2a3-4567-1234-678901234567', 'f6a7b8c9-d0e1-2345-f012-456789012346', 'd4e5f6a7-b8c9-0123-def0-234567890123', 'd4e5f6a7-b8c9-0123-def0-234567890199'),
    ('b8c9d0e1-f2a3-4567-1234-678901234567', 'f6a7b8c9-d0e1-2345-f012-456789012347', 'd4e5f6a7-b8c9-0123-def0-234567890123', 'd4e5f6a7-b8c9-0123-def0-234567890199');

-- 9. CREATE VENDORS FOR PROCUREMENT
INSERT INTO vendors (id, school_id, name, contact_person, phone, email, address, gstin, is_local, is_active, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ABC Supplies Pvt Ltd', 'Vikram Singh', '9876543210', 'vikram@abcsupplies.com', '45 Market Road, Delhi', '29ABCDE1234F1Z5', true, true, NOW(), NOW()),
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'XYZ Tech Solutions', 'Amit Patel', '9876543211', 'amit@xyztech.com', '78 Tech Park, Mumbai', '29XYZAB5678G2Z6', false, true, NOW(), NOW()),
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Global Equipment Co', 'Neha Gupta', '9876543212', 'neha@globalequip.com', '123 Industrial Area, Chennai', '29GLOBA9012H3Z7', false, true, NOW(), NOW());

-- 10. CREATE GRADE SCALES
INSERT INTO grade_scales (id, school_id, grade_letter, grade_point, min_percentage, max_percentage, description, is_active, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'A+', 10.0, 90, 100, 'Outstanding', true, NOW(), NOW()),
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'A', 9.0, 80, 89, 'Excellent', true, NOW(), NOW()),
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'B+', 8.0, 70, 79, 'Very Good', true, NOW(), NOW()),
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'B', 7.0, 60, 69, 'Good', true, NOW(), NOW()),
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'C+', 6.0, 50, 59, 'Average', true, NOW(), NOW()),
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'C', 5.0, 40, 49, 'Below Average', true, NOW(), NOW()),
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'D', 4.0, 33, 39, 'Pass', true, NOW(), NOW()),
    (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'F', 0.0, 0, 32, 'Fail', true, NOW(), NOW());

-- =====================================================
-- LOGIN CREDENTIALS:
-- All users password: admin123
-- admin@dps.edu, principal@dps.edu, instructor@dps.edu
-- labassist@dps.edu, student1@dps.edu to student5@dps.edu
-- =====================================================
