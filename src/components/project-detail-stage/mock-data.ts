// ============================================================
// 阶段式布局 — 静态模拟数据
// 数据来源于 index-v54.html，待后期替换为真实 API 数据
// ============================================================

import type {
  PanelData,
  SubContentData,
  TaskData,
  PhaseNode,
  PhaseDetailData,
  OverviewItem,
  DonutSegment,
  BarDataItem,
} from "./types";

// ═══════════════════════════════════════════════════════════
// 导航面板数据 (panelData)
// ═══════════════════════════════════════════════════════════
export const panelData: PanelData = {
  scope: {
    title: "SCOPE 范围管理",
    items: [
      { label: "需求边界确认", count: 12, active: true, key: "req-boundary" },
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
      { label: "需求池", count: 24, key: "req-pool" },
      { label: "需求评审记录", count: 6, active: true, key: "req-review" },
      { label: "需求跟踪矩阵", count: 18, key: "req-matrix" },
      { label: "需求变更记录", count: 7, key: "req-change" },
      { label: "用户故事地图", count: 3, key: "user-story" },
      { label: "原型设计稿", count: 12, key: "prototype" },
    ],
  },
  progress: {
    title: "PROGRESS 进度管理",
    items: [],
  },
  quality: {
    title: "QUALITY 质量管理",
    items: [
      { label: "测试计划", count: 3, key: "test-plan" },
      { label: "缺陷跟踪", count: 47, active: true, key: "bug-track" },
      { label: "测试用例", count: 156, key: "test-case" },
      { label: "测试报告", count: 5, key: "test-report" },
      { label: "代码审查记录", count: 23, key: "code-review" },
      { label: "验收标准", count: 2, key: "accept-criteria" },
    ],
  },
  cost: {
    title: "COST 成本管理",
    items: [
      { label: "项目预算表", count: 1, key: "budget" },
      { label: "费用报销记录", count: 28, active: true, key: "expense" },
      { label: "采购清单", count: 12, key: "purchase" },
      { label: "工时统计", count: 4, key: "manhour" },
      { label: "合同付款节点", count: 5, key: "contract-pay" },
    ],
  },
  communication: {
    title: "COMMUNICATION 沟通管理",
    items: [
      { label: "会议纪要", count: 22, active: true, key: "meeting" },
      { label: "干系人通讯录", count: 8, key: "contacts" },
      { label: "通知公告", count: 5, key: "notice" },
      { label: "周例会记录", count: 16, key: "weekly" },
      { label: "客户沟通记录", count: 14, key: "client-comm" },
      { label: "内部评审记录", count: 9, key: "internal-review" },
    ],
  },
  risk: {
    title: "RISK 风险管理",
    items: [
      { label: "风险登记册", count: 9, active: true, key: "risk-register" },
      { label: "问题跟踪表", count: 14, key: "issue-track" },
      { label: "应急预案", count: 3, key: "emergency" },
      { label: "风险应对措施", count: 6, key: "risk-action" },
      { label: "依赖关系矩阵", count: 2, key: "dep-matrix" },
    ],
  },
  docs: {
    title: "DOCS 文档管理",
    items: [
      { label: "技术方案", count: 6, key: "tech-plan" },
      { label: "部署手册", count: 3, active: true, key: "deploy-manual" },
      { label: "用户操作手册", count: 4, key: "user-manual" },
      { label: "培训材料", count: 12, key: "training" },
      { label: "验收交付文档", count: 15, key: "accept-doc" },
      { label: "运维交接文档", count: 8, key: "ops-doc" },
      { label: "版本发布说明", count: 6, key: "release-note" },
    ],
  },
};

