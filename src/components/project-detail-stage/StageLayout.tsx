"use client";

import { useState, useCallback, useEffect } from "react";
import type { PanelKey } from "./types";
import type { StageLayoutProps } from "./types";
import { LeftStrip } from "./LeftStrip";
import { Toolbar } from "./Toolbar";
import { NavDrawer } from "./NavDrawer";
import { AIDialog } from "./AIDialog";
import { SubContentArea } from "./SubContentArea";
import { TableDataView } from "./TableDataView";
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
  const [leftStripExpanded, setLeftStripExpanded] = useState(false);

  // 获取规范管理的数据表定义
  const [moduleTypes, setModuleTypes] = useState<{ code: string; name: string }[]>([]);
  useEffect(() => {
    fetch("/api/module-types").then(r => r.json()).then(d => {
      setModuleTypes((d.data || []).map((m: any) => ({ code: m.code, name: m.name })));
    }).catch(() => {});
  }, []);

  const [tableDefs, setTableDefs] = useState<Array<{
    id: string; table_code: string; table_name: string;
    module_type: string[]; apply_project_stages: string[];
    stage_desc_column?: string; stage_display_mode?: string;
    stage_progress_column?: string; stage_progress_target?: string;
    stage_summary_fields?: string;
    stage_plan_start_col?: string; stage_plan_end_col?: string;
    stage_actual_start_col?: string; stage_actual_end_col?: string;
    allow_add?: boolean; allow_delete?: boolean;
    readonly_mode?: string;
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

  // 计算每个阶段的日期范围 + 缓存表数据
  const [phaseDates, setPhaseDates] = useState<Record<number, { planStart?: string; planEnd?: string; actualStart?: string; actualEnd?: string }>>({});
  const [allTableRecords, setAllTableRecords] = useState<Record<string, Array<Record<string, unknown>>>>({});
  useEffect(() => {
    if (tableDefs.length === 0 || !project.project_schema) return;
    const sorted = [...projectStages].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));
    (async () => {
      const dates: Record<number, { planStart?: string; planEnd?: string; actualStart?: string; actualEnd?: string }> = {};
      const recordsCache: Record<string, Array<Record<string, unknown>>> = {};
      for (let i = 0; i < sorted.length; i++) {
        const sc = sorted[i].code;
        const pts = tableDefs.filter((def) => def.apply_project_stages?.includes(sc));
        let ps = "", pe = "", as = "", ae = "";
        for (const def of pts) {
          try {
            const r = await fetch(`/api/project-data?projectSchema=${project.project_schema}&tableCode=${def.table_code}`);
            const d = await r.json();
            const recs = (d.data || []) as Array<Record<string, unknown>>;
            recordsCache[def.table_code] = recs;
            if (!recs.length) continue;
            if (def.stage_plan_start_col) { const ds = recs.map((r) => String(r[def.stage_plan_start_col!] || "")).filter(Boolean).sort(); if (ds[0] && (!ps || ds[0] < ps)) ps = ds[0]; }
            if (def.stage_plan_end_col) { const ds = recs.map((r) => String(r[def.stage_plan_end_col!] || "")).filter(Boolean).sort(); if (ds[ds.length - 1] && (!pe || ds[ds.length - 1] > pe)) pe = ds[ds.length - 1]; }
            if (def.stage_actual_start_col) { const ds = recs.map((r) => String(r[def.stage_actual_start_col!] || "")).filter(Boolean).sort(); if (ds[0] && (!as || ds[0] < as)) as = ds[0]; }
            if (def.stage_actual_end_col) { const ds = recs.map((r) => String(r[def.stage_actual_end_col!] || "")).filter(Boolean).sort(); if (ds[ds.length - 1] && (!ae || ds[ds.length - 1] > ae)) ae = ds[ds.length - 1]; }
          } catch {}
        }
        if (ps || pe) dates[i] = { planStart: ps, planEnd: pe, actualStart: as, actualEnd: ae };
      }
      setPhaseDates(dates);
      setAllTableRecords(recordsCache);
    })();
  }, [tableDefs, project.project_schema, projectStages]);

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
        onHoverChange={setLeftStripExpanded}
        tableRecordCounts={Object.fromEntries(Object.entries(allTableRecords).map(([k, v]) => [k, v.length]))}
        moduleTypes={moduleTypes}
      />

      {/* 左上返回按钮（左侧菜单展开时隐藏） */}
      {!leftStripExpanded && (
        <button
          onClick={onBack}
          className="fixed z-35 flex items-center justify-center w-[38px] h-[38px] cursor-pointer transition-all border border-[var(--s-border)] bg-[var(--s-surface)] text-[var(--s-text-muted)] hover:bg-[var(--s-surface2)] hover:text-[var(--s-text)]"
          style={{ top: "85px", left: "24px" }}
          title="返回">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      )}

      {/* 右上工具栏 */}
      <Toolbar
        onNavToggle={() => setNavDrawerOpen(!navDrawerOpen)}
        navActive={navDrawerOpen}
        onSearch={handleSearch}
        onAIToggle={() => setAiDialogOpen(!aiDialogOpen)}
        aiActive={aiDialogOpen}
        isDark={isDark}
        onThemeToggle={toggleTheme}
        onSwitchLayout={() => onSwitchLayout("management")}
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
        projectSchema={project.project_schema}
        projectName={project.project_name}
      />

      {/* ═══ 主内容区 ═══ */}
      {/* 子内容钻取（替换主内容） */}
      {subContent ? (
        subContent.key.startsWith("table:") ? (
          <TableDataView
            tableCode={subContent.key.replace("table:", "")}
            tableName={subContent.label}
            projectSchema={project.project_schema}
            tableDef={tableDefs.find((d) => d.table_code === subContent.key.replace("table:", ""))}
            onBack={handleCloseSubContent}
          />
        ) : (
          <SubContentArea
            data={subContentData[subContent.key] || null}
            label={subContent.label}
            onBack={handleCloseSubContent}
          />
        )
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
              tableDefs={tableDefs}
              tableRecords={allTableRecords}
            />

            {/* 产品网格 */}
            <ProductGrid
              modules={project.procurement_modules}
              moduleDict={procurementModuleDict}
            />

            {/* 阶段步骤条（内含 Phases 项目阶段 标签） */}
            <PhaseStepper activePhase={activePhase} onPhaseChange={setActivePhase} stages={projectStages} phaseDates={phaseDates} />

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
              onRecordsUpdate={(code, records) => {
                setAllTableRecords((prev) => ({ ...prev, [code]: records }));
              }}
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
            <OverviewGrid stages={projectStages} tableDefs={tableDefs} tableRecords={allTableRecords} />

            {/* 图表区域 */}
            <ChartsSection stages={projectStages} tableDefs={tableDefs} tableRecords={allTableRecords} />
          </div>
        </div>
      )}
    </div>
  );
}
