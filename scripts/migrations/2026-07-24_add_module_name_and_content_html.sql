-- ============================================
-- Migration: 信息广场帖子添加 module_name 和 content_html 列
-- Date: 2026-07-24
-- Description:
--   1. module_name: 产品目录（逗号分隔），与视频中心保持一致
--   2. content_html: Markdown 预渲染的 HTML，发布时转换、查看时零解析
-- ============================================

ALTER TABLE design_info_square.knowledge_posts
  ADD COLUMN IF NOT EXISTS module_name VARCHAR(200);

ALTER TABLE design_info_square.knowledge_posts
  ADD COLUMN IF NOT EXISTS content_html TEXT;
