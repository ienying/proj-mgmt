-- ============================================
-- Dispatchers Feature
-- 2026-07-07: Add dispatcher configuration for ticket pool assignment
-- ============================================

-- 1. Dispatchers config table
CREATE TABLE IF NOT EXISTS public.issue_mgmt_dispatchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  user_name VARCHAR(100),
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add repro_steps column to issue_mgmt_issues (from prior feature)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='issue_mgmt_issues' AND column_name='repro_steps') THEN
    ALTER TABLE public.issue_mgmt_issues ADD COLUMN repro_steps TEXT DEFAULT '';
  END IF;
END $$;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_issue_mgmt_dispatchers_user ON public.issue_mgmt_dispatchers(user_id);
