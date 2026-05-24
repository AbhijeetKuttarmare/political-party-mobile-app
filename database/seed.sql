-- =============================================================
-- NCP-SP Campaign App — Seed Data (Wardha District Demo)
-- Run AFTER schema.sql
-- Run: psql -U postgres -d ncp_campaign -f database/seed.sql
-- =============================================================

-- ─── Elections ────────────────────────────────────────────────
INSERT INTO elections (id, label, short_name, icon) VALUES
  ('ls', 'Lok Sabha',         'LS', '🏛️'),
  ('vs', 'Vidhan Sabha',      'VS', '🏟️'),
  ('vp', 'Vidhan Parishad',   'VP', '⚖️'),
  ('mc', 'Municipal Corp.',   'MC', '🏙️'),
  ('zp', 'Zilla Parishad',    'ZP', '🏢'),
  ('ps', 'Panchayat Samiti',  'PS', '🌾'),
  ('gp', 'Gram Panchayat',    'GP', '🌿'),
  ('np', 'Nagar Panchayat',   'NP', '🏘️')
ON CONFLICT (id) DO NOTHING;

-- ─── Districts ────────────────────────────────────────────────
INSERT INTO districts (name, division) VALUES
  ('Wardha',     'Amravati'),
  ('Nagpur',     'Nagpur'),
  ('Amravati',   'Amravati'),
  ('Yavatmal',   'Amravati'),
  ('Pune',       'Pune'),
  ('Nashik',     'Nashik'),
  ('Aurangabad', 'Aurangabad'),
  ('Kolhapur',   'Pune')
ON CONFLICT DO NOTHING;

-- ─── Areas: Wardha ZP ─────────────────────────────────────────
INSERT INTO areas (id, name, sub_label, election_id, district_id, total_voters, total_booths, ncp_vote_share, ncp_status, coverage_pct, active_volunteers)
SELECT a.id, a.name, a.sub_label, a.election_id, d.id,
       a.total_voters, a.total_booths, a.ncp_vote_share, a.ncp_status,
       a.coverage_pct, a.active_volunteers
FROM (VALUES
  ('wardha-zp',     'Wardha',       'Taluka', 'zp', 125000, 142, 68.0, 'strong',   74, 28),
  ('seloo-zp',      'Seloo',        'Taluka', 'zp',  98000, 112, 51.0, 'swing',    58, 18),
  ('deoli-zp',      'Deoli',        'Taluka', 'zp', 112000, 128, 47.0, 'swing',    62, 22),
  ('arvi-zp',       'Arvi',         'Taluka', 'zp',  89000, 102, 35.0, 'weak',     43, 14),
  ('hinganghat-zp', 'Hinganghat',   'Taluka', 'zp', 145000, 165, 72.0, 'strong',   78, 38),
  ('samudrapur-zp', 'Samudrapur',   'Taluka', 'zp',  76000,  87, 43.0, 'swing',    51, 12),
  ('karanja-zp',    'Karanja Ghat', 'Taluka', 'zp',  93000, 106, 55.0, 'swing',    64, 16),
  ('ashti-zp',      'Ashti',        'Taluka', 'zp',  67000,  77, 31.0, 'weak',     38, 10)
) AS a(id, name, sub_label, election_id, total_voters, total_booths, ncp_vote_share, ncp_status, coverage_pct, active_volunteers)
JOIN districts d ON d.name = 'Wardha'
ON CONFLICT (id) DO NOTHING;

-- ─── Areas: Wardha VS ─────────────────────────────────────────
INSERT INTO areas (id, name, sub_label, election_id, district_id, total_voters, total_booths, ncp_vote_share, ncp_status, coverage_pct, active_volunteers)
SELECT a.id, a.name, a.sub_label, a.election_id, d.id,
       a.total_voters, a.total_booths, a.ncp_vote_share, a.ncp_status,
       a.coverage_pct, a.active_volunteers
FROM (VALUES
  ('arvi-vs',       'Arvi',       'Assembly Constituency', 'vs', 245000, 289, 44.0, 'swing',  61, 42),
  ('deoli-vs',      'Deoli',      'Assembly Constituency', 'vs', 268000, 312, 48.0, 'swing',  65, 48),
  ('hinganghat-vs', 'Hinganghat', 'Assembly Constituency', 'vs', 312000, 367, 62.0, 'strong', 74, 68),
  ('wardha-vs',     'Wardha',     'Assembly Constituency', 'vs', 289000, 341, 51.0, 'swing',  68, 55),
  ('kalamb-vs',     'Kalamb',     'Assembly Constituency', 'vs', 198000, 234, 33.0, 'weak',   45, 28)
) AS a(id, name, sub_label, election_id, total_voters, total_booths, ncp_vote_share, ncp_status, coverage_pct, active_volunteers)
JOIN districts d ON d.name = 'Wardha'
ON CONFLICT (id) DO NOTHING;

