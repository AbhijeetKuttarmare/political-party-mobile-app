-- =============================================================
-- Maharashtra All 36 Districts — ZP Areas Seed
-- Adds all 36 districts to districts table and creates one
-- district-level ZP area per district for the Live Campaign screen.
-- Run: node backend/migrate.js  (or psql -f this file)
-- =============================================================

-- ─── Insert all 36 Maharashtra districts ──────────────────────
INSERT INTO districts (name, division) VALUES
  ('Ahmednagar',       'Nashik'),
  ('Akola',            'Amravati'),
  ('Amravati',         'Amravati'),
  ('Aurangabad',       'Aurangabad'),
  ('Beed',             'Aurangabad'),
  ('Bhandara',         'Nagpur'),
  ('Buldhana',         'Amravati'),
  ('Chandrapur',       'Nagpur'),
  ('Dhule',            'Nashik'),
  ('Gadchiroli',       'Nagpur'),
  ('Gondia',           'Nagpur'),
  ('Hingoli',          'Aurangabad'),
  ('Jalgaon',          'Nashik'),
  ('Jalna',            'Aurangabad'),
  ('Kolhapur',         'Pune'),
  ('Latur',            'Aurangabad'),
  ('Mumbai City',      'Konkan'),
  ('Mumbai Suburban',  'Konkan'),
  ('Nagpur',           'Nagpur'),
  ('Nanded',           'Aurangabad'),
  ('Nandurbar',        'Nashik'),
  ('Nashik',           'Nashik'),
  ('Osmanabad',        'Aurangabad'),
  ('Palghar',          'Konkan'),
  ('Parbhani',         'Aurangabad'),
  ('Pune',             'Pune'),
  ('Raigad',           'Konkan'),
  ('Ratnagiri',        'Konkan'),
  ('Sangli',           'Pune'),
  ('Satara',           'Pune'),
  ('Sindhudurg',       'Konkan'),
  ('Solapur',          'Pune'),
  ('Thane',            'Konkan'),
  ('Wardha',           'Amravati'),
  ('Washim',           'Amravati'),
  ('Yavatmal',         'Amravati')
ON CONFLICT DO NOTHING;

-- ─── District-level ZP areas for all 36 districts ─────────────
-- Area ID pattern: zp-{district-slug}
-- These represent each district as a single ZP "area" for the
-- top-level Maharashtra drill-down view.

INSERT INTO areas (id, name, sub_label, election_id, district_id,
                   total_voters, total_booths, ncp_vote_share, ncp_status,
                   coverage_pct, active_volunteers)
SELECT
  a.area_id, a.name, a.sub_label, 'zp', d.id,
  a.total_voters, a.total_booths,
  a.ncp_vote_share,
  CASE
    WHEN a.ncp_vote_share >= 55 THEN 'strong'
    WHEN a.ncp_vote_share >= 40 THEN 'swing'
    WHEN a.ncp_vote_share >= 30 THEN 'weak'
    ELSE 'critical'
  END,
  a.coverage_pct, a.active_volunteers
