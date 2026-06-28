"use client";

import { overviewItems } from "./mock-data";

export function OverviewGrid() {
  return (
    <div className="px-12 py-8" style={{ borderBottom: "1px solid var(--s-border)" }}>
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: "repeat(7, 1fr)",
          backgroundColor: "var(--s-border)",
        }}
      >
        {overviewItems.map((item, i) => (
          <div
            key={i}
            className="bg-[var(--s-bg)] p-5 flex flex-col gap-3"
          >
            <div className="text-[11px] font-semibold text-center text-[var(--s-text-secondary)] leading-tight">
              {item.name}
            </div>
            <div className="flex flex-col items-center gap-1">
              <span
                className="text-xl font-bold tracking-[-0.5px]"
                style={{
                  color:
                    item.status === "done"
                      ? "var(--s-green)"
                      : item.status === "active"
                      ? "var(--s-orange)"
                      : "var(--s-text-muted)",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              >
                {item.completed}/{item.total}
              </span>
            </div>
            {/* 进度条 */}
            <div
              className="h-1.5 rounded-sm overflow-hidden"
              style={{ backgroundColor: "var(--s-surface2)" }}
            >
              <div
                className="h-full transition-all duration-500 rounded-sm"
                style={{
                  width: `${item.progress}%`,
                  backgroundColor:
                    item.status === "done"
                      ? "var(--s-green)"
                      : item.status === "active"
                      ? "var(--s-orange)"
                      : "var(--s-text-muted)",
                }}
              />
            </div>
            <span
              className={`text-[10px] text-center uppercase tracking-[0.5px] ${
                item.status === "done"
                  ? "text-[var(--s-green)]"
                  : item.status === "active"
                  ? "text-[var(--s-orange)]"
                  : "text-[var(--s-text-muted)]"
              }`}
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {item.status === "done" ? "已完成" : item.status === "active" ? "进行中" : "待开始"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
