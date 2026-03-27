-- ============================================================
-- Migration 005: Event Participants and User Profile Enhancements
-- ============================================================

-- 1. Create event_participants for many-to-many relationship
CREATE TABLE IF NOT EXISTS event_participants (
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ep_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_ep_user_id ON event_participants(user_id);

-- 2. Add profile fields to the users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS department VARCHAR(100),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bio TEXT;
