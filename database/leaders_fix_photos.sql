-- =============================================================
-- Fix duplicate leaders + add real Wikipedia photo URLs
-- Run: psql -U postgres -d ncp_campaign -f database/leaders_fix_photos.sql
-- =============================================================

-- Step 1: Remove duplicates — keep only the row with lowest id per (name, category)
DELETE FROM party_leaders
WHERE id NOT IN (
  SELECT MIN(id)
  FROM party_leaders
  GROUP BY name, category
);

-- Step 2: Add unique constraint so this can't happen again
ALTER TABLE party_leaders DROP CONSTRAINT IF EXISTS uq_party_leaders_name_category;
ALTER TABLE party_leaders ADD CONSTRAINT uq_party_leaders_name_category UNIQUE (name, category);

-- Step 3: Update with real Wikipedia photo URLs
UPDATE party_leaders SET photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Sharad_Pawar_addressing_the_National_Conference_on_Cooperatives_for_the_celebration_of_International_Year_of_Cooperatives%2C_2012%2C_in_New_Delhi_on_May_15%2C_2012_%28cropped%29.jpg/250px-thumbnail.jpg'
WHERE name = 'Sharad Pawar';

UPDATE party_leaders SET photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Supriya_Sule.png/250px-Supriya_Sule.png'
WHERE name = 'Supriya Sule';

UPDATE party_leaders SET photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Amolkolhe.png/250px-Amolkolhe.png'
WHERE name = 'Amol Kolhe';

UPDATE party_leaders SET photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Jayant_Patil_%28cropped%29.jpg/250px-Jayant_Patil_%28cropped%29.jpg'
WHERE name = 'Jayant Patil';

UPDATE party_leaders SET photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/RR_Pawar.png/250px-RR_Pawar.png'
WHERE name = 'Rohit Pawar';

UPDATE party_leaders SET photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Anil_Deshmukh.png/250px-Anil_Deshmukh.png'
WHERE name = 'Anil Deshmukh';

UPDATE party_leaders SET photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Eknath_Khadse.jpg/250px-Eknath_Khadse.jpg'
WHERE name = 'Eknath Khadse';

-- Verify
SELECT id, name, category, photo_url IS NOT NULL AS has_photo
FROM party_leaders
ORDER BY sort_order, name;

SELECT COUNT(*) AS total_leaders FROM party_leaders;
