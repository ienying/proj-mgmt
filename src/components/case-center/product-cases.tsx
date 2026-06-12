"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, School, TrendingUp, Users, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CUSTOMER_TYPE_OPTIONS, ALL_DEPARTMENTS, PROVINCES } from "@/lib/case-center-constants";
import { cn } from "@/lib/utils";
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

export function ProductCases() {
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
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);

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

  // 学校类型分布用于简单柱状图
  const maxTypeCount = Math.max(...typeDistribution.map((t) => Number(t.school_count)), 1);

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
    <div className="p-4 space-y-4">
      {/* 筛选栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={department} onValueChange={(v) => { setDepartment(v); setModule("all"); }}>
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[180px]">
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
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="学校类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {CUSTOMER_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="ml-auto" onClick={fetchData}>
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <School className="w-8 h-8 text-blue-500" />
            <div>
              <div className="text-lg font-bold">{totalSchools}</div>
              <div className="text-xs text-muted-foreground">落地学校</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div>
              <div className="text-lg font-bold">{avgUsage}%</div>
              <div className="text-xs text-muted-foreground">平均使用率</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Users className="w-8 h-8 text-orange-500" />
            <div>
              <div className="text-lg font-bold">{totalActiveUsers.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">活跃用户</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-500" />
            <div>
              <div className="text-lg font-bold">{totalMaterials}</div>
              <div className="text-xs text-muted-foreground">素材总数</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 模块统计 */}
      {stats.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            模块统计概览
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">模块</th>
                  <th className="text-center px-4 py-2 font-medium">落地学校</th>
                  <th className="text-center px-4 py-2 font-medium">平均使用率</th>
                  <th className="text-center px-4 py-2 font-medium">活跃用户</th>
                  <th className="text-center px-4 py-2 font-medium">素材数</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.module_code} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{s.module_name}</td>
                    <td className="px-4 py-2 text-center">{s.school_count}</td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${s.avg_usage_rate}%` }} />
                        </div>
                        <span>{s.avg_usage_rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">{s.total_active_users}</td>
                    <td className="px-4 py-2 text-center">{s.total_materials}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 产品模块使用排名 */}
      {moduleRanking.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              产品模块使用排名
            </h3>
            <div className="flex items-center gap-1 text-xs">
              <Button
                variant={moduleRankSort === "landed" ? "secondary" : "ghost"}
                size="sm"
                className="h-6 text-xs"
                onClick={() => setModuleRankSort("landed")}
              >
                按落地学校
              </Button>
              <Button
                variant={moduleRankSort === "coverage" ? "secondary" : "ghost"}
                size="sm"
                className="h-6 text-xs"
                onClick={() => setModuleRankSort("coverage")}
              >
                按覆盖率
              </Button>
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-xs">产品/模块</th>
                  <th className="text-center px-3 py-2 font-medium text-xs">落地学校</th>
                  <th className="text-center px-3 py-2 font-medium text-xs">🟢正式使用</th>
                  <th className="text-center px-3 py-2 font-medium text-xs">🔵试用中</th>
                  <th className="text-center px-3 py-2 font-medium text-xs">🟠未购</th>
                  <th className="text-center px-3 py-2 font-medium text-xs">覆盖率</th>
                  <th className="text-center px-3 py-2 font-medium text-xs">排名</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const sorted = [...moduleRanking].sort((a, b) => {
                    if (moduleRankSort === "coverage") {
                      return Number(b.coverage_rate) - Number(a.coverage_rate);
                    }
                    return Number(b.landed_schools) - Number(a.landed_schools);
                  });
                  const topThreshold = sorted.length > 0 ? Number(sorted[2]?.landed_schools || 0) : 0;
                  const bottomThreshold = sorted.length > 3 ? Number(sorted[sorted.length - 3]?.landed_schools || 0) : 0;

                  return sorted.map((m, i) => {
                    const isTop3 = i < 3 && Number(m.landed_schools) > 0;
                    const isBottom3 = i >= sorted.length - 3 && sorted.length > 3;
                    const coverage = Number(m.coverage_rate) || 0;

                    let rankTip = "";
                    if (coverage > 60) {
                      rankTip = `⭐ 核心产品：渗透率最高的破冰模块，${m.module_name}已覆盖${m.landed_schools}所学校。推广建议：对所有未购学校优先推荐。`;
                    } else if (coverage >= 30) {
                      rankTip = `📈 增长潜力：${m.module_name}覆盖率${coverage}%，有进一步提升空间。当前落地${m.landed_schools}所学校，建议加大推广力度。`;
                    } else {
                      rankTip = `⚠ 需关注：${m.module_name}覆盖率仅${coverage}%，落地${m.landed_schools}所学校。建议分析原因（客单价/场景匹配/实施周期），制定针对性推进方案。`;
                    }

                    return (
                      <tr
                        key={m.module_code}
                        className={cn(
                          "border-t hover:bg-muted/30 cursor-pointer",
                          isTop3 && "bg-green-50/50 dark:bg-green-950/20",
                          isBottom3 && !isTop3 && "bg-red-50/50 dark:bg-red-950/20"
                        )}
                        onClick={() => setExpandedRankTip(expandedRankTip === m.module_code ? null : m.module_code)}
                      >
                        <td className="px-3 py-2 font-medium text-xs">{m.module_name}</td>
                        <td className="px-3 py-2 text-center text-xs">{m.landed_schools}</td>
                        <td className="px-3 py-2 text-center text-xs text-green-600 font-medium">{m.active_schools}</td>
                        <td className="px-3 py-2 text-center text-xs text-blue-600 font-medium">{m.trial_schools}</td>
                        <td className="px-3 py-2 text-center text-xs text-orange-600 font-medium">{m.not_purchased_schools}</td>
                        <td className="px-3 py-2 text-center text-xs">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  coverage > 60 ? "bg-green-500" : coverage >= 30 ? "bg-blue-500" : "bg-orange-500"
                                )}
                                style={{ width: `${Math.min(coverage, 100)}%` }}
                              />
                            </div>
                            <span>{coverage}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isTop3 ? (
                            <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300">
                              ⭐ TOP{i + 1}
                            </Badge>
                          ) : isBottom3 ? (
                            <Badge className="text-[10px] bg-red-100 text-red-700 border-red-300">
                              ⚠ BOTTOM
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">{i + 1}</span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
          {/* 排名提示词展开 */}
          {expandedRankTip && (
            <div className="mt-1 p-3 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 text-xs text-muted-foreground">
              {(() => {
                const m = moduleRanking.find((r) => r.module_code === expandedRankTip);
                if (!m) return null;
                const coverage = Number(m.coverage_rate) || 0;
                if (coverage > 60) {
                  return <>⭐ <strong>{m.module_name}</strong>（核心产品）：渗透率最高的破冰模块，已覆盖<strong>{m.landed_schools}</strong>所学校，覆盖率<strong>{coverage}%</strong>。推广建议：对所有未购学校优先推荐，以痛点切入。</>;
                } else if (coverage >= 30) {
                  return <>📈 <strong>{m.module_name}</strong>（增长潜力）：覆盖率<strong>{coverage}%</strong>，落地<strong>{m.landed_schools}</strong>所学校。当前推广瓶颈有待突破，建议加大推广力度。</>;
                }
                return <>⚠ <strong>{m.module_name}</strong>（需关注）：覆盖率仅<strong>{coverage}%</strong>，落地<strong>{m.landed_schools}</strong>所学校。建议分析原因（客单价高/场景窄/实施周期长）并制定推进方案。</>;
              })()}
            </div>
          )}
        </div>
      )}

      {/* 省份画像分布矩形树图 */}
      {provinceDistribution.length > 0 && (() => {
        const total = provinceDistribution.reduce((sum, p) => sum + Number(p.school_count), 0);
        const maxCount = Math.max(...provinceDistribution.map((p) => Number(p.school_count)));
        return (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                省份画像分布
                <span className="text-xs text-muted-foreground font-normal ml-2">
                  共 {provinceDistribution.length} 个省份，{total} 所学校
                </span>
              </h3>
              <div className="flex flex-wrap gap-1" style={{ minHeight: "120px" }}>
                {provinceDistribution.map((p) => {
                  const count = Number(p.school_count);
                  const ratio = total > 0 ? count / total : 0;
                  const percentage = Math.round(ratio * 100);
                  const colorIntensity = Math.max(0.15, ratio * 0.85);
                  const flexGrow = Math.max(1, Math.round(ratio * 20));
                  const minWidth = Math.max(80, Math.round(ratio * 300));
                  return (
                    <div
                      key={p.province}
                      className="relative rounded-md p-2 transition-all hover:ring-2 hover:ring-primary/50 cursor-default"
                      style={{
                        flex: `${flexGrow} 1 ${minWidth}px`,
                        backgroundColor: `rgba(79, 70, 229, ${colorIntensity})`,
                        color: colorIntensity > 0.4 ? "#fff" : "#1e293b",
                      }}
                      onMouseEnter={() => setHoveredProvince(p.province)}
                      onMouseLeave={() => setHoveredProvince(null)}
                    >
                      <div className="text-xs font-medium truncate">{p.province}</div>
                      <div className="text-lg font-bold">{count}所</div>
                      <div className="text-[10px] opacity-75">({percentage}%)</div>
                      {hoveredProvince === p.province && (
                        <div className="absolute bottom-full left-0 mb-1 z-10 bg-popover border rounded-md shadow-md p-2 text-xs w-48">
                          <div className="font-medium">{p.province}</div>
                          <div className="text-muted-foreground mt-0.5">
                            {count} 所学校 · 占比 {percentage}%
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                <span>■ 块面积 = 画像数量</span>
                <span>颜色深浅 = 数量多/少</span>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* 学校分布地图（省份热力图） */}
      {provinceDistribution.length > 0 && (() => {
        const provinceMap = new Map<string, number>();
        provinceDistribution.forEach((p) => provinceMap.set(p.province, Number(p.school_count)));
        const maxSchools = Math.max(...provinceDistribution.map((p) => Number(p.school_count)), 1);

        // 省份按区域分组（大致地理位置）
        const regions: Array<{ label: string; provinces: string[] }> = [
          { label: "东北", provinces: ["黑龙江省", "吉林省", "辽宁省"] },
          { label: "华北", provinces: ["北京市", "天津市", "河北省", "山西省", "内蒙古自治区"] },
          { label: "西北", provinces: ["新疆维吾尔自治区", "青海省", "甘肃省", "宁夏回族自治区", "陕西省"] },
          { label: "华东", provinces: ["山东省", "江苏省", "上海市", "浙江省", "安徽省", "福建省", "江西省"] },
          { label: "华中", provinces: ["河南省", "湖北省", "湖南省"] },
          { label: "西南", provinces: ["四川省", "重庆市", "贵州省", "云南省", "西藏自治区"] },
          { label: "华南", provinces: ["广东省", "广西壮族自治区", "海南省"] },
          { label: "港澳台", provinces: ["香港特别行政区", "澳门特别行政区", "台湾省"] },
        ];

        return (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                <School className="w-4 h-4 text-muted-foreground" />
                学校分布地图
              </h3>
              <div className="flex gap-4 flex-wrap">
                {regions.map((region) => (
                  <div key={region.label} className="flex-1 min-w-[120px]">
                    <div className="text-[10px] font-medium text-muted-foreground mb-1.5 border-b pb-1">
                      {region.label}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {region.provinces.map((prov) => {
                        const count = provinceMap.get(prov) || 0;
                        const intensity = count > 0 ? Math.max(0.15, count / maxSchools) : 0;
                        const bg = count > 0
                          ? `rgba(79, 70, 229, ${intensity})`
                          : "rgba(226, 232, 240, 0.5)";
                        const textColor = intensity > 0.5 ? "#fff" : "#334155";
                        const short = prov.replace(/省|市|自治区|壮族|回族|维吾尔|特别行政区/g, "").slice(0, 4);
                        return (
                          <div
                            key={prov}
                            className="relative rounded px-1.5 py-1 text-[10px] cursor-default transition-all hover:ring-1 hover:ring-primary/50"
                            style={{ backgroundColor: bg, color: textColor }}
                            title={`${prov}: ${count}所学校`}
                          >
                            <span>{short}</span>
                            {count > 0 && (
                              <span className="ml-0.5 font-bold">{count}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                <span>■ 颜色深浅 = 学校数量</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded bg-slate-200" /> 无数据
                  <span className="inline-block w-3 h-3 rounded bg-indigo-200" /> 少
                  <span className="inline-block w-3 h-3 rounded bg-indigo-800" /> 多
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* 学校类型分布 + 使用率排行 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 学校类型分布 */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3">学校类型分布</h3>
            {typeDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
            ) : (
              <div className="space-y-2">
                {typeDistribution.map((t) => (
                  <div key={t.school_type} className="flex items-center gap-2">
                    <span className="text-xs w-12">{t.school_type}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded flex items-center justify-end px-2 text-xs text-white font-medium"
                        style={{ width: `${(Number(t.school_count) / maxTypeCount) * 100}%` }}
                      >
                        {t.school_count}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 使用率排行 */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3">使用率排行</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {ranking.slice(0, 10).map((r, i) => (
                <div key={r.school_id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{r.school_name}</div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span>{(r.customer_types || []).join(", ")}</span>
                      {r.module_name && <span>· {r.module_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${r.usage_rate}%` }} />
                    </div>
                    <span className="text-xs font-medium w-9 text-right">{r.usage_rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 学校列表 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">落地学校列表</h3>
          <div className="flex items-center gap-2">
            {selectedForCompare.length >= 2 && (
              <Button size="sm" variant="outline" onClick={() => setShowCompare(true)}>
                对比选中 ({selectedForCompare.length})
              </Button>
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
