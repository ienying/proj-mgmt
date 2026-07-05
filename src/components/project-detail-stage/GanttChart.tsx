"use client";

interface GanttChartProps {
  records: Array<Record<string, unknown>>;
  startCol: string;
  endCol: string;
  nameCol: string;
  groupCol?: string;
  milestoneCol?: string;
  milestoneValue?: string;
  timeScale?: "day" | "month";
}

const BAR_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#6366f1"];
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export function GanttChart({ records, startCol, endCol, nameCol, groupCol, milestoneCol, milestoneValue, timeScale = "month" }: GanttChartProps) {
  if (records.length === 0) return <div className="text-center py-8 text-sm text-muted-foreground">暂无数据</div>;

  const allDates: Date[] = [];
  for (const r of records) {
    const s = String(r[startCol] || ""); const e = String(r[endCol] || "");
    if (s) allDates.push(new Date(s)); if (e) allDates.push(new Date(e));
  }
  if (allDates.length === 0) return <div className="text-center py-8 text-sm text-muted-foreground">缺少日期数据</div>;

  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));

  let ticks: { label: string; sub?: string; left: number; width: number }[] = [];
  let totalUnits: number;

  if (timeScale === "day") {
    const start = new Date(minDate); start.setHours(0, 0, 0, 0);
    const end = new Date(maxDate); end.setHours(23, 59, 59, 999);
    totalUnits = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    for (let i = 0; i < totalUnits; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      ticks.push({
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        sub: WEEKDAYS[d.getDay()],
        left: (i / totalUnits) * 100,
        width: (1 / totalUnits) * 100,
      });
    }
  } else {
    // month
    const monthStart = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const monthEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
    totalUnits = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / 86400000) + 1;
    const c = new Date(monthStart);
    while (c <= maxDate) {
      const mEnd = new Date(c.getFullYear(), c.getMonth() + 1, 0);
      ticks.push({
        label: `${c.getFullYear()}.${c.getMonth() + 1}`,
        left: ((c.getTime() - minDate.getTime()) / 86400000 / totalUnits) * 100,
        width: Math.max(((Math.min(maxDate.getTime(), mEnd.getTime()) - Math.max(minDate.getTime(), c.getTime())) / 86400000 / totalUnits) * 100, 0.5),
      });
      c.setMonth(c.getMonth() + 1);
    }
  }

  const todayPct = ((new Date().getTime() - minDate.getTime()) / 86400000 / totalUnits) * 100;
  const isToday = todayPct >= 0 && todayPct <= 100;
  const sidebarW = 220;
  const rowH = 34;

  // 分组
  const groups: { name: string; items: typeof records; color: string }[] = [];
  if (groupCol) {
    const map = new Map<string, typeof records>();
    for (const r of records) { const g = String(r[groupCol] || "其他"); if (!map.has(g)) map.set(g, []); map.get(g)!.push(r); }
    let ci = 0; for (const [k, v] of map) { groups.push({ name: k, items: v, color: BAR_COLORS[ci % BAR_COLORS.length] }); ci++; }
  } else { groups.push({ name: "", items: records, color: BAR_COLORS[0] }); }

  return (
    <div className="text-xs" style={{ fontFamily: "var(--font-mono, monospace)" }}>
      {/* 时间标尺 */}
      {timeScale === "day" ? (
        <>
          {/* 日期行（带竖线网格） */}
          <div className="relative h-5" style={{ marginLeft: sidebarW }}>
            {ticks.map((t, i) => (
              <div key={i} className="absolute text-[10px] text-muted-foreground text-center overflow-hidden border-l border-border/20"
                style={{ left: `${t.left}%`, width: `${Math.max(t.width, 0.3)}%` }}>
                {t.width > 3 ? t.label.replace(/^\d+\//, "") : ""}
              </div>
            ))}
          </div>
          {/* 星期行（带竖线网格，周末虚线） */}
          <div className="relative h-4 border-b border-border/30" style={{ marginLeft: sidebarW }}>
            {ticks.map((t, i) => (
              <div key={i} className={`absolute text-[9px] text-muted-foreground/60 text-center overflow-hidden border-l ${(t.sub === "六" || t.sub === "日") ? "border-dashed border-red-200" : "border-border/20"}`}
                style={{ left: `${t.left}%`, width: `${Math.max(t.width, 0.3)}%`, color: (t.sub === "六" || t.sub === "日") ? "var(--s-red)" : undefined }}>
                {t.width > 2 ? t.sub : ""}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="relative h-6" style={{ marginLeft: sidebarW }}>
          {ticks.map((t, i) => (
            <div key={i} className="absolute text-[10px] text-muted-foreground text-center overflow-hidden border-l border-border/30"
              style={{ left: `${t.left}%`, width: `${Math.max(t.width, 0.3)}%` }}>
              {t.width > 3 ? t.label : ""}
            </div>
          ))}
        </div>
      )}

      {/* 今日线 */}
      {isToday && (
        <div className="relative" style={{ marginLeft: sidebarW }}>
          <div className="absolute top-0 bottom-0 w-px bg-red-500 z-20" style={{ left: `${todayPct}%` }}>
            <span className="absolute -top-4 -left-3 text-[9px] text-red-500 whitespace-nowrap font-semibold">今天</span>
          </div>
        </div>
      )}

      {/* 任务行 */}
      {groups.map((group, gi) => (
        <div key={gi} className="mb-1">
          {group.name && <div className="text-[11px] font-semibold text-muted-foreground px-2 py-1.5 bg-muted/30 rounded">{group.name}</div>}
          {group.items.map((r, ri) => {
            const start = new Date(String(r[startCol] || ""));
            const end = new Date(String(r[endCol] || ""));
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
            const left = ((start.getTime() - minDate.getTime()) / 86400000 / totalUnits) * 100;
            const width = Math.max(((end.getTime() - start.getTime()) / 86400000 / totalUnits) * 100, 0.8);
            const isMilestone = milestoneCol && milestoneValue && String(r[milestoneCol] || "") === milestoneValue;
            const color = group.color;

            return (
              <div key={ri} className="flex items-center hover:bg-muted/20 rounded transition-colors" style={{ height: rowH }}>
                <div className="shrink-0 text-xs truncate px-2" style={{ width: sidebarW }}>
                  {isMilestone && <span className="text-orange-500 mr-1 font-bold">◆</span>}
                  <span className="text-foreground">{String(r[nameCol] || `任务${ri + 1}`)}</span>
                </div>
                <div className="flex-1 relative" style={{ height: rowH }}>
                  <div
                    className={`absolute top-0.5 bottom-0.5 flex items-center px-1.5 text-[10px] text-white overflow-hidden cursor-default transition-shadow hover:shadow-md ${isMilestone ? "!rounded-full !w-4 !h-4 !top-2.5" : ""}`}
                    style={{ left: `${left}%`, width: isMilestone ? "16px" : `${width}%`, backgroundColor: color, minWidth: isMilestone ? "16px" : "2px" }}
                    title={`${String(r[nameCol] || "")}\n${startCol}: ${String(r[startCol] || "")}\n${endCol}: ${String(r[endCol] || "")}`}>
                    {!isMilestone && width > 4 && (
                      <span className="truncate">{String(r[nameCol] || "")}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
