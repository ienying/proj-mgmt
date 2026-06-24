-- Add readonly_mode and allow_delete columns to data_table_definitions
-- readonly_mode: "and" (default) | "or" — determines how column+row readonly combine
-- allow_delete: controls whether standard data records can be deleted

ALTER TABLE data_table_definitions
  ADD COLUMN IF NOT EXISTS readonly_mode VARCHAR(10) DEFAULT 'and',
  ADD COLUMN IF NOT EXISTS allow_delete BOOLEAN DEFAULT true;
