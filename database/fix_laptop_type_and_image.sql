-- ============================================================
-- FIX LAPTOP ITEM TYPE AND COPY IMAGES
-- ============================================================

-- STEP 1: Update item_type from 'other' to 'laptop' for all laptops
UPDATE lab_items 
SET item_type = 'laptop'
WHERE item_number LIKE 'CR-%' OR item_number LIKE 'SL-%';

-- STEP 2: Copy image from CR-01 to all other laptops (same model)
UPDATE lab_items 
SET image_url = (SELECT image_url FROM lab_items WHERE item_number = 'CR-01' LIMIT 1)
WHERE (item_number LIKE 'CR-%' OR item_number LIKE 'SL-%')
  AND item_number != 'CR-01'
  AND (SELECT image_url FROM lab_items WHERE item_number = 'CR-01' LIMIT 1) IS NOT NULL;

-- STEP 3: Copy image from CL2-PC-001 to all Acer desktops/PCs
UPDATE lab_items 
SET image_url = (SELECT image_url FROM lab_items WHERE item_number = 'CL2-PC-001' LIMIT 1)
WHERE item_type = 'pc'
  AND LOWER(brand) = 'acer'
  AND item_number != 'CL2-PC-001'
  AND (SELECT image_url FROM lab_items WHERE item_number = 'CL2-PC-001' LIMIT 1) IS NOT NULL;

-- STEP 4: Verify laptop updates
SELECT item_number, item_type, brand, model_no, 
       CASE WHEN image_url IS NOT NULL THEN 'Has Image' ELSE 'No Image' END as image_status
FROM lab_items 
WHERE item_number LIKE 'CR-%' OR item_number LIKE 'SL-%'
ORDER BY item_number;

-- STEP 5: Verify Acer desktop updates
SELECT item_number, item_type, brand, model_no, 
       CASE WHEN image_url IS NOT NULL THEN 'Has Image' ELSE 'No Image' END as image_status
FROM lab_items 
WHERE item_type = 'pc' AND LOWER(brand) = 'acer'
ORDER BY item_number;
