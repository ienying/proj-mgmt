"use client";

import { useState, useCallback, useEffect } from "react";
import type { PanelKey } from "./types";
import type { StageLayoutProps } from "./types";
import { LeftStrip } from "./LeftStrip";
import { Toolbar } from "./Toolbar";
import { AIDialog } from "./AIDialog";
import { SubContentArea } from "./SubContentArea";
import { TableDataView } from "./TableDataView";
import { HeroSection } from "./HeroSection";
import { ProductGrid } from "./ProductGrid";
import { PhaseStepper } from "./PhaseStepper";
import { PhaseDetail } from "./PhaseDetail";
import { OverviewGrid } from "./OverviewGrid";
import { ChartsSection } from "./ChartsSection";
import { DeliverableModal } from "./DeliverableModal";
import { IssueRiskModal } from "./IssueRiskModal";
import { panelData, subContentData } from "./mock-data";
import { useAuth } from "@/components/auth-context";

export function StageLayout({
  project,
  projectTypes,
  projectStages,
  procurementModuleDict,
  customerTypeDict,
  onBack,
  onSwitchLayout,
}: StageLayoutProps) {
  const { user: currentUser } = useAuth();
  const userName = currentUser?.name || "";
  const [activePanel, setActivePanel] = useState<PanelKey>("scope");
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [activeModule, setActiveModule] = useState("scope");
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [subContent, setSubContent] = useState<{ key: string; label: string } | null>(null);
  const [activePhase, setActivePhase] = useState(0);
  const [leftStripExpanded, setLeftStripExpanded] = useState(false);

  // 新功能状态
  const [deliverableOpen, setDeliverableOpen] = useState(false);
  const [issueRiskOpen, setIssueRiskOpen] = useState(false);
  const [progressContent, setProgressContent] = useState("");
  const [progressList, setProgressList] = useState<Array<{ id: string; content: string; user_name: string; created_at: string }>>([]);
  const [operationLogs, setOperationLogs] = useState<Array<{ id: string; action: string; user_name: string; target_name: string; detail: string; created_at: string }>>([]);

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
    readonly_mode?: string; enable_drawer_form?: boolean;
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
  // 只显示实际存在于项目 schema 中的表
  const existingTableDefs = tableDefs.filter((d) => d.table_code in allTableRecords);
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

  // ── 操作记录 ──
  const fetchOperations = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/operations`);
      const json = await res.json();
      setOperationLogs(json.data || []);
    } catch { /* ignore */ }
  }, [project.id]);

  // ── 进展同步 ──
  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${project.id}/progress`);
      const json = await res.json();
      setProgressList(json.data || []);
    } catch { /* ignore */ }
  }, [project.id]);

  const handleSubmitProgress = useCallback(async () => {
    if (!progressContent.trim()) return;
    try {
      await fetch(`/api/projects/${project.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: progressContent.trim() }),
      });
      // 写入操作日志
      await fetch(`/api/projects/${project.id}/operations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          target_type: "progress",
          target_name: "发布了进展同步",
          detail: progressContent.trim().slice(0, 100),
        }),
      });
      setProgressContent("");
      fetchProgress();
      fetchOperations();
    } catch { /* ignore */ }
  }, [progressContent, project.id, fetchProgress, fetchOperations]);

  useEffect(() => {
    fetchProgress();
    fetchOperations();
  }, [fetchProgress, fetchOperations]);

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
        tableDefs={existingTableDefs}
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
        lockedExpanded={navDrawerOpen}
      />

      {/* 导航下拉菜单 */}
      {navDrawerOpen && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setNavDrawerOpen(false)} />
          <div className="fixed z-55 flex" style={{ top: 123, right: 24 }}>
            {/* 一级模块 */}
            <div className="w-[160px] border border-[var(--s-border)] bg-[var(--s-surface)] max-h-[500px] overflow-y-auto flex-shrink-0">
              {(moduleTypes.length > 0 ? moduleTypes : [
                { code: "scope", name: "范围管理" }, { code: "schedule", name: "进度管理" }, { code: "quality", name: "质量管理" },
                { code: "cost", name: "成本管理" }, { code: "communication", name: "沟通管理" }, { code: "risk", name: "风险管理" }, { code: "document", name: "资料管理" }
              ]).map((mt, idx) => {
                const tableCount = existingTableDefs.filter(def =>
                  (def.module_type || []).some((m: string) => m === mt.code || m === "progress" && mt.code === "schedule") &&
                  (!def.stage_display_mode || def.stage_display_mode === "menu" || def.stage_display_mode === "both")
                ).length;
                return (
                  <div
                    key={mt.code}
                    onClick={() => { setActiveModule(mt.code); if (!expandedModules.includes(mt.code)) setExpandedModules(prev => [...prev, mt.code]); }}
                    className={`px-3 py-2 cursor-pointer text-[12px] flex items-center justify-between ${activeModule === mt.code ? "bg-[var(--s-bg)] text-[var(--s-orange)] font-semibold" : "text-[var(--s-text-secondary)] hover:bg-[var(--s-bg)]"}`}
                  >
                    <span>{mt.name}</span>
                    {tableCount > 0 && <span className="text-[10px] text-[var(--s-text-muted)]">{tableCount}</span>}
                  </div>
                );
              })}
            </div>
            {/* 二级表列表 */}
            <div className="w-[280px] border-t border-r border-b border-[var(--s-border)] bg-[var(--s-surface)] max-h-[500px] overflow-y-auto">
              {(() => {
                const aliases: Record<string, string[]> = { schedule: ["progress"] };
                const tablesFiltered = existingTableDefs.filter(def =>
                  (def.module_type || []).some((m: string) => m === activeModule || (aliases[activeModule] || []).includes(m)) &&
                  (!def.stage_display_mode || def.stage_display_mode === "menu" || def.stage_display_mode === "both")
                );
                return tablesFiltered.length === 0 ? (
                  <p className="text-[11px] text-[var(--s-text-muted)] text-center py-8">暂无表</p>
                ) : (
                  tablesFiltered.map(def => (
                    <button
                      key={def.table_code}
                      onClick={() => { handleOpenSubContent(`table:${def.table_code}`, def.table_name); setNavDrawerOpen(false); }}
                      className="block w-full text-left px-3 py-2 text-[12px] text-[var(--s-text-secondary)] hover:bg-[var(--s-bg)] hover:text-[var(--s-text)] cursor-pointer border-b border-[var(--s-border-light)]"
                    >
                      {def.table_name}
                      {allTableRecords[def.table_code]?.length > 0 && (
                        <span className="ml-1.5 text-[10px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>{allTableRecords[def.table_code]?.length}</span>
                      )}
                    </button>
                  ))
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* AI 对话框 */}
      <AIDialog
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        projectSchema={project.project_schema}
        projectName={project.project_name}
        progressUpdates={progressList}
        procurementModules={project.procurement_modules}
        projectInfo={project as unknown as Record<string, unknown>}
      />

      {/* 交付物/文档 Modal */}
      <DeliverableModal
        open={deliverableOpen}
        onClose={() => setDeliverableOpen(false)}
        projectSchema={project.project_schema}
        projectName={project.project_name}
        onNavigateTable={(tableCode) => {
          const def = tableDefs.find(d => d.table_code === tableCode);
          const label = def?.table_name || tableCode;
          // 直接打开表的子页面视图
          handleOpenSubContent(`table:${tableCode}`, label);
        }}
      />

      {/* 问题/风险 Modal */}
      <IssueRiskModal
        open={issueRiskOpen}
        onClose={() => setIssueRiskOpen(false)}
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
            userName={userName}
          />
        ) : (
          <SubContentArea
            data={subContentData[subContent.key] || null}
            label={subContent.label}
            onBack={handleCloseSubContent}
          />
        )
      ) : tableDefs.length === 0 ? (
        /* 无任何规则匹配或未配置规则，Schema 为空，显示空状态引导 */
        <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
          <div className="text-center max-w-lg px-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--s-surface2)" }}>
              <svg className="w-8 h-8" style={{ color: "var(--s-text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--s-text)" }}>当前项目暂无规范数据表</h2>
            <p className="text-sm mb-3" style={{ color: "var(--s-text-secondary)" }}>
              项目创建时未匹配到任何 Schema 规则，项目 Schema 中未生成规范表。如需添加，请联系管理人员进行配置。
            </p>
            <details className="text-left mb-4">
              <summary className="text-xs cursor-pointer" style={{ color: "var(--s-text-muted)" }}>管理人员操作步骤</summary>
              <ol className="text-xs mt-2 ml-4 space-y-1 list-decimal" style={{ color: "var(--s-text-muted)" }}>
                <li>前往 系统设置 → 项目 Schema 规则配置 添加规则</li>
                <li>编辑本项目，切换项目类型/阶段后保存</li>
                <li>系统将自动同步规范表到本项目</li>
              </ol>
            </details>
          </div>
        </div>
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
              onOpenDeliverable={() => setDeliverableOpen(true)}
              onOpenIssueRisk={() => setIssueRiskOpen(true)}
            />

            {/* 产品网格 */}
            <ProductGrid
              modules={project.procurement_modules}
              moduleDict={procurementModuleDict}
              project={project as Record<string, unknown>}
              projectTypes={projectTypes}
              projectStages={projectStages}
              customerTypeDict={customerTypeDict}
            />

            {/* ═══ 进展同步 (NEW) ═══ */}
            <div className="px-16 py-6" style={{ borderBottom: "1px solid var(--s-border)" }}>
              <div className="text-[9px] uppercase tracking-[2px] mb-4 flex items-center gap-2" style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                📝 进展同步
                <span className="flex-1 h-px" style={{ backgroundColor: "var(--s-border)" }} />
              </div>
              <div className="grid gap-px" style={{ gridTemplateColumns: "1fr 1fr", backgroundColor: "var(--s-border)" }}>
                {/* 左：输入区 */}
                <div className="p-5 flex flex-col gap-3" style={{ backgroundColor: "var(--s-bg)" }}>
                  <textarea
                    value={progressContent}
                    onChange={(e) => setProgressContent(e.target.value)}
                    placeholder="描述当前项目进展..."
                    className="w-full border flex-1 p-3 text-xs resize-y min-h-[100px] font-sans"
                    style={{ borderColor: "var(--s-border)", backgroundColor: "var(--s-surface)", color: "var(--s-text)" }}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSubmitProgress}
                      className="text-[10px] px-4 py-1.5 font-semibold uppercase tracking-[0.5px] border cursor-pointer transition-all"
                      style={{ borderColor: "var(--s-orange)", color: "var(--s-orange)", backgroundColor: "var(--s-surface)", fontFamily: "var(--font-mono, monospace)" }}
                    >
                      📤 发布进展
                    </button>
                  </div>
                </div>
                {/* 右：时间线 */}
                <div className="p-5 overflow-y-auto max-h-[280px]" style={{ backgroundColor: "var(--s-bg)" }}>
                  {progressList.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--s-text-muted)" }}>暂无进展记录</p>
                  ) : (
                    <div className="space-y-1">
                      {progressList.map((item, i) => (
                        <div key={item.id || i} className="relative pl-5 pb-3 text-xs" style={{ color: "var(--s-text-secondary)" }}>
                          <div className="absolute left-1 top-1.5 w-[7px] h-[7px] rounded-full opacity-50" style={{ backgroundColor: "var(--s-orange)" }} />
                          {i < progressList.length - 1 && <div className="absolute left-[3.5px] top-[10px] bottom-0 w-[2px]" style={{ backgroundColor: "var(--s-border)" }} />}
                          <div className="text-[9px] mb-0.5 tracking-[0.3px]" style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                            {item.created_at ? new Date(item.created_at).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                          </div>
                          <div style={{ whiteSpace: "pre-wrap" }}>{item.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

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
              projectStages={projectStages}
              currentStageCode={project.project_stage}
              onRecordsUpdate={(code, records) => {
                setAllTableRecords((prev) => ({ ...prev, [code]: records }));
              }}
              userName={userName}
              onDataChange={fetchOperations}
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

            {/* ═══ 操作记录 (NEW) — 页面最底部 ═══ */}
            <div className="px-16 py-6">
              <div className="text-[9px] uppercase tracking-[2px] mb-4 flex items-center gap-2" style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                🕐 操作记录
                <span className="flex-1 h-px" style={{ backgroundColor: "var(--s-border)" }} />
              </div>
              <div className="border overflow-y-auto max-h-[200px]" style={{ borderColor: "var(--s-border)", backgroundColor: "var(--s-surface)" }}>
                {operationLogs.length === 0 ? (
                  <p className="text-xs text-center py-6" style={{ color: "var(--s-text-muted)" }}>暂无操作记录</p>
                ) : (
                  operationLogs.map((log, i) => (
                    <div key={log.id || i} className="flex gap-3 px-4 py-2 text-[11px] items-baseline" style={{ borderBottom: i < operationLogs.length - 1 ? "1px solid var(--s-border-light)" : "none", color: "var(--s-text-secondary)" }}>
                      <span className="text-[10px] whitespace-nowrap min-w-[130px] tracking-[0.3px]" style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                        {log.created_at ? new Date(log.created_at).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }) : ""}
                      </span>
                      <span className="font-semibold min-w-[50px] whitespace-nowrap" style={{ color: "var(--s-blue)" }}>{log.user_name || "—"}</span>
                      <span>{log.target_name || log.action}{log.detail ? `：${log.detail}` : ""}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
