-- ============================================================
-- LAPTOP INVENTORY DATA
-- Acer TravelMate P246M Laptops
-- ============================================================

-- NOTE: Replace 'YOUR_SCHOOL_ID' with actual school UUID
-- You can find it with: SELECT id FROM schools LIMIT 1;

-- First, get school ID (run this to find your school_id)
-- SELECT id, name FROM schools;

-- Insert CR series laptops (18 laptops)
INSERT INTO lab_items (item_number, item_type, brand, model_no, serial_no, status, school_id)
SELECT val.item_number, 'laptop', 'Acer', 'TravelMate P246M', val.serial_no, 'active', s.id
FROM schools s
CROSS JOIN (VALUES
    ('CR-01', 'UNVA8S1001F3879436'),
    ('CR-02', 'UNVA8S1001F3879401'),
    ('CR-03', 'UNVA8S1001F3879487'),
    ('CR-04', 'UNVA8S1001F3879480'),
    ('CR-05', 'UNVA8S1001F3879475'),
    ('CR-06', 'UNVA8S1001F3879452'),
    ('CR-07', 'UNVA8S1001F3879393'),
    ('CR-08', 'UNVA8S1001F3879474'),
    ('CR-09', 'UNVA8S1001F3879391'),
    ('CR-10', 'UNVA8S1001F3879399'),
    ('CR-11', 'UNVA8S1001F3879441'),
    ('CR-12', 'UNVA8S1001F3879370'),
    ('CR-13', 'UNVA8S1001F3879486'),
    ('CR-14', 'UNVA8S1001F3879397'),
    ('CR-15', 'UNVA8S1001F3879427'),
    ('CR-16', 'UNVA8S1001F3879455'),
    ('CR-17', 'UNVA8S1001F3879459'),
    ('CR-18', 'UNVA8S1001F3879409')
) AS val(item_number, serial_no)
WHERE s.id = (SELECT id FROM schools LIMIT 1)
ON CONFLICT DO NOTHING;

-- Insert SL series laptops (3 laptops)
INSERT INTO lab_items (item_number, item_type, brand, model_no, serial_no, status, school_id)
SELECT val.item_number, 'laptop', 'Acer', 'TravelMate P246M', val.serial_no, 'active', s.id
FROM schools s
CROSS JOIN (VALUES
    ('SL-01', 'UNVA8S1001F3875894'),
    ('SL-02', 'UNVA8S1001F3875893'),
    ('SL-03', 'UNVA8S1001F3879450')
) AS val(item_number, serial_no)
WHERE s.id = (SELECT id FROM schools LIMIT 1)
ON CONFLICT DO NOTHING;

-- Verify inserted laptops
SELECT item_number, brand, model_no, serial_no, status 
FROM lab_items 
WHERE item_type = 'laptop' 
ORDER BY item_number;
