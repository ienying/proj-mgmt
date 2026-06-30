"use client";

interface PhaseStepperProps {
  activePhase: number;
  onPhaseChange: (idx: number) => void;
  /** 系统设置中的项目阶段列表（含sort_order用于排序） */
  stages?: { code: string; name: string; sort_order?: number }[];
  /** 每个阶段的日期范围 { planStart, planEnd } */
  phaseDates?: Record<number, { planStart?: string; planEnd?: string; actualStart?: string; actualEnd?: string }>;
}

export function PhaseStepper({ activePhase, onPhaseChange, stages = [], phaseDates }: PhaseStepperProps) {
  const sortedStages = stages.length > 0
    ? [...stages].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
    : [];
  const phases = sortedStages.length > 0
    ? sortedStages.map((s, i) => ({
        key: s.code,
        label: s.name,
        index: i,
      }))
    : [
        { key: "launch", label: "启动", index: 0 },
        { key: "research", label: "调研", index: 1 },
        { key: "deploy", label: "部署", index: 2 },
        { key: "develop", label: "开发", index: 3 },
        { key: "trial", label: "试运行", index: 4 },
        { key: "online", label: "上线", index: 5 },
        { key: "accept", label: "验收", index: 6 },
      ];

  const fmt = (d: string) => {
    if (!d) return "";
    const parts = d.split(/[-T]/);
    if (parts.length >= 3) return `${parts[0]}.${parts[1]}.${parts[2]}`;
    if (parts.length === 2) return `${parts[0]}.${parts[1]}`;
    return d;
  };

  return (
    <div className="px-12 py-7 relative" style={{ borderBottom: "1px solid var(--s-border)" }}>
      <div className="flex items-center gap-4 mb-2 px-4">
        <span className="text-[11px] uppercase tracking-[2px]"
          style={{ color: "var(--s-text-secondary)", fontFamily: "var(--font-mono, monospace)" }}>
          Phases 项目阶段
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--s-border)" }} />
      </div>

      <div className="flex items-start relative py-7 px-0">
        <div className="absolute left-5 right-5 z-0"
          style={{ top: "39px", height: "2px", backgroundColor: "var(--s-border)" }} />

        {phases.map((phase, i) => {
          const isDone = i < activePhase;
          const isActive = i === activePhase;
          const dates = phaseDates?.[i];

          return (
            <button key={phase.key} onClick={() => onPhaseChange(i)}
              className="flex flex-col items-center gap-1.5 flex-1 cursor-pointer relative z-10 min-w-0">

              {/* 圆点 */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 transition-all ${
                isDone ? "bg-[var(--s-green)] border-[var(--s-green)] text-white" :
                isActive ? "bg-[var(--s-orange)] border-[var(--s-orange)] text-white shadow-[0_0_12px_rgba(250,140,22,.3)]" :
                "bg-[var(--s-bg)] border-2 border-[var(--s-border)] text-[var(--s-text-muted)]"
              }`} style={{ fontFamily: "var(--font-mono, monospace)" }}>
                {isDone ? "✓" : i + 1}
              </div>

              {/* 标签 */}
              <div className={`text-xs font-semibold text-center leading-[1.3] transition-colors ${
                isDone ? "text-[var(--s-text-secondary)]" : isActive ? "text-[var(--s-orange)]" : "text-[var(--s-text-muted)]"
              }`}>
                {phase.label}
              </div>

              {/* 日期 */}
              {dates && (
                <div className="text-center leading-[1.2]">
                  {(dates.planStart || dates.planEnd) && (
                    <div className={`text-[9px] ${isActive ? "text-[var(--s-text-secondary)]" : "text-[var(--s-text-muted)]"}`}
                      style={{ fontFamily: "var(--font-mono, monospace)" }}>
                      {fmt(dates.planStart || "")} - {fmt(dates.planEnd || "")}
                    </div>
                  )}
                  {dates.actualEnd && dates.planEnd && dates.actualEnd > dates.planEnd && (
                    <div className="text-[9px] text-[var(--s-red)]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                      ⚠ {fmt(dates.actualEnd)}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
