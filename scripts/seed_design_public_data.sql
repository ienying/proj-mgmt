--
-- PostgreSQL database dump
--

\restrict 38Btf4YSQQrvMYJPO2B9V6RQgXw5RCUc458QaFe70AW025BgSczXZ9HgdXg1QZR

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: ai_prompt_templates; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.ai_prompt_templates (id, project_schema, name, prompt_type, is_default, system_message, user_prompt, sort_order, created_by, created_by_name, created_at, updated_at) VALUES ('c9bdae19-32aa-4d18-8a9b-4048948e1487', '', '默认全局分析', 'global', true, '你是一个项目管理数据分析专家，擅长从结构化数据中提炼洞察。使用中文回复，报告要具体、可操作。始终使用人类可读的项目名称和表名，绝不输出数据库内部标识符。', '你是一个项目管理数据分析专家。请分析项目【${projectName}】的数据库内容，给出专业的分析报告。

${baseRules}
${moduleHint}
数据表数量: ${tableCount} | 总数据行数: ${totalRows}

各表结构与样本数据：
${tableSummaries}

请按以下结构输出分析报告（Markdown，适当使用 📊📈⚠️✅🔴🟡🟢 等图标增强可读性）：

1. **📊 数据概览**：整体数据量、表关联关系
   - 用 ```mermaid（必须包含这个代码块标记）输出一张饼图（pie），展示各表数据量占比
2. **🔍 关键发现**：数据中值得关注的模式、异常或亮点（至少5条）
   - 如有数值对比，用 Markdown 表格展示，确保跨平台兼容
3. **📈 趋势与建议**：基于数据给出项目管理建议
4. **🛡️ 数据质量**：缺失值、不一致或异常值情况

Mermaid 图表示例格式：
```mermaid
pie showData
    title 各表数据分布
    "进度表" : 23
    "成本表" : 5
    "风险表" : 8
（注意必须使用 ASCII 英文双引号 " 而非中文引号 ""）
```', 1, 'system', '系统', '2026-07-02 15:42:56.814573+00', '2026-07-02 15:42:56.814573+00');
INSERT INTO design_public.ai_prompt_templates (id, project_schema, name, prompt_type, is_default, system_message, user_prompt, sort_order, created_by, created_by_name, created_at, updated_at) VALUES ('522d6fc9-b63f-46bb-ab1d-18bffe65d394', '', '默认单表分析', 'single_table', true, '你是一个项目管理数据分析专家，擅长从结构化数据中提炼洞察。使用中文回复，报告要具体、可操作。始终使用人类可读的项目名称和表名，绝不输出数据库内部标识符。', '你是一个项目管理数据分析专家。请对项目【${projectName}】中的【${tableName}】表进行深入分析。

${baseRules}
${moduleHint}

数据：
${tableSummaries}

请按以下结构输出分析报告（Markdown，适当使用 📊📈⚠️✅🔴🟡🟢 等图标增强可读性）：

1. **📊 数据概览**：该表的数据规模、字段结构概要
2. **🔍 关键发现**：数据中值得关注的模式、异常或亮点（至少3条）
   - 如有数值对比，用 ```mermaid（必须包含这个代码块标记）输出柱状图
3. **📈 ${moduleHintPrefix}**：基于数据分析给出具体管理建议
4. **🛡️ 数据质量**：缺失值、不一致或异常值情况', 2, 'system', '系统', '2026-07-02 15:42:56.817728+00', '2026-07-02 15:42:56.817728+00');


--
-- Data for Name: ai_settings; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.ai_settings (id, key_name, api_key, base_url, model, is_active, created_at, updated_at) VALUES ('25eb993c-511e-478c-8af3-ee7a2f46d296', 'DeepSeek', 'YOUR_DEEPSEEK_API_KEY', 'https://api.deepseek.com', 'deepseek-chat', true, '2026-06-26 08:25:17.025747+00', '2026-06-26 08:25:17.025747+00');


--
-- Data for Name: ai_usage_logs; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.ai_usage_logs (id, user_id, user_name, feature, tokens_used, model, project_id, created_at) VALUES ('3f26ae23-ca36-45e3-bc2b-acb6dfc9f55d', 'default', '当前用户', 'analyze-project', 43087, 'deepseek-chat', 'yuansu_xj_wlmq_byzx_20250827', '2026-06-26 08:25:46.108323+00');
INSERT INTO design_public.ai_usage_logs (id, user_id, user_name, feature, tokens_used, model, project_id, created_at) VALUES ('ad88dd9a-3564-4af9-b0ef-fdda1d58b032', 'default', '当前用户', 'analyze-project', 20044, 'deepseek-chat', 'yuansu_xjwwezzzq_wlmq_wlmqbyzx2025', '2026-07-02 10:58:34.731716+00');
INSERT INTO design_public.ai_usage_logs (id, user_id, user_name, feature, tokens_used, model, project_id, created_at) VALUES ('be868f4f-2b48-4ce5-803a-289ee7a879d4', 'default', '当前用户', 'analyze-project', 19978, 'deepseek-chat', 'yuansu_xjwwezzzq_wlmq_wlmqbyzx2025', '2026-07-02 13:42:44.11893+00');


--
-- Data for Name: dashboard_ai_warnings; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.dashboard_ai_warnings (id, project_ids, warnings, raw_response, generated_at, generated_by) VALUES ('37f761f1-3aa1-4368-854f-9ff2a384bfae', '{}', '[]', '# 📊 AI 预警分析报告

> 分析时间：2026/6/25 10:19:56
> 项目数量：0
> 总记录数：0

---

', '2026-06-25 10:19:56.540697+00', '当前用户');


--
-- Data for Name: dashboard_kpi_config; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_bgsqyyxpgb; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_caigouqingdan; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_csjh; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_dyzlyyszb; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_dyzlyyszb (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('37a74664-ab83-439d-924a-ccea131b8194', NULL, 1, '2026-07-02 08:42:18.934191+00', '2026-07-02 08:42:20.732147+00', NULL, true, true, 'import', '项目在调研完成后1天内，根据《科室问题表》、《XX科室调研表》、《潜在需求确认表》等，整理出针对性的优化建议和项目实施方案初版。', '整理调研情况，输出优化建议与实施方案', '《合同清单》、《风险项检查表》、《科室问题表单》、《XX系统调研表》', '《优化建议》、《实施方案初版》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_dyzlyyszb (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('b57875b7-8214-4d9d-a004-f0780ce2d98c', NULL, 2, '2026-07-02 08:42:18.937474+00', '2026-07-02 08:42:22.083577+00', NULL, true, true, 'import', '在1天内使用公司学习环境，搭建一个与客户实际部署环境类似的临时演示平台，加载学校风采照片等真实素材，确保客户演示时有真实感受。', '搭建客户演示临时环境', '学校风采照片、《合同清单》', '客户类似部署后的演示平台', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_dyzlyyszb (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('80e731b3-53f4-4af0-8965-1a20b5c3884a', NULL, 3, '2026-07-02 08:42:18.949884+00', '2026-07-02 08:42:23.335429+00', NULL, true, true, 'import', '从公司项目案例集中筛选与客户类型和需求类似的真实案例，优先选择有视频演示的案例。整理成客户汇报PPT（含客户背景/需求痛点/实施方案/核心功能演示/实施效果/客户评价），视频案例控制在3-5分钟。', '准备客户真实案例与汇报材料', '公司项目案例集、演示视频素材', '客户汇报PPT（含真实案例与视频演示）', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');


--
-- Data for Name: std_definition_feiyongbaoxiaojilu; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_fengxiangdengjice; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_fwqrs; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_ganxirentongxunlu; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_gongshitongjibiao; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_goutongjilu; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_hetongfukuanjiedian; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_lcb; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_nbgqxth; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_nbgqxth (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('d6f259e7-2b1a-4fec-bf24-be226f64833a', NULL, 1, '2026-07-02 08:33:09.066158+00', '2026-07-02 08:33:15.976014+00', NULL, true, true, 'import', '在内部工前会上核对项目合同范围，重点确认是否含定制开发、第三方对接，确保对交付范围的理解一致。', '核对项目合同范围与交付清单', '合同交付清单', '《项目基本信息表》（合同范围确认）', '', '项目经理、销售', NULL, NULL, NULL, NULL, '', '待执行');
INSERT INTO design_public.std_definition_nbgqxth (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('9d1a2d8d-c526-41de-8ec5-6761e4ac2779', NULL, 2, '2026-07-02 08:33:09.069308+00', '2026-07-02 08:33:16.730669+00', NULL, true, true, 'import', '确认建设单位、渠道或校方对接人（姓名/电话/岗位），明确关键决策人（如校长/信息中心主任）及领导分工（如教务校长负责业务确认），确保信息完整无遗漏。', '明确校方对接人及关键决策人', '销售提供的客户信息', '《项目基本信息表》（校方人员信息）', '', '项目经理、销售', NULL, NULL, NULL, NULL, '', '待执行');
INSERT INTO design_public.std_definition_nbgqxth (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('e1a400da-fea2-4631-b3c5-b3de763d05c2', NULL, 3, '2026-07-02 08:33:09.070859+00', '2026-07-02 08:33:17.805783+00', NULL, true, true, 'import', '确认进场时间、上线时间、验收时间，标注是否含节假日。工期节点需与合同约定一致，结合学校教学安排避开考试周、开学/放假等关键时段。', '确认项目三大工期节点', '学校教学日历', '《项目基本信息表》（工期节点确认）', '', '项目经理、全体参会人', NULL, NULL, NULL, NULL, '', '待执行');
INSERT INTO design_public.std_definition_nbgqxth (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('bf977f9b-c911-456f-be9d-bb033ba171fc', NULL, 4, '2026-07-02 08:33:09.072395+00', '2026-07-02 08:33:18.852832+00', NULL, true, true, 'import', '同步售前方案、需求文档、踏勘记录、沟通纪要等已完成工作，确保全体参会人知晓项目基础信息。', '同步前期已完成工作', '售前方案、需求文档、踏勘记录、沟通纪要', '已同步确认的《项目基本信息表》', '', '项目经理、销售、全体参会人', NULL, NULL, NULL, NULL, '', '待执行');
INSERT INTO design_public.std_definition_nbgqxth (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('37e7883e-bcd2-40dc-b8ab-63e36b3ff211', NULL, 5, '2026-07-02 08:33:09.074652+00', '2026-07-02 08:33:19.642656+00', NULL, true, true, 'import', '收集整理待确认事项（如校方需确认服务器升级时间）与待协调资源（如需协调开发人员支持），明确每项的内容、责任人、完成时间与交付物要求，输出《待决议题跟踪表》和《下一步行动清单》。', '整理待决议题与下一步行动计划', '《待决议题跟踪表》模板、会议记录初稿', '《待决议题跟踪表》（含责任人/时间）、《下一步行动清单》', '', '项目经理', NULL, NULL, NULL, NULL, '', '待执行');


--
-- Data for Name: std_definition_pxzb; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_pxzb (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('540e096a-f9d0-4045-bb8e-b26575ba1107', NULL, 1, '2026-07-02 08:50:53.499143+00', '2026-07-02 08:50:55.072401+00', NULL, true, true, 'import', '按''系统管理员/核心操作人员/普通使用者（教师/学生）''三类划分培训对象，编制分层培训方案和培训计划表。', '编制分层培训方案', '系统功能清单、校方使用人员清单、学校教学/办公安排表', '《智慧校园系统培训方案》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_pxzb (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('d953cc8d-c31f-4a18-9015-4df040965a2c', NULL, 2, '2026-07-02 08:50:53.501146+00', '2026-07-02 08:50:55.669932+00', NULL, true, true, 'import', '编制各层级培训课件（PPT/视频）和系统操作手册（图文版），覆盖系统全部核心功能模块的操作说明。', '编制培训课件与系统操作手册', '智慧校园系统功能清单、操作流程记录', '《培训课件》、《系统操作手册》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');


--
-- Data for Name: std_definition_qqgdyxxsj; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_qqgdyxxsj (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('aee48e76-fede-481a-95e1-a00d6e6bc192', NULL, 1, '2026-07-02 08:38:50.756158+00', '2026-07-02 08:38:59.394129+00', NULL, true, true, 'import', '项目经理在接到销售通知后4小时内，通过电话与学校对接人沟通确定现场调研时间。沟通需覆盖：学校核心需求、上线优先级、学校规模、联系人信息。', '与学校对接人初步沟通，约定现场调研时间', '客户基础信息（销售提供）、《合同清单》', '通话纪要、约定的现场调研时间', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_qqgdyxxsj (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('957fc8b2-81e9-4025-bc89-134034519ee1', NULL, 2, '2026-07-02 08:38:50.75855+00', '2026-07-02 08:39:00.413995+00', NULL, true, true, 'import', '按约定时间到客户现场，与学校项目负责人深入沟通：1.学校当前急需解决的问题；2.学校大致情况（师生人数、班级数量）；3.获取各科室联系人方式。做好《初步沟通纪要》。', '到校与项目负责人沟通，了解学校现状', '约定的到现场时间', '《初步沟通纪要》、《潜在需求确认表》、《风险项检查表》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_qqgdyxxsj (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('202b3bb9-53f2-4562-997e-069df8eb4e15', NULL, 3, '2026-07-02 08:38:50.760287+00', '2026-07-02 08:39:01.45154+00', NULL, true, true, 'import', '使用《教职工信息收集模板》制作收集表，发校方填写。必须包含：姓名、性别、民族、身份证号、手机号、政治面貌、主部门、岗位。', '制作并发放教职工信息收集表', '《教职工信息收集模板》', '《教职工信息收集表》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_qqgdyxxsj (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('95a1c305-0ba7-4fc7-a59b-0dbe80e07374', NULL, 4, '2026-07-02 08:38:50.762508+00', '2026-07-02 08:39:02.554264+00', NULL, true, true, 'import', '使用《学生信息收集模板》制作收集表，发校方填写。必须包含：班级、学号（选填）、姓名、性别、民族、身份证号、是否走读、家长手机号、家长姓名。', '制作并发放学生信息收集表', '《学生信息收集模板》', '《学生信息收集表》（含家长信息）', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_qqgdyxxsj (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('31f2ef36-bd10-4aaf-8f92-bfa53d26f604', NULL, 5, '2026-07-02 08:38:50.765134+00', '2026-07-02 08:39:03.385163+00', NULL, true, true, 'import', '向学校提供《学校组织架构信息模板》，获取完整的部门组织架构、岗位设置、人员编制等信息。', '收集学校组织架构信息', '《学校组织架构收集模板》', '《学校组织架构信息表》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_qqgdyxxsj (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('885e207d-22db-4c87-8912-25bea1f40748', NULL, 6, '2026-07-02 08:38:50.767004+00', '2026-07-02 08:39:04.245876+00', NULL, true, true, 'import', '与学校沟通获取完整的作息时间安排，包括上课/下课/午休/晚自习等各时段，为系统时间策略配置提供依据。', '收集学校作息时间信息', '《作息时间收集模板》', '《作息时间表》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_qqgdyxxsj (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('30202e52-491d-4c76-998c-f5ea7ab59ee2', NULL, 7, '2026-07-02 08:38:50.773004+00', '2026-07-02 08:39:05.256476+00', NULL, true, true, 'import', '根据内部工前会确定的用户关注模块，制作对应的业务数据收集表格（如排课数据表、成绩录入表、考勤规则表等），发校方相关业务科室填写。', '制作各业务模块数据收集表格', '《XX项目初步实施计划》、《内部工前会待讨论事项列表》', '各业务模块数据收集表格', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');


--
-- Data for Name: std_definition_qxdjb; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_rbhz; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_shfwyxmsw; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_shfwyxmsw (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('8de549a3-1eac-412a-8ee9-5b7d94e127ca', NULL, 2, '2026-07-02 08:58:44.883792+00', NULL, NULL, true, false, 'import', '建立售后运维支持服务流程：服务响应机制（7x24小时电话/远程/现场）、问题分级与处理SLA（紧急/重要/一般）、定期巡检计划、服务报告模板。通知校方对口联系人。', '建立售后支持服务流程', '项目合同售后条款、公司售后服务体系', '《售后服务方案》、《校方服务对接通知》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_shfwyxmsw (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('0a168786-178b-49c0-995e-b61d546f1f64', NULL, 1, '2026-07-02 08:58:44.880496+00', '2026-07-02 08:58:54.145163+00', NULL, true, false, 'import', '建立售后运维支持服务流程：服务响应机制（7x24小时电话/远程/现场）、问题分级与处理SLA（紧急/重要/一般）、定期巡检计划、服务报告模板。通知校方对口联系人。', '建立售后支持服务流程', '项目合同售后条款、公司售后服务体系', '《售后服务方案》、《校方服务对接通知》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');


--
-- Data for Name: std_definition_sslxyxmcbpg; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_sslxyxmcbpg (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('30b5f238-2169-40d1-bd29-f6acae40eb98', NULL, 1, '2026-07-02 02:58:09.123982+00', '2026-07-02 02:58:32.358658+00', NULL, true, true, 'import', '实施交付高层管理者起草并发布项目经理任命书，明确项目实施交付验收等相关要求。按《自研项目实施奖惩制度（试行）》发布。', '任命项目经理', '自研项目实施交付启动通知邮件', '《项目经理任命书》', '实施交付高层管理', '', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_sslxyxmcbpg (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('b6ec41ec-5143-4d5d-ad12-df1c68d80472', NULL, 2, '2026-07-02 02:58:09.126363+00', '2026-07-02 02:58:33.144095+00', NULL, true, true, 'import', '项目经理仔细阅读合同、清单及前期信息，重点关注付款金额与条件、购买模块范围、定制开发及特殊需求、合同签署状态。同步向销售、售前了解项目背景、用户关注点和工期要求，修订《项目实施交付初步评估表》。', '研读合同与清单，完成项目初步评估', '项目合同、清单、《项目实施交付启动前期信息表》', '《项目实施交付初步评估表》、《风险项问题表》', '项目经理&实施工程师', '', NULL, NULL, NULL, NULL, '待执行', '');


--
-- Data for Name: std_definition_ssqdhyxqqr; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_ssqdhyxqqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('92ae505d-80ac-4248-ae44-3d978d992071', NULL, 1, '2026-07-02 08:46:08.926005+00', '2026-07-02 08:46:10.832789+00', NULL, true, true, 'import', '在客户启动会上核对项目合同原件，对照合同附件《交付清单》逐项确认交付范围，校方签字确认《项目基本信息表》。', '核对项目合同原件与交付清单', '项目合同（含交付清单）', '校方签字确认的合同范围确认记录', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_ssqdhyxqqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('c8e1ccf6-e931-41dc-a7f4-cf2404d35b24', NULL, 2, '2026-07-02 08:46:08.928584+00', '2026-07-02 08:46:11.818881+00', NULL, true, true, 'import', '明确校方项目校级负责人与各部门对接人姓名、岗位、联系方式，现场组建项目沟通群，确保所有对接人员及项目经理全员入群。', '明确校方项目组织与对接人', '校方人员信息', '校方对接人确认表、现场组建的项目沟通群', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_ssqdhyxqqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('7bba0e5f-ff3d-42ef-9a50-b2a3d9b9a27c', NULL, 3, '2026-07-02 08:46:08.929926+00', '2026-07-02 08:46:12.809434+00', NULL, true, true, 'import', '明确进场实施、系统上线、项目整体验收三大核心日期，精确到具体日期，标注是否避开学校教学关键期。', '明确三大工期节点', '学校教学安排表', '校方确认的工期节点计划', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_ssqdhyxqqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('7993b599-f018-4169-b329-094a448a4a02', NULL, 4, '2026-07-02 08:46:08.931223+00', '2026-07-02 08:46:14.188383+00', NULL, true, true, 'import', '逐一核对智慧校园各功能模块，现场演示核心功能，明确标注''合同内必做/合同外不做/二期拓展''边界。对校方关注的亮点功能重点标注。', '逐一核对各功能模块并演示核心功能', '智慧校园功能清单', '校方确认的功能模块核对表（含边界标注）', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_ssqdhyxqqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('a89d4685-5225-4fd2-9f0e-0e73b44278ac', NULL, 5, '2026-07-02 08:46:08.93254+00', '2026-07-02 08:46:14.995412+00', NULL, true, true, 'import', '同步现场踏勘、方案对接、硬件备货等前期已完成工作，确保校方了解项目进展。', '同步前期已完成工作', '踏勘记录、方案文档', '已同步确认的项目进展记录', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_ssqdhyxqqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('d4989774-dc86-4463-a394-0d357c5fa0f1', NULL, 6, '2026-07-02 08:46:08.933821+00', '2026-07-02 08:46:16.395543+00', NULL, true, true, 'import', '结合学校实际教学管理与办公操作习惯，梳理确定智慧校园核心业务流程（排课-选课-成绩-评价、请假-审批-统计等），输出校方确认的业务流程图。', '确定科室核心业务流程', '业务流程初稿、智慧校园功能清单、校方工作手册', '校方确认的《智慧校园核心业务流程图》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_ssqdhyxqqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('6e469eca-9f38-484b-a9e4-4c945cea788b', NULL, 7, '2026-07-02 08:46:08.935165+00', '2026-07-02 08:46:19.384163+00', NULL, true, true, 'import', '提炼校方核心业务诉求，明确校级领导关注的核心统计指标（全校出勤率、教学进度等）和亮点功能需求（数据大屏展示），标注优先级（高/中/低）。', '明确校级领导关注的核心指标与亮点功能', '业务流程初稿、智慧校园功能清单、校方管理需求', '《校方核心关注指标与亮点功能清单》（含优先级）', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_ssqdhyxqqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('eb2ec337-6ba8-4f34-827b-96d231eef5fc', NULL, 8, '2026-07-02 08:46:08.937528+00', '2026-07-02 08:46:24.848303+00', NULL, true, true, 'import', '将所有需求按''合同内必做/合同外不做/二期拓展''三类书面记录，明确每个模块的''做什么/不做什么''边界，提交校方决策人审核签字确认。', '书面确认需求边界（校方签字）', '业务流程初稿、智慧校园功能清单、合同交付清单', '校方签字确认的《需求边界确认表》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_ssqdhyxqqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('393462df-6e84-4672-b15d-2a2f339f5dac', NULL, 9, '2026-07-02 08:46:08.938798+00', '2026-07-02 08:46:26.167612+00', NULL, true, true, 'import', '详细记录校方提出的定制开发需求（如教师绩效考核模块）和第三方系统对接需求（如教务系统、一卡通），每项标注是否需要产品/开发参与评估。', '记录特殊需求（定制开发与第三方对接）', '定制需求描述、第三方系统信息', '《特殊需求记录表》（含定制开发清单+第三方对接清单）', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_ssqdhyxqqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('50a4af94-33fd-45b2-9546-0b1da99cae82', NULL, 10, '2026-07-02 08:46:08.940101+00', '2026-07-02 08:46:26.880291+00', NULL, true, true, 'import', '现场向校方讲解需求变更正式流程：校方提书面申请-我方评估成本/时间/影响-双方签字确认-执行变更。强调不得口头承诺变更。', '讲解项目需求变更正式流程', '公司《需求变更管理规范》', '校方确认知悉的变更流程说明', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');


--
-- Data for Name: std_definition_swqr; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_swqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('f2149ead-e1ba-4230-bc21-013e3faf2c5a', NULL, 1, '2026-07-02 08:57:49.774082+00', NULL, NULL, true, false, 'import', '明确尾款支付条件（验收签字后X天内支付）和质保服务条款：质保期（验收后X年）、质保范围（软件故障修复，不含硬件/第三方对接问题）、质保标准（7x24小时响应）。', '确认尾款支付与质保服务', '合同验收条款、质保条款', '《尾款与质保确认函》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_swqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('431b16d1-3496-4c83-961e-bf4d602d4acd', NULL, 2, '2026-07-02 08:57:49.776633+00', NULL, NULL, true, false, 'import', '全面梳理项目实施全流程风险点，按''硬件/软件/网络/数据/校方配合''分类，输出《风险防控清单》和《应急预案》文档。', '梳理项目风险点与应急预案', '项目全过程文档、同类项目风险案例', '《项目风险防控清单》、《应急预案》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');


--
-- Data for Name: std_definition_wbs; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_wentigenzongbiao; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_wlyymjxcxzb; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_wlyymjxcxzb (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('29c98eb5-03c2-4054-8d55-8a409ffa48a7', NULL, 1, '2026-07-02 08:44:07.177247+00', '2026-07-02 08:44:09.133107+00', NULL, true, true, 'import', '确认服务器部署位置（云服务器/本地机房），确定系统访问方式（域名访问/互联网IP/内网访问），输出部署方案。', '确认服务器部署方式与系统访问方式', '项目合同、学校网络拓扑图', '《服务器部署与访问方案》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_wlyymjxcxzb (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('112b4aa5-1d74-401e-8376-0091c42bd8bd', NULL, 2, '2026-07-02 08:44:07.179778+00', '2026-07-02 08:44:09.854+00', NULL, true, true, 'import', '域名注册所有人需与客户单位名称一致，优先使用.cn或教育部分配的.edu.cn域名，完成域名注册。', '域名注册', '客户单位营业执照/事业单位法人证书', '域名注册证书', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_wlyymjxcxzb (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('65986722-bce3-4064-8336-7ceafcf47f60', NULL, 3, '2026-07-02 08:44:07.181235+00', '2026-07-02 08:44:10.613822+00', NULL, true, true, 'import', '向工信部提交网站和小程序ICP备案申请，跟进备案审核直至通过。', 'ICP备案（网站+小程序）', '营业执照、域名证书、服务器信息', 'ICP备案号', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_wlyymjxcxzb (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('50d52460-c26b-462c-bc41-eda723d67fc8', NULL, 4, '2026-07-02 08:44:07.182564+00', '2026-07-02 08:44:11.335152+00', NULL, true, true, 'import', '本地部署：备案完成后向运营商申请开通80/443端口。云服务器：配置安全组策略，开放必要端口。', '申请开通80/443端口', 'ICP备案号、服务器IP信息', '端口开通确认记录', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_wlyymjxcxzb (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('a592f5d8-10ac-4cf9-af00-899761146cff', NULL, 5, '2026-07-02 08:44:07.183994+00', '2026-07-02 08:44:13.069706+00', NULL, true, true, 'import', '根据项目所在地政策要求，向单位所在地编办提交申请，获取企事业单位网站编号。具体申请资料和流程以当地编办要求为准。', '办理企事业单位网站编号（按需）', '单位资质证明文件', '企事业单位网站编号', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_wlyymjxcxzb (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('ac75db56-99cf-4422-8313-15814063f2a7', NULL, 6, '2026-07-02 08:44:07.185828+00', '2026-07-02 08:44:13.674712+00', NULL, true, true, 'import', '域名访问时根据项目所在地要求，在公安备案平台(beian.mps.gov.cn)完成网站公安备案。非域名访问场景可跳过。', '办理公安网备（按需）', 'ICP备案号、网站信息', '公安网备号', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');


--
-- Data for Name: std_definition_xckcyhjqr; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_xckcyhjqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('f273d466-6688-49e7-ad65-a2d2bb10ccf2', NULL, 1, '2026-07-02 08:40:38.659608+00', '2026-07-02 08:40:41.082585+00', NULL, true, true, 'import', '到学校各业务科室（教务、德育、后勤、宿管等）现场调研，使用《XX系统调研表》记录当前业务现状、存在的问题和痛点、对新系统的期望和需求。', '到各业务科室现场调研', '《初步沟通纪要》、《风险项检查表》、《合同清单》、《XX系统调研表》', '《科室问题汇总表》、《科室业务流程图初版》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_xckcyhjqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('e3b6f9c2-19e4-416e-ba0c-e61313acfcb3', NULL, 2, '2026-07-02 08:40:38.66314+00', '2026-07-02 08:40:41.975585+00', NULL, true, true, 'import', '现场核查学校机房环境：空间、电源、接地、散热条件。使用《机房环境核查表》逐项记录，不合格项现场标注，输出整改项书面记录。', '勘察机房环境（空间/电源/接地/散热）', '《机房环境核查表》、校方机房管理规定', '机房环境核查记录、环境整改项', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_xckcyhjqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('bc855c93-da0b-4dba-b6d6-427529d84b43', NULL, 3, '2026-07-02 08:40:38.666371+00', '2026-07-02 08:40:43.149276+00', NULL, true, true, 'import', '核查学校内网/外网带宽、IP地址分配、网关配置、端口开放情况、跨网段覆盖、外网访问权限。校方网络管理员需现场配合确认。', '核对网络条件（带宽/端口/IP/跨网段）', '学校网络拓扑图、网络配置信息', '网络条件核查记录', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_xckcyhjqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('a6b95202-67d0-4437-b915-094065a275f4', NULL, 4, '2026-07-02 08:40:38.669055+00', '2026-07-02 08:40:44.088421+00', NULL, true, true, 'import', '核查服务器型号/数量、终端设备兼容性、读卡器/闸机型号、交换机端口数量、校园网络布线完成情况。与合同附件《硬件采购清单》逐项核对，确认到货时间与实施计划匹配。', '确认硬件资源现状', '合同附件《硬件采购清单》、硬件设备安装手册', '硬件资源核查记录、到货确认清单', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_xckcyhjqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('2e94a2f2-21ae-4291-9b94-755c3c1d6008', NULL, 5, '2026-07-02 08:40:38.671566+00', '2026-07-02 08:40:44.894625+00', NULL, true, true, 'import', '确认操作系统版本、数据库类型及版本、中间件版本、授权状态等。校方提供的确保实施时可直接使用，我方提供的提前进行兼容性测试。', '确认软件资源需求', '智慧校园系统软件环境要求文档', '软件资源确认清单', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_xckcyhjqr (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('adf05bca-f4f9-461c-abbe-0b2849993a7b', NULL, 6, '2026-07-02 08:40:38.673204+00', '2026-07-02 08:40:47.110049+00', NULL, true, true, 'import', '确认校方按合同约定提供的项目实施辅助资源：办公场地、工具设备、配合人员等。现场出示合同约定，避免校方变相拒绝。', '核对校方辅助资源提供情况', '合同辅助资源约定条款', '校方辅助资源确认表', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');


--
-- Data for Name: std_definition_xmsszjh; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_xqbjqrs; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_xtbsycsh; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_xtbsycsh (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('6de5045f-f689-4bf2-aba6-9612885ea3f2', NULL, 1, '2026-07-02 08:49:48.570761+00', '2026-07-02 08:49:50.267095+00', NULL, true, true, 'import', '在内部系统填写项目基础信息（项目名称、客户单位、合同编号等），确保服务器信息填写准确，完成项目登记。', '内部版本管理与项目信息登记', '项目合同、客户信息', '项目登记确认', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_xtbsycsh (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('5d547723-ad7a-419c-aea4-62901d8424d0', NULL, 2, '2026-07-02 08:49:48.574058+00', '2026-07-02 08:49:51.148834+00', NULL, true, true, 'import', '选择最新稳定版本，在目标服务器上完成智慧校园系统的安装部署。部署后完成基础功能验证。', '部署智慧校园应用系统', '智慧校园部署包、服务器环境信息', '已部署并验证的可运行系统', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_xtbsycsh (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('231e0064-03c2-4c63-a6c5-0b9bd9311202', NULL, 3, '2026-07-02 08:49:48.576417+00', '2026-07-02 08:49:51.882082+00', NULL, true, true, 'import', '根据项目实际情况提交授权申请：项目信息、用户ID、部署模式（单租户/多租户）、部署方式（校端/局校一体）、级别（学校/区县教育局/市州教育局）。', '申请系统授权', '项目基础信息、部署方案', '系统授权文件', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_xtbsycsh (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('7a342c9e-2b9f-4451-921c-bd5f00500ce2', NULL, 4, '2026-07-02 08:49:48.599701+00', '2026-07-02 08:49:52.918972+00', NULL, true, true, 'import', '登录0租户管理后台，进入SAAS管理-安全设置，完成系统安全策略初始化配置（密码策略、登录限制、IP白名单等）。', '初始化安全设置', '系统管理员账号', '安全策略配置完成确认', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_xtbsycsh (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('973ee6c5-7a0f-49ff-aaeb-d475059c1f03', NULL, 5, '2026-07-02 08:49:48.602609+00', '2026-07-02 08:49:53.926931+00', NULL, true, true, 'import', '导入学校机构、部门、教职工、学生等基础数据。涉及个人敏感信息的文件跨互联网传输必须加密，密码单独发送通知。', '导入用户机构账号数据', '加密后的用户数据文件', '已导入的系统用户与机构数据', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');


--
-- Data for Name: std_definition_xxtbytdzj; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_xxtbytdzj (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('2939e583-c75f-4b7a-a801-8b67589db3ad', NULL, 1, '2026-07-02 03:01:38.551484+00', '2026-07-02 03:01:41.855084+00', NULL, true, true, 'import', '商务代表按标准建立项目沟通群（QQ/微信），拉入销售、售前、PM、实施工程师等。同步将合同和清单发至群内；销售代表填写《项目实施交付启动前期信息表》销售信息、售前代表填写售前信息。', '建立项目沟通群并同步前期信息', '项目群、《项目实施交付启动前期信息表》', '规范命名的项目沟通群、《项目实施交付启动前期信息表》、合同及清单', '商务代表、销售代表、售前代表', '商务代表、销售代表、售前代表', NULL, NULL, NULL, NULL, '', '');
INSERT INTO design_public.std_definition_xxtbytdzj (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('c167bcab-52e8-4705-95ac-95e270a38a30', NULL, 2, '2026-07-02 03:01:38.554833+00', '2026-07-02 03:01:43.00973+00', NULL, true, true, 'import', '根据项目前期信息和规模评估，确定内部项目团队成员（项目经理、实施工程师、开发人员、采购等），明确各角色职责与分工界面，输出《项目组织架构与分工表》。', '确定内部项目团队及分工', '《项目实施交付启动前期信息表》、《项目实施交付初步评估表》', '项目内部团队名单、《项目组织架构与分工表》', '项目经理', '项目经理', NULL, NULL, NULL, NULL, '', '');


--
-- Data for Name: std_definition_yhpxysyx; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_yhpxysyx (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('dc96b87d-b002-4aa7-a41b-1a07a3c3c912', NULL, 1, '2026-07-02 08:53:33.801337+00', '2026-07-02 08:53:36.951183+00', NULL, true, true, 'import', '培训系统管理员掌握系统配置、权限管理、数据维护等管理端功能。收集培训签到表和反馈意见。', '开展管理员培训', '《培训方案》、《培训课件》、《操作手册》', '管理员培训签到表、反馈记录', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_yhpxysyx (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('ddfda64b-71fa-4b84-8d62-a7b862385cb7', NULL, 2, '2026-07-02 08:53:33.804569+00', '2026-07-02 08:53:37.76237+00', NULL, true, true, 'import', '培训教师掌握日常教学功能操作（备课/成绩录入/考勤/家校互通等）。收集培训签到表和反馈意见。', '开展教师/使用者培训', '《培训方案》、《培训课件》、《操作手册》', '教师培训签到表、反馈记录', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_yhpxysyx (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('a5719a2d-ed42-4641-b22a-816ee05a4199', NULL, 3, '2026-07-02 08:53:33.807051+00', '2026-07-02 08:53:39.59184+00', NULL, true, true, 'import', '系统投入试运行（建议2-4周），密切关注运行状态，收集各角色使用者的反馈意见和遇到的问题，建立问题跟踪台账。', '系统试运行', '已部署系统', '《试运行问题跟踪台账》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_yhpxysyx (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('43b48347-50ba-42fa-9cc3-dc6d15f1bf4c', NULL, 4, '2026-07-02 08:53:33.809412+00', '2026-07-02 08:53:40.906183+00', NULL, true, true, 'import', '根据试运行反馈，对系统进行问题修复和优化调整。对校方建议区分''立即整改/排期优化/二期考虑''三类处理，整改完成后通知校方验证。', '问题整改与系统优化', '《试运行问题跟踪台账》', '整改完成确认记录、优化后的系统', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_yhpxysyx (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('6ceff1ce-1088-4041-99aa-d51f0e1ea4fb', NULL, 5, '2026-07-02 08:53:33.8108+00', '2026-07-02 08:53:41.638358+00', NULL, true, true, 'import', '根据合同附件参数清单，逐条核对系统功能，确保每条参数都能正常演示和运行。记录核对结果，异常项标注处理状态。', '按合同参数逐条核对验证', '合同附件参数清单', '《参数核对记录表》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');


--
-- Data for Name: std_definition_yszb; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_yszb (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('30cfeec7-fa60-4a76-a247-fef99f179d72', NULL, 2, '2026-07-02 08:54:44.383537+00', '2026-07-02 08:54:47.315796+00', NULL, true, true, 'import', '按合同约定和项目实际产出，整理全流程交付物清单：文档类（实施计划/对接方案/操作手册/培训材料）、系统类（已部署系统）、硬件类（按采购清单）、其他（源码/部署包）。逐项标注交付形式和时间。', '整理全流程交付物清单', '项目合同、交付清单、各阶段实施方案', '逐项标注的《项目交付物清单》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_yszb (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('50c174b8-0207-4f25-9121-6055b383b91b', NULL, 1, '2026-07-02 08:54:44.373118+00', '2026-07-02 08:54:49.016195+00', NULL, true, true, 'import', '明确项目整体验收标准，按''合同参数指标''和''其他约定条件''分类列明。验收标准需量化可验证，提交校方决策人确认。', '确认验收标准', '项目合同、交付清单、校方核心诉求', '校方确认的《智慧校园项目验收标准》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');


--
-- Data for Name: std_definition_yszx; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_yszx (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('158e9fff-646e-43f6-b2da-1f44bcc27396', NULL, 1, '2026-07-02 08:56:14.70895+00', NULL, NULL, true, false, 'import', '按约定流程组织验收：1.提交《验收申请》；2.现场验收会逐项演示系统功能；3.校方测试验证；4.记录验收问题并限期整改；5.问题整改完成后提交复验。', '组织项目正式验收', '《验收标准》、《交付物清单》、系统运行环境', '验收问题记录、整改完成确认', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_yszx (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('8c15d7b3-76f2-47ef-9118-46a53bc30779', NULL, 2, '2026-07-02 08:56:14.710949+00', NULL, NULL, true, false, 'import', '验收全部通过后，双方正式签署《项目验收报告》，完成项目资料归档（合同/实施文档/验收文件/培训记录），按公司文档管理规定执行。', '签署验收报告并归档', '《验收报告》、全套项目文档', '签署完成的《验收报告》、项目归档确认', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');


--
-- Data for Name: std_definition_zbhz; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--



--
-- Data for Name: std_definition_zdssjh; Type: TABLE DATA; Schema: design_public; Owner: projmgmt
--

INSERT INTO design_public.std_definition_zdssjh (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('b8d81c25-5447-40ee-8bbd-43f7f1129ea9', NULL, 1, '2026-07-02 08:29:52.476415+00', '2026-07-02 08:30:08.754022+00', NULL, true, true, 'import', '使用《自研项目初步实施计划（模板）》编制初步计划。必须包含：项目概述、组织与职责、实施计划、实施流程、沟通与风险管理、质量保障、验收标准、售后支持。计划应围绕验收设置关键里程碑。', '制作《项目初步实施计划》', '项目合同、清单、《项目实施交付初步评估表》', '《XX项目初步实施计划》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_zdssjh (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('aff1e6d7-efd4-472e-9263-77bb522c89a9', NULL, 2, '2026-07-02 08:29:52.479503+00', '2026-07-02 08:30:09.902574+00', NULL, true, true, 'import', '使用模板整理内部工前会需讨论的关键事项：关键时间节点、已识别风险项、待确认问题等。', '整理《内部工前会待讨论事项列表》', '项目合同、清单、《项目实施交付初步评估表》', '《XX项目内部工前会待讨论事项列表》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_zdssjh (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('4645f9a7-918a-4bc8-ab47-79af4d8e1056', NULL, 3, '2026-07-02 08:29:52.481976+00', '2026-07-02 08:30:12.461406+00', NULL, true, true, 'import', '划分整体实施阶段（调研-部署-配置-对接-培训-试运行-验收），标注各阶段依赖关系。明确各里程碑节点（名称/日期/责任人/交付物），生成《里程碑跟踪表》和甘特图。预留风险工期，避开学校考试周、寒暑假。', '划分项目实施阶段与里程碑节点', '《实施计划初稿》、校方特殊时间清单', '《项目实施计划（含甘特图）》、《里程碑跟踪表》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');
INSERT INTO design_public.std_definition_zdssjh (id, project_id, sort_order, created_at, updated_at, created_by, allow_delete, _readonly, data_source, "任务概述", "步骤说明", "步骤输入", "步骤输出", "步骤输出附件", "执行角色", "计划开始", "计划结束", "实际开始", "实际结束", "状态", "备注") VALUES ('7f6a8676-278b-474c-a470-cdc705ea7234', NULL, 4, '2026-07-02 08:29:52.483451+00', '2026-07-02 08:30:14.694978+00', NULL, true, true, 'import', '列出进场实施前必须满足的前置条件，所有条件量化标准（如带宽>=100M、服务器内存>=64G、端口80/443已开放），形成《进场条件确认清单》。', '列出进场前置条件清单', '《服务器配置要求表》', '《进场条件确认清单》', '', '项目经理', NULL, NULL, NULL, NULL, '待执行', '');


--
-- PostgreSQL database dump complete
--

\unrestrict 38Btf4YSQQrvMYJPO2B9V6RQgXw5RCUc458QaFe70AW025BgSczXZ9HgdXg1QZR

