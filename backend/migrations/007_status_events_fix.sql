-- ============================================================
-- Migration 007: Fix events description + task status constraint
-- Safe to run multiple times.
-- ============================================================

-- 1. Add description to events table (was missing from live DB)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Enforce valid task status values
--    Backfill any bad values before adding constraint
UPDATE tasks
  SET status = 'pending'
  WHERE status IS NULL
     OR status NOT IN ('pending', 'in_progress', 'completed');

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'completed'));

-- 3. Index for status-based queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
