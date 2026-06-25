-- Migration: Move knowledge tables from public to design_info_square schema
-- Date: 2026-06-17
-- Description: 将信息广场 6 张表从 public schema 迁移到独立的 design_info_square schema

CREATE SCHEMA IF NOT EXISTS design_info_square;

-- knowledge_categories
CREATE TABLE IF NOT EXISTS design_info_square.knowledge_categories (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT 'BookOpen',
  color VARCHAR(50) DEFAULT '#6366f1',
  category_type VARCHAR(50) DEFAULT 'material',
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- knowledge_posts
CREATE TABLE IF NOT EXISTS design_info_square.knowledge_posts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  category_id VARCHAR(36),
  is_pinned BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  like_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  tags TEXT,
  status VARCHAR(20) DEFAULT 'published',
  created_by VARCHAR(36),
  created_by_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS knowledge_posts_category_idx ON design_info_square.knowledge_posts(category_id);

-- knowledge_attachments
CREATE TABLE IF NOT EXISTS design_info_square.knowledge_attachments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR(36),
  file_name VARCHAR(255),
  file_url TEXT,
  file_size INTEGER,
  file_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS knowledge_attachments_post_idx ON design_info_square.knowledge_attachments(post_id);

-- knowledge_comments
CREATE TABLE IF NOT EXISTS design_info_square.knowledge_comments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  user_id VARCHAR(36),
  user_name VARCHAR(100),
  user_avatar VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS knowledge_comments_post_idx ON design_info_square.knowledge_comments(post_id);

-- knowledge_likes
CREATE TABLE IF NOT EXISTS design_info_square.knowledge_likes (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS knowledge_likes_post_idx ON design_info_square.knowledge_likes(post_id);
CREATE INDEX IF NOT EXISTS knowledge_likes_user_idx ON design_info_square.knowledge_likes(user_id);

-- knowledge_reads
CREATE TABLE IF NOT EXISTS design_info_square.knowledge_reads (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS knowledge_reads_post_idx ON design_info_square.knowledge_reads(post_id);

-- Drop old tables from public schema
DROP TABLE IF EXISTS public.knowledge_reads CASCADE;
DROP TABLE IF EXISTS public.knowledge_likes CASCADE;
DROP TABLE IF EXISTS public.knowledge_comments CASCADE;
DROP TABLE IF EXISTS public.knowledge_attachments CASCADE;
DROP TABLE IF EXISTS public.knowledge_posts CASCADE;
DROP TABLE IF EXISTS public.knowledge_categories CASCADE;
