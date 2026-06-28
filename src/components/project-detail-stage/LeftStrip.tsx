"use client";

import { useState } from "react";
import type { PanelData, PanelKey } from "./types";

interface LeftStripProps {
  panelData: PanelData;
  activePanel: PanelKey;
  onPanelChange: (pk: PanelKey) => void;
  onSubClick: (key: string, label: string) => void;
}

export function LeftStrip({ panelData, activePanel, onPanelChange, onSubClick }: LeftStripProps) {
  const [hoveredPanel, setHoveredPanel] = useState<PanelKey>("scope");
  const currentData = panelData[hoveredPanel] || panelData.scope;

  return (
    <div
      className="fixed left-0 top-0 h-screen z-30 flex items-stretch cursor-default overflow-hidden"
      style={{ width: "12px", transition: "width 0.3s" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.width = "440px"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.width = "12px"; }}
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
            {(Object.keys(panelData) as PanelKey[]).map((pk) => {
              const p = panelData[pk];
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
                  {p.title.replace(/^(SCOPE|DEMAND|PROGRESS|QUALITY|COST|COMMUNICATION|RISK|DOCS)\s/, "")}
                </button>
              );
            })}
          </div>

          {/* 分隔线 */}
          <div className="w-px flex-shrink-0 self-stretch my-2" style={{ backgroundColor: "var(--s-border)" }} />

          {/* L2 列：当前面板的子项 */}
          <div className="flex-1 flex flex-col py-0 overflow-y-auto">
            <div
              className="text-[10px] font-bold px-3 py-3 uppercase tracking-[1px] flex-shrink-0"
              style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
            >
              {currentData.title}
            </div>
            {currentData.items.map((it, i) => (
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
                    it.active ? "bg-[var(--s-orange)]" : "bg-[var(--s-border-light)]"
                  }`}
                />
                {it.label}
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
