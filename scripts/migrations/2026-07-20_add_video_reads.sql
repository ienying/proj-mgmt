-- 视频中心：用户已读记录表
CREATE TABLE IF NOT EXISTS video_center.reads (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_vc_reads_user ON video_center.reads(user_id);
CREATE INDEX IF NOT EXISTS idx_vc_reads_video ON video_center.reads(video_id);
