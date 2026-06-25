-- ============================================
-- Seed Data: 基础数据 — 客户偏教育行业
-- 包含: customer_types, project_types, project_stages,
--       project_statuses, deployment_modes, construction_units
-- ============================================

-- ============================================
-- 1. 客户类型（教育 + 医疗）
-- ============================================
INSERT INTO customer_types (code, name, description, sort_order, is_enabled) VALUES
-- 教育类（从幼儿园到大学）
('kindergarten',        '幼儿园',              '学前教育机构，3-6岁幼儿教育',            0, true),
('primary_school',      '小学',                '义务教育阶段小学',                       1, true),
('junior_high',         '初中',                '义务教育阶段初中',                       2, true),
('senior_high',         '高中',                '普通高级中学',                           3, true),
('vocational_sec',      '中职院校',            '中等职业学校、技工学校',                 4, true),
('vocational_high',     '高职院校',            '高等职业院校、大专',                     5, true),
('undergraduate',       '本科院校',            '本科层次高等院校',                       6, true),
('graduate_school',     '研究生院',            '硕士、博士研究生培养单位',               7, true),
('education_bureau',    '教育局',              '省/市/区县教育主管部门',                 8, true),
('edu_research',        '教育科研院所',        '教育科学研究院、教研室等',               9, true),
('edu_enterprise',      '教育企业',            '教育信息化、教育装备等企业',            10, true),
-- 医疗类
('general_hospital',    '综合医院',            '大型综合性医疗机构',                    11, true),
('specialist_hospital', '专科医院',            '专科特色医疗机构',                      12, true),
('community_health',    '社区卫生中心',        '社区卫生服务中心/站',                   13, true),
('health_commission',   '卫健委',              '省/市/区县卫生健康主管部门',           14, true),
('cdc',                 '疾控中心',            '疾病预防控制中心',                      15, true)
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

-- ============================================
-- 7. 模块定义（项目管理十大知识领域）
-- 注意: project_module_types 的 code 列无唯一约束，使用 WHERE NOT EXISTS 防重复
-- ============================================
INSERT INTO project_module_types (code, name, icon, color, description, sort_order, is_enabled)
SELECT v.code, v.name, v.icon, v.color, v.description, v.sort_order, v.is_enabled
FROM (VALUES
  ('scope',           '范围管理',    'Target',         'blue',       '项目范围定义、WBS分解、范围确认与控制',         0, true),
  ('schedule',        '进度管理',    'Calendar',       'emerald',    '活动定义、排序、资源估算、进度计划与控制',     1, true),
  ('quality',         '质量管理',    'CheckCircle',    'purple',     '质量规划、质量保证、质量控制',                 2, true),
  ('cost',            '成本管理',    'DollarSign',     'amber',      '成本估算、预算编制、成本控制',                 3, true),
  ('collaboration',   '协同管理',    'Users',          'cyan',       '团队协作、任务分配、工作流协同',               4, true),
  ('communication',   '沟通管理',    'MessageCircle',  'indigo',     '沟通规划、信息发布、干系人沟通',               5, true),
  ('risk',            '风险管理',    'AlertTriangle',  'red',        '风险识别、定性定量分析、风险应对与控制',       6, true),
  ('procurement',     '采购管理',    'ShoppingCart',   'orange',     '采购规划、招标、合同管理、供应商管理',         7, true),
  ('resource',        '资源管理',    'Database',       'teal',       '人力资源、设备资源、物料资源的计划与调配',     8, true),
  ('document',        '资料管理',    'FileText',       'slate',      '项目文档、图纸、报告、归档管理',               9, true)
) AS v(code, name, icon, color, description, sort_order, is_enabled)
WHERE NOT EXISTS (SELECT 1 FROM project_module_types WHERE code = v.code);
