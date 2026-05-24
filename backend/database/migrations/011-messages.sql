CREATE TABLE IF NOT EXISTS messages (
  id           SERIAL PRIMARY KEY,
  from_user_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  to_user_id   INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to   ON messages(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(
  LEAST(from_user_id, to_user_id),
  GREATEST(from_user_id, to_user_id),
  created_at DESC
);
