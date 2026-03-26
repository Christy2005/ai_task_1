-- ============================================================
-- Migration 005: Ensure all required columns exist
-- users.id is UUID — all FK columns that reference it must be UUID too.
-- Safe to run multiple times — uses IF NOT EXISTS throughout.
-- ============================================================

-- tasks: created_by (UUID FK → users.id)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- tasks: user_id — assigned faculty (UUID FK → users.id)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- tasks: priority
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'Medium';

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_priority_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('Low', 'Medium', 'High'));

-- tasks: approval workflow
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending_approval';

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_approval_status_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_approval_status_check
  CHECK (approval_status IN ('pending_approval', 'approved', 'rejected'));

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_created_by      ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id         ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_approval_status ON tasks(approval_status);
CREATE INDEX IF NOT EXISTS idx_tasks_meeting_id      ON tasks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_users_role            ON users(role);
