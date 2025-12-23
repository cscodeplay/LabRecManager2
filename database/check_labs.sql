-- =====================================================
-- Debug Lab Items and Shift Requests
-- Run in Neon SQL Console
-- =====================================================

-- 1. Check what item types exist in the database
SELECT DISTINCT item_type, COUNT(*) as count 
FROM lab_items 
GROUP BY item_type;

-- 2. Check item status values
SELECT DISTINCT status, COUNT(*) as count 
FROM lab_items 
GROUP BY status;

-- 3. List all lab items with their types and status
SELECT 
    li.id,
    li.item_number,
    li.item_type,
    li.status,
    l.name as lab_name
FROM lab_items li
JOIN labs l ON li.lab_id = l.id
ORDER BY l.name, li.item_type, li.item_number;

-- 4. Check if equipment_shift_requests table exists and has data
SELECT COUNT(*) as total_shift_requests FROM equipment_shift_requests;

-- 5. List any existing shift requests
SELECT * FROM equipment_shift_requests LIMIT 10;

-- 6. Check labs school_id matches (for debugging)
SELECT l.id, l.name, l.school_id, li.item_number, li.item_type
FROM labs l
LEFT JOIN lab_items li ON l.id = li.lab_id
ORDER BY l.name;
