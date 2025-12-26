-- ============================================================
-- FIX: Add missing columns to lab_maintenance_history table
-- Run this on your Render database to fix the maintenance history display
-- ============================================================

-- Add missing columns
ALTER TABLE lab_maintenance_history 
    ADD COLUMN IF NOT EXISTS expected_end_date TIMESTAMP;

ALTER TABLE lab_maintenance_history 
    ADD COLUMN IF NOT EXISTS performed_by_id UUID;

ALTER TABLE lab_maintenance_history 
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Add foreign key constraint for performed_by_id (optional if you want referential integrity)
-- Note: This may fail if there are existing rows with NULL performed_by_id
-- If it fails, first update existing rows:
-- UPDATE lab_maintenance_history SET performed_by_id = 'a1111111-1111-1111-1111-111111111111' WHERE performed_by_id IS NULL;

-- Then add the constraint:
-- ALTER TABLE lab_maintenance_history 
--     ADD CONSTRAINT fk_maintenance_performed_by 
--     FOREIGN KEY (performed_by_id) REFERENCES users(id);

-- Verify the fix
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lab_maintenance_history'
ORDER BY ordinal_position;

-- After running this, verify with:
-- SELECT id, action, reason, expected_end_date, performed_by_id, created_at 
-- FROM lab_maintenance_history LIMIT 5;
