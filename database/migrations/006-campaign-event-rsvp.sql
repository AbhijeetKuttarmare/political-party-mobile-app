-- Migration: Create campaign_event_rsvp table
-- Description: Stores RSVP status (going/interested) for campaign events
-- Run Date: 2026-05-22

CREATE TABLE IF NOT EXISTS campaign_event_rsvp (
  event_id     INT NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
  volunteer_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL DEFAULT 'interested',  -- going | interested | declined
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY  (event_id, volunteer_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_event_rsvp_event ON campaign_event_rsvp(event_id);
CREATE INDEX IF NOT EXISTS idx_campaign_event_rsvp_volunteer ON campaign_event_rsvp(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_event_rsvp_status ON campaign_event_rsvp(status);
