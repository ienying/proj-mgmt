-- Migration: Add references_config and allow_add to data_table_definitions
-- Date: 2026-05-27
-- Description: 添加引用关系配置字段和操作权限字段，支持跨表记录引用和双向同步

ALTER TABLE data_table_definitions
  ADD COLUMN IF NOT EXISTS references_config JSONB DEFAULT '[]'::jsonb;

ALTER TABLE data_table_definitions
  ADD COLUMN IF NOT EXISTS allow_add BOOLEAN DEFAULT true;
