-- 为 projects 表添加 module_quantities 列
-- 用于存储项目采购模块的数量配置 {module_code: quantity_string}

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS module_quantities JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN projects.module_quantities IS '采购模块数量配置，JSON 对象，key 为模块编码，value 为数量';
