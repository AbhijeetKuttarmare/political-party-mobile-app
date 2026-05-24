-- Comments on campaign events
CREATE TABLE IF NOT EXISTS campaign_event_comments (
  id         SERIAL PRIMARY KEY,
  event_id   INT NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
  author_id  INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  parent_id  INT REFERENCES campaign_event_comments(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ce_comments_event ON campaign_event_comments(event_id);

-- Likes on campaign event comments
CREATE TABLE IF NOT EXISTS campaign_event_comment_likes (
  comment_id   INT NOT NULL REFERENCES campaign_event_comments(id) ON DELETE CASCADE,
  volunteer_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  PRIMARY KEY (comment_id, volunteer_id)
);

-- Bookmarks for campaign events
CREATE TABLE IF NOT EXISTS campaign_event_bookmarks (
  event_id     INT NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
  volunteer_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, volunteer_id)
);
