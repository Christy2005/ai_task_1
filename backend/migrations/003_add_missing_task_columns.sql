-- ============================================================
-- Migration 003: Add missing columns to tasks table
-- The tasks table is missing created_by and priority columns
-- that the application code requires.
-- ============================================================

-- 1. Add created_by (who created the task) — UUID FK → users.id
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. Add priority column
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'Medium';

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_priority_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('Low', 'Medium', 'High'));

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id    ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role       ON users(role);
