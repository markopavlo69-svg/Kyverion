-- Kanban Board Migration
-- Adds 'status' and 'tags' columns to the tasks table

-- Add status column (Kanban column: backlog | todo | in-progress | done)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status text DEFAULT 'todo';

-- Add tags column
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Migrate existing data: completed tasks → 'done', others → 'todo'
UPDATE tasks SET status = 'done' WHERE completed = true AND status = 'todo';

-- Optional: create an index on status for faster column queries
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
