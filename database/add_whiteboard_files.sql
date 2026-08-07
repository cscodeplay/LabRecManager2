CREATE TABLE whiteboard_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled Whiteboard',
    description TEXT,
    canvas_data TEXT,
    thumbnail_url TEXT,
    page_count INT DEFAULT 1,
    is_archived BOOLEAN DEFAULT FALSE,
    last_opened_at TIMESTAMP(6) DEFAULT NOW(),
    created_at TIMESTAMP(6) DEFAULT NOW(),
    updated_at TIMESTAMP(6) DEFAULT NOW()
);

CREATE INDEX idx_wb_files_owner ON whiteboard_files(owner_id);
CREATE INDEX idx_wb_files_school ON whiteboard_files(school_id);
CREATE INDEX idx_wb_files_last_opened ON whiteboard_files(last_opened_at DESC);
