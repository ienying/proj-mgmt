"use client";

import type { StageLayoutProps } from "./types";
import type { LayoutMode } from "./types";
import { phases } from "./mock-data";

interface HeroSectionProps {
  project: StageLayoutProps["project"];
  projectTypes: StageLayoutProps["projectTypes"];
  projectStages: StageLayoutProps["projectStages"];
  onBack: () => void;
  onSwitchLayout: (mode: LayoutMode) => void;
}

export function HeroSection({ project, projectTypes, projectStages, onBack, onSwitchLayout }: HeroSectionProps) {
  const typeName =
    projectTypes.find((t) => t.code === project.project_type)?.name || project.project_type || "—";
  const stageName =
    projectStages.find((s) => s.code === project.project_stage)?.name || project.project_stage || "—";

  const customerName = project.customer_info?.company_name || "—";
  const deployMode = project.channel_info?.[0]?.company_name || "本地部署";

  const overallProgress = 71;
  const completedPhases = phases.filter((p) => p.status === "done").length;
  const totalTasks = 32;
  const remainingDays = 120;

  return (
    <div
      className="px-16 pt-[80px] pb-12 relative"
      style={{ borderBottom: "1px solid var(--s-border)", backgroundColor: "var(--s-bg)" }}
    >
      {/* 操作按钮行 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[1px] border border-[var(--s-border)] text-[var(--s-text-secondary)] bg-transparent cursor-pointer transition-all hover:bg-[var(--s-surface)] hover:text-[var(--s-orange)] hover:border-[var(--s-orange)]"
            style={{ fontFamily: "var(--font-mono, monospace)" }}
          >
            ← 返回列表
          </button>
          <button
            onClick={() => onSwitchLayout("management")}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[1px] border border-[var(--s-orange)] text-[var(--s-orange)] bg-transparent cursor-pointer transition-all hover:bg-[rgba(232,89,12,.06)]"
            style={{ fontFamily: "var(--font-mono, monospace)" }}
          >
            切换到管理式布局
          </button>
        </div>
      </div>

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
            PROJECT STATUS
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
              {project.status || "实施中"}
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
        <div className="flex-[0_0_160px] p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span
            className="text-[9px] uppercase tracking-[1.5px]"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
          >
            项目阶段
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-text)" }}>{stageName}</span>
        </div>
        <div className="flex-1 p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span
            className="text-[9px] uppercase tracking-[1.5px]"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
          >
            客户名称
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-text)" }}>{customerName}</span>
        </div>
        <div className="flex-1 p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span
            className="text-[9px] uppercase tracking-[1.5px]"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
          >
            部署模式
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-text)" }}>{deployMode}</span>
        </div>
        <div className="flex-1 p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span
            className="text-[9px] uppercase tracking-[1.5px]"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
          >
            项目编号
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-text)" }}>{project.project_code}</span>
        </div>
        <div className="flex-1 p-5 flex flex-col gap-2.5" style={{ backgroundColor: "var(--s-bg)" }}>
          <span
            className="text-[9px] uppercase tracking-[1.5px]"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
          >
            项目经理
          </span>
          <span className="text-sm font-semibold" style={{ color: "var(--s-text)" }}>
            {project.customer_info?.contact_person || "张明远"}
          </span>
        </div>
      </div>
    </div>
  );
}
