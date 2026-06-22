-- ============================================
-- External Issue Submission Feature
-- 2026-06-22: Add external QR-code work order submission
-- ============================================

-- 1. Add external issue fields to issue_mgmt_issues
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='issue_mgmt_issues' AND column_name='source') THEN
    ALTER TABLE public.issue_mgmt_issues ADD COLUMN source VARCHAR(20) DEFAULT 'internal';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='issue_mgmt_issues' AND column_name='customer_name') THEN
    ALTER TABLE public.issue_mgmt_issues ADD COLUMN customer_name VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='issue_mgmt_issues' AND column_name='contact_person') THEN
    ALTER TABLE public.issue_mgmt_issues ADD COLUMN contact_person VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='issue_mgmt_issues' AND column_name='contact_title') THEN
    ALTER TABLE public.issue_mgmt_issues ADD COLUMN contact_title VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='issue_mgmt_issues' AND column_name='contact_info') THEN
    ALTER TABLE public.issue_mgmt_issues ADD COLUMN contact_info VARCHAR(200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='issue_mgmt_issues' AND column_name='evidence_files') THEN
    ALTER TABLE public.issue_mgmt_issues ADD COLUMN evidence_files JSONB DEFAULT '[]'::jsonb;
  END IF;
  -- todo_task_instances: source_type and source_id (may already exist)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='todo_task_instances' AND column_name='source_type') THEN
    ALTER TABLE public.todo_task_instances ADD COLUMN source_type VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='todo_task_instances' AND column_name='source_id') THEN
    ALTER TABLE public.todo_task_instances ADD COLUMN source_id VARCHAR(36);
  END IF;
END $$;

-- 2. External receivers config table
CREATE TABLE IF NOT EXISTS public.issue_mgmt_external_receivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  user_name VARCHAR(100),
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_issue_mgmt_issues_source ON public.issue_mgmt_issues(source);
CREATE INDEX IF NOT EXISTS idx_issue_mgmt_ext_recv_user ON public.issue_mgmt_external_receivers(user_id);
CREATE INDEX IF NOT EXISTS idx_todo_task_inst_source ON public.todo_task_instances(source_type, source_id);
