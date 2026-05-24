-- Migration: Create post_likes table
-- Description: Stores likes on posts (composite PK prevents double-like)
-- Run Date: 2026-05-22

CREATE TABLE IF NOT EXISTS post_likes (
  post_id      INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  volunteer_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, volunteer_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_volunteer ON post_likes(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_created ON post_likes(created_at DESC);
