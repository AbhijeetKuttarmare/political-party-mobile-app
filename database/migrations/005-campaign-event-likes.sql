-- Migration: Create campaign_event_likes table
-- Description: Stores likes on campaign events (separate from post_likes)
-- Run Date: 2026-05-22

CREATE TABLE IF NOT EXISTS campaign_event_likes (
  event_id     INT NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
  volunteer_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, volunteer_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_event_likes_event ON campaign_event_likes(event_id);
CREATE INDEX IF NOT EXISTS idx_campaign_event_likes_volunteer ON campaign_event_likes(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_event_likes_created ON campaign_event_likes(created_at DESC);
