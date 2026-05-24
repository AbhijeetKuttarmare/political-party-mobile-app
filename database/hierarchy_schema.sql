-- =============================================================
-- Maharashtra Geo Hierarchy — Districts / Talukas / Villages
-- Run: psql -U postgres -d ncp_campaign -f database/hierarchy_schema.sql
-- =============================================================

CREATE TABLE IF NOT EXISTS mh_districts (
  code         INTEGER      PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  name_marathi VARCHAR(150),
  population   BIGINT       DEFAULT 0,
  active_leaders INTEGER    DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mh_talukas (
  code           INTEGER      PRIMARY KEY,
  district_code  INTEGER      NOT NULL REFERENCES mh_districts(code),
  name           VARCHAR(100) NOT NULL,
  name_marathi   VARCHAR(150),
  total_villages INTEGER      DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mh_villages (
  code         INTEGER      PRIMARY KEY,
  taluka_code  INTEGER      NOT NULL REFERENCES mh_talukas(code),
  district_code INTEGER     NOT NULL REFERENCES mh_districts(code),
  name         VARCHAR(150) NOT NULL,
  name_marathi VARCHAR(200),
  type         VARCHAR(10)  DEFAULT 'rural',
  population   INTEGER      DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mh_leaders (
  id           SERIAL       PRIMARY KEY,
  village_code INTEGER      NOT NULL REFERENCES mh_villages(code),
  name         VARCHAR(150) NOT NULL,
  designation  VARCHAR(100)
);

-- Indexes for fast joins and search
CREATE INDEX IF NOT EXISTS idx_mh_talukas_district  ON mh_talukas(district_code);
CREATE INDEX IF NOT EXISTS idx_mh_villages_taluka   ON mh_villages(taluka_code);
CREATE INDEX IF NOT EXISTS idx_mh_villages_district ON mh_villages(district_code);
CREATE INDEX IF NOT EXISTS idx_mh_leaders_village   ON mh_leaders(village_code);
CREATE INDEX IF NOT EXISTS idx_mh_villages_name     ON mh_villages USING gin(to_tsvector('simple', name));
CREATE INDEX IF NOT EXISTS idx_mh_talukas_name      ON mh_talukas(name);
CREATE INDEX IF NOT EXISTS idx_mh_districts_name    ON mh_districts(name);

SELECT 'Hierarchy schema ready!' AS status;
