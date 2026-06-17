-- ============================================
-- Seed Data: 公告通知 + 经验分享 分类
-- 同时修正之前 news/faq 类型的分类
-- ============================================

-- 修正之前不规范的类型
UPDATE design_info_square.knowledge_categories SET category_type = 'announcement' WHERE name = '行业资讯' AND category_type = 'news';
UPDATE design_info_square.knowledge_categories SET category_type = 'material'    WHERE name = '问题解答' AND category_type = 'faq';

-- 公告通知分类
INSERT INTO design_info_square.knowledge_categories (name, icon, color, category_type, description, sort_order, is_enabled) VALUES
('公司通知',     'Megaphone', '#ef4444', 'announcement', '公司重要通知、政策变更、人事任命等',       1, true),
('版本发布',     'RefreshCw', '#3b82f6', 'announcement', '产品版本更新、功能发布说明',                2, true),
('活动通知',     'Star',      '#f59e0b', 'announcement', '培训活动、团建通知、会议安排',              3, true),
('制度公告',     'FileText',  '#8b5cf6', 'announcement', '规章制度、流程规范更新公告',                4, true),
('奖惩公示',     'Award',     '#22c55e', 'announcement', '表彰通报、考核结果公示',                    5, true),
('系统公告',     'Bell',      '#ec4899', 'announcement', '系统升级、维护停机等运维公告',              6, true)
ON CONFLICT DO NOTHING;

-- 经验分享分类
INSERT INTO design_info_square.knowledge_categories (name, icon, color, category_type, description, sort_order, is_enabled) VALUES
('项目复盘',     'Lightbulb',     '#f59e0b', 'share', '项目总结、复盘报告、得失分析',                 1, true),
('技术踩坑',     'Wrench',        '#ef4444', 'share', '技术难题排查过程、常见陷阱与解决方案',         2, true),
('开发技巧',     'CheckCircle',   '#22c55e', 'share', '开发效率提升、实用代码片段、工具推荐',         3, true),
('方案分享',     'FileText',      '#3b82f6', 'share', '技术方案、架构设计、选型对比分享',             4, true),
('客户故事',     'BookOpen',      '#8b5cf6', 'share', '客户需求沟通技巧、交付经验、关系维护',         5, true),
('新人指南',     'GraduationCap', '#14b8a6', 'share', '入职上手经验、学习路径、常见问题解答',         6, true),
('效率提升',     'ThumbsUp',      '#ec4899', 'share', '流程优化、自动化实践、工作效率提升方法',       7, true),
('面试招聘',     'Compass',       '#06b6d4', 'share', '面试题库、招聘经验、岗位能力模型',             8, true)
ON CONFLICT DO NOTHING;
