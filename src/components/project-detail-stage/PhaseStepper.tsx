"use client";

import { phases } from "./mock-data";

interface PhaseStepperProps {
  activePhase: number;
  onPhaseChange: (idx: number) => void;
}

export function PhaseStepper({ activePhase, onPhaseChange }: PhaseStepperProps) {
  return (
    <div className="px-12 py-7 relative" style={{ borderBottom: "1px solid var(--s-border)" }}>
      <div className="flex items-start relative py-7 px-0">
        {/* 连接线 */}
        <div
          className="absolute left-5 right-5 z-0"
          style={{ top: "39px", height: "2px", backgroundColor: "var(--s-border)" }}
        />

        {phases.map((phase, i) => {
          const isDone = i < activePhase;
          const isActive = i === activePhase;

          return (
            <button
              key={phase.key}
              onClick={() => onPhaseChange(i)}
              className="flex flex-col items-center gap-2.5 flex-1 cursor-pointer relative z-10 min-w-0"
            >
              {/* 圆点 */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all ${
                  isDone
                    ? "bg-[var(--s-green)] border-[var(--s-green)] text-white"
                    : isActive
                    ? "bg-[var(--s-orange)] border-[var(--s-orange)] text-white shadow-[0_0_12px_rgba(250,140,22,.3)]"
                    : "bg-[var(--s-bg)] border-2 border-[var(--s-border)] text-[var(--s-text-muted)]"
                }`}
                style={{ fontFamily: "var(--font-mono, monospace)" }}
              >
                {isDone ? "✓" : i + 1}
              </div>

              {/* 标签 */}
              <div
                className={`text-xs font-semibold text-center leading-[1.3] transition-colors ${
                  isDone
                    ? "text-[var(--s-text-secondary)]"
                    : isActive
                    ? "text-[var(--s-orange)]"
                    : "text-[var(--s-text-muted)]"
                }`}
              >
                {phase.label}
              </div>

              {/* 日期 */}
              <div
                className={`text-[10px] transition-colors ${
                  isActive ? "text-[var(--s-text-secondary)]" : "text-[var(--s-text-muted)]"
                }`}
                style={{ fontFamily: "var(--font-mono, monospace)" }}
              >
                {phase.dateRange}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
