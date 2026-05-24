-- Allow content to be null for media-only messages
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;

-- Add media attachment columns
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS media_url  TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT,
  ADD COLUMN IF NOT EXISTS media_name TEXT;
