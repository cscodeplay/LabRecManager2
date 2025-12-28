-- ============================================================
-- ADD COMPONENT STATUS TO LAPTOP ISSUANCES
-- Stores status of each laptop component at time of issue
-- ============================================================

-- Add component_status column to store JSON data for component statuses
ALTER TABLE laptop_issuances 
ADD COLUMN IF NOT EXISTS component_status JSONB DEFAULT '{}'::jsonb;

-- Example component_status structure:
-- {
--   "screen": "working",
--   "keyboard": "working", 
--   "touchpad": "minor_issue",
--   "battery": "working",
--   "ports": "working",
--   "charger": "working"
-- }

-- Add component_status_on_return for return condition
ALTER TABLE laptop_issuances 
ADD COLUMN IF NOT EXISTS component_status_on_return JSONB DEFAULT NULL;

-- Verify columns added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'laptop_issuances' 
AND column_name IN ('component_status', 'component_status_on_return');
