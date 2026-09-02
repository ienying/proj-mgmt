-- ============================================
-- Add missing parent_id column to issue_mgmt_issue_categories
-- 2026-08-31
--
-- The application code (API routes + frontend) references `parent_id` to
-- build the 大类/子类 two-level category tree, and `form_fields` to store the
-- per-category custom form schema. Neither column was present in the original
-- init-db.sql table definition, so:
--   * POST /api/issue-dicts/categories failed with
--     "column parent_id of relation issue_mgmt_issue_categories does not exist"
--     (HTTP 500) when adding a category.
--   * The 子类 (sub-category) seed rows were skipped because they referenced
--     parent_id.
-- ============================================

ALTER TABLE issue_mgmt_issue_categories
  ADD COLUMN IF NOT EXISTS parent_id VARCHAR(36);

ALTER TABLE issue_mgmt_issue_categories
  ADD COLUMN IF NOT EXISTS form_fields JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_issue_mgmt_categories_parent_id
  ON issue_mgmt_issue_categories(parent_id);

-- Re-seed the sub-categories that were skipped when parent_id was missing.
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
