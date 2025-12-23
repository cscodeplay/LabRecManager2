-- =====================================================
-- Enroll 49 Unenrolled Students into Class 12 NonMedical A
-- Run in Neon SQL Console
-- =====================================================

-- Step 1: First, find the class ID for "12 NonMedical A"
-- Run this query and copy the ID:
SELECT id, name, grade_level, section, stream
FROM classes c
WHERE c.name ILIKE '%12%' 
   OR c.name ILIKE '%nonmedical%'
   OR (c.grade_level = 12)
ORDER BY name;

-- Step 2: Once you have the class ID, run this to enroll all 49 unenrolled students:
-- REPLACE 'YOUR_CLASS_ID_HERE' with the actual UUID from Step 1

/*
INSERT INTO class_enrollments (id, student_id, class_id, status, enrollment_date)
SELECT 
    gen_random_uuid(),
    u.id,
    'YOUR_CLASS_ID_HERE',  -- <-- REPLACE THIS with class UUID
    'active',
    CURRENT_DATE
FROM users u
LEFT JOIN class_enrollments ce ON u.id = ce.student_id
WHERE u.role = 'student' AND ce.id IS NULL;
*/

-- Step 3: Verify enrollments were created:
-- SELECT COUNT(*) as enrolled FROM class_enrollments WHERE enrollment_date = CURRENT_DATE;

-- Step 4: Verify all students now have enrollments:
-- SELECT 
--     'Enrolled in ANY session' as metric,
--     COUNT(DISTINCT student_id) as count
-- FROM class_enrollments WHERE status = 'active';
