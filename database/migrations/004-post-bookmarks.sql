-- Migration: Create post_bookmarks table
-- Description: Stores bookmarked/saved posts for users
-- Run Date: 2026-05-22

CREATE TABLE IF NOT EXISTS post_bookmarks (
  post_id      INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  volunteer_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, volunteer_id)
);

CREATE INDEX IF NOT EXISTS idx_post_bookmarks_volunteer ON post_bookmarks(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_post_bookmarks_created ON post_bookmarks(created_at DESC);
