-- Lab maintenance mode columns migration
-- Run this to add lab status and maintenance tracking columns

-- Add status column with default 'active'
ALTER TABLE labs ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add maintenance reason
ALTER TABLE labs ADD COLUMN IF NOT EXISTS maintenance_reason TEXT;

-- Add maintenance start date
ALTER TABLE labs ADD COLUMN IF NOT EXISTS maintenance_start_date TIMESTAMP;

-- Add maintenance end date
ALTER TABLE labs ADD COLUMN IF NOT EXISTS maintenance_end_date TIMESTAMP;

-- Create lab maintenance history table for tracking all status changes
CREATE TABLE IF NOT EXISTS lab_maintenance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL, -- 'started', 'ended', 'extended', 'changed'
    reason TEXT,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    expected_end_date TIMESTAMP,
    performed_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for faster lab maintenance history queries
CREATE INDEX IF NOT EXISTS idx_lab_maintenance_history_lab_id ON lab_maintenance_history(lab_id);
CREATE INDEX IF NOT EXISTS idx_lab_maintenance_history_created_at ON lab_maintenance_history(created_at DESC);

-- Also add site_updates table
CREATE TABLE IF NOT EXISTS site_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    changes TEXT,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by VARCHAR(100)
);

-- Insert initial site update
INSERT INTO site_updates (version, description, changes, updated_by)
VALUES (
    '1.6.0',
    'Calendar improvements, lab maintenance mode, site updates tracking',
    '• Fixed avgScore display bug
• Added visual assignment calendar with color-coded status
• Added lab maintenance mode toggle with reason and end date
• Added site updates tracking page at /admin/site-updates
• Fixed whiteboard session load error
• Calendar now shows gradedAt timestamp and grader name
• Added lab maintenance history tracking with full timestamps',
    'System'
);
