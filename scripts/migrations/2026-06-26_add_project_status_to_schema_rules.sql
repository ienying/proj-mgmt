-- Add project_status column to project_schema_rules table
-- This column was defined in the ORM schema but missing from the actual database table,
-- causing INSERT operations to fail with "column does not exist" error.

ALTER TABLE project_schema_rules ADD COLUMN IF NOT EXISTS project_status VARCHAR(20);

-- Add index on project_status for query performance
CREATE INDEX IF NOT EXISTS project_schema_rules_status_idx ON project_schema_rules(project_status);
