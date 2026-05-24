-- Migration: Create trigger for auto-updating posts.updated_at
-- Description: Automatically updates the updated_at column on posts table when a post is modified
-- Run Date: 2026-05-22

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN 
  NEW.updated_at = NOW(); 
  RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_posts_updated_at ON posts;

-- Create the trigger
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW 
  EXECUTE FUNCTION update_posts_updated_at();
