-- Add is_locked column to assignment_targets table
-- Run this on Render PostgreSQL database

ALTER TABLE assignment_targets ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'assignment_targets' AND column_name = 'is_locked';
