"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ============================================================
   Data Layer (panelData, taskData, subContentData, productData)
   ============================================================ */

const panelData: Record<string, {
  title: string;
  items: Array<{ label: string; count?: number; key: string; link?: string }>;
}> = {
  scope: {
    title: "SCOPE 范围管理",
    items: [
      { label: "需求边界确认", count: 12, key: "req-boundary" },
      { label: "需求登记表", count: 8, key: "req-form" },
      { label: "变更申请表", count: 5, key: "change-form" },
      { label: "变更影响评估", count: 3, key: "change-impact" },
      { label: "范围确认书", count: 3, key: "scope-confirm" },
      { label: "WBS工作分解", count: 1, key: "wbs" },
    ],
  },
  demand: {
    title: "DEMAND 需求管理",
    items: [
      { label: "需求池", count: 12, key: "req-pool" },
      { label: "需求评审记录", count: 8, key: "req-review" },
      { label: "需求跟踪矩阵", count: 6, key: "req-matrix" },
      { label: "需求变更记录", count: 5, key: "req-change" },
      { label: "用户故事地图", count: 3, key: "user-story" },
      { label: "原型设计稿", count: 4, key: "prototype" },
    ],
  },
  progress: {
    title: "PROGRESS 进度管理",
    items: [
      { label: "里程碑管理", count: 4, key: "milestone" },
      { label: "日报汇总", count: 6, key: "daily", link: "/daily" },
      { label: "延期预警", count: 3, key: "delay", link: "/delay" },
      { label: "甘特图", count: 1, key: "gantt" },
      { label: "看板视图", count: 1, key: "kanban" },
      { label: "进度报告", count: 2, key: "progress-report" },
    ],
  },
  quality: {
    title: "QUALITY 质量管理",
    items: [
      { label: "测试计划", count: 3, key: "test-plan" },
      { label: "缺陷跟踪", count: 6, key: "bug-track" },
      { label: "测试用例", count: 5, key: "test-case" },
      { label: "测试报告", count: 3, key: "test-report" },
      { label: "代码审查记录", count: 4, key: "code-review" },
      { label: "验收标准", count: 3, key: "accept-criteria" },
    ],
  },
  cost: {
    title: "COST 成本管理",
    items: [
      { label: "项目预算表", count: 3, key: "budget" },
      { label: "费用报销记录", count: 5, key: "expense" },
      { label: "采购清单", count: 4, key: "purchase" },
      { label: "工时统计", count: 3, key: "manhour" },
      { label: "合同付款节点", count: 3, key: "contract-pay" },
    ],
  },
  communication: {
    title: "COMMUNICATION 沟通管理",
    items: [
      { label: "会议纪要", count: 5, key: "meeting" },
      { label: "干系人通讯录", count: 4, key: "contacts" },
      { label: "通知公告", count: 3, key: "notice" },
      { label: "周例会记录", count: 3, key: "weekly" },
      { label: "客户沟通记录", count: 4, key: "client-comm" },
      { label: "内部评审记录", count: 3, key: "internal-review" },
    ],
  },
  risk: {
    title: "RISK 风险管理",
    items: [
      { label: "风险登记册", count: 5, key: "risk-register" },
      { label: "问题跟踪表", count: 4, key: "issue-track" },
      { label: "应急预案", count: 3, key: "emergency" },
      { label: "风险应对措施", count: 3, key: "risk-action" },
      { label: "依赖关系矩阵", count: 3, key: "dep-matrix" },
    ],
  },
  docs: {
    title: "DOCS 文档管理",
    items: [
      { label: "技术方案", count: 3, key: "tech-plan" },
      { label: "部署手册", count: 3, key: "deploy-manual" },
      { label: "用户操作手册", count: 4, key: "user-manual" },
      { label: "培训材料", count: 3, key: "training" },
      { label: "验收交付文档", count: 4, key: "accept-doc" },
      { label: "运维交接文档", count: 3, key: "ops-doc" },
      { label: "版本发布说明", count: 3, key: "release-note" },
    ],
  },
};

/* Phase Stepper Data */
const phaseLabels = [
  "项目启动与策划",
  "需求分析与定义",
  "方案与深化设计",
  "开发与系统集成",
  "测试与质量验证",
  "部署与上线实施",
  "验收与项目收尾",
];
const phaseDates = [
  "2025.09 - 2025.12",
  "2025.11 - 2026.02",
  "2026.01 - 2026.04",
  "2026.03 - 2026.07",
  "2026.06 - 2026.09",
  "2026.08 - 2026.10",
  "2026.10 - 2026.12",
];
const phaseDescriptions = [
  "完成项目立项审批、团队组建、资源调配和项目章程签署，明确项目范围、目标和关键干系人。",
  "深入调研用户需求，完成需求规格说明书，进行需求评审和确认，建立需求追踪矩阵。",
  "完成系统架构设计、详细方案设计、技术选型和原型设计，输出设计方案文档。",
  "按照设计方案进行编码开发、接口对接、系统集成和联调测试，产出可部署的系统版本。",
  "执行全面的功能测试、性能测试、安全测试和用户验收测试，确保系统质量达标。",
  "完成系统部署、数据迁移、用户培训和试运行，确保系统稳定运行。",
  "完成项目成果交付、文档归档、验收评审和项目总结，正式关闭项目。",
];

/* Task Data per Phase */
const taskData: Record<string, { name: string; status: string; totalSteps: number; doneSteps: number; startDate: string; endDate: string; desc: string; rows: Array<{ name: string; desc: string; input: string; output: string; role: string; status: string }> }> = {
  p0: {
    name: "项目启动与策划",
    status: "done",
    totalSteps: 3,
    doneSteps: 3,
    startDate: "2025-09-01",
    endDate: "2025-12-31",
    desc: "完成项目立项审批、团队组建和项目章程签署，建立项目管理体系。",
    rows: [
      { name: "项目立项", desc: "编制项目立项申请报告，进行可行性论证", input: "项目建议书、可行性研究报告", output: "立项批复文件", role: "项目经理", status: "已完成" },
      { name: "团队组建", desc: "确定项目组织架构，组建核心团队", input: "项目需求、组织结构图", output: "项目团队名单", role: "PMO", status: "已完成" },
      { name: "章程签署", desc: "制定并签署项目章程，明确项目目标、范围", input: "立项批复、干系人清单", output: "项目章程", role: "发起人", status: "已完成" },
    ],
  },
  p1: {
    name: "需求分析与定义",
    status: "done",
    totalSteps: 4,
    doneSteps: 4,
    startDate: "2025-11-15",
    endDate: "2026-02-28",
    desc: "深入调研用户需求，完成需求规格说明书。",
    rows: [
      { name: "需求调研", desc: "走访用户单位，收集业务需求", input: "调研问卷、访谈提纲", output: "调研报告", role: "需求分析师", status: "已完成" },
      { name: "需求分析", desc: "分析整理需求，识别功能和非功能需求", input: "调研报告", output: "需求分析文档", role: "需求分析师", status: "已完成" },
      { name: "需求评审", desc: "组织需求评审会议，确认需求基线", input: "需求规格说明书", output: "评审通过的需求基线", role: "项目经理", status: "已完成" },
      { name: "需求追踪矩阵", desc: "建立需求追踪矩阵，关联需求与后续产出", input: "需求基线", output: "需求追踪矩阵", role: "QA", status: "已完成" },
    ],
  },
  p2: {
    name: "方案与深化设计",
    status: "done",
    totalSteps: 4,
    doneSteps: 4,
    startDate: "2026-01-10",
    endDate: "2026-04-30",
    desc: "完成系统架构设计、详细方案设计和技术选型。",
    rows: [
      { name: "架构设计", desc: "设计系统整体架构，确定技术路线", input: "需求文档", output: "架构设计文档", role: "架构师", status: "已完成" },
      { name: "详细设计", desc: "完成模块详细设计，输出接口规范", input: "架构设计", output: "详细设计文档", role: "高级开发", status: "已完成" },
      { name: "原型设计", desc: "设计系统UI原型和交互流程", input: "需求文档", output: "原型设计稿", role: "UI/UX设计师", status: "已完成" },
      { name: "技术选型", desc: "确定技术栈、开发框架和第三方组件", input: "架构设计", output: "技术选型报告", role: "技术负责人", status: "已完成" },
    ],
  },
  p3: {
    name: "开发与系统集成",
    status: "active",
    totalSteps: 5,
    doneSteps: 3,
    startDate: "2026-03-01",
    endDate: "2026-07-31",
    desc: "按照设计方案进行编码开发、接口对接和系统集成。",
    rows: [
      { name: "基础框架搭建", desc: "搭建开发环境、CI/CD流水线和基础框架", input: "技术选型报告", output: "开发环境和基础框架", role: "技术负责人", status: "已完成" },
      { name: "核心模块开发", desc: "完成数据中台、统一认证等核心模块编码", input: "详细设计文档", output: "核心模块代码", role: "开发团队", status: "已完成" },
      { name: "业务模块开发", desc: "完成各业务子系统功能开发", input: "详细设计、原型", output: "业务模块代码", role: "开发团队", status: "进行中" },
      { name: "接口对接", desc: "完成各系统间接口对接和数据联调", input: "接口规范", output: "联调通过的系统接口", role: "集成工程师", status: "待开始" },
      { name: "集成测试", desc: "系统集成后进行端到端功能验证", input: "测试计划", output: "集成测试报告", role: "测试工程师", status: "待开始" },
    ],
  },
  p4: {
    name: "测试与质量验证",
    status: "pending",
    totalSteps: 3,
    doneSteps: 0,
    startDate: "2026-06-01",
    endDate: "2026-09-30",
    desc: "执行全面的功能测试、性能测试、安全测试和用户验收测试。",
    rows: [
      { name: "功能测试", desc: "对所有功能模块进行全面的功能验证测试", input: "测试用例", output: "功能测试报告", role: "测试工程师", status: "待开始" },
      { name: "性能测试", desc: "进行并发压力测试和性能基准测试", input: "性能测试方案", output: "性能测试报告", role: "性能测试工程师", status: "待开始" },
      { name: "UAT验收", desc: "组织用户进行验收测试，收集反馈意见", input: "测试环境", output: "UAT测试报告", role: "业务代表", status: "待开始" },
    ],
  },
  p5: {
    name: "部署与上线实施",
    status: "pending",
    totalSteps: 3,
    doneSteps: 0,
    startDate: "2026-08-01",
    endDate: "2026-10-31",
    desc: "完成系统部署、数据迁移、用户培训和试运行。",
    rows: [
      { name: "环境部署", desc: "在生产环境完成系统部署和配置", input: "部署手册", output: "生产环境", role: "运维工程师", status: "待开始" },
      { name: "数据迁移", desc: "完成历史数据清洗和迁移", input: "数据迁移方案", output: "迁移后的数据", role: "数据工程师", status: "待开始" },
      { name: "用户培训", desc: "对最终用户进行系统操作培训", input: "培训材料", output: "培训记录", role: "培训讲师", status: "待开始" },
    ],
  },
  p6: {
    name: "验收与项目收尾",
    status: "pending",
    totalSteps: 3,
    doneSteps: 0,
    startDate: "2026-10-01",
    endDate: "2026-12-31",
    desc: "完成项目成果交付、文档归档、验收评审和项目总结。",
    rows: [
      { name: "成果交付", desc: "整理和交付全部项目成果物", input: "交付清单", output: "成果交付确认书", role: "项目经理", status: "待开始" },
      { name: "最终验收", desc: "组织最终验收评审会议", input: "验收标准", output: "验收报告", role: "验收委员会", status: "待开始" },
      { name: "项目总结", desc: "编写项目总结报告，归档项目文档", input: "项目全过程文档", output: "项目总结报告", role: "项目经理", status: "待开始" },
    ],
  },
};

