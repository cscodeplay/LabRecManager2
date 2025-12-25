-- ==========================================
-- MAINTENANCE HISTORY DIAGNOSTICS
-- ==========================================

-- 1. Check if table exists and its structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lab_maintenance_history'
ORDER BY ordinal_position;

-- 2. Count total records
SELECT COUNT(*) as total_records FROM lab_maintenance_history;

-- 3. View all maintenance history records
SELECT 
    lmh.id,
    lmh.action,
    lmh.reason,
    lmh.previous_status,
    lmh.new_status,
    lmh.started_at,
    lmh.ended_at,
    lmh.expected_end_date,
    lmh.created_at,
    l.name as lab_name,
    u.first_name || ' ' || u.last_name as performed_by
FROM lab_maintenance_history lmh
LEFT JOIN labs l ON lmh.lab_id = l.id
LEFT JOIN users u ON lmh.performed_by_id = u.id
ORDER BY lmh.created_at DESC
LIMIT 50;

-- 4. Check if labs table has status column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'labs' AND column_name IN ('status', 'maintenance_reason', 'maintenance_start_date', 'maintenance_end_date');

-- 5. If table doesn't exist, create it:
/*
CREATE TABLE IF NOT EXISTS lab_maintenance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL,
    reason TEXT,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    expected_end_date TIMESTAMP,
    performed_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lab_maintenance_history_lab ON lab_maintenance_history(lab_id);
CREATE INDEX idx_lab_maintenance_history_created ON lab_maintenance_history(created_at);
*/

-- 6. Add status column to labs if missing:
/*
ALTER TABLE labs ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE labs ADD COLUMN IF NOT EXISTS maintenance_reason TEXT;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS maintenance_start_date TIMESTAMP;
ALTER TABLE labs ADD COLUMN IF NOT EXISTS maintenance_end_date TIMESTAMP;
*/
