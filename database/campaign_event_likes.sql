-- Likes on campaign events (separate from post_likes)
CREATE TABLE IF NOT EXISTS campaign_event_likes (
  event_id     INT NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
  volunteer_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, volunteer_id)
);

CREATE INDEX IF NOT EXISTS idx_ce_likes_event ON campaign_event_likes(event_id);
