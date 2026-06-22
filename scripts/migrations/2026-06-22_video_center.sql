-- Video Center: 视频中心
-- Stores video metadata, accompanying files, and comments

CREATE SCHEMA IF NOT EXISTS video_center;

-- 视频表
CREATE TABLE IF NOT EXISTS video_center.videos (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  duration VARCHAR(50),
  module_name VARCHAR(200),
  tags VARCHAR(500),
  description TEXT,
  created_by VARCHAR(36),
  created_by_name VARCHAR(100),
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  share_token VARCHAR(64),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 附件表（PPT、Word、PDF、Markdown、压缩包等）
CREATE TABLE IF NOT EXISTS video_center.attachments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 评论表（支持回复）
CREATE TABLE IF NOT EXISTS video_center.comments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  user_id VARCHAR(36),
  user_name VARCHAR(100),
  parent_id VARCHAR(36),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_videos_module ON video_center.videos(module_name);
CREATE INDEX IF NOT EXISTS idx_videos_share_token ON video_center.videos(share_token);
CREATE INDEX IF NOT EXISTS idx_videos_created_by ON video_center.videos(created_by);
CREATE INDEX IF NOT EXISTS idx_attachments_video_id ON video_center.attachments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON video_center.comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON video_center.comments(parent_id);
