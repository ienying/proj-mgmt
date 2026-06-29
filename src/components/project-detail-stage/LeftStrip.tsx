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
}

interface LeftStripProps {
  panelData: PanelData;
  activePanel: PanelKey;
  onPanelChange: (pk: PanelKey) => void;
  onSubClick: (key: string, label: string) => void;
  /** 动态表定义（用于生成菜单） */
  tableDefs?: TableDef[];
}

export function LeftStrip({
  panelData,
  activePanel,
  onPanelChange,
  onSubClick,
  tableDefs = [],
}: LeftStripProps) {
  const [hoveredPanel, setHoveredPanel] = useState<PanelKey>("scope");

  // 动态生成面板数据：混合原有 panelData + 实际表名
  const dynamicPanelData: PanelData = { ...panelData };

  // 将表按 module_type 分组
  if (tableDefs.length > 0) {
    for (const [pk, pdata] of Object.entries(dynamicPanelData) as [PanelKey, (typeof panelData)[PanelKey]][]) {
      // 只显示 stage_display_mode 为 menu 或 both 的表
      const tablesInModule = tableDefs.filter(
        (def) =>
          def.module_type?.includes(pk) &&
          (!def.stage_display_mode || def.stage_display_mode === "menu" || def.stage_display_mode === "both")
      );
      if (tablesInModule.length > 0) {
        // 用实际表名替换/补充原有子项
        pdata.items = tablesInModule.map((def) => ({
          label: def.table_name,
          count: 0, // 可以通过 API 获取实际记录数
          key: `table:${def.table_code}`,
          active: false,
        }));
      }
    }
  }

  const currentData = dynamicPanelData[hoveredPanel] || dynamicPanelData.scope;

  return (
    <div
      className="fixed left-0 top-0 h-screen z-30 flex items-stretch cursor-default overflow-hidden"
      style={{ width: "12px", transition: "width 0.3s" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.width = "440px";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.width = "12px";
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
            {(Object.keys(dynamicPanelData) as PanelKey[]).map((pk) => {
              const label = MODULE_LABELS[pk] || pk;
              return (
                <button
                  key={pk}
                  data-panel={pk}
                  onMouseEnter={() => {
                    setHoveredPanel(pk);
                    onPanelChange(pk);
                  }}
                  className={`flex items-center gap-0 px-3 py-[11px] cursor-pointer whitespace-nowrap text-xs font-medium tracking-[0.3px] transition-all flex-shrink-0 text-left ${
                    activePanel === pk
                      ? "text-[var(--s-orange)] border-l-2 border-[var(--s-orange)] bg-[rgba(250,140,22,.06)]"
                      : "text-[var(--s-text-muted)] border-l-2 border-transparent hover:bg-[var(--s-surface2)] hover:text-[var(--s-text)]"
                  }`}
                >
                  <span
                    className={`w-[2px] h-[14px] mr-2 flex-shrink-0 transition-colors ${
                      activePanel === pk ? "bg-[var(--s-orange)]" : "bg-transparent"
                    }`}
                  />
                  {label.replace(/^(SCOPE|DEMAND|PROGRESS|QUALITY|COST|COMMUNICATION|RISK|DOCS)\s/, "")}
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
                  {it.label}
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
