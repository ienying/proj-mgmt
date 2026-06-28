"use client";

import { useState, useEffect, useRef } from "react";
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const currentData = panelData[hoveredPanel] || panelData.scope;

  useEffect(() => {
    if (open) {
      setHoveredPanel(activePanel);
    }
  }, [open, activePanel]);

  // 点击外部关闭 + Escape 键关闭
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // 延迟绑定，避免打开抽屉的同一个点击事件触发关闭
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* 遮罩层 */}
      <div
        className="fixed inset-0 z-34 bg-black/15 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div
        ref={drawerRef}
        className="fixed z-36 bg-[var(--s-surface)] border border-[var(--s-border)] min-w-[440px] max-h-[calc(100vh-100px)] overflow-y-auto flex"
        style={{ top: "76px", right: "80px" }}
      >
        {/* L1 列 */}
        <div className="w-[140px] flex-shrink-0 flex flex-col py-2">
          {(Object.keys(panelData) as PanelKey[]).map((pk) => {
            const p = panelData[pk];
            return (
              <button
                key={pk}
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
