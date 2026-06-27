"use client";

import React, { useState, useEffect } from "react";

/* ==========================================================================
   Data — exact mirrors of template panelData / subContentData / taskData
   ========================================================================== */

/* ── Panel Data (left strip + nav drawer) ── */
const panelData: Record<string, {
  title: string;
  items: Array<{ label: string; count?: number; key?: string; link?: string; active?: boolean }>;
}> = {
  scope: { title: "SCOPE 范围管理", items: [
    { label: "需求边界确认", count: 12, active: true }, { label: "需求登记表", count: 8, key: "req-form" },
    { label: "变更申请表", count: 5, key: "change-form" }, { label: "变更影响评估", count: 3, key: "change-impact" },
    { label: "范围确认书", count: 3, key: "scope-confirm" }, { label: "WBS工作分解", count: 1, key: "wbs" },
  ]},
  demand: { title: "DEMAND 需求管理", items: [
    { label: "需求池", count: 24, key: "req-pool" }, { label: "需求评审记录", count: 6, active: true, key: "req-review" },
    { label: "需求跟踪矩阵", count: 18, key: "req-matrix" }, { label: "需求变更记录", count: 7, key: "req-change" },
    { label: "用户故事地图", count: 3, key: "user-story" }, { label: "原型设计稿", count: 12, key: "prototype" },
  ]},
  progress: { title: "PROGRESS 进度管理", items: [
    { label: "项目主计划", count: 1, link: "进度-主计划.html" }, { label: "里程碑管理", count: 7, active: true, key: "milestone" },
    { label: "甘特图", count: 1, link: "进度-甘特图.html" }, { label: "周报汇总", count: 16, link: "进度-周报.html" },
    { label: "日报汇总", count: 89, key: "daily" }, { label: "延期预警", count: 2, key: "delay" },
  ]},
  quality: { title: "QUALITY 质量管理", items: [
    { label: "测试计划", count: 3, key: "test-plan" }, { label: "缺陷跟踪", count: 47, active: true, key: "bug-track" },
    { label: "测试用例", count: 156, key: "test-case" }, { label: "测试报告", count: 5, key: "test-report" },
    { label: "代码审查记录", count: 23, key: "code-review" }, { label: "验收标准", count: 2, key: "accept-criteria" },
  ]},
  cost: { title: "COST 成本管理", items: [
    { label: "项目预算表", count: 1, key: "budget" }, { label: "费用报销记录", count: 28, active: true, key: "expense" },
    { label: "采购清单", count: 12, key: "purchase" }, { label: "工时统计", count: 4, key: "manhour" }, { label: "合同付款节点", count: 5, key: "contract-pay" },
  ]},
  communication: { title: "COMMUNICATION 沟通管理", items: [
    { label: "会议纪要", count: 22, active: true, key: "meeting" }, { label: "干系人通讯录", count: 8, key: "contacts" },
    { label: "通知公告", count: 5, key: "notice" }, { label: "周例会记录", count: 16, key: "weekly" },
    { label: "客户沟通记录", count: 14, key: "client-comm" }, { label: "内部评审记录", count: 9, key: "internal-review" },
  ]},
  risk: { title: "RISK 风险管理", items: [
    { label: "风险登记册", count: 9, active: true, key: "risk-register" }, { label: "问题跟踪表", count: 14, key: "issue-track" },
    { label: "应急预案", count: 3, key: "emergency" }, { label: "风险应对措施", count: 6, key: "risk-action" }, { label: "依赖关系矩阵", count: 2, key: "dep-matrix" },
  ]},
  docs: { title: "DOCS 文档管理", items: [
    { label: "技术方案", count: 6, key: "tech-plan" }, { label: "部署手册", count: 3, active: true, key: "deploy-manual" },
    { label: "用户操作手册", count: 4, key: "user-manual" }, { label: "培训材料", count: 12, key: "training" },
    { label: "验收交付文档", count: 15, key: "accept-doc" }, { label: "运维交接文档", count: 8, key: "ops-doc" }, { label: "版本发布说明", count: 6, key: "release-note" },
  ]},
};

/* ── Phase Stepper Labels ── */
const phaseLabels = ["内部启动会", "需求调研与方案确认", "环境部署与平台搭建", "核心系统开发与集成", "用户培训与试运行", "正式上线与全面切换", "项目验收与交付"];
const phaseDates = ["02.20–02.28", "03.01–03.20", "03.21–04.15", "04.16–05.31", "06.01–07.15", "07.16–08.15", "08.16–09.30"];
const phaseDescriptions = [
  "召开公司内部项目启动会，明确项目目标与范围，组建项目团队，制定项目管理制度与沟通机制，完成项目立项审批。",
  "完成学校现状调研、需求分析、技术方案编制与评审，输出需求规格说明书与项目实施方案，与校方确认建设范围与技术路线。共投入产品经理2人、架构师1人，现场驻场调研12天。",
  "完成服务器采购上架、网络环境配置、基础平台（统一认证、数据中台）部署，打通与教育局现有系统的接口。共部署12台服务器，完成8个接口对接。",
  "开发学籍管理、教务排课、成绩管理、选课系统四大核心模块，完成与统一认证和数据中台的集成联调，首轮内部测试通过。修复缺陷47个，交付可部署模块4个。",
  "组织学校管理员、教师、学生及家长的分批培训，系统进入试运行阶段，收集反馈意见，持续优化功能和用户体验。当前已完成4/6场培训，收集反馈32条，推进优化项18个。",
  "完成系统正式环境部署，组织全面切换上线，旧系统并行运行1个月后正式下线，系统进入常态化运行阶段。",
  "整理交付文档，组织项目验收评审，完成系统最终交付，签署验收报告，进入运维保障期。预计需整理验收文档15份，组织评审会2场。",
];
const phaseStatuses = ["done", "done", "done", "done", "active", "pending", "pending"];
const phaseProgressPct = [100, 100, 100, 100, 71, 0, 0];
const phaseStepsDone = [8, 8, 5, 5, 5, 0, 0];
const phaseStepsTotal = [8, 8, 5, 5, 7, 3, 5];

/* ── Phase Meta ── */
const phaseMeta = [
  { items: [{ v: "3", l: "交付物" }, { v: "9", l: "天" }, { v: "8", l: "人参与" }, { v: "按时", l: "", accent: true, color: "var(--green)" }] },
  { items: [{ v: "3", l: "交付物" }, { v: "20", l: "天" }, { v: "5", l: "人参与" }, { v: "按时", l: "", accent: true, color: "var(--green)" }] },
  { items: [{ v: "12", l: "服务器" }, { v: "8", l: "接口对接" }, { v: "26", l: "天" }, { v: "按时", l: "", accent: true, color: "var(--green)" }] },
  { items: [{ v: "4", l: "交付模块" }, { v: "47", l: "缺陷修复" }, { v: "46", l: "天" }, { v: "按时", l: "", accent: true, color: "var(--green)" }] },
  { items: [{ v: "4/6", l: "培训场次", accent: true }, { v: "32", l: "反馈" }, { v: "18", l: "优化项" }, { v: "进行中", l: "", accent: true }] },
  { items: [{ v: "3", l: "上线步骤" }, { v: "07.16", l: "预计启动" }] },
  { items: [{ v: "15", l: "验收文档" }, { v: "08.16", l: "预计启动" }, { v: "待开始", l: "", muted: true }] },
];

