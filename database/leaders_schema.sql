-- =============================================================
-- NCP-SP Party Leaders — Master Data Table
-- Run: psql -U postgres -d ncp_campaign -f database/leaders_schema.sql
-- =============================================================

CREATE TABLE IF NOT EXISTS party_leaders (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  designation VARCHAR(200) NOT NULL,
  category    VARCHAR(50)  NOT NULL DEFAULT 'national',
  photo_url   TEXT,
  sort_order  INTEGER      DEFAULT 0,
  is_active   BOOLEAN      DEFAULT true,
  created_at  TIMESTAMP    DEFAULT NOW(),
  updated_at  TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_party_leaders_category ON party_leaders(category);
CREATE INDEX IF NOT EXISTS idx_party_leaders_sort     ON party_leaders(sort_order);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_party_leaders_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_party_leaders_updated_at ON party_leaders;
CREATE TRIGGER trg_party_leaders_updated_at
  BEFORE UPDATE ON party_leaders
  FOR EACH ROW EXECUTE FUNCTION update_party_leaders_updated_at();

-- ── Seed: all leaders from NCP-SP Leaders List PDF ─────────────
INSERT INTO party_leaders (name, designation, category, sort_order) VALUES

-- Top National Leaders
('Sharad Pawar',      'National President',                    'national', 1),
('Supriya Sule',      'Working President & Lok Sabha Leader',  'national', 2),
('Jayant Patil',      'Senior Leader',                         'national', 3),
('Shashikant Shinde', 'Maharashtra State President',           'national', 4),
('Rohit Pawar',       'Youth Face / Secretary',                'national', 5),
('Jitendra Awhad',    'Senior MLA Leader',                     'national', 6),
('Anil Deshmukh',     'Senior Leader',                         'national', 7),
('Eknath Khadse',     'Senior Leader',                         'national', 8),
('Vidya Chavan',      'Women Wing Leader',                     'national', 9),
('Amol Kolhe',        'MP & Star Campaigner',                  'national', 10),

-- Important MPs
('Supriya Sule',      'Lok Sabha MP',                          'mp',       1),
('Amol Kolhe',        'Lok Sabha MP',                          'mp',       2),
('Nilesh Lanke',      'Lok Sabha MP',                          'mp',       3),
('Sharad Pawar',      'Rajya Sabha MP',                        'mp',       4),

-- Major MLA Leaders
('Jitendra Awhad',    'MLA',                                   'mla',      1),
('Rohit Pawar',       'MLA',                                   'mla',      2),
('Sandeep Kshirsagar','MLA',                                   'mla',      3),
('Rajesh Tope',       'MLA',                                   'mla',      4),
('Anil Deshmukh',     'MLA',                                   'mla',      5),
('Jayant Patil',      'MLA',                                   'mla',      6),
('Shashikant Shinde', 'MLA',                                   'mla',      7),

-- Youth & Campaign Faces
('Rohit Pawar',       'Youth Leader',                          'youth',    1),
('Amol Kolhe',        'Public Campaign Face',                  'youth',    2),
('Sonia Duhan',       'Student Wing',                          'youth',    3),
('Rohini Khadse',     'Women Wing',                            'youth',    4),

-- District / Regional Leaders
('Milind Kamble',     'District Leader',                       'district', 1),
('Suhel Subedar',     'District Leader',                       'district', 2),
('Pandurang Barora',  'District Leader',                       'district', 3),
('Satish Chavan',     'District Leader',                       'district', 4),
('Deepika Chavan',    'District Leader',                       'district', 5),
('Mayura Kale',       'District Leader',                       'district', 6)

ON CONFLICT DO NOTHING;

SELECT COUNT(*) AS leaders_seeded FROM party_leaders;
