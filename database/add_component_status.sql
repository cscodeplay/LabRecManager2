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

-- Update existing records with default component status (all working)
UPDATE laptop_issuances 
SET component_status = '{
    "screen": "working",
    "keyboard": "working",
    "touchpad": "working",
    "battery": "working",
    "ports": "working",
    "charger": "working"
}'::jsonb
WHERE component_status IS NULL OR component_status = '{}'::jsonb;

-- Verify columns added and data updated
SELECT id, voucher_number, component_status 
FROM laptop_issuances 
LIMIT 5;
