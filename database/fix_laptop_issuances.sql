-- ============================================================
-- FIX: Add missing columns to laptop_issuances table
-- ============================================================

-- Add component_status column (JSON for tracking component health)
ALTER TABLE laptop_issuances 
ADD COLUMN IF NOT EXISTS component_status JSONB DEFAULT '{}';

-- Add component_status_on_return column
ALTER TABLE laptop_issuances 
ADD COLUMN IF NOT EXISTS component_status_on_return JSONB;

-- Verify columns added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'laptop_issuances'
ORDER BY ordinal_position;
