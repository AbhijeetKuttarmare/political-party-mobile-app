-- Migration 009: Post and comment reports
CREATE TABLE IF NOT EXISTS post_reports (
  id          SERIAL PRIMARY KEY,
  post_id     INT  REFERENCES posts(id)         ON DELETE CASCADE,
  comment_id  INT  REFERENCES post_comments(id) ON DELETE CASCADE,
  reporter_id INT  NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL DEFAULT 'inappropriate',
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  reviewed_by INT  REFERENCES volunteers(id),
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate reports from the same user on the same post/comment
  CONSTRAINT unique_post_report    UNIQUE (post_id,    reporter_id) DEFERRABLE,
  CONSTRAINT unique_comment_report UNIQUE (comment_id, reporter_id) DEFERRABLE,

  -- Exactly one of post_id or comment_id must be set
  CONSTRAINT report_target_check CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL    AND comment_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_post_reports_post_id    ON post_reports (post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_comment_id ON post_reports (comment_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status     ON post_reports (status);
