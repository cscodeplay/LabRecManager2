-- ============================================================
-- LAPTOP INVENTORY DATA
-- Acer TravelMate P246M Laptops - Computer Lab 2
-- ============================================================

-- NOTE: This will assign laptops to "Computer Lab 2" (or similar name)
-- First, get the lab ID for Computer Lab 2

-- Insert CR series laptops (18 laptops) into Computer Lab 2
INSERT INTO lab_items (item_number, item_type, brand, model_no, serial_no, status, school_id, lab_id)
SELECT val.item_number, 'laptop', 'Acer', 'TravelMate P246M', val.serial_no, 'active', s.id,
       COALESCE((SELECT id FROM labs WHERE LOWER(name) LIKE '%computer lab 2%' OR LOWER(name) LIKE '%lab 2%' LIMIT 1), NULL)
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

-- Insert SL series laptops (3 laptops) into Computer Lab 2
INSERT INTO lab_items (item_number, item_type, brand, model_no, serial_no, status, school_id, lab_id)
SELECT val.item_number, 'laptop', 'Acer', 'TravelMate P246M', val.serial_no, 'active', s.id,
       COALESCE((SELECT id FROM labs WHERE LOWER(name) LIKE '%computer lab 2%' OR LOWER(name) LIKE '%lab 2%' LIMIT 1), NULL)
FROM schools s
CROSS JOIN (VALUES
    ('SL-01', 'UNVA8S1001F3875894'),
    ('SL-02', 'UNVA8S1001F3875893'),
    ('SL-03', 'UNVA8S1001F3879450')
) AS val(item_number, serial_no)
WHERE s.id = (SELECT id FROM schools LIMIT 1)
ON CONFLICT DO NOTHING;

-- Update existing laptops to assign to Computer Lab 2 (if already inserted without lab)
UPDATE lab_items 
SET lab_id = (SELECT id FROM labs WHERE LOWER(name) LIKE '%computer lab 2%' OR LOWER(name) LIKE '%lab 2%' LIMIT 1)
WHERE item_type = 'laptop' AND lab_id IS NULL;

-- Verify inserted laptops with their lab assignment
SELECT li.item_number, li.brand, li.model_no, li.serial_no, li.status, l.name as lab_name
FROM lab_items li
LEFT JOIN labs l ON li.lab_id = l.id
WHERE li.item_type = 'laptop' 
ORDER BY li.item_number;

