-- Migration 010: Friend / connection requests between volunteers
CREATE TABLE IF NOT EXISTS friend_requests (
  id           SERIAL PRIMARY KEY,
  from_user_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  to_user_id   INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT no_self_request CHECK (from_user_id <> to_user_id),
  CONSTRAINT unique_friend_request UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_to   ON friend_requests (to_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_from ON friend_requests (from_user_id);
