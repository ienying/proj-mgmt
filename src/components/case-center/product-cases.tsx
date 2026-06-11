"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, School, TrendingUp, Users, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SCHOOL_TYPE_OPTIONS, ALL_DEPARTMENTS } from "@/lib/case-center-constants";
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
  school_type: string;
  province: string;
  info_level: string;
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

interface FilterOption {
  department_code: string;
  department_name: string;
  module_code: string;
  module_name: string;
}

export function ProductCases() {
  const [department, setDepartment] = useState("all");
  const [module, setModule] = useState("all");
  const [schoolType, setSchoolType] = useState("all");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<StatsRow[]>([]);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<TypeDistRow[]>([]);
  const [deptOptions, setDeptOptions] = useState<FilterOption[]>([]);
  const [moduleOptions, setModuleOptions] = useState<FilterOption[]>([]);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (department !== "all") params.set("department_code", department);
      if (module !== "all") params.set("module_code", module);
      if (schoolType !== "all") params.set("school_type", schoolType);

      const res = await fetch(`/api/case-center/product-cases?${params.toString()}`);
      if (res.ok) {
        const { data } = await res.json();
        setStats(data.stats || []);
        setRanking(data.ranking || []);
        setTypeDistribution(data.typeDistribution || []);
        setDeptOptions(data.filterOptions?.departments || []);
        setModuleOptions(data.filterOptions?.modules || []);
      }
    } catch {
      toast.error("加载产品案例数据失败");
    } finally {
      setLoading(false);
    }
  }, [department, module, schoolType]);

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
            {SCHOOL_TYPE_OPTIONS.map((t) => (
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
                      <span>{r.school_type}</span>
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
                    <span className="text-xs text-muted-foreground ml-5">{r.province}</span>
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant="secondary" className="text-xs">{r.school_type}</Badge>
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
