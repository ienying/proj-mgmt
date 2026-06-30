"use client";

import type { StageLayoutProps } from "./types";
import type { LayoutMode } from "./types";
import { phases } from "./mock-data";

interface HeroSectionProps {
  project: StageLayoutProps["project"];
  projectTypes: StageLayoutProps["projectTypes"];
  projectStages: StageLayoutProps["projectStages"];
  customerTypeDict?: StageLayoutProps["customerTypeDict"];
  onBack: () => void;
  onSwitchLayout: (mode: LayoutMode) => void;
}

// 辅助：安全提取字符串
function s(v: unknown): string {
  if (typeof v === "string") return v;
  return "";
}

export function HeroSection({ project, projectTypes, projectStages, customerTypeDict, onBack, onSwitchLayout }: HeroSectionProps) {
  // 类型名称
  const typeName =
    projectTypes.find((t) => t.code === project.project_type)?.name || project.project_type || "—";

  // 状态显示
  const statusLabel = project.project_status || project.status || "实施中";

  // 客户名称：公司名·市
  const ci = project.customer_info || {};
  const loc = project.customer_location || {};
  const companyName = s(ci?.company_name) || "—";
  const cityName = s(loc?.city);
  const customerDisplay = cityName ? `${companyName}·${cityName}` : companyName;

  // 客户类型（code → 字典查找中文名）
  // 可能格式：数组、逗号分隔字符串、JSON字符串
  const rawCustomerType: unknown = project.customer_type;
  let customerTypeCodes: string[] = [];
  if (Array.isArray(rawCustomerType)) {
    customerTypeCodes = rawCustomerType.filter((t) => typeof t === "string") as string[];
  } else if (typeof rawCustomerType === "string") {
    // 可能是 JSON 字符串如 '["junior_high"]' 或逗号分隔字符串
    const trimmed = rawCustomerType.trim();
    if (trimmed.startsWith("[")) {
      try { const parsed = JSON.parse(trimmed); if (Array.isArray(parsed)) customerTypeCodes = parsed; } catch {}
    }
    if (customerTypeCodes.length === 0) {
      customerTypeCodes = trimmed.split(",").map((t) => t.trim()).filter(Boolean);
    }
  }
  const customerTypeDisplay = customerTypeCodes.length > 0
    ? customerTypeCodes
        .map((code) => (customerTypeDict || []).find((d) => d.code === code)?.name || code)
        .join(" · ")
    : "—";

  // 业务部署模式
  const deployMode = project.deployment_mode || "—";

  // 编号 / 负责人（销售）
  const salesPerson = s(project.role_sales) || "—";

  // 团队成员：核心角色 + 项目成员
  // 核心角色：销售、售前、市场产品、项目经理
  const coreRoles: { role: string; name: string }[] = [];
  const presalesPerson = s(project.role_presales);
  const marketPerson = s(project.role_market_product);
  const pmPerson = s(project.role_project_manager);
  if (salesPerson !== "—") coreRoles.push({ role: "销售", name: salesPerson });
  if (presalesPerson) coreRoles.push({ role: "售前", name: presalesPerson });
  if (marketPerson) coreRoles.push({ role: "市场产品", name: marketPerson });
  if (pmPerson) coreRoles.push({ role: "项目经理", name: pmPerson });

  const rawMembers = project.members;
  const members = Array.isArray(rawMembers) ? rawMembers : [];
  // 合并核心角色和项目成员（去重用角色）
  const coreRoleNames = new Set(coreRoles.map((r) => r.role));
  const filteredMembers = members
    .filter((m) => !coreRoleNames.has(m.role || (m as Record<string, unknown>).role_type as string || ""))
    .map((m) => ({
      role: m.role || (m as Record<string, unknown>).role_type as string || "成员",
      name: m.name || "—",
    }));
  const allTeam = [...coreRoles, ...filteredMembers];
  const teamDisplay = allTeam.length > 0
    ? allTeam.map((m) => `${m.role}·${m.name}`).join("  ")
    : "—";

  const overallProgress = 71;
  const completedPhases = phases.filter((p) => p.status === "done").length;
  const totalTasks = 32;
  const remainingDays = 120;

  return (
    <div
      className="px-16 pt-[80px] pb-12 relative"
      style={{ borderBottom: "1px solid var(--s-border)", backgroundColor: "var(--s-bg)" }}
    >

      {/* Hero Grid */}
      <div
        className="grid gap-px mb-12"
        style={{
          gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
          backgroundColor: "var(--s-border)",
        }}
      >
        {/* 左侧：项目名称 */}
        <div
          className="col-span-3 flex flex-col justify-end gap-6 px-0 pt-0 pr-12 pb-0 pl-0"
          style={{ backgroundColor: "var(--s-bg)" }}
        >
          <div
            className="text-[11px] uppercase tracking-[2px] flex items-center gap-3"
            style={{ color: "var(--s-text-secondary)", fontFamily: "var(--font-mono, monospace)" }}
          >
            <span className="w-6 h-px" style={{ backgroundColor: "var(--s-orange)" }} />
            项目详情 / PROJECT DETAILS
          </div>
          <h1
            className="text-[64px] font-bold leading-[1.05] tracking-[-1.5px] m-0"
            style={{
              color: "var(--s-text)",
              fontFamily: "\"PingFang SC\",\"Noto Sans SC\",\"Microsoft YaHei\",\"微软雅黑\",sans-serif",
            }}
          >
            {project.project_name}
          </h1>
          <div className="flex gap-3">
            <span
              className="text-[11px] px-4 py-1.5 font-semibold uppercase tracking-[1px] border border-[var(--s-green)] text-[var(--s-green)]"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {statusLabel}
            </span>
            <span
              className="text-[11px] px-4 py-1.5 font-semibold uppercase tracking-[1px] border border-[var(--s-blue)] text-[var(--s-blue)]"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {typeName}
            </span>
          </div>
        </div>

        {/* 右侧：4项统计 */}
        <div
          className="col-span-2 grid gap-px"
          style={{ gridTemplateColumns: "1fr 1fr", backgroundColor: "var(--s-border)" }}
        >
          {[
            { value: `${overallProgress}%`, label: "总进度", accent: true },
            { value: `${completedPhases}/7`, label: "已完成阶段", green: true },
            { value: `${totalTasks}`, label: "任务总数" },
            { value: `${remainingDays}`, label: "剩余天数" },
          ].map((stat, i) => (
            <div
              key={i}
              className="relative overflow-hidden p-7 flex flex-col gap-2"
              style={{ backgroundColor: "var(--s-bg)" }}
            >
              <div
                className="text-[42px] font-bold tracking-[-1px] leading-none"
                style={{
                  color: stat.accent ? "var(--s-orange)" : stat.green ? "var(--s-green)" : "var(--s-text)",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {stat.value}
              </div>
              <div
                className="text-[11px] uppercase tracking-[1.5px]"
                style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 项目信息栏 */}
      <div className="flex gap-px" style={{ backgroundColor: "var(--s-border)" }}>
        {/* 客户名称 */}
        <div className="flex-1 p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span
            className="text-[9px] uppercase tracking-[1.5px]"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
          >
            客户名称
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-text)" }}>{customerDisplay}</span>
        </div>
        {/* 客户类型 */}
        <div className="flex-1 p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span
            className="text-[9px] uppercase tracking-[1.5px]"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
          >
            客户类型
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-text)" }}>{customerTypeDisplay}</span>
        </div>
        {/* 业务部署模式 */}
        <div className="flex-1 p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span
            className="text-[9px] uppercase tracking-[1.5px]"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
          >
            业务部署模式
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-text)" }}>
            {deployMode !== "—" ? (
              <span
                className="inline-block px-2.5 py-1 border border-[var(--s-border)] text-sm font-medium"
                style={{ color: "var(--s-text-secondary)", fontFamily: "var(--font-mono, monospace)" }}
              >
                {deployMode}
              </span>
            ) : (
              "—"
            )}
          </span>
        </div>
        {/* 编号 / 负责人 */}
        <div className="flex-1 p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span
            className="text-[9px] uppercase tracking-[1.5px]"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
          >
            编号 / 负责人
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-text)" }}>
            {project.project_code}{salesPerson !== "—" ? ` · ${salesPerson}` : ""}
          </span>
        </div>
        {/* 团队 */}
        <div className="flex-[1.5] p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span
            className="text-[9px] uppercase tracking-[1.5px]"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
          >
            团队
          </span>
          <span className="text-sm font-medium leading-relaxed" style={{ color: "var(--s-text)" }}>
            {teamDisplay}
          </span>
        </div>
      </div>
    </div>
  );
}
