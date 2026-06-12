"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Pencil, FileText, History, Building2, Users, Target, AlertCircle, CheckCircle2, XCircle, Download, Play, FileText as FileIcon, Columns2, MapPin, Wifi, Server, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SCHOOL_TYPE_DEPARTMENTS } from "@/lib/case-center-constants";
import { toast } from "sonner";
import { VersionHistory } from "./version-history";
import { WeeklyReportForm } from "./weekly-report-form";

interface CustomerData {
  id: string;
  school_name: string;
  customer_types: string[];
  school_type: string;
  location: Record<string, string>;
  description: string;
  hardware_info: Record<string, unknown>;
  network_info: Record<string, unknown>;
  updated_at: string;
}

interface DepartmentData {
  id: string;
  customer_id: string;
  department_code: string;
  department_name: string;
  personnel: Array<{ name: string; role: string; phone: string; attitude?: string }>;
  daily_work: string;
  workflow: string;
  pain_points: string;
  tools: string;
  expectations: string;
  department_summary: string;
  metrics?: Array<{ indicator: string; value: string; source: string; period: string }>;
  sort_order: number;
}

interface ModuleData {
  id: string;
  customer_department_id: string;
  customer_id: string;
  module_code: string;
  module_name: string;
  status: string;
  usage_rate: number;
  active_users: number;
  effect: string;
  issues: string;
  current_practice: string;
  collaborating_departments: string[];
  materials: Array<{ key: string; name: string; size: number; type?: string }>;
  department_name?: string;
  department_code?: string;
  sort_order: number;
}

// 侧边栏导航项（macOS Dock 风格）
function DockNavItem({
  icon,
  label,
  active,
  onClick,
  badge,
  dotColor,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
  badge?: string;
  dotColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center py-1 px-1 w-full transition-all duration-200 group"
      title={label}
    >
      {/* 选中指示点 */}
      {active && (
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
      )}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-2xl transition-all duration-200",
          active
            ? "scale-110 bg-white dark:bg-white shadow-xl shadow-sky-300/60 ring-2 ring-sky-300/50"
            : "bg-white/80 dark:bg-zinc-200/80 group-hover:scale-105 group-hover:bg-white group-hover:shadow-lg group-hover:shadow-sky-200/50",
        )}
        style={{ width: 22, height: 22 }}
      >
        <span className="text-sm">{icon}</span>
        {/* 状态圆点 */}
        {dotColor && (
          <div className={cn(
            "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-zinc-300",
            dotColor
          )} />
        )}
      </div>
      <span className={cn(
        "text-[9px] leading-none text-center truncate w-full",
        active ? "text-sky-700 dark:text-sky-200 font-bold" : "text-slate-500 dark:text-slate-300"
      )}>
        {label.length > 3 ? label.slice(0, 3) : label}
      </span>
      {/* Tooltip */}
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 z-50 bg-white dark:bg-zinc-800 border rounded-xl shadow-xl p-3 w-52 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 text-left">
        <div className="text-sm font-semibold">{label}</div>
        {badge && (
          <div className="text-xs text-muted-foreground mt-0.5">{badge} 模块</div>
        )}
      </div>
    </button>
  );
}

interface CustomerDetailProps {
  customerId: string;
  onBack: () => void;
  onEdit: (id: string) => void;
  currentUser: { id: string; name: string };
}

