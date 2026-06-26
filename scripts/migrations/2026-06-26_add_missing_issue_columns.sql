-- Add missing columns to issue_mgmt_issues table
-- These columns are referenced in the application code (API routes and frontend)
-- but were never added via migration to the actual database table.
-- This caused "column does not exist" errors when creating/updating issues.

-- Basic info columns
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS reporter_phone VARCHAR(50);
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS handler_id VARCHAR(36);
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS handler_name VARCHAR(100);
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS handler_phone VARCHAR(50);

-- Classification columns (ID-based, replacing legacy text fields)
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS category_id VARCHAR(36);
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS product_module_id VARCHAR(36);
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS urgency_id VARCHAR(36);
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS warranty_status_id VARCHAR(36);

-- Flag columns
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS is_major BOOLEAN DEFAULT false;
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS is_first_report BOOLEAN DEFAULT true;
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS has_similar_history BOOLEAN DEFAULT false;

-- Additional info columns
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS expected_handle_time VARCHAR(50);
ALTER TABLE issue_mgmt_issues ADD COLUMN IF NOT EXISTS creator_id VARCHAR(36);

-- Indexes for commonly filtered columns
CREATE INDEX IF NOT EXISTS idx_issue_mgmt_issues_handler_id ON issue_mgmt_issues(handler_id);
CREATE INDEX IF NOT EXISTS idx_issue_mgmt_issues_creator_id ON issue_mgmt_issues(creator_id);
CREATE INDEX IF NOT EXISTS idx_issue_mgmt_issues_department ON issue_mgmt_issues(department);
CREATE INDEX IF NOT EXISTS idx_issue_mgmt_issues_category_id ON issue_mgmt_issues(category_id);
CREATE INDEX IF NOT EXISTS idx_issue_mgmt_issues_urgency_id ON issue_mgmt_issues(urgency_id);
