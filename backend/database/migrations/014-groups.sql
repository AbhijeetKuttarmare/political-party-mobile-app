CREATE TABLE IF NOT EXISTS chat_groups (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT,
  created_by   INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  avatar_color TEXT NOT NULL DEFAULT 'from-blue-600 to-purple-600',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  id        SERIAL PRIMARY KEY,
  group_id  INT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id   INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_messages (
  id           SERIAL PRIMARY KEY,
  group_id     INT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  from_user_id INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  content      TEXT,
  media_url    TEXT,
  media_type   TEXT,
  media_name   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_messages ON group_messages(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS group_message_reactions (
  id         SERIAL PRIMARY KEY,
  message_id INT NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS group_reads (
  group_id     INT NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id      INT NOT NULL REFERENCES volunteers(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(group_id, user_id)
);
