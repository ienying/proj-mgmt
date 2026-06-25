-- ============================================
-- Seed Data: 基础数据 — 客户偏教育行业
-- 包含: customer_types, project_types, project_stages,
--       project_statuses, deployment_modes, construction_units
-- ============================================

-- ============================================
-- 1. 客户类型（偏教育行业）
-- ============================================
INSERT INTO customer_types (code, name, description, sort_order, is_enabled) VALUES
('university',          '高校/大学',           '本科、研究生等高等教育机构',           0, true),
('k12_school',          '中小学',              '小学、初中、高中等基础教育学校',       1, true),
('vocational_college',  '职业院校',            '高职、中职等职业技术院校',             2, true),
('education_bureau',    '教育局',              '省/市/区县教育主管部门',              3, true),
('training_org',        '培训机构',            '社会培训、课外辅导等培训组织',         4, true),
('edu_research',        '教育科研院所',        '教育科学研究院、教研室等',             5, true),
('preschool',           '学前教育机构',        '幼儿园、早教中心等',                   6, true),
('online_edu',          '在线教育平台',        '在线教育、远程教育服务商',             7, true),
('edu_publisher',       '教育出版机构',        '教材、教辅出版发行单位',               8, true),
('edu_enterprise',      '教育企业',            '教育信息化、教育装备等企业',           9, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 2. 项目类型
-- ============================================
INSERT INTO project_types (code, name, description, sort_order, is_enabled) VALUES
('it_construction',     '信息化建设',          '校园网络、数据中心等IT基础设施建设',   0, true),
('teaching_platform',   '教学平台',            '在线教学、智慧课堂等教学平台项目',     1, true),
('campus_security',     '校园安防',            '视频监控、门禁、消防等安防系统',       2, true),
('smart_campus',        '智慧校园',            '一卡通、物联网、数字校园综合平台',     3, true),
('training_base',       '实训基地',            '虚拟仿真、实验实训室建设',             4, true),
('edu_resources',       '教学资源库',          '课件、题库、精品课程等资源建设',       5, true),
('lab_construction',    '实验室建设',          '理化生、计算机等专业实验室建设',       6, true),
('data_governance',     '数据治理',            '教育数据标准、数据仓库、BI分析',       7, true),
('software_dev',        '软件开发',            '定制化软件系统设计与开发',             8, true),
('consulting',          '咨询服务',            '信息化规划、评估、监理等咨询服务',     9, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 3. 项目阶段
-- ============================================
INSERT INTO project_stages (code, name, description, sort_order, is_enabled) VALUES
('requirement',         '需求调研',            '了解客户需求，编制需求文档',           0, true),
('solution_design',     '方案设计',            '编制技术方案、实施方案',               1, true),
('bidding',             '招投标',              '编制标书、投标、谈判',                 2, true),
('contract',            '合同签订',            '合同评审与签订',                       3, true),
('implementation',      '实施部署',            '设备安装、系统部署、联调测试',         4, true),
('training',            '培训交付',            '用户培训、管理员培训',                 5, true),
('acceptance',          '验收交付',            '竣工验收、资料移交',                   6, true),
('warranty',            '质保运维',            '质保期内运维服务',                     7, true),
('post_warranty',       '过保服务',            '质保期满后的持续服务',                 8, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 4. 项目状态
-- ============================================
INSERT INTO project_statuses (code, name, color, description, sort_order, is_enabled) VALUES
('pending',             '待启动',              '#6b7280',   '项目已创建但尚未启动',               0, true),
('in_progress',         '进行中',              '#3b82f6',   '项目正在执行中',                     1, true),
('paused',              '已暂停',              '#f59e0b',   '项目因故暂停',                       2, true),
('completed',           '已完成',              '#10b981',   '项目已验收交付',                     3, true),
('cancelled',           '已取消',              '#ef4444',   '项目已取消',                         4, true),
('delayed',             '已延期',              '#f97316',   '项目进度滞后',                       5, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 5. 部署模式
-- ============================================
INSERT INTO deployment_modes (code, name, description, sort_order, is_enabled) VALUES
('public_cloud',        '公有云',              '部署在阿里云/腾讯云/华为云等公有云平台', 0, true),
('private_deploy',      '私有化部署',          '部署在客户自有服务器或数据中心',          1, true),
('hybrid_cloud',        '混合云',              '部分公有云 + 部分私有化混合部署',          2, true),
('on_premise',          '本地部署',            '部署在客户局域网内的物理服务器上',        3, true),
('saas',                'SaaS 订阅',           '软件即服务，按年/月订阅使用',             4, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 6. 施工单位（教育行业相关）
-- ============================================
INSERT INTO construction_units (code, name, contact_person, phone, description, sort_order, is_enabled) VALUES
('edu_tech_a',          '北京教育科技建设有限公司',     '张建国',   '13801001234',   '专注高校信息化建设，智慧校园整体方案',         0, true),
('smart_edu_build',     '上海智慧教育建设有限公司',     '李明华',   '13901002345',   'K12智慧校园、一卡通系统建设',                   1, true),
('south_edu_constr',    '广州南方教育建设有限公司',     '王志强',   '13701003456',   '教育实验室、实训基地建设',                     2, true),
('huadong_network',     '华东教育网络科技有限公司',     '陈小芳',   '13601004567',   '校园网络、数据中心基础设施建设',               3, true),
('zhongke_edu',         '中科教信息技术有限公司',       '赵伟东',   '13501005678',   '教育信息化、教学资源平台建设',                 4, true),
('huizhong_edu',        '汇众教育装备有限公司',         '刘建国',   '13301006789',   '实验室设备安装、多媒体教室建设',               5, true)
ON CONFLICT (code) DO NOTHING;
