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
  onBack,
  onSwitchLayout,
}: StageLayoutProps) {
  const [activePanel, setActivePanel] = useState<PanelKey>("scope");
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [subContent, setSubContent] = useState<{ key: string; label: string } | null>(null);
  const [activePhase, setActivePhase] = useState(4);

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

  return (
    <div className="stage-layout">
      {/* ═══ 固定定位元素 ═══ */}

      {/* 左侧悬停导航条 */}
      <LeftStrip
        panelData={panelData}
        activePanel={activePanel}
        onPanelChange={setActivePanel}
        onSubClick={handleOpenSubContent}
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
            backgroundColor: "var(--s-bg, #f8f9fa)",
            color: "var(--s-text, #212529)",
            minHeight: "100vh",
          }}
        >
          <div className="flex-1 min-w-0">

            {/* Hero 区域（含顶部操作按钮）*/}
            <HeroSection
              project={project}
              projectTypes={projectTypes}
              projectStages={projectStages}
              onBack={onBack}
              onSwitchLayout={onSwitchLayout}
            />

            {/* 产品网格 */}
            <ProductGrid modules={project.procurement_modules} />

            {/* Phases 项目阶段 — 分隔标题 */}
            <div
              className="flex items-center gap-4 px-16 py-8"
              style={{ borderBottom: "1px solid var(--s-border)" }}
            >
              <span
                className="text-[11px] uppercase tracking-[2px]"
                style={{ color: "var(--s-text-secondary)", fontFamily: "var(--font-mono, monospace)" }}
              >
                Phases 项目阶段
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--s-border)" }} />
            </div>

            {/* 阶段步骤条 */}
            <PhaseStepper activePhase={activePhase} onPhaseChange={setActivePhase} />

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
            <PhaseDetail phaseKey={`phase${activePhase}`} />

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