-- ─── Areas: LS, MC, PS, GP, NP ────────────────────────────────
INSERT INTO areas (id, name, sub_label, election_id, district_id, total_voters, total_booths, ncp_vote_share, ncp_status, coverage_pct, active_volunteers)
SELECT a.id, a.name, a.sub_label, a.election_id, d.id,
       a.total_voters, a.total_booths, a.ncp_vote_share, a.ncp_status,
       a.coverage_pct, a.active_volunteers
FROM (VALUES
  ('wardha-ls',     'Wardha',       'Lok Sabha Constituency',   'ls', 1650000, 1842, 36.0, 'swing',  58, 245),
  ('wardha-mc',     'Wardha City',  'Municipal Council',        'mc',   89000,   98, 67.0, 'strong', 71,  32),
  ('hinganghat-mc', 'Hinganghat',   'Municipal Council',        'mc',   72000,   81, 54.0, 'swing',  63,  24),
  ('wardha-ps',     'Wardha',       'Panchayat Samiti',         'ps',   62000,   68, 65.0, 'strong', 71,  14),
  ('hinganghat-ps', 'Hinganghat',   'Panchayat Samiti',         'ps',   71000,   79, 70.0, 'strong', 76,  18),
  ('arvi-ps',       'Arvi',         'Panchayat Samiti',         'ps',   43000,   48, 34.0, 'weak',   41,   7),
  ('pulgaon-np',    'Pulgaon',      'Nagar Panchayat',          'np',   18000,   21, 66.0, 'strong', 73,   8),
  ('arvi-np',       'Arvi',         'Nagar Panchayat',          'np',   22000,   25, 52.0, 'swing',  61,   9),
  ('salod-gp',      'Salod',        'Gram Panchayat',           'gp',    3200,    4, 71.0, 'strong', 82,   3),
  ('pulgaon-gp',    'Pulgaon',      'Gram Panchayat',           'gp',    2800,    3, 55.0, 'swing',  68,   2)
) AS a(id, name, sub_label, election_id, total_voters, total_booths, ncp_vote_share, ncp_status, coverage_pct, active_volunteers)
JOIN districts d ON d.name = 'Wardha'
ON CONFLICT (id) DO NOTHING;

-- ─── Booths: Sample Wardha ZP booths ──────────────────────────
INSERT INTO booths (booth_number, village, taluka, district_id, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, last_survey_at, last_activity_at)
SELECT b.booth_number, b.village, b.taluka, d.id, b.constituency, b.area_id, b.election_id,
       b.total_voters, b.covered, b.sentiment_pct, b.women_outreach, b.youth_support,
       b.volunteers, b.max_volunteers, b.status, b.trend, b.booth_leader,
       NOW() - (b.mins_ago_survey || ' minutes')::INTERVAL,
       NOW() - (b.mins_ago_activity || ' minutes')::INTERVAL
