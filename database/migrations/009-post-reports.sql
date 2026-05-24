-- Migration: Create post_reports table
-- Description: Stores user reports on posts and comments for moderation
-- Run Date: 2026-05-23

CREATE TABLE IF NOT EXISTS post_reports (
  id           SERIAL PRIMARY KEY,
  post_id      INT  REFERENCES posts(id)         ON DELETE CASCADE,
  comment_id   INT  REFERENCES post_comments(id) ON DELETE CASCADE,
  reporter_id  INT  NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL DEFAULT 'inappropriate',
  status       TEXT NOT NULL DEFAULT 'pending',   -- pending | reviewed | dismissed
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  INT REFERENCES volunteers(id) ON DELETE SET NULL,
  CONSTRAINT chk_post_or_comment CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL     AND comment_id IS NOT NULL)
  ),
  CONSTRAINT uq_report UNIQUE (post_id, comment_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reports_post    ON post_reports(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_comment ON post_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_post_reports_status  ON post_reports(status);
CREATE INDEX IF NOT EXISTS idx_post_reports_created ON post_reports(created_at DESC);