/* Sub-Content Data (44 keys across 8 domains) */
const subContentData: Record<string, {
  section: string;
  rows: Array<{ id: string; name: string; priority: string; status: string; owner: string; date: string; desc: string }>;
}> = {
  // SCOPE 范围管理
  "req-boundary": { section: "SCOPE 范围管理", rows: [{ id: "RB-001", name: "统一认证对接范围", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-02", desc: "确认仅对接市教育局LDAP，不含区县级独立认证系统" }, { id: "RB-002", name: "数据中台覆盖范围", priority: "高", status: "已确认", owner: "李文华", date: "2026-03-05", desc: "覆盖全市中小学及幼儿园，含数据采集、存储、计算三层" }, { id: "RB-003", name: "智慧课堂边界", priority: "中", status: "已确认", owner: "王建国", date: "2026-03-08", desc: "仅含互动教学和在线作业模块，不含VR/AR教室" }, { id: "RB-004", name: "家校互通平台范围", priority: "中", status: "评审中", owner: "赵小红", date: "2026-03-10", desc: "含通知公告、成绩查询、在线缴费，不含社交功能" }, { id: "RB-005", name: "运维管理平台边界", priority: "低", status: "待评审", owner: "陈工", date: "2026-03-12", desc: "设备监控和告警管理，不含自动化运维编排" }] },
  "req-form": { section: "SCOPE 范围管理", rows: [{ id: "RF-001", name: "统一认证系统需求", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-01", desc: "支持LDAP/OAuth2.0/SAML等多种认证协议" }, { id: "RF-002", name: "数据中台需求", priority: "高", status: "已确认", owner: "李文华", date: "2026-03-02", desc: "支持PB级数据存储和实时计算能力" }, { id: "RF-003", name: "智慧课堂需求", priority: "中", status: "已确认", owner: "王建国", date: "2026-03-03", desc: "含互动白板、随堂测验、作业批改功能" }, { id: "RF-004", name: "校园安防需求", priority: "中", status: "评审中", owner: "刘安全", date: "2026-03-04", desc: "视频监控AI分析、访客管理、紧急报警" }, { id: "RF-005", name: "家校互通需求", priority: "中", status: "已确认", owner: "赵小红", date: "2026-03-05", desc: "手机端家长端应用，含通知和沟通功能" }, { id: "RF-006", name: "运维平台需求", priority: "低", status: "待评审", owner: "陈工", date: "2026-03-06", desc: "服务器、网络设备统一监控管理" }, { id: "RF-007", name: "报表分析需求", priority: "中", status: "已确认", owner: "周数据分析", date: "2026-03-07", desc: "含教育质量分析、教学评估等多维度报表" }, { id: "RF-008", name: "移动端适配需求", priority: "低", status: "待评审", owner: "孙移动", date: "2026-03-08", desc: "核心功能移动端适配，支持iOS/Android" }] },
  "change-form": { section: "SCOPE 范围管理", rows: [{ id: "CF-001", name: "增加食堂管理模块", priority: "高", status: "评审中", owner: "张明远", date: "2026-04-01", desc: "客户要求新增食堂消费和食材采购管理" }, { id: "CF-002", name: "调整数据存储周期", priority: "中", status: "已确认", owner: "李文华", date: "2026-04-05", desc: "将默认数据保留周期从3年调整为5年" }, { id: "CF-003", name: "增加区县对接接口", priority: "中", status: "评审中", owner: "王建国", date: "2026-04-08", desc: "需新增2个区县教育局系统的数据对接" }, { id: "CF-004", name: "调整培训方式", priority: "低", status: "已确认", owner: "赵小红", date: "2026-04-10", desc: "从集中培训改为分批分区域现场培训" }] },
  "change-impact": { section: "SCOPE 范围管理", rows: [{ id: "CI-001", name: "食堂模块影响评估", priority: "高", status: "已确认", owner: "张明远", date: "2026-04-02", desc: "新增食堂模块需增加2人月工作量，延期约2周" }, { id: "CI-002", name: "存储周期影响评估", priority: "中", status: "已确认", owner: "李文华", date: "2026-04-06", desc: "存储扩容费用增加约15万，不影响工期" }, { id: "CI-003", name: "区县对接影响评估", priority: "中", status: "评审中", owner: "王建国", date: "2026-04-09", desc: "新增对接约需3人月，需申请人力补充" }, { id: "CI-004", name: "培训方式影响评估", priority: "低", status: "已确认", owner: "赵小红", date: "2026-04-11", desc: "培训方式调整不增加成本，但培训周期延长2周" }] },
  "scope-confirm": { section: "SCOPE 范围管理", rows: [{ id: "SC-001", name: "一期范围确认书", priority: "高", status: "已确认", owner: "张明远", date: "2026-02-15", desc: "确认一期建设范围和交付成果清单" }, { id: "SC-002", name: "二期范围确认书", priority: "中", status: "确认中", owner: "张明远", date: "2026-06-20", desc: "初步规划二期建设内容，待正式确认" }, { id: "SC-003", name: "变更后范围再确认", priority: "高", status: "评审中", owner: "张明远", date: "2026-04-15", desc: "因食堂模块新增，需重新确认整体范围" }] },
  "wbs": { section: "SCOPE 范围管理", rows: [{ id: "WB-001", name: "一级WBS", priority: "高", status: "已确认", owner: "张明远", date: "2026-02-20", desc: "7个一级工作包对应7个阶段" }, { id: "WB-002", name: "二级WBS-开发阶段", priority: "中", status: "已确认", owner: "王建国", date: "2026-03-01", desc: "将开发阶段细分为12个二级工作包" }, { id: "WB-003", name: "三级WBS-测试阶段", priority: "中", status: "评审中", owner: "测试组长", date: "2026-06-01", desc: "待进入测试阶段前细化三级WBS" }] },

  // DEMAND 需求管理
  "req-pool": { section: "DEMAND 需求管理", rows: [{ id: "RP-001", name: "统一身份认证", priority: "高", status: "已确认", owner: "张明远", date: "2026-02-10", desc: "实现全市教育系统统一身份认证" }, { id: "RP-002", name: "数据驾驶舱", priority: "高", status: "已确认", owner: "李文华", date: "2026-02-12", desc: "为教育局领导提供可视化数据分析" }, { id: "RP-003", name: "在线阅卷系统", priority: "中", status: "已确认", owner: "王建国", date: "2026-02-15", desc: "支持客观题自动批改和主观题在线批阅" }, { id: "RP-004", name: "校园一卡通", priority: "中", status: "评审中", owner: "赵小红", date: "2026-02-18", desc: "含门禁、消费、图书借阅等场景" }, { id: "RP-005", name: "远程教学平台", priority: "低", status: "已确认", owner: "孙移动", date: "2026-02-20", desc: "支持直播教学和录播回放功能" }] },
  "req-review": { section: "DEMAND 需求管理", rows: [{ id: "RR-001", name: "第一次需求评审", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-01", desc: "评审核心业务需求，通过率92%" }, { id: "RR-002", name: "技术可行性评审", priority: "高", status: "已确认", owner: "李文华", date: "2026-03-05", desc: "技术方案评审通过，调整部分技术选型" }, { id: "RR-003", name: "UI/UX评审", priority: "中", status: "已确认", owner: "王建国", date: "2026-03-10", desc: "UI设计方案评审，修改交互流程" }, { id: "RR-004", name: "变更需求评审", priority: "中", status: "评审中", owner: "张明远", date: "2026-04-02", desc: "评审食堂管理等变更需求，待决策" }] },
  "req-matrix": { section: "DEMAND 需求管理", rows: [{ id: "RM-001", name: "认证需求→架构设计", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-15", desc: "关联认证需求与系统架构设计" }, { id: "RM-002", name: "数据需求→数据模型", priority: "高", status: "已确认", owner: "李文华", date: "2026-03-16", desc: "关联数据需求与数据模型设计" }, { id: "RM-003", name: "课堂需求→模块设计", priority: "中", status: "已确认", owner: "王建国", date: "2026-03-17", desc: "关联课堂需求与功能模块设计" }, { id: "RM-004", name: "安防需求→硬件选型", priority: "中", status: "评审中", owner: "刘安全", date: "2026-03-18", desc: "关联安防需求与硬件设备选型" }, { id: "RM-005", name: "家校需求→接口设计", priority: "中", status: "已确认", owner: "赵小红", date: "2026-03-19", desc: "关联家校需求与第三方接口设计" }, { id: "RM-006", name: "报表需求→DW设计", priority: "低", status: "待评审", owner: "周数据分析", date: "2026-03-20", desc: "关联报表需求与数据仓库设计" }] },
  "req-change": { section: "DEMAND 需求管理", rows: [{ id: "RC-001", name: "食堂模块需求新增", priority: "高", status: "评审中", owner: "张明远", date: "2026-04-01", desc: "新增学校食堂消费管理和采购管理需求" }, { id: "RC-002", name: "数据周期调整", priority: "中", status: "已确认", owner: "李文华", date: "2026-04-05", desc: "数据存储周期从3年调整为5年" }, { id: "RC-003", name: "移动端功能扩展", priority: "中", status: "评审中", owner: "孙移动", date: "2026-04-08", desc: "新增家长端扫码缴费功能" }, { id: "RC-004", name: "报表模板调整", priority: "低", status: "已确认", owner: "周数据分析", date: "2026-04-10", desc: "调整教育质量分析报表模板" }, { id: "RC-005", name: "接口协议变更", priority: "中", status: "待评审", owner: "王建国", date: "2026-04-12", desc: "对接系统从REST切换为GraphQL" }] },
  "user-story": { section: "DEMAND 需求管理", rows: [{ id: "US-001", name: "教师教学流程", priority: "高", status: "已确认", owner: "王建国", date: "2026-03-01", desc: "作为教师，我希望通过智慧课堂进行互动教学" }, { id: "US-002", name: "家长查看成绩", priority: "中", status: "已确认", owner: "赵小红", date: "2026-03-03", desc: "作为家长，我希望通过手机查看孩子的成绩" }, { id: "US-003", name: "管理员运维监控", priority: "中", status: "已确认", owner: "陈工", date: "2026-03-05", desc: "作为管理员，我希望实时监控系统运行状态" }] },
  "prototype": { section: "DEMAND 需求管理", rows: [{ id: "PT-001", name: "智慧课堂原型V1", priority: "高", status: "已确认", owner: "UI/UX设计", date: "2026-03-10", desc: "课堂互动教学主界面和交互流程原型" }, { id: "PT-002", name: "家长端原型V1", priority: "中", status: "评审中", owner: "UI/UX设计", date: "2026-03-15", desc: "家长端App主要页面和功能流程" }, { id: "PT-003", name: "数据驾驶舱原型", priority: "中", status: "已确认", owner: "UI/UX设计", date: "2026-03-18", desc: "教育局领导数据看板页面设计" }, { id: "PT-004", name: "运维后台原型", priority: "低", status: "待评审", owner: "UI/UX设计", date: "2026-03-20", desc: "运维管理后台界面和告警流程设计" }] },

  // PROGRESS 进度管理
  "milestone": { section: "PROGRESS 进度管理", rows: [{ id: "MS-001", name: "需求基线确认", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-31", desc: "完成需求评审并冻结需求基线" }, { id: "MS-002", name: "系统设计完成", priority: "高", status: "已确认", owner: "李文华", date: "2026-04-30", desc: "完成架构设计和详细设计" }, { id: "MS-003", name: "核心功能上线", priority: "高", status: "评审中", owner: "王建国", date: "2026-07-31", desc: "核心业务功能完成开发并通过测试" }, { id: "MS-004", name: "系统全面上线", priority: "高", status: "待评审", owner: "张明远", date: "2026-10-31", desc: "全部功能部署上线运行" }] },
  "daily": { section: "PROGRESS 进度管理", rows: [{ id: "DR-001", name: "日报-20260301", priority: "中", status: "已确认", owner: "张明远", date: "2026-03-01", desc: "需求调研第一天，走访市教育局信息中心" }, { id: "DR-002", name: "日报-20260302", priority: "中", status: "已确认", owner: "张明远", date: "2026-03-02", desc: "完成认证系统需求边界确认" }, { id: "DR-003", name: "日报-20260303", priority: "中", status: "已确认", owner: "李文华", date: "2026-03-03", desc: "数据中台需求研讨，输出初步数据架构" }, { id: "DR-004", name: "日报-20260304", priority: "中", status: "已确认", owner: "王建国", date: "2026-03-04", desc: "智慧课堂功能点梳理，整理需求清单" }, { id: "DR-005", name: "日报-20260305", priority: "中", status: "已确认", owner: "赵小红", date: "2026-03-05", desc: "家校互通平台需求调研，走访2所学校" }, { id: "DR-006", name: "日报-20260306", priority: "中", status: "已确认", owner: "陈工", date: "2026-03-06", desc: "运维管理平台需求收集，整理设备清单" }] },
  "delay": { section: "PROGRESS 进度管理", rows: [{ id: "DL-001", name: "食堂模块增加延期预警", priority: "高", status: "评审中", owner: "张明远", date: "2026-04-05", desc: "新增食堂模块预计延期2周，需调整里程碑" }, { id: "DL-002", name: "移动端开发资源不足", priority: "中", status: "评审中", owner: "孙移动", date: "2026-04-08", desc: "移动端开发人员不足，部分功能可能延期" }, { id: "DL-003", name: "第三方接口对接延期", priority: "中", status: "待评审", owner: "王建国", date: "2026-04-10", desc: "区县教育局系统接口文档未按时提供" }] },

  // QUALITY 质量管理
  "test-plan": { section: "QUALITY 质量管理", rows: [{ id: "TP-001", name: "整体测试计划", priority: "高", status: "已确认", owner: "测试组长", date: "2026-05-01", desc: "覆盖全系统7大模块的测试策略和计划" }, { id: "TP-002", name: "性能测试方案", priority: "中", status: "已确认", owner: "性能工程师", date: "2026-06-01", desc: "并发用户5000+的性能测试方案" }, { id: "TP-003", name: "安全测试方案", priority: "中", status: "评审中", owner: "安全工程师", date: "2026-06-15", desc: "含渗透测试和代码安全扫描" }] },
  "bug-track": { section: "QUALITY 质量管理", rows: [{ id: "BUG-001", name: "登录页面兼容性问题", priority: "高", status: "评审中", owner: "开发团队", date: "2026-07-01", desc: "IE11浏览器下登录页面样式错乱" }, { id: "BUG-002", name: "数据导出内存溢出", priority: "高", status: "评审中", owner: "李文华", date: "2026-07-02", desc: "导出10万条以上数据时浏览器崩溃" }, { id: "BUG-003", name: "图表显示异常", priority: "中", status: "已确认", owner: "王建国", date: "2026-07-03", desc: "Safari浏览器下饼图颜色渲染异常" }, { id: "BUG-004", name: "消息推送延迟", priority: "中", status: "评审中", owner: "陈工", date: "2026-07-04", desc: "部分通知消息推送延迟超过30秒" }, { id: "BUG-005", name: "权限校验绕过", priority: "高", status: "评审中", owner: "安全工程师", date: "2026-07-05", desc: "特定条件下可绕过权限校验访问敏感数据" }, { id: "BUG-006", name: "文件上传大小限制", priority: "低", status: "待评审", owner: "开发团队", date: "2026-07-06", desc: "视频文件超过500M上传失败无友好提示" }] },
  "test-case": { section: "QUALITY 质量管理", rows: [{ id: "TC-001", name: "认证模块测试用例", priority: "高", status: "已确认", owner: "测试工程师", date: "2026-06-01", desc: "含登录、注销、权限验证等32个用例" }, { id: "TC-002", name: "数据中台测试用例", priority: "高", status: "评审中", owner: "测试工程师", date: "2026-06-05", desc: "数据采集、存储、计算各环节共45个用例" }, { id: "TC-003", name: "智慧课堂测试用例", priority: "中", status: "已确认", owner: "测试工程师", date: "2026-06-10", desc: "互动教学、作业批改等28个用例" }, { id: "TC-004", name: "家校互通测试用例", priority: "中", status: "待评审", owner: "测试工程师", date: "2026-06-15", desc: "消息推送、成绩查询等20个用例" }, { id: "TC-005", name: "性能测试用例", priority: "中", status: "已确认", owner: "性能工程师", date: "2026-06-20", desc: "并发、负载、稳定性等15个用例" }] },
  "test-report": { section: "QUALITY 质量管理", rows: [{ id: "TR-001", name: "第一轮测试报告", priority: "高", status: "待评审", owner: "测试组长", date: "2026-07-15", desc: "第一轮整体测试通过率92%，严重Bug 2个" }, { id: "TR-002", name: "性能测试报告", priority: "中", status: "待评审", owner: "性能工程师", date: "2026-07-20", desc: "5000并发下响应时间<2秒，通过性能基准" }, { id: "TR-003", name: "安全测试报告", priority: "中", status: "待评审", owner: "安全工程师", date: "2026-07-25", desc: "发现3个中危漏洞已修复，1个低危待处理" }] },
  "code-review": { section: "QUALITY 质量管理", rows: [{ id: "CR-001", name: "认证模块代码审查", priority: "高", status: "已确认", owner: "技术负责人", date: "2026-06-01", desc: "代码规范符合度95%，无严重问题" }, { id: "CR-002", name: "数据中台代码审查", priority: "高", status: "已确认", owner: "李文华", date: "2026-06-10", desc: "部分SQL语句需优化，查询效率可提升" }, { id: "CR-003", name: "智慧课堂代码审查", priority: "中", status: "已确认", owner: "王建国", date: "2026-06-15", desc: "组件复用度不足，建议抽取公共组件" }, { id: "CR-004", name: "前端通用组件审查", priority: "中", status: "评审中", owner: "前端架构师", date: "2026-06-20", desc: "统一UI组件库，减少各模块重复开发" }] },
  "accept-criteria": { section: "QUALITY 质量管理", rows: [{ id: "AC-001", name: "认证系统验收标准", priority: "高", status: "已确认", owner: "张明远", date: "2026-08-01", desc: "支持5000用户并发登录，响应时间<1秒" }, { id: "AC-002", name: "数据中台验收标准", priority: "高", status: "已确认", owner: "李文华", date: "2026-08-05", desc: "数据采集延迟<5分钟，查询响应<3秒" }, { id: "AC-003", name: "智慧课堂验收标准", priority: "中", status: "评审中", owner: "王建国", date: "2026-08-10", desc: "支持50人同时在线互动教学无卡顿" }] },

  // COST 成本管理
  "budget": { section: "COST 成本管理", rows: [{ id: "BD-001", name: "总项目预算", priority: "高", status: "已确认", owner: "张明远", date: "2026-01-01", desc: "项目总预算1200万元,分三期拨付" }, { id: "BD-002", name: "一期预算明细", priority: "高", status: "已确认", owner: "张明远", date: "2026-01-15", desc: "一期预算600万元，含硬件采购200万" }, { id: "BD-003", name: "二期预算预估", priority: "中", status: "评审中", owner: "张明远", date: "2026-06-01", desc: "二期预算预估400万元，待正式审批" }] },
  "expense": { section: "COST 成本管理", rows: [{ id: "EX-001", name: "服务器采购费用", priority: "高", status: "已确认", owner: "陈工", date: "2026-02-01", desc: "采购应用服务器和存储设备共180万元" }, { id: "EX-002", name: "开发团队差旅费", priority: "中", status: "已确认", owner: "王建国", date: "2026-03-15", desc: "3月份差旅费用共计3.2万元" }, { id: "EX-003", name: "软件License费用", priority: "中", status: "已确认", owner: "李文华", date: "2026-03-20", desc: "数据库和中间件License费用45万元" }, { id: "EX-004", name: "第三方测试费用", priority: "中", status: "评审中", owner: "测试组长", date: "2026-06-01", desc: "委托第三方进行安全测试费用15万元" }, { id: "EX-005", name: "培训材料印刷费", priority: "低", status: "已确认", owner: "赵小红", date: "2026-08-01", desc: "用户操作手册和培训材料印刷3.5万元" }] },
  "purchase": { section: "COST 成本管理", rows: [{ id: "PR-001", name: "服务器集群", priority: "高", status: "已确认", owner: "陈工", date: "2026-02-01", desc: "戴尔R750服务器12台，含5年维保" }, { id: "PR-002", name: "网络设备", priority: "中", status: "已确认", owner: "陈工", date: "2026-02-15", desc: "华为交换机、防火墙和负载均衡器" }, { id: "PR-003", name: "校园终端设备", priority: "中", status: "评审中", owner: "王建国", date: "2026-04-01", desc: "智慧课堂用平板电脑500台" }, { id: "PR-004", name: "监控摄像头", priority: "低", status: "待评审", owner: "刘安全", date: "2026-05-01", desc: "校园安防用AI摄像头200台" }] },
  "manhour": { section: "COST 成本管理", rows: [{ id: "MH-001", name: "3月工时统计", priority: "中", status: "已确认", owner: "张明远", date: "2026-04-01", desc: "团队总计投入280人天，加班32小时" }, { id: "MH-002", name: "4月工时预估", priority: "中", status: "已确认", owner: "张明远", date: "2026-04-01", desc: "预计投入300人天，开发任务集中" }, { id: "MH-003", name: "人力缺口分析", priority: "中", status: "评审中", owner: "张明远", date: "2026-04-05", desc: "移动端开发缺口2人，需5月前补充" }] },
  "contract-pay": { section: "COST 成本管理", rows: [{ id: "CP-001", name: "首付款节点", priority: "高", status: "已确认", owner: "张明远", date: "2026-01-15", desc: "合同签署后支付30%，360万元已支付" }, { id: "CP-002", name: "中期验收付款", priority: "中", status: "待评审", owner: "张明远", date: "2026-06-30", desc: "核心功能上线后支付40%，480万元" }, { id: "CP-003", name: "最终验收付款", priority: "中", status: "待评审", owner: "张明远", date: "2026-12-31", desc: "项目验收通过后支付尾款30%，360万元" }] },

  // COMMUNICATION 沟通管理
  "meeting": { section: "COMMUNICATION 沟通管理", rows: [{ id: "MT-001", name: "项目启动会", priority: "高", status: "已确认", owner: "张明远", date: "2025-09-15", desc: "明确项目目标、范围、团队分工和沟通机制" }, { id: "MT-002", name: "需求评审会", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-10", desc: "评审需求规格说明书，确认需求基线" }, { id: "MT-003", name: "技术方案评审会", priority: "中", status: "已确认", owner: "李文华", date: "2026-04-15", desc: "评审系统架构和技术方案" }, { id: "MT-004", name: "项目周例会-第12周", priority: "中", status: "已确认", owner: "张明远", date: "2026-05-20", desc: "本周完成核心模块开发60%，进度正常" }, { id: "MT-005", name: "客户沟通会-4月", priority: "中", status: "已确认", owner: "赵小红", date: "2026-04-28", desc: "汇报项目进展，讨论食堂模块新增需求" }] },
  "contacts": { section: "COMMUNICATION 沟通管理", rows: [{ id: "CT-001", name: "教育局项目负责人", priority: "高", status: "已确认", owner: "张明远", date: "2025-09-01", desc: "王局长, 139xxxx8888, wang@edu.gov.cn" }, { id: "CT-002", name: "学校代表", priority: "中", status: "已确认", owner: "赵小红", date: "2025-10-15", desc: "李校长(南山实验), 138xxxx6666" }, { id: "CT-003", name: "监理方代表", priority: "中", status: "已确认", owner: "张明远", date: "2025-11-01", desc: "陈总监, 137xxxx5555, chen@supervisor.com" }, { id: "CT-004", name: "第三方接口方", priority: "中", status: "待评审", owner: "王建国", date: "2026-03-01", desc: "区县教育局IT负责人待确认" }] },
  "notice": { section: "COMMUNICATION 沟通管理", rows: [{ id: "NT-001", name: "项目组织结构调整通知", priority: "中", status: "已确认", owner: "张明远", date: "2026-02-01", desc: "新增移动端开发小组，由孙移动负责" }, { id: "NT-002", name: "需求变更公告", priority: "高", status: "已确认", owner: "张明远", date: "2026-04-02", desc: "食堂管理模块已纳入项目范围" }, { id: "NT-003", name: "系统维护窗口通知", priority: "中", status: "待评审", owner: "陈工", date: "2026-07-01", desc: "计划7月15日晚间进行系统维护升级" }] },
  "weekly": { section: "COMMUNICATION 沟通管理", rows: [{ id: "WR-001", name: "第8周例会纪要", priority: "中", status: "已确认", owner: "张明远", date: "2026-04-15", desc: "本周完成需求评审，下周开始架构设计" }, { id: "WR-002", name: "第10周例会纪要", priority: "中", status: "已确认", owner: "张明远", date: "2026-05-01", desc: "设计阶段进展正常，准备进入开发阶段" }, { id: "WR-003", name: "第12周例会纪要", priority: "中", status: "已确认", owner: "张明远", date: "2026-05-15", desc: "核心模块开发进度60%，移动端资源需补充" }] },
  "client-comm": { section: "COMMUNICATION 沟通管理", rows: [{ id: "CC-001", name: "4月客户沟通记录", priority: "中", status: "已确认", owner: "赵小红", date: "2026-04-15", desc: "沟通食堂模块新增需求，客户理解需评估影响" }, { id: "CC-002", name: "3月客户沟通记录", priority: "中", status: "已确认", owner: "张明远", date: "2026-03-30", desc: "汇报需求调研进展，客户对进度满意" }, { id: "CC-003", name: "5月客户沟通记录", priority: "中", status: "评审中", owner: "张明远", date: "2026-05-20", desc: "演示核心功能原型，收集客户反馈意见" }, { id: "CC-004", name: "紧急沟通-安防方案调整", priority: "高", status: "评审中", owner: "刘安全", date: "2026-06-01", desc: "客户要求调整校园安防方案，增加AI识别功能" }] },
  "internal-review": { section: "COMMUNICATION 沟通管理", rows: [{ id: "IR-001", name: "架构设计内部评审", priority: "高", status: "已确认", owner: "李文华", date: "2026-04-10", desc: "评审通过，建议增加缓存层提升性能" }, { id: "IR-002", name: "代码质量评审", priority: "中", status: "已确认", owner: "技术负责人", date: "2026-06-15", desc: "前端代码需增强组件复用，后端SQL需优化" }, { id: "IR-003", name: "测试用例评审", priority: "中", status: "评审中", owner: "测试组长", date: "2026-06-20", desc: "测试覆盖率需提升至85%以上" }] },

  // RISK 风险管理
  "risk-register": { section: "RISK 风险管理", rows: [{ id: "RSK-001", name: "需求频繁变更风险", priority: "高", status: "评审中", owner: "张明远", date: "2026-04-01", desc: "食堂模块新增已发生，后续变更需严格控制" }, { id: "RSK-002", name: "人力资源不足风险", priority: "中", status: "评审中", owner: "张明远", date: "2026-04-05", desc: "移动端开发人员缺口2人，影响进度" }, { id: "RSK-003", name: "第三方接口延期风险", priority: "中", status: "待评审", owner: "王建国", date: "2026-04-08", desc: "区县教育局接口文档提供延迟" }, { id: "RSK-004", name: "数据安全风险", priority: "高", status: "评审中", owner: "安全工程师", date: "2026-05-01", desc: "教育数据涉及隐私，需通过等保三级" }, { id: "RSK-005", name: "技术方案风险", priority: "低", status: "已确认", owner: "李文华", date: "2026-05-10", desc: "新技术选型经验不足，已安排专项培训" }] },
  "issue-track": { section: "RISK 风险管理", rows: [{ id: "ISS-001", name: "移动端开发人员招聘", priority: "高", status: "评审中", owner: "张明远", date: "2026-04-05", desc: "需招聘2名React Native开发，HR已启动" }, { id: "ISS-002", name: "测试环境不稳定", priority: "中", status: "评审中", owner: "陈工", date: "2026-06-01", desc: "测试服务器频繁宕机，需排查硬件问题" }, { id: "ISS-003", name: "客户需求理解偏差", priority: "中", status: "已确认", owner: "赵小红", date: "2026-04-08", desc: "食堂模块需求细节与客户理解有偏差，已澄清" }, { id: "ISS-004", name: "代码质量不达标", priority: "低", status: "评审中", owner: "技术负责人", date: "2026-06-15", desc: "部分模块代码规范度不足，安排重构" }] },
  "emergency": { section: "RISK 风险管理", rows: [{ id: "EM-001", name: "数据泄露应急预案", priority: "高", status: "已确认", owner: "安全工程师", date: "2026-03-01", desc: "发现数据泄露后30分钟内启动应急响应" }, { id: "EM-002", name: "系统宕机应急预案", priority: "高", status: "已确认", owner: "陈工", date: "2026-03-05", desc: "核心系统宕机后15分钟内启动备用节点" }, { id: "EM-003", name: "关键人员离职应急预案", priority: "中", status: "已确认", owner: "张明远", date: "2026-03-10", desc: "核心岗位设立AB角，确保知识传承" }] },
  "risk-action": { section: "RISK 风险管理", rows: [{ id: "RA-001", name: "需求变更控制措施", priority: "高", status: "评审中", owner: "张明远", date: "2026-04-02", desc: "建立CCB变更控制委员会，严格评估每次变更" }, { id: "RA-002", name: "人力补充措施", priority: "中", status: "评审中", owner: "张明远", date: "2026-04-06", desc: "加速移动端招聘，考虑外包补充" }, { id: "RA-003", name: "第三方接口催办", priority: "中", status: "评审中", owner: "王建国", date: "2026-04-09", desc: "发送正式催办函，安排专人驻场跟进" }] },
  "dep-matrix": { section: "RISK 风险管理", rows: [{ id: "DM-001", name: "认证→数据中台依赖", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-15", desc: "数据中台依赖认证系统提供用户身份信息" }, { id: "DM-002", name: "数据中台→智慧课堂依赖", priority: "中", status: "已确认", owner: "李文华", date: "2026-03-16", desc: "智慧课堂依赖数据中台提供学生和课程数据" }, { id: "DM-003", name: "接口→外部系统依赖", priority: "中", status: "评审中", owner: "王建国", date: "2026-03-17", desc: "家校互通依赖区县教育局系统接口" }] },

  // DOCS 文档管理
  "tech-plan": { section: "DOCS 文档管理", rows: [{ id: "DT-001", name: "系统架构设计方案", priority: "高", status: "已确认", owner: "李文华", date: "2026-04-01", desc: "含总体架构、技术选型和部署方案" }, { id: "DT-002", name: "数据中台技术方案", priority: "高", status: "已确认", owner: "李文华", date: "2026-04-10", desc: "数据采集、存储、计算各层技术方案" }, { id: "DT-003", name: "接口规范文档", priority: "中", status: "评审中", owner: "王建国", date: "2026-04-20", desc: "含RESTful API规范和GraphQL接口定义" }] },
  "deploy-manual": { section: "DOCS 文档管理", rows: [{ id: "DMN-001", name: "生产环境部署手册", priority: "高", status: "评审中", owner: "陈工", date: "2026-08-01", desc: "含服务器配置、网络拓扑和部署步骤" }, { id: "DMN-002", name: "数据库部署手册", priority: "中", status: "待评审", owner: "李文华", date: "2026-08-05", desc: "数据库集群搭建和备份策略" }, { id: "DMN-003", name: "容器化部署指南", priority: "中", status: "待评审", owner: "陈工", date: "2026-08-10", desc: "基于Kubernetes的容器化部署方案" }] },
  "user-manual": { section: "DOCS 文档管理", rows: [{ id: "UM-001", name: "系统管理员手册", priority: "高", status: "评审中", owner: "陈工", date: "2026-08-15", desc: "系统管理功能操作说明" }, { id: "UM-002", name: "教师操作手册", priority: "中", status: "待评审", owner: "王建国", date: "2026-08-20", desc: "智慧课堂教师端操作指南" }, { id: "UM-003", name: "家长端操作手册", priority: "中", status: "待评审", owner: "赵小红", date: "2026-08-22", desc: "家长端App使用说明" }, { id: "UM-004", name: "运维操作手册", priority: "中", status: "待评审", owner: "陈工", date: "2026-08-25", desc: "日常运维和故障处理操作指南" }] },
  "training": { section: "DOCS 文档管理", rows: [{ id: "TRN-001", name: "教师培训方案", priority: "中", status: "已确认", owner: "赵小红", date: "2026-08-01", desc: "分3批进行培训，每批2天" }, { id: "TRN-002", name: "管理员培训材料", priority: "中", status: "评审中", owner: "陈工", date: "2026-08-05", desc: "含PPT课件、操作视频和练习题" }, { id: "TRN-003", name: "培训考核方案", priority: "低", status: "待评审", owner: "赵小红", date: "2026-08-10", desc: "培训后考核标准和补考机制" }] },
  "accept-doc": { section: "DOCS 文档管理", rows: [{ id: "AD-001", name: "验收测试报告模板", priority: "中", status: "已确认", owner: "测试组长", date: "2026-09-01", desc: "含功能验收、性能验收和安全验收模板" }, { id: "AD-002", name: "交付物清单", priority: "高", status: "已确认", owner: "张明远", date: "2026-10-01", desc: "含软件、文档、培训等全部交付物" }, { id: "AD-003", name: "竣工报告模板", priority: "中", status: "已确认", owner: "张明远", date: "2026-11-01", desc: "项目竣工总结报告模板" }, { id: "AD-004", name: "售后服务承诺书", priority: "中", status: "评审中", owner: "张明远", date: "2026-12-01", desc: "含质保期、响应时间和维护承诺" }] },
  "ops-doc": { section: "DOCS 文档管理", rows: [{ id: "OD-001", name: "运维交接清单", priority: "高", status: "待评审", owner: "陈工", date: "2026-11-01", desc: "含运维账号、环境信息和监控配置" }, { id: "OD-002", name: "应急预案文档", priority: "中", status: "待评审", owner: "陈工", date: "2026-11-05", desc: "含各类故障场景的应急处理流程" }, { id: "OD-003", name: "运维值班手册", priority: "中", status: "待评审", owner: "陈工", date: "2026-11-10", desc: "日常巡检、监控和问题升级流程" }] },
  "release-note": { section: "DOCS 文档管理", rows: [{ id: "RN-001", name: "V1.0版本发布说明", priority: "高", status: "待评审", owner: "王建国", date: "2026-08-01", desc: "首个正式发布版本，含所有核心功能" }, { id: "RN-002", name: "V1.1版本发布说明", priority: "中", status: "待评审", owner: "王建国", date: "2026-09-01", desc: "修复V1.0已知问题，优化性能和体验" }, { id: "RN-003", name: "V1.2版本发布说明", priority: "中", status: "待评审", owner: "王建国", date: "2026-10-01", desc: "新增食堂管理模块和移动端功能" }] },
};

/* Product Data */
const products = [
  { name: "在线辅导系统", count: 2, status: "used" },
  { name: "在线考试系统", count: 1, status: "used" },
  { name: "师资培训系统", count: 1, status: "used" },
  { name: "电子书包平台", count: 1, status: "used" },
  { name: "虚拟仿真实验", count: 1, status: "partial" },
  { name: "教学质量评估", count: 1, status: "used" },
  { name: "校园OA系统", count: 1, status: "used" },
  { name: "档案管理系统", count: 1, status: "used" },
  { name: "资产管理系统", count: 1, status: "used" },
  { name: "预算管理系统", count: 1, status: "partial" },
  { name: "视频会议系统", count: 1, status: "used" },
  { name: "远程教研平台", count: 1, status: "used" },
  { name: "数字图书馆", count: 1, status: "used" },
  { name: "校园门户网站", count: 1, status: "used" },
  { name: "消息推送平台", count: 1, status: "used" },
  { name: "数据可视化平台", count: 1, status: "used" },
  { name: "安全审计系统", count: 1, status: "partial" },
  { name: "日志分析平台", count: 1, status: "used" },
  { name: "代码托管平台", count: 1, status: "used" },
  { name: "持续集成平台", count: 1, status: "used" },
  { name: "自动化测试平台", count: 1, status: "partial" },
  { name: "项目管理平台", count: 1, status: "used" },
  { name: "文档协作平台", count: 1, status: "used" },
  { name: "知识管理平台", count: 1, status: "used" },
  { name: "即时通讯平台", count: 1, status: "used" },
  { name: "邮件系统", count: 1, status: "used" },
  { name: "短信平台", count: 1, status: "used" },
  { name: "微信公众号", count: 1, status: "used" },
];

/* ============================================================
   PhaseLayout Component
   ============================================================ */

interface PhaseLayoutProps {
  project: {
    id: string;
    project_name: string;
    project_code: string;
    project_type: string;
    project_stage: string;
    project_schema: string;
    status: string;
    created_at: string;
    customer_info?: {
      company_name?: string;
      contact_person?: string;
      contact_phone?: string;
      contact_email?: string;
    };
    channel_info?: Array<{
      company_name: string;
      contact_person?: string;
      contact_phone?: string;
    }>;
    procurement_modules?: string[];
    description?: string;
  };
  onBack: () => void;
}

const phaseStatuses = ["done", "done", "done", "active", "pending", "pending", "pending"];
const phaseProgress = [100, 100, 100, 60, 0, 0, 0];

const AI_REPLIES = [
  "根据当前项目数据分析，整体进度符合预期。开发阶段任务完成60%，略低于计划70%，建议关注移动端资源补充和第三方接口对接进度。",
  "需求变更管理需要加强。食堂模块新增已影响项目范围，建议CCB严格评估后续变更请求，避免范围蔓延。",
  "风险管理方面，人力资源不足和第三方接口延期是需要重点关注的风险项。建议加速招聘并安排专人跟进第三方对接。",
  "从预算执行情况看，一期预算使用率约65%，与进度匹配。服务器采购已完成，软件License费用在预算范围内。",
  "质量方面，已完成的模块代码审查通过率较高。建议在测试阶段加强边界条件和异常场景的覆盖。",
];

export function PhaseLayout({ project, onBack }: PhaseLayoutProps) {
  /* Theme */
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("phase-theme");
    if (stored === "dark") setDark(true);
  }, []);
  const toggleTheme = () => {
    setDark(prev => {
      const next = !prev;
      localStorage.setItem("phase-theme", next ? "dark" : "light");
      return next;
    });
  };

  /* Phase State */
  const [activePhase, setActivePhase] = useState(3);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [taskViewMode, setTaskViewMode] = useState<Record<string, boolean>>({});
  const [showSteps, setShowSteps] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  /* Nav Drawer */
  const [navOpen, setNavOpen] = useState(false);
  const [navActivePanel, setNavActivePanel] = useState("scope");

  /* AI Dialog */
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([]);

  /* Sub Content */
  const [subContent, setSubContent] = useState<{ key: string; label: string } | null>(null);

  /* Strip L2 */
  const [activePanel, setActivePanel] = useState("scope");
  const [l2Items, setL2Items] = useState(panelData.scope.items);

  /* Phase data helpers */
  const phaseKey = `p${activePhase}`;
  const currentPhase = taskData[phaseKey];
  const phaseStatus = phaseStatuses[activePhase] || "pending";

  const handlePanelEnter = (panelKey: string) => {
    setActivePanel(panelKey);
    if (panelData[panelKey]) {
      setL2Items(panelData[panelKey].items);
    }
  };

  const handleSubClick = (key: string, label: string) => {
    setNavOpen(false);
    showSubContent(key, label);
  };

  const handleNavPanelEnter = (panelKey: string) => {
    setNavActivePanel(panelKey);
  };

  const handleNavSubClick = (key: string, label: string) => {
    setNavOpen(false);
    showSubContent(key, label);
  };

  const showSubContent = (key: string, label: string) => {
    setSubContent({ key, label });
  };

  const closeSubContent = () => {
    setSubContent(null);
  };

  const switchPhase = (idx: number) => {
    setActivePhase(idx);
    setSelectedTask(null);
    setExpandedRow(null);
  };

  const showTaskDetail = (taskId: string) => {
    if (selectedTask === taskId && !expandedRow) {
      setSelectedTask(null);
      return;
    }
    setSelectedTask(taskId);
    setExpandedRow(null);
  };

  const toggleTaskView = (taskId: string) => {
    setTaskViewMode(prev => {
      const next = { ...prev };
      next[taskId] = !next[taskId];
      return next;
    });
  };

  const toggleRowDetail = (rowKey: string) => {
    setExpandedRow(prev => prev === rowKey ? null : rowKey);
  };

  const exportTaskCSV = (taskId: string) => {
    const task = taskData[taskId];
    if (!task) return;
    const header = "任务名称,步骤说明,步骤输入,步骤输出,执行角色,状态\n";
    const rows = task.rows.map(r => `"${r.name}","${r.desc}","${r.input}","${r.output}","${r.role}","${r.status}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${task.name}_任务明细.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendAI = () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput.trim();
    const reply = AI_REPLIES[Math.floor(Math.random() * AI_REPLIES.length)];
    setAiMessages(prev => [...prev, { role: "user", text: userMsg }, { role: "ai", text: reply }]);
    setAiInput("");
  };

  /* ================================================================
     Render: Sub-Content Area
     ================================================================ */
  const renderSubContent = () => {
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

    const rowsHtml = d.rows.map(r => {
      const pc = r.priority === "高" ? "high" : (r.priority === "中" ? "medium" : "low");
      const sc = r.status === "已确认" ? "done" : (r.status === "评审中" ? "active" : "pending");
      const sl = r.status === "已确认" ? "已完成" : (r.status === "评审中" ? "进行中" : "待开始");
      return (
        <tr key={r.id}>
          <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{r.id}</td>
          <td style={{ fontWeight: 600 }}>{r.name}</td>
          <td><span className={`sc-priority ${pc}`}>{r.priority}</span></td>
          <td><span className={`te-status ${sc}`}>{sl}</span></td>
          <td>{r.owner}</td>
          <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{r.date}</td>
          <td>{r.desc}</td>
        </tr>
      );
    });

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
            <thead>
              <tr><th>编号</th><th>需求名称</th><th>优先级</th><th>状态</th><th>负责人</th><th>日期</th><th>需求描述</th></tr>
            </thead>
            <tbody>{rowsHtml}</tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ================================================================
     Render: Task Detail V27 (Card View)
     ================================================================ */
  const renderTaskCardV27 = (taskId: string) => {
    const task = taskData[taskId];
    if (!task) return null;

    const isV28 = taskViewMode[taskId];

    if (isV28) {
      /* V28 Table View */
      return (
        <div className="td-section">
          <div className="task-expand-actions">
            <button className="export-btn" onClick={() => exportTaskCSV(taskId)}>导出 CSV</button>
            <button className="view-toggle-btn" onClick={() => toggleTaskView(taskId)}>切换视图 (卡片)</button>
          </div>
          <div className="td-table-view">
            <table>
              <thead>
                <tr><th>任务名称</th><th>步骤说明</th><th>步骤输入</th><th>步骤输出</th><th>执行角色</th><th>状态</th><th></th></tr>
              </thead>
              <tbody>
                {task.rows.map((r, ri) => {
                  const rk = `${taskId}-${ri}`;
                  const sc = r.status === "已完成" ? "done" : (r.status === "进行中" ? "active" : "pending");
                  return (
                    <React.Fragment key={rk}>
                      <tr className={expandedRow === rk ? "row-selected" : ""} onClick={() => toggleRowDetail(rk)}>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td className="td-desc">{r.desc}</td>
                        <td>{r.input}</td>
                        <td>{r.output}</td>
                        <td>{r.role}</td>
                        <td><span className={`te-status ${sc}`}>{r.status}</span></td>
                        <td className="td-action">{expandedRow === rk ? "▲" : "▼"}</td>
                      </tr>
                      {expandedRow === rk && (
                        <tr>
                          <td colSpan={7} style={{ padding: 0 }}>
                            <div className="row-detail-panel">
                              <div className="row-detail-field"><span className="row-detail-lbl">步骤说明</span><span className="row-detail-val">{r.desc}</span></div>
                              <div className="row-detail-field"><span className="row-detail-lbl">步骤输入</span><span className="row-detail-val">{r.input}</span></div>
                              <div className="row-detail-field"><span className="row-detail-lbl">步骤输出</span><span className="row-detail-val">{r.output}</span></div>
                              <div className="row-detail-field"><span className="row-detail-lbl">执行角色</span><span className="row-detail-val">{r.role}</span></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    /* V27 Card View */
    const statusClass = task.status === "done" ? "done" : (task.status === "active" ? "active" : "pending");
    const statusLabel = task.status === "done" ? "已完成" : (task.status === "active" ? "进行中" : "待开始");
    const sc = (r: { status: string }) => r.status === "已完成" ? "done" : (r.status === "进行中" ? "active" : "pending");

    return (
      <div className="td-section">
        <div className="task-expand-actions">
          <button className="export-btn" onClick={() => exportTaskCSV(taskId)}>导出 CSV</button>
          <button className="view-toggle-btn" onClick={() => toggleTaskView(taskId)}>切换视图 (表格)</button>
        </div>
        <div className="td-card-header">
          <div className="td-card-header-left">
            <span className="td-card-name">{task.name}</span>
            <span className={`td-card-badge ${statusClass}`}>{statusLabel}</span>
          </div>
        </div>
        <div className="td-field-grid">
          <div className="td-field-card"><span className="td-fc-label">步骤数量</span><span className="td-fc-value big">{task.totalSteps}</span></div>
          <div className="td-field-card"><span className="td-fc-label">已完成步骤</span><span className="td-fc-value big">{task.doneSteps}</span></div>
          <div className="td-field-card"><span className="td-fc-label">开始日期</span><span className="td-fc-value">{task.startDate}</span></div>
          <div className="td-field-card"><span className="td-fc-label">结束日期</span><span className="td-fc-value">{task.endDate}</span></div>
        </div>
        <div className="td-desc-block">
          <span className="td-fc-label">任务说明</span>
          <span className="td-fc-value">{task.desc}</span>
        </div>
        <div className="td-steps-section">
          <div className="td-steps-header" onClick={() => setShowSteps(!showSteps)}>
            <span className="td-steps-title">步骤明细</span>
            <span className={`td-steps-toggle ${showSteps ? "open" : ""}`}>▼</span>
          </div>
          {showSteps && (
            <div className="td-steps-table-wrap">
              <table>
                <thead>
                  <tr><th>描述</th><th>输入</th><th>输出</th><th>角色</th><th>状态</th></tr>
                </thead>
                <tbody>
                  {task.rows.map((r, ri) => (
                    <tr key={ri}>
                      <td>{r.desc}</td>
                      <td>{r.input}</td>
                      <td>{r.output}</td>
                      <td>{r.role}</td>
                      <td><span className={`te-status ${sc(r)}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ================================================================
     Main Render
     ================================================================ */
  const displayPhaseDates = phaseDates[activePhase];
  const displayPhaseDesc = phaseDescriptions[activePhase];

  const donePhases = phaseStatuses.filter(s => s === "done").length;
  const totalTasks = Object.values(taskData).reduce((sum, t) => sum + t.totalSteps, 0);
  const doneTasks = Object.values(taskData).reduce((sum, t) => sum + t.doneSteps, 0);
  const overallProgress = Math.round((doneTasks / totalTasks) * 100);

  /* Chart Data */
  const statusCounts = { done: 0, active: 0, pending: 0 };
  Object.values(taskData).forEach(t => {
    t.rows.forEach(r => {
      if (r.status === "已完成") statusCounts.done++;
      else if (r.status === "进行中") statusCounts.active++;
      else statusCounts.pending++;
    });
  });
  const totalStepsAll = statusCounts.done + statusCounts.active + statusCounts.pending;

  return (
    <div className={`phase-layout${dark ? " dark" : ""}`}>
      {/* Left Hover Strip */}
      <div className="left-strip-wrap">
        <div className="left-strip">
          <div className="strip-inner">
            <div className="strip-l1">
              {Object.entries(panelData).map(([key, val]) => (
                <div
                  key={key}
                  className={`strip-item${activePanel === key ? " active" : ""}`}
                  onMouseEnter={() => handlePanelEnter(key)}
                >
                  <span className="si-line" />
                  {val.title.replace(/^(SCOPE|DEMAND|PROGRESS|QUALITY|COST|COMMUNICATION|RISK|DOCS)\s/, "")}
                </div>
              ))}
            </div>
            <div className="strip-divider" />
            <div className="strip-l2">
              <div className="strip-l2-header">{panelData[activePanel]?.title || ""}</div>
              {l2Items.map(item => (
                item.link ? (
                  <a key={item.key} className="strip-sub-item" href={item.link} target="_blank" rel="noopener noreferrer">
                    <span className="sub-dot" />
                    {item.label}
                    {item.count !== undefined && <span className="sub-badge">{item.count}</span>}
                  </a>
                ) : (
                  <div
                    key={item.key}
                    className={`strip-sub-item${subContent?.key === item.key ? " active" : ""}`}
                    onClick={() => handleSubClick(item.key, item.label)}
                  >
                    <span className="sub-dot" />
                    {item.label}
                    {item.count !== undefined && <span className="sub-badge">{item.count}</span>}
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Toolbar */}
      <div className="tl-toolbar">
        <button className={`tl-tool-btn${navOpen ? " active" : ""}`} onClick={() => setNavOpen(!navOpen)} title="导航菜单">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="8" x2="15" y2="10" /><line x1="15" y1="14" x2="15" y2="16" /></svg>
        </button>
        <button className="tl-tool-btn" onClick={() => { /* search placeholder */ }} title="搜索">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </button>
        <button className={`tl-tool-btn${aiOpen ? " active" : ""}`} onClick={() => { setAiOpen(!aiOpen); if (!aiOpen) setAiMessages([]); }} title="AI 助手">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
        </button>
        <button className="tl-tool-btn" onClick={toggleTheme} title="切换主题">
          {dark ? "☾" : "☀"}
        </button>
      </div>

      {/* Nav Drawer Overlay */}
      {navOpen && <div className="nav-overlay" onClick={() => setNavOpen(false)} />}

      {/* Nav Drawer */}
      <div className={`nav-drawer${navOpen ? " show" : ""}`}>
        <div className="nav-drawer-l1">
          {Object.entries(panelData).map(([key, val]) => (
            <div
              key={key}
              className={`strip-item${navActivePanel === key ? " active" : ""}`}
              onMouseEnter={() => handleNavPanelEnter(key)}
            >
              <span className="si-line" />
              {val.title.replace(/^(SCOPE|DEMAND|PROGRESS|QUALITY|COST|COMMUNICATION|RISK|DOCS)\s/, "")}
            </div>
          ))}
        </div>
        <div className="nav-drawer-divider" />
        <div className="nav-drawer-l2">
          <div className="nav-drawer-l2-header">{panelData[navActivePanel]?.title || ""}</div>
          {panelData[navActivePanel]?.items.map(item => (
            item.link ? (
              <a key={item.key} className="nav-drawer-sub" href={item.link} target="_blank" rel="noopener noreferrer">
                <span className="ns-dot" />{item.label}
                {item.count !== undefined && <span className="ns-badge">{item.count}</span>}
              </a>
            ) : (
              <div
                key={item.key}
                className={`nav-drawer-sub${subContent?.key === item.key ? " active" : ""}`}
                onClick={() => handleNavSubClick(item.key, item.label)}
              >
                <span className="ns-dot" />{item.label}
                {item.count !== undefined && <span className="ns-badge">{item.count}</span>}
              </div>
            )
          ))}
        </div>
      </div>

      {/* AI Dialog Overlay */}
      {aiOpen && <div className="ai-overlay show" onClick={() => setAiOpen(false)} />}

      {/* AI Dialog */}
      <div className={`ai-dialog${aiOpen ? " show" : ""}`}>
        <div className="ai-dialog-header">
          <div className="ai-dialog-title">
            <span className="ai-dot" />
            AI 项目助手
          </div>
          <button className="ai-dialog-close" onClick={() => setAiOpen(false)}>✕</button>
        </div>
        <div className="ai-dialog-body">
          {aiMessages.length === 0 && (
            <div className="ai-msg">你好！我是项目AI助手，可以帮你分析项目进度、识别风险、回答项目相关问题。请输入你的问题。</div>
          )}
          {aiMessages.map((m, i) => (
            <div key={i} className={`ai-msg${m.role === "user" ? " user" : ""}`}>{m.text}</div>
          ))}
        </div>
        <div className="ai-dialog-input-row">
          <input
            className="ai-dialog-input"
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") sendAI(); }}
            placeholder="输入问题，例如：当前项目有哪些延期风险？"
          />
          <button className="ai-dialog-send" onClick={sendAI}>发送</button>
        </div>
      </div>

      {/* Main Area */}
      <div className="phase-main-area">
        {subContent ? (
          renderSubContent()
        ) : (
          <>
            {/* Back Button */}
            <div style={{ padding: "16px 64px 0" }}>
              <Button variant="ghost" size="sm" onClick={onBack} style={{ color: "var(--text-secondary)" }}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回项目列表
              </Button>
            </div>

            {/* Hero */}
            <div className="hero">
              <div className="hero-grid">
                <div className="hero-left">
                  <div className="hero-label">项 目 详 情  /  PROJECT DETAILS</div>
                  <h1>{project.project_name}</h1>
                  <div className="hero-tags">
                    <span className="hero-tag status">{project.status || "实施中"}</span>
                    <span className="hero-tag type">{project.project_type || "A类重点项目"}</span>
                  </div>
                </div>
                <div className="hero-meta">
                  <div><span className="meta-stat accent">{overallProgress}%</span><span className="meta-label">总进度</span></div>
                  <div><span className="meta-stat green">{donePhases}/7</span><span className="meta-label">已完成阶段</span></div>
                  <div><span className="meta-stat">{totalTasks}</span><span className="meta-label">任务总数</span></div>
                  <div><span className="meta-stat">120</span><span className="meta-label">剩余天数</span></div>
                </div>
              </div>
              <div className="proj-info-bar">
                <div className="proj-info-card">
                  <span className="proj-info-label">客户名称</span>
                  <span className="proj-info-value">{project.customer_info?.company_name || "深圳市教育局"}</span>
                </div>
                <div className="proj-info-card">
                  <span className="proj-info-label">渠道方</span>
                  <span className="proj-info-value">{project.channel_info?.[0]?.company_name || "南山区教育局"}</span>
                </div>
                <div className="proj-info-card">
                  <span className="proj-info-label">业务部署模式</span>
                  <span className="proj-info-value">
                    <span className="pi-tag">本地部署</span>
                    <span className="pi-tag">私有云</span>
                  </span>
                </div>
                <div className="proj-info-card">
                  <span className="proj-info-label">编号 / 负责人</span>
                  <span className="proj-info-value">{project.project_code} · 张明远（研发二部）</span>
                </div>
              </div>
            </div>

            {/* Product Section */}
            <div className="product-section">
              <div className="product-section-label">已采购产品清单 · {products.length} 项</div>
              <div className="product-grid">
                {products.map((p, i) => (
                  <div className="product-item" key={i}>
                    <span className="pi-dot" />
                    {p.name}
                    {p.count > 1 && <span className="pi-count">×{p.count}</span>}
                    {p.status === "used" && <span className="pi-used" style={{ marginLeft: "auto" }}>已部署</span>}
                    {p.status === "partial" && <span className="pi-partial" style={{ marginLeft: "auto" }}>部分部署</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Section Divider */}
            <div className="section-head">
              <span className="section-head-label">当前阶段 · ACTIVE PHASE</span>
              <div className="section-head-line" />
            </div>

            {/* Phase Stepper */}
            <div className="timeline-section">
              <div className="stepper-track">
                {phaseLabels.map((label, i) => {
                  const s = phaseStatuses[i];
                  return (
                    <div key={i} className={`stepper-node ${s}`} onClick={() => switchPhase(i)}>
                      <div className="stepper-dot">{s === "done" ? "✓" : i + 1}</div>
                      <div className="stepper-label">{label}</div>
                      <div className="stepper-date">{phaseDates[i]}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Phase Detail */}
            <div className="phase-section">
              <div className="pd-detail">
                <div className="pd-left">
                  <div className="pd-status">
                    <span className="pd-status-dot" style={{ background: phaseStatus === "done" ? "var(--green)" : phaseStatus === "active" ? "var(--orange)" : "var(--text-muted)" }} />
                    {phaseStatus === "done" ? "进度正常" : phaseStatus === "active" ? "进行中" : "待开始"}
                  </div>
                  <h3>{currentPhase?.name || phaseLabels[activePhase]}</h3>
                  <p className="pd-desc">{displayPhaseDesc}</p>
                  <p className="pd-date">{displayPhaseDates}</p>
                  {currentPhase && (
                    <div className="pd-meta-grid">
                      <div className="pd-meta-item"><span className="pd-meta-val">{currentPhase.totalSteps}</span><span className="pd-meta-lbl">步骤数</span></div>
                      <div className="pd-meta-item"><span className="pd-meta-val">{currentPhase.doneSteps}</span><span className="pd-meta-lbl">已完成</span></div>
                      <div className="pd-meta-item"><span className="pd-meta-val">{currentPhase.startDate}</span><span className="pd-meta-lbl">开始日期</span></div>
                      <div className="pd-meta-item" style={{ gridColumn: "span 2" }}><span className="pd-meta-val">{currentPhase.endDate}</span><span className="pd-meta-lbl">结束日期</span></div>
                    </div>
                  )}
                </div>
                {currentPhase && (
                  <div className="pd-right">
                    <div className="pd-right-label">任务清单</div>
                    {currentPhase.rows.map((r, ri) => (
                      <div
                        key={ri}
                        className="pd-task-item"
                        onClick={() => showTaskDetail(phaseKey)}
                        style={{ fontWeight: selectedTask === phaseKey ? 600 : 400 }}
                      >
                        <span>{r.name}</span>
                        <span className="task-arrow">›</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {currentPhase && (
                <div className="pd-progress">
                  <div className="pd-progress-bar">
                    <div
                      className="pd-progress-fill"
                      style={{ width: `${Math.round((currentPhase.doneSteps / currentPhase.totalSteps) * 100)}%` }}
                    />
                  </div>
                  <span className="pd-progress-text">{Math.round((currentPhase.doneSteps / currentPhase.totalSteps) * 100)}%</span>
                </div>
              )}
            </div>

            {/* Task Detail */}
            {selectedTask && renderTaskCardV27(selectedTask)}

            {/* Progress Overview */}
            <div className="progress-section">
              <div className="section-head" style={{ padding: "0 0 16px 0", borderBottom: "none" }}>
                <span className="section-head-label">各阶段进度总览</span>
                <div className="section-head-line" />
              </div>
              <div className="progress-bars">
                {phaseLabels.map((label, i) => {
                  const pct = phaseProgress[i];
                  const color = pct === 100 ? "var(--green)" : pct > 0 ? "var(--orange)" : "var(--border-light)";
                  return (
                    <div className="progress-row" key={i}>
                      <span className="progress-row-label">{label}</span>
                      <div className="progress-row-bar">
                        <div className="progress-row-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                      <span className="progress-row-pct">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Charts */}
            <div className="charts-section" style={{ display: "flex" }}>
              <div className="chart-card">
                <div className="chart-title">任务状态分布</div>
                <svg width="180" height="180" viewBox="0 0 180 180">
                  {/* Pie chart */}
                  {(() => {
                    if (totalStepsAll === 0) return null;
                    const colors = ["var(--green)", "var(--orange)", "var(--border-light)"];
                    const values = [statusCounts.done, statusCounts.active, statusCounts.pending];
                    const total = values.reduce((a, b) => a + b, 0);
                    let cumulativeAngle = -Math.PI / 2;
                    const arcs: Array<{ d: string; color: string }> = [];
                    values.forEach((v, idx) => {
                      if (v === 0) return;
                      const sliceAngle = (v / total) * 2 * Math.PI;
                      const x1 = 90 + 70 * Math.cos(cumulativeAngle);
                      const y1 = 90 + 70 * Math.sin(cumulativeAngle);
                      cumulativeAngle += sliceAngle;
                      const x2 = 90 + 70 * Math.cos(cumulativeAngle);
                      const y2 = 90 + 70 * Math.sin(cumulativeAngle);
                      const largeArc = sliceAngle > Math.PI ? 1 : 0;
                      arcs.push({
                        d: `M 90 90 L ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} Z`,
                        color: colors[idx],
                      });
                    });
                    return arcs.map((arc, i) => <path key={i} d={arc.d} fill={arc.color} />);
                  })()}
                </svg>
                <div className="chart-legend">
                  <div className="chart-legend-item"><span className="chart-legend-dot" style={{ background: "var(--green)" }} />已完成 {statusCounts.done}</div>
                  <div className="chart-legend-item"><span className="chart-legend-dot" style={{ background: "var(--orange)" }} />进行中 {statusCounts.active}</div>
                  <div className="chart-legend-item"><span className="chart-legend-dot" style={{ background: "var(--border-light)" }} />待开始 {statusCounts.pending}</div>
                </div>
              </div>
              <div className="chart-card">
                <div className="chart-title">各阶段进度</div>
                <div className="progress-bars" style={{ width: "100%" }}>
                  {phaseLabels.map((label, i) => {
                    const pct = phaseProgress[i];
                    const color = pct === 100 ? "var(--green)" : pct > 0 ? "var(--orange)" : "var(--border-light)";
                    return (
                      <div className="progress-row" key={i}>
                        <span className="progress-row-label" style={{ width: 100, fontSize: 10 }}>{label.slice(0, 6)}</span>
                        <div className="progress-row-bar">
                          <div className="progress-row-fill" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="progress-row-pct">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