FROM (VALUES
  -- Konkan Division
  ('zp-mumbai-city',     'Mumbai City',     'Zilla Parishad · Konkan',    2200000,  1720,  22.0,  18,   85),
  ('zp-mumbai-suburban', 'Mumbai Suburban', 'Zilla Parishad · Konkan',    8200000,  6450,  25.0,  21,  320),
  ('zp-thane',           'Thane',           'Zilla Parishad · Konkan',    6700000,  5280,  27.0,  24,  240),
  ('zp-raigad',          'Raigad',          'Zilla Parishad · Konkan',    2800000,  2210,  38.0,  42,   88),
  ('zp-ratnagiri',       'Ratnagiri',       'Zilla Parishad · Konkan',    1800000,  1420,  32.0,  38,   55),
  ('zp-sindhudurg',      'Sindhudurg',      'Zilla Parishad · Konkan',    1000000,   790,  28.0,  33,   28),
  ('zp-palghar',         'Palghar',         'Zilla Parishad · Konkan',    3200000,  2520,  32.0,  36,   96),
  -- Nashik Division
  ('zp-nashik',          'Nashik',          'Zilla Parishad · Nashik',    6200000,  4880,  44.0,  48,  210),
  ('zp-dhule',           'Dhule',           'Zilla Parishad · Nashik',    2000000,  1580,  33.0,  37,   58),
  ('zp-nandurbar',       'Nandurbar',       'Zilla Parishad · Nashik',    1800000,  1420,  38.0,  41,   54),
  ('zp-jalgaon',         'Jalgaon',         'Zilla Parishad · Nashik',    3600000,  2840,  30.0,  34,   98),
  ('zp-ahmednagar',      'Ahmednagar',      'Zilla Parishad · Nashik',    4700000,  3700,  52.0,  55,  175),
  -- Pune Division
  ('zp-pune',            'Pune',            'Zilla Parishad · Pune',      8700000,  6840,  55.0,  59,  380),
  ('zp-satara',          'Satara',          'Zilla Parishad · Pune',      3000000,  2360,  52.0,  56,  112),
  ('zp-sangli',          'Sangli',          'Zilla Parishad · Pune',      2800000,  2200,  48.0,  51,   95),
  ('zp-solapur',         'Solapur',         'Zilla Parishad · Pune',      3800000,  2990,  40.0,  44,  125),
  ('zp-kolhapur',        'Kolhapur',        'Zilla Parishad · Pune',      3200000,  2520,  45.0,  49,  108),
  -- Aurangabad Division
  ('zp-aurangabad',      'Aurangabad',      'Zilla Parishad · Aurangabad',4200000,  3310,  35.0,  38,  130),
  ('zp-jalna',           'Jalna',           'Zilla Parishad · Aurangabad',2200000,  1730,  38.0,  42,   65),
  ('zp-beed',            'Beed',            'Zilla Parishad · Aurangabad',2500000,  1970,  42.0,  45,   80),
  ('zp-osmanabad',       'Osmanabad',       'Zilla Parishad · Aurangabad',1600000,  1260,  35.0,  39,   45),
  ('zp-nanded',          'Nanded',          'Zilla Parishad · Aurangabad',2800000,  2200,  42.0,  46,   88),
  ('zp-parbhani',        'Parbhani',        'Zilla Parishad · Aurangabad',2000000,  1580,  36.0,  39,   58),
  ('zp-hingoli',         'Hingoli',         'Zilla Parishad · Aurangabad',1600000,  1260,  36.0,  39,   44),
  ('zp-latur',           'Latur',           'Zilla Parishad · Aurangabad',2400000,  1890,  40.0,  44,   75),
  -- Amravati Division
  ('zp-amravati',        'Amravati',        'Zilla Parishad · Amravati',  2500000,  1970,  48.0,  52,   82),
  ('zp-yavatmal',        'Yavatmal',        'Zilla Parishad · Amravati',  2800000,  2200,  45.0,  49,   88),
  ('zp-washim',          'Washim',          'Zilla Parishad · Amravati',  1500000,  1180,  36.0,  40,   42),
  ('zp-buldhana',        'Buldhana',        'Zilla Parishad · Amravati',  2600000,  2050,  40.0,  44,   78),
  ('zp-akola',           'Akola',           'Zilla Parishad · Amravati',  2200000,  1730,  38.0,  42,   65),
  -- Nagpur Division
  ('zp-nagpur',          'Nagpur',          'Zilla Parishad · Nagpur',    4500000,  3540,  28.0,  31,  138),
  ('zp-wardha',          'Wardha',          'Zilla Parishad · Nagpur',    1800000,  1420,  58.0,  62,   68),
  ('zp-bhandara',        'Bhandara',        'Zilla Parishad · Nagpur',    1500000,  1180,  45.0,  49,   46),
  ('zp-gondia',          'Gondia',          'Zilla Parishad · Nagpur',    1800000,  1420,  46.0,  50,   54),
  ('zp-chandrapur',      'Chandrapur',      'Zilla Parishad · Nagpur',    2200000,  1730,  38.0,  42,   66),
  ('zp-gadchiroli',      'Gadchiroli',      'Zilla Parishad · Nagpur',    1200000,   950,  44.0,  47,   36)
) AS a(area_id, name, sub_label, total_voters, total_booths, ncp_vote_share, coverage_pct, active_volunteers)
JOIN districts d ON LOWER(d.name) = LOWER(
  CASE a.area_id
    WHEN 'zp-mumbai-city'     THEN 'Mumbai City'
    WHEN 'zp-mumbai-suburban' THEN 'Mumbai Suburban'
    ELSE REPLACE(REPLACE(a.area_id, 'zp-', ''), '-', ' ')
  END
)
ON CONFLICT (id) DO NOTHING;

-- ─── Also add VS (Vidhan Sabha) district-level areas ──────────
INSERT INTO areas (id, name, sub_label, election_id, district_id,
                   total_voters, total_booths, ncp_vote_share, ncp_status,
                   coverage_pct, active_volunteers)
SELECT
  REPLACE(a.id, 'zp-', 'vs-'), a.name, REPLACE(a.sub_label, 'Zilla Parishad', 'Vidhan Sabha'),
  'vs', a.district_id,
  a.total_voters, a.total_booths,
  GREATEST(0, a.ncp_vote_share - 5),
  CASE
    WHEN GREATEST(0, a.ncp_vote_share - 5) >= 55 THEN 'strong'
    WHEN GREATEST(0, a.ncp_vote_share - 5) >= 40 THEN 'swing'
    WHEN GREATEST(0, a.ncp_vote_share - 5) >= 30 THEN 'weak'
    ELSE 'critical'
  END,
  a.coverage_pct, a.active_volunteers
FROM areas a
WHERE a.id LIKE 'zp-%'
  AND a.election_id = 'zp'
ON CONFLICT (id) DO NOTHING;

-- ─── Add LS (Lok Sabha) district-level areas ──────────────────
INSERT INTO areas (id, name, sub_label, election_id, district_id,
                   total_voters, total_booths, ncp_vote_share, ncp_status,
                   coverage_pct, active_volunteers)
SELECT
  REPLACE(a.id, 'zp-', 'ls-'), a.name, REPLACE(a.sub_label, 'Zilla Parishad', 'Lok Sabha'),
  'ls', a.district_id,
  a.total_voters, a.total_booths,
  GREATEST(0, a.ncp_vote_share - 8),
  CASE
    WHEN GREATEST(0, a.ncp_vote_share - 8) >= 55 THEN 'strong'
    WHEN GREATEST(0, a.ncp_vote_share - 8) >= 40 THEN 'swing'
    WHEN GREATEST(0, a.ncp_vote_share - 8) >= 30 THEN 'weak'
    ELSE 'critical'
  END,
  a.coverage_pct, a.active_volunteers
FROM areas a
WHERE a.id LIKE 'zp-%'
  AND a.election_id = 'zp'
ON CONFLICT (id) DO NOTHING;
