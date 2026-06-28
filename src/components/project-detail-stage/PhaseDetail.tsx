"use client";

import { useState, useCallback } from "react";
import { phaseDetails, phaseTasks, taskData } from "./mock-data";
import { TaskExpanded } from "./TaskExpanded";

interface PhaseDetailProps {
  phaseKey: string;
}

export function PhaseDetail({ phaseKey }: PhaseDetailProps) {
  const detail = phaseDetails[phaseKey];
  const tasks = phaseTasks[phaseKey] || [];
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const handleTaskClick = useCallback(
    (taskKey: string) => {
      setExpandedTask((prev) => (prev === taskKey ? null : taskKey));
    },
    []
  );

  if (!detail) {
    return (
      <div className="px-16 py-12 text-center text-[var(--s-text-muted)] text-sm">
        该阶段详情正在建设中...
      </div>
    );
  }

  const totalSteps = tasks.reduce((sum, t) => {
    const td = taskData[t.key];
    return sum + (td ? td.rows.length : 0);
  }, 0);
  const doneSteps = tasks.reduce((sum, t) => {
    const td = taskData[t.key];
    return sum + (td ? td.rows.filter((r) => r.status === "done").length : 0);
  }, 0);
  const progress = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  return (
    <div className="phase-section" style={{ borderBottom: "1px solid var(--s-border)" }}>
      <div className="grid grid-cols-2 min-h-[320px]">
        {/* 左侧：阶段信息 */}
        <div
          className="px-16 py-12 flex flex-col gap-6"
          style={{ borderRight: "1px solid var(--s-border)" }}
        >
          <div
            className={`text-[10px] uppercase tracking-[2px] flex items-center gap-2.5 ${
              detail.statusClass === "done"
                ? "text-[var(--s-green)]"
                : detail.statusClass === "active"
                ? "text-[var(--s-text-muted)]"
                : "text-[var(--s-text-muted)]"
            }`}
            style={{ fontFamily: "var(--font-mono, monospace)" }}
          >
            <span
              className={`w-2 h-2 ${
                detail.statusClass === "done"
                  ? "bg-[var(--s-green)]"
                  : detail.statusClass === "active"
                  ? "bg-[var(--s-orange)]"
                  : "bg-[var(--s-text-muted)]"
              }`}
            />
            {detail.statusLabel}
          </div>
          <h3 className="text-[32px] font-bold tracking-[-0.5px] leading-[1.2] text-[var(--s-text)]">
            {detail.name}
          </h3>
          <p className="text-[15px] text-[var(--s-text-secondary)] leading-[1.75] max-w-[580px]">
            {detail.description}
          </p>
          <div className="text-[11px] text-[var(--s-text-muted)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
            {detail.dateRange}
          </div>

          {/* 元数据 */}
          <div className="flex gap-px" style={{ backgroundColor: "var(--s-border)" }}>
            {detail.metaItems.map((item, i) => (
              <div
                key={i}
                className="bg-[var(--s-bg)] px-5 py-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.5px]"
                style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
              >
                <span
                  className={`text-xl font-bold tracking-[-0.5px] ${
                    item.accent ? "text-[var(--s-orange)]" : "text-[var(--s-text)]"
                  }`}
                  style={{ fontFamily: "sans-serif" }}
                >
                  {item.value}
                </span>
                {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：任务列表 */}
        <div className="px-16 py-12 flex flex-col gap-5">
          <div
            className="text-[10px] uppercase tracking-[2px] mb-1"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
          >
            阶段任务
          </div>
          <div className="flex flex-col gap-px" style={{ backgroundColor: "var(--s-border)" }}>
            {tasks.map((task) => (
              <div
                key={task.key}
                onClick={() => handleTaskClick(task.key)}
                className="bg-[var(--s-bg)] px-5 py-3.5 flex items-center justify-between cursor-pointer transition-all border-l-[3px] border-l-transparent hover:bg-[rgba(28,126,214,.06)] hover:border-l-[var(--s-blue)] hover:pl-6 hover:text-[var(--s-blue)]"
              >
                <div className="flex items-center gap-2.5 text-[13px] text-[var(--s-text-secondary)]">
                  <span
                    className={`w-1.5 h-1.5 flex-shrink-0 ${
                      task.dotStatus === "done"
                        ? "bg-[var(--s-green)]"
                        : task.dotStatus === "active"
                        ? "bg-[var(--s-orange)]"
                        : "bg-[var(--s-text-muted)]"
                    }`}
                  />
                  {task.name}
                </div>
                <span
                  className="text-[10px] text-[var(--s-text-muted)]"
                  style={{ fontFamily: "var(--font-mono, monospace)" }}
                >
                  ›
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 阶段进度条 */}
      {totalSteps > 0 && (
        <div className="px-16 py-0" style={{ borderTop: "1px solid var(--s-border)" }}>
          <div className="flex items-center gap-4 py-4">
            <span
              className="text-[9px] uppercase tracking-[1.5px] text-[var(--s-text-muted)]"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              阶段进度
            </span>
            <div className="flex-1 h-2 rounded-sm overflow-hidden" style={{ backgroundColor: "var(--s-surface2)" }}>
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  backgroundColor: detail.statusClass === "done" ? "var(--s-green)" : "var(--s-orange)",
                }}
              />
            </div>
            <span
              className="text-xs font-bold text-[var(--s-text)]"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {progress}%
            </span>
          </div>
        </div>
      )}

      {/* 任务展开面板 */}
      {expandedTask && taskData[expandedTask] && (
        <TaskExpanded
          taskKey={expandedTask}
          onClose={() => setExpandedTask(null)}
        />
      )}
    </div>
  );
}