FROM (VALUES
  ('W-04', 'Wardha',          'Wardha',     'ZP Wardha-1',     'wardha-zp',     'zp', 1180, 874,  72, 65, 58, 4, 5, 'strong',   'up',     'Rajesh Pawar',    8,  2),
  ('W-09', 'Ghat Road Ward',  'Wardha',     'ZP Wardha-2',     'wardha-zp',     'zp', 1050, 756,  68, 61, 54, 3, 5, 'strong',   'up',     'Meena Bhad',     15,  5),
  ('W-14', 'Salod Hirapur',   'Wardha',     'ZP Wardha-3',     'wardha-zp',     'zp',  920, 589,  59, 51, 44, 2, 4, 'swing',    'stable', 'Sunil Thakre',   35, 18),
  ('H-02', 'Hinganghat Main', 'Hinganghat', 'ZP Hinganghat-1', 'hinganghat-zp', 'zp', 1420,1222,  84, 77, 71, 5, 6, 'strong',   'up',     'Kavita Desai',    4,  1),
  ('H-07', 'Pulgaon',         'Hinganghat', 'ZP Hinganghat-2', 'hinganghat-zp', 'zp', 1180, 948,  79, 72, 65, 4, 5, 'strong',   'up',     'Prashant Kaware',11,  4),
  ('H-15', 'Nandgaon Khdes.', 'Hinganghat', 'ZP Hinganghat-3', 'hinganghat-zp', 'zp',  980, 745,  71, 64, 57, 3, 5, 'strong',   'up',     'Anita Shende',   22,  9),
  ('A-03', 'Arvi',            'Arvi',       'ZP Arvi-1',       'arvi-zp',       'zp', 1080, 324,  41, 33, 28, 1, 4, 'critical', 'down',   'Ganesh Ware',   120, 40),
  ('A-11', 'Karwand',         'Arvi',       'ZP Arvi-2',       'arvi-zp',       'zp',  850, 340,  38, 30, 25, 2, 4, 'weak',     'down',   'Nilesh Kale',    60, 28),
  ('S-06', 'Seloo',           'Seloo',      'ZP Seloo-1',      'seloo-zp',      'zp',  980, 588,  62, 55, 48, 3, 5, 'swing',    'stable', 'Vaibhav Pande',  28, 12),
  ('S-12', 'Sindi',           'Seloo',      'ZP Seloo-2',      'seloo-zp',      'zp',  760, 380,  51, 43, 37, 2, 4, 'swing',    'stable', 'Rekha Mahajan',  48, 22),
  ('D-05', 'Deoli',           'Deoli',      'ZP Deoli-1',      'deoli-zp',      'zp', 1120, 672,  58, 50, 43, 3, 5, 'swing',    'stable', 'Pramod Gedam',   40, 18),
  ('D-10', 'Gondkhairi',      'Deoli',      'ZP Deoli-2',      'deoli-zp',      'zp',  890, 534,  55, 47, 40, 2, 4, 'swing',    'up',     'Sanjay Aswar',   55, 25),
  ('SM-08','Samudrapur',      'Samudrapur', 'ZP Samudrapur-1', 'samudrapur-zp', 'zp',  920, 460,  48, 40, 34, 2, 4, 'weak',     'stable', 'Hema Chandekar', 60, 30),
  ('K-04', 'Karanja Ghat',    'Karanja Ghat','ZP Karanja-1',  'karanja-zp',    'zp', 1040, 666,  64, 57, 50, 3, 5, 'swing',    'up',     'Dinesh Savarkar',32, 14),
  ('AS-02','Ashti',           'Ashti',      'ZP Ashti-1',      'ashti-zp',      'zp',  780, 234,  35, 27, 22, 1, 3, 'critical', 'down',   'Mahesh Nimkar',  180, 60)
) AS b(booth_number, village, taluka, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, mins_ago_survey, mins_ago_activity)
JOIN districts d ON d.name = 'Wardha';

-- ─── Populate booth_stats_cache for the booths we just inserted ─
INSERT INTO booth_stats_cache (booth_id, total_voters, contacted, surveyed, confirmed_ncp, undecided, opposition, coverage_pct, sentiment_pct, active_volunteers)
SELECT
  b.id,
  b.total_voters,
  b.covered,
  ROUND(b.covered * 0.76),
  ROUND(b.total_voters * (b.sentiment_pct / 100.0) * 0.78),
  ROUND(b.total_voters * 0.17),
  GREATEST(0, b.total_voters - ROUND(b.total_voters * (b.sentiment_pct / 100.0) * 0.78) - ROUND(b.total_voters * 0.17)),
  CASE WHEN b.total_voters > 0 THEN ROUND((b.covered::NUMERIC / b.total_voters) * 100) ELSE 0 END,
  b.sentiment_pct,
  b.volunteers
FROM booths b
ON CONFLICT (booth_id) DO UPDATE SET
  total_voters      = EXCLUDED.total_voters,
  contacted         = EXCLUDED.contacted,
  surveyed          = EXCLUDED.surveyed,
  confirmed_ncp     = EXCLUDED.confirmed_ncp,
  undecided         = EXCLUDED.undecided,
  opposition        = EXCLUDED.opposition,
  coverage_pct      = EXCLUDED.coverage_pct,
  sentiment_pct     = EXCLUDED.sentiment_pct,
  active_volunteers = EXCLUDED.active_volunteers,
  last_computed_at  = NOW();

SELECT 'Seed data inserted successfully!' AS status;
SELECT 'Elections: ' || COUNT(*) FROM elections;
SELECT 'Districts: ' || COUNT(*) FROM districts;
SELECT 'Areas: '     || COUNT(*) FROM areas;
SELECT 'Booths: '    || COUNT(*) FROM booths;
