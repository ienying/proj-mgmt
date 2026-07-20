-- 视频中心：添加缩略图封面字段
ALTER TABLE video_center.videos ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500);
