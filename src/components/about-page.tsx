"use client";

import { useState } from "react";
import {
  ChevronRight,
  LayoutDashboard,
  FolderKanban,
  Wrench,
  Settings,
  ClipboardList,
  AlertTriangle,
  Megaphone,
  BookOpen,
  BriefcaseBusiness,
  Shield,
  Database,
  GitBranch,
  Users,
  Layers,
  Server,
  CheckCircle2,
  ArrowRight,
  FolderPlus,
  Container,
  Blocks,
  Package,
  FileText,
} from "lucide-react";

interface AboutPageProps {
  onNavigate?: (viewId: string) => void;
}

const NAV_SECTIONS = [
  { id: "overview", label: "项目概览", icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { id: "features", label: "功能模块", icon: <Layers className="w-3.5 h-3.5" /> },
  { id: "architecture", label: "技术架构", icon: <Server className="w-3.5 h-3.5" /> },
  { id: "docker", label: "Docker部署", icon: <Container className="w-3.5 h-3.5" /> },
  { id: "database", label: "数据库设计", icon: <Database className="w-3.5 h-3.5" /> },
  { id: "module-mgmt", label: "模块管理", icon: <Blocks className="w-3.5 h-3.5" /> },
  { id: "auth", label: "认证与权限", icon: <Shield className="w-3.5 h-3.5" /> },
  { id: "dashboard-detail", label: "看板预警", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  { id: "flow", label: "核心流程", icon: <GitBranch className="w-3.5 h-3.5" /> },
  { id: "project-flow", label: "创建项目", icon: <FolderPlus className="w-3.5 h-3.5" /> },
  { id: "schema-rules", label: "Schema 规则", icon: <FileText className="w-3.5 h-3.5" /> },
  { id: "permissions", label: "数据权限", icon: <Shield className="w-3.5 h-3.5" /> },
];

const FEATURE_MODULES = [
  {
    id: "dashboard",
    name: "项目看板",
    icon: <LayoutDashboard className="w-5 h-5" />,
    color: "bg-teal-500",
    viewId: "project-board",
    desc: "全局项目健康度监控，三大预警板块实时告警。",
    highlights: [
      "KPI 概览：项目总数/需求总数/高风险数/采购项等核心指标",
      "雷达图：十大模块健康度评分，快速定位薄弱环节",
      "三大预警板块：单指标阈值告警 / 趋势恶化预警 / 差值对比告警",
      "项目健康排名 + 薄弱点标注",
      "需求统计：完成率/积压量/处理周期/完成速度趋势图",
    ],
  },
  {
    id: "projects",
    name: "项目管理",
    icon: <FolderKanban className="w-5 h-5" />,
    color: "bg-blue-500",
    viewId: "projects",
    desc: "创建和管理项目，配置项目成员、客户信息、渠道信息和采购模块。",
    highlights: [
      "10大模块独立主题色（范围/进度/质量/成本/协同/沟通/风险/采购/资源/资料）",
      "8种数据视图：卡片/表格/网格/看板/树形/表单/甘特图/分组",
      "3种脉络追踪视图：色标脉络/进度条/瀑布图",
      "项目成员权限精细控制（8项权限）",
      "右侧面板：项目概览 + 任务列表 + 成员与权限",
      "采购模块支持模板导入导出与搜索过滤",
    ],
  },
  {
    id: "standards",
    name: "规范管理",
    icon: <Wrench className="w-5 h-5" />,
    color: "bg-violet-500",
    viewId: "standards",
    desc: "定义数据表结构和字段配置，支持同步到关联项目。",
    highlights: [
      "字段类型：文本/数字/日期/单选/多选/多行文本/采购模块选择",
      "支持按项目类型和阶段应用",
      "同步到项目：仅结构/仅数据/结构+数据三种模式",
      "适用阶段筛选 + 名称搜索 + 统计卡片",
      "文本字段支持快捷语配置，填写时一键选择",
      "行列矩阵权限模型：表级/行级/列级三级控制",
    ],
  },
  {
    id: "issues",
    name: "工单提交",
    icon: <AlertTriangle className="w-5 h-5" />,
    color: "bg-orange-500",
    viewId: "issues",
    desc: "问题工单全生命周期管理，与待办自动联动，支持外部提报。",
    highlights: [
      "Metro 磁贴导航：我的上报/问题管理/待办/知会抄送/数据统计",
      "状态流转：待受理→处理中→已完结/已驳回→已关闭",
      "创建工单自动写入待办任务",
      "支持转交/撤回/重新打开",
      "外部人员扫码提报工单（无需登录）",
      "附件上传、处理流水记录",
    ],
  },
  {
    id: "todos",
    name: "任务中心",
    icon: <ClipboardList className="w-5 h-5" />,
    color: "bg-emerald-500",
    viewId: "tasks",
    desc: "任务发布与管理，支持周期任务自动生成实例。",
    highlights: [
      "Metro 磁贴导航：统一待办/任务管理/发布任务/数据统计",
      "4步发布向导：基本信息→选择任务表单→指派实施人员→截止提醒",
      "周期任务：按日/周/月/年自动创建新实例",
      "普通任务：一次性任务，逾期提醒+允许补交",
      "表单来源：关联规范表/导入Excel建表",
      "统计看板：按人员/任务/项目的完成率排名",
      "统一待办：任务+工单+公告自动汇聚",
    ],
  },
  {
    id: "messages",
    name: "信息广场",
    icon: <Megaphone className="w-5 h-5" />,
    color: "bg-amber-500",
    viewId: "messages",
    desc: "公告通知、共享资料、经验分享、视频中心四大板块。",
    highlights: [
      "公告通知：管理员发布，置顶/已读追踪/评论",
      "共享资料：分类标签+资料类型筛选，支持视频在线播放",
      "经验分享：人人可发，点赞/收藏/评论",
      "视频中心：视频上传/在线播放/分享/模块分类筛选",
      "附件通过对象存储(S3)上传下载",
      "发布重要公告自动写入待办任务",
    ],
  },
  {
    id: "case-center",
    name: "案例中心",
    icon: <BriefcaseBusiness className="w-5 h-5" />,
    color: "bg-teal-500",
    viewId: "case-center",
    desc: "客户画像与产品案例库，积累和展示项目成果。",
    highlights: [
      "用户画像：客户档案/项目履历/沟通记录管理",
      "产品案例：按产品模块归档项目案例",
      "支持案例详情展示与成果沉淀",
    ],
  },
  {
    id: "settings",
    name: "系统设置",
    icon: <Settings className="w-5 h-5" />,
    color: "bg-gray-500",
    viewId: "settings",
    desc: "用户管理、角色权限、基础数据维护、工单配置。",
    highlights: [
      "用户管理：创建用户/角色分配/重置密码/启用禁用",
      "角色权限面板：超级管理员/子管理员/普通用户",
      "基础数据：产品模块/项目类型/项目阶段/模块管理",
      "工单配置：问题类别/紧急程度/保修情况/外部接收设置",
      "信息广场分类维护",
    ],
  },
  {
    id: "learning",
    name: "学习中心",
    icon: <BookOpen className="w-5 h-5" />,
    color: "bg-cyan-500",
    viewId: "learning",
    desc: "知识库与培训资料中心，助力团队能力提升。",
    highlights: [
      "培训资料分类浏览",
      "知识文档沉淀与共享",
      "与信息广场资料互通",
    ],
  },
];

const DATABASE_TABLES = [
  { group: "用户与认证", tables: ["users", "user_sessions", "project_member_permissions"] },
  { group: "项目管理", tables: ["projects", "project_types", "project_stages", "project_members", "project_module_types", "project_type_stage_modules"] },
  { group: "规范管理", tables: ["data_table_definitions", "project_schema_rules"] },
  { group: "待办任务（统一待办）", tables: ["todo_task_defs", "todo_task_instances"] },
  { group: "问题上报", tables: ["issue_mgmt_issues", "issue_mgmt_issue_attachments", "issue_mgmt_issue_processing_records", "issue_mgmt_issue_notifications", "issue_mgmt_issue_categories", "issue_mgmt_issue_urgency", "issue_mgmt_issue_warranty_status", "issue_mgmt_external_receivers"] },
  { group: "信息广场", tables: ["design_info_square.knowledge_categories", "design_info_square.knowledge_posts", "design_info_square.knowledge_attachments", "design_info_square.knowledge_reads", "design_info_square.knowledge_likes", "design_info_square.knowledge_comments"] },
  { group: "视频中心", tables: ["video_center.videos", "video_center.video_attachments", "video_center.video_comments"] },
  { group: "案例中心", tables: ["case_center.customers", "case_center.customer_contacts", "case_center.case_projects"] },
  { group: "基础数据", tables: ["product_module_types", "product_categories", "product_vendors", "product_scopes", "member_role_types"] },
];

const MAIN_TABS = [
  { id: "about", label: "关于系统" },
  { id: "guide", label: "操作说明" },
] as const;

export default function AboutPage({ onNavigate }: AboutPageProps) {
  const [mainTab, setMainTab] = useState<"about" | "guide">("about");
  const [activeSection, setActiveSection] = useState("overview");
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [expandedTableGroup, setExpandedTableGroup] = useState<string | null>(null);

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNavigate = (viewId: string) => {
    if (onNavigate) {
      onNavigate(viewId);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* 顶部 Tab 切换 — 浮动卡片式按钮 */}
      <div className="sticky top-[72px] z-20 flex items-center justify-center gap-2 pt-3 pb-2">
        {MAIN_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setMainTab(t.id)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm ${
              mainTab === t.id
                ? "bg-blue-600 text-white shadow-blue-200 scale-105"
                : "bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 关于系统 Tab */}
      {mainTab === "about" && (
      <>
      {/* 左侧居中悬浮导航 */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 z-20">
        <div className="flex flex-col items-center gap-1.5 bg-white/80 backdrop-blur-lg border border-gray-200 rounded-2xl p-2 shadow-lg shadow-gray-200/50">
          {NAV_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollToSection(s.id)}
              title={s.label}
              className={`group relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 ${
                activeSection === s.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
            >
              {s.icon}
              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-5xl mx-auto px-6 pt-32 pb-8 pl-20 space-y-12">

        {/* 项目概览 */}
        <section id="overview" className="scroll-mt-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white mb-6">
            <h3 className="text-2xl font-bold mb-2">元素科技 · 项目管理平台</h3>
            <p className="text-blue-100 text-sm mb-6">
              Element Tech - Project Management System
            </p>
            <p className="text-blue-50 leading-relaxed">
              企业级全流程项目管理平台，涵盖看板监控、项目立项、规范定义、任务分配、问题追踪、知识分享、案例管理等核心场景。
              通过统一的权限体系和数据架构，实现跨团队协作与精细化管理。
              整体采用 Windows Phone Metro 磁贴导航风格，简洁直观。
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "功能模块", value: "10+", icon: <Layers className="w-4 h-4" /> },
              { label: "数据表", value: "40+", icon: <Database className="w-4 h-4" /> },
              { label: "API接口", value: "60+", icon: <Server className="w-4 h-4" /> },
              { label: "权限项", value: "8项", icon: <Shield className="w-4 h-4" /> },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-gray-500 mb-1">
                  {stat.icon}
                  <span className="text-xs">{stat.label}</span>
                </div>
                <div className="text-xl font-bold text-gray-900">{stat.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 功能模块 */}
        <section id="features" className="scroll-mt-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">功能模块</h2>
              <p className="text-sm text-gray-500">Feature Modules · 点击可跳转到对应功能</p>
            </div>
          </div>

          <div className="space-y-3">
            {FEATURE_MODULES.map((mod) => (
              <div
                key={mod.id}
                className="border border-gray-200 rounded-xl bg-white overflow-hidden"
              >
                <button
                  onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg ${mod.color} flex items-center justify-center text-white shrink-0`}>
                    {mod.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-gray-900">{mod.name}</div>
                    <div className="text-sm text-gray-500 line-clamp-1">{mod.desc}</div>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedModule === mod.id ? "rotate-90" : ""}`} />
                </button>

                {expandedModule === mod.id && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <ul className="mt-3 space-y-2">
                      {mod.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => handleNavigate(mod.viewId)}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      前往{mod.name}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 技术架构 */}
        <section id="architecture" className="scroll-mt-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">技术架构</h2>
              <p className="text-sm text-gray-500">Technical Architecture</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                前端技术栈
              </h4>
              <div className="space-y-2 text-sm">
                {[
                  ["Framework", "Next.js 16 (App Router)"],
                  ["Core", "React 19"],
                  ["Language", "TypeScript 5"],
                  ["UI Components", "shadcn/ui (Radix UI)"],
                  ["Styling", "Tailwind CSS 4"],
                  ["Icons", "Lucide React"],
                  ["State", "React Hooks + Context"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-mono text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                后端技术栈
              </h4>
              <div className="space-y-2 text-sm">
                {[
                  ["Runtime", "Node.js 22 (Docker)"],
                  ["API", "Next.js Route Handlers"],
                  ["Database", "PostgreSQL 16 直连"],
                  ["Schema", "design_public"],
                  ["Auth", "JWT + bcryptjs"],
                  ["Storage", "S3 兼容对象存储"],
                  ["Excel", "xlsx 库"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-mono text-gray-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 架构图 */}
          <div className="mt-4 bg-white border border-gray-200 rounded-xl p-6">
            <h4 className="font-semibold text-gray-900 mb-4">系统架构</h4>
            <div className="flex flex-col items-center gap-3">
              <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <div className="text-xs text-blue-500 font-medium mb-1">客户端</div>
                <div className="text-sm font-semibold text-blue-800">React 19 + shadcn/ui + Tailwind CSS</div>
              </div>
              <div className="text-gray-300">↓</div>
              <div className="w-full bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-xs text-green-500 font-medium mb-1">API 层</div>
                <div className="text-sm font-semibold text-green-800">Next.js Route Handlers (50+ API)</div>
              </div>
              <div className="text-gray-300">↓</div>
              <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <div className="text-xs text-amber-500 font-medium mb-1">数据访问层</div>
                <div className="text-sm font-semibold text-amber-800">PgRpcClient (dp_select / dp_insert / dp_update / dp_delete)</div>
              </div>
              <div className="text-gray-300">↓</div>
              <div className="w-full bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                <div className="text-xs text-purple-500 font-medium mb-1">数据库</div>
                <div className="text-sm font-semibold text-purple-800">PostgreSQL — design_public Schema (30+ Tables)</div>
              </div>
            </div>
          </div>
        </section>

        {/* Docker 部署架构 */}
        <section id="docker" className="scroll-mt-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center">
              <Container className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Docker 部署</h2>
              <p className="text-sm text-gray-500">Containerized Deployment · 开发环境热重载</p>
            </div>
          </div>

          {/* 容器架构 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">容器架构（docker-compose）</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-blue-800 text-sm">app 容器</span>
                  <span className="text-xs text-blue-500 ml-auto">:5000</span>
                </div>
                <div className="space-y-1 text-xs text-blue-700">
                  <p>· 基础镜像: node:22-bookworm-slim</p>
                  <p>· 包管理: pnpm 9.0.0</p>
                  <p>· 运行时: tsx watch（开发热重载）</p>
                  <p>· 源码挂载: .:/app (volume)</p>
                  <p>· node_modules / .next: 匿名卷</p>
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center">
                    <Database className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold text-purple-800 text-sm">postgres 容器</span>
                  <span className="text-xs text-purple-500 ml-auto">:5432</span>
                </div>
                <div className="space-y-1 text-xs text-purple-700">
                  <p>· 镜像: postgres:16-alpine</p>
                  <p>· 数据库: projmgmt</p>
                  <p>· 用户: projmgmt</p>
                  <p>· 初始化: ./scripts/init-db.sql</p>
                  <p>· 健康检查: pg_isready</p>
                </div>
              </div>
            </div>
          </div>

          {/* 部署流程 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">部署启动流程</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <span><code className="bg-gray-100 px-1 rounded text-xs">docker compose up -d</code> 启动 postgres 和 app 两个容器</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <span>postgres 容器启动 → 健康检查通过 → 执行 <code className="bg-gray-100 px-1 rounded text-xs">init-db.sql</code>（创建 Schema + 42 张表 + 种子数据）</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                <span>app 容器等待 postgres 健康 → <code className="bg-gray-100 px-1 rounded text-xs">pnpm install</code> → <code className="bg-gray-100 px-1 rounded text-xs">pnpm dev</code> 启动 Next.js</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-bold shrink-0">4</div>
                <span>源码通过 volume 挂载到容器 /app 目录 → <code className="bg-gray-100 px-1 rounded text-xs">tsx watch</code> 监听文件变更 → 自动热重载</span>
              </div>
            </div>
          </div>

          {/* 关键文件 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                部署配置文件
              </h4>
              <div className="space-y-2 text-sm">
                {[
                  ["docker-compose.yml", "容器编排（app + postgres + 网络 + 卷）"],
                  ["Dockerfile.dev", "开发镜像（node:22 + pnpm + 编译工具）"],
                  ["scripts/init-db.sql", "数据库初始化（建表 + 种子数据）"],
                  [".env.docker", "Docker 环境变量（DB连接 / JWT / S3）"],
                  ["scripts/docker.sh", "快捷命令脚本（up/down/logs/rebuild）"],
                ].map(([f, d]) => (
                  <div key={f} className="flex items-center justify-between">
                    <span className="font-mono text-xs text-blue-700">{f}</span>
                    <span className="text-gray-500 text-xs">{d}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Server className="w-4 h-4 text-gray-400" />
                环境变量（关键项）
              </h4>
              <div className="space-y-2 text-sm">
                {[
                  ["DATABASE_URL", "postgresql://projmgmt:xxx@postgres:5432/projmgmt"],
                  ["JWT_SECRET", "JWT 签名密钥"],
                  ["PORT", "5000（容器内服务端口）"],
                  ["COZE_BUCKET_NAME", "S3 存储桶名"],
                  ["COZE_PROJECT_ENV", "PROD / DEV（控制环境模式）"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="font-mono text-xs text-purple-700">{k}</span>
                    <span className="text-gray-500 text-xs truncate ml-2 max-w-[200px]">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 数据库设计 */}
        <section id="database" className="scroll-mt-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">数据库设计</h2>
              <p className="text-sm text-gray-500">Database Architecture · design_public Schema</p>
            </div>
          </div>

          {/* RPC 函数 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">RPC 通用数据访问函数</h4>
            <p className="text-sm text-gray-500 mb-3">
              所有业务表存储在 <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">design_public</code> Schema，
              通过 <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">SECURITY DEFINER</code> RPC 函数统一访问。
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">RPC 函数</th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">功能</th>
                    <th className="text-left py-2 text-gray-500 font-medium">参数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ["dp_select(p_table)", "查询表所有数据", "表名"],
                    ["dp_get_by_id(p_table, p_id)", "根据 ID 查询单条", "表名, UUID"],
                    ["dp_insert(p_table, p_data)", "插入数据", "表名, JSONB"],
                    ["dp_update(p_table, p_id, p_data)", "更新数据", "表名, UUID, JSONB"],
                    ["dp_delete(p_table, p_id)", "删除数据", "表名, UUID"],
                  ].map(([fn, desc, params]) => (
                    <tr key={fn}>
                      <td className="py-2 pr-4 font-mono text-blue-700 text-xs">{fn}</td>
                      <td className="py-2 pr-4 text-gray-700">{desc}</td>
                      <td className="py-2 text-gray-500">{params}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 数据表分组 */}
          <div className="space-y-2">
            {DATABASE_TABLES.map((group) => (
              <div key={group.group} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
                <button
                  onClick={() => setExpandedTableGroup(expandedTableGroup === group.group ? null : group.group)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    {group.group}
                    <span className="text-xs text-gray-400 ml-1">({group.tables.length}张表)</span>
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedTableGroup === group.group ? "rotate-90" : ""}`} />
                </button>
                {expandedTableGroup === group.group && (
                  <div className="px-4 pb-3 border-t border-gray-100">
                    <div className="flex flex-wrap gap-2 mt-2">
                      {group.tables.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-md text-xs font-mono text-gray-700"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 模块管理深度介绍 */}
        <section id="module-mgmt" className="scroll-mt-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Blocks className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">模块管理</h2>
              <p className="text-sm text-gray-500">系统设置 · 模块管理 · 功能逻辑与流程</p>
            </div>
          </div>

          {/* 概述 */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 text-white mb-6">
            <h3 className="text-xl font-bold mb-2">什么是模块管理？</h3>
            <p className="text-indigo-100 text-sm leading-relaxed">
              模块管理定义了项目中可用的管理模块（如范围管理、进度管理、成本管理等十大模块），
              并按"项目类型 × 项目阶段"的二维矩阵配置每个模块的启用状态。
              它是后续项目创建、规范同步、权限分配等功能的数据基础。
            </p>
          </div>

          {/* 数据模型 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">数据模型（三张核心表）</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">表名</th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">用途</th>
                    <th className="text-left py-2 text-gray-500 font-medium">关键字段</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs text-violet-700">project_module_types</td>
                    <td className="py-2 pr-4 text-gray-700">模块定义表</td>
                    <td className="py-2 text-gray-500 text-xs">
                      id, name, code, icon, color, description, is_enabled, sort_order
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs text-violet-700">project_type_stage_modules</td>
                    <td className="py-2 pr-4 text-gray-700">模块启用配置表（矩阵关联）</td>
                    <td className="py-2 text-gray-500 text-xs">
                      project_type_code, project_stage_code, module_code, is_enabled
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-mono text-xs text-violet-700">project_types / project_stages</td>
                    <td className="py-2 pr-4 text-gray-700">上游依赖（基础数据）</td>
                    <td className="py-2 text-gray-500 text-xs">
                      code（与配置表通过 code 字段松散关联）
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-3 bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">实体关系：</div>
              <div className="font-mono text-xs text-gray-700 leading-relaxed">
                <p>project_types (code, name) ─┐</p>
                <p>                              ├──→ project_type_stage_modules (junction)</p>
                <p>project_stages (code, name) ─┘         │</p>
                <p>                          project_module_types (code, name, icon, color)</p>
              </div>
            </div>
          </div>

          {/* 功能区域一：模块定义 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              功能区域一：模块定义
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              管理员在此维护模块的元数据（名称、编码、图标、主题色、排序），作为整个模块体系的基础数据。
            </p>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <span>页面加载时，<code className="bg-gray-100 px-1 rounded text-xs">GET /api/module-types</code> 获取全部模块定义，按 sort_order 排序渲染列表</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <span>新增/编辑模块通过 Dialog 弹窗操作：21 个 lucide 图标可选 + 11 种主题色 + 实时预览</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                <span>开关切换启用状态 → <code className="bg-gray-100 px-1 rounded text-xs">PUT /api/module-types</code> 更新 is_enabled 字段</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">4</div>
                <span>删除模块 → <code className="bg-gray-100 px-1 rounded text-xs">DELETE /api/module-types?id=xxx</code>，需确认对话框</span>
              </div>
            </div>

            <div className="mt-3 bg-indigo-50 rounded-lg p-3">
              <div className="text-xs text-indigo-700 mb-2 font-medium">API 调用链（模块定义 CRUD）</div>
              <div className="font-mono text-xs text-indigo-600 space-y-1">
                <p>GET    /api/module-types      → dp_select("project_module_types")</p>
                <p>POST   /api/module-types      → dp_insert("project_module_types", body)</p>
                <p>PUT    /api/module-types      → dp_update("project_module_types", id, data)</p>
                <p>DELETE /api/module-types?id=x → dp_delete("project_module_types", id)</p>
              </div>
            </div>
          </div>

          {/* 功能区域二：模块启用配置 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              功能区域二：模块启用配置矩阵
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              以二维矩阵形式，按"项目类型 × 项目阶段"交叉配置每个模块的启用状态。
              矩阵行 = 已启用模块列表，矩阵列 = 项目阶段列表，顶部 Tab = 项目类型选择器。
            </p>

            {/* 矩阵示意图 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-3 text-center">
              <div className="text-xs text-gray-500 mb-2">矩阵结构示意</div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-xs mx-auto">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 bg-gray-100 px-3 py-1.5 text-gray-500 w-24">模块 \ 阶段</th>
                      <th className="border border-gray-300 bg-gray-100 px-4 py-1.5 text-gray-600">启动阶段</th>
                      <th className="border border-gray-300 bg-gray-100 px-4 py-1.5 text-gray-600">执行阶段</th>
                      <th className="border border-gray-300 bg-gray-100 px-4 py-1.5 text-gray-600">收尾阶段</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-3 py-1.5 text-gray-700">范围管理</td>
                      <td className="border border-gray-300 px-4 py-1.5 text-center">
                        <span className="inline-block w-6 h-6 rounded bg-blue-500 text-white leading-6">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-1.5 text-center">
                        <span className="inline-block w-6 h-6 rounded bg-gray-200 text-gray-300 leading-6">✗</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-1.5 text-center">
                        <span className="inline-block w-6 h-6 rounded bg-blue-500 text-white leading-6">✓</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-3 py-1.5 text-gray-700">进度管理</td>
                      <td className="border border-gray-300 px-4 py-1.5 text-center">
                        <span className="inline-block w-6 h-6 rounded bg-blue-500 text-white leading-6">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-1.5 text-center">
                        <span className="inline-block w-6 h-6 rounded bg-blue-500 text-white leading-6">✓</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-1.5 text-center">
                        <span className="inline-block w-6 h-6 rounded bg-gray-200 text-gray-300 leading-6">✗</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                蓝色 = 已启用，灰色 = 未启用，每列头支持"全选/全消"批量操作
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <span>加载数据时三路并行请求：module-types + module-config + dicts/batch(类型+阶段)</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <span>选择项目类型 Tab → 筛选该类型下的配置数据 → 矩阵行仅显示 <code className="bg-gray-100 px-1 rounded text-xs">is_enabled=true</code> 的模块</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                <span>点击单元格切换状态：未启用 → POST 新增配置，已启用 → DELETE 删除配置</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">4</div>
                <span>全选/全消：PUT /api/module-config → 先删后插（先删除该类型+阶段所有旧配置，再插入启用的模块）</span>
              </div>
            </div>

            <div className="mt-3 bg-violet-50 rounded-lg p-3">
              <div className="text-xs text-violet-700 mb-2 font-medium">单元格点击内部逻辑</div>
              <div className="font-mono text-xs text-violet-600 space-y-1">
                <p>点击 ✓（已启用）→ 查找已有 config.id → DELETE /api/module-config?id={"{"}id{"}"}</p>
                <p>点击 ✗（未启用）→ POST /api/module-config {"{"}type_code, stage_code, module_code, is_enabled: true{"}"}</p>
                <p>操作后 → loadData(false) 静默刷新（不显示全屏 loading）</p>
              </div>
            </div>
          </div>

          {/* 预置模块 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">预置十大模块</h4>
            <p className="text-sm text-gray-500 mb-3">
              系统通过 <code className="bg-gray-100 px-1 rounded text-xs">init-db.sql</code> 预置了 10 个标准项目管理模块，覆盖 PMBOK 十大知识领域。
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                { name: "范围管理", code: "scope", icon: "Target", color: "#ef4444" },
                { name: "进度管理", code: "schedule", icon: "Calendar", color: "#f97316" },
                { name: "质量管理", code: "quality", icon: "ShieldCheck", color: "#22c55e" },
                { name: "成本管理", code: "cost", icon: "DollarSign", color: "#eab308" },
                { name: "协同管理", code: "collaboration", icon: "Users", color: "#3b82f6" },
                { name: "沟通管理", code: "communication", icon: "MessageCircle", color: "#8b5cf6" },
                { name: "风险管理", code: "risk", icon: "AlertTriangle", color: "#f43f5e" },
                { name: "采购管理", code: "procurement", icon: "ShoppingCart", color: "#06b6d4" },
                { name: "资源管理", code: "resource", icon: "Package", color: "#14b8a6" },
                { name: "资料管理", code: "document", icon: "FileText", color: "#64748b" },
              ].map((m, i) => (
                <div key={m.code} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50/50">
                  <span className="text-xs text-gray-400 font-mono">{i + 1}.</span>
                  <span className="text-sm text-gray-700">{m.name}</span>
                  <span className="text-xs text-gray-400 font-mono ml-auto">{m.code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 完整配置流程 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-3">初始配置流程</h4>
              <div className="space-y-2 text-sm">
                {[
                  "1. 系统设置 → 基础数据 → 添加项目类型和阶段",
                  "2. 系统设置 → 模块管理 → 定义模块元数据",
                  "3. 模块管理 → 模块启用配置 → 选择项目类型",
                  "4. 点击矩阵单元格 → 配置各阶段启用模块",
                  "5. 配置即时生效 → 被项目创建流程消费",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs shrink-0">{i + 1}</div>
                    <span className="text-gray-600 text-xs">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-3">配置消费流程</h4>
              <div className="space-y-2 text-sm">
                {[
                  "1. 创建项目时选择类型和阶段",
                  "2. 查询 project_type_stage_modules",
                  "3. 根据 type_code + stage_code 获取启用模块列表",
                  "4. 项目详情页按模块展示管理功能",
                  "5. 规范管理按模块同步数据表结构",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0">{i + 1}</div>
                    <span className="text-gray-600 text-xs">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 认证与权限 */}
        <section id="auth" className="scroll-mt-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">认证与权限</h2>
              <p className="text-sm text-gray-500">Authentication & Authorization</p>
            </div>
          </div>

          {/* 全局角色 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">全局角色体系</h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  role: "super_admin",
                  label: "超级管理员",
                  color: "bg-red-100 text-red-700 border-red-200",
                  desc: "拥有所有权限，可管理用户角色、授权子管理员",
                },
                {
                  role: "sub_admin",
                  label: "子管理员",
                  color: "bg-blue-100 text-blue-700 border-blue-200",
                  desc: "由超管授权，可管理用户和基础数据",
                },
                {
                  role: "user",
                  label: "普通用户",
                  color: "bg-gray-100 text-gray-700 border-gray-200",
                  desc: "可创建项目，项目内权限由管理员分配",
                },
              ].map((r) => (
                <div key={r.role} className={`border rounded-lg p-3 ${r.color}`}>
                  <div className="font-semibold text-sm">{r.label}</div>
                  <div className="text-xs mt-1 opacity-80">{r.desc}</div>
                  <div className="text-xs font-mono mt-2 opacity-60">{r.role}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 角色权限对照表 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">角色权限对照表</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2.5 pr-4 text-gray-500 font-medium text-xs w-[40%]">功能</th>
                    <th className="text-center py-2.5 px-3 text-gray-500 font-medium text-xs w-[20%]">超级管理员</th>
                    <th className="text-center py-2.5 px-3 text-gray-500 font-medium text-xs w-[20%]">子管理员</th>
                    <th className="text-center py-2.5 px-3 text-gray-500 font-medium text-xs w-[20%]">普通用户</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Dock 栏可见性 */}
                  <tr>
                    <td colSpan={4} className="pt-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Dock 栏可见性</td>
                  </tr>
                  {[
                    ["项目看板 / 项目管理 / 任务中心 / 工单提交 / 案例中心 / 信息广场", true, true, true],
                    ["规范管理", true, true, false],
                    ["设置", true, true, false],
                  ].map(([label, sa, sub, u], i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="py-2 pr-4 text-gray-700">{label}</td>
                      <td className="py-2 px-3 text-center">{sa ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs">✓</span> : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs">✗</span>}</td>
                      <td className="py-2 px-3 text-center">{sub ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs">✓</span> : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs">✗</span>}</td>
                      <td className="py-2 px-3 text-center">{u ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs">✓</span> : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs">✗</span>}</td>
                    </tr>
                  ))}

                  {/* 设置页面 */}
                  <tr>
                    <td colSpan={4} className="pt-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">设置页面访问</td>
                  </tr>
                  {[
                    ["用户管理", true, true, false],
                    ["角色权限", true, false, false],
                    ["基础数据 / 模块管理 / 工单配置 / 信息广场分类 / 大模型配置 / 系统配置", true, true, false],
                  ].map(([label, sa, sub, u], i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="py-2 pr-4 text-gray-700">{label}</td>
                      <td className="py-2 px-3 text-center">{sa ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs">✓</span> : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs">✗</span>}</td>
                      <td className="py-2 px-3 text-center">{sub ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs">✓</span> : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs">✗</span>}</td>
                      <td className="py-2 px-3 text-center">{u ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs">✓</span> : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs">✗</span>}</td>
                    </tr>
                  ))}

                  {/* 操作权限 */}
                  <tr>
                    <td colSpan={4} className="pt-3 pb-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">操作权限</td>
                  </tr>
                  {[
                    ["创建项目", true, true, true],
                    ["管理用户角色（分配/修改角色）", true, false, false],
                    ["创建/编辑用户时设置角色", true, false, false],
                    ["后端 API 角色保护", true, true, true],
                  ].map(([label, sa, sub, u], i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="py-2 pr-4 text-gray-700">{label}</td>
                      <td className="py-2 px-3 text-center">{sa ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs">✓</span> : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs">✗</span>}</td>
                      <td className="py-2 px-3 text-center">{sub ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs">✓</span> : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs">✗</span>}</td>
                      <td className="py-2 px-3 text-center">{u ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-xs">✓</span> : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-400 text-xs">✗</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>说明：</strong>普通用户仅能看到 Dock 栏中的项目看板、项目管理、任务中心、工单提交、案例中心、信息广场六个入口。
                规范管理和设置页面对普通用户完全隐藏，且前端页面渲染层和后端 API 层均有权限校验。
                超级管理员拥有全部权限，子管理员由超级管理员授权，可管理用户和基础数据但不可变更用户角色。
              </p>
            </div>
          </div>

          {/* 项目级权限 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">项目级权限（8项）</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { key: "project_edit", label: "编辑项目", icon: "pencil" },
                { key: "member_manage", label: "成员管理", icon: "users" },
                { key: "module_manage", label: "模块管理", icon: "blocks" },
                { key: "task_manage", label: "任务管理", icon: "list" },
                { key: "issue_handle", label: "问题处理", icon: "wrench" },
                { key: "issue_report", label: "问题上报", icon: "megaphone" },
                { key: "data_view", label: "数据查看", icon: "eye" },
                { key: "data_export", label: "数据导出", icon: "download" },
              ].map((p) => (
                <div key={p.key} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
                  <span className="text-gray-700">{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 成员与权限管理 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">成员与权限管理</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs shrink-0">1</div>
                <span>进入项目管理页面，点击项目卡片进入项目详情</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs shrink-0">2</div>
                <span>在右侧面板找到「成员与权限」区域，点击「添加」按钮</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs shrink-0">3</div>
                <span>从系统用户列表中选择成员，设定项目角色（项目经理、开发、测试等）</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs shrink-0">4</div>
                <span>点击成员行展开权限设置，通过开关控制8项项目级权限</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs shrink-0">5</div>
                <span>支持全选/清空权限快捷操作，移除成员自动清理权限记录</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="bg-blue-50 rounded-lg p-2.5">
                <p className="text-xs font-medium text-blue-700">谁可以设置权限？</p>
                <p className="text-xs text-blue-600 mt-1">超级管理员、子管理员、拥有「成员管理」权限的项目成员</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-2.5">
                <p className="text-xs font-medium text-purple-700">权限如何生效？</p>
                <p className="text-xs text-purple-600 mt-1">前端通过 useProjectPermission Hook 实时校验，后端 API 验证操作权限</p>
              </div>
            </div>
          </div>

          {/* 认证流程 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h4 className="font-semibold text-gray-900 mb-3">认证流程</h4>
            <div className="flex flex-col gap-2">
              {[
                "用户登录 → POST /api/auth/login → 验证密码 → 返回 JWT Token + 用户信息",
                "前端存储 Token 到 localStorage，请求通过 Authorization Header 携带",
                "服务端验证 Token 有效性 + 检查 user_sessions 表",
                "退出登录 → POST /api/auth/logout → 删除 session 记录",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-gray-600 pt-0.5">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 项目看板预警 */}
        <section id="dashboard-detail" className="scroll-mt-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">看板预警系统</h2>
              <p className="text-sm text-gray-500">Dashboard Warning System · 三大预警板块</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-rose-600 to-pink-700 rounded-2xl p-8 text-white mb-6">
            <h3 className="text-xl font-bold mb-2">实时项目健康监控</h3>
            <p className="text-rose-100 text-sm leading-relaxed">
              项目看板集成三大预警板块，实时监控项目指标，自动识别异常并告警。
              结合雷达图健康度评分和项目排名，帮助管理者快速定位风险项目。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              {
                title: "单指标阈值告警",
                icon: "🎯",
                color: "bg-red-50 border-red-200",
                text: "为关键指标设定安全阈值，超出时自动标记为 error/warning 级别。适用于进度偏差率、成本超支率、高风险剩余数等。",
              },
              {
                title: "趋势恶化预警",
                icon: "📉",
                color: "bg-amber-50 border-amber-200",
                text: "跟踪指标历史趋势，检测连续多期恶化信号。适用于需求积压量上升、完成率下降、处理周期延长等趋势性问题。",
              },
              {
                title: "差值对比告警",
                icon: "⚖️",
                color: "bg-blue-50 border-blue-200",
                text: "项目间横向对比，标记偏离项目群均值过多的异常项。适用于识别个别项目与其他项目的显著差异。",
              },
            ].map((w) => (
              <div key={w.title} className={`rounded-xl p-4 border ${w.color}`}>
                <div className="text-lg mb-2">{w.icon}</div>
                <div className="font-semibold text-gray-900 text-sm mb-1">{w.title}</div>
                <p className="text-xs text-gray-600">{w.text}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h4 className="font-semibold text-gray-900 mb-3">预警数据流</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs shrink-0">1</div>
                <span>看板加载时请求 <code className="bg-gray-100 px-1 rounded text-xs">GET /api/dashboard/full</code>，返回 KPI + 健康度 + 预警汇总</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs shrink-0">2</div>
                <span>预警汇总卡片显示：总预警数 / error 数 / warning 数 / 按类别分（阈值/趋势/对比）</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs shrink-0">3</div>
                <span>点击预警卡片展开详情列表，可查看每个预警的触发条件和当前值</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs shrink-0">4</div>
                <span>点击预警项可跳转到对应项目详情，快速定位问题</span>
              </div>
            </div>
          </div>
        </section>

        {/* 核心流程 */}
        <section id="flow" className="scroll-mt-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">核心流程</h2>
              <p className="text-sm text-gray-500">Core Workflows</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 工单流程 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-3">问题工单流程</h4>
              <div className="space-y-1.5">
                {[
                  { status: "pending", label: "待受理", color: "bg-yellow-100 text-yellow-800" },
                  { status: "accepted", label: "已受理", color: "bg-blue-100 text-blue-800" },
                  { status: "processing", label: "处理中", color: "bg-indigo-100 text-indigo-800" },
                  { status: "completed", label: "已完结", color: "bg-green-100 text-green-800" },
                  { status: "rejected", label: "已驳回", color: "bg-red-100 text-red-800" },
                  { status: "closed", label: "已关闭", color: "bg-gray-100 text-gray-800" },
                ].map((s, i) => (
                  <div key={s.status} className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.label}</span>
                    {i < 5 && <ArrowRight className="w-3 h-3 text-gray-300" />}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">支持转交/撤回/重新打开，状态变更自动同步待办任务。外部人员可通过扫码链接匿名提报工单。</p>
            </div>

            {/* 任务流程 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-3">待办任务流程</h4>
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-blue-700 mb-1">发布任务（4步向导）</div>
                  <div className="flex items-center gap-1 text-xs text-blue-600">
                    <span className="px-1.5 py-0.5 bg-blue-100 rounded">基本信息</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="px-1.5 py-0.5 bg-blue-100 rounded">选择表单</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="px-1.5 py-0.5 bg-blue-100 rounded">指派人员</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="px-1.5 py-0.5 bg-blue-100 rounded">截止提醒</span>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-green-700 mb-1">周期任务自动生成</div>
                  <div className="text-xs text-green-600">
                    按日/周/月/年 → 到期自动创建新实例 → 逾期提醒 → 允许补交
                  </div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-amber-700 mb-1">任务与工单联动</div>
                  <div className="text-xs text-amber-600">
                    任务实例 → 上报问题 → 工单写入待办 → 处理后状态回写
                  </div>
                </div>
              </div>
            </div>

            {/* 规范同步流程 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-3">规范同步流程</h4>
              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs shrink-0">1</div>
                  <span>在规范管理中定义表结构（字段、类型、选项）</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs shrink-0">2</div>
                  <span>设置适用项目类型和阶段</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs shrink-0">3</div>
                  <span>选择同步模式：仅结构 / 仅数据 / 结构+数据</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs shrink-0">4</div>
                  <span>指定同步到哪些项目，一键同步</span>
                </div>
              </div>
            </div>

            {/* 信息广场流程 */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-3">信息广场流程</h4>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs shrink-0">1</div>
                  <span>发布公告/上传资料/分享经验</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs shrink-0">2</div>
                  <span>附件通过 S3 对象存储上传，视频支持在线播放</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs shrink-0">3</div>
                  <span>重要公告自动写入待办任务（source_type=knowledge）</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs shrink-0">4</div>
                  <span>阅读/点赞/收藏/评论互动</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 创建项目流程与数据库逻辑 */}
        <section id="section-project-flow" className="scroll-mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-emerald-600" />
            创建项目流程
          </h3>

          {/* 操作流程 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">操作流程</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0">1</div>
                <span>点击「新建项目」，填写项目名称、编号、类型、阶段</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0">2</div>
                <span>配置客户信息和渠道信息（公司、联系人、联系方式）</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0">3</div>
                <span>添加项目成员，设定角色（项目经理、开发、测试等）</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0">4</div>
                <span>选择采购模块（来源于基础数据-产品模块）</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0">5</div>
                <span>进入项目详情，按模块管理数据（10大模块）</span>
              </div>
            </div>
            <div className="mt-3 bg-emerald-50 rounded-lg p-2.5">
              <p className="text-xs text-emerald-700">每个人都可以创建项目。创建后自动成为项目成员。</p>
            </div>
          </div>

          {/* 数据库逻辑 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">数据库逻辑</h4>
            <div className="space-y-4 text-sm text-gray-600">
              {/* 核心表关系 */}
              <div>
                <p className="font-medium text-gray-700 mb-2">核心表关系</p>
                <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs leading-relaxed text-gray-700">
                  <p className="text-emerald-600 font-bold">projects</p>
                  <p className="pl-4">├── project_members (项目成员，project_id → projects.id)</p>
                  <p className="pl-4">├── project_member_permissions (成员权限，project_id + user_id + permission_key)</p>
                  <p className="pl-4">├── customer_info (jsonb: 客户信息，嵌入项目记录)</p>
                  <p className="pl-4">├── channel_info (jsonb: 渠道信息，嵌入项目记录)</p>
                  <p className="pl-4">└── procurement_modules (_text: 采购模块数组)</p>
                </div>
              </div>

              {/* 创建流程数据流 */}
              <div>
                <p className="font-medium text-gray-700 mb-2">创建流程数据流</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                    <span className="text-xs">前端提交表单 → <code className="bg-gray-100 px-1 rounded">POST /api/projects</code></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                    <span className="text-xs">API 调用 <code className="bg-gray-100 px-1 rounded">dp_insert('projects', data)</code> 插入项目主记录</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                    <span className="text-xs">客户信息/渠道信息作为 jsonb 字段直接存储在 projects 表中</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                    <span className="text-xs">采购模块存储为 _text 数组，关联 product_module_types 表</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>
                    <span className="text-xs">成员通过 <code className="bg-gray-100 px-1 rounded">dp_insert('project_members', ...)</code> 批量写入</span>
                  </div>
                </div>
              </div>

              {/* Schema 隔离 */}
              <div>
                <p className="font-medium text-gray-700 mb-2">项目 Schema 隔离</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 rounded-lg p-2.5">
                    <p className="text-xs font-medium text-blue-700">design_public</p>
                    <p className="text-xs text-blue-600 mt-1">存储全局数据：项目列表、用户、字典、规范表定义</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-2.5">
                    <p className="text-xs font-medium text-purple-700">project_{'{'}id{'}'}</p>
                    <p className="text-xs text-purple-600 mt-1">每个项目独立 Schema，存储规范表数据、模块业务数据</p>
                  </div>
                </div>
              </div>

              {/* 规范表同步 */}
              <div>
                <p className="font-medium text-gray-700 mb-2">规范表同步到项目</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                    <span className="text-xs">规范管理中定义表结构（字段名/类型/选项）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                    <span className="text-xs">「同步到项目」→ 在项目 Schema 中创建对应的物理表</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                    <span className="text-xs">支持三种同步模式：仅结构 / 仅数据 / 结构+数据</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                    <span className="text-xs">同步后项目详情页可按模块查看和编辑该表数据</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Schema 规则匹配关系 */}
        <section id="schema-rules" className="scroll-mt-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Schema 规则匹配</h2>
              <p className="text-sm text-gray-500">项目 Schema 规则配置 · 匹配关系说明</p>
            </div>
          </div>

          {/* 概述 */}
          <div className="bg-gradient-to-br from-teal-600 to-cyan-700 rounded-2xl p-8 text-white mb-6">
            <h3 className="text-xl font-bold mb-2">新建项目时自动复制规范表</h3>
            <p className="text-teal-100 text-sm leading-relaxed">
              系统通过「项目 Schema 规则配置」定义匹配规则，当新建项目时，
              根据项目类型、阶段、状态和采购模块自动匹配规则，将对应的规范表结构（含初始数据）复制到项目 Schema 中。
            </p>
          </div>

          {/* 类型阶段规则 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-teal-500" />
              类型阶段规则（type_stage）
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              三个条件（类型、阶段、状态）都是<strong className="text-gray-700">可选的</strong>（null = 不限）。规则中某个字段非 null，项目对应值必须匹配上才算命中。
            </p>

            <div className="bg-teal-50 rounded-lg p-3 mb-4">
              <p className="text-xs font-medium text-teal-700 mb-1">关系：规则内的条件是 AND，规则之间是"谁匹配更多谁优先"</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-3 text-gray-500 font-medium text-xs">类型</th>
                    <th className="text-left py-2 pr-3 text-gray-500 font-medium text-xs">阶段</th>
                    <th className="text-left py-2 pr-3 text-gray-500 font-medium text-xs">状态</th>
                    <th className="text-left py-2 text-gray-500 font-medium text-xs">匹配含义</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="py-1.5 pr-3 font-mono text-xs text-teal-700">A</td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-teal-700">B</td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-teal-700">C</td>
                    <td className="py-1.5 text-gray-700">三者全中才命中（最精确，优先级最高）</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 font-mono text-xs text-teal-700">A</td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-teal-700">B</td>
                    <td className="py-1.5 pr-3 text-gray-400 text-xs">不限</td>
                    <td className="py-1.5 text-gray-700">type 和 stage 必须匹配，不限状态</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 font-mono text-xs text-teal-700">A</td>
                    <td className="py-1.5 pr-3 text-gray-400 text-xs">不限</td>
                    <td className="py-1.5 pr-3 font-mono text-xs text-teal-700">C</td>
                    <td className="py-1.5 text-gray-700">type 和 status 必须匹配，不限阶段</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-3 text-gray-400 text-xs">不限</td>
                    <td className="py-1.5 pr-3 text-gray-400 text-xs">不限</td>
                    <td className="py-1.5 pr-3 text-gray-400 text-xs">不限</td>
                    <td className="py-1.5 text-gray-700">通用规则，不限任何条件（最低优先级）</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-3 bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                <strong>多规则命中：</strong>按匹配的条件数量排序（3个 &gt; 2个 &gt; 1个 &gt; 0个），所有匹配规则的表定义会<strong>合并收集</strong>（Set 去重）。
              </p>
            </div>
          </div>

          {/* 产品规则 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
              产品规则（module）
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              根据项目采购的产品模块匹配规则，同时支持按项目阶段和状态进一步过滤。
            </p>

            <div className="bg-cyan-50 rounded-lg p-3 mb-4">
              <p className="text-xs font-medium text-cyan-700 mb-1">关系：模块命中是硬性条件（AND），阶段和状态是可选过滤</p>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs shrink-0">1</div>
                <span><code className="bg-gray-100 px-1 rounded text-xs">module_codes</code> 与项目 <code className="bg-gray-100 px-1 rounded text-xs">procurement_modules</code> <strong className="text-gray-900">必须有交集</strong> → 没交集直接跳过</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs shrink-0">2</div>
                <span>模块有交集后，检查 <code className="bg-gray-100 px-1 rounded text-xs">project_stage</code>：规则为 null 不限制，有值则项目阶段必须相等</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs shrink-0">3</div>
                <span>再检查 <code className="bg-gray-100 px-1 rounded text-xs">project_status</code>：规则为 null 不限制，有值则项目状态必须相等</span>
              </div>
            </div>

            <div className="mt-3 bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">
                阶段和状态条件是 <strong className="text-gray-900">AND</strong> 关系，全部通过才算最终命中。
              </p>
            </div>
          </div>

          {/* 两类规则之间 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              两类规则之间的关系
            </h4>
            <div className="flex items-start gap-3">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="bg-teal-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-teal-700 mb-1">类型阶段规则</p>
                  <p className="text-xs text-teal-600">独立计算匹配表定义</p>
                </div>
                <div className="bg-cyan-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-cyan-700 mb-1">产品规则</p>
                  <p className="text-xs text-cyan-600">独立计算匹配表定义</p>
                </div>
              </div>
              <div className="flex items-center text-gray-400 text-lg">→</div>
              <div className="flex-1 bg-violet-50 rounded-lg p-3 flex items-center">
                <p className="text-xs text-violet-700 text-center w-full">
                  <strong>合并去重</strong><br/>
                  收集到一个 Set 中，无重复
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 数据权限控制 */}
        <section id="permissions" className="scroll-mt-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">数据权限控制</h2>
              <p className="text-sm text-gray-500">行列权限 · 可删除 · 只读控制</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-600 to-orange-700 rounded-2xl p-8 text-white mb-6">
            <h3 className="text-xl font-bold mb-2">行列矩阵权限模型</h3>
            <p className="text-amber-100 text-sm leading-relaxed">
              规范管理定义的表数据可精细控制到每一行、每一列的删除和编辑权限。
              通过「列只读 × 行只读 → AND/OR 组合」实现灵活的单元格级权限控制。
            </p>
          </div>

          {/* 权限层次 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">三层权限控制</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-700 mb-1">表级（默认）</p>
                <p className="text-xs text-blue-600">编辑表 → 数据权限区域<br/>allow_add：能否新增<br/>allow_delete：默认能否删除<br/>AND/OR：只读模式</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs font-medium text-green-700 mb-1">行级（覆盖）</p>
                <p className="text-xs text-green-600">操作数据 → 每行删除/只读开关<br/>逐行覆盖表级默认值<br/>开关即时生效</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs font-medium text-purple-700 mb-1">列级（覆盖）</p>
                <p className="text-xs text-purple-600">操作数据 → 点击表头 🔒<br/>或列配置中勾选"只读"<br/>列只读标记影响所有行</p>
              </div>
            </div>
          </div>

          {/* 权限生效规则 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <h4 className="font-semibold text-gray-900 mb-3">权限生效规则</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-3 text-gray-500 font-medium text-xs">data_source</th>
                    <th className="text-left py-2 pr-3 text-gray-500 font-medium text-xs">含义</th>
                    <th className="text-left py-2 pr-3 text-gray-500 font-medium text-xs">可删除</th>
                    <th className="text-left py-2 text-gray-500 font-medium text-xs">可编辑只读列</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr><td className="py-2 pr-3 font-mono text-xs text-green-700">manual</td><td className="py-2 pr-3 text-xs text-gray-600">项目中直接添加</td><td className="py-2 pr-3 text-xs text-green-600">始终可删</td><td className="py-2 text-xs text-green-600">不受限制</td></tr>
                  <tr><td className="py-2 pr-3 font-mono text-xs text-gray-700">null / 空</td><td className="py-2 pr-3 text-xs text-gray-600">旧数据（兼容）</td><td className="py-2 pr-3 text-xs text-green-600">始终可删</td><td className="py-2 text-xs text-green-600">不受限制</td></tr>
                  <tr><td className="py-2 pr-3 font-mono text-xs text-amber-700">import / standard</td><td className="py-2 pr-3 text-xs text-gray-600">导入或同步的数据</td><td className="py-2 pr-3 text-xs text-amber-600">allow_delete 控制</td><td className="py-2 text-xs text-amber-600">readonly 控制</td></tr>
                  <tr><td className="py-2 pr-3 font-mono text-xs text-blue-700">reference</td><td className="py-2 pr-3 text-xs text-gray-600">引用关系自动创建</td><td className="py-2 pr-3 text-xs text-amber-600">allow_delete 控制</td><td className="py-2 text-xs text-amber-600">readonly 控制</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* AND/OR 模式 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">AND 模式（默认）</h4>
              <p className="text-xs text-gray-500 mb-2">列只读 AND 行只读 → 单元格锁定</p>
              <div className="bg-gray-50 rounded p-2 text-xs font-mono space-y-0.5">
                <p>列只读=是 + 行只读=是 → <span className="text-red-500">锁定 ✓</span></p>
                <p>列只读=是 + 行只读=否 → <span className="text-green-500">可编辑</span></p>
                <p>列只读=否 + 行只读=是 → <span className="text-green-500">可编辑</span></p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="font-semibold text-gray-900 mb-2 text-sm">OR 模式</h4>
              <p className="text-xs text-gray-500 mb-2">列只读 OR 行只读 → 单元格锁定</p>
              <div className="bg-gray-50 rounded p-2 text-xs font-mono space-y-0.5">
                <p>列只读=是 + 行只读=是 → <span className="text-red-500">锁定 ✓</span></p>
                <p>列只读=是 + 行只读=否 → <span className="text-red-500">锁定 ✓</span></p>
                <p>列只读=否 + 行只读=是 → <span className="text-red-500">锁定 ✓</span></p>
              </div>
            </div>
          </div>

          {/* 操作指南 */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h4 className="font-semibold text-gray-900 mb-3">操作方式</h4>
            <div className="space-y-2 text-sm text-gray-600">
              {[
                "1. 进入规范管理 → 点击表 → 操作数据",
                "2. 每行左侧「删除 | 只读」开关：删/× 控制可删除，锁/编 控制行只读",
                "3. 列头点击 🔒 图标切换列只读（红色=已只读，悬停显示黑色=可切换）",
                "4. 顶部「权限」按钮：表级 allow_add / allow_delete / AND-OR 模式",
                "5. 编辑表 → 数据权限区域：同样可调整表级设置",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs shrink-0">{i + 1}</div>
                  <span className="text-gray-600 text-xs pt-0.5">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 页脚 */}
        <div className="text-center py-8 border-t border-gray-200 mt-8">
          <p className="text-sm text-gray-400">
            元素科技 · 项目管理平台 — Element Tech Project Management System
          </p>
          <p className="text-xs text-gray-300 mt-1">
            Built with Next.js 16 · React 19 · TypeScript 5 · PostgreSQL 16
          </p>
        </div>
      </div>
      </>
      )}

      {/* 操作说明 Tab */}
      {mainTab === "guide" && (
        <GuideContent onNavigate={handleNavigate} />
      )}
    </div>
  );
}

/* ================================================================
   操作说明 — 面向初次接触者
   ================================================================ */
function GuideContent({ onNavigate }: { onNavigate: (viewId: string) => void }) {
  return (
    <div className="max-w-4xl mx-auto px-6 pt-32 pb-8 space-y-10">
      {/* 欢迎区块 */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-8 text-white">
        <h3 className="text-2xl font-bold mb-2">欢迎使用元素科技项目管理平台</h3>
        <p className="text-emerald-100 text-sm leading-relaxed">
          本平台覆盖项目全生命周期管理，包括看板监控、项目创建、任务分发、工单追踪、规范管理、信息共享等核心场景。
          以下操作说明将帮助你快速上手。
        </p>
      </div>

      {/* 一、界面导航 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">1</div>
          <h3 className="text-xl font-bold text-gray-900">界面导航</h3>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h4 className="font-semibold text-gray-900 mb-3">Dock 导航栏</h4>
          <p className="text-sm text-gray-600 mb-3">
            顶部悬浮的 Metro 磁贴风格导航栏是你操作系统的核心入口，包含以下功能区：
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { label: "项目看板", desc: "总览所有项目健康度与预警" },
              { label: "项目管理", desc: "创建、查看和管理项目" },
              { label: "任务中心", desc: "发布任务、查看待办、统计" },
              { label: "工单提交", desc: "提交问题工单、追踪处理" },
              { label: "案例中心", desc: "客户案例与产品案例库" },
              { label: "信息广场", desc: "公告、资料、经验分享" },
              { label: "规范管理", desc: "定义数据表结构与同步" },
              { label: "设置", desc: "用户管理、基础数据、权限" },
              { label: "关于", desc: "系统介绍与操作说明" },
              { label: "学习中心", desc: "知识库与培训资料" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <div>
                  <span className="text-sm font-medium text-gray-800">{item.label}</span>
                  <span className="text-xs text-gray-500 block">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            <span className="font-medium">提示：</span>
            Dock 栏右侧的 📌 图钉按钮可固定/取消固定导航栏。取消固定后，鼠标移至屏幕顶部可唤出导航栏。
          </div>
        </div>
      </section>

      {/* 二、创建第一个项目 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-sm font-bold">2</div>
          <h3 className="text-xl font-bold text-gray-900">创建第一个项目</h3>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0">1</div>
              <span>点击 Dock 栏「<strong>项目管理</strong>」进入项目列表</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0">2</div>
              <span>点击「<strong>新建项目</strong>」按钮，填写项目名称、编号</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0">3</div>
              <span>选择<strong>项目类型</strong>和<strong>项目阶段</strong>（类型和阶段在「设置→基础数据」中维护）</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0">4</div>
              <span>配置<strong>客户信息</strong>和<strong>渠道信息</strong></span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0">5</div>
              <span>选择<strong>采购模块</strong>（可搜索筛选，支持模板导入导出）</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs shrink-0">6</div>
              <span>添加<strong>项目成员</strong>，分配角色和权限</span>
            </div>
          </div>
          <div className="mt-3 bg-emerald-50 rounded-lg p-3 text-xs text-emerald-700">
            <span className="font-medium">创建后：</span>系统会根据项目类型+阶段+采购模块自动匹配 Schema 规则，将对应规范表复制到项目专属 Schema 中。
          </div>
          <button
            onClick={() => onNavigate("projects")}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
          >
            前往项目管理
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 三、发布任务 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white text-sm font-bold">3</div>
          <h3 className="text-xl font-bold text-gray-900">发布任务与待办管理</h3>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="font-semibold text-gray-900 mb-3">4 步发布任务</h4>
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-4 flex-wrap">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">基本信息</span>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">选择任务表单</span>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">指派实施人员</span>
            <ChevronRight className="w-3 h-3 text-gray-300" />
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">截止日期与提醒</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-700">普通任务</p>
              <p className="text-xs text-blue-600 mt-1">一次性任务，逾期自动提醒，支持补交</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <p className="text-xs font-medium text-purple-700">周期任务</p>
              <p className="text-xs text-purple-600 mt-1">按日/周/月/年自动创建新实例，到期自动生成</p>
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
            <span className="font-medium">统一待办：</span>任务中心自动汇总你的所有待办 — 包括任务、工单和重要公告。Dock 栏「任务中心」的红色角标数字即为待办数量。
          </div>

          <button
            onClick={() => onNavigate("tasks")}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
          >
            前往任务中心
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 四、工单提报 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white text-sm font-bold">4</div>
          <h3 className="text-xl font-bold text-gray-900">问题工单提报</h3>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs shrink-0">1</div>
              <span>点击 Dock 栏「<strong>工单提交</strong>」，顶部 Metro 磁贴可切换：我的上报 / 问题管理 / 待办 / 知会抄送 / 数据统计</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs shrink-0">2</div>
              <span>点击「<strong>新建工单</strong>」→ 选择项目 → 填写问题描述 → 上传截图/附件 → 提交</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs shrink-0">3</div>
              <span>工单流转：<strong>待受理 → 处理中 → 已完结/已驳回 → 已关闭</strong></span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="bg-green-50 rounded-lg p-2.5">
              <p className="text-xs font-medium text-green-700">工单与待办联动</p>
              <p className="text-xs text-green-600 mt-1">创建工单自动写入相关人员的待办任务，处理后状态回写</p>
            </div>
            <div className="bg-cyan-50 rounded-lg p-2.5">
              <p className="text-xs font-medium text-cyan-700">外部人员提报</p>
              <p className="text-xs text-cyan-600 mt-1">支持外部人员通过扫码链接匿名提交工单，无需登录系统</p>
            </div>
          </div>

          <button
            onClick={() => onNavigate("issues")}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            前往工单提交
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 五、信息广场与视频中心 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center text-white text-sm font-bold">5</div>
          <h3 className="text-xl font-bold text-gray-900">信息广场与视频中心</h3>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { title: "公告通知", desc: "管理员发布，支持置顶、已读追踪、评论互动" },
              { title: "共享资料", desc: "分类标签筛选，支持视频在线播放，附件 S3 存储" },
              { title: "经验分享", desc: "人人可发布，点赞/收藏/评论，知识沉淀" },
            ].map((item) => (
              <div key={item.title} className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs font-medium text-purple-700">{item.title}</p>
                <p className="text-xs text-purple-600 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700">
            <span className="font-medium">重要公告自动写待办：</span>发布重要公告时，系统自动为相关用户创建待办任务，确保通知到位。
          </div>

          <button
            onClick={() => onNavigate("messages")}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
          >
            前往信息广场
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 六、规范管理 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white text-sm font-bold">6</div>
          <h3 className="text-xl font-bold text-gray-900">规范管理（数据表定义）</h3>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs shrink-0">1</div>
              <span>点击 Dock 栏「<strong>规范管理</strong>」，查看所有已定义的数据表</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs shrink-0">2</div>
              <span>点击「<strong>新建表</strong>」→ 配置字段（文本/数字/日期/单选/多选/多行文本/采购模块选择）</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs shrink-0">3</div>
              <span>设置<strong>适用项目类型</strong>和<strong>阶段</strong>，定义 Schema 规则</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs shrink-0">4</div>
              <span>点击「<strong>同步到项目</strong>」→ 选择同步模式（仅结构/仅数据/结构+数据）→ 指定目标项目</span>
            </div>
          </div>

          <div className="mt-3 bg-violet-50 rounded-lg p-3 text-xs text-violet-700">
            <span className="font-medium">提示：</span>规范表定义后，可通过「操作数据」进入数据管理界面，行列矩阵权限模型可控制每一行每一列的编辑和删除权限。
          </div>

          <button
            onClick={() => onNavigate("standards")}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-violet-50 text-violet-700 rounded-lg text-sm font-medium hover:bg-violet-100 transition-colors"
          >
            前往规范管理
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 七、案例中心 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white text-sm font-bold">7</div>
          <h3 className="text-xl font-bold text-gray-900">案例中心</h3>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-teal-50 rounded-lg p-3">
              <p className="text-xs font-medium text-teal-700">用户画像</p>
              <p className="text-xs text-teal-600 mt-1">管理客户档案，包括基本信息、项目履历、沟通记录等</p>
            </div>
            <div className="bg-cyan-50 rounded-lg p-3">
              <p className="text-xs font-medium text-cyan-700">产品案例</p>
              <p className="text-xs text-cyan-600 mt-1">按产品模块归档项目案例，支持展示案例详情和成果</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate("case-center")}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-teal-50 text-teal-700 rounded-lg text-sm font-medium hover:bg-teal-100 transition-colors"
          >
            前往案例中心
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 八、常见问题 */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white text-sm font-bold">8</div>
          <h3 className="text-xl font-bold text-gray-900">常见问题</h3>
        </div>
        <div className="space-y-3">
          {[
            {
              q: "如何添加项目成员并设置权限？",
              a: "进入项目详情页，右侧面板找到「成员与权限」区域，点击「添加」选择用户并设定角色。点击成员行展开权限设置，通过开关控制 8 项项目级权限。",
            },
            {
              q: "任务的表单从哪里来？",
              a: "任务表单来源于规范管理中定义的数据表。先在规范管理中创建表并同步到项目，发布任务时即可选择该表作为任务表单。也可以导入 Excel 自动建表。",
            },
            {
              q: "工单提交后谁会收到通知？",
              a: "工单提交后自动写入所有相关人员的待办任务。可额外添加「知会抄送」人员。所有操作（受理/处理/完结）都会记录在工单处理流水中。",
            },
            {
              q: "如何查看我的所有待办？",
              a: "点击 Dock 栏「任务中心」，默认显示「统一待办」Tab，自动汇聚了分配给你的任务、工单和重要公告。红色角标数字为实时待办数量。",
            },
            {
              q: "规范表中的数据怎么控制权限？",
              a: "规范管理支持行列矩阵权限模型：表级默认值 + 行级覆盖 + 列级覆盖。通过 AND/OR 模式决定单元格锁定逻辑。数据来源标记（manual/import/standard/reference）决定权限适用规则。",
            },
            {
              q: "外部人员如何提报工单？",
              a: "管理员在「设置→工单配置→外部接收设置」中配置外部工单接收人和字段。系统生成扫码链接，外部人员无需登录即可填写和提交工单。",
            },
            {
              q: "Dock 导航栏可以隐藏吗？",
              a: "点击 Dock 栏右侧的 📌 图钉按钮取消固定。之后鼠标移至屏幕顶部边缘即可唤出导航栏，鼠标离开后自动隐藏。再次点击图钉可重新固定。",
            },
          ].map((faq, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-900 mb-1">Q: {faq.q}</p>
              <p className="text-sm text-gray-600">A: {faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 页脚 */}
      <div className="text-center py-8 border-t border-gray-200">
        <p className="text-sm text-gray-400">
          更多问题请联系系统管理员或查看「关于系统」了解技术架构详情
        </p>
      </div>
    </div>
  );
}
