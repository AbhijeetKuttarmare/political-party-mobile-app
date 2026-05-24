-- Migration: Create post_comments table
-- Description: Stores comments on posts (parent_id enables threaded replies)
-- Run Date: 2026-05-22

CREATE TABLE IF NOT EXISTS post_comments (
  id         SERIAL PRIMARY KEY,
  post_id    INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id  INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  parent_id  INT REFERENCES post_comments(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_author ON post_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON post_comments(parent_id);
