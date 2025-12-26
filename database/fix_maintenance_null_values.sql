-- ============================================================
-- FIX: Update old maintenance history records with NULL values
-- Run this AFTER fix_maintenance_history_columns.sql
-- ============================================================

-- 1. Set a default performer for old records that have NULL performedById
-- Using the admin user ID (replace with your actual admin user ID if different)
UPDATE lab_maintenance_history 
SET performed_by_id = 'a1111111-1111-1111-1111-111111111111'
WHERE performed_by_id IS NULL;

-- 2. Set created_at for old records based on started_at or ended_at
UPDATE lab_maintenance_history 
SET created_at = COALESCE(started_at, ended_at, NOW())
WHERE created_at IS NULL;

-- 3. Verify the fix
SELECT 
    id,
    action,
    reason,
    previous_status,
    new_status,
    performed_by_id,
    created_at
FROM lab_maintenance_history
ORDER BY created_at DESC;
