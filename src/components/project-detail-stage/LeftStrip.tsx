"use client";

import { useState } from "react";
import type { PanelData, PanelKey } from "./types";

const MODULE_LABELS: Record<string, string> = {
  scope: "SCOPE 范围管理",
  demand: "DEMAND 需求管理",
  progress: "PROGRESS 进度管理",
  quality: "QUALITY 质量管理",
  cost: "COST 成本管理",
  communication: "COMMUNICATION 沟通管理",
  risk: "RISK 风险管理",
  docs: "DOCS 文档管理",
};

interface TableDef {
  id: string;
  table_code: string;
  table_name: string;
  module_type: string[];
  apply_project_stages: string[];
  stage_display_mode?: string;
  gantt_enabled?: boolean;
}

interface LeftStripProps {
  panelData: PanelData;
  activePanel: PanelKey;
  onPanelChange: (pk: PanelKey) => void;
  onSubClick: (key: string, label: string) => void;
  /** 动态表定义（用于生成菜单） */
  tableDefs?: TableDef[];
  onHoverChange?: (expanded: boolean) => void;
  tableRecordCounts?: Record<string, number>;
  /** 系统模块类型（动态生成L1菜单） */
  moduleTypes?: { code: string; name: string }[];
}

export function LeftStrip({
  panelData,
  activePanel,
  onPanelChange,
  onSubClick,
  tableDefs = [],
  onHoverChange,
  tableRecordCounts = {},
  moduleTypes = [],
}: LeftStripProps) {
  const [hoveredPanel, setHoveredPanel] = useState<string>(activePanel);

  // 动态生成面板数据
  const dynamicPanelData: PanelData = { ...panelData };

  // 使用系统模块类型生成 L1 菜单
  const l1Items = moduleTypes.length > 0 ? moduleTypes : [
    { code: "scope", name: "范围管理" },
    { code: "schedule", name: "进度管理" },
    { code: "quality", name: "质量管理" },
    { code: "cost", name: "成本管理" },
    { code: "communication", name: "沟通管理" },
    { code: "risk", name: "风险管理" },
    { code: "document", name: "资料管理" },
  ];

  // 为每个模块类型创建面板条目
  for (const mt of l1Items) {
    if (!dynamicPanelData[mt.code as PanelKey]) {
      dynamicPanelData[mt.code as PanelKey] = { title: mt.name, items: [] };
    }
  }

  // 将表按 module_type 分组
  if (tableDefs.length > 0) {
    for (const mt of l1Items) {
      const pk = mt.code as PanelKey;
      // 兼容 schedule → progress 等别名
      const pkAliases = [mt.code];
      const tablesInModule = tableDefs.filter(
        (def) =>
          (def.module_type || []).some((m) => pkAliases.includes(m)) &&
          (!def.stage_display_mode || def.stage_display_mode === "menu" || def.stage_display_mode === "both")
      );
      if (dynamicPanelData[pk]) {
        dynamicPanelData[pk].items = tablesInModule.map((def) => ({
          label: def.table_name,
          count: tableRecordCounts[def.table_code] || 0,
          key: `table:${def.table_code}`,
          active: false,
          gantt: def.gantt_enabled,
        }));
      }
    }
  }

  const currentData = dynamicPanelData[hoveredPanel as PanelKey] || dynamicPanelData.scope;

  return (
    <div
      className="fixed left-0 top-0 h-screen z-30 flex items-stretch cursor-default overflow-hidden"
      style={{ width: "12px", transition: "width 0.3s" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.width = "440px";
        onHoverChange?.(true);
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.width = "12px";
        onHoverChange?.(false);
      }}
    >
      {/* 右边界线 */}
      <div
        className="absolute right-0 top-0 bottom-0 pointer-events-none"
        style={{ width: "1px", backgroundColor: "var(--s-border)" }}
      />

      {/* 展开内容 */}
      <div
        className="flex-1 overflow-hidden"
        style={{
          width: "440px",
          minWidth: "440px",
          backgroundColor: "var(--s-surface, #fff)",
        }}
      >
        <div className="flex flex-row py-3 gap-0 min-w-[440px] h-full overflow-y-auto">
          {/* L1 列：8个面板 */}
          <div className="flex flex-col w-[140px] flex-shrink-0 py-0">
            {l1Items.map((mt) => {
              return (
                <button
                  key={mt.code}
                  data-panel={mt.code}
                  onMouseEnter={() => {
                    setHoveredPanel(mt.code);
                    onPanelChange(mt.code as PanelKey);
                  }}
                  className={`flex items-center gap-0 px-3 py-[11px] cursor-pointer whitespace-nowrap text-xs font-medium tracking-[0.3px] transition-all flex-shrink-0 text-left ${
                    activePanel === mt.code
                      ? "text-[var(--s-orange)] border-l-2 border-[var(--s-orange)] bg-[rgba(250,140,22,.06)]"
                      : "text-[var(--s-text-muted)] border-l-2 border-transparent hover:bg-[var(--s-surface2)] hover:text-[var(--s-text)]"
                  }`}
                >
                  <span
                    className={`w-[2px] h-[14px] mr-2 flex-shrink-0 transition-colors ${
                      activePanel === mt.code ? "bg-[var(--s-orange)]" : "bg-transparent"
                    }`}
                  />
                  {mt.name}
                </button>
              );
            })}
          </div>

          {/* 分隔线 */}
          <div
            className="w-px flex-shrink-0 self-stretch my-2"
            style={{ backgroundColor: "var(--s-border)" }}
          />

          {/* L2 列：当前面板的子项 */}
          <div className="flex-1 flex flex-col py-0 overflow-y-auto">
            <div
              className="text-[10px] font-bold px-3 py-3 uppercase tracking-[1px] flex-shrink-0"
              style={{
                color: "var(--s-text-muted)",
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {currentData.title}
            </div>
            {currentData.items.length === 0 ? (
              <div
                className="px-3 py-2 text-xs"
                style={{ color: "var(--s-text-muted)" }}
              >
                暂无数据表
              </div>
            ) : (
              currentData.items.map((it, i) => (
                <div
                  key={i}
                  data-key={it.key}
                  data-label={it.label}
                  onClick={() => it.key && onSubClick(it.key, it.label)}
                  className={`flex items-center gap-1.5 px-3 py-2 cursor-pointer text-xs transition-all whitespace-nowrap flex-shrink-0 ${
                    it.active
                      ? "bg-[rgba(250,140,22,.06)] text-[var(--s-orange)] font-semibold"
                      : "text-[var(--s-text-secondary)] hover:bg-[var(--s-surface2)] hover:text-[var(--s-text)]"
                  }`}
                  style={{ cursor: it.key ? "pointer" : "default" }}
                >
                  <span
                    className={`w-1 h-1 flex-shrink-0 ${
                      it.active
                        ? "bg-[var(--s-orange)]"
                        : "bg-[var(--s-border-light)]"
                    }`}
                  />
                  {(it as any).gantt ? "📊 " : ""}{it.label}
                  {it.count > 0 && (
                    <span
                      className="ml-auto text-[10px] px-1.5 py-0.5 font-medium"
                      style={{
                        backgroundColor: "var(--s-surface2)",
                        color: "var(--s-text-muted)",
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    >
                      {it.count}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
