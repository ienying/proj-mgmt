-- ============================================
-- Migration: 信息广场大改版
-- Date: 2026-06-18
-- Description: 5分类卡片布局 + 版本管理 + 文件系统存储 + 分享链接 + 下载追踪
-- ============================================

-- 1. Clear old categories and seed 5 new ones
DELETE FROM design_info_square.knowledge_categories;

INSERT INTO design_info_square.knowledge_categories (id, name, icon, color, category_type, description, sort_order, is_enabled) VALUES
(gen_random_uuid(), '技术文档', 'FileText', '#3b82f6', 'tech_doc',          '系统部署手册、安装部署、常见问题处理',                      1, true),
(gen_random_uuid(), '产品手册', 'BookOpen', '#f59e0b', 'product_manual',    '智慧校园操作手册、软硬件说明书、硬件参数、接线图、功能说明、版本差异', 2, true),
(gen_random_uuid(), '运维工具', 'Wrench',   '#64748b', 'ops_tool',          '调试工具、固件包、授权工具、日志抓取脚本、驱动程序',       3, true),
(gen_random_uuid(), '验收资料', 'CheckCircle', '#22c55e', 'acceptance',     '验收规范、验收记录表、竣工资料、验收PPT、问题整改方案',    4, true),
(gen_random_uuid(), '方案模板', 'FileEdit', '#f97316', 'solution_template', '售前收费方案、交付单据、沟通模板',                         5, true);

-- 2. Add columns to knowledge_posts
ALTER TABLE design_info_square.knowledge_posts
  ADD COLUMN IF NOT EXISTS post_type VARCHAR(50) DEFAULT 'tech_doc',
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) DEFAULT 'rich_text',
  ADD COLUMN IF NOT EXISTS share_token VARCHAR(64),
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(36),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 3. Add columns to knowledge_attachments
ALTER TABLE design_info_square.knowledge_attachments
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tags TEXT,
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 4. Version history table
CREATE TABLE IF NOT EXISTS design_info_square.knowledge_versions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR(36) NOT NULL,
  version INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  content_type VARCHAR(20) DEFAULT 'rich_text',
  change_summary TEXT,
  created_by VARCHAR(36),
  created_by_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS kv_post_idx ON design_info_square.knowledge_versions(post_id);

-- 5. Download tracking table
CREATE TABLE IF NOT EXISTS design_info_square.knowledge_downloads (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id VARCHAR(36) NOT NULL,
  post_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  user_name VARCHAR(100),
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS kd_attachment_idx ON design_info_square.knowledge_downloads(attachment_id);
CREATE INDEX IF NOT EXISTS kd_post_idx ON design_info_square.knowledge_downloads(post_id);

-- 6. Attachment tags table (managed in system settings)
CREATE TABLE IF NOT EXISTS design_info_square.knowledge_attachment_tags (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 7. Seed default attachment tags
INSERT INTO design_info_square.knowledge_attachment_tags (id, name, sort_order) VALUES
(gen_random_uuid(), '部署',             1),
(gen_random_uuid(), '配置',             2),
(gen_random_uuid(), '手册',             3),
(gen_random_uuid(), '驱动',             4),
(gen_random_uuid(), '脚本',             5),
(gen_random_uuid(), '模板',             6),
(gen_random_uuid(), '验收',             7),
(gen_random_uuid(), '方案',             8),
(gen_random_uuid(), '固件',             9),
(gen_random_uuid(), '授权',            10),
(gen_random_uuid(), '调试',            11),
(gen_random_uuid(), '版本说明',        12),
(gen_random_uuid(), '安装',            13),
(gen_random_uuid(), '常见问题',        14),
(gen_random_uuid(), '接线图',          15)
ON CONFLICT DO NOTHING;
