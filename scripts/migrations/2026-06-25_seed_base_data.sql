-- ============================================
-- Seed Data: 系统设置 → 基础数据（全部）
-- ============================================

-- 1. 部门
INSERT INTO departments (code, name, description, sort_order, is_enabled) VALUES
('RD',       '研发部',     '负责产品研发与开发工作',            1, true),
('PM',       '产品部',     '负责产品需求与功能定义',            2, true),
('SALES',    '销售部',     '负责项目销售与客户拓展',            3, true),
('PRESALES', '售前部',     '负责项目售前技术方案与演示',        4, true),
('MARKET',   '市场部',     '负责市场推广与品牌建设',            5, true),
('OPS',      '运维部',     '负责项目部署、监控与运维支持',      6, true),
('QA',       '测试部',     '负责产品质量测试与质量保障',        7, true),
('PMO',      '项目管理部', '负责项目整体管理与协调',            8, true),
('HR_ADMIN', '人事行政部', '负责招聘、培训及行政事务',          9, true),
('FINANCE',  '财务部',     '负责财务核算与成本管控',           10, true)
ON CONFLICT (code) DO NOTHING;

-- 2. 项目类型
INSERT INTO project_types (code, name, description, sort_order, is_enabled) VALUES
('SMART_CAMPUS',     '智慧校园',   '智慧校园整体解决方案',        1, true),
('SMART_CLASSROOM',  '智慧课堂',   '智慧课堂教学系统',            2, true),
('EDU_MGMT',         '教育管理',   '教育管理信息化平台',          3, true),
('EDU_BIGDATA',      '教育大数据', '教育大数据分析与决策系统',    4, true),
('ONLINE_EDU',       '在线教育',   '在线教学与学习平台',          5, true),
('CAMPUS_SECURITY',  '校园安全',   '校园安全防控系统',            6, true),
('EXAM_SYSTEM',      '考试系统',   '在线考试与测评系统',          7, true),
('OTHER',            '其他',       '其他类型项目',               99, true)
ON CONFLICT (code) DO NOTHING;

-- 3. 项目阶段
INSERT INTO project_stages (code, name, description, sort_order, is_enabled) VALUES
('OPPORTUNITY',  '商机阶段',   '项目商机识别与初步接触',       1, true),
('REQUIREMENT',  '需求调研',   '客户需求调研与分析',           2, true),
('SOLUTION',     '方案设计',   '技术方案设计与编写',           3, true),
('BIDDING',      '招投标',     '项目招投标与商务谈判',         4, true),
('CONTRACT',     '合同签订',   '合同签订与项目启动',           5, true),
('DELIVERY',     '实施交付',   '项目实施、部署与培训',         6, true),
('ACCEPTANCE',   '验收',       '项目初验与终验',               7, true),
('MAINTENANCE',  '运维',       '项目运维与售后服务',           8, true)
ON CONFLICT (code) DO NOTHING;

-- 4. 项目状态
INSERT INTO project_statuses (code, name, color, description, sort_order, is_enabled) VALUES
('ACTIVE',    '进行中',  '#22c55e', '项目正在进行中',        1, true),
('PAUSED',    '已暂停',  '#f59e0b', '项目暂时停止',          2, true),
('ACCEPTED',  '已验收',  '#3b82f6', '项目已完成验收',        3, true),
('CLOSED',    '已关闭',  '#9ca3af', '项目已关闭归档',        4, true)
ON CONFLICT (code) DO NOTHING;

-- 5. 客户类型
INSERT INTO customer_types (code, name, description, sort_order, is_enabled) VALUES
('EDUCATION_BUREAU',  '教育局',    '各级教育行政主管部门',      1, true),
('PRIMARY_SECONDARY', '中小学',    '小学、初中、高中学校',      2, true),
('HIGHER_EDU',        '高校',      '本科、专科及高职院校',      3, true),
('VOCATIONAL',        '职业学校',  '中职、技工学校',             4, true),
('TRAINING',          '培训机构',  '校外培训与辅导机构',         5, true),
('EDU_GROUP',         '教育集团',  '教育集团及连锁学校',         6, true),
('GOVERNMENT',        '政府机关',  '非教育类政府部门',           7, true),
('ENTERPRISE',        '企业',      '各类企业客户',               8, true)
ON CONFLICT (code) DO NOTHING;

