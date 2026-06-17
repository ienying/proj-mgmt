-- Migration: Add category_type to knowledge_categories
-- Date: 2026-06-17
-- Description: 为信息广场分类表添加分类类型字段，支持公告通知/共享资料/经验分享三大板块
-- Note: 该表已迁移到 design_info_square schema

ALTER TABLE design_info_square.knowledge_categories
  ADD COLUMN IF NOT EXISTS category_type VARCHAR(50) DEFAULT 'material';

COMMENT ON COLUMN design_info_square.knowledge_categories.category_type IS '分类类型: announcement-公告通知, material-共享资料, share-经验分享';