/* ── Products ── */
const products = [
  { name: "在线辅导系统", count: 2, status: "used" }, { name: "在线考试系统", count: 2, status: "used" }, { name: "赛事管理系统", count: 2 }, { name: "培训管理系统", count: 2, status: "used" },
  { name: "基础教务系统", count: 2, status: "used" }, { name: "成绩管理系统", count: 2, status: "used" }, { name: "同步课堂系统", count: 2, status: "partial" }, { name: "网络教研系统", count: 2 },
  { name: "名师工作室", count: 2 }, { name: "科研项目管理系统", count: 2 }, { name: "教材管理系统", count: 1, status: "used" }, { name: "考务管理系统", count: 2, status: "used" },
  { name: "在线学习系统", count: 2, status: "used" }, { name: "智慧教育课堂教学分析系统", count: 1, status: "partial" }, { name: "集体备课系统", count: 1 }, { name: "知识库系统", count: 1 },
  { name: "课表管理中心系统", count: 2, status: "used" }, { name: "在线巡课系统", count: 1, status: "partial" }, { name: "家校互通平台", count: 1, status: "used" }, { name: "智慧班牌系统", count: 2, status: "used" },
  { name: "校园一卡通系统", count: 1, status: "used" }, { name: "资产管理系统", count: 1 }, { name: "图书馆管理系统", count: 1 }, { name: "宿舍管理系统", count: 1, status: "partial" },
  { name: "选课走班系统", count: 1 }, { name: "综合素质评价系统", count: 1, status: "used" }, { name: "教师发展档案系统", count: 1 }, { name: "校园安全防控平台", count: 1, status: "used" },
];

