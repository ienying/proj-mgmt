-- Add share_password column for password-protected sharing
ALTER TABLE design_info_square.knowledge_posts
ADD COLUMN IF NOT EXISTS share_password VARCHAR(100);
