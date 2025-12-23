-- =====================================================
-- FIX: Update valid_target constraint to include 'student'
-- Run this in Neon SQL console
-- =====================================================

-- Drop the old constraint
ALTER TABLE document_shares DROP CONSTRAINT IF EXISTS valid_target;

-- Recreate with 'student' included
ALTER TABLE document_shares ADD CONSTRAINT valid_target CHECK (
    (target_type = 'class' AND target_class_id IS NOT NULL) OR
    (target_type = 'group' AND target_group_id IS NOT NULL) OR
    (target_type IN ('instructor', 'admin', 'student') AND target_user_id IS NOT NULL)
);

-- Done!
SELECT 'Constraint updated successfully!' as status;
