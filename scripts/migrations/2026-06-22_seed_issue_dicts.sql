-- ============================================
-- Seed Data: 问题类别 / 紧急程度 / 保修情况
-- ============================================

-- 问题类别（大类）
INSERT INTO issue_mgmt_issue_categories (code, name, description, sort_order, is_enabled) VALUES
('SOFTWARE',     '软件问题',   '软件功能异常、BUG、兼容性问题等',       1, true),
('HARDWARE',     '硬件问题',   '服务器、网络设备、终端硬件故障等',     2, true),
('NETWORK',      '网络问题',   '网络连接中断、延迟、带宽不足等',       3, true),
('DATA',         '数据问题',   '数据丢失、数据不一致、数据迁移等',     4, true),
('SECURITY',     '安全问题',   '漏洞、权限、安全策略相关',             5, true),
('OPERATION',    '运维问题',   '部署、监控、日志、备份等运维相关',     6, true),
('CONSULTATION', '咨询问题',   '使用咨询、技术方案咨询等',            7, true),
('OTHER',        '其他问题',   '不属于以上类别的问题',                99, true)
ON CONFLICT (code) DO NOTHING;

-- 问题类别（子类）
INSERT INTO issue_mgmt_issue_categories (code, name, parent_id, description, sort_order, is_enabled)
SELECT 'SOFTWARE_FUNC',   '功能异常',    c.id, '软件功能不符合预期或无法正常使用',     1, true FROM issue_mgmt_issue_categories c WHERE c.code = 'SOFTWARE'
UNION ALL
SELECT 'SOFTWARE_PERF',   '性能问题',    c.id, '软件响应慢、卡顿、资源占用过高',        2, true FROM issue_mgmt_issue_categories c WHERE c.code = 'SOFTWARE'
UNION ALL
SELECT 'SOFTWARE_COMPAT', '兼容性问题',  c.id, '浏览器、操作系统、第三方系统兼容问题',  3, true FROM issue_mgmt_issue_categories c WHERE c.code = 'SOFTWARE'
UNION ALL
SELECT 'HARDWARE_SERVER', '服务器故障',  c.id, '服务器宕机、硬盘损坏、内存故障等',      1, true FROM issue_mgmt_issue_categories c WHERE c.code = 'HARDWARE'
UNION ALL
SELECT 'HARDWARE_NET',    '网络设备',    c.id, '交换机、路由器、防火墙等设备故障',      2, true FROM issue_mgmt_issue_categories c WHERE c.code = 'HARDWARE'
UNION ALL
SELECT 'HARDWARE_TERM',   '终端设备',    c.id, '电脑、打印机、扫描仪等终端设备故障',    3, true FROM issue_mgmt_issue_categories c WHERE c.code = 'HARDWARE'
UNION ALL
SELECT 'NETWORK_DISC',    '网络中断',    c.id, '网络连接中断、断网、信号不稳定',        1, true FROM issue_mgmt_issue_categories c WHERE c.code = 'NETWORK'
UNION ALL
SELECT 'NETWORK_PERF',    '网络延迟',    c.id, '网络速度慢、延迟高、丢包严重',          2, true FROM issue_mgmt_issue_categories c WHERE c.code = 'NETWORK'
UNION ALL
SELECT 'DATA_LOST',       '数据丢失',    c.id, '业务数据丢失、误删除',                   1, true FROM issue_mgmt_issue_categories c WHERE c.code = 'DATA'
UNION ALL
SELECT 'DATA_CONSIST',    '数据不一致',  c.id, '跨系统数据不一致、脏数据',              2, true FROM issue_mgmt_issue_categories c WHERE c.code = 'DATA'
UNION ALL
SELECT 'SECURITY_VULN',   '安全漏洞',    c.id, '系统漏洞、SQL注入、XSS等',              1, true FROM issue_mgmt_issue_categories c WHERE c.code = 'SECURITY'
UNION ALL
SELECT 'SECURITY_PERM',   '权限问题',    c.id, '权限异常、越权访问、认证失败',          2, true FROM issue_mgmt_issue_categories c WHERE c.code = 'SECURITY'
UNION ALL
SELECT 'OPS_DEPLOY',      '部署问题',    c.id, '部署失败、版本不匹配、环境配置错误',    1, true FROM issue_mgmt_issue_categories c WHERE c.code = 'OPERATION'
UNION ALL
SELECT 'OPS_MONITOR',     '监控告警',    c.id, '监控告警、日志异常、巡检发现问题',      2, true FROM issue_mgmt_issue_categories c WHERE c.code = 'OPERATION'
ON CONFLICT (code) DO NOTHING;

-- 紧急程度
INSERT INTO issue_mgmt_issue_urgency (code, name, description, sort_order, is_enabled) VALUES
('URGENT',     '紧急',   '严重影响业务运行，需立即处理',     1, true),
('HIGH',       '高',     '对业务有较大影响，2小时内处理',    2, true),
('MEDIUM',     '中',     '对业务有一定影响，8小时内处理',    3, true),
('LOW',        '低',     '影响较小，24小时内处理即可',       4, true)
ON CONFLICT (code) DO NOTHING;

-- 保修情况
INSERT INTO issue_mgmt_issue_warranty_status (code, name, description, sort_order, is_enabled) VALUES
('IN_WARRANTY',       '保修期内',   '产品在免费保修服务期内',           1, true),
('OUT_WARRANTY',      '已过保',     '产品超出免费保修服务期',           2, true),
('EXTENDED_WARRANTY', '延保期内',   '产品在付费延长保修服务期内',      3, true),
('MAINTENANCE',       '维保合同',   '签署了年度维护保养合同',           4, true),
('NONE',              '无保修',     '无任何保修或维保服务',            5, true)
ON CONFLICT (code) DO NOTHING;
