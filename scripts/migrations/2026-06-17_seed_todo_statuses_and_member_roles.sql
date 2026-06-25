-- ============================================
-- Seed Data: 事项状态 (todo_statuses)
-- Seed Data: 成员角色 (member_role_types)
-- ============================================

-- 事项状态
INSERT INTO todo_statuses (code, name, color, description, sort_order, is_enabled) VALUES
('pending',         '待处理',   '#f59e0b', '任务已创建，等待处理',       1, true),
('in_progress',     '处理中',   '#3b82f6', '任务正在处理中',             2, true),
('reviewing',       '审核中',   '#8b5cf6', '任务等待审核',               3, true),
('completed',       '已完成',   '#22c55e', '任务已完成',                 4, true),
('cancelled',       '已取消',   '#9ca3af', '任务已取消',                 5, true),
('paused',          '已暂停',   '#eab308', '任务暂时搁置',               6, true),
('rejected',        '已驳回',   '#ef4444', '任务审核未通过，需重新处理', 7, true)
ON CONFLICT (code) DO NOTHING;

-- 成员角色
INSERT INTO member_role_types (code, name, description, sort_order, is_enabled) VALUES
('sales',              '销售',       '负责项目销售跟进',         1, true),
('presales',           '售前',       '负责项目售前技术支持',     2, true),
('market_product',     '市场产品',   '负责市场产品规划与推广',   3, true),
('project_manager',    '项目经理',   '负责项目整体管理与协调',   4, true),
('tech_lead',          '技术负责人', '负责项目技术方案与架构',   5, true),
('rd_engineer',        '研发工程师', '负责项目研发与开发工作',   6, true),
('test_engineer',      '测试工程师', '负责项目测试与质量保障',   7, true),
('ui_designer',        'UI设计师',   '负责项目界面与交互设计',   8, true),
('ops_engineer',       '运维工程师', '负责项目部署与运维',       9, true),
('product_manager',    '产品经理',   '负责产品需求与功能定义',  10, true),
('customer_success',   '客户成功',   '负责客户关系维护与满意度', 11, true),
('business_support',   '商务支持',   '负责项目商务合同与流程',  12, true)
ON CONFLICT (code) DO NOTHING;
