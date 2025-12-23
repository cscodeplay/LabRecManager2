-- =====================================================
-- Check School ID Mismatch
-- Run in Neon SQL Console
-- =====================================================

-- 1. List all schools
SELECT id, name FROM schools;

-- 2. Check lab items school_id
SELECT DISTINCT school_id FROM lab_items;

-- 3. Check which users are admins and their school_id
SELECT id, email, role, school_id, first_name, last_name
FROM users
WHERE role IN ('admin', 'principal')
ORDER BY role, email;

-- 4. Compare: Does admin's school_id match lab items' school_id?
SELECT 
    u.email,
    u.role,
    u.school_id as user_school_id,
    (SELECT DISTINCT li.school_id FROM lab_items li LIMIT 1) as lab_items_school_id,
    u.school_id = (SELECT DISTINCT li.school_id FROM lab_items li LIMIT 1) as school_match
FROM users u
WHERE u.role IN ('admin', 'principal');
