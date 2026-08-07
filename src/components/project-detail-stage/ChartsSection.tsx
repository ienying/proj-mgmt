"use client";

interface TableDef {
  table_code: string;
  apply_project_stages: string[];
  stage_display_mode?: string;
  stage_progress_column?: string;
  stage_progress_target?: string;
}

interface StageInfo {
  code: string;
  name: string;
}

interface ChartsSectionProps {
  stages?: StageInfo[];
  tableDefs?: TableDef[];
  tableRecords?: Record<string, Array<Record<string, unknown>>>;
}

export function ChartsSection({ stages = [], tableDefs = [], tableRecords = {} }: ChartsSectionProps) {
  // 计算每个阶段的总记录数（同一张表可分属多个阶段，各阶段计数会重叠）
  const stageStats = stages.map((stage) => {
    let total = 0;
    let completed = 0;
    for (const def of tableDefs) {
      if (!def.apply_project_stages?.includes(stage.code) || def.stage_display_mode === 'menu') continue;
      const records = tableRecords[def.table_code] || [];
      total += records.length;
      if (def.stage_progress_column && def.stage_progress_target) {
        const col = def.stage_progress_column;
        const target = def.stage_progress_target.trim();
        completed += records.filter((r) => String(r[col] || "").trim() === target).length;
      }
    }
    return { label: stage.name, total, completed, pending: total - completed };
  });

  // 环形图数据 — 按去重后的实际记录数计算（避免多阶段表重复计数）
  // 只统计已分配到阶段且非"仅菜单"模式的表
  const stageTableCodes = new Set(tableDefs.filter(d => d.apply_project_stages?.length > 0 && d.stage_display_mode !== 'menu').map(d => d.table_code));
  const totalRecords = Object.entries(tableRecords)
    .filter(([code]) => stageTableCodes.has(code))
    .reduce((s, [, recs]) => s + recs.length, 0);
  let totalCompleted = 0;
  for (const def of tableDefs) {
    if (!def.apply_project_stages?.length || def.stage_display_mode === 'menu') continue;
    const records = tableRecords[def.table_code] || [];
    if (def.stage_progress_column && def.stage_progress_target) {
      const col = def.stage_progress_column;
      const target = def.stage_progress_target.trim();
      totalCompleted += records.filter((r) => String(r[col] || "").trim() === target).length;
    }
  }
  const totalPending = totalRecords - totalCompleted;
  const donutData = [
    { label: "已完成", count: totalCompleted, color: "var(--s-green)", percentage: totalRecords > 0 ? Math.round((totalCompleted / totalRecords) * 100) : 0 },
    { label: "待开始", count: totalPending, color: "var(--s-text-muted)", percentage: totalRecords > 0 ? Math.round((totalPending / totalRecords) * 100) : 0 },
  ];

  const donutRadius = 72;
  const donutStroke = 10;
  const donutCenter = 96;
  const donutCircum = 2 * Math.PI * donutRadius;
  const maxBar = Math.max(...stageStats.map((s) => s.total), 1);
  const chartColors = ["var(--s-chart-blue)", "var(--s-chart-indigo)", "var(--s-chart-sky)", "var(--s-chart-purple)", "var(--s-chart-amber)", "var(--s-chart-rose)", "var(--s-chart-gray)"];

  return (
    <div className="px-16 py-8" style={{ borderBottom: "1px solid var(--s-border)" }}>
      <div className="grid grid-cols-2 gap-px" style={{ backgroundColor: "var(--s-border)" }}>
        {/* 环形图 */}
        <div className="bg-[var(--s-bg)] p-8 flex flex-col items-center">
          <div className="text-[10px] uppercase tracking-[2px] mb-6 self-start"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
            任务状态分布
          </div>
          {totalRecords > 0 ? (
            <>
              <div className="relative" style={{ width: 192, height: 192 }}>
                <svg width="192" height="192" viewBox="0 0 192 192">
                  <circle cx={donutCenter} cy={donutCenter} r={donutRadius} fill="none" stroke="var(--s-surface2)" strokeWidth={donutStroke} />
                  {donutData.map((seg, i) => {
                    const segLen = (seg.count / totalRecords) * donutCircum;
                    const offset = donutData.slice(0, i).reduce((s, prev) => s + (prev.count / totalRecords) * donutCircum, 0);
                    return (
                      <circle key={i} cx={donutCenter} cy={donutCenter} r={donutRadius} fill="none" stroke={seg.color}
                        strokeWidth={donutStroke} strokeDasharray={`${segLen} ${donutCircum - segLen}`}
                        strokeDashoffset={-offset} transform={`rotate(-90 ${donutCenter} ${donutCenter})`}
                        className="transition-all duration-700" />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[28px] font-bold text-[var(--s-text)] leading-none" style={{ fontFamily: "var(--font-mono, monospace)" }}>{totalRecords}</span>
                  <span className="text-[10px] text-[var(--s-text-muted)] uppercase tracking-[1px]" style={{ fontFamily: "var(--font-mono, monospace)" }}>任务总数</span>
                </div>
              </div>
              <div className="flex gap-6 mt-6">
                {donutData.map((seg, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: seg.color }} />
                    <span className="text-[10px] text-[var(--s-text-secondary)] uppercase tracking-[0.5px]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                      {seg.label} {seg.count} ({seg.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-xs text-[var(--s-text-muted)] py-8">暂无数据</div>
          )}
        </div>

        {/* 条形图 */}
        <div className="bg-[var(--s-bg)] p-8">
          <div className="text-[10px] uppercase tracking-[2px] mb-8"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
            各阶段任务量
          </div>
          {stageStats.some((s) => s.total > 0) ? (
            <div className="flex flex-col gap-4">
              {stageStats.map((bar, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-[0.5px] w-12 text-right flex-shrink-0"
                    style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}>{bar.label}</span>
                  <div className="flex-1 h-4 rounded-sm overflow-hidden" style={{ backgroundColor: "var(--s-surface2)" }}>
                    <div className="h-full rounded-sm transition-all duration-700 flex items-center justify-end pr-2"
                      style={{ width: `${(bar.total / maxBar) * 100}%`, backgroundColor: chartColors[i % chartColors.length] }}>
                      <span className="text-[9px] font-bold text-white" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                        {bar.total > 0 ? bar.total : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-[var(--s-text-muted)] py-8">暂无数据</div>
          )}
        </div>
      </div>
    </div>
  );
}
