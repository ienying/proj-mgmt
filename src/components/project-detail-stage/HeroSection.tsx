"use client";

import { useState, useEffect } from "react";
import type { StageLayoutProps } from "./types";
import type { LayoutMode } from "./types";

interface HeroSectionProps {
  project: StageLayoutProps["project"];
  projectTypes: StageLayoutProps["projectTypes"];
  projectStages: StageLayoutProps["projectStages"];
  customerTypeDict?: StageLayoutProps["customerTypeDict"];
  onBack: () => void;
  onSwitchLayout: (mode: LayoutMode) => void;
  tableDefs?: any[];
  tableRecords?: Record<string, Array<Record<string, unknown>>>;
  onOpenDeliverable?: () => void;
  onOpenIssueRisk?: () => void;
}

// 辅助：安全提取字符串
function s(v: unknown): string {
  if (typeof v === "string") return v;
  return "";
}

export function HeroSection({ project, projectTypes, projectStages, customerTypeDict, onBack, onSwitchLayout, tableDefs = [], tableRecords = {}, onOpenDeliverable, onOpenIssueRisk }: HeroSectionProps) {
  // 加载部署模式和项目状态字典
  const [deploymentModes, setDeploymentModes] = useState<{ code: string; name: string }[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<{ code: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/dicts?type=deployment_modes")
      .then((r) => r.json())
      .then((d) => setDeploymentModes(d.data || []))
      .catch(() => {});
    fetch("/api/dicts?type=project_statuses")
      .then((r) => r.json())
      .then((d) => setProjectStatuses(d.data || []))
      .catch(() => {});
  }, []);

  // 类型名称
  const typeName =
    projectTypes.find((t) => t.code === project.project_type)?.name || project.project_type || "—";

  // 状态显示：查字典翻译 code → name
  const rawStatus = project.project_status || project.status || "";
  const statusLabel =
    projectStatuses.find((s) => s.code === rawStatus)?.name || rawStatus || "实施中";

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

  // 业务部署模式（查字典翻译 code → name）
  const deployModeRaw = project.deployment_mode || "";
  const deployMode = deploymentModes.find((m) => m.code === deployModeRaw)?.name || deployModeRaw || "—";

  // 负责人（销售）
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

  // 最终客户 (NEW)
  const finalCustomer = s((project as Record<string, unknown>).final_customer) || "—";

  // 项目要求时间 (NEW)
  const requiredDate = s((project as Record<string, unknown>).required_date);
  const requiredDateDisplay = requiredDate ? requiredDate.slice(0, 10) : "—";

  // 倒计时 (NEW)
  let countdownDisplay = "—";
  let countdownUrgent = false;
  if (requiredDate) {
    const target = new Date(requiredDate.split(/[T ]/)[0]);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - now.getTime()) / 86400000);
    if (diff < 0) {
      countdownDisplay = `⚠ 已超时 ${Math.abs(diff)} 天`;
      countdownUrgent = true;
    } else if (diff <= 30) {
      countdownDisplay = `⚠ 剩余 ${diff} 天`;
      countdownUrgent = true;
    } else {
      countdownDisplay = `剩余 ${diff} 天`;
    }
  }

  // ── 动态统计：基于阶段式布局中的数据表 ──
  // 只统计 stage_display_mode 为 phase 或 both 的表
  const stageLayoutTables = tableDefs.filter(
    (d) => d.apply_project_stages?.length > 0 && (!d.stage_display_mode || d.stage_display_mode === "phase" || d.stage_display_mode === "both")
  );
  // 总任务数 = 所有阶段布局表的记录总数
  let totalTasks = 0;
  let totalCompleted = 0;
  for (const def of stageLayoutTables) {
    const recs = tableRecords[def.table_code] || [];
    totalTasks += recs.length;
    if (def.stage_progress_column && def.stage_progress_target) {
      const col = def.stage_progress_column;
      const target = String(def.stage_progress_target).trim();
      totalCompleted += recs.filter((r) => String(r[col] || "").trim() === target).length;
    }
  }
  // 总进度
  const overallProgress = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  // 已完成阶段 = 每个阶段所有表进度100%
  const sortedStages = [...projectStages].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));
  let completedPhases = 0;
  for (const stage of sortedStages) {
    const phaseTables = tableDefs.filter((d) => d.apply_project_stages?.includes(stage.code));
    if (phaseTables.length === 0) continue;
    let allDone = true;
    for (const def of phaseTables) {
      const recs = tableRecords[def.table_code] || [];
      if (recs.length === 0) { allDone = false; break; }
      if (def.stage_progress_column && def.stage_progress_target) {
        const col = def.stage_progress_column;
        const target = String(def.stage_progress_target).trim();
        if (recs.some((r) => String(r[col] || "").trim() !== target)) { allDone = false; break; }
      }
    }
    if (allDone) completedPhases++;
  }

  // 剩余天数：从所有阶段日期中取最早计划开始和最晚计划结束
  let planStart = "", planEnd = "";
  for (const def of tableDefs) {
    if (!def.stage_plan_start_col && !def.stage_plan_end_col) continue;
    const recs = tableRecords[def.table_code] || [];
    if (!recs.length) continue;
    if (def.stage_plan_start_col) {
      const ds = recs.map((r) => String(r[def.stage_plan_start_col] || "")).filter(Boolean).sort();
      if (ds[0] && (!planStart || ds[0] < planStart)) planStart = ds[0];
    }
    if (def.stage_plan_end_col) {
      const ds = recs.map((r) => String(r[def.stage_plan_end_col] || "")).filter(Boolean).sort();
      if (ds[ds.length - 1] && (!planEnd || ds[ds.length - 1] > planEnd)) planEnd = ds[ds.length - 1];
    }
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let remainingDays = "—";
  let remainingLabel = "剩余天数";
  if (planStart && planEnd) {
    const endDate = new Date(planEnd.split(/[T ]/)[0]);
    const diff = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
    if (diff < 0) {
      remainingDays = `${Math.abs(diff)}天`;
      remainingLabel = "已超时";
    } else {
      remainingDays = `${diff}天`;
    }
  }

  return (
    <div
      className="px-16 pt-[180px] pb-12 relative"
      style={{ borderBottom: "1px solid var(--s-border)", backgroundColor: "var(--s-bg)" }}
    >

      {/* Hero Grid */}
      <div
        className="grid gap-px mb-12 -mt-[80px]"
        style={{
          gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
          backgroundColor: "var(--s-border)",
        }}
      >
        {/* 左侧：项目名称 */}
        <div
          className="col-span-3 flex flex-col justify-start gap-6 px-0 pt-0 pr-12 pb-0 pl-0"
          style={{ backgroundColor: "var(--s-bg)" }}
        >
          <div style={{ marginTop: 0 }}>
            <div
              className="text-[11px] uppercase tracking-[2px] flex items-center gap-3"
              style={{ color: "var(--s-text-secondary)", fontFamily: "var(--font-mono, monospace)" }}
            >
              <span className="w-6 h-px" style={{ backgroundColor: "var(--s-orange)" }} />
              项目详情 / PROJECT DETAILS
            </div>
          </div>
          <h1
            className="text-[28px] font-bold leading-[1.2] tracking-[-0.5px] m-0"
            style={{
              color: "var(--s-text)",
              fontFamily: "\"PingFang SC\",\"Noto Sans SC\",\"Microsoft YaHei\",\"微软雅黑\",sans-serif",
            }}
            title={project.project_name}
          >
            {project.project_name}
          </h1>
          <div className="flex gap-3 flex-wrap items-center">
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
            {onOpenDeliverable && (
              <button
                onClick={onOpenDeliverable}
                className="text-[11px] px-4 py-1.5 font-semibold uppercase tracking-[1px] border border-[var(--s-orange)] text-[var(--s-orange)] cursor-pointer transition-all hover:bg-[rgba(232,89,12,.06)]"
                style={{ fontFamily: "var(--font-mono, monospace)", background: "var(--s-surface)" }}
              >
                📄 交付物/文档
              </button>
            )}
            {onOpenIssueRisk && (
              <button
                onClick={onOpenIssueRisk}
                className="text-[11px] px-4 py-1.5 font-semibold uppercase tracking-[1px] border border-[var(--s-red)] text-[var(--s-red)] cursor-pointer transition-all hover:bg-[rgba(224,49,49,.06)]"
                style={{ fontFamily: "var(--font-mono, monospace)", background: "var(--s-surface)" }}
              >
                ⚠ 问题/风险
              </button>
            )}
          </div>
        </div>

        {/* 右侧：4项统计 */}
        <div
          className="col-span-2 grid gap-px"
          style={{ gridTemplateColumns: "1fr 1fr", backgroundColor: "var(--s-border)" }}
        >
          {[
            { value: `${overallProgress}%`, label: "总进度", accent: true },
            { value: `${completedPhases}/${sortedStages.length}`, label: "已完成阶段", green: true },
            { value: `${totalTasks}`, label: "任务总数" },
            { value: remainingDays, label: remainingLabel },
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
                className="text-[13px] uppercase tracking-[1.5px] font-bold"
                style={{ color: "#3b82f6", fontFamily: "var(--font-mono, monospace)" }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 项目信息栏 — 一行全放 */}
      <div className="flex gap-px" style={{ backgroundColor: "var(--s-border)" }}>
        {/* 最终客户 (NEW) */}
        <div className="flex-1 p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span className="text-[12px] uppercase tracking-[1.5px] font-bold" style={{ color: "#3b82f6", fontFamily: "var(--font-mono, monospace)" }}>
            最终客户
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-text)" }}>{finalCustomer}</span>
        </div>
        {/* 客户类型 */}
        <div className="flex-1 p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span className="text-[12px] uppercase tracking-[1.5px] font-bold" style={{ color: "#3b82f6", fontFamily: "var(--font-mono, monospace)" }}>
            客户类型
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-text)" }}>{customerTypeDisplay}</span>
        </div>
        {/* 业务部署模式 — 不加框 */}
        <div className="flex-1 p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span className="text-[12px] uppercase tracking-[1.5px] font-bold" style={{ color: "#3b82f6", fontFamily: "var(--font-mono, monospace)" }}>
            业务部署模式
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-text)" }}>{deployMode}</span>
        </div>
        {/* 负责人 */}
        <div className="flex-1 p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span className="text-[12px] uppercase tracking-[1.5px] font-bold" style={{ color: "#3b82f6", fontFamily: "var(--font-mono, monospace)" }}>
            负责人
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-text)" }}>{salesPerson}</span>
        </div>
        {/* 项目要求时间 (NEW) */}
        <div className="flex-1 p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span className="text-[12px] uppercase tracking-[1.5px] font-bold" style={{ color: "#3b82f6", fontFamily: "var(--font-mono, monospace)" }}>
            要求时间
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-text)" }}>{requiredDateDisplay}</span>
        </div>
        {/* 倒计时 (NEW) */}
        <div className="flex-1 p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span className="text-[12px] uppercase tracking-[1.5px] font-bold" style={{ color: "#3b82f6", fontFamily: "var(--font-mono, monospace)" }}>
            距离要求时间
          </span>
          <span className="text-sm font-semibold" style={{ color: countdownUrgent ? "var(--s-red)" : "var(--s-green)", fontFamily: "var(--font-mono, monospace)" }}>
            {countdownDisplay}
          </span>
        </div>
        {/* 团队 */}
        <div className="flex-[1.3] p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span className="text-[12px] uppercase tracking-[1.5px] font-bold" style={{ color: "#3b82f6", fontFamily: "var(--font-mono, monospace)" }}>
            团队
          </span>
          <span className="text-sm font-medium leading-relaxed" style={{ color: "var(--s-text)" }}>{teamDisplay}</span>
        </div>
      </div>
    </div>
  );
}
