-- Migration 008: Add voter list PDF fields to booths table
ALTER TABLE booths
  ADD COLUMN IF NOT EXISTS voter_list_pdf_url    TEXT,
  ADD COLUMN IF NOT EXISTS voter_list_pdf_name   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS voter_list_uploaded_at TIMESTAMP;
