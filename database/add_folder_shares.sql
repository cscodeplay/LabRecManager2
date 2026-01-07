-- Create folder_shares table for folder sharing functionality
CREATE TABLE IF NOT EXISTS folder_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    folder_id UUID NOT NULL REFERENCES document_folders(id) ON DELETE CASCADE,
    shared_by_id UUID NOT NULL REFERENCES users(id),
    target_type document_share_target_type NOT NULL,
    target_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    target_group_id UUID REFERENCES student_groups(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    shared_at TIMESTAMP(6) DEFAULT NOW(),
    expires_at TIMESTAMP(6)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_folder_shares_folder ON folder_shares(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_shares_class ON folder_shares(target_class_id);
CREATE INDEX IF NOT EXISTS idx_folder_shares_group ON folder_shares(target_group_id);
CREATE INDEX IF NOT EXISTS idx_folder_shares_user ON folder_shares(target_user_id);
CREATE INDEX IF NOT EXISTS idx_folder_shares_shared_at ON folder_shares(shared_at);
