-- Check if academic years exist
SELECT * FROM academic_years;

-- If empty, insert sample academic years:
INSERT INTO academic_years (id, school_id, year_label, start_date, end_date, is_current)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM schools LIMIT 1),
    '2024-25',
    '2024-04-01',
    '2025-03-31',
    false
WHERE NOT EXISTS (SELECT 1 FROM academic_years WHERE year_label = '2024-25');

INSERT INTO academic_years (id, school_id, year_label, start_date, end_date, is_current)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM schools LIMIT 1),
    '2025-26',
    '2025-04-01',
    '2026-03-31',
    true
WHERE NOT EXISTS (SELECT 1 FROM academic_years WHERE year_label = '2025-26');

-- Verify academic years after insert
SELECT * FROM academic_years ORDER BY start_date;
