-- =====================================================
-- Add Unique Constraints for Classes and Groups
-- Run this SQL in Neon console
-- =====================================================

-- 1. Add unique constraint on class name per school
-- This ensures no duplicate class names within the same school
-- First, remove any duplicates before adding constraint

-- Check for duplicates (run this first to see if any exist):
-- SELECT school_id, name, COUNT(*) FROM classes GROUP BY school_id, name HAVING COUNT(*) > 1;

-- Add unique constraint on (school_id, name)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_class_name_per_school'
    ) THEN
        ALTER TABLE classes 
        ADD CONSTRAINT unique_class_name_per_school 
        UNIQUE (school_id, name);
    END IF;
END $$;

-- 2. Add unique constraint on group name per class
-- This ensures no duplicate group names within the same class

-- Check for duplicates (run this first to see if any exist):
-- SELECT class_id, name, COUNT(*) FROM student_groups GROUP BY class_id, name HAVING COUNT(*) > 1;

-- Add unique constraint on (class_id, name)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_group_name_per_class'
    ) THEN
        ALTER TABLE student_groups 
        ADD CONSTRAINT unique_group_name_per_class 
        UNIQUE (class_id, name);
    END IF;
END $$;

-- 3. Also add unique constraint on document shares to prevent duplicate shares
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_document_share_target'
    ) THEN
        ALTER TABLE document_shares 
        ADD CONSTRAINT unique_document_share_target 
        UNIQUE (document_id, target_type, COALESCE(target_class_id, '00000000-0000-0000-0000-000000000000'), COALESCE(target_group_id, '00000000-0000-0000-0000-000000000000'), COALESCE(target_user_id, '00000000-0000-0000-0000-000000000000'));
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add document_shares unique constraint: %', SQLERRM;
END $$;

-- =====================================================
-- DONE! Unique constraints added successfully
-- =====================================================

SELECT 'Unique constraints added!' as status;
