-- =============================================================
-- NCP-SP Campaign App — Full Seed (run after schema.sql)
-- Adds: prev_vote_share column, voter_issues table,
--       missing areas, all booths (VS/LS/MC/VP/PS/GP/NP)
-- Run: psql -U postgres -d ncp_campaign -f database/seed_full.sql
-- =============================================================

-- ─── Elections (idempotent — safe to re-run) ───────────────────
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

-- ─── Districts (idempotent) ────────────────────────────────────
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

-- ─── Schema additions ──────────────────────────────────────────
ALTER TABLE areas
  ADD COLUMN IF NOT EXISTS prev_vote_share NUMERIC(5,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS voter_issues (
  id          SERIAL       PRIMARY KEY,
  election_id VARCHAR(4)   REFERENCES elections(id),
  label       VARCHAR(100) NOT NULL,
  score       INTEGER      DEFAULT 50,
  icon        VARCHAR(10),
  sort_order  INTEGER      DEFAULT 0
);

-- ─── All areas (idempotent) ────────────────────────────────────
INSERT INTO areas (id, name, sub_label, election_id, district_id, total_voters, total_booths, ncp_vote_share, ncp_status, coverage_pct, active_volunteers)
SELECT a.id, a.name, a.sub_label, a.election_id, d.id,
       a.total_voters, a.total_booths, a.ncp_vote_share, a.ncp_status,
       a.coverage_pct, a.active_volunteers
FROM (VALUES
  -- ZP
  ('wardha-zp',        'Wardha',                  'Taluka',             'zp', 125000, 142, 68.0, 'strong', 74, 28),
  ('seloo-zp',         'Seloo',                   'Taluka',             'zp',  98000, 112, 51.0, 'swing',  58, 18),
  ('deoli-zp',         'Deoli',                   'Taluka',             'zp', 112000, 128, 47.0, 'swing',  62, 22),
  ('arvi-zp',          'Arvi',                    'Taluka',             'zp',  89000, 102, 35.0, 'weak',   43, 14),
  ('hinganghat-zp',    'Hinganghat',              'Taluka',             'zp', 145000, 165, 72.0, 'strong', 78, 38),
  ('samudrapur-zp',    'Samudrapur',              'Taluka',             'zp',  76000,  87, 43.0, 'swing',  51, 12),
  ('karanja-zp',       'Karanja Ghat',            'Taluka',             'zp',  93000, 106, 55.0, 'swing',  64, 16),
  ('ashti-zp',         'Ashti',                   'Taluka',             'zp',  67000,  77, 31.0, 'weak',   38, 10),
  -- VS
  ('arvi-vs',          'Arvi',                    'Assembly Constituency','vs',245000, 289, 44.0, 'swing',  61, 42),
  ('deoli-vs',         'Deoli',                   'Assembly Constituency','vs',268000, 312, 48.0, 'swing',  65, 48),
  ('hinganghat-vs',    'Hinganghat',              'Assembly Constituency','vs',312000, 367, 62.0, 'strong', 74, 68),
  ('wardha-vs',        'Wardha',                  'Assembly Constituency','vs',289000, 341, 51.0, 'swing',  68, 55),
  ('kalamb-vs',        'Kalamb',                  'Assembly Constituency','vs',198000, 234, 33.0, 'weak',   45, 28),
  -- LS / MC
  ('wardha-ls',        'Wardha',                  'Lok Sabha Constituency','ls',1650000,1842,36.0,'swing',  58,245),
  ('wardha-mc',        'Wardha City',             'Municipal Council',  'mc',  89000,  98, 67.0, 'strong', 71, 32),
  ('hinganghat-mc',    'Hinganghat',              'Municipal Council',  'mc',  72000,  81, 54.0, 'swing',  63, 24),
  -- VP
  ('amravati-grad',    'Amravati Div. Graduates', 'MLC Constituency',   'vp', 148000, 412, 39.0, 'swing',  52, 34),
  ('amravati-teacher', 'Amravati Div. Teachers',  'MLC Constituency',   'vp',  52000, 180, 28.0, 'weak',   41, 18),
  -- PS
  ('wardha-ps',        'Wardha',                  'Panchayat Samiti',   'ps',  62000,  68, 65.0, 'strong', 71, 14),
  ('hinganghat-ps',    'Hinganghat',              'Panchayat Samiti',   'ps',  71000,  79, 70.0, 'strong', 76, 18),
  ('arvi-ps',          'Arvi',                    'Panchayat Samiti',   'ps',  43000,  48, 34.0, 'weak',   41,  7),
  ('seloo-ps',         'Seloo',                   'Panchayat Samiti',   'ps',  48000,  53, 49.0, 'swing',  55, 10),
  ('deoli-ps',         'Deoli',                   'Panchayat Samiti',   'ps',  55000,  61, 45.0, 'swing',  59, 11),
  ('karanja-ps',       'Karanja Ghat',            'Panchayat Samiti',   'ps',  46000,  51, 52.0, 'swing',  60,  9),
  -- NP
  ('pulgaon-np',       'Pulgaon',                 'Nagar Panchayat',    'np',  18000,  21, 66.0, 'strong', 73,  8),
  ('arvi-np',          'Arvi',                    'Nagar Panchayat',    'np',  22000,  25, 52.0, 'swing',  61,  9),
  ('deoli-np',         'Deoli',                   'Nagar Panchayat',    'np',  16000,  19, 48.0, 'swing',  57,  7),
  ('karanja-np',       'Karanja Ghat',            'Nagar Panchayat',    'np',  25000,  29, 36.0, 'weak',   44,  6),
  -- GP
  ('salod-gp',         'Salod',                   'Gram Panchayat',     'gp',   3200,   4, 71.0, 'strong', 82,  3),
  ('pulgaon-gp',       'Pulgaon',                 'Gram Panchayat',     'gp',   2800,   3, 55.0, 'swing',  68,  2),
  ('talegaon-gp',      'Talegaon',                'Gram Panchayat',     'gp',   1900,   2, 48.0, 'swing',  59,  2),
  ('nandgaon-gp',      'Nandgaon Khandeshwar',    'Gram Panchayat',     'gp',   2400,   3, 63.0, 'strong', 74,  2),
  ('girad-gp',         'Girad',                   'Gram Panchayat',     'gp',   1600,   2, 29.0, 'weak',   35,  1),
  ('aamner-gp',        'Aamner',                  'Gram Panchayat',     'gp',   2100,   2, 44.0, 'swing',  52,  2)
) AS a(id, name, sub_label, election_id, total_voters, total_booths, ncp_vote_share, ncp_status, coverage_pct, active_volunteers)
JOIN districts d ON d.name = 'Wardha'
ON CONFLICT (id) DO NOTHING;

-- ─── Previous election vote shares ────────────────────────────
UPDATE areas SET prev_vote_share = CASE id
  WHEN 'wardha-zp'      THEN 61.0
  WHEN 'hinganghat-zp'  THEN 65.0
  WHEN 'seloo-zp'       THEN 44.0
  WHEN 'deoli-zp'       THEN 40.0
  WHEN 'arvi-zp'        THEN 28.0
  WHEN 'samudrapur-zp'  THEN 37.0
  WHEN 'karanja-zp'     THEN 48.0
  WHEN 'ashti-zp'       THEN 24.0
  WHEN 'hinganghat-vs'  THEN 58.0
  WHEN 'wardha-vs'      THEN 46.0
  WHEN 'arvi-vs'        THEN 30.0
  WHEN 'deoli-vs'       THEN 42.0
  WHEN 'kalamb-vs'      THEN 28.0
  WHEN 'wardha-ls'      THEN 32.0
  WHEN 'wardha-mc'      THEN 61.0
  WHEN 'hinganghat-mc'  THEN 49.0
  WHEN 'wardha-ps'      THEN 58.0
  WHEN 'hinganghat-ps'  THEN 63.0
  WHEN 'arvi-ps'        THEN 27.0
  WHEN 'seloo-ps'       THEN 42.0
  WHEN 'deoli-ps'       THEN 38.0
  WHEN 'karanja-ps'     THEN 45.0
  WHEN 'pulgaon-np'     THEN 59.0
  WHEN 'arvi-np'        THEN 44.0
  WHEN 'deoli-np'       THEN 41.0
  WHEN 'karanja-np'     THEN 30.0
  WHEN 'salod-gp'       THEN 64.0
  WHEN 'pulgaon-gp'     THEN 48.0
  WHEN 'talegaon-gp'    THEN 41.0
  WHEN 'nandgaon-gp'    THEN 55.0
  WHEN 'girad-gp'       THEN 22.0
  WHEN 'aamner-gp'      THEN 37.0
  WHEN 'amravati-grad'  THEN 33.0
  WHEN 'amravati-teacher' THEN 22.0
  ELSE prev_vote_share
END;

-- ─── Voter Issues (all elections share same core issues) ───────
INSERT INTO voter_issues (election_id, label, score, icon, sort_order) VALUES
  ('zp', 'Farm Loan Waiver',   78, '🌾', 1),
  ('zp', 'Water Supply',       64, '💧', 2),
  ('zp', 'Road Infrastructure',71, '🛣️', 3),
  ('zp', 'Employment',         55, '💼', 4),
  ('zp', 'Education Access',   48, '📚', 5),
  ('vs', 'Farm Loan Waiver',   81, '🌾', 1),
  ('vs', 'Water Supply',       69, '💧', 2),
  ('vs', 'Road Infrastructure',74, '🛣️', 3),
  ('vs', 'Employment',         62, '💼', 4),
  ('vs', 'Women Safety',       57, '👩', 5),
  ('ls', 'National Security',  72, '🛡️', 1),
  ('ls', 'Farm Distress',      85, '🌾', 2),
  ('ls', 'Unemployment',       79, '💼', 3),
  ('ls', 'Inflation',          68, '📈', 4),
  ('ls', 'Road & Rail',        61, '🛣️', 5),
  ('mc', 'Drainage & Sanitation',77,'🚰',1),
  ('mc', 'Road Quality',       71, '🛣️', 2),
  ('mc', 'Water Supply',       82, '💧', 3),
  ('mc', 'Street Lights',      58, '💡', 4),
  ('mc', 'Property Tax',       46, '🏠', 5),
  ('ps', 'Village Roads',      76, '🛣️', 1),
  ('ps', 'Drinking Water',     80, '💧', 2),
  ('ps', 'Farm Support',       72, '🌾', 3),
  ('ps', 'School Quality',     54, '📚', 4),
  ('ps', 'Health Centre',      61, '🏥', 5),
  ('gp', 'Drinking Water',     84, '💧', 1),
  ('gp', 'Village Roads',      79, '🛣️', 2),
  ('gp', 'Farm Support',       74, '🌾', 3),
  ('gp', 'School Quality',     58, '📚', 4),
  ('gp', 'Toilet Facilities',  51, '🚻', 5),
  ('np', 'Drainage',           75, '🚰', 1),
  ('np', 'Water Supply',       81, '💧', 2),
  ('np', 'Road Quality',       68, '🛣️', 3),
  ('np', 'Employment',         63, '💼', 4),
  ('np', 'Street Lights',      49, '💡', 5),
  ('vp', 'Higher Education',   71, '🎓', 1),
  ('vp', 'Teacher Salary',     68, '👨‍🏫',2),
  ('vp', 'University Infra',   55, '🏛️', 3),
  ('vp', 'Research Funding',   42, '🔬', 4),
  ('vp', 'Student Jobs',       63, '💼', 5)
ON CONFLICT DO NOTHING;

-- ─── ZP Booths ─────────────────────────────────────────────────
INSERT INTO booths (booth_number, village, taluka, district_id, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, last_survey_at, last_activity_at)
SELECT b.booth_number, b.village, b.taluka, d.id, b.constituency, b.area_id, b.election_id,
       b.total_voters, b.covered, b.sentiment_pct, b.women_outreach, b.youth_support,
       b.volunteers, b.max_volunteers, b.status, b.trend, b.booth_leader,
       NOW() - (b.mins_ago_survey   || ' minutes')::INTERVAL,
       NOW() - (b.mins_ago_activity || ' minutes')::INTERVAL
FROM (VALUES
  ('W-04', 'Wardha',          'Wardha',      'ZP Wardha-1',     'wardha-zp',     'zp', 1180, 874,  72, 65, 58, 4, 5, 'strong',   'up',     'Rajesh Pawar',     8,  2),
  ('W-09', 'Ghat Road Ward',  'Wardha',      'ZP Wardha-2',     'wardha-zp',     'zp', 1050, 756,  68, 61, 54, 3, 5, 'strong',   'up',     'Meena Bhad',      15,  5),
  ('W-14', 'Salod Hirapur',   'Wardha',      'ZP Wardha-3',     'wardha-zp',     'zp',  920, 589,  59, 51, 44, 2, 4, 'swing',    'stable', 'Sunil Thakre',    35, 18),
  ('H-02', 'Hinganghat Main', 'Hinganghat',  'ZP Hinganghat-1', 'hinganghat-zp', 'zp', 1420,1222,  84, 77, 71, 5, 6, 'strong',   'up',     'Kavita Desai',     4,  1),
  ('H-07', 'Pulgaon',         'Hinganghat',  'ZP Hinganghat-2', 'hinganghat-zp', 'zp', 1180, 948,  79, 72, 65, 4, 5, 'strong',   'up',     'Prashant Kaware', 11,  4),
  ('H-15', 'Nandgaon Khdes.', 'Hinganghat',  'ZP Hinganghat-3', 'hinganghat-zp', 'zp',  980, 745,  71, 64, 57, 3, 5, 'strong',   'up',     'Anita Shende',    22,  9),
  ('A-03', 'Arvi',            'Arvi',        'ZP Arvi-1',       'arvi-zp',       'zp', 1080, 324,  41, 33, 28, 1, 4, 'critical', 'down',   'Ganesh Ware',    120, 40),
  ('A-11', 'Karwand',         'Arvi',        'ZP Arvi-2',       'arvi-zp',       'zp',  850, 340,  38, 30, 25, 2, 4, 'weak',     'down',   'Nilesh Kale',     60, 28),
  ('S-06', 'Seloo',           'Seloo',       'ZP Seloo-1',      'seloo-zp',      'zp',  980, 588,  62, 55, 48, 3, 5, 'swing',    'stable', 'Vaibhav Pande',   28, 12),
  ('S-12', 'Sindi',           'Seloo',       'ZP Seloo-2',      'seloo-zp',      'zp',  760, 380,  51, 43, 37, 2, 4, 'swing',    'stable', 'Rekha Mahajan',   48, 22),
  ('D-05', 'Deoli',           'Deoli',       'ZP Deoli-1',      'deoli-zp',      'zp', 1120, 672,  58, 50, 43, 3, 5, 'swing',    'stable', 'Pramod Gedam',    40, 18),
  ('D-10', 'Gondkhairi',      'Deoli',       'ZP Deoli-2',      'deoli-zp',      'zp',  890, 534,  55, 47, 40, 2, 4, 'swing',    'up',     'Sanjay Aswar',    55, 25),
  ('SM-08','Samudrapur',      'Samudrapur',  'ZP Samudrapur-1', 'samudrapur-zp', 'zp',  920, 460,  48, 40, 34, 2, 4, 'weak',     'stable', 'Hema Chandekar',  60, 30),
  ('K-04', 'Karanja Ghat',    'Karanja Ghat','ZP Karanja-1',    'karanja-zp',    'zp', 1040, 666,  64, 57, 50, 3, 5, 'swing',    'up',     'Dinesh Savarkar', 32, 14),
  ('AS-02','Ashti',           'Ashti',       'ZP Ashti-1',      'ashti-zp',      'zp',  780, 234,  35, 27, 22, 1, 3, 'critical', 'down',   'Mahesh Nimkar',  180, 60)
) AS b(booth_number, village, taluka, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, mins_ago_survey, mins_ago_activity)
JOIN districts d ON d.name = 'Wardha';

-- ─── VS Booths ─────────────────────────────────────────────────
INSERT INTO booths (booth_number, village, taluka, district_id, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, last_survey_at, last_activity_at)
SELECT b.booth_number, b.village, b.taluka, d.id, b.constituency, b.area_id, b.election_id,
       b.total_voters, b.covered, b.sentiment_pct, b.women_outreach, b.youth_support,
       b.volunteers, b.max_volunteers, b.status, b.trend, b.booth_leader,
       NOW() - (b.mins_ago_survey   || ' minutes')::INTERVAL,
       NOW() - (b.mins_ago_activity || ' minutes')::INTERVAL
FROM (VALUES
  ('42',  'Hadapsar',      'Haveli',     'Pune East',     'wardha-vs',     'vs', 1240, 843,  74, 61, 58, 4, 6, 'strong',   'up',     'Suresh Pawar',        12,  2),
  ('17',  'Supe',          'Baramati',   'Baramati',      'hinganghat-vs', 'vs',  980, 804,  81, 72, 67, 3, 5, 'strong',   'up',     'Anita Jadhav',         5,  1),
  ('08',  'Loni Kalbhor',  'Haveli',     'Pune East',     'wardha-vs',     'vs', 1120, 347,  48, 32, 29, 1, 4, 'critical', 'down',   'Ramesh Shinde',      120, 45),
  ('55',  'Baramati',      'Baramati',   'Baramati',      'hinganghat-vs', 'vs', 1450,1320,  89, 83, 76, 5, 6, 'strong',   'up',     'Kavita Pawar',         3,  0),
  ('23',  'Morgaon',       'Baramati',   'Baramati',      'arvi-vs',       'vs',  760,   0,   0,  0,  0, 0, 4, 'critical', 'down',   '—',                    0,  0),
  ('31',  'Niphad',        'Niphad',     'Nashik Rural',  'deoli-vs',      'vs', 1090, 589,  56, 48, 42, 2, 5, 'swing',    'stable', 'Yamini Kulkarni',     30, 15),
  ('64',  'Igatpuri',      'Igatpuri',   'Nashik Central','deoli-vs',      'vs',  870, 635,  63, 54, 51, 3, 5, 'swing',    'up',     'Shobha Nikam',        20,  8),
  ('11',  'Cidco',         'Aurangabad', 'Aurangabad East','kalamb-vs',    'vs', 1380, 580,  44, 38, 35, 2, 6, 'weak',     'down',   'Pramod Shinde',       60, 30),
  ('77',  'Lasalgaon',     'Niphad',     'Nashik Rural',  'wardha-vs',     'vs',  920, 737,  71, 65, 59, 4, 5, 'strong',   'stable', 'Dattatray Pawar',     10,  4),
  ('33',  'Kolhapur City', 'Kolhapur',   'Kolhapur North','kalamb-vs',     'vs', 1180, 283,  38, 29, 26, 1, 5, 'critical', 'down',   'Satish Patil',       180, 60),
  ('19',  'Miraj',         'Miraj',      'Sangli',        'hinganghat-vs', 'vs', 1020, 612,  62, 55, 48, 3, 5, 'swing',    'up',     'Jayant Mane',         25, 10),
  ('88',  'Solapur West',  'N. Solapur', 'Solapur N.',    'arvi-vs',       'vs',  890, 356,  47, 39, 34, 2, 4, 'weak',     'down',   'Rohit Deshmukh',      45, 20),
  ('03',  'Deolali',       'Nashik',     'Nashik Central','deoli-vs',      'vs', 1340,1206,  85, 78, 72, 5, 5, 'strong',   'up',     'Anjali Shinde',        7,  1),
  ('46',  'Gangapur',      'Gangapur',   'Aurangabad West','kalamb-vs',    'vs',  980, 421,  49, 41, 37, 2, 5, 'weak',     'down',   'Chandrakant Shinde',  60, 35),
  ('72',  'Satara City',   'Satara',     'Satara',        'hinganghat-vs', 'vs', 1150, 897,  78, 69, 63, 4, 6, 'strong',   'up',     'Savita Jagtap',        8,  3)
) AS b(booth_number, village, taluka, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, mins_ago_survey, mins_ago_activity)
JOIN districts d ON d.name = 'Wardha';

-- ─── LS Booths ─────────────────────────────────────────────────
INSERT INTO booths (booth_number, village, taluka, district_id, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, last_survey_at, last_activity_at)
SELECT b.booth_number, b.village, b.taluka, d.id, b.constituency, b.area_id, b.election_id,
       b.total_voters, b.covered, b.sentiment_pct, b.women_outreach, b.youth_support,
       b.volunteers, b.max_volunteers, b.status, b.trend, b.booth_leader,
       NOW() - (b.mins_ago_survey   || ' minutes')::INTERVAL,
       NOW() - (b.mins_ago_activity || ' minutes')::INTERVAL
FROM (VALUES
  ('L-05', 'Wardha City', 'Wardha',    'Wardha LS', 'wardha-ls', 'ls', 1380, 855,  68, 60, 55, 4, 6, 'strong',   'up',     'Rajesh Wankhede',  9,  3),
  ('L-12', 'Hinganghat',  'Hinganghat','Wardha LS', 'wardha-ls', 'ls', 1480,1243,  82, 75, 68, 5, 6, 'strong',   'up',     'Sunita Kale',      4,  1),
  ('L-21', 'Arvi',        'Arvi',      'Wardha LS', 'wardha-ls', 'ls',  990, 297,  39, 31, 26, 1, 4, 'critical', 'down',   'Mohan Sirsat',   120, 50),
  ('L-33', 'Seloo',       'Seloo',     'Wardha LS', 'wardha-ls', 'ls', 1120, 672,  61, 53, 47, 3, 5, 'swing',    'stable', 'Priya Gaikwad',   22,  9)
) AS b(booth_number, village, taluka, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, mins_ago_survey, mins_ago_activity)
JOIN districts d ON d.name = 'Wardha';

-- ─── MC Booths ─────────────────────────────────────────────────
INSERT INTO booths (booth_number, village, taluka, district_id, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, last_survey_at, last_activity_at)
SELECT b.booth_number, b.village, b.taluka, d.id, b.constituency, b.area_id, b.election_id,
       b.total_voters, b.covered, b.sentiment_pct, b.women_outreach, b.youth_support,
       b.volunteers, b.max_volunteers, b.status, b.trend, b.booth_leader,
       NOW() - (b.mins_ago_survey   || ' minutes')::INTERVAL,
       NOW() - (b.mins_ago_activity || ' minutes')::INTERVAL
FROM (VALUES
  ('MC-01','Wardha West Ward', 'Wardha',    'MC Ward-1',   'wardha-mc',     'mc', 4200,2940, 72, 65, 58, 3, 4, 'strong',  'up',     'Mukesh Jaiswal',   10,  3),
  ('MC-02','Wardha East Ward', 'Wardha',    'MC Ward-2',   'wardha-mc',     'mc', 3800,2280, 64, 58, 51, 2, 4, 'swing',   'stable', 'Savita Nimkar',    22, 10),
  ('MC-03','Basant Nagar',     'Wardha',    'MC Ward-3',   'wardha-mc',     'mc', 4500,3150, 69, 62, 55, 3, 5, 'strong',  'up',     'Praful Tekam',     15,  5),
  ('MC-04','Ambedkar Nagar',   'Wardha',    'MC Ward-4',   'wardha-mc',     'mc', 2900, 870, 38, 30, 25, 1, 3, 'critical','down',   'Jyoti Pawar',     120, 40),
  ('MC-11','Hinganghat Main',  'Hinganghat','MC H-Ward-1', 'hinganghat-mc', 'mc', 5100,3825, 78, 71, 64, 4, 5, 'strong',  'up',     'Vijay Deshpande',   6,  2),
  ('MC-12','Cotton Market',    'Hinganghat','MC H-Ward-2', 'hinganghat-mc', 'mc', 3600,2160, 61, 54, 47, 3, 4, 'swing',   'stable', 'Rekha Shende',     28, 12),
  ('MC-13','New Colony Ward',  'Hinganghat','MC H-Ward-3', 'hinganghat-mc', 'mc', 4200,1680, 49, 42, 36, 2, 4, 'weak',    'down',   'Suresh Ganorkar',  50, 25)
) AS b(booth_number, village, taluka, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, mins_ago_survey, mins_ago_activity)
JOIN districts d ON d.name = 'Wardha';

-- ─── VP Booths ─────────────────────────────────────────────────
INSERT INTO booths (booth_number, village, taluka, district_id, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, last_survey_at, last_activity_at)
SELECT b.booth_number, b.village, b.taluka, d.id, b.constituency, b.area_id, b.election_id,
       b.total_voters, b.covered, b.sentiment_pct, b.women_outreach, b.youth_support,
       b.volunteers, b.max_volunteers, b.status, b.trend, b.booth_leader,
       NOW() - (b.mins_ago_survey   || ' minutes')::INTERVAL,
       NOW() - (b.mins_ago_activity || ' minutes')::INTERVAL
FROM (VALUES
  ('VP-01','Wardha City',    'Wardha',    'Amravati Div. Graduates','amravati-grad',    'vp', 3200,1664, 52, 45, 39, 2, 4, 'swing', 'stable', 'Dr. Ashok Rane',  35, 18),
  ('VP-02','Hinganghat',     'Hinganghat','Amravati Div. Graduates','amravati-grad',    'vp', 2800,1400, 48, 41, 35, 3, 4, 'swing', 'up',     'Sunanda Gokhale', 42, 20),
  ('VP-11','Wardha Teachers','Wardha',    'Amravati Div. Teachers', 'amravati-teacher', 'vp', 1400, 392, 31, 24, 20, 1, 3, 'weak',  'down',   'Ramesh Kulkarni', 60, 35)
) AS b(booth_number, village, taluka, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, mins_ago_survey, mins_ago_activity)
JOIN districts d ON d.name = 'Wardha';

-- ─── PS Booths ─────────────────────────────────────────────────
INSERT INTO booths (booth_number, village, taluka, district_id, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, last_survey_at, last_activity_at)
SELECT b.booth_number, b.village, b.taluka, d.id, b.constituency, b.area_id, b.election_id,
       b.total_voters, b.covered, b.sentiment_pct, b.women_outreach, b.youth_support,
       b.volunteers, b.max_volunteers, b.status, b.trend, b.booth_leader,
       NOW() - (b.mins_ago_survey   || ' minutes')::INTERVAL,
       NOW() - (b.mins_ago_activity || ' minutes')::INTERVAL
FROM (VALUES
  ('PS-01','Wardha',    'Wardha',      'PS Wardha Gat-1',     'wardha-ps',    'ps', 2800,1960, 70, 63, 56, 3, 4, 'strong',  'up',     'Anand Khobragade', 12,  4),
  ('PS-02','Pulgaon',   'Wardha',      'PS Wardha Gat-2',     'wardha-ps',    'ps', 2200,1320, 62, 55, 48, 2, 4, 'swing',   'stable', 'Lata Borkar',      25, 11),
  ('PS-11','Hinganghat','Hinganghat',  'PS Hinganghat Gat-1', 'hinganghat-ps','ps', 3100,2635, 82, 75, 68, 4, 5, 'strong',  'up',     'Deepak Karwande',   7,  2),
  ('PS-12','Nandgaon',  'Hinganghat',  'PS Hinganghat Gat-2', 'hinganghat-ps','ps', 2400,1680, 71, 64, 57, 3, 4, 'strong',  'up',     'Geeta Hatwar',     18,  7),
  ('PS-21','Arvi',      'Arvi',        'PS Arvi Gat-1',       'arvi-ps',      'ps', 1800, 540, 37, 29, 24, 1, 3, 'critical','down',   'Sham Wankhade',   120, 45),
  ('PS-31','Seloo',     'Seloo',       'PS Seloo Gat-1',      'seloo-ps',     'ps', 2100,1050, 55, 48, 41, 2, 4, 'swing',   'stable', 'Nanda Bhuskute',   40, 18),
  ('PS-41','Deoli',     'Deoli',       'PS Deoli Gat-1',      'deoli-ps',     'ps', 2300,1150, 51, 44, 37, 2, 4, 'swing',   'stable', 'Vinod Aswar',      50, 22),
  ('PS-51','Karanja',   'Karanja Ghat','PS Karanja Gat-1',    'karanja-ps',   'ps', 2000,1200, 62, 55, 48, 3, 4, 'swing',   'up',     'Harish Savarkar',  32, 14)
) AS b(booth_number, village, taluka, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, mins_ago_survey, mins_ago_activity)
JOIN districts d ON d.name = 'Wardha';

-- ─── GP Booths ─────────────────────────────────────────────────
INSERT INTO booths (booth_number, village, taluka, district_id, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, last_survey_at, last_activity_at)
SELECT b.booth_number, b.village, b.taluka, d.id, b.constituency, b.area_id, b.election_id,
       b.total_voters, b.covered, b.sentiment_pct, b.women_outreach, b.youth_support,
       b.volunteers, b.max_volunteers, b.status, b.trend, b.booth_leader,
       NOW() - (b.mins_ago_survey   || ' minutes')::INTERVAL,
       NOW() - (b.mins_ago_activity || ' minutes')::INTERVAL
FROM (VALUES
  ('GP-01','Salod',       'Wardha',    'GP Salod',     'salod-gp',    'gp', 1600,1312, 82, 74, 66, 2, 3, 'strong',  'up',     'Balaji Raut',    14,  5),
  ('GP-02','Pulgaon',     'Hinganghat','GP Pulgaon',   'pulgaon-gp',  'gp', 1400, 840, 62, 55, 48, 2, 3, 'swing',   'stable', 'Usha Kaware',    28, 12),
  ('GP-03','Talegaon',    'Wardha',    'GP Talegaon',  'talegaon-gp', 'gp',  950, 475, 52, 45, 39, 1, 2, 'swing',   'stable', 'Gajanan Dhole',  45, 20),
  ('GP-04','Nandgaon K.', 'Hinganghat','GP Nandgaon',  'nandgaon-gp', 'gp', 1200, 888, 74, 67, 60, 2, 2, 'strong',  'up',     'Tara Madavi',    20,  8),
  ('GP-05','Girad',       'Wardha',    'GP Girad',     'girad-gp',    'gp',  800,   0,  0,  0,  0, 0, 2, 'critical','down',   '—',               0,  0),
  ('GP-06','Aamner',      'Wardha',    'GP Aamner',    'aamner-gp',   'gp', 1050, 472, 47, 40, 34, 1, 2, 'swing',   'stable', 'Priti Chinchole', 55, 25)
) AS b(booth_number, village, taluka, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, mins_ago_survey, mins_ago_activity)
JOIN districts d ON d.name = 'Wardha';

-- ─── NP Booths ─────────────────────────────────────────────────
INSERT INTO booths (booth_number, village, taluka, district_id, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, last_survey_at, last_activity_at)
SELECT b.booth_number, b.village, b.taluka, d.id, b.constituency, b.area_id, b.election_id,
       b.total_voters, b.covered, b.sentiment_pct, b.women_outreach, b.youth_support,
       b.volunteers, b.max_volunteers, b.status, b.trend, b.booth_leader,
       NOW() - (b.mins_ago_survey   || ' minutes')::INTERVAL,
       NOW() - (b.mins_ago_activity || ' minutes')::INTERVAL
FROM (VALUES
  ('NP-01','Pulgaon NP', 'Hinganghat',  'NP Pulgaon Ward-1','pulgaon-np', 'np', 4500,3285, 73, 66, 59, 3, 4, 'strong','up',     'Ashok Thakre',   11,  4),
  ('NP-02','Pulgaon NP', 'Hinganghat',  'NP Pulgaon Ward-2','pulgaon-np', 'np', 3800,2280, 64, 57, 50, 2, 3, 'swing', 'stable', 'Suman Waghmare', 30, 14),
  ('NP-11','Arvi NP',    'Arvi',        'NP Arvi Ward-1',   'arvi-np',    'np', 5500,2475, 51, 44, 38, 2, 4, 'swing', 'stable', 'Milind Chavan',  40, 18),
  ('NP-12','Arvi NP',    'Arvi',        'NP Arvi Ward-2',   'arvi-np',    'np', 4200,1260, 39, 31, 26, 1, 3, 'weak',  'down',   'Kamini Zodpe',   60, 30),
  ('NP-21','Deoli NP',   'Deoli',       'NP Deoli Ward-1',  'deoli-np',   'np', 4000,2000, 55, 48, 42, 2, 3, 'swing', 'stable', 'Ramesh Bodkhe',  45, 20),
  ('NP-31','Karanja NP', 'Karanja Ghat','NP Karanja Ward-1','karanja-np', 'np', 6200,2480, 43, 36, 30, 2, 4, 'weak',  'down',   'Surekha Naik',   55, 25)
) AS b(booth_number, village, taluka, constituency, area_id, election_id, total_voters, covered, sentiment_pct, women_outreach, youth_support, volunteers, max_volunteers, status, trend, booth_leader, mins_ago_survey, mins_ago_activity)
JOIN districts d ON d.name = 'Wardha';

-- ─── Refresh booth_stats_cache for all booths ──────────────────
INSERT INTO booth_stats_cache (booth_id, total_voters, contacted, surveyed, confirmed_ncp, undecided, opposition, coverage_pct, sentiment_pct, active_volunteers)
SELECT
  b.id,
  b.total_voters,
  b.covered,
  ROUND(b.covered * 0.76),
  CASE WHEN b.total_voters > 0 THEN ROUND(b.total_voters * (b.sentiment_pct / 100.0) * 0.78) ELSE 0 END,
  CASE WHEN b.total_voters > 0 THEN ROUND(b.total_voters * 0.17) ELSE 0 END,
  GREATEST(0,
    b.total_voters
    - CASE WHEN b.total_voters > 0 THEN ROUND(b.total_voters * (b.sentiment_pct/100.0) * 0.78) ELSE 0 END
    - CASE WHEN b.total_voters > 0 THEN ROUND(b.total_voters * 0.17) ELSE 0 END
  ),
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

SELECT 'seed_full.sql complete!' AS status;
SELECT 'Areas: '  || COUNT(*) FROM areas;
SELECT 'Booths: ' || COUNT(*) FROM booths;
SELECT 'Issues: ' || COUNT(*) FROM voter_issues;