export function CustomerDetail({ customerId, onBack, onEdit, currentUser }: CustomerDetailProps) {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDept, setActiveDept] = useState("overview");
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [filterLandedOnly, setFilterLandedOnly] = useState(false);
  const [compareDepts, setCompareDepts] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [projectLocation, setProjectLocation] = useState<Record<string, string> | null>(null);
  const [locationSynced, setLocationSynced] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, projRes] = await Promise.all([
        fetch(`/api/case-center/customers/${customerId}`),
        fetch("/api/projects"),
      ]);
      if (res.ok) {
        const { data } = await res.json();
        setCustomer(data.customer);
        setDepartments(data.departments || []);
        setModules(data.modules || []);
        if (data.departments?.length > 0) {
          setActiveDept(data.departments[0].department_code);
        }

        // 查找匹配项目，同步位置信息
        if (projRes.ok) {
          const projData = await projRes.json();
          const projects = (projData.data || []) as Array<{
            project_name: string;
            customer_location: Record<string, string>;
            longitude: string;
            latitude: string;
          }>;
          const matched = projects.find(
            (p) => p.project_name === data.customer.school_name
          );
          if (matched) {
            setProjectLocation({
              province: matched.customer_location?.province || "",
              city: matched.customer_location?.city || "",
              district: matched.customer_location?.district || "",
              town: matched.customer_location?.town || "",
              village: matched.customer_location?.village || "",
              longitude: matched.longitude || "",
              latitude: matched.latitude || "",
            });
            setLocationSynced(true);
          } else {
            setProjectLocation(null);
            setLocationSynced(false);
          }
        }
      }
    } catch {
      toast.error("加载客户详情失败");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current mr-2" />
        加载中...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <AlertCircle className="w-10 h-10 mb-3 text-red-400" />
        <p>客户不存在</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={onBack}>返回列表</Button>
      </div>
    );
  }

  // 统计数据
  const totalModules = modules.length;
  const landedModules = modules.filter((m) => m.status === "已落地");
  const notLandedModules = modules.filter((m) => m.status === "未落地");
  const modulesWithMaterials = landedModules.filter(
    (m) => Array.isArray(m.materials) && m.materials.length > 0
  );
  const materialCoverage = landedModules.length > 0
    ? Math.round((modulesWithMaterials.length / landedModules.length) * 100)
    : 0;

  // 当前选中科室的模块
  const deptModules = modules.filter((m) => {
    const dept = departments.find((d) => d.department_code === activeDept);
    return dept && m.customer_department_id === dept.id;
  });

  const currentDept = departments.find((d) => d.department_code === activeDept);

  const toggleCompareDept = (code: string) => {
    setCompareDepts((prev) => {
      if (prev.includes(code)) return prev.filter((c) => c !== code);
      if (prev.length >= 4) {
        toast.error("最多选择4个科室进行对比");
        return prev;
      }
      return [...prev, code];
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 顶部栏 — 左对齐与内容区一致 (80px dock + 16px padding) */}
      <div className="flex items-center gap-3 pl-[96px] pr-4 py-2.5 border-b bg-card">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg">{customer.school_name}</h2>
          {(customer.customer_types || []).map((t) => (
            <Badge key={t} variant="secondary">{t}</Badge>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          更新: {new Date(customer.updated_at).toLocaleDateString("zh-CN")}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={() => setShowWeeklyReport(true)}>
            <FileText className="w-4 h-4 mr-1" />
            本周周报
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowVersionHistory(true)}>
            <History className="w-4 h-4 mr-1" />
            版本历史
          </Button>
          <Button size="sm" onClick={() => onEdit(customerId)}>
            <Pencil className="w-4 h-4 mr-1" />
            编辑画像
          </Button>
        </div>
      </div>

      {/* 主体：Dock 侧栏 + 内容区（flex 布局，Dock 占据空间不遮挡） */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧 Dock 栏 */}
        <div className="w-[80px] flex-shrink-0 flex items-center py-1 bg-gradient-to-r from-blue-100/60 to-blue-50/30 dark:from-blue-950/40 dark:to-blue-950/10">
          <div className="flex flex-col items-center w-full">
            <div className="flex flex-col items-center gap-0.5 bg-blue-200/60 dark:bg-blue-800/50 backdrop-blur-xl rounded-[16px] shadow-lg shadow-blue-300/30 dark:shadow-black/30 border border-blue-300/40 dark:border-blue-600/30 p-1.5">
              {/* 返回 */}
              <DockNavItem
                icon={<ArrowLeft className="w-4 h-4" />}
                label="返回"
                onClick={onBack}
              />

              <div className="w-10 h-px bg-blue-300/30 dark:bg-blue-600/30 my-0.5" />

              {/* 总览 */}
              <DockNavItem
                icon="📊"
                label="总览"
                active={activeDept === "overview"}
                onClick={() => setActiveDept("overview")}
              />

              <div className="w-10 h-px bg-blue-200/30 dark:bg-blue-600/20 my-0.5" />

              {/* 科室 */}
              {departments.map((dept) => {
                const deptMods = modules.filter((m) => m.customer_department_id === dept.id);
                const landedCount = deptMods.filter((m) => m.status === "已落地").length;
                const totalCount = deptMods.length;
                const hasLanded = landedCount > 0;
                const hasTrialOnly = !hasLanded && deptMods.some((m) => m.status === "未落地");
                const dotColor = hasLanded ? "bg-green-500" : hasTrialOnly ? "bg-amber-500" : "bg-slate-400";

                const deptIcons: Record<string, string> = {
                  school_leader: "🏫", academic_affairs: "📋", teaching_research: "📚",
                  student_affairs: "👥", it_center: "🖥️", hr: "👔", finance: "💰",
                  logistics: "🔧", security: "🛡️", admissions: "🎓", employment: "💼",
                  supervision: "📊", psychology: "💚", dormitory: "🏠",
                  school_office: "📝", grade_group: "🏢",
                };
                const icon = deptIcons[dept.department_code] || "📌";

                return (
                  <DockNavItem
                    key={dept.department_code}
                    icon={icon}
                    label={dept.department_name}
                    active={activeDept === dept.department_code}
                    onClick={() => setActiveDept(dept.department_code)}
                    badge={`${landedCount}/${totalCount}`}
                  />
                );
              })}

              <div className="w-10 h-px bg-sky-200/30 dark:bg-sky-600/20 my-0.5" />

              {/* 版本 / 周报 */}
              <DockNavItem
                icon="📜"
                label="版本"
                onClick={() => setShowVersionHistory(true)}
              />
              <DockNavItem
                icon="📝"
                label="周报"
                onClick={() => setShowWeeklyReport(true)}
              />
            </div>
          </div>
        </div>

        {/* 右侧内容区 */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-3">
          {/* 统计卡片 */}
          {activeDept === "overview" && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold tracking-tight">{totalModules}</div>
                    <div className="text-xs text-muted-foreground">已购模块</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">{landedModules.length}</div>
                    <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">已落地</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400">{notLandedModules.length}</div>
                    <div className="text-xs text-amber-600/70 dark:text-amber-400/70">未落地</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950 dark:to-sky-900">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                    <FileIcon className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold tracking-tight text-sky-700 dark:text-sky-400">{materialCoverage}%</div>
                    <div className="text-xs text-sky-600/70 dark:text-sky-400/70">素材覆盖率</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 科室速览卡片（overview 时显示） */}
          {activeDept === "overview" && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">勾选 2-4 个科室可进行对比</span>
                {compareDepts.length >= 2 && (
                  <Button size="sm" variant="outline" onClick={() => setShowCompare(true)} className="h-7 text-xs">
                    <Columns2 className="w-3.5 h-3.5 mr-1" />
                    对比选中科室 ({compareDepts.length})
                  </Button>
                )}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-3 mb-3">
                {departments.map((dept) => {
                  const deptMods = modules.filter((m) => m.customer_department_id === dept.id);
                  const landed = deptMods.filter((m) => m.status === "已落地").length;
                  const total = deptMods.length;
                  const isCompared = compareDepts.includes(dept.department_code);
                  return (
                    <div key={dept.id} className="relative flex-shrink-0">
                      <button
                        className={cn(
                          "w-40 border rounded-lg p-3 text-left hover:border-primary/50 hover:bg-muted/30 transition-colors",
                          isCompared && "border-primary/50 bg-primary/5"
                        )}
                        onClick={() => setActiveDept(dept.department_code)}
                      >
                        <div className="font-medium text-sm mb-1 truncate">{dept.department_name}</div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-0.5">
                            {deptMods.map((m) => (
                              <div
                                key={m.id}
                                className={cn(
                                  "w-2.5 h-2.5 rounded-full",
                                  m.status === "已落地" ? "bg-green-500" : m.status === "未落地" ? "bg-orange-400" : "bg-gray-300"
                                )}
                                title={`${m.module_name}: ${m.status}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">{landed}/{total}</span>
                        </div>
                      </button>
                      <label className="absolute top-1 right-1 flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded w-3.5 h-3.5"
                          checked={isCompared}
                          onChange={() => toggleCompareDept(dept.department_code)}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>

        {/* 内容 */}
        <div>
          {activeDept === "overview" && <>
            {/* 总览仪表盘 KPI 卡片 */}
            {(() => {
              const allMods = modules;
              const totalMods = allMods.length;
              const landedMods = allMods.filter((m) => m.status === "已落地").length;
              const trialMods = allMods.filter((m) => m.status === "未落地").length;
              const notPurchasedMods = allMods.filter((m) => m.status === "未购").length;
              const coverageRate = totalMods > 0 ? Math.round((landedMods / totalMods) * 100) : 0;
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
                    <CardContent className="p-3">
                      <div className="text-[11px] text-muted-foreground mb-1">已购模块</div>
                      <div className="text-2xl font-bold text-slate-700 dark:text-slate-300">{totalMods}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
                    <CardContent className="p-3">
                      <div className="text-[11px] text-muted-foreground mb-1">🟢 正式使用</div>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-400">{landedMods}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950 dark:to-sky-950">
                    <CardContent className="p-3">
                      <div className="text-[11px] text-muted-foreground mb-1">🔵 试用中</div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{trialMods}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
                    <CardContent className="p-3">
                      <div className="text-[11px] text-muted-foreground mb-1">覆盖率</div>
                      <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{coverageRate}%</div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            {customer.description && (
              <div className="mb-4 p-4 border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">{customer.description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* 位置信息 */}
              <Card>
                <CardHeader className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-sm">位置信息</CardTitle>
                    {locationSynced && (
                      <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                        来源于项目数据
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  {(() => {
                    const loc = projectLocation || customer.location || {};
                    const parts = [loc.province, loc.city, loc.district, loc.town, loc.village].filter(Boolean);
                    return (
                      <div className="space-y-1.5">
                        <p className="text-sm">{parts.length > 0 ? parts.join(" / ") : "未设置"}</p>
                        {(loc.longitude || loc.latitude) && (
                          <p className="text-xs text-muted-foreground">
                            经度: {loc.longitude || "-"} / 纬度: {loc.latitude || "-"}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* 硬件信息 */}
              <Card>
                <CardHeader className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-sm">硬件信息</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {(() => {
                      const hw = (customer.hardware_info || {}) as Record<string, unknown>;
                      const keys = ["总人数", "教师人数", "学生人数", "班级数量", "教室数量", "功能教室数量", "总面积", "宿舍楼栋数", "校区数量", "校门数量", "食堂数量", "二级学院数"];
                      const items = keys.filter((k) => hw[k]).map((k) => ({ label: k, value: String(hw[k]) }));
                      if (items.length === 0) return <span className="text-muted-foreground col-span-2">未设置</span>;
                      return items.map((item) => (
                        <div key={item.label} className="flex justify-between">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* 网络信息 */}
              <Card className="md:col-span-2">
                <CardHeader className="py-2.5 px-4">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-sm">网络基础设施</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                    {(() => {
                      const nw = (customer.network_info || {}) as Record<string, unknown>;
                      const keys = ["带宽", "服务器数量", "虚拟化平台", "存储", "数据库", "公网IP", "无线覆盖", "堡垒机", "内网IP段"];
                      const items = keys.filter((k) => nw[k]).map((k) => ({ label: k, value: String(nw[k]) }));
                      if (items.length === 0) return <span className="text-muted-foreground col-span-4">未设置</span>;
                      return items.map((item) => (
                        <div key={item.label} className="flex justify-between">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>

            <p className="text-sm text-muted-foreground text-center py-4 border-t">
              选择一个科室查看详细画像信息
            </p>
          </>}

          {(() => {
            const activeDeptData = departments.find((d) => d.department_code === activeDept);
            if (activeDeptData) {
              return (
                <DepartmentDetailView
                  key={activeDeptData.department_code}
                  department={activeDeptData}
                  modules={modules.filter((m) => m.customer_department_id === activeDeptData.id)}
                  allDepartments={departments}
                  filterLandedOnly={filterLandedOnly}
                  onToggleFilter={() => setFilterLandedOnly(!filterLandedOnly)}
                  onEditDept={() => onEdit(customerId)}
                />
              );
            }
            return null;
          })()}
        </div>
      </div>
      </div>

      {/* 弹窗 */}
      {showVersionHistory && (
        <VersionHistory
          customerId={customerId}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
      {showWeeklyReport && (
        <WeeklyReportForm
          customerId={customerId}
          customerName={customer.school_name}
          currentUser={currentUser}
          onClose={() => setShowWeeklyReport(false)}
        />
      )}

      {/* 跨科室对比弹窗 */}
      {showCompare && (
        <DepartmentCompareDialog
          departments={departments.filter((d) => compareDepts.includes(d.department_code))}
          allModules={modules}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}

// 单个科室视图
function DepartmentDetailView({
  department,
  modules,
  allDepartments,
  filterLandedOnly,
  onToggleFilter,
  onEditDept,
}: {
  department: DepartmentData;
  modules: ModuleData[];
  allDepartments: DepartmentData[];
  filterLandedOnly: boolean;
  onToggleFilter: () => void;
  onEditDept: () => void;
}) {
  const personnel = Array.isArray(department.personnel) ? department.personnel : [];
  const filteredModules = filterLandedOnly ? modules.filter((m) => m.status === "已落地") : modules;

  const mainModules = filteredModules.filter(
    (m) => !Array.isArray(m.collaborating_departments) || m.collaborating_departments.length === 0
  );
  const collabModules = filteredModules.filter(
    (m) => Array.isArray(m.collaborating_departments) && m.collaborating_departments.length > 0
  );

  return (
    <div className="space-y-4">
      {/* 科室名称栏 + 编辑按钮 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          {department.department_name}
        </h3>
        <Button variant="outline" size="sm" onClick={onEditDept}>
          <Pencil className="w-3.5 h-3.5 mr-1" />
          编辑此科室
        </Button>
      </div>

      {/* 科室人员 */}
      {personnel.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-muted-foreground" />
            科室人员
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {personnel.map((p, i) => (
              <Card key={i} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                    {p.name?.slice(0, 1) || "?"}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.role} · {p.phone}</div>
                    {p.attitude && (
                      <Badge variant="secondary" className="text-[10px] mt-0.5">{p.attitude}</Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 业务描述 */}
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
          <Target className="w-4 h-4 text-muted-foreground" />
          业务描述
        </h4>
        <Card className="p-4 space-y-3">
          {department.daily_work && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">日常做什么：</span>
              <p className="text-sm mt-0.5">{department.daily_work}</p>
            </div>
          )}
          {department.workflow && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">业务流程：</span>
              <p className="text-sm mt-0.5">{department.workflow}</p>
            </div>
          )}
          {department.pain_points && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">痛点：</span>
              <p className="text-sm mt-0.5">{department.pain_points}</p>
            </div>
          )}
          {department.tools && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">在用工具：</span>
              <p className="text-sm mt-0.5">{department.tools}</p>
            </div>
          )}
          {department.expectations && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">信息化期望：</span>
              <p className="text-sm mt-0.5">{department.expectations}</p>
            </div>
          )}
          {!department.daily_work && !department.pain_points && (
            <p className="text-sm text-muted-foreground text-center py-4">尚未录入科室业务信息</p>
          )}
        </Card>
      </div>

      {/* 匹配模块 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            匹配模块（{filteredModules.length}个）
          </h4>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onToggleFilter}>
            {filterLandedOnly ? "全部" : "只显示已落地"}
          </Button>
        </div>

        {filteredModules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
            暂无匹配模块
          </p>
        ) : (
          <div className="space-y-2">
            {filteredModules.map((mod) => (
              <ModuleCard
                key={mod.id}
                module={mod}
                allDepartments={allDepartments}
              />
            ))}
          </div>
        )}
      </div>

      {/* 核心数据 */}
      {Array.isArray(department.metrics) && department.metrics.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            核心数据
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(department.metrics as Array<{ indicator: string; value: string; source: string; period: string }>).map((m, i) => (
              <Card key={i} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{m.indicator || "未命名指标"}</div>
                    <div className="text-xs text-muted-foreground">
                      {m.period && <span>{m.period} · </span>}
                      数据来源：{m.source || "人工统计"}
                    </div>
                  </div>
                  <div className="text-xl font-bold">{m.value || "-"}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 科室总结 */}
      {department.department_summary && (
        <div>
          <h4 className="text-sm font-medium mb-2">该科室总结</h4>
          <Card className="p-4 bg-muted/20">
            <p className="text-sm">{department.department_summary}</p>
          </Card>
        </div>
      )}
    </div>
  );
}

// 模块卡片
function ModuleCard({
  module,
  allDepartments,
}: {
  module: ModuleData;
  allDepartments: DepartmentData[];
}) {
  const collabDepts = Array.isArray(module.collaborating_departments)
    ? module.collaborating_departments
    : [];
  const materials = Array.isArray(module.materials) ? module.materials : [];

  const statusConfig = {
    "已落地": { icon: CheckCircle2, borderColor: "border-l-green-500", bgColor: "bg-green-50", badge: "bg-green-100 text-green-700" },
    "未落地": { icon: AlertCircle, borderColor: "border-l-orange-400", bgColor: "bg-orange-50", badge: "bg-orange-100 text-orange-700" },
    "未购": { icon: XCircle, borderColor: "border-l-gray-300", bgColor: "bg-gray-50", badge: "bg-gray-100 text-gray-600" },
  };
  const config = statusConfig[module.status as keyof typeof statusConfig] || statusConfig["未购"];
  const StatusIcon = config.icon;

  return (
    <Card className={cn("border-l-4", config.borderColor, config.bgColor)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn(
              "w-5 h-5",
              module.status === "已落地" ? "text-green-600" : module.status === "未落地" ? "text-orange-500" : "text-gray-400"
            )} />
            <span className="font-medium">{module.module_name}</span>
            <Badge className={cn("text-xs", config.badge)}>{module.status}</Badge>
          </div>
          {module.status === "已落地" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>使用率</span>
              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${module.usage_rate}%` }}
                />
              </div>
              <span className="font-medium text-foreground">{module.usage_rate}%</span>
            </div>
          )}
        </div>

        {module.status === "已落地" && (
          <>
            <div className="text-xs text-muted-foreground mb-1">
              活跃用户：{module.active_users}人
            </div>
            {module.effect && (
              <div className="text-sm mt-1">
                <span className="text-xs font-medium text-muted-foreground">落地效果：</span>
                {module.effect}
              </div>
            )}
            {module.issues && (
              <div className="text-sm mt-1">
                <span className="text-xs font-medium text-muted-foreground">问题：</span>
                {module.issues}
              </div>
            )}
          </>
        )}

        {module.status === "未落地" && module.issues && (
          <div className="text-sm text-orange-600 mt-1">
            原因：{module.issues}
          </div>
        )}

        {module.status === "未购" && module.current_practice && (
          <div className="text-sm text-muted-foreground mt-1">
            当前做法：{module.current_practice}
          </div>
        )}

        {/* 协同科室 */}
        {collabDepts.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground">协同科室：</span>
            {collabDepts.map((code) => {
              const dept = allDepartments.find((d) => d.department_code === code);
              return (
                <Badge key={code} variant="secondary" className="text-[10px]">
                  {dept?.department_name || code}
                </Badge>
              );
            })}
          </div>
        )}

        {/* 素材 */}
        {materials.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            <FileIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">素材：{materials.length}个文件</span>
            {materials.map((m, i) => (
              <Badge key={i} variant="outline" className="text-[10px] cursor-pointer" title={m.name}>
                {m.name.length > 20 ? m.name.slice(0, 20) + "..." : m.name}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 跨科室对比弹窗
function DepartmentCompareDialog({
  departments,
  allModules,
  onClose,
}: {
  departments: DepartmentData[];
  allModules: ModuleData[];
  onClose: () => void;
}) {
  const rows = [
    { label: "匹配模块", render: (d: DepartmentData) => String(allModules.filter((m) => m.customer_department_id === d.id).length) + "个" },
    {
      label: "已落地",
      render: (d: DepartmentData) => {
        const mods = allModules.filter((m) => m.customer_department_id === d.id);
        const landed = mods.filter((m) => m.status === "已落地").length;
        return `${landed} (${mods.length > 0 ? Math.round((landed / mods.length) * 100) : 0}%)`;
      },
    },
    {
      label: "使用率均值",
      render: (d: DepartmentData) => {
        const landedMods = allModules.filter((m) => m.customer_department_id === d.id && m.status === "已落地");
        if (landedMods.length === 0) return "-";
        const avg = Math.round(landedMods.reduce((sum, m) => sum + m.usage_rate, 0) / landedMods.length);
        return `${avg}%`;
      },
    },
    {
      label: "素材数",
      render: (d: DepartmentData) => {
        const mods = allModules.filter((m) => m.customer_department_id === d.id);
        return String(mods.reduce((sum, m) => sum + (Array.isArray(m.materials) ? m.materials.length : 0), 0));
      },
    },
    { label: "核心痛点", render: (d: DepartmentData) => d.pain_points ? d.pain_points.slice(0, 30) + (d.pain_points.length > 30 ? "..." : "") : "-" },
    {
      label: "人员态度",
      render: (d: DepartmentData) => {
        const personnel = Array.isArray(d.personnel) ? d.personnel : [];
        if (personnel.length === 0) return "未采集";
        return personnel[0]?.attitude || "未标注";
      },
    },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">科室对比（{departments.length}个科室）</DialogTitle>
        </DialogHeader>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium w-24" />
                {departments.map((d) => (
                  <th key={d.department_code} className="text-center px-4 py-2 font-medium">
                    {d.department_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t">
                  <td className="px-4 py-2 text-xs text-muted-foreground font-medium">{row.label}</td>
                  {departments.map((d) => (
                    <td key={d.department_code} className="px-4 py-2 text-center text-xs">
                      {row.render(d)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-muted-foreground text-center py-1">
          结论：{departments.map((d) => {
            const mods = allModules.filter((m) => m.customer_department_id === d.id);
            const landed = mods.filter((m) => m.status === "已落地").length;
            return `${d.department_name}(${landed}/${mods.length})`;
          }).join(" vs ")}
        </div>
      </DialogContent>
    </Dialog>
  );
}
