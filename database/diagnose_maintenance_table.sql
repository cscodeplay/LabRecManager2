-- Run this query to check the actual table structure
-- Compare column order with what Prisma expects

-- 1. Check column names and their positions
SELECT 
    ordinal_position,
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lab_maintenance_history'
ORDER BY ordinal_position;

-- Expected columns (in order from Prisma schema):
-- 1. id (uuid)
-- 2. lab_id (uuid) 
-- 3. action (varchar)
-- 4. reason (text)
-- 5. previous_status (varchar)
-- 6. new_status (varchar)
-- 7. started_at (timestamp)
-- 8. ended_at (timestamp)
-- 9. expected_end_date (timestamp)
-- 10. performed_by_id (uuid)
-- 11. created_at (timestamp)
--
-- If you see an extra column like 'academic_session_id' or 'session_id', 
-- that's the mismatch causing the display issue!

-- 2. View one sample record with all columns
SELECT * FROM lab_maintenance_history LIMIT 1;
