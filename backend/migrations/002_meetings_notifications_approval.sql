-- ============================================================
-- Migration 002: Meetings, Notifications, Approval Flow, HOD role
-- ============================================================

-- 1. Add 'hod' to the valid roles
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'hod', 'faculty'));

-- 2. Meetings table — stores transcript + metadata, linked to tasks
CREATE TABLE IF NOT EXISTS meetings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(500) NOT NULL,
  transcript  TEXT,
  audio_filename VARCHAR(500),
  duration    VARCHAR(50),
  status      VARCHAR(20) DEFAULT 'processed',
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Link tasks to meetings
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL;

-- 4. Approval status on tasks (pending_approval → approved → rejected)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending_approval';

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_approval_status_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_approval_status_check
  CHECK (approval_status IN ('pending_approval', 'approved', 'rejected'));

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- 5. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(50) NOT NULL DEFAULT 'info',
  title       VARCHAR(500) NOT NULL,
  message     TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  target_role VARCHAR(20) DEFAULT 'admin',
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  meeting_id  UUID REFERENCES meetings(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_meeting_id       ON tasks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_tasks_approval_status  ON tasks(approval_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id  ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target   ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_meetings_created_by    ON meetings(created_by);
