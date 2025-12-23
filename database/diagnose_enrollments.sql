-- =====================================================
-- Diagnose Student Enrollment Issues
-- Run in Neon SQL Console
-- =====================================================

-- 1. Count total users by role
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role 
ORDER BY count DESC;

-- 2. Count class enrollments
SELECT COUNT(*) as total_enrollments FROM class_enrollments;

-- 3. Check enrollments by status
SELECT status, COUNT(*) as count 
FROM class_enrollments 
GROUP BY status;

-- 4. Students with NO enrollments at all
SELECT u.id, u.first_name, u.last_name, u.email, u.student_id
FROM users u
LEFT JOIN class_enrollments ce ON u.id = ce.student_id
WHERE u.role = 'student' AND ce.id IS NULL
LIMIT 20;

-- 5. Students with enrollments (showing class details)
SELECT 
    u.first_name, 
    u.last_name,
    c.name as class_name,
    ay.year_label as academic_year,
    ce.status as enrollment_status
FROM users u
JOIN class_enrollments ce ON u.id = ce.student_id
JOIN classes c ON ce.class_id = c.id
JOIN academic_years ay ON c.academic_year_id = ay.id
WHERE u.role = 'student'
ORDER BY ay.year_label, c.name, u.first_name
LIMIT 50;

-- 6. Check which academic years have enrollments
SELECT 
    ay.year_label,
    ay.is_current,
    COUNT(DISTINCT ce.student_id) as enrolled_students,
    COUNT(DISTINCT c.id) as classes
FROM academic_years ay
LEFT JOIN classes c ON c.academic_year_id = ay.id
LEFT JOIN class_enrollments ce ON ce.class_id = c.id AND ce.status = 'active'
GROUP BY ay.id, ay.year_label, ay.is_current
ORDER BY ay.start_date DESC;

-- 7. Compare: Students in users table vs students enrolled in current session
SELECT 
    'Total students in users table' as metric,
    COUNT(*) as count
FROM users WHERE role = 'student'
UNION ALL
SELECT 
    'Students enrolled in ANY class' as metric,
    COUNT(DISTINCT student_id) as count
FROM class_enrollments WHERE status = 'active'
UNION ALL
SELECT 
    'Students in current session classes' as metric,
    COUNT(DISTINCT ce.student_id) as count
FROM class_enrollments ce
JOIN classes c ON ce.class_id = c.id
JOIN academic_years ay ON c.academic_year_id = ay.id
WHERE ay.is_current = true AND ce.status = 'active';

-- =====================================================
-- Run above queries and share results
-- =====================================================
