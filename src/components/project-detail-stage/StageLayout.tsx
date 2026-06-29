"use client";

import { useState, useCallback, useEffect } from "react";
import type { PanelKey } from "./types";
import type { StageLayoutProps } from "./types";
import { LeftStrip } from "./LeftStrip";
import { Toolbar } from "./Toolbar";
import { NavDrawer } from "./NavDrawer";
import { AIDialog } from "./AIDialog";
import { SubContentArea } from "./SubContentArea";
import { HeroSection } from "./HeroSection";
import { ProductGrid } from "./ProductGrid";
import { PhaseStepper } from "./PhaseStepper";
import { PhaseDetail } from "./PhaseDetail";
import { OverviewGrid } from "./OverviewGrid";
import { ChartsSection } from "./ChartsSection";
import { panelData, subContentData } from "./mock-data";

export function StageLayout({
  project,
  projectTypes,
  projectStages,
  procurementModuleDict,
  customerTypeDict,
  onBack,
  onSwitchLayout,
}: StageLayoutProps) {
  const [activePanel, setActivePanel] = useState<PanelKey>("scope");
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [subContent, setSubContent] = useState<{ key: string; label: string } | null>(null);
  // 根据项目当前阶段确定激活的阶段索引
  const [activePhase, setActivePhase] = useState(0);

  // 获取规范管理的数据表定义
  const [tableDefs, setTableDefs] = useState<Array<{
    id: string; table_code: string; table_name: string;
    module_type: string[]; apply_project_stages: string[];
    stage_desc_column?: string; stage_display_mode?: string;
    allow_add?: boolean; readonly_mode?: string;
    columns_config?: Array<{ name: string; type: string; readonly?: boolean }>;
  }>>([]);
  useEffect(() => {
    fetch("/api/standards")
      .then((r) => r.json())
      .then((d) => {
        const defs = (d.data || []).filter(
          (def: Record<string, unknown>) => !String(def.table_code || "").startsWith("task_")
        );
        setTableDefs(defs);
      })
      .catch(() => {});
  }, [project.id]);

  // 当 projectStages 加载完成后，按 sort_order 排序后定位到当前阶段
  useEffect(() => {
    if (projectStages.length > 0) {
      const sorted = [...projectStages].sort(
        (a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99)
      );
      const idx = sorted.findIndex((s) => s.code === project.project_stage);
      if (idx >= 0) setActivePhase(idx);
    }
  }, [projectStages, project.project_stage]);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("project_detail_theme") === "dark";
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("project_detail_theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  const handleOpenSubContent = useCallback((key: string, label: string) => {
    setSubContent({ key, label });
  }, []);

  const handleCloseSubContent = useCallback(() => {
    setSubContent(null);
  }, []);

  const aiReplies = [
    "根据当前项目数据，总体进度 71%，已完成 4 个阶段。建议重点关注「质量管理」和「风险管理」领域，其中缺陷跟踪仍有 47 项待处理。",
    "项目剩余 120 天，按当前节奏预计可如期交付。深圳市教育局和南山区教育局两客户实施进度略有差异，建议每周对齐一次。",
    "已部署 15 项产品中，核心教务系统运行稳定。智慧教育课堂教学分析系统尚在部分部署阶段，预计下月完成全量上线。",
    "最近一周新增 3 项变更申请，均在范围管理流程中。建议尽快完成变更影响评估。",
    "好的，我帮你梳理一下：目前 32 项任务中已完成 17 项，进行中 9 项，待开始 6 项。本周重点推进测试用例执行和用户培训材料准备。",
  ];

  const handleSearch = useCallback(() => {
    alert("搜索功能 — 待实现");
  }, []);

  // 浅色 / 深色 配色方案
  const lightVars = {
    ["--s-bg" as string]: "#f8f9fa",
    ["--s-surface" as string]: "#fff",
    ["--s-surface2" as string]: "#f1f3f5",
    ["--s-border" as string]: "#dee2e6",
    ["--s-border-light" as string]: "#e9ecef",
    ["--s-text" as string]: "#212529",
    ["--s-text-secondary" as string]: "#495057",
    ["--s-text-muted" as string]: "#868e96",
    ["--s-orange" as string]: "#e8590c",
    ["--s-orange-dim" as string]: "#d9480f",
    ["--s-green" as string]: "#2b8a3e",
    ["--s-green-dim" as string]: "#2f9e44",
    ["--s-blue" as string]: "#1c7ed6",
    ["--s-blue-dim" as string]: "#1971c2",
    ["--s-red" as string]: "#e03131",
    ["--s-chart-blue" as string]: "#3b82f6",
    ["--s-chart-indigo" as string]: "#6366f1",
    ["--s-chart-sky" as string]: "#0ea5e9",
    ["--s-chart-purple" as string]: "#8b5cf6",
    ["--s-chart-amber" as string]: "#f59e0b",
    ["--s-chart-rose" as string]: "#e11d48",
    ["--s-chart-gray" as string]: "#94a3b8",
    ["--s-font-mono" as string]: "\"SF Mono\",\"Fira Code\",\"Cascadia Code\",monospace",
    backgroundColor: "#f8f9fa",
    color: "#212529",
    minHeight: "100vh",
  };

  const darkVars = {
    ["--s-bg" as string]: "#1b1b1f",
    ["--s-surface" as string]: "#252529",
    ["--s-surface2" as string]: "#2e2e33",
    ["--s-border" as string]: "#38383e",
    ["--s-border-light" as string]: "#45454b",
    ["--s-text" as string]: "#f0f0f3",
    ["--s-text-secondary" as string]: "#a8a8b3",
    ["--s-text-muted" as string]: "#6b6b75",
    ["--s-orange" as string]: "#fa8c16",
    ["--s-orange-dim" as string]: "#d46b08",
    ["--s-green" as string]: "#4ade80",
    ["--s-green-dim" as string]: "#22c55e",
    ["--s-blue" as string]: "#60a5fa",
    ["--s-blue-dim" as string]: "#3b82f6",
    ["--s-red" as string]: "#f87171",
    ["--s-chart-blue" as string]: "#60a5fa",
    ["--s-chart-indigo" as string]: "#818cf8",
    ["--s-chart-sky" as string]: "#38bdf8",
    ["--s-chart-purple" as string]: "#a78bfa",
    ["--s-chart-amber" as string]: "#fbbf24",
    ["--s-chart-rose" as string]: "#fb7185",
    ["--s-chart-gray" as string]: "#6b7280",
    ["--s-font-mono" as string]: "\"SF Mono\",\"Fira Code\",\"Cascadia Code\",monospace",
    backgroundColor: "#1b1b1f",
    color: "#f0f0f3",
    minHeight: "100vh",
  };

  return (
    <div
      className={`stage-layout${isDark ? " dark" : ""}`}
      style={isDark ? darkVars : lightVars}
    >
      {/* ═══ 固定定位元素 ═══ */}

      {/* 左侧悬停导航条 */}
      <LeftStrip
        panelData={panelData}
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        onSubClick={handleOpenSubContent}
        tableDefs={tableDefs}
      />

      {/* 右上工具栏 */}
      <Toolbar
        onNavToggle={() => setNavDrawerOpen(!navDrawerOpen)}
        navActive={navDrawerOpen}
        onSearch={handleSearch}
        onAIToggle={() => setAiDialogOpen(!aiDialogOpen)}
        aiActive={aiDialogOpen}
        isDark={isDark}
        onThemeToggle={toggleTheme}
      />

      {/* 导航抽屉 */}
      <NavDrawer
        open={navDrawerOpen}
        panelData={panelData}
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        onSubClick={(key, label) => {
          handleOpenSubContent(key, label);
          setNavDrawerOpen(false);
        }}
        onClose={() => setNavDrawerOpen(false)}
      />

      {/* AI 对话框 */}
      <AIDialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        replies={aiReplies}
      />

      {/* ═══ 主内容区 ═══ */}
      {/* 子内容钻取（替换主内容） */}
      {subContent ? (
        <SubContentArea
          data={subContentData[subContent.key] || null}
          label={subContent.label}
          onBack={handleCloseSubContent}
        />
      ) : (
        <div
          className="relative"
          style={{
            paddingLeft: "12px",
          }}
        >
          <div className="flex-1 min-w-0">

            {/* Hero 区域（含顶部操作按钮）*/}
            <HeroSection
              project={project}
              projectTypes={projectTypes}
              projectStages={projectStages}
              customerTypeDict={customerTypeDict}
              onBack={onBack}
              onSwitchLayout={onSwitchLayout}
            />

            {/* 产品网格 */}
            <ProductGrid
              modules={project.procurement_modules}
              moduleDict={procurementModuleDict}
            />

            {/* 阶段步骤条（内含 Phases 项目阶段 标签） */}
            <PhaseStepper activePhase={activePhase} onPhaseChange={setActivePhase} stages={projectStages} />

            {/* Phase Details 阶段详情 — 分隔标题 */}
            <div
              className="flex items-center gap-4 px-16 py-8"
              style={{ borderBottom: "1px solid var(--s-border)" }}
            >
              <span
                className="text-[11px] uppercase tracking-[2px]"
                style={{ color: "var(--s-text-secondary)", fontFamily: "var(--font-mono, monospace)" }}
              >
                Phase Details 阶段详情
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--s-border)" }} />
            </div>

            {/* 阶段详情 */}
            <PhaseDetail
              phaseKey={`phase${activePhase}`}
              stageCode={
                projectStages.length > 0
                  ? [...projectStages].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))[activePhase]?.code
                  : undefined
              }
              tableDefs={tableDefs}
              projectSchema={project.project_schema}
            />

            {/* 项目总览 分隔标题 */}
            <div
              className="flex items-center gap-4 px-16 py-8"
              style={{ borderBottom: "1px solid var(--s-border)" }}
            >
              <span
                className="text-[11px] uppercase tracking-[2px]"
                style={{ color: "var(--s-text-secondary)", fontFamily: "var(--font-mono, monospace)" }}
              >
                项目总览
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--s-border)" }} />
            </div>

            {/* 总览网格 */}
            <OverviewGrid />

            {/* 图表区域 */}
            <ChartsSection />
          </div>
        </div>
      )}
    </div>
  );
}
