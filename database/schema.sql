-- =============================================================
-- NCP-SP Campaign App — PostgreSQL Schema
-- Database: ncp_campaign
-- Run: psql -U postgres -d ncp_campaign -f database/schema.sql
-- =============================================================

-- ─────────────────────────────────────────
-- ELECTIONS (8 types)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS elections (
  id          VARCHAR(4)   PRIMARY KEY,
  label       VARCHAR(100) NOT NULL,
  short_name  VARCHAR(4)   NOT NULL,
  icon        VARCHAR(10),
  is_active   BOOLEAN      DEFAULT true,
  created_at  TIMESTAMP    DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- DISTRICTS
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS districts (
  id          SERIAL       PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  division    VARCHAR(100),
  state       VARCHAR(50)  DEFAULT 'Maharashtra'
);

-- ─────────────────────────────────────────
-- AREAS (Talukas / Wards / Constituencies)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS areas (
  id                VARCHAR(50)  PRIMARY KEY,
  name              VARCHAR(100) NOT NULL,
  sub_label         VARCHAR(100),
  election_id       VARCHAR(4)   REFERENCES elections(id),
  district_id       INTEGER      REFERENCES districts(id),
  total_voters      INTEGER      DEFAULT 0,
  total_booths      INTEGER      DEFAULT 0,
  ncp_vote_share    NUMERIC(5,2) DEFAULT 0,
  ncp_status        VARCHAR(20)  DEFAULT 'swing',
  coverage_pct      INTEGER      DEFAULT 0,
  active_volunteers INTEGER      DEFAULT 0,
  created_at        TIMESTAMP    DEFAULT NOW(),
  updated_at        TIMESTAMP    DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- BOOTHS (Polling Stations)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booths (
  id               SERIAL       PRIMARY KEY,
  booth_number     VARCHAR(20)  NOT NULL,
  village          VARCHAR(100) NOT NULL,
  taluka           VARCHAR(100),
  district_id      INTEGER      REFERENCES districts(id),
  constituency     VARCHAR(150),
  area_id          VARCHAR(50)  REFERENCES areas(id),
  election_id      VARCHAR(4)   REFERENCES elections(id),
  total_voters     INTEGER      DEFAULT 0,
  covered          INTEGER      DEFAULT 0,
  sentiment_pct    INTEGER      DEFAULT 0,
  women_outreach   INTEGER      DEFAULT 0,
  youth_support    INTEGER      DEFAULT 0,
  volunteers       INTEGER      DEFAULT 0,
  max_volunteers   INTEGER      DEFAULT 5,
  status           VARCHAR(20)  DEFAULT 'swing',
  trend            VARCHAR(10)  DEFAULT 'stable',
  booth_leader     VARCHAR(100),
  last_survey_at   TIMESTAMP,
  last_activity_at TIMESTAMP,
  created_at       TIMESTAMP    DEFAULT NOW(),
  updated_at       TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booths_area     ON booths(area_id);
CREATE INDEX IF NOT EXISTS idx_booths_election ON booths(election_id);
CREATE INDEX IF NOT EXISTS idx_booths_status   ON booths(status);
CREATE INDEX IF NOT EXISTS idx_booths_district ON booths(district_id);

-- ─────────────────────────────────────────
-- VOTERS (Master Voter Roll — 10 crore rows)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voters (
  id               BIGSERIAL    PRIMARY KEY,
  voter_id         VARCHAR(20)  UNIQUE NOT NULL,
  name             VARCHAR(150) NOT NULL,
  name_marathi     VARCHAR(150),
  father_husband   VARCHAR(150),
  age              SMALLINT,
  gender           CHAR(1),
  part_number      SMALLINT,
  serial_number    INTEGER,
  booth_id         INTEGER      REFERENCES booths(id),
  area_id          VARCHAR(50)  REFERENCES areas(id),
  district_id      INTEGER      REFERENCES districts(id),
  address          TEXT,
  mobile           VARCHAR(15),
  ncp_support      VARCHAR(20)  DEFAULT 'unknown',
  is_contacted     BOOLEAN      DEFAULT false,
  contacted_at     TIMESTAMP,
  created_at       TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voters_booth     ON voters(booth_id);
CREATE INDEX IF NOT EXISTS idx_voters_area      ON voters(area_id);
CREATE INDEX IF NOT EXISTS idx_voters_voter_id  ON voters(voter_id);
CREATE INDEX IF NOT EXISTS idx_voters_support   ON voters(ncp_support);
CREATE INDEX IF NOT EXISTS idx_voters_contacted ON voters(is_contacted);
CREATE INDEX IF NOT EXISTS idx_voters_name_fts  ON voters USING gin(to_tsvector('simple', name));

-- ─────────────────────────────────────────
-- VOLUNTEERS (Party Workers)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS volunteers (
  id               SERIAL       PRIMARY KEY,
  name             VARCHAR(150) NOT NULL,
  mobile           VARCHAR(15)  UNIQUE NOT NULL,
  role             VARCHAR(30)  DEFAULT 'booth_worker',
  district_id      INTEGER      REFERENCES districts(id),
  area_id          VARCHAR(50)  REFERENCES areas(id),
  assigned_booth   INTEGER      REFERENCES booths(id),
  is_active        BOOLEAN      DEFAULT true,
  last_seen_at     TIMESTAMP,
  last_lat         NUMERIC(10,7),
  last_lng         NUMERIC(10,7),
  firebase_uid     VARCHAR(128),
  created_at       TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_volunteers_booth   ON volunteers(assigned_booth);
CREATE INDEX IF NOT EXISTS idx_volunteers_area    ON volunteers(area_id);
CREATE INDEX IF NOT EXISTS idx_volunteers_mobile  ON volunteers(mobile);
CREATE INDEX IF NOT EXISTS idx_volunteers_role    ON volunteers(role);

-- ─────────────────────────────────────────
-- CHECKINS (Volunteer Check-ins at Booths)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS checkins (
  id             BIGSERIAL PRIMARY KEY,
  volunteer_id   INTEGER   REFERENCES volunteers(id),
  booth_id       INTEGER   REFERENCES booths(id),
  checked_in_at  TIMESTAMP DEFAULT NOW(),
  lat            NUMERIC(10,7),
  lng            NUMERIC(10,7),
  note           TEXT
);

CREATE INDEX IF NOT EXISTS idx_checkins_booth     ON checkins(booth_id);
CREATE INDEX IF NOT EXISTS idx_checkins_volunteer ON checkins(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_checkins_time      ON checkins(checked_in_at DESC);

-- ─────────────────────────────────────────
-- SURVEYS (Voter Contact Records)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS surveys (
  id             BIGSERIAL    PRIMARY KEY,
  voter_id       BIGINT       REFERENCES voters(id),
  booth_id       INTEGER      REFERENCES booths(id),
  volunteer_id   INTEGER      REFERENCES volunteers(id),
  response       VARCHAR(20)  NOT NULL,
  issues         TEXT[],
  note           TEXT,
  surveyed_at    TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_booth     ON surveys(booth_id);
CREATE INDEX IF NOT EXISTS idx_surveys_voter     ON surveys(voter_id);
CREATE INDEX IF NOT EXISTS idx_surveys_response  ON surveys(response);
CREATE INDEX IF NOT EXISTS idx_surveys_time      ON surveys(surveyed_at DESC);

-- ─────────────────────────────────────────
-- BOOTH STATS CACHE (Pre-computed — refresh every 15 min)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booth_stats_cache (
  booth_id          INTEGER PRIMARY KEY REFERENCES booths(id),
  total_voters      INTEGER DEFAULT 0,
  contacted         INTEGER DEFAULT 0,
  surveyed          INTEGER DEFAULT 0,
  confirmed_ncp     INTEGER DEFAULT 0,
  undecided         INTEGER DEFAULT 0,
  opposition        INTEGER DEFAULT 0,
  coverage_pct      INTEGER DEFAULT 0,
  sentiment_pct     INTEGER DEFAULT 0,
  active_volunteers INTEGER DEFAULT 0,
  last_computed_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- AUTO-UPDATE updated_at on areas and booths
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booths_updated_at
  BEFORE UPDATE ON booths
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_areas_updated_at
  BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

SELECT 'Schema created successfully!' AS status;
