-- ============================================================
-- Migration 009: Ensure calendar + profile schema is complete
-- Safe to run multiple times (all IF NOT EXISTS / IF EXISTS).
-- ============================================================

-- 1. event_participants many-to-many table
CREATE TABLE IF NOT EXISTS event_participants (
  event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ep_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_ep_user_id  ON event_participants(user_id);

-- 2. Profile fields on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone      VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio        TEXT;

-- 3. Ensure events table has description column
ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;
