"use client";

import { useState, useEffect, useCallback } from "react";
import { School, TrendingUp, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CUSTOMER_TYPE_OPTIONS, ALL_DEPARTMENTS } from "@/lib/case-center-constants";
import { toast } from "sonner";
import { CompareView } from "./compare-view";

interface StatsRow {
  module_code: string;
  module_name: string;
  school_count: string;
  avg_usage_rate: string;
  total_active_users: string;
  total_materials: string;
}

interface RankingRow {
  school_id: string;
  school_name: string;
  customer_types: string[];
  location: Record<string, string>;
  usage_rate: number;
  active_users: number;
  effect: string;
  materials: Array<{ key: string; name: string; size: number }>;
  department_name: string;
  module_name: string;
  module_code: string;
}

interface TypeDistRow {
  school_type: string;
  school_count: string;
}

interface ModuleRankingRow {
  module_code: string;
  module_name: string;
  landed_schools: string;
  active_schools: string;
  trial_schools: string;
  not_purchased_schools: string;
  coverage_rate: string;
  total_school_count: string;
}

interface FilterOption {
  department_code: string;
  department_name: string;
  module_code: string;
  module_name: string;
}

interface ProvinceDistRow {
  province: string;
  school_count: string;
}

export function ProductCases({ onBack }: { onBack?: () => void }) {
  const [department, setDepartment] = useState("all");
  const [module, setModule] = useState("all");
  const [schoolType, setSchoolType] = useState("all");
  const customerType = schoolType;
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<StatsRow[]>([]);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<TypeDistRow[]>([]);
  const [moduleRanking, setModuleRanking] = useState<ModuleRankingRow[]>([]);
  const [deptOptions, setDeptOptions] = useState<FilterOption[]>([]);
  const [moduleOptions, setModuleOptions] = useState<FilterOption[]>([]);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [moduleRankSort, setModuleRankSort] = useState<"landed" | "coverage">("landed");
  const [expandedRankTip, setExpandedRankTip] = useState<string | null>(null);
  const [provinceDistribution, setProvinceDistribution] = useState<ProvinceDistRow[]>([]);
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (department !== "all") params.set("department_code", department);
      if (module !== "all") params.set("module_code", module);
      if (customerType !== "all") params.set("customer_type", customerType);

      const res = await fetch(`/api/case-center/product-cases?${params.toString()}`);
      if (res.ok) {
        const { data } = await res.json();
        setStats(data.stats || []);
        setRanking(data.ranking || []);
        setTypeDistribution(data.typeDistribution || []);
        setModuleRanking(data.moduleRanking || []);
        setProvinceDistribution(data.provinceDistribution || []);
        setDeptOptions(data.filterOptions?.departments || []);
        setModuleOptions(data.filterOptions?.modules || []);
      }
    } catch {
      toast.error("加载产品案例数据失败");
    } finally {
      setLoading(false);
    }
  }, [department, module, customerType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 汇总统计
  const totalSchools = stats.reduce((sum, s) => sum + Number(s.school_count), 0);
  const avgUsage = stats.length > 0
    ? Math.round(stats.reduce((sum, s) => sum + Number(s.avg_usage_rate) * Number(s.school_count), 0) / totalSchools)
    : 0;
  const totalActiveUsers = ranking.reduce((sum, r) => sum + Number(r.active_users), 0);
  const totalMaterials = ranking.reduce(
    (sum, r) => sum + (Array.isArray(r.materials) ? r.materials.length : 0), 0
  );

  const toggleSelectSchool = (schoolId: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(schoolId)) return prev.filter((id) => id !== schoolId);
      if (prev.length >= 4) {
        toast.error("最多选择4所学校进行对比");
        return prev;
      }
      return [...prev, schoolId];
    });
  };

  const compareSchools = ranking.filter((r) => selectedForCompare.includes(r.school_id));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current mr-2" />
        加载中...
      </div>
    );
  }

  return (
    <div className="db" style={{ padding: "0 14px 24px", background: "var(--bg)", minHeight: "100%" }}>
      {/* ========== Header ========== */}
      <div className="db-header">
        <div className="flex items-center gap-4">
          {onBack && (
            <button className="btn-sm" onClick={onBack} style={{ marginRight: 4, fontSize: 11 }}>
              ← 返回画像列表
            </button>
          )}
          <div className="db-pulse" />
          <span style={{ fontSize: 14, fontWeight: 700 }}>产品案例</span>
          <span style={{ fontSize: 11, color: "var(--text3)" }}>PRODUCT CASE ANALYTICS</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="db-clock">按产品目录维度分析模块覆盖率、使用率与落地情况</span>
        </div>
      </div>

      {/* ========== KPI Row ========== */}
      <div className="kpi6" style={{ marginTop: 10, marginBottom: "var(--gap)" }}>
        <div className="tk tk-k1">
          <div className="tk-val">{totalSchools}</div>
          <div className="tk-label">落地学校</div>
        </div>
        <div className="tk tk-k2">
          <div className="tk-val">{avgUsage}%</div>
          <div className="tk-label">平均使用率</div>
        </div>
        <div className="tk tk-k3">
          <div className="tk-val">{totalActiveUsers}</div>
          <div className="tk-label">活跃用户</div>
        </div>
        <div className="tk tk-k4">
          <div className="tk-val">{totalMaterials}</div>
          <div className="tk-label">素材总数</div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="db-panel" style={{ marginBottom: "var(--gap)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className="db-section-title" style={{ marginBottom: 0, marginRight: 4 }}>筛选</span>
        <Select value={department} onValueChange={(v) => { setDepartment(v); setModule("all"); }}>
          <SelectTrigger className="w-[160px] h-8 text-xs rounded-[6px]">
            <SelectValue placeholder="选择科室" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部科室</SelectItem>
            {ALL_DEPARTMENTS.map((d) => (
              <SelectItem key={d.code} value={d.code}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={module} onValueChange={setModule}>
          <SelectTrigger className="w-[160px] h-8 text-xs rounded-[6px]">
            <SelectValue placeholder="选择模块" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部模块</SelectItem>
            {moduleOptions.map((m) => (
              <SelectItem key={m.module_code} value={m.module_code}>{m.module_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={schoolType} onValueChange={setSchoolType}>
          <SelectTrigger className="w-[140px] h-8 text-xs rounded-[6px]">
            <SelectValue placeholder="学校类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {CUSTOMER_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button className="btn-sm" onClick={fetchData} style={{ marginLeft: "auto" }}>🔄 刷新</button>
      </div>

      {/* ========== Main 2-column layout ========== */}
      <div className="main2" style={{ marginBottom: 10 }}>
        {/* ---- LEFT PANEL ---- */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

          {/* 产品目录排名 + 使用率柱状图 */}
          {moduleRanking.length > 0 && (
            <div className="db-panel">
              <div className="db-section-title" style={{ justifyContent: "space-between" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TrendingUp style={{ width: 15, height: 15 }} />
                  产品目录排行
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    className="btn-sm"
                    style={moduleRankSort === "landed" ? { borderColor: "var(--p1)", color: "var(--p)", background: "#e8f0fe" } : {}}
                    onClick={() => setModuleRankSort("landed")}
                  >按落地</button>
                  <button
                    className="btn-sm"
                    style={moduleRankSort === "coverage" ? { borderColor: "var(--p1)", color: "var(--p)", background: "#e8f0fe" } : {}}
                    onClick={() => setModuleRankSort("coverage")}
                  >按覆盖率</button>
                </div>
              </div>
              {/* 使用率柱状图 */}
              {stats.length > 0 && (() => {
                const barMax = Math.max(...stats.map(s => Number(s.avg_usage_rate) || 0), 1);
                const barColors = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
                return (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 6 }}>使用率统计 (%)</div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, paddingBottom: 18, position: "relative" }}>
                      {stats.map((s, i) => {
                        const v = Number(s.avg_usage_rate) || 0;
                        const h = Math.max(4, (v / barMax) * 96);
                        return (
                          <div key={s.module_code} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", position: "relative" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, marginBottom: 2, color: "var(--text)" }}>{v}%</span>
                            <div style={{
                              width: "100%", maxWidth: 48, height: h,
                              borderRadius: "4px 4px 0 0",
                              background: barColors[i % barColors.length],
                              transition: "height .3s",
                              minWidth: 20
                            }} />
                            <span style={{ fontSize: 9, color: "var(--text2)", position: "absolute", bottom: -18, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%", textAlign: "center" }}>
                              {s.module_name.length > 3 ? s.module_name.slice(0, 3) + "…" : s.module_name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {/* 排名列表 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(() => {
                  const sorted = [...moduleRanking].sort((a, b) => {
                    if (moduleRankSort === "coverage") return Number(b.coverage_rate) - Number(a.coverage_rate);
                    return Number(b.landed_schools) - Number(a.landed_schools);
                  });
                  return sorted.map((m, i) => {
                    const coverage = Number(m.coverage_rate) || 0;
                    const isTop3 = i < 3 && Number(m.landed_schools) > 0;
                    return (
                      <div
                        key={m.module_code}
                        onClick={() => setExpandedRankTip(expandedRankTip === m.module_code ? null : m.module_code)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                          borderRadius: 8, cursor: "pointer", background: isTop3 ? "var(--card2)" : "transparent",
                          transition: "background .15s"
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", width: 18 }}>
                          {isTop3 ? "⭐" : i + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{m.module_name}</div>
                          <div style={{ fontSize: 10, color: "var(--text2)" }}>
                            {m.landed_schools}/{m.total_school_count} 校 · {coverage}% 覆盖
                          </div>
                        </div>
                        <div style={{ width: 60 }}>
                          <div style={{ height: 4, borderRadius: 2, background: "var(--border)", overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 2,
                              background: coverage > 60 ? "var(--g)" : coverage >= 30 ? "var(--y)" : "var(--r)",
                              width: `${Math.min(coverage, 100)}%`
                            }} />
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              {expandedRankTip && (
                <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "#e8f0fe", fontSize: 11, color: "var(--text2)", lineHeight: 1.6 }}>
                  {(() => {
                    const m = moduleRanking.find((r) => r.module_code === expandedRankTip);
                    if (!m) return null;
                    const coverage = Number(m.coverage_rate) || 0;
                    if (coverage > 60) return <>⭐ <strong>{m.module_name}</strong>（核心产品）：已覆盖<strong>{m.landed_schools}</strong>所学校，覆盖率<strong>{coverage}%</strong>。建议对所有未购学校优先推荐。</>;
                    if (coverage >= 30) return <>📈 <strong>{m.module_name}</strong>（增长潜力）：覆盖率<strong>{coverage}%</strong>，落地<strong>{m.landed_schools}</strong>所学校，建议加大推广。</>;
                    return <>⚠ <strong>{m.module_name}</strong>（需关注）：覆盖率仅<strong>{coverage}%</strong>，落地<strong>{m.landed_schools}</strong>所学校，建议分析原因并制定推进方案。</>;
                  })()}
                </div>
              )}
            </div>
          )}

          {/* 模块覆盖率卡片 */}
          {stats.length > 0 && (
            <div className="db-panel">
              <div className="db-section-title">
                <BarChart3 style={{ width: 15, height: 15 }} />
                模块覆盖率概览
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stats.map((s) => {
                  const rate = Number(s.avg_usage_rate) || 0;
                  return (
                    <div key={s.module_code} style={{
                      background: "var(--card2)", borderRadius: 8, padding: "10px 14px",
                      display: "flex", alignItems: "center", gap: 12
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{s.module_name}</div>
                        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text2)" }}>
                          <span>🏫 {s.school_count} 校</span>
                          <span>👤 {s.total_active_users} 用户</span>
                          <span>📎 {s.total_materials} 素材</span>
                        </div>
                      </div>
                      <div style={{ width: 80, textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 900, color: rate >= 60 ? "var(--g)" : rate >= 30 ? "var(--y)" : "var(--r)" }}>
                          {s.avg_usage_rate}%
                        </div>
                        <div style={{ fontSize: 9, color: "var(--text3)" }}>使用率</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ---- RIGHT PANEL ---- */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>

          {/* 学校类型饼状图 */}
          <div className="db-panel">
            <div className="db-section-title">
              <School style={{ width: 15, height: 15 }} />
              学校类型分布
            </div>
            {typeDistribution.length === 0 ? (
              <div style={{ textAlign: "center", padding: 24, fontSize: 12, color: "var(--text3)" }}>暂无数据</div>
            ) : (
              (() => {
                const pieColors = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];
                const total = typeDistribution.reduce((sum, t) => sum + Number(t.school_count), 0);
                const cx = 90, cy = 90, r = 75, innerR = 38;
                let cumAngle = 0;
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <svg width="180" height="180" viewBox="0 0 180 180" style={{ flexShrink: 0 }}>
                      {typeDistribution.map((t, i) => {
                        const count = Number(t.school_count);
                        const pct = total > 0 ? count / total : 0;
                        const angle = pct * 360;
                        const startAngle = cumAngle;
                        cumAngle += angle;
                        if (angle < 0.5) return null;
                        const toRad = (deg: number) => (deg - 90) * Math.PI / 180;
                        const a0 = toRad(startAngle);
                        const a1 = toRad(startAngle + angle);
                        const x1o = cx + r * Math.cos(a0), y1o = cy + r * Math.sin(a0);
                        const x2o = cx + r * Math.cos(a1), y2o = cy + r * Math.sin(a1);
                        const x1i = cx + innerR * Math.cos(a0), y1i = cy + innerR * Math.sin(a0);
                        const x2i = cx + innerR * Math.cos(a1), y2i = cy + innerR * Math.sin(a1);
                        const large = angle > 180 ? 1 : 0;
                        const d = `M${x1o},${y1o} A${r},${r} 0 ${large} 1 ${x2o},${y2o} L${x2i},${y2i} A${innerR},${innerR} 0 ${large} 0 ${x1i},${y1i} Z`;
                        return <path key={t.school_type} d={d} fill={pieColors[i % pieColors.length]} stroke="#fff" strokeWidth="1.5" />;
                      })}
                      <circle cx={cx} cy={cy} r={innerR} fill="#fff" />
                      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="16" fontWeight="900" fill="var(--text)">{total}</text>
                      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="var(--text3)">学校总数</text>
                    </svg>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                      {typeDistribution.map((t, i) => {
                        const count = Number(t.school_count);
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={t.school_type} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                            <span style={{ width: 9, height: 9, borderRadius: 2, background: pieColors[i % pieColors.length], flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{t.school_type}</span>
                            <span style={{ fontWeight: 700, fontSize: 10 }}>{count}</span>
                            <span style={{ color: "var(--text3)", fontSize: 10, width: 30, textAlign: "right" }}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* 产品使用排行 */}
          <div className="db-panel">
            <div className="db-section-title" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                🏆 产品使用排行
              </span>
              <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 400 }}>按使用率</span>
            </div>
            {stats.length === 0 ? (
              <div style={{ textAlign: "center", padding: 20, fontSize: 12, color: "var(--text3)" }}>暂无数据</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...stats].sort((a, b) => (Number(b.avg_usage_rate) || 0) - (Number(a.avg_usage_rate) || 0)).map((s, i) => {
                  const rate = Number(s.avg_usage_rate) || 0;
                  const colors = ["#6366f1", "#3b82f6", "#10b981"];
                  return (
                    <div key={s.module_code} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800, color: "#fff",
                        background: i < 3 ? colors[i] : "var(--text3)"
                      }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{s.module_name}</div>
                        <div style={{ fontSize: 10, color: "var(--text2)" }}>{s.school_count} 所学校使用</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <div style={{ width: 50, height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 3,
                            background: rate >= 60 ? "linear-gradient(90deg, #10b981, #34d399)" : rate >= 30 ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #ef4444, #f87171)",
                            width: `${Math.min(rate, 100)}%`
                          }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, width: 36, textAlign: "right" }}>{rate}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 学校列表 */}
      <div className="db-panel" style={{ marginTop: "var(--gap)" }}>
        <div className="db-section-title" style={{ justifyContent: "space-between" }}>
          <span>落地学校列表</span>
          <div className="flex items-center gap-2">
            {selectedForCompare.length >= 2 && (
              <button className="btn-sm" onClick={() => setShowCompare(true)}>
                对比选中 ({selectedForCompare.length})
              </button>
            )}
          </div>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-8 px-2 py-2">对比</th>
                <th className="text-left px-4 py-2 font-medium">学校名称</th>
                <th className="text-left px-4 py-2 font-medium">类型</th>
                <th className="text-left px-4 py-2 font-medium">科室</th>
                <th className="text-left px-4 py-2 font-medium">模块</th>
                <th className="text-center px-4 py-2 font-medium">使用率</th>
                <th className="text-center px-4 py-2 font-medium">活跃用户</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r) => (
                <tr key={r.school_id} className="border-t hover:bg-muted/30">
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedForCompare.includes(r.school_id)}
                      onChange={() => toggleSelectSchool(r.school_id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">{r.school_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground ml-5">
                      {r.location ? [r.location.province, r.location.city].filter(Boolean).join(" ") : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(r.customer_types || []).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs">{r.department_name}</td>
                  <td className="px-4 py-2 text-xs">{r.module_name}</td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center gap-1.5 justify-center">
                      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${r.usage_rate}%` }} />
                      </div>
                      <span className="text-xs">{r.usage_rate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center text-xs">{r.active_users}</td>
                </tr>
              ))}
              {ranking.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                    暂无符合条件的落地学校数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 对比弹窗 */}
      {showCompare && (
        <CompareView
          schools={compareSchools}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}