/* ── Task Data (p0t0..p6t2) ── */
interface TaskRow { desc: string; input: string; output: string; role: string; status: string; label: string; }
const taskData: Record<string, { name: string; rows: TaskRow[] }> = {
  p0t0: { name: "项目立项", rows: [
    { desc: "编制项目立项申请报告", input: "项目意向书", output: "立项申请报告", role: "项目经理 / 张明远", status: "done", label: "DONE" },
    { desc: "提交公司内部审批流程", input: "立项申请报告", output: "立项批文", role: "项目经理 / 张明远", status: "done", label: "DONE" },
    { desc: "项目编号注册与备案", input: "立项批文", output: "项目编号 SCP-2026-0012", role: "PMO / 王丽", status: "done", label: "DONE" },
  ]},
  p0t1: { name: "组建项目团队", rows: [
    { desc: "确定项目经理与核心成员人选", input: "项目需求分析", output: "团队成员名单", role: "部门总监 / 周总", status: "done", label: "DONE" },
    { desc: "召开项目团队成立会议", input: "团队成员名单", output: "团队分工表", role: "项目经理 / 张明远", status: "done", label: "DONE" },
  ]},
  p0t2: { name: "项目管理制度建设", rows: [
    { desc: "制定项目沟通管理计划", input: "项目章程", output: "沟通计划", role: "项目经理 / 张明远", status: "done", label: "DONE" },
    { desc: "建立项目文档管理规范", input: "公司文档模板", output: "文档管理规范", role: "产品经理 / 李雨桐", status: "done", label: "DONE" },
    { desc: "制定项目风险管理预案", input: "项目计划", output: "风险管理预案", role: "项目经理 / 张明远", status: "done", label: "DONE" },
  ]},
  p1t0: { name: "现场调研", rows: [
    { desc: "走访教务处、学生处等科室", input: "访谈提纲", output: "科室访谈记录", role: "产品经理 / 陈思涵", status: "done", label: "DONE" },
    { desc: "实地查看机房、网络环境", input: "机房勘察表", output: "机房现状报告", role: "运维工程师 / 赵子涵", status: "done", label: "DONE" },
    { desc: "收集信息化现状数据", input: "数据采集模板", output: "信息化现状数据表", role: "产品经理 / 陈思涵", status: "done", label: "DONE" },
  ]},
  p1t1: { name: "需求分析", rows: [
    { desc: "整理调研数据，梳理业务痛点", input: "调研报告", output: "需求清单 v1.0", role: "产品经理 / 李雨桐", status: "done", label: "DONE" },
    { desc: "编写需求规格说明书初稿", input: "需求清单、校方确认函", output: "需求规格说明书 v1.0", role: "产品经理 / 李雨桐", status: "done", label: "DONE" },
  ]},
  p1t2: { name: "方案评审", rows: [
    { desc: "编制技术选型方案", input: "需求说明书", output: "技术选型方案", role: "架构师 / 张明远", status: "done", label: "DONE" },
    { desc: "组织技术方案评审会", input: "技术选型方案", output: "评审会议纪要", role: "架构师 / 张明远", status: "done", label: "DONE" },
    { desc: "输出技术方案终稿", input: "评审意见", output: "技术方案终稿", role: "架构师 / 张明远", status: "done", label: "DONE" },
  ]},
  p1t3: { name: "合同签订", rows: [
    { desc: "编制项目报价单", input: "技术方案终稿", output: "项目报价单", role: "项目经理 / 张明远", status: "done", label: "DONE" },
    { desc: "与校方商务谈判", input: "报价单", output: "商务条款确认书", role: "项目经理 / 张明远", status: "done", label: "DONE" },
    { desc: "签署正式合同", input: "商务条款确认书", output: "正式合同", role: "项目经理 / 张明远", status: "done", label: "DONE" },
  ]},
  p2t0: { name: "硬件上架", rows: [
    { desc: "确认服务器采购清单", input: "技术方案", output: "采购清单", role: "运维工程师 / 赵子涵", status: "done", label: "DONE" },
    { desc: "服务器到货验收与上架", input: "采购清单", output: "上架确认单", role: "运维工程师 / 赵子涵", status: "done", label: "DONE" },
    { desc: "机房布线及电源接入", input: "机房平面图", output: "布线竣工图", role: "运维工程师 / 赵子涵", status: "done", label: "DONE" },
  ]},
  p2t1: { name: "网络部署", rows: [
    { desc: "规划校园网VLAN划分", input: "网络拓扑图", output: "VLAN规划表", role: "网络工程师 / 赵子涵", status: "done", label: "DONE" },
    { desc: "配置核心交换机与防火墙", input: "VLAN规划表", output: "网络配置文档", role: "网络工程师 / 赵子涵", status: "done", label: "DONE" },
  ]},
  p2t2: { name: "平台安装", rows: [
    { desc: "部署统一认证平台", input: "部署手册", output: "认证平台部署确认", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
    { desc: "部署数据中台基础服务", input: "部署手册", output: "数据中台部署确认", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
    { desc: "基础平台集成联调", input: "部署确认报告", output: "联调测试报告", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
  ]},
  p2t3: { name: "接口联调", rows: [
    { desc: "与教育局学籍系统接口对接", input: "接口文档", output: "学籍接口联调报告", role: "开发工程师 / 张明远", status: "done", label: "DONE" },
    { desc: "与人事系统接口对接", input: "接口文档", output: "人事接口联调报告", role: "开发工程师 / 张明远", status: "done", label: "DONE" },
  ]},
  p3t0: { name: "学籍管理", rows: [
    { desc: "学生入学、转班功能开发", input: "需求说明书、UI设计稿", output: "学籍管理模块 v1.0", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
    { desc: "毕业管理功能开发", input: "需求说明书", output: "毕业管理子模块", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
    { desc: "学籍管理模块单元测试", input: "测试用例", output: "测试报告", role: "测试工程师 / 刘思远", status: "done", label: "DONE" },
  ]},
  p3t1: { name: "教务排课", rows: [
    { desc: "排课算法设计与编码", input: "排课算法文档", output: "排课引擎 v1.0", role: "开发工程师 / 陈思涵", status: "done", label: "DONE" },
    { desc: "约束条件配置界面开发", input: "教师课表需求", output: "配置管理界面", role: "开发工程师 / 陈思涵", status: "done", label: "DONE" },
  ]},
  p3t2: { name: "成绩管理", rows: [
    { desc: "成绩录入功能开发", input: "成绩管理需求、数据模型", output: "成绩录入模块", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
    { desc: "统计分析功能开发", input: "数据模型", output: "统计分析模块", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
    { desc: "成绩报告生成功能", input: "报告模板", output: "报告生成模块", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
  ]},
  p3t3: { name: "选课系统", rows: [
    { desc: "选课核心流程开发", input: "选课规则文档", output: "选课系统 v1.0", role: "开发工程师 / 赵子涵", status: "done", label: "DONE" },
    { desc: "高并发压力测试", input: "测试脚本", output: "压测报告", role: "测试工程师 / 刘思远", status: "done", label: "DONE" },
  ]},
  p4t0: { name: "管理员培训", rows: [
    { desc: "培训信息中心管理员系统后台操作", input: "管理员手册、培训PPT", output: "培训签到表", role: "培训讲师 / 陈思涵", status: "done", label: "DONE" },
    { desc: "管理员实操考核", input: "考核题库", output: "考核成绩单", role: "培训讲师 / 陈思涵", status: "done", label: "DONE" },
  ]},
  p4t1: { name: "教师培训", rows: [
    { desc: "语数外学科教师操作培训", input: "教师操作手册", output: "培训反馈表", role: "培训讲师 / 陈思涵", status: "done", label: "DONE" },
    { desc: "理综文综学科教师操作培训", input: "教师操作手册", output: "培训反馈表", role: "培训讲师 / 陈思涵", status: "done", label: "DONE" },
  ]},
  p4t2: { name: "学生家长培训", rows: [
    { desc: "录制使用指南视频", input: "使用指南脚本", output: "培训视频", role: "产品经理 / 李雨桐", status: "active", label: "ACTIVE" },
    { desc: "发布FAQ文档并组织在线答疑", input: "FAQ文档", output: "答疑记录", role: "产品经理 / 李雨桐", status: "active", label: "ACTIVE" },
  ]},
  p4t3: { name: "试运行优化", rows: [
    { desc: "收集试运行期间反馈意见", input: "反馈收集表", output: "反馈分类清单", role: "产品经理 / 李雨桐", status: "active", label: "ACTIVE" },
    { desc: "修复系统缺陷与性能优化", input: "Bug清单", output: "优化迭代版本", role: "开发团队", status: "active", label: "ACTIVE" },
    { desc: "用户体验优化调整", input: "用户反馈", output: "UX优化方案", role: "开发团队", status: "active", label: "ACTIVE" },
  ]},
  p6t0: { name: "文档整理", rows: [
    { desc: "汇总各阶段输出文档", input: "各阶段文档", output: "文档清单", role: "产品经理 / 李雨桐", status: "pending", label: "待开始" },
    { desc: "编制验收文档包(15份)", input: "文档清单", output: "验收文档包", role: "产品经理 / 李雨桐", status: "pending", label: "待开始" },
  ]},
  p6t1: { name: "验收评审", rows: [
    { desc: "准备演示环境", input: "验收文档包", output: "演示环境", role: "开发工程师 / 王梓轩", status: "pending", label: "待开始" },
    { desc: "组织验收评审会", input: "演示环境、验收文档", output: "评审意见", role: "项目经理 / 张明远", status: "pending", label: "待开始" },
    { desc: "签署验收报告", input: "评审意见", output: "验收报告", role: "项目经理 / 张明远", status: "pending", label: "待开始" },
  ]},
  p6t2: { name: "正式交付", rows: [
    { desc: "移交系统权限与运维手册", input: "验收报告、运维手册", output: "权限移交确认书", role: "项目经理 / 张明远", status: "pending", label: "待开始" },
    { desc: "签署交付确认书", input: "权限移交确认书", output: "交付确认书", role: "项目经理 / 张明远", status: "pending", label: "待开始" },
  ]},
};

/* ── Phase Task List Mapping ── */
const phaseTasks: Record<number, string[]> = {
  0: ["p0t0", "p0t1", "p0t2"],
  1: ["p1t0", "p1t1", "p1t2", "p1t3"],
  2: ["p2t0", "p2t1", "p2t2", "p2t3"],
  3: ["p3t0", "p3t1", "p3t2", "p3t3"],
  4: ["p4t0", "p4t1", "p4t2", "p4t3"],
  5: [], // phase 5 not defined in taskData
  6: ["p6t0", "p6t1", "p6t2"],
};

/* ── Sub-Content Data (44 keys, truncated representative sample — full set in template) ── */
const subContentData: Record<string, { section: string; rows: Array<{ id: string; name: string; priority: string; status: string; owner: string; date: string; desc: string }> }> = {
  // scope
  "req-boundary": { section: "SCOPE 范围管理", rows: [
    { id: "RB-001", name: "统一认证对接范围", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-02", desc: "确认仅对接市教育局LDAP，不含区县级独立认证系统" },
    { id: "RB-002", name: "教务模块边界", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-03-03", desc: "含班级/学期/课程基础管理，不含智能排课算法" },
    { id: "RB-003", name: "数据迁移范围", priority: "中", status: "评审中", owner: "王梓轩", date: "2026-03-05", desc: "仅迁移近3年历史数据，不含10年以上归档数据" },
    { id: "RB-004", name: "第三方集成边界", priority: "中", status: "已确认", owner: "张明远", date: "2026-03-06", desc: "对接省考试院、市教育局平台，不含其他区县独立系统" },
    { id: "RB-005", name: "移动端覆盖范围", priority: "低", status: "确认中", owner: "李雨桐", date: "2026-03-08", desc: "教师端+家长端先行，学生端二期上线" },
  ]},
  "req-form": { section: "SCOPE 范围管理", rows: [
    { id: "REQ-001", name: "统一身份认证", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-05", desc: "支持LDAP/OAuth2.0，对接市教育局统一认证平台" },
    { id: "REQ-002", name: "基础教务管理", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-03-06", desc: "包含班级管理、学期设置、基础数据维护等功能模块" },
    { id: "REQ-003", name: "成绩管理系统", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-03-08", desc: "支持多维度成绩录入、统计分析、成绩单导出，对接省考试院标准" },
    { id: "REQ-004", name: "在线考试系统", priority: "中", status: "评审中", owner: "张明远", date: "2026-03-10", desc: "支持题库管理、自动组卷、在线监考、成绩分析，需评估并发性能" },
    { id: "REQ-005", name: "校园一卡通", priority: "中", status: "确认中", owner: "李雨桐", date: "2026-03-12", desc: "消费、门禁、考勤一体化，需与现有硬件设备兼容" },
    { id: "REQ-006", name: "家校互通平台", priority: "低", status: "待评审", owner: "王梓轩", date: "2026-03-15", desc: "消息推送、作业通知、成绩查询、在线缴费等家长端功能" },
    { id: "REQ-007", name: "数据中台对接", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-18", desc: "统一数据标准，打通各业务系统数据孤岛，建立校级数据仓库" },
    { id: "REQ-008", name: "移动端适配", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-03-20", desc: "教师端/家长端/学生端三端适配，支持iOS和Android" },
  ]},
  // demand
  "req-pool": { section: "DEMAND 需求管理", rows: [
    { id: "RP-001", name: "AI智能排课", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-10", desc: "基于约束求解算法自动生成课表，支持多维度优化" },
    { id: "RP-002", name: "VR虚拟实验室", priority: "中", status: "评审中", owner: "李雨桐", date: "2026-03-15", desc: "化学/物理虚拟实验环境，支持沉浸式教学体验" },
    { id: "RP-003", name: "智慧食堂系统", priority: "中", status: "确认中", owner: "王梓轩", date: "2026-03-20", desc: "人脸识别取餐、营养分析、在线充值、食堂评价" },
    { id: "RP-004", name: "物联网设备管理", priority: "低", status: "待评审", owner: "张明远", date: "2026-04-01", desc: "统一管理校园IoT设备，含智能灯控、环境监测等" },
    { id: "RP-005", name: "心理辅导平台", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-04-05", desc: "在线心理咨询预约、测评量表、危机预警" },
    { id: "RP-006", name: "校友管理系统", priority: "低", status: "待评审", owner: "王梓轩", date: "2026-04-12", desc: "校友信息库、活动管理、捐赠平台" },
  ]},
  "req-review": { section: "DEMAND 需求管理", rows: [
    { id: "RR-001", name: "智能排课需求评审", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-12", desc: "评审通过，确认纳入二期范围，需评估算法性能和约束条件" },
    { id: "RR-002", name: "VR实验室需求评审", priority: "中", status: "评审中", owner: "李雨桐", date: "2026-03-18", desc: "需补充硬件选型方案和预算评估，暂定三期考虑" },
    { id: "RR-003", name: "物联网设备管理评审", priority: "低", status: "已确认", owner: "王梓轩", date: "2026-04-08", desc: "评审通过，建议先做试点再推广，优先部署智慧灯控" },
    { id: "RR-004", name: "心理辅导平台评审", priority: "中", status: "已确认", owner: "张明远", date: "2026-04-10", desc: "评审通过，确认对接市级心理健康平台标准" },
  ]},
};

const AI_REPLIES = [
  "根据当前项目数据，总体进度 71%，已完成 4 个阶段。建议重点关注「质量管理」和「风险管理」领域，其中缺陷跟踪仍有 47 项待处理。",
  "项目剩余 120 天，按当前节奏预计可如期交付。深圳市教育局和南山区教育局两客户实施进度略有差异，建议每周对齐一次。",
  "已部署 15 项产品中，核心教务系统运行稳定。智慧教育课堂教学分析系统尚在部分部署阶段，预计下月完成全量上线。",
  "最近一周新增 3 项变更申请，均在范围管理流程中。建议尽快完成变更影响评估。",
  "好的，我帮你梳理一下：目前 32 项任务中已完成 17 项，进行中 9 项，待开始 6 项。本周重点推进测试用例执行和用户培训材料准备。",
];

/* ==========================================================================
   PhaseLayout Component
   ========================================================================== */

interface PhaseLayoutProps {
  project: { id: string; project_name: string; project_code: string; project_type: string; project_stage: string; project_schema: string; status: string; created_at: string; customer_info?: { company_name?: string }; channel_info?: Array<{ company_name: string }>; procurement_modules?: string[]; description?: string };
  onBack: () => void;
}

export function PhaseLayout({ project, onBack }: PhaseLayoutProps) {
  /* ── Theme ── */
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") { document.documentElement.classList.add("dark"); setDark(true); }
  }, []);
  const toggleTheme = () => {
    const root = document.documentElement;
    const next = !root.classList.toggle("dark");
    setDark(!next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  /* ── Dock ── */
  const [dockHidden, setDockHidden] = useState(false);

  /* ── Strip / Nav ── */
  const [activePanel, setActivePanel] = useState("scope");
  const [l2Items, setL2Items] = useState(panelData.scope.items);
  const [navOpen, setNavOpen] = useState(false);
  const [navActivePanel, setNavActivePanel] = useState("scope");

  /* ── AI Dialog ── */
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ role: string; text: string }>>([{ role: "ai", text: "你好！我是项目 AI 助手。我可以帮你分析进度数据、生成报告、解答项目相关问题。" }]);

  /* ── Sub Content ── */
  const [subContent, setSubContent] = useState<{ key: string; label: string } | null>(null);

  /* ── Phase ── */
  const [activePhase, setActivePhase] = useState(4);

  /* ── Task Detail ── */
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [taskViewMode, setTaskViewMode] = useState<"v27" | "v28">("v27");
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({ desc: true, input: true, output: true, role: true, stepCount: true });
  const [stepsCollapsed, setStepsCollapsed] = useState<Record<string, boolean>>({});
  const [configOpen, setConfigOpen] = useState<string | null>(null);
  const [selectedRowIdx, setSelectedRowIdx] = useState<Record<string, number>>({});

  /* ── Helpers ── */
  const handlePanelEnter = (pk: string) => {
    setActivePanel(pk);
    if (panelData[pk]) setL2Items(panelData[pk].items);
  };

  const handleNavPanelEnter = (pk: string) => setNavActivePanel(pk);

  const handleSubClick = (key: string, label: string) => { setNavOpen(false); setSubContent({ key, label }); };

  const switchPhase = (idx: number) => { setActivePhase(idx); setSelectedTask(null); };

  const showTaskDetail = (taskId: string) => {
    if (selectedTask === taskId) { setSelectedTask(null); return; }
    setSelectedTask(taskId);
    setSelectedRowIdx(prev => { const n = { ...prev }; delete n[taskId]; return n; });
  };

  const toggleTaskView = () => setTaskViewMode(v => v === "v27" ? "v28" : "v27");

  const selectRow = (taskId: string, idx: number) => {
    setSelectedRowIdx(prev => ({ ...prev, [taskId]: idx }));
  };

  const toggleSteps = (taskId: string) => {
    setStepsCollapsed(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleConfig = (taskId: string) => {
    setConfigOpen(prev => prev === taskId ? null : taskId);
  };

  const toggleField = (field: string, taskId: string) => {
    setVisibleFields(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const exportTask = (taskId: string) => {
    const d = taskData[taskId]; if (!d) return;
    const BOM = "﻿";
    let csv = BOM + "任务名称,步骤说明,步骤输入,步骤输出,执行角色,状态\n";
    d.rows.forEach((r, i) => { csv += `"${i === 0 ? d.name : ""}","${r.desc}","${r.input}","${r.output}","${r.role}","${r.label}"\n`; });
    const blob = new Blob([csv], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${d.name}_任务明细.xls`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const showSubContent = (key: string, label: string) => setSubContent({ key, label });
  const closeSubContent = () => setSubContent(null);

  const sendAI = () => {
    if (!aiInput.trim()) return;
    const q = aiInput.trim();
    setAiMessages(prev => [...prev, { role: "user", text: q }]);
    setAiInput("");
    const r = AI_REPLIES[Math.floor(Math.random() * AI_REPLIES.length)];
    setTimeout(() => setAiMessages(prev => [...prev, { role: "ai", text: r }]), 300);
  };

  /* ── Close config on outside click ── */
  useEffect(() => {
    if (!configOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`#cfg-${configOpen}`) && !target.closest(".td-card-btn")) setConfigOpen(null);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [configOpen]);

  /* ── Render helpers ── */
  const renderDockIcon = (d: string) => {
    const icons: Record<string, string> = {
      kanban: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
      projects: '<path d="M2 7h20M2 12h20M2 17h20"/>',
      tasks: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
      issues: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      cases: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>',
      standards: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
    };
    return icons[d] || icons.standards;
  };

  const renderSubContentArea = () => {
    if (!subContent) return null;
    const d = subContentData[subContent.key];
    if (!d) {
      return (
        <div className="sub-content-area" style={{ padding: 48 }}>
          <button className="sc-back-btn" onClick={closeSubContent}>← 返回项目主页</button>
          <p style={{ marginTop: 16, color: "var(--text-muted)" }}>内容建设中: {subContent.label}</p>
        </div>
      );
    }
    const total = d.rows.length;
    const confirmed = d.rows.filter(r => r.status === "已确认").length;
    const highCount = d.rows.filter(r => r.priority === "高").length;
    return (
      <div className="sub-content-area">
        <div className="sc-hero">
          <div className="sc-hero-top">
            <button className="sc-back-btn" onClick={closeSubContent}>← 返回项目主页</button>
            <span className="sc-hero-label">{d.section}</span>
          </div>
          <h2>{subContent.label}</h2>
          <div className="sc-hero-sub">项目需求登记与跟踪管理</div>
          <div className="sc-stats">
            <div className="sc-stat-card"><span className="sc-stat-val">{total}</span><span className="sc-stat-lbl">需求总数</span></div>
            <div className="sc-stat-card"><span className="sc-stat-val green">{confirmed}</span><span className="sc-stat-lbl">已确认</span></div>
            <div className="sc-stat-card"><span className="sc-stat-val accent">{highCount}</span><span className="sc-stat-lbl">高优先级</span></div>
            <div className="sc-stat-card"><span className="sc-stat-val">{total - confirmed}</span><span className="sc-stat-lbl">待处理</span></div>
          </div>
        </div>
        <div className="sc-table-wrap">
          <div className="sc-table-title">需求明细列表</div>
          <table className="sub-content-table">
            <thead><tr><th>编号</th><th>需求名称</th><th>优先级</th><th>状态</th><th>负责人</th><th>日期</th><th>需求描述</th></tr></thead>
            <tbody>
              {d.rows.map(r => {
                const pc = r.priority === "高" ? "high" : (r.priority === "中" ? "medium" : "low");
                const sc = r.status === "已确认" ? "done" : (r.status === "评审中" ? "active" : "pending");
                const sl = r.status === "已确认" ? "已完成" : (r.status === "评审中" ? "进行中" : "待开始");
                return (<tr key={r.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{r.id}</td>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td><span className={`sc-priority ${pc}`}>{r.priority}</span></td>
                  <td><span className={`te-status ${sc}`}>{sl}</span></td>
                  <td>{r.owner}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{r.date}</td>
                  <td>{r.desc}</td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTaskDetail = (taskId: string) => {
    const d = taskData[taskId]; if (!d) return null;
    const totalSteps = d.rows.length;
    const doneSteps = d.rows.filter(r => r.status === "done").length;
    const progress = totalSteps > 0 ? Math.round(doneSteps / totalSteps * 100) : 0;
    const statusClass = d.rows.some(r => r.status === "active") ? "active" : (doneSteps === totalSteps ? "done" : "pending");
    const statusLabel = statusClass === "done" ? "已完成" : (statusClass === "active" ? "进行中" : "待开始");
    const isCollapsed = stepsCollapsed[taskId] || false;
    const selIdx = selectedRowIdx[taskId];

    const buildFields = () => {
      const h: React.ReactNode[] = [];
      if (visibleFields.stepCount) {
        h.push(<div key="steps" className="td-field-card"><span className="td-fc-label">步骤总数</span><span className="td-fc-value big">{totalSteps}</span></div>);
        h.push(<div key="prog" className="td-field-card"><span className="td-fc-label">进度</span><span className="td-fc-value big accent">{progress}%</span></div>);
      }
      if (visibleFields.role) h.push(<div key="role" className="td-field-card"><span className="td-fc-label">执行角色</span><span className="td-fc-value">{[...new Set(d.rows.map(r => r.role))].filter(Boolean).join(" · ")}</span></div>);
      return h;
    };

    const rowsHtml = d.rows.map((r, i) => (
      <tr key={i}><td>{i + 1}</td><td className="td-desc-cell" title={r.desc}>{r.desc || "—"}</td><td>{r.input || "—"}</td><td>{r.output || "—"}</td><td>{r.role || "—"}</td><td><span className={`te-status ${r.status}`}>{r.label}</span></td></tr>
    ));

    const truncate = (s: string, max = 28) => s.length > max ? s.slice(0, max) + "…" : s;

    const rowsV28 = d.rows.map((r, i) => (
      <tr key={i} className={selIdx === i ? "row-selected" : ""} onClick={() => selectRow(taskId, i)}>
        <td>{i === 0 ? <strong>{d.name}</strong> : ""}</td>
        <td className="td-desc" title={r.desc}>{truncate(r.desc)}</td>
        <td>{truncate(r.input, 20)}</td>
        <td>{truncate(r.output, 20)}</td>
        <td>{r.role}</td>
        <td><span className={`te-status ${r.status}`}>{r.label}</span></td>
        <td className="td-action">▶</td>
      </tr>
    ));

    const selRow = selIdx !== undefined && selIdx !== null ? d.rows[selIdx] : null;
    const sc = (r: TaskRow) => { if (r.status === "done") return "green"; if (r.status === "active") return "accent"; return "muted"; };

    const v27Content = (
      <>
        <div className="td-field-grid" id={`fieldGrid-${taskId}`}>{buildFields()}</div>
        {visibleFields.desc && (
          <div className="td-desc-block">
            <span className="td-fc-label">任务概述</span>
            <span className="td-fc-value">{d.rows.map(r => r.desc).filter(Boolean).join("；")}</span>
          </div>
        )}
        <div className="td-steps-section">
          <div className="td-steps-header" onClick={() => toggleSteps(taskId)}>
            <span className="td-steps-title">步骤明细 · {totalSteps} 步</span>
            <span className="td-steps-toggle" id={`stepsToggle-${taskId}`}>{isCollapsed ? "▼ 展开" : "▲ 收起"}</span>
          </div>
          <div className="td-steps-table-wrap" style={{ display: isCollapsed ? "none" : "block" }} id={`stepsTable-${taskId}`}>
            <table cellSpacing="0"><thead><tr><th>#</th><th>步骤说明</th><th>步骤输入</th><th>步骤输出</th><th>执行角色</th><th>状态</th></tr></thead><tbody>{rowsHtml}</tbody></table>
          </div>
        </div>
      </>
    );

    const v28Content = (
      <>
        <table cellSpacing="0"><thead><tr><th>任务名称</th><th>步骤说明</th><th>步骤输入</th><th>步骤输出</th><th>执行角色</th><th>状态</th><th></th></tr></thead><tbody>{rowsV28}</tbody></table>
        <div className={`row-detail-panel${selRow ? " show" : ""}`} id={`rdp-${taskId}`}>
          <div className="rdp-inner" id={`rdp-inner-${taskId}`}>
            {selRow ? (
              <>
                <div className="rdp-field full"><span className="rdp-label">步骤说明</span><span className="rdp-value">{selRow.desc}</span></div>
                <div className="rdp-field"><span className="rdp-label">输入</span><span className="rdp-value">{selRow.input || "—"}</span></div>
                <div className="rdp-field"><span className="rdp-label">输出</span><span className="rdp-value">{selRow.output || "—"}</span></div>
                <div className="rdp-field"><span className="rdp-label">执行角色</span><span className="rdp-value">{selRow.role}</span></div>
                <div className="rdp-field"><span className={`rdp-value ${sc(selRow)}`}>{selRow.label}</span></div>
                <div className="rdp-field full" style={{ padding: "12px 24px" }}><span className="rdp-label" style={{ color: "var(--text-muted)" }}>第 {selIdx + 1} 步 · {d.name}</span></div>
              </>
            ) : (
              <div className="rdp-field full"><span className="rdp-label">点击表格行查看详情</span><span className="rdp-value muted">选择左侧表格中的任意一行，此处将显示完整的步骤说明和关联信息</span></div>
            )}
          </div>
        </div>
      </>
    );

    return (
      <div className="task-expand show" id={`task-p${taskId.charAt(1)}`}>
        <div className="task-expand-inner">
          <div className="td-card-header">
            <div className="td-card-header-left">
              <span className="td-card-name">{d.name}</span>
              <span className={`td-card-badge ${statusClass}`}>{statusLabel}</span>
              <span className="td-card-badge" style={{ border: "1px solid var(--border-light)", color: "var(--text-muted)" }}>{doneSteps}/{totalSteps} 步</span>
            </div>
            <div className="td-card-actions">
              <button className="view-toggle-btn" onClick={toggleTaskView}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                {taskViewMode === "v27" ? "切换表格视图" : "切换卡片视图"}
              </button>
              <div className="td-config-wrap">
                <button className={`td-card-btn${configOpen === taskId ? " active-conf" : ""}`} onClick={() => toggleConfig(taskId)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg> 设置
                </button>
                <div className={`td-config-dropdown${configOpen === taskId ? " show" : ""}`} id={`cfg-${taskId}`}>
                  <div className={`td-config-item${visibleFields.stepCount ? " on" : ""}`} onClick={() => toggleField("stepCount", taskId)}><span className="cfg-check">{visibleFields.stepCount ? "✓" : ""}</span>步骤统计</div>
                  <div className={`td-config-item${visibleFields.role ? " on" : ""}`} onClick={() => toggleField("role", taskId)}><span className="cfg-check">{visibleFields.role ? "✓" : ""}</span>执行角色</div>
                  <div className={`td-config-item${visibleFields.desc ? " on" : ""}`} onClick={() => toggleField("desc", taskId)}><span className="cfg-check">{visibleFields.desc ? "✓" : ""}</span>任务概述</div>
                </div>
              </div>
              <button className="td-card-btn" onClick={() => exportTask(taskId)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 导出 Excel
              </button>
            </div>
          </div>
          {taskViewMode === "v27" ? v27Content : v28Content}
        </div>
      </div>
    );
  };

  /* ── Overview Data ── */
  const ovData = phaseLabels.map((label, i) => ({
    name: label,
    num: `${phaseStepsDone[i]}/${phaseStepsTotal[i]}`,
    pct: phaseProgressPct[i],
    status: phaseStatuses[i],
    statusLabel: phaseStatuses[i] === "done" ? "已完成" : (phaseStatuses[i] === "active" ? "进行中" : "待开始"),
  }));

  /* ── Chart Data ── */
  const allTaskRows = Object.values(taskData).flatMap(t => t.rows);
  const chartDone = allTaskRows.filter(r => r.status === "done").length;
  const chartActive = allTaskRows.filter(r => r.status === "active").length;
  const chartPending = allTaskRows.filter(r => r.status === "pending").length;
  const chartTotal = chartDone + chartActive + chartPending;
  const donutDoneAngle = chartTotal > 0 ? (chartDone / chartTotal) * 360 : 0;

  const phaseTaskCounts = [0, 1, 2, 3, 4, 5, 6].map(i => {
    const tasks = phaseTasks[i] || [];
    return tasks.reduce((s, tid) => s + (taskData[tid]?.rows.length || 0), 0);
  });
  const maxTasks = Math.max(...phaseTaskCounts, 1);

  /* ================================================================
     MAIN RENDER
     ================================================================ */
  return (
    <div className={`phase-layout${dark ? " dark" : ""}`}>
      {/* ═══ Dock ═══ */}
      <header className={`top-docker${dockHidden ? " hidden" : ""}`}>
        <div className="dock-glass">
          <div className="dock-logo">光</div>
          <div className="dock-divider" />
          <nav className="dock-nav">
            {[
              { id: "kanban", label: "看板" },
              { id: "projects", label: "项目", active: true },
              { id: "tasks", label: "任务" },
              { id: "issues", label: "工单" },
              { id: "cases", label: "案例" },
              { id: "standards", label: "规范" },
              { id: "settings", label: "设置" },
            ].map(item => (
              <div key={item.id} className={`dock-item${item.active ? " active" : ""}`}>
                <div className="dock-icon-wrap">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" dangerouslySetInnerHTML={{ __html: renderDockIcon(item.id) }} />
                </div>
                <span className="dock-label">{item.label}</span>
                <div className="dock-indicator" />
              </div>
            ))}
          </nav>
          <div className="dock-divider" />
          <div className="dock-right-group">
            <button className="dock-btn" onClick={() => setDockHidden(!dockHidden)}>HIDE</button>
            <div className="dock-user">S</div>
          </div>
        </div>
      </header>

      {/* ═══ Body Layout ═══ */}
      {/* Left Strip (fixed) */}
      <div className="left-strip-wrap">
        <div className="left-strip" id="leftStrip">
          <div className="strip-inner">
            <div className="strip-l1">
              {Object.entries(panelData).map(([pk, val]) => (
                <div key={pk} className={`strip-item${activePanel === pk ? " active" : ""}`} data-panel={pk} onMouseEnter={() => handlePanelEnter(pk)}>
                  <span className="si-line" />{val.title.replace(/^(SCOPE|DEMAND|PROGRESS|QUALITY|COST|COMMUNICATION|RISK|DOCS)\s/, "")}
                </div>
              ))}
            </div>
            <div className="strip-divider" />
            <div className="strip-l2" id="stripL2">
              <div className="strip-l2-header">{panelData[activePanel]?.title || ""}</div>
              {l2Items.map(it => {
                const isActive = it.active || subContent?.key === it.key;
                const Tag = it.link ? "a" : "div";
                const extra = it.link ? { href: it.link, target: "_blank", rel: "noopener noreferrer" } : {};
                const dataAttrs = it.key ? { "data-key": it.key, "data-label": it.label } : {};
                return (
                  <Tag key={it.key || it.label} className={`strip-sub-item${isActive ? " active" : ""}`} style={{ cursor: "pointer" }} {...extra} {...dataAttrs as any} onClick={() => it.key && handleSubClick(it.key, it.label)}>
                    <span className="sub-dot" />{it.label}<span className="sub-badge">{it.count}</span>
                  </Tag>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="body-layout">
        {/* ═══ Main Area ═══ */}
        <div className="main-area">
          {subContent ? renderSubContentArea() : (
            <>
              {/* Hero */}
              <div className="hero">
                <div className="hero-grid">
                  <div className="hero-left">
                    <div className="hero-label">项 目 详 情  /  PROJECT DETAILS</div>
                    <h1>{project.project_name || "智慧校园基础平台<br>建设项目"}</h1>
                    <div className="hero-tags">
                      <span className="hero-tag status">{project.status || "实施中"}</span>
                      <span className="hero-tag type">{project.project_type || "A类重点项目"}</span>
                    </div>
                  </div>
                  <div className="hero-meta">
                    <div><span className="meta-stat accent">71%</span><span className="meta-label">总进度</span></div>
                    <div><span className="meta-stat green">4/7</span><span className="meta-label">已完成阶段</span></div>
                    <div><span className="meta-stat">32</span><span className="meta-label">任务总数</span></div>
                    <div><span className="meta-stat">120</span><span className="meta-label">剩余天数</span></div>
                  </div>
                </div>
                <div className="proj-info-bar">
                  <div className="proj-info-card"><span className="proj-info-label">客户名称</span><span className="proj-info-value">{project.customer_info?.company_name || "深圳市教育局"}</span></div>
                  <div className="proj-info-card"><span className="proj-info-label">客户名称</span><span className="proj-info-value">{project.channel_info?.[0]?.company_name || "南山区教育局"}</span></div>
                  <div className="proj-info-card"><span className="proj-info-label">业务部署模式</span><span className="proj-info-value"><span className="pi-tag">本地部署</span><span className="pi-tag">私有云</span></span></div>
                  <div className="proj-info-card"><span className="proj-info-label">编号 / 负责人</span><span className="proj-info-value">SCP-2026-0012 · 张明远（研发二部）</span></div>
                </div>
              </div>

              {/* Product List */}
              <div className="product-section">
                <div className="product-section-label">已采购产品清单 · 28 项</div>
                <div className="product-grid">
                  {products.map((p, i) => (
                    <div className="product-item" key={i}>
                      <span className="pi-dot" />{p.name}
                      {p.count > 1 && <span className="pi-count">×{p.count}</span>}
                      {p.status === "used" && <span className="pi-used">已部署</span>}
                      {p.status === "partial" && <span className="pi-partial">部分部署</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-content Area placeholder */}
              <div className="sub-content-area" id="subContentArea" style={{ display: "none" }} />

              {/* Section Head: Phases */}
              <div className="section-head">
                Phases 项目阶段
                <span className="section-head-line" />
              </div>

              {/* Timeline / Stepper */}
              <div className="timeline-section">
                <div className="stepper-track">
                  {phaseLabels.map((label, i) => {
                    const s = phaseStatuses[i];
                    return (
                      <div key={i} className={`stepper-node ${i < activePhase ? "done" : i === activePhase ? "active" : ""}`} onClick={() => switchPhase(i)}>
                        <span className="stepper-dot">{String(i + 1).padStart(2, "0")}</span>
                        <span className="stepper-label">{label}</span>
                        <span className="stepper-date">{phaseDates[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section Head: Phase Details */}
              <div className="section-head">
                <span className="section-head-label">Phase Details 阶段详情</span>
                <span className="section-head-line" />
              </div>

              {/* Phase Detail Cards */}
              <div className="phase-section" id="phaseCard">
                {phaseLabels.map((label, idx) => {
                  const visible = idx === activePhase;
                  const s = phaseStatuses[idx];
                  const meta = phaseMeta[idx] || { items: [] };
                  const pdStatusClass = s === "done" ? "done" : s === "pending" ? "pending" : "";
                  const pdStatusLabel = s === "done" ? "已完成" : s === "active" ? "进行中" : "待开始";
                  const tasks = phaseTasks[idx] || [];
                  const cur = taskData[`p${idx}t0`];
                  const totalSteps = cur ? cur.rows.length + (taskData[`p${idx}t1`]?.rows.length || 0) : 0;
                  const bpct = phaseProgressPct[idx];
                  return (
                    <div key={idx} className={`phase-detail${visible ? " active" : ""}`} id={`phase${idx}`} style={{ display: visible ? "block" : "none" }}>
                      <div className="pd-grid">
                        <div className="pd-left">
                          <span className={`pd-status ${pdStatusClass}`}>{pdStatusLabel}</span>
                          <span className="pd-name">{label}</span>
                          <span className="pd-desc">{phaseDescriptions[idx]}</span>
                          <span className="pd-date">2026.{phaseDates[idx]}</span>
                          <div className="pd-meta">
                            {meta.items.map((mi, miIdx) => (
                              <div key={miIdx} className="pd-meta-item">
                                <span className={`mv${(mi as any).accent ? " accent" : ""}`} style={(mi as any).color ? { color: (mi as any).color } : (mi as any).muted ? { color: "var(--text-muted)" } : {}}>{mi.v}</span>{mi.l || ""}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="pd-right">
                          <span className="pd-right-label">任务清单</span>
                          <div className="pd-tasks">
                            {tasks.map(tid => {
                              const td = taskData[tid];
                              if (!td) return null;
                              const dotStatus = td.rows.some(r => r.status === "active") ? "active" : td.rows.every(r => r.status === "done") ? "" : "pending";
                              return (
                                <div key={tid} className="pd-task" onClick={() => showTaskDetail(tid)}>
                                  <span className="pd-task-left"><span className={`pd-task-dot${dotStatus ? ` ${dotStatus}` : ""}`} />{td.name}</span>
                                  <span className="pd-task-arrow">→</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="task-expand" id={`task-p${idx}`} style={{ display: selectedTask && selectedTask.startsWith(`p${idx}`) ? "block" : "none" }}>
                        {selectedTask && selectedTask.startsWith(`p${idx}`) && renderTaskDetail(selectedTask)}
                      </div>
                      <div className="pd-progress">
                        <span className="pd-prog-label">Progress 进度</span>
                        <div className="pd-prog-bar-wrap"><div className="pd-prog-fill" style={{ width: `${bpct}%`, background: bpct === 100 ? "var(--green)" : bpct > 0 ? "var(--orange)" : "" }} /></div>
                        <span className="pd-prog-val" style={{ color: bpct === 100 ? "var(--green)" : bpct > 0 ? "var(--orange)" : "var(--text-muted)" }}>{bpct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Section Head: Overview */}
              <div className="section-head">
                <span className="section-head-label">Overview 总览</span>
                <span className="section-head-line" />
              </div>

              {/* Progress Overview */}
              <div className="overview-section">
                <div className="ov-grid">
                  {ovData.map((ov, i) => (
                    <div key={i} className="ov-item">
                      <div className="ov-top">
                        <span className="ov-name">{ov.name}</span>
                        <span className="ov-num" style={ov.status === "active" ? { color: "var(--orange)" } : {}}>{ov.num}</span>
                      </div>
                      <div className="ov-bar-wrap">
                        <div className="ov-bar"><div className={`ov-fill ${ov.status}`} style={{ width: `${ov.pct}%` }} /></div>
                        <span className={`ov-status ${ov.status}`}>{ov.statusLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section Head: Charts */}
              <div className="section-head">
                <span className="section-head-label">Charts 数据图表</span>
                <span className="section-head-line" />
              </div>

              {/* Charts */}
              <div className="charts-section">
                {/* Donut Chart */}
                <div className="chart-card">
                  <div className="chart-title">任务完成分布</div>
                  <div className="chart-donut-wrap">
                    <svg viewBox="0 0 200 200" className="donut-chart">
                      <circle cx="100" cy="100" r="80" fill="none" stroke="var(--border)" strokeWidth="20" />
                      <circle cx="100" cy="100" r="80" fill="none" stroke="var(--green)" strokeWidth="20"
                        strokeDasharray="502.65" strokeDashoffset={502.65 - (502.65 * donutDoneAngle / 360)} transform="rotate(-90 100 100)" />
                      <text x="100" y="90" textAnchor="middle" fontSize="32" fontWeight="800" fill="var(--text)" fontFamily="var(--font-mono)">{chartDone}</text>
                      <text x="100" y="112" textAnchor="middle" fontSize="11" fill="var(--text-muted)" fontFamily="var(--font-mono)">已完成</text>
                    </svg>
                  </div>
                  <div className="donut-legend">
                    <div className="dl-item"><span className="dl-dot" style={{ background: "var(--green)" }} />已完成 {chartDone}<span className="dl-pct">{Math.round(chartDone / chartTotal * 100)}%</span></div>
                    <div className="dl-item"><span className="dl-dot" style={{ background: "var(--orange)" }} />进行中 {chartActive}<span className="dl-pct">{Math.round(chartActive / chartTotal * 100)}%</span></div>
                    <div className="dl-item"><span className="dl-dot" style={{ background: "var(--text-muted)" }} />待开始 {chartPending}<span className="dl-pct">{Math.round(chartPending / chartTotal * 100)}%</span></div>
                  </div>
                </div>
                {/* Bar Chart */}
                <div className="chart-card" style={{ flex: 2 }}>
                  <div className="chart-title">各阶段任务量</div>
                  <div className="bar-chart-wrap">
                    {phaseLabels.map((label, i) => {
                      const cnt = phaseTaskCounts[i];
                      const pct = Math.round(cnt / maxTasks * 100);
                      const color = phaseStatuses[i] === "done" ? "var(--green)" : phaseStatuses[i] === "active" ? "var(--orange)" : "";
                      return (
                        <div className="bar-row" key={i}>
                          <span className="bar-label">{label.slice(0, 6)}</span>
                          <div className="bar-track">
                            <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
                            <div className="bar-track-bg" />
                          </div>
                          <span className="bar-val" style={phaseStatuses[i] === "active" ? { color: "var(--orange)" } : {}}>{cnt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>{/* /main-area */}
      </div>{/* /body-layout */}

      {/* ═══ Top-Right Toolbar ═══ */}
      <div className="tl-toolbar">
        <button className={`tl-tool-btn${navOpen ? " active" : ""}`} onClick={() => setNavOpen(!navOpen)} title="导航">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>
        <button className="tl-tool-btn" onClick={() => alert("搜索功能 — 待实现")} title="搜索">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </button>
        <button className={`tl-tool-btn${aiOpen ? " active" : ""}`} onClick={() => setAiOpen(!aiOpen)} title="AI 助手">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
        </button>
        <button className="tl-tool-btn" onClick={toggleTheme} title="切换深色/浅色">{dark ? "☾" : "☀"}</button>
      </div>

      {/* ═══ Navigation Drawer ═══ */}
      {navOpen && <div className="nav-overlay show" onClick={() => setNavOpen(false)} />}
      <div className={`nav-drawer${navOpen ? " show" : ""}`}>
        <div className="nav-drawer-l1">
          {Object.entries(panelData).map(([pk, val]) => (
            <div key={pk} className={`nav-drawer-item${navActivePanel === pk ? " active" : ""}`} data-panel={pk} onMouseEnter={() => handleNavPanelEnter(pk)}>
              <span className="nd-line" />{val.title.replace(/^(SCOPE|DEMAND|PROGRESS|QUALITY|COST|COMMUNICATION|RISK|DOCS)\s/, "")}
            </div>
          ))}
        </div>
        <div className="nav-drawer-divider" />
        <div className="nav-drawer-l2" id="navDrawerL2">
          <div className="nav-drawer-l2-header">{panelData[navActivePanel]?.title || ""}</div>
          {panelData[navActivePanel]?.items.map(it => {
            const Tag = it.link ? "a" : "div";
            const extra = it.link ? { href: it.link, target: "_blank", rel: "noopener noreferrer" } : {};
            const dataAttrs = it.key ? { "data-key": it.key, "data-label": it.label } : {};
            return (
              <Tag key={it.key || it.label} className={`nav-drawer-sub${it.active ? " active" : ""}`} style={{ cursor: "pointer" }} {...extra} {...dataAttrs as any} onClick={() => it.key && handleSubClick(it.key, it.label)}>
                <span className="ns-dot" />{it.label}<span className="ns-badge">{it.count}</span>
              </Tag>
            );
          })}
        </div>
      </div>

      {/* ═══ AI Dialog ═══ */}
      {aiOpen && <div className="ai-overlay show" onClick={() => setAiOpen(false)} />}
      <div className={`ai-dialog${aiOpen ? " show" : ""}`}>
        <div className="ai-dialog-header">
          <span className="ai-dialog-title"><span className="ai-dot" /> AI 项目助手</span>
          <button className="ai-dialog-close" onClick={() => setAiOpen(false)}>✕</button>
        </div>
        <div className="ai-dialog-body" id="aiBody">
          {aiMessages.map((m, i) => (
            <div key={i} className="ai-msg" style={m.role === "user" ? { background: "var(--surface2)", borderLeftColor: "var(--blue)" } : {}}>
              {m.role === "user" ? `👤 ${m.text}` : `🤖 ${m.text}`}
            </div>
          ))}
        </div>
        <div className="ai-dialog-input-row">
          <input className="ai-dialog-input" value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendAI(); }} placeholder="输入问题..." />
          <button className="ai-dialog-send" onClick={sendAI}>发送</button>
        </div>
      </div>
    </div>
  );
}
