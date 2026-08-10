"use client";

interface TableDef {
  table_code: string;
  table_name: string;
  apply_project_stages: string[];
  stage_display_mode?: string;
  stage_progress_column?: string;
  stage_progress_target?: string;
}

interface StageInfo {
  code: string;
  name: string;
}

interface OverviewGridProps {
  stages?: StageInfo[];
  tableDefs?: TableDef[];
  tableRecords?: Record<string, Array<Record<string, unknown>>>;
  isDark?: boolean;
}

export function OverviewGrid({ stages = [], tableDefs = [], tableRecords = {}, isDark = false }: OverviewGridProps) {
  if (stages.length === 0) return null;

  return (
    <div className="px-12 py-8" style={{ borderBottom: "1px solid var(--s-border)" }}>
      <div className="grid gap-px"
        style={{ gridTemplateColumns: `repeat(${stages.length}, 1fr)`, backgroundColor: "var(--s-border)" }}>
        {stages.map((stage) => {
          const phaseTables = tableDefs.filter((def) =>
            def.apply_project_stages?.includes(stage.code) &&
            (!def.stage_display_mode || def.stage_display_mode === "phase" || def.stage_display_mode === "both")
          );
          let totalRecords = 0;
          let completedRecords = 0;

          for (const def of phaseTables) {
            const records = tableRecords[def.table_code];
            if (!records || records.length === 0) continue;
            totalRecords += records.length;
            if (def.stage_progress_column && def.stage_progress_target) {
              const col = def.stage_progress_column;
              const target = def.stage_progress_target.trim();
              completedRecords += records.filter((r) => String(r[col] || "").trim() === target).length;
            }
          }

          const progress = totalRecords > 0 ? Math.round((completedRecords / totalRecords) * 100) : 0;
          const status = progress >= 100 ? "done" : progress > 0 ? "active" : "pending";

          return (
            <div key={stage.code} className="bg-[var(--s-bg)] p-5 flex flex-col gap-3">
              <div className="font-semibold text-center leading-tight"
                style={{ fontSize: "18px", color: isDark ? "#ffffff" : "#000000" }}>
                {stage.name}
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl font-bold tracking-[-0.5px]"
                  style={{
                    color: status === "done" ? "var(--s-green)" : status === "active" ? "var(--s-orange)" : "var(--s-text-muted)",
                    fontFamily: "var(--font-mono, monospace)",
                  }}>
                  {completedRecords}/{totalRecords || "-"}
                </span>
              </div>
              <div className="h-1.5 rounded-sm overflow-hidden" style={{ backgroundColor: "var(--s-surface2)" }}>
                <div className="h-full transition-all duration-500 rounded-sm"
                  style={{
                    width: `${totalRecords > 0 ? progress : 0}%`,
                    backgroundColor: status === "done" ? "var(--s-green)" : status === "active" ? "var(--s-orange)" : "var(--s-text-muted)",
                  }} />
              </div>
              <span className={`text-[10px] text-center uppercase tracking-[0.5px] ${
                status === "done" ? "text-[var(--s-green)]" : status === "active" ? "text-[var(--s-orange)]" : "text-[var(--s-text-muted)]"
              }`} style={{ fontFamily: "var(--font-mono, monospace)" }}>
                {status === "done" ? "已完成" : status === "active" ? "进行中" : "待开始"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
