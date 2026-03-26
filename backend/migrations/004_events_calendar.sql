-- ============================================================
-- Migration 004: Calendar Events Table
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(500) NOT NULL,
  description TEXT,
  start_date  TIMESTAMP NOT NULL,
  end_date    TIMESTAMP,
  all_day     BOOLEAN DEFAULT FALSE,
  color       VARCHAR(20) DEFAULT 'indigo',
  -- If linked from a task due date
  task_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
  -- If linked from a meeting
  meeting_id  UUID REFERENCES meetings(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_start_date  ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_created_by  ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_task_id     ON events(task_id);
