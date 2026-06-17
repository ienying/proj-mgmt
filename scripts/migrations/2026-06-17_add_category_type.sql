-- Migration: Add category_type to knowledge_categories
-- Date: 2026-06-17
-- Description: 为信息广场分类表添加分类类型字段，支持公告通知/共享资料/经验分享三大板块

ALTER TABLE knowledge_categories
  ADD COLUMN IF NOT EXISTS category_type VARCHAR(50) DEFAULT 'material';

COMMENT ON COLUMN knowledge_categories.category_type IS '分类类型: announcement-公告通知, material-共享资料, share-经验分享';
