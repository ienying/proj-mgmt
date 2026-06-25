-- ============================================
-- Seed Data: 信息广场分类 (knowledge_categories)
-- ============================================

INSERT INTO design_info_square.knowledge_categories (name, icon, color, category_type, description, sort_order, is_enabled) VALUES
('技术文档',    'FileText',     '#3b82f6', 'material', '技术方案、架构设计、API 文档等',                     1, true),
('产品资料',    'Package',      '#f59e0b', 'material', '产品介绍、功能清单、版本发布说明',                   2, true),
('项目经验',    'Lightbulb',    '#22c55e', 'material', '项目复盘、经验总结、踩坑记录',                       3, true),
('行业资讯',    'Newspaper',    '#8b5cf6', 'news',     '行业动态、政策法规、市场分析',                       4, true),
('最佳实践',    'ThumbsUp',     '#ec4899', 'material', '开发规范、流程标准、推荐做法',                       5, true),
('培训资料',    'GraduationCap', '#14b8a6', 'material', '培训课件、操作手册、视频教程',                      6, true),
('方案模板',    'FileEdit',     '#f97316', 'material', '投标方案、需求文档、汇报模板',                       7, true),
('问题解答',    'HelpCircle',   '#6366f1', 'faq',      '常见问题 FAQ、疑难解答、知识问答',                  8, true),
('案例分享',    'Share2',       '#06b6d4', 'material', '客户案例、成功故事、应用场景',                       9, true),
('工具资源',    'Wrench',       '#64748b', 'material', '效率工具、脚本插件、开发资源',                      10, true)
ON CONFLICT DO NOTHING;