-- 6. 部署模式
INSERT INTO deployment_modes (code, name, description, sort_order, is_enabled) VALUES
('SAAS',      '公有云SaaS',   '公有云软件即服务模式',         1, true),
('PRIVATE',   '私有化部署',   '客户自有服务器部署',           2, true),
('HYBRID',    '混合云',       '公有云与私有化混合部署',       3, true),
('ON_PREM',   '本地部署',     '客户内网完全离线部署',         4, true)
ON CONFLICT (code) DO NOTHING;

-- 7. 产品分类
INSERT INTO product_categories (code, name, description, sort_order, is_enabled) VALUES
('SOFTWARE',     '软件',     '软件产品及平台系统',            1, true),
('HARDWARE',     '硬件',     '服务器、终端、网络设备',        2, true),
('SERVICE',      '服务',     '咨询、实施、培训、运维服务',    3, true),
('SOLUTION',     '解决方案', '软硬件一体化整体解决方案',      4, true),
('CONTENT',      '内容资源', '课件、题库、数字资源',          5, true)
ON CONFLICT (code) DO NOTHING;

-- 8. 厂商
INSERT INTO product_vendors (code, name, description, sort_order, is_enabled) VALUES
('VENDOR_A', '厂商A', '教育信息化解决方案提供商',      1, true),
('VENDOR_B', '厂商B', '智慧校园平台厂商',              2, true),
('VENDOR_C', '厂商C', '教育大数据与AI厂商',            3, true),
('VENDOR_D', '厂商D', '教育硬件设备厂商',              4, true),
('VENDOR_E', '厂商E', '在线教育与直播技术厂商',        5, true),
('SELF',     '自研',   '自有研发团队开发',             99, true)
ON CONFLICT (code) DO NOTHING;

-- 9. 范围
INSERT INTO product_scopes (code, name, description, sort_order, is_enabled) VALUES
('SCHOOL',   '校级',   '覆盖单所学校',            1, true),
('DISTRICT', '区县级', '覆盖区县教育局及下辖学校', 2, true),
('CITY',     '市级',   '覆盖市级教育局及下辖区县', 3, true),
('PROVINCE', '省级',   '覆盖省级教育厅及下辖地市', 4, true)
ON CONFLICT (code) DO NOTHING;

