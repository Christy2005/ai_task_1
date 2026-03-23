-- ============================================================
-- Migration 001: RBAC — Add role to users, add ownership to tasks
-- Run this against your Neon PostgreSQL database.
--
-- Detected schema:
--   users.id  → INTEGER (serial)
--   tasks.id  → UUID
-- ============================================================

-- 1. Update the role column on users (already added as VARCHAR, ensure constraint)
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ALTER COLUMN role SET DEFAULT 'faculty';

ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'faculty'));

-- Update any legacy 'user' role values to 'faculty'
UPDATE users SET role = 'faculty' WHERE role NOT IN ('admin', 'faculty');

-- 2. Add user_id (assigned faculty) to tasks — INTEGER FK → users.id
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- 3. Add created_by (task creator) to tasks — INTEGER FK → users.id
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- 4. Add priority column if it doesn't exist
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'Medium';

ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_priority_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('Low', 'Medium', 'High'));

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id    ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);

-- ============================================================
-- Full schema reference (for a fresh database)
-- ============================================================

-- CREATE TABLE IF NOT EXISTS users (
--   id         SERIAL PRIMARY KEY,
--   name       VARCHAR(255) NOT NULL,
--   email      VARCHAR(255) NOT NULL UNIQUE,
--   password   VARCHAR(255) NOT NULL,
--   role       VARCHAR(20) NOT NULL DEFAULT 'faculty' CHECK (role IN ('admin','faculty')),
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE IF NOT EXISTS tasks (
--   id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   title       TEXT NOT NULL,
--   description TEXT,
--   status      TEXT DEFAULT 'pending',
--   assigned_to TEXT,
--   due_date    TIMESTAMP,
--   priority    VARCHAR(10) DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High')),
--   user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
--   created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
--   created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  host TEXT,
  meeting_date TIMESTAMP,
  summary TEXT,
  transcript TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE;
