-- Posts feed (party updates, events, campaigns created by leaders/admins)
CREATE TABLE IF NOT EXISTS posts (
  id                SERIAL PRIMARY KEY,
  author_id         INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  type              VARCHAR(20) NOT NULL DEFAULT 'post',  -- post | event | campaign
  content           TEXT NOT NULL,
  -- event-type fields
  event_title       VARCHAR(200),
  event_date        DATE,
  event_time        VARCHAR(20),
  event_location    VARCHAR(300),
  -- campaign-type fields
  campaign_title    VARCHAR(200),
  campaign_goal     VARCHAR(200),
  campaign_progress SMALLINT DEFAULT 0,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_author  ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_active  ON posts(is_active);

-- Who liked which post (composite PK prevents double-like)
CREATE TABLE IF NOT EXISTS post_likes (
  post_id      INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  volunteer_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, volunteer_id)
);

-- Comments (parent_id enables threaded replies)
CREATE TABLE IF NOT EXISTS post_comments (
  id         SERIAL PRIMARY KEY,
  post_id    INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  parent_id  INT REFERENCES post_comments(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);

-- Likes on comments
CREATE TABLE IF NOT EXISTS post_comment_likes (
  comment_id   INT NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  volunteer_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  PRIMARY KEY (comment_id, volunteer_id)
);

-- Saved / bookmarked posts
CREATE TABLE IF NOT EXISTS post_bookmarks (
  post_id      INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  volunteer_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, volunteer_id)
);

-- Going / Interested RSVP for campaign events
CREATE TABLE IF NOT EXISTS campaign_event_rsvp (
  event_id     INT NOT NULL REFERENCES campaign_events(id) ON DELETE CASCADE,
  volunteer_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL DEFAULT 'interested',  -- going | interested
  PRIMARY KEY  (event_id, volunteer_id)
);

-- Auto-update posts.updated_at
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_updated_at ON posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_posts_updated_at();
