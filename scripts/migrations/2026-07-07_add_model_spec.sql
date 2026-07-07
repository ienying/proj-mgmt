-- ============================================
-- 产品目录增加"型号规格"字段
-- ============================================

ALTER TABLE product_module_types ADD COLUMN IF NOT EXISTS model_spec VARCHAR(200);
