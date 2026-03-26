-- ============================================================
-- Migration 006: Definitive tasks table fix
-- Safe to run multiple times (IF NOT EXISTS / DO $$ guards).
-- Run this in the Neon SQL editor to resolve:
--   "column priority of relation tasks does not exist"
-- ============================================================

-- ── 1. Core columns that may be missing ──────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_to TEXT;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ── 2. priority ───────────────────────────────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'Medium';

-- Backfill any NULL / invalid values before adding constraint
UPDATE tasks
  SET priority = 'Medium'
  WHERE priority IS NULL
     OR priority NOT IN ('Low', 'Medium', 'High');

-- Replace constraint cleanly (drop first so re-runs don't error)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('Low', 'Medium', 'High'));

-- ── 3. approval_status ───────────────────────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending_approval';

UPDATE tasks
  SET approval_status = 'pending_approval'
  WHERE approval_status IS NULL
     OR approval_status NOT IN ('pending_approval', 'approved', 'rejected');

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_approval_status_check;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_approval_status_check
  CHECK (approval_status IN ('pending_approval', 'approved', 'rejected'));

-- ── 4. UUID FK columns (require meetings + users tables to exist first) ───────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- ── 5. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tasks_user_id         ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_approval_status ON tasks(approval_status);
CREATE INDEX IF NOT EXISTS idx_tasks_meeting_id      ON tasks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority        ON tasks(priority);

-- ── 6. Verification query (run after migration to confirm) ───────────────────
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'tasks'
-- ORDER BY ordinal_position;