-- 10. 产品模块类型
INSERT INTO product_module_types (code, module_name, product_name, product_category, category, vendor, scope, tech_specs, is_enabled, sort_order) VALUES
('CAMPUS_PORTAL',      '校园门户',       '智慧校园平台',  'SOFTWARE', 'SOFTWARE', '自研', '校级', '统一门户、单点登录、信息发布', true, 1),
('TEACHING_SYS',       '教务管理系统',   '智慧校园平台',  'SOFTWARE', 'SOFTWARE', '自研', '校级', '排课、选课、成绩管理、学籍管理', true, 2),
('CLASSROOM_TECH',     '智慧课堂系统',   '智慧课堂',      'SOFTWARE', 'SOFTWARE', '自研', '校级', '互动教学、屏幕广播、随堂测验', true, 3),
('ONLINE_EXAM',        '在线考试系统',   '考试系统',      'SOFTWARE', 'SOFTWARE', '自研', '校级', '题库管理、智能组卷、在线监考', true, 4),
('BIGDATA_PLATFORM',   '大数据分析平台', '教育大数据',    'SOFTWARE', 'SOFTWARE', '自研', '区县级', '数据采集、清洗、可视化分析', true, 5),
('CAMPUS_SEC_SYS',     '校园安防系统',   '校园安全',      'SOLUTION', 'SOLUTION', '自研', '校级', '视频监控、门禁、一键报警', true, 6),
('LIVE_TEACHING',      '直播教学系统',   '在线教育平台',  'SOFTWARE', 'SOFTWARE', '自研', '校级', '直播授课、互动白板、录播回放', true, 7),
('RESOURCE_LIB',       '教学资源库',     '在线教育平台',  'CONTENT',  'CONTENT',  '自研', '区县级', '课件库、题库、微课视频资源', true, 8),
('OA_SYSTEM',          'OA办公系统',     '智慧校园平台',  'SOFTWARE', 'SOFTWARE', '自研', '校级', '公文流转、审批、通知公告', true, 9),
('CANTEEN_SYS',        '智慧食堂系统',   '智慧校园平台',  'SOLUTION', 'SOLUTION', '自研', '校级', '消费结算、营养分析、食材追溯', true, 10),
('SERVER_EQUIP',       '服务器设备',     '硬件基础设施',  'HARDWARE', 'HARDWARE', '厂商A', '校级', '应用服务器、存储、备份', true, 11),
('NETWORK_EQUIP',      '网络设备',       '硬件基础设施',  'HARDWARE', 'HARDWARE', '厂商B', '校级', '交换机、路由器、无线AP', true, 12),
('IMPLEMENT_SVC',      '实施部署服务',   '基础服务',      'SERVICE',  'SERVICE',  '自研', '校级', '系统部署、数据迁移、联调测试', true, 13),
('TRAINING_SVC',       '培训服务',       '基础服务',      'SERVICE',  'SERVICE',  '自研', '校级', '管理员培训、教师培训、操作手册', true, 14),
('MAINTENANCE_SVC',    '运维保障服务',   '基础服务',      'SERVICE',  'SERVICE',  '自研', '校级', '日常巡检、故障处理、版本升级', true, 15),
('STUDENT_MGMT',       '学生管理系统',   '智慧校园平台',  'SOFTWARE', 'SOFTWARE', '自研', '校级', '学籍、德育、综合素质评价', true, 16),
('TEACHER_MGMT',       '教师管理系统',   '智慧校园平台',  'SOFTWARE', 'SOFTWARE', '自研', '校级', '教师档案、继续教育、绩效考核', true, 17),
('PARENT_APP',         '家校通APP',      '智慧校园平台',  'SOFTWARE', 'SOFTWARE', '自研', '校级', '家校沟通、作业通知、成长档案', true, 18)
ON CONFLICT (code) DO NOTHING;

-- 11. 项目模块类型（Dock 导航菜单项）
INSERT INTO project_module_types (name, code, icon, color, description, is_enabled, sort_order) VALUES
('项目管理', 'project_management', 'FolderKanban',   'blue',     '项目全生命周期管理',         true, 1),
('项目看板', 'project_dashboard',  'LayoutDashboard', 'emerald', '多项目统计对比与预警分析',   true, 2),
('任务中心', 'task_center',        'ListTodo',       'amber',    '任务管理与工作流',            true, 3),
('信息广场', 'info_square',        'BookOpen',       'violet',   '知识分享与经验沉淀',          true, 4),
('案例中心', 'case_center',        'Briefcase',      'rose',     '客户案例与产品案例管理',      true, 5),
('规范管理', 'standard_mgmt',      'FileText',       'slate',    '数据规范与Schema规则管理',    true, 6),
('基础数据', 'base_data',          'Database',       'orange',   '字典数据与基础配置管理',      true, 7),
('工单管理', 'issue_mgmt',         'AlertTriangle',  'red',      '问题工单管理与追踪',          true, 8),
('视频中心', 'video_center',       'Video',          'cyan',     '视频资源管理与分享',          true, 9),
('系统设置', 'system_settings',    'Settings',       'gray',     '系统管理与用户权限配置',      true, 10)
ON CONFLICT (code) DO NOTHING;
