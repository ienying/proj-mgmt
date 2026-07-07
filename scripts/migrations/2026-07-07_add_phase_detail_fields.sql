-- ============================================
-- 阶段详情字段迁移
-- 1. project_stages 增加 detail_description（阶段式布局中的阶段描述）
-- 2. data_table_definitions 增加 stage_role_column（阶段人力统计的角色列）
-- ============================================

ALTER TABLE project_stages ADD COLUMN IF NOT EXISTS detail_description TEXT;

ALTER TABLE data_table_definitions ADD COLUMN IF NOT EXISTS stage_role_column VARCHAR(100);
