-- Migration: Add final customer, required date, progress updates, and operation logs
-- Date: 2026-07-12

-- 1. Add final_customer column to projects
ALTER TABLE design_public.projects
ADD COLUMN IF NOT EXISTS final_customer VARCHAR(255);

-- 2. Add required_date column to projects (项目要求时间)
ALTER TABLE design_public.projects
ADD COLUMN IF NOT EXISTS required_date DATE;

-- 3. Create progress_updates table (进展同步)
CREATE TABLE IF NOT EXISTS design_public.progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES design_public.projects(id) ON DELETE CASCADE,
  user_id UUID,
  user_name VARCHAR(100),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS progress_updates_project_idx ON design_public.progress_updates(project_id);
CREATE INDEX IF NOT EXISTS progress_updates_created_idx ON design_public.progress_updates(created_at DESC);

-- 4. Create operation_logs table (操作记录)
CREATE TABLE IF NOT EXISTS design_public.operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES design_public.projects(id) ON DELETE CASCADE,
  user_id UUID,
  user_name VARCHAR(100),
  action VARCHAR(50) NOT NULL,          -- create / update / delete / upload / publish
  target_type VARCHAR(100),             -- table name, 'project', 'progress', etc.
  target_name VARCHAR(255),             -- human-readable description
  detail TEXT,                          -- e.g. "changed qty from 10 to 12"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS operation_logs_project_idx ON design_public.operation_logs(project_id);
CREATE INDEX IF NOT EXISTS operation_logs_created_idx ON design_public.operation_logs(created_at DESC);
