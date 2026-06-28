"use client";

import { useState, useEffect } from "react";
import type { PanelData, PanelKey } from "./types";

interface NavDrawerProps {
  open: boolean;
  panelData: PanelData;
  activePanel: PanelKey;
  onPanelChange: (pk: PanelKey) => void;
  onSubClick: (key: string, label: string) => void;
  onClose: () => void;
}

export function NavDrawer({ open, panelData, activePanel, onPanelChange, onSubClick, onClose }: NavDrawerProps) {
  const [hoveredPanel, setHoveredPanel] = useState<PanelKey>("scope");
  const currentData = panelData[hoveredPanel] || panelData.scope;

  useEffect(() => {
    if (open) setHoveredPanel(activePanel);
  }, [open, activePanel]);

  return (
    <>
      {/* 遮罩层 */}
      <div
        className={`fixed inset-0 z-34 pointer-events-none transition-all ${
          open ? "pointer-events-auto bg-black/15 backdrop-blur-[2px]" : ""
        }`}
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div
        className={`fixed z-36 bg-[var(--s-surface)] border border-[var(--s-border)] min-w-[440px] max-h-[calc(100vh-100px)] overflow-y-auto flex transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
          open ? "flex opacity-100 translate-x-0" : "hidden opacity-0 translate-x-2"
        }`}
        style={{ top: "76px", right: "80px" }}
      >
        {/* L1 列 */}
        <div className="w-[140px] flex-shrink-0 flex flex-col py-2">
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
                  hoveredPanel === pk
                    ? "text-[var(--s-orange)] border-l-2 border-[var(--s-orange)] bg-[rgba(250,140,22,.06)]"
                    : "text-[var(--s-text-muted)] border-l-2 border-transparent hover:bg-[var(--s-surface2)] hover:text-[var(--s-text)]"
                }`}
              >
                <span
                  className={`w-[2px] h-[14px] mr-2 flex-shrink-0 transition-colors ${
                    hoveredPanel === pk ? "bg-[var(--s-orange)]" : "bg-transparent"
                  }`}
                />
                {p.title.replace(/^(SCOPE|DEMAND|PROGRESS|QUALITY|COST|COMMUNICATION|RISK|DOCS)\s/, "")}
              </button>
            );
          })}
        </div>

        {/* 分隔线 */}
        <div className="w-px flex-shrink-0 self-stretch my-2" style={{ backgroundColor: "var(--s-border)" }} />

        {/* L2 列 */}
        <div className="flex-1 flex flex-col overflow-y-auto">
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
              <span className={`w-1 h-1 flex-shrink-0 ${it.active ? "bg-[var(--s-orange)]" : "bg-[var(--s-border-light)]"}`} />
              {it.label}
              <span
                className="ml-auto text-[10px] px-1.5 py-0.5 font-medium"
                style={{ backgroundColor: "var(--s-surface2)", color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
              >
                {it.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
