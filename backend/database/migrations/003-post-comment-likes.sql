-- Migration: Create post_comment_likes table
-- Description: Stores likes on comments (composite PK prevents double-like)
-- Run Date: 2026-05-22

CREATE TABLE IF NOT EXISTS post_comment_likes (
  comment_id   INT NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
  volunteer_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  PRIMARY KEY (comment_id, volunteer_id)
);

CREATE INDEX IF NOT EXISTS idx_post_comment_likes_volunteer ON post_comment_likes(volunteer_id);