// ═══════════════════════════════════════════════════════════
// 子内容数据 (subContentData) — 钻取详情表
// ═══════════════════════════════════════════════════════════
export const subContentData: SubContentData = {
  // ── SCOPE 范围管理 ──
  "req-boundary": {
    title: "需求边界确认",
    section: "SCOPE 范围管理",
    rows: [
      { id: "RB-001", name: "统一认证对接范围", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-02", desc: "确认仅对接市教育局LDAP，不含区县级独立认证系统" },
      { id: "RB-002", name: "教务模块边界", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-03-03", desc: "含班级/学期/课程基础管理，不含智能排课算法" },
      { id: "RB-003", name: "数据迁移范围", priority: "中", status: "评审中", owner: "王梓轩", date: "2026-03-05", desc: "仅迁移近3年历史数据，不含10年以上归档数据" },
      { id: "RB-004", name: "第三方集成边界", priority: "中", status: "已确认", owner: "张明远", date: "2026-03-06", desc: "对接省考试院、市教育局平台，不含其他区县独立系统" },
      { id: "RB-005", name: "移动端覆盖范围", priority: "低", status: "确认中", owner: "李雨桐", date: "2026-03-08", desc: "教师端+家长端先行，学生端二期上线" },
    ],
  },
  "req-form": {
    title: "需求登记表",
    section: "SCOPE 范围管理",
    rows: [
      { id: "REQ-001", name: "统一身份认证", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-05", desc: "支持LDAP/OAuth2.0，对接市教育局统一认证平台" },
      { id: "REQ-002", name: "基础教务管理", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-03-06", desc: "包含班级管理、学期设置、基础数据维护等功能模块" },
      { id: "REQ-003", name: "成绩管理系统", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-03-08", desc: "支持多维度成绩录入、统计分析、成绩单导出，对接省考试院标准" },
      { id: "REQ-004", name: "在线考试系统", priority: "中", status: "评审中", owner: "张明远", date: "2026-03-10", desc: "支持题库管理、自动组卷、在线监考、成绩分析，需评估并发性能" },
      { id: "REQ-005", name: "校园一卡通", priority: "中", status: "确认中", owner: "李雨桐", date: "2026-03-12", desc: "消费、门禁、考勤一体化，需与现有硬件设备兼容" },
      { id: "REQ-006", name: "家校互通平台", priority: "低", status: "待评审", owner: "王梓轩", date: "2026-03-15", desc: "消息推送、作业通知、成绩查询、在线缴费等家长端功能" },
      { id: "REQ-007", name: "数据中台对接", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-18", desc: "统一数据标准，打通各业务系统数据孤岛，建立校级数据仓库" },
      { id: "REQ-008", name: "移动端适配", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-03-20", desc: "教师端/家长端/学生端三端适配，支持iOS和Android" },
    ],
  },
  "change-form": {
    title: "变更申请表",
    section: "SCOPE 范围管理",
    rows: [
      { id: "CR-001", name: "新增智能排课模块", priority: "高", status: "已确认", owner: "张明远", date: "2026-04-02", desc: "校方提出新增AI排课功能，已纳入二期范围，增补预算45万" },
      { id: "CR-002", name: "接口对接范围扩展", priority: "中", status: "评审中", owner: "李雨桐", date: "2026-04-08", desc: "新增区级教育平台数据同步接口，涉及3个区县" },
      { id: "CR-003", name: "硬件清单调整", priority: "中", status: "已确认", owner: "王梓轩", date: "2026-04-12", desc: "服务器配置由16核升至32核，存储扩容至50TB" },
      { id: "CR-004", name: "培训范围扩大", priority: "低", status: "确认中", owner: "张明远", date: "2026-04-15", desc: "新增家长端操作培训300人次，增补预算8万" },
    ],
  },
  "change-impact": {
    title: "变更影响评估",
    section: "SCOPE 范围管理",
    rows: [
      { id: "CI-001", name: "智能排课对进度影响", priority: "高", status: "已确认", owner: "张明远", date: "2026-04-05", desc: "新增排课模块预计延期12天，影响里程碑M4-M6" },
      { id: "CI-002", name: "接口扩展对集成影响", priority: "中", status: "评审中", owner: "李雨桐", date: "2026-04-10", desc: "3个区县接口需额外联调8天，需协调区级IT部门" },
      { id: "CI-003", name: "硬件升级对部署影响", priority: "中", status: "已确认", owner: "王梓轩", date: "2026-04-14", desc: "服务器采购周期约15天，不影响当前部署计划" },
      { id: "CI-004", name: "培训扩大对资源影响", priority: "低", status: "确认中", owner: "张明远", date: "2026-04-18", desc: "需协调培训讲师2人，场地和教材需提前2周准备" },
    ],
  },
  "scope-confirm": {
    title: "范围确认书",
    section: "SCOPE 范围管理",
    rows: [
      { id: "SC-001", name: "一期范围确认", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-01", desc: "基础平台+教务+成绩+考试+一卡通，共5大模块，预算2180万" },
      { id: "SC-002", name: "二期范围确认", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-05-15", desc: "排课+家校互通+数据中台，共3大模块，预算500万" },
      { id: "SC-003", name: "三期范围预留", priority: "中", status: "确认中", owner: "王梓轩", date: "2026-08-01", desc: "AI分析+物联网+VR教学，待一期验收后启动评估" },
    ],
  },
  wbs: {
    title: "WBS工作分解",
    section: "SCOPE 范围管理",
    rows: [
      { id: "WBS-01", name: "1.1 需求调研与分析", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-01", desc: "包含5所学校实地调研、需求文档编制、评审确认" },
      { id: "WBS-02", name: "1.2 系统架构设计", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-03-15", desc: "微服务架构设计、数据库设计、接口规范制定" },
      { id: "WBS-03", name: "2.1 统一认证模块开发", priority: "高", status: "已确认", owner: "张明远", date: "2026-04-01", desc: "LDAP/OAuth2.0对接、单点登录、权限管理" },
      { id: "WBS-04", name: "2.2 教务管理模块开发", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-04-15", desc: "班级管理、学期设置、课程管理、成绩录入" },
      { id: "WBS-05", name: "3.1 系统集成测试", priority: "中", status: "评审中", owner: "王梓轩", date: "2026-06-01", desc: "各模块联调测试、接口压力测试、安全测试" },
    ],
  },

  // ── DEMAND 需求管理 ──
  "req-pool": {
    title: "需求池",
    section: "DEMAND 需求管理",
    rows: [
      { id: "RP-001", name: "AI智能排课", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-10", desc: "基于约束求解算法自动生成课表，支持多维度优化" },
      { id: "RP-002", name: "VR虚拟实验室", priority: "中", status: "评审中", owner: "李雨桐", date: "2026-03-15", desc: "化学/物理虚拟实验环境，支持沉浸式教学体验" },
      { id: "RP-003", name: "智慧食堂系统", priority: "中", status: "确认中", owner: "王梓轩", date: "2026-03-20", desc: "人脸识别取餐、营养分析、在线充值、食堂评价" },
      { id: "RP-004", name: "物联网设备管理", priority: "低", status: "待评审", owner: "张明远", date: "2026-04-01", desc: "统一管理校园IoT设备，含智能灯控、环境监测等" },
      { id: "RP-005", name: "心理辅导平台", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-04-05", desc: "在线心理咨询预约、测评量表、危机预警" },
      { id: "RP-006", name: "校友管理系统", priority: "低", status: "待评审", owner: "王梓轩", date: "2026-04-12", desc: "校友信息库、活动管理、捐赠平台" },
    ],
  },
  "req-review": {
    title: "需求评审记录",
    section: "DEMAND 需求管理",
    rows: [
      { id: "RR-001", name: "智能排课需求评审", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-12", desc: "评审通过，确认纳入二期范围，需评估算法性能和约束条件" },
      { id: "RR-002", name: "VR实验室需求评审", priority: "中", status: "评审中", owner: "李雨桐", date: "2026-03-18", desc: "需补充硬件选型方案和预算评估，暂定三期考虑" },
      { id: "RR-003", name: "物联网设备管理评审", priority: "低", status: "已确认", owner: "王梓轩", date: "2026-04-08", desc: "评审通过，建议先做试点再推广，优先部署智慧灯控" },
      { id: "RR-004", name: "心理辅导平台评审", priority: "中", status: "已确认", owner: "张明远", date: "2026-04-10", desc: "评审通过，确认对接市级心理健康平台标准" },
    ],
  },
  "req-matrix": {
    title: "需求跟踪矩阵",
    section: "DEMAND 需求管理",
    rows: [
      { id: "RM-001", name: "REQ-001 统一身份认证", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-05", desc: "来源:教育局文件 → 设计:已完成 → 开发:进行中 → 测试:待开始" },
      { id: "RM-002", name: "REQ-002 基础教务管理", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-03-06", desc: "来源:校方调研 → 设计:已完成 → 开发:已完成 → 测试:进行中" },
      { id: "RM-003", name: "REQ-003 成绩管理系统", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-03-08", desc: "来源:省考试院标准 → 设计:进行中 → 开发:待开始 → 测试:待开始" },
      { id: "RM-004", name: "REQ-004 在线考试系统", priority: "中", status: "评审中", owner: "张明远", date: "2026-03-10", desc: "来源:校方调研 → 设计:待开始 → 开发:待开始 → 测试:待开始" },
      { id: "RM-005", name: "REQ-005 校园一卡通", priority: "中", status: "确认中", owner: "李雨桐", date: "2026-03-12", desc: "来源:校方调研 → 设计:待确认 → 开发:待开始 → 测试:待开始" },
    ],
  },
  "req-change": {
    title: "需求变更记录",
    section: "DEMAND 需求管理",
    rows: [
      { id: "RC-001", name: "认证方式变更", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-20", desc: "从单一LDAP扩展为LDAP+微信扫码双因子认证" },
      { id: "RC-002", name: "成绩报表格式变更", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-04-02", desc: "新增省考试院标准成绩单模板，替换原有自定义格式" },
      { id: "RC-003", name: "移动端UI调整", priority: "中", status: "确认中", owner: "王梓轩", date: "2026-04-15", desc: "家长端首页布局调整，新增快捷入口和消息中心" },
    ],
  },
  "user-story": {
    title: "用户故事地图",
    section: "DEMAND 需求管理",
    rows: [
      { id: "US-001", name: "教师-快速录入成绩", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-03-08", desc: "作为任课教师，我希望通过Excel模板批量导入成绩，节省逐个录入时间" },
      { id: "US-002", name: "家长-实时查看成绩", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-10", desc: "作为家长，我希望在手机上查看孩子各科成绩和班级排名" },
      { id: "US-003", name: "学生-在线参加考试", priority: "中", status: "评审中", owner: "王梓轩", date: "2026-03-15", desc: "作为学生，我希望通过浏览器完成在线考试，系统自动计时和提交" },
      { id: "US-004", name: "管理员-批量导入数据", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-03-20", desc: "作为系统管理员，我希望通过CSV批量导入师生基础数据" },
    ],
  },
  prototype: {
    title: "原型设计稿",
    section: "DEMAND 需求管理",
    rows: [
      { id: "PT-001", name: "教师端首页原型", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-03-05", desc: "Figma设计稿v2.3，包含快捷操作面板和待办事项列表" },
      { id: "PT-002", name: "家长端成绩查看原型", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-08", desc: "移动端原型，支持成绩趋势图和单科详细分析" },
      { id: "PT-003", name: "管理后台原型", priority: "中", status: "评审中", owner: "王梓轩", date: "2026-03-12", desc: "Web端后台管理原型，包含数据仪表盘和系统配置" },
    ],
  },

  // ── PROGRESS 进度管理 ──
  milestone: {
    title: "里程碑管理",
    section: "PROGRESS 进度管理",
    rows: [
      { id: "MS-01", name: "M1 需求确认完成", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-31", desc: "里程碑达成，所有需求文档已签确，范围确认书已归档" },
      { id: "MS-02", name: "M2 架构设计评审通过", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-04-15", desc: "微服务架构方案通过专家组评审，技术选型确认" },
      { id: "MS-03", name: "M3 核心模块开发完成", priority: "高", status: "评审中", owner: "李雨桐", date: "2026-05-31", desc: "教务+成绩+考试模块开发完成，进入联调阶段" },
      { id: "MS-04", name: "M4 系统集成测试", priority: "高", status: "评审中", owner: "王梓轩", date: "2026-06-30", desc: "所有模块集成测试，性能测试，安全测试" },
      { id: "MS-05", name: "M5 用户验收测试", priority: "中", status: "待评审", owner: "张明远", date: "2026-07-31", desc: "校方UAT验收，培训完成，试运行启动" },
      { id: "MS-06", name: "M6 正式上线", priority: "高", status: "待评审", owner: "李雨桐", date: "2026-09-30", desc: "系统正式切换上线，旧系统并行运行1个月后下线" },
    ],
  },
  daily: {
    title: "日报汇总",
    section: "PROGRESS 进度管理",
    rows: [
      { id: "DR-089", name: "2026-06-20 日报", priority: "中", status: "已确认", owner: "张明远", date: "2026-06-20", desc: "完成教务模块联调，修复3个Bug，成绩模块接口对接完成80%" },
      { id: "DR-088", name: "2026-06-19 日报", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-06-19", desc: "考试模块题库导入完成，一卡通硬件到货验收，部署环境准备" },
      { id: "DR-087", name: "2026-06-18 日报", priority: "中", status: "已确认", owner: "王梓轩", date: "2026-06-18", desc: "安全测试进行中，发现2个中危漏洞已修复，压力测试TPS达标" },
      { id: "DR-086", name: "2026-06-17 日报", priority: "高", status: "已确认", owner: "张明远", date: "2026-06-17", desc: "紧急修复认证模块性能问题，优化数据库查询，TPS提升40%" },
    ],
  },
  delay: {
    title: "延期预警",
    section: "PROGRESS 进度管理",
    rows: [
      { id: "DL-001", name: "一卡通硬件采购延迟", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-06-15", desc: "供应商产能不足，预计延期7天到货，影响M3里程碑，已启动备选方案" },
      { id: "DL-002", name: "第三方接口对接延迟", priority: "中", status: "评审中", owner: "李雨桐", date: "2026-06-18", desc: "省考试院接口文档版本更新，需重新适配，预计延期5天" },
      { id: "DL-003", name: "培训场地协调延迟", priority: "低", status: "确认中", owner: "张明远", date: "2026-06-22", desc: "暑期学校场地紧张，培训计划可能推迟至8月中旬" },
    ],
  },

  // ── QUALITY 质量管理 ──
  "test-plan": {
    title: "测试计划",
    section: "QUALITY 质量管理",
    rows: [
      { id: "TP-001", name: "单元测试计划", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-04-01", desc: "覆盖率目标≥80%，使用Jest框架，每个模块独立测试套件" },
      { id: "TP-002", name: "集成测试计划", priority: "高", status: "已确认", owner: "张明远", date: "2026-05-01", desc: "模块间接口联调测试，覆盖所有API端点，使用Postman+Newman" },
      { id: "TP-003", name: "性能测试计划", priority: "中", status: "评审中", owner: "王梓轩", date: "2026-06-01", desc: "并发5000用户，TPS≥1000，响应时间<2s，使用JMeter" },
    ],
  },
  "bug-track": {
    title: "缺陷跟踪",
    section: "QUALITY 质量管理",
    rows: [
      { id: "BUG-047", name: "成绩导入Excel格式兼容", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-06-10", desc: "部分学校使用的WPS格式导入后乱码，需增加格式兼容处理" },
      { id: "BUG-046", name: "移动端iOS闪退", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-06-12", desc: "iOS 17.5版本下家长端查看成绩详情时随机闪退，已定位内存泄漏" },
      { id: "BUG-045", name: "并发考试提交超时", priority: "中", status: "评审中", owner: "张明远", date: "2026-06-15", desc: "500人同时提交试卷时出现超时，需优化提交队列和数据库锁" },
      { id: "BUG-044", name: "权限缓存未及时刷新", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-06-18", desc: "修改用户权限后需等待5分钟才生效，改为实时刷新" },
    ],
  },
  "test-case": {
    title: "测试用例",
    section: "QUALITY 质量管理",
    rows: [
      { id: "TC-001", name: "登录认证-正常流程", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-04-05", desc: "验证LDAP账号密码登录、SSO单点登录、Token有效期" },
      { id: "TC-002", name: "成绩录入-批量导入", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-04-08", desc: "验证Excel模板导入500条成绩数据，校验格式和异常处理" },
      { id: "TC-003", name: "在线考试-并发提交", priority: "高", status: "评审中", owner: "张明远", date: "2026-05-15", desc: "模拟1000人同时在线考试并提交，验证系统稳定性" },
    ],
  },
  "test-report": {
    title: "测试报告",
    section: "QUALITY 质量管理",
    rows: [
      { id: "TR-001", name: "第一轮集成测试报告", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-05-20", desc: "通过率92%，发现缺陷47个，其中高优3个已修复，中优18个修复中" },
      { id: "TR-002", name: "性能测试报告", priority: "高", status: "已确认", owner: "张明远", date: "2026-06-10", desc: "5000并发测试通过，TPS达1200，平均响应时间1.8s，P99响应2.5s" },
    ],
  },
  "code-review": {
    title: "代码审查记录",
    section: "QUALITY 质量管理",
    rows: [
      { id: "CRV-023", name: "认证模块代码审查", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-04-10", desc: "审查通过，代码规范符合要求，安全性检查无重大问题" },
      { id: "CRV-022", name: "教务模块代码审查", priority: "中", status: "已确认", owner: "张明远", date: "2026-04-18", desc: "发现3处性能优化建议，已记录并安排优化" },
      { id: "CRV-021", name: "成绩模块代码审查", priority: "中", status: "评审中", owner: "李雨桐", date: "2026-05-05", desc: "审查进行中，已标记2处SQL注入风险需修复" },
    ],
  },
  "accept-criteria": {
    title: "验收标准",
    section: "QUALITY 质量管理",
    rows: [
      { id: "AC-001", name: "功能验收标准", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-01", desc: "所有需求文档中的功能点100%实现并通过UAT测试" },
      { id: "AC-002", name: "性能验收标准", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-03-01", desc: "并发5000用户，TPS≥1000，页面响应<2s，可用性≥99.9%" },
    ],
  },

  // ── COST 成本管理 ──
  budget: {
    title: "项目预算表",
    section: "COST 成本管理",
    rows: [
      { id: "BD-001", name: "软件开发费用", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-01", desc: "¥1,580万，含需求分析、设计、开发、测试全周期" },
      { id: "BD-002", name: "硬件采购费用", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-03-05", desc: "¥620万，含服务器、网络设备、一卡通硬件、终端设备" },
      { id: "BD-003", name: "实施服务费用", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-03-10", desc: "¥320万，含部署实施、数据迁移、培训服务" },
      { id: "BD-004", name: "运维服务费用", priority: "中", status: "确认中", owner: "张明远", date: "2026-03-15", desc: "¥160万/年，含系统运维、技术支持、版本升级" },
    ],
  },
  expense: {
    title: "费用报销记录",
    section: "COST 成本管理",
    rows: [
      { id: "EX-028", name: "差旅费-深圳中学调研", priority: "中", status: "已确认", owner: "张明远", date: "2026-03-08", desc: "¥3,200，3人2天深圳中学实地调研，含交通住宿" },
      { id: "EX-027", name: "服务器采购首付款", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-03-15", desc: "¥186万，DELL PowerEdge服务器×12台，含3年维保" },
      { id: "EX-026", name: "培训场地租赁", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-04-02", desc: "¥1.5万，市教育局培训中心3天场地租赁" },
      { id: "EX-025", name: "软件授权采购", priority: "高", status: "已确认", owner: "张明远", date: "2026-04-10", desc: "¥28万，Oracle数据库企业版授权×4套" },
    ],
  },
  purchase: {
    title: "采购清单",
    section: "COST 成本管理",
    rows: [
      { id: "PO-012", name: "应用服务器", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-03-10", desc: "DELL R750xs 32核/128G/1.92T SSD×8台，单价¥12万" },
      { id: "PO-011", name: "数据库服务器", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-03-10", desc: "DELL R750 32核/256G/3.84T SSD×4台，单价¥22.5万" },
      { id: "PO-010", name: "一卡通终端设备", priority: "中", status: "评审中", owner: "李雨桐", date: "2026-03-20", desc: "食堂消费机×30、门禁控制器×50、考勤机×20，¥68万" },
      { id: "PO-009", name: "网络交换机", priority: "中", status: "已确认", owner: "王梓轩", date: "2026-03-22", desc: "华为S6730-H48X6C×6台，单价¥3.5万" },
    ],
  },
  manhour: {
    title: "工时统计",
    section: "COST 成本管理",
    rows: [
      { id: "MH-004", name: "2026年4月工时", priority: "中", status: "已确认", owner: "张明远", date: "2026-05-01", desc: "开发组620h 测试组180h 产品组120h 管理组80h，合计1000h" },
      { id: "MH-003", name: "2026年5月工时", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-06-01", desc: "开发组580h 测试组220h 产品组100h 管理组80h，合计980h" },
      { id: "MH-002", name: "2026年6月工时", priority: "中", status: "评审中", owner: "王梓轩", date: "2026-07-01", desc: "开发组480h 测试组260h 产品组90h 管理组80h，合计910h" },
    ],
  },
  "contract-pay": {
    title: "合同付款节点",
    section: "COST 成本管理",
    rows: [
      { id: "CP-001", name: "合同签订首付款", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-01", desc: "30% ¥804万，合同签订后10个工作日内支付" },
      { id: "CP-002", name: "需求确认里程碑款", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-04-01", desc: "20% ¥536万，需求文档签确后支付" },
      { id: "CP-003", name: "系统上线验收款", priority: "高", status: "评审中", owner: "张明远", date: "2026-09-30", desc: "40% ¥1072万，系统正式上线并通过验收后支付" },
      { id: "CP-004", name: "质保期满尾款", priority: "中", status: "待评审", owner: "王梓轩", date: "2027-09-30", desc: "10% ¥268万，1年质保期满后支付" },
    ],
  },

  // ── COMMUNICATION 沟通管理 ──
  meeting: {
    title: "会议纪要",
    section: "COMMUNICATION 沟通管理",
    rows: [
      { id: "MT-022", name: "第22次周例会", priority: "中", status: "已确认", owner: "张明远", date: "2026-06-19", desc: "讨论了教务模块联调进展、一卡通硬件到货情况、下周工作计划" },
      { id: "MT-021", name: "需求变更评审会", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-06-15", desc: "评审智能排课模块新增需求，确认纳入二期，调整里程碑" },
      { id: "MT-020", name: "技术方案评审会", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-06-10", desc: "评审微服务拆分方案和数据迁移策略，通过技术方案" },
    ],
  },
  contacts: {
    title: "干系人通讯录",
    section: "COMMUNICATION 沟通管理",
    rows: [
      { id: "CT-008", name: "张局长-甲方负责人", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-01", desc: "深圳市教育局副局长，项目发起人，138xxxx8888" },
      { id: "CT-007", name: "王主任-信息中心", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-03-01", desc: "市教育局信息中心主任，技术对接人，139xxxx7777" },
      { id: "CT-006", name: "刘老师-教师代表", priority: "中", status: "已确认", owner: "王梓轩", date: "2026-03-05", desc: "深圳中学信息教师，需求调研对接人，136xxxx6666" },
    ],
  },
  notice: {
    title: "通知公告",
    section: "COMMUNICATION 沟通管理",
    rows: [
      { id: "NT-005", name: "系统维护通知", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-06-20", desc: "6月25日22:00-次日2:00进行数据库升级维护，期间系统暂停服务" },
      { id: "NT-004", name: "培训安排通知", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-06-15", desc: "7月1日-3日于市教育局培训中心举行管理员培训，请相关人员准时参加" },
    ],
  },
  weekly: {
    title: "周例会记录",
    section: "COMMUNICATION 沟通管理",
    rows: [
      { id: "WK-016", name: "第16周例会", priority: "中", status: "已确认", owner: "张明远", date: "2026-06-12", desc: "本周完成教务模块90%，下周进入联调；一卡通硬件预计6/18到货" },
      { id: "WK-015", name: "第15周例会", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-06-05", desc: "考试模块开发完成，进入测试阶段；发现3个中危Bug已修复" },
    ],
  },
  "client-comm": {
    title: "客户沟通记录",
    section: "COMMUNICATION 沟通管理",
    rows: [
      { id: "CC-014", name: "校方需求反馈-6月", priority: "高", status: "已确认", owner: "张明远", date: "2026-06-08", desc: "校方反馈：希望增加成绩分析报表的导出格式，支持PDF和Excel" },
      { id: "CC-013", name: "教育局接口规范确认", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-06-01", desc: "确认对接教育局数据上报接口规范v2.3，需更新适配代码" },
    ],
  },
  "internal-review": {
    title: "内部评审记录",
    section: "COMMUNICATION 沟通管理",
    rows: [
      { id: "IR-009", name: "架构设计内部评审", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-04-10", desc: "微服务架构方案内部评审通过，确认技术选型和部署方案" },
      { id: "IR-008", name: "安全方案内部评审", priority: "高", status: "已确认", owner: "张明远", date: "2026-04-20", desc: "安全架构评审通过，确认等保三级标准，补充数据加密方案" },
    ],
  },

  // ── RISK 风险管理 ──
  "risk-register": {
    title: "风险登记册",
    section: "RISK 风险管理",
    rows: [
      { id: "RK-009", name: "硬件供应链风险", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-03-10", desc: "服务器采购受国际芯片供应影响，预计到货周期延长，已预留15天缓冲" },
      { id: "RK-008", name: "人员流失风险", priority: "中", status: "评审中", owner: "张明远", date: "2026-04-01", desc: "核心开发人员有被竞品挖角风险，已启动人才储备计划" },
      { id: "RK-007", name: "需求蔓延风险", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-04-15", desc: "校方持续提出新增需求，需严格控制变更流程，避免范围蔓延" },
      { id: "RK-006", name: "数据安全风险", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-05-01", desc: "涉及学生隐私数据，需确保等保三级合规，已安排第三方安全审计" },
    ],
  },
  "issue-track": {
    title: "问题跟踪表",
    section: "RISK 风险管理",
    rows: [
      { id: "IS-014", name: "数据库性能瓶颈", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-06-05", desc: "高峰期数据库CPU使用率超90%，已扩容至32核并优化慢查询" },
      { id: "IS-013", name: "接口对接文档不一致", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-06-10", desc: "省考试院接口文档与实际返回格式不一致，需协调对方更新" },
      { id: "IS-012", name: "培训讲师资源不足", priority: "中", status: "评审中", owner: "张明远", date: "2026-06-15", desc: "原定3名培训讲师中1名离职，需紧急招聘或外部聘请" },
    ],
  },
  emergency: {
    title: "应急预案",
    section: "RISK 风险管理",
    rows: [
      { id: "EP-003", name: "数据库故障应急预案", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-04-01", desc: "主备切换自动故障转移，RPO<5分钟，RTO<15分钟，每季度演练一次" },
      { id: "EP-002", name: "网络攻击应急预案", priority: "高", status: "已确认", owner: "张明远", date: "2026-04-10", desc: "DDoS防护+WAF，攻击时自动切换高防IP，通知安全团队15分钟内响应" },
      { id: "EP-001", name: "数据泄露应急预案", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-04-15", desc: "发现泄露2小时内启动应急响应，通知甲方和监管机构，启动溯源" },
    ],
  },
  "risk-action": {
    title: "风险应对措施",
    section: "RISK 风险管理",
    rows: [
      { id: "RA-006", name: "硬件风险应对", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-03-15", desc: "与供应商签订SLA协议，逾期罚款；已联系2家备选供应商" },
      { id: "RA-005", name: "人员风险应对", priority: "中", status: "已确认", owner: "张明远", date: "2026-04-05", desc: "关键岗位AB角制度，每模块至少2人掌握；提供竞争力薪酬和成长空间" },
      { id: "RA-004", name: "需求蔓延应对", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-04-20", desc: "严格执行变更管理流程，新增需求需走CCB评审，评估影响后方可纳入" },
    ],
  },
  "dep-matrix": {
    title: "依赖关系矩阵",
    section: "RISK 风险管理",
    rows: [
      { id: "DM-002", name: "模块间依赖关系", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-04-01", desc: "认证→教务→成绩→考试，顺序依赖；一卡通独立，可并行开发" },
      { id: "DM-001", name: "外部系统依赖", priority: "高", status: "已确认", owner: "张明远", date: "2026-04-01", desc: "依赖市教育局统一认证平台和省考试院数据接口，需对方配合联调" },
    ],
  },

  // ── DOCS 文档管理 ──
  "tech-plan": {
    title: "技术方案",
    section: "DOCS 文档管理",
    rows: [
      { id: "TP-006", name: "微服务架构设计文档", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-03-20", desc: "v2.1版本，含服务拆分、通信协议、部署拓扑，共86页" },
      { id: "TP-005", name: "数据库设计文档", priority: "高", status: "已确认", owner: "张明远", date: "2026-03-25", desc: "ER图+表结构设计，含索引策略和分区方案，共52页" },
      { id: "TP-004", name: "接口规范文档", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-04-01", desc: "RESTful API规范，含认证、教务、成绩等模块共120+接口定义" },
      { id: "TP-003", name: "安全架构方案", priority: "中", status: "已确认", owner: "王梓轩", date: "2026-04-10", desc: "等保三级方案，含网络安全、数据加密、审计日志设计" },
    ],
  },
  "deploy-manual": {
    title: "部署手册",
    section: "DOCS 文档管理",
    rows: [
      { id: "DP-003", name: "生产环境部署手册", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-05-10", desc: "含K8s集群部署、数据库主备配置、负载均衡、监控告警配置" },
      { id: "DP-002", name: "灾备环境部署手册", priority: "高", status: "评审中", owner: "张明远", date: "2026-05-20", desc: "同城灾备方案，RPO<5分钟，含切换演练流程" },
      { id: "DP-001", name: "开发测试环境部署手册", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-04-01", desc: "Docker Compose一键部署方案，含Mock数据和测试用例" },
    ],
  },
  "user-manual": {
    title: "用户操作手册",
    section: "DOCS 文档管理",
    rows: [
      { id: "UM-004", name: "教师端操作手册", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-06-01", desc: "含成绩录入、考试管理、班级管理等模块操作指南，共45页" },
      { id: "UM-003", name: "家长端操作手册", priority: "高", status: "评审中", owner: "张明远", date: "2026-06-10", desc: "含成绩查看、消息通知、在线缴费等移动端操作指南，共28页" },
      { id: "UM-002", name: "管理员操作手册", priority: "中", status: "已确认", owner: "王梓轩", date: "2026-05-20", desc: "含系统配置、用户管理、数据维护等后台操作指南，共62页" },
    ],
  },
  training: {
    title: "培训材料",
    section: "DOCS 文档管理",
    rows: [
      { id: "TR-012", name: "教师培训PPT", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-06-15", desc: "含系统概述、成绩管理、考试管理3大模块培训课件，共120页" },
      { id: "TR-011", name: "管理员培训视频", priority: "中", status: "已确认", owner: "张明远", date: "2026-06-20", desc: "系统后台管理操作录屏教程，共12集，每集15-20分钟" },
      { id: "TR-010", name: "快速入门指南", priority: "中", status: "已确认", owner: "王梓轩", date: "2026-06-22", desc: "一页纸快速入门卡片，含常用功能入口和快捷键" },
    ],
  },
  "accept-doc": {
    title: "验收交付文档",
    section: "DOCS 文档管理",
    rows: [
      { id: "AD-015", name: "系统验收报告", priority: "高", status: "评审中", owner: "张明远", date: "2026-08-15", desc: "含功能验收清单、性能测试报告、安全审计报告" },
      { id: "AD-014", name: "源代码交付包", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-08-20", desc: "含全部源代码、构建脚本、环境配置、第三方依赖清单" },
      { id: "AD-013", name: "运维交接清单", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-08-25", desc: "含服务器清单、网络拓扑、账号密码、监控配置、应急预案" },
    ],
  },
  "ops-doc": {
    title: "运维交接文档",
    section: "DOCS 文档管理",
    rows: [
      { id: "OD-008", name: "日常运维SOP", priority: "高", status: "已确认", owner: "王梓轩", date: "2026-08-01", desc: "含日常巡检、备份恢复、日志清理、监控告警处理标准流程" },
      { id: "OD-007", name: "故障处理手册", priority: "高", status: "已确认", owner: "张明远", date: "2026-08-10", desc: "常见故障分类及处理方案，含数据库、网络、应用3大类共20+场景" },
      { id: "OD-006", name: "系统架构文档", priority: "中", status: "已确认", owner: "李雨桐", date: "2026-08-15", desc: "含部署架构图、网络拓扑、服务依赖关系，便于运维团队快速上手" },
    ],
  },
  "release-note": {
    title: "版本发布说明",
    section: "DOCS 文档管理",
    rows: [
      { id: "RN-006", name: "v1.2.0 版本发布", priority: "中", status: "已确认", owner: "王梓轩", date: "2026-06-15", desc: "新增成绩报表导出、修复Excel导入兼容问题、性能优化" },
      { id: "RN-005", name: "v1.1.0 版本发布", priority: "中", status: "已确认", owner: "张明远", date: "2026-05-20", desc: "新增在线考试模块、优化移动端加载速度、修复SSO登录问题" },
      { id: "RN-004", name: "v1.0.0 版本发布", priority: "高", status: "已确认", owner: "李雨桐", date: "2026-04-30", desc: "首个正式版本，含认证、教务、成绩三大核心模块" },
    ],
  },
};

// ═══════════════════════════════════════════════════════════
// 阶段定义 (stepper phases)
// ═══════════════════════════════════════════════════════════
export const phases: PhaseNode[] = [
  { index: 0, key: "phase0", label: "启动", title: "内部启动会", dateRange: "02.20–02.28", status: "done" },
  { index: 1, key: "phase1", label: "调研", title: "需求调研与方案确认", dateRange: "03.01–03.31", status: "done" },
  { index: 2, key: "phase2", label: "部署", title: "环境部署与平台搭建", dateRange: "04.01–04.30", status: "done" },
  { index: 3, key: "phase3", label: "开发", title: "核心系统开发与集成", dateRange: "05.01–06.30", status: "done" },
  { index: 4, key: "phase4", label: "试运行", title: "用户培训与试运行", dateRange: "07.01–08.15", status: "active" },
  { index: 5, key: "phase5", label: "上线", title: "正式上线与全面切换", dateRange: "08.16–09.15", status: "pending" },
  { index: 6, key: "phase6", label: "验收", title: "项目验收与交付", dateRange: "09.16–10.15", status: "pending" },
];

// ═══════════════════════════════════════════════════════════
// 阶段详情数据
// ═══════════════════════════════════════════════════════════
export const phaseDetails: Record<string, PhaseDetailData> = {
  phase0: {
    statusLabel: "已完成",
    statusClass: "done",
    name: "内部启动会",
    description: "召开项目内部启动会议，明确项目目标与范围，完成项目团队组建与管理制度建设。确立项目章程、沟通计划和风险管理预案。",
    dateRange: "2026.02.20 — 2026.02.28",
    metaItems: [
      { value: "8", label: "交付物" },
      { value: "9天", label: "周期" },
      { value: "5人", label: "投入人力" },
    ],
  },
  phase1: {
    statusLabel: "已完成",
    statusClass: "done",
    name: "需求调研与方案确认",
    description: "完成5所学校实地调研，输出需求规格说明书，通过技术方案评审。与校方确认合同条款并完成签订。",
    dateRange: "2026.03.01 — 2026.03.31",
    metaItems: [
      { value: "12", label: "交付物" },
      { value: "31天", label: "周期" },
      { value: "8人", label: "投入人力" },
    ],
  },
  phase2: {
    statusLabel: "已完成",
    statusClass: "done",
    name: "环境部署与平台搭建",
    description: "完成服务器硬件上架、网络环境部署、统一认证平台和数据中台基础服务搭建。完成与教育局学籍系统及人事系统的接口联调。",
    dateRange: "2026.04.01 — 2026.04.30",
    metaItems: [
      { value: "10", label: "交付物" },
      { value: "30天", label: "周期" },
      { value: "6人", label: "投入人力" },
    ],
  },
  phase3: {
    statusLabel: "已完成",
    statusClass: "done",
    name: "核心系统开发与集成",
    description: "完成学籍管理、教务排课、成绩管理、选课系统四大核心模块的开发与单元测试。通过高并发压力测试验证系统稳定性。",
    dateRange: "2026.05.01 — 2026.06.30",
    metaItems: [
      { value: "16", label: "交付物" },
      { value: "61天", label: "周期" },
      { value: "12人", label: "投入人力" },
    ],
  },
  phase4: {
    statusLabel: "进行中",
    statusClass: "active",
    name: "用户培训与试运行",
    description: "组织信息中心管理员、语数外及理综文综学科教师、学生家长的分层培训。收集试运行期间反馈意见，持续优化系统体验和修复缺陷。",
    dateRange: "2026.07.01 — 2026.08.15",
    metaItems: [
      { value: "12", label: "交付物" },
      { value: "46天", label: "周期" },
      { value: "10人", label: "投入人力" },
    ],
  },
  phase6: {
    statusLabel: "待开始",
    statusClass: "pending",
    name: "项目验收与交付",
    description: "汇总全部阶段输出文档，编制验收文档包（15份）。组织验收评审会，完成系统演示、评审验收和正式交付确认。",
    dateRange: "2026.09.16 — 2026.10.15",
    metaItems: [
      { value: "18", label: "交付物" },
      { value: "30天", label: "周期" },
      { value: "8人", label: "投入人力" },
    ],
  },
};

// 每个阶段的任务列表
export const phaseTasks: Record<string, { key: string; name: string; dotStatus: "done" | "active" | "pending" }[]> = {
  phase0: [
    { key: "p0t0", name: "项目立项", dotStatus: "done" },
    { key: "p0t1", name: "组建项目团队", dotStatus: "done" },
    { key: "p0t2", name: "项目管理制度建设", dotStatus: "done" },
  ],
  phase1: [
    { key: "p1t0", name: "现场调研", dotStatus: "done" },
    { key: "p1t1", name: "需求分析", dotStatus: "done" },
    { key: "p1t2", name: "方案评审", dotStatus: "done" },
    { key: "p1t3", name: "合同签订", dotStatus: "done" },
  ],
  phase2: [
    { key: "p2t0", name: "硬件上架", dotStatus: "done" },
    { key: "p2t1", name: "网络部署", dotStatus: "done" },
    { key: "p2t2", name: "平台安装", dotStatus: "done" },
    { key: "p2t3", name: "接口联调", dotStatus: "done" },
  ],
  phase3: [
    { key: "p3t0", name: "学籍管理", dotStatus: "done" },
    { key: "p3t1", name: "教务排课", dotStatus: "done" },
    { key: "p3t2", name: "成绩管理", dotStatus: "done" },
    { key: "p3t3", name: "选课系统", dotStatus: "done" },
  ],
  phase4: [
    { key: "p4t0", name: "管理员培训", dotStatus: "done" },
    { key: "p4t1", name: "教师培训", dotStatus: "done" },
    { key: "p4t2", name: "学生家长培训", dotStatus: "active" },
    { key: "p4t3", name: "试运行优化", dotStatus: "active" },
  ],
  phase6: [
    { key: "p6t0", name: "文档整理", dotStatus: "pending" },
    { key: "p6t1", name: "验收评审", dotStatus: "pending" },
    { key: "p6t2", name: "正式交付", dotStatus: "pending" },
  ],
};

// ═══════════════════════════════════════════════════════════
// 任务步骤数据 (taskData)
// ═══════════════════════════════════════════════════════════
export const taskData: TaskData = {
  p0t0: {
    name: "项目立项",
    rows: [
      { desc: "编制项目立项申请报告", input: "项目意向书", output: "立项申请报告", role: "项目经理 / 张明远", status: "done", label: "DONE" },
      { desc: "提交公司内部审批流程", input: "立项申请报告", output: "立项批文", role: "项目经理 / 张明远", status: "done", label: "DONE" },
      { desc: "项目编号注册与备案", input: "立项批文", output: "项目编号 SCP-2026-0012", role: "PMO / 王丽", status: "done", label: "DONE" },
    ],
  },
  p0t1: {
    name: "组建项目团队",
    rows: [
      { desc: "确定项目经理与核心成员人选", input: "项目需求分析", output: "团队成员名单", role: "部门总监 / 周总", status: "done", label: "DONE" },
      { desc: "召开项目团队成立会议", input: "团队成员名单", output: "团队分工表", role: "项目经理 / 张明远", status: "done", label: "DONE" },
    ],
  },
  p0t2: {
    name: "项目管理制度建设",
    rows: [
      { desc: "制定项目沟通管理计划", input: "项目章程", output: "沟通计划", role: "项目经理 / 张明远", status: "done", label: "DONE" },
      { desc: "建立项目文档管理规范", input: "公司文档模板", output: "文档管理规范", role: "产品经理 / 李雨桐", status: "done", label: "DONE" },
      { desc: "制定项目风险管理预案", input: "项目计划", output: "风险管理预案", role: "项目经理 / 张明远", status: "done", label: "DONE" },
    ],
  },
  p1t0: {
    name: "现场调研",
    rows: [
      { desc: "走访教务处、学生处等科室", input: "访谈提纲", output: "科室访谈记录", role: "产品经理 / 陈思涵", status: "done", label: "DONE" },
      { desc: "实地查看机房、网络环境", input: "机房勘察表", output: "机房现状报告", role: "运维工程师 / 赵子涵", status: "done", label: "DONE" },
      { desc: "收集信息化现状数据", input: "数据采集模板", output: "信息化现状数据表", role: "产品经理 / 陈思涵", status: "done", label: "DONE" },
    ],
  },
  p1t1: {
    name: "需求分析",
    rows: [
      { desc: "整理调研数据，梳理业务痛点", input: "调研报告", output: "需求清单 v1.0", role: "产品经理 / 李雨桐", status: "done", label: "DONE" },
      { desc: "编写需求规格说明书初稿", input: "需求清单、校方确认函", output: "需求规格说明书 v1.0", role: "产品经理 / 李雨桐", status: "done", label: "DONE" },
    ],
  },
  p1t2: {
    name: "方案评审",
    rows: [
      { desc: "编制技术选型方案", input: "需求说明书", output: "技术选型方案", role: "架构师 / 张明远", status: "done", label: "DONE" },
      { desc: "组织技术方案评审会", input: "技术选型方案", output: "评审会议纪要", role: "架构师 / 张明远", status: "done", label: "DONE" },
      { desc: "输出技术方案终稿", input: "评审意见", output: "技术方案终稿", role: "架构师 / 张明远", status: "done", label: "DONE" },
    ],
  },
  p1t3: {
    name: "合同签订",
    rows: [
      { desc: "编制项目报价单", input: "技术方案终稿", output: "项目报价单", role: "项目经理 / 张明远", status: "done", label: "DONE" },
      { desc: "与校方商务谈判", input: "报价单", output: "商务条款确认书", role: "项目经理 / 张明远", status: "done", label: "DONE" },
      { desc: "签署正式合同", input: "商务条款确认书", output: "正式合同", role: "项目经理 / 张明远", status: "done", label: "DONE" },
    ],
  },
  p2t0: {
    name: "硬件上架",
    rows: [
      { desc: "确认服务器采购清单", input: "技术方案", output: "采购清单", role: "运维工程师 / 赵子涵", status: "done", label: "DONE" },
      { desc: "服务器到货验收与上架", input: "采购清单", output: "上架确认单", role: "运维工程师 / 赵子涵", status: "done", label: "DONE" },
      { desc: "机房布线及电源接入", input: "机房平面图", output: "布线竣工图", role: "运维工程师 / 赵子涵", status: "done", label: "DONE" },
    ],
  },
  p2t1: {
    name: "网络部署",
    rows: [
      { desc: "规划校园网VLAN划分", input: "网络拓扑图", output: "VLAN规划表", role: "网络工程师 / 赵子涵", status: "done", label: "DONE" },
      { desc: "配置核心交换机与防火墙", input: "VLAN规划表", output: "网络配置文档", role: "网络工程师 / 赵子涵", status: "done", label: "DONE" },
    ],
  },
  p2t2: {
    name: "平台安装",
    rows: [
      { desc: "部署统一认证平台", input: "部署手册", output: "认证平台部署确认", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
      { desc: "部署数据中台基础服务", input: "部署手册", output: "数据中台部署确认", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
      { desc: "基础平台集成联调", input: "部署确认报告", output: "联调测试报告", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
    ],
  },
  p2t3: {
    name: "接口联调",
    rows: [
      { desc: "与教育局学籍系统接口对接", input: "接口文档", output: "学籍接口联调报告", role: "开发工程师 / 张明远", status: "done", label: "DONE" },
      { desc: "与人事系统接口对接", input: "接口文档", output: "人事接口联调报告", role: "开发工程师 / 张明远", status: "done", label: "DONE" },
    ],
  },
  p3t0: {
    name: "学籍管理",
    rows: [
      { desc: "学生入学、转班功能开发", input: "需求说明书、UI设计稿", output: "学籍管理模块 v1.0", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
      { desc: "毕业管理功能开发", input: "需求说明书", output: "毕业管理子模块", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
      { desc: "学籍管理模块单元测试", input: "测试用例", output: "测试报告", role: "测试工程师 / 刘思远", status: "done", label: "DONE" },
    ],
  },
  p3t1: {
    name: "教务排课",
    rows: [
      { desc: "排课算法设计与编码", input: "排课算法文档", output: "排课引擎 v1.0", role: "开发工程师 / 陈思涵", status: "done", label: "DONE" },
      { desc: "约束条件配置界面开发", input: "教师课表需求", output: "配置管理界面", role: "开发工程师 / 陈思涵", status: "done", label: "DONE" },
    ],
  },
  p3t2: {
    name: "成绩管理",
    rows: [
      { desc: "成绩录入功能开发", input: "成绩管理需求、数据模型", output: "成绩录入模块", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
      { desc: "统计分析功能开发", input: "数据模型", output: "统计分析模块", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
      { desc: "成绩报告生成功能", input: "报告模板", output: "报告生成模块", role: "开发工程师 / 王梓轩", status: "done", label: "DONE" },
    ],
  },
  p3t3: {
    name: "选课系统",
    rows: [
      { desc: "选课核心流程开发", input: "选课规则文档", output: "选课系统 v1.0", role: "开发工程师 / 赵子涵", status: "done", label: "DONE" },
      { desc: "高并发压力测试", input: "测试脚本", output: "压测报告", role: "测试工程师 / 刘思远", status: "done", label: "DONE" },
    ],
  },
  p4t0: {
    name: "管理员培训",
    rows: [
      { desc: "培训信息中心管理员系统后台操作", input: "管理员手册、培训PPT", output: "培训签到表", role: "培训讲师 / 陈思涵", status: "done", label: "DONE" },
      { desc: "管理员实操考核", input: "考核题库", output: "考核成绩单", role: "培训讲师 / 陈思涵", status: "done", label: "DONE" },
    ],
  },
  p4t1: {
    name: "教师培训",
    rows: [
      { desc: "语数外学科教师操作培训", input: "教师操作手册", output: "培训反馈表", role: "培训讲师 / 陈思涵", status: "done", label: "DONE" },
      { desc: "理综文综学科教师操作培训", input: "教师操作手册", output: "培训反馈表", role: "培训讲师 / 陈思涵", status: "done", label: "DONE" },
    ],
  },
  p4t2: {
    name: "学生家长培训",
    rows: [
      { desc: "录制使用指南视频", input: "使用指南脚本", output: "培训视频", role: "产品经理 / 李雨桐", status: "active", label: "ACTIVE" },
      { desc: "发布FAQ文档并组织在线答疑", input: "FAQ文档", output: "答疑记录", role: "产品经理 / 李雨桐", status: "active", label: "ACTIVE" },
    ],
  },
  p4t3: {
    name: "试运行优化",
    rows: [
      { desc: "收集试运行期间反馈意见", input: "反馈收集表", output: "反馈分类清单", role: "产品经理 / 李雨桐", status: "active", label: "ACTIVE" },
      { desc: "修复系统缺陷与性能优化", input: "Bug清单", output: "优化迭代版本", role: "开发团队", status: "active", label: "ACTIVE" },
      { desc: "用户体验优化调整", input: "用户反馈", output: "UX优化方案", role: "开发团队", status: "active", label: "ACTIVE" },
    ],
  },
  p6t0: {
    name: "文档整理",
    rows: [
      { desc: "汇总各阶段输出文档", input: "各阶段文档", output: "文档清单", role: "产品经理 / 李雨桐", status: "pending", label: "待开始" },
      { desc: "编制验收文档包(15份)", input: "文档清单", output: "验收文档包", role: "产品经理 / 李雨桐", status: "pending", label: "待开始" },
    ],
  },
  p6t1: {
    name: "验收评审",
    rows: [
      { desc: "准备演示环境", input: "验收文档包", output: "演示环境", role: "开发工程师 / 王梓轩", status: "pending", label: "待开始" },
      { desc: "组织验收评审会", input: "演示环境、验收文档", output: "评审意见", role: "项目经理 / 张明远", status: "pending", label: "待开始" },
      { desc: "签署验收报告", input: "评审意见", output: "验收报告", role: "项目经理 / 张明远", status: "pending", label: "待开始" },
    ],
  },
  p6t2: {
    name: "正式交付",
    rows: [
      { desc: "移交系统权限与运维手册", input: "验收报告、运维手册", output: "权限移交确认书", role: "项目经理 / 张明远", status: "pending", label: "待开始" },
      { desc: "签署交付确认书", input: "权限移交确认书", output: "交付确认书", role: "项目经理 / 张明远", status: "pending", label: "待开始" },
    ],
  },
};

// ═══════════════════════════════════════════════════════════
// 总览网格数据
// ═══════════════════════════════════════════════════════════
export const overviewItems: OverviewItem[] = [
  { name: "内部启动", completed: 8, total: 8, progress: 100, status: "done" },
  { name: "需求调研", completed: 12, total: 12, progress: 100, status: "done" },
  { name: "环境部署", completed: 10, total: 10, progress: 100, status: "done" },
  { name: "系统开发", completed: 16, total: 16, progress: 100, status: "done" },
  { name: "用户培训", completed: 5, total: 12, progress: 42, status: "active" },
  { name: "正式上线", completed: 0, total: 8, progress: 0, status: "pending" },
  { name: "项目验收", completed: 0, total: 6, progress: 0, status: "pending" },
];

// ═══════════════════════════════════════════════════════════
// 环形图数据
// ═══════════════════════════════════════════════════════════
export const donutData: DonutSegment[] = [
  { label: "已完成", count: 26, color: "var(--s-green)", percentage: 81 },
  { label: "进行中", count: 4, color: "var(--s-orange)", percentage: 13 },
  { label: "待开始", count: 2, color: "var(--s-text-muted)", percentage: 6 },
];

// ═══════════════════════════════════════════════════════════
// 条形图数据
// ═══════════════════════════════════════════════════════════
export const barData: BarDataItem[] = [
  { label: "启动", value: 8, progress: 100, color: "var(--s-chart-blue)" },
  { label: "调研", value: 12, progress: 100, color: "var(--s-chart-indigo)" },
  { label: "部署", value: 10, progress: 100, color: "var(--s-chart-sky)" },
  { label: "开发", value: 16, progress: 100, color: "var(--s-chart-purple)" },
  { label: "试运行", value: 7, progress: 58, color: "var(--s-chart-amber)" },
  { label: "上线", value: 6, progress: 0, color: "var(--s-chart-rose)" },
  { label: "验收", value: 6, progress: 0, color: "var(--s-chart-gray)" },
];
