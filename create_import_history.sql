-- SQL to create import_history table
-- Run this manually in your Neon database

CREATE TABLE IF NOT EXISTS import_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id),
    lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    items_imported INTEGER NOT NULL,
    items_failed INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'completed',
    errors JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_import_history_lab_id ON import_history(lab_id);
CREATE INDEX IF NOT EXISTS idx_import_history_school_id ON import_history(school_id);
CREATE INDEX IF NOT EXISTS idx_import_history_created_at ON import_history(created_at DESC);

-- View recent imports
-- SELECT ih.*, l.name as lab_name, u.first_name, u.last_name 
-- FROM import_history ih 
-- JOIN labs l ON ih.lab_id = l.id 
-- JOIN users u ON ih.uploaded_by = u.id 
-- ORDER BY ih.created_at DESC;
