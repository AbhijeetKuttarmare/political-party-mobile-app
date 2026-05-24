-- Campaign Events table
-- Stores rallies, meetings, door-to-door drives, etc.
-- Super admin / state leader manages these from the web portal.

CREATE TABLE IF NOT EXISTS campaign_events (
  id                 SERIAL PRIMARY KEY,
  title              VARCHAR(200)  NOT NULL,
  type               VARCHAR(50)   NOT NULL DEFAULT 'rally',  -- rally | meeting | door_to_door | nukkad_sabha | farmer_meeting | women_outreach
  location           VARCHAR(300)  NOT NULL,
  district           VARCHAR(100),
  area_id            VARCHAR(50)   REFERENCES areas(id) ON DELETE SET NULL,
  election_id        VARCHAR(10)   REFERENCES elections(id) ON DELETE SET NULL,
  event_date         DATE          NOT NULL,
  event_time         VARCHAR(20)   DEFAULT 'TBD',
  coordinator        VARCHAR(150),
  expected_attendance INT          DEFAULT 0,
  status             VARCHAR(20)   NOT NULL DEFAULT 'upcoming', -- upcoming | live | completed | cancelled
  notes              TEXT,
  created_by         INT           REFERENCES volunteers(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_date     ON campaign_events(event_date);
CREATE INDEX IF NOT EXISTS idx_campaign_events_status   ON campaign_events(status);
CREATE INDEX IF NOT EXISTS idx_campaign_events_election ON campaign_events(election_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_district ON campaign_events(district);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_campaign_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_campaign_events_updated_at ON campaign_events;
CREATE TRIGGER trg_campaign_events_updated_at
  BEFORE UPDATE ON campaign_events
  FOR EACH ROW EXECUTE FUNCTION update_campaign_events_updated_at();
