"use client";

import { donutData, barData } from "./mock-data";

export function ChartsSection() {
  // 环形图参数
  const donutRadius = 72;
  const donutStroke = 10;
  const donutCenter = 96;
  const donutCircum = 2 * Math.PI * donutRadius;
  const total = donutData.reduce((s, d) => s + d.count, 0);

  let offsetAcc = 0;
  const donutSegments = donutData.map((seg) => {
    const segPercent = seg.count / total;
    const dashLen = segPercent * donutCircum;
    const dashGap = donutCircum - dashLen;
    const offset = -offsetAcc * donutCircum;
    offsetAcc += segPercent;
    return { ...seg, dashLen, dashGap, offset };
  });

  const maxBar = Math.max(...barData.map((b) => b.value), 1);

  return (
    <div className="px-16 py-8" style={{ borderBottom: "1px solid var(--s-border)" }}>
      <div className="grid grid-cols-2 gap-px" style={{ backgroundColor: "var(--s-border)" }}>
        {/* 环形图 */}
        <div className="bg-[var(--s-bg)] p-8 flex flex-col items-center">
          <div
            className="text-[10px] uppercase tracking-[2px] mb-6 self-start"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
          >
            任务状态分布
          </div>
          <div className="relative" style={{ width: 192, height: 192 }}>
            <svg width="192" height="192" viewBox="0 0 192 192">
              {/* 背景圆环 */}
              <circle
                cx={donutCenter}
                cy={donutCenter}
                r={donutRadius}
                fill="none"
                stroke="var(--s-surface2)"
                strokeWidth={donutStroke}
              />
              {/* 数据段 */}
              {donutSegments.map((seg, i) => (
                <circle
                  key={i}
                  cx={donutCenter}
                  cy={donutCenter}
                  r={donutRadius}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={donutStroke}
                  strokeDasharray={`${seg.dashLen} ${seg.dashGap}`}
                  strokeDashoffset={seg.offset}
                  transform={`rotate(-90 ${donutCenter} ${donutCenter})`}
                  className="transition-all duration-700"
                />
              ))}
            </svg>
            {/* 中心文字 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[28px] font-bold text-[var(--s-text)] leading-none" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                {total}
              </span>
              <span className="text-[10px] text-[var(--s-text-muted)] uppercase tracking-[1px]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                任务总数
              </span>
            </div>
          </div>
          {/* 图例 */}
          <div className="flex gap-6 mt-6">
            {donutData.map((seg, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: seg.color }} />
                <span className="text-[10px] text-[var(--s-text-secondary)] uppercase tracking-[0.5px]" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                  {seg.label} {seg.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 条形图 */}
        <div className="bg-[var(--s-bg)] p-8">
          <div
            className="text-[10px] uppercase tracking-[2px] mb-8"
            style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
          >
            各阶段任务量
          </div>
          <div className="flex flex-col gap-4">
            {barData.map((bar, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className="text-[10px] uppercase tracking-[0.5px] w-12 text-right flex-shrink-0"
                  style={{ color: "var(--s-text-muted)", fontFamily: "var(--font-mono, monospace)" }}
                >
                  {bar.label}
                </span>
                <div className="flex-1 h-4 rounded-sm overflow-hidden" style={{ backgroundColor: "var(--s-surface2)" }}>
                  <div
                    className="h-full rounded-sm transition-all duration-700 flex items-center justify-end pr-2"
                    style={{
                      width: `${(bar.value / maxBar) * 100}%`,
                      backgroundColor: bar.color,
                    }}
                  >
                    <span
                      className="text-[9px] font-bold text-white"
                      style={{ fontFamily: "var(--font-mono, monospace)" }}
                    >
                      {bar.value}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
