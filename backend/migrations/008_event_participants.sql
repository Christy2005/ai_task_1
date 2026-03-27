-- ============================================================
-- Migration 008: event_participants (many-to-many events ↔ users)
-- Safe to run multiple times.
-- ============================================================

CREATE TABLE IF NOT EXISTS event_participants (
  event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_participants_user
  ON event_participants(user_id);

-- Ensure events table has the description column (guard against missed 007)
ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;
