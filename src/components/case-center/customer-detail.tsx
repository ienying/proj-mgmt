"use client";

import { useState, useEffect, useCallback } from "react";
import { History, Pencil, AlertCircle, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { VersionHistory } from "./version-history";
import { CaseDock, type DockDept } from "./case-dock";

interface CampusData {
  name: string; type: string; address: string;
  hardware?: Record<string, string>; network?: Record<string, string>;
}
interface SubSchoolData {
  name: string; types: string; location: { district: string; address: string }; description: string;
  hardware_info?: Record<string, string>; network_info?: Record<string, string>;
  campus_mode?: string; campuses?: CampusData[];
}
interface CustomerData {
  id: string; school_name: string; customer_types: string[]; school_type: string;
  location: Record<string, string>; description: string;
  hardware_info: Record<string, unknown>; network_info: Record<string, unknown>; updated_at: string;
  campus_mode?: string; campuses?: CampusData[];
  sub_schools?: SubSchoolData[];
}
interface DepartmentData {
  id: string; customer_id: string; department_code: string; department_name: string;
  personnel: Array<{ name: string; role: string; phone: string; attitude?: string }>;
  daily_work: string; workflow: string; pain_points: string; tools: string;
  expectations: string; department_summary: string; group_names?: string;
  metrics?: Array<{ indicator: string; value: string; source: string; period: string }>; sort_order: number;
  campus_id?: string; dept_scope?: string;
}
interface ModuleData {
  id: string; customer_department_id: string; customer_id: string; module_code: string; module_name: string;
  status: string; usage_rate: number; active_users: number; effect: string; issues: string;
  current_practice: string; usage_description: string; collaborating_departments: string[];
  materials: Array<{ key: string; name: string; size: number; type?: string }>;
  department_name?: string; department_code?: string; sort_order: number;
}
interface CustomerDetailProps { customerId: string; onBack: () => void; onEdit: (id: string) => void; currentUser: { id: string; name: string }; }

const SECTIONS = [
  { key: "daily_work", label: "日常核心工作", icon: "📝", wide: true },
  { key: "workflow", label: "业务流程", icon: "🔄" },
  { key: "pain_points", label: "当前痛点", icon: "⚠️" },
  { key: "tools", label: "在用工具", icon: "🛠" },
  { key: "expectations", label: "信息化期望", icon: "🎯" },
];

const deptIcons: Record<string, string> = {
  school_leader: "🏫", academic_affairs: "📋", teaching_research: "📚",
  student_affairs: "👥", it_center: "🖥️", hr: "👔", finance: "💰",
  logistics: "🔧", security: "🛡️", admissions: "🎓", employment: "💼",
  supervision: "📊", psychology: "💚", dormitory: "🏠",
  school_office: "📝", grade_group: "🏢",
};

// Helper: get landing rate
function getRate(landed: number, total: number): string {
  if (total === 0) return "—";
  return Math.round((landed / total) * 100) + "%";
}

// Helper: parse business groups from department data using <!--SECTION--> separator
const SECTION_SEP = "\n<!--SECTION-->\n";
interface BusinessGroup {
  name: string;
  daily_work: string;
  workflow: string;
  pain_points: string;
  tools: string;
  expectations: string;
}
function parseBusinessGroups(dept: DepartmentData): BusinessGroup[] {
  const fieldKeys = ["daily_work", "workflow", "pain_points", "tools", "expectations"] as const;
  const fieldArrays = fieldKeys.map((k) => {
    const val = (dept as unknown as Record<string, string>)[k] || "";
    return val.split(SECTION_SEP);
  });
  const nameArr = (dept.group_names || "").split(SECTION_SEP);
  const maxLen = Math.max(...fieldArrays.map((a) => a.length), nameArr.length, 1);

  const groups: BusinessGroup[] = [];
  for (let i = 0; i < maxLen; i++) {
    groups.push({
      name: (nameArr[i] || "").trim() || `业务组 ${i + 1}`,
      daily_work: fieldArrays[0][i] || "",
      workflow: fieldArrays[1][i] || "",
      pain_points: fieldArrays[2][i] || "",
      tools: fieldArrays[3][i] || "",
      expectations: fieldArrays[4][i] || "",
    });
  }
  return groups;
}

// Reusable section block for content display
function SectionBlock({ sec, content, isEmpty, onReadMore }: {
  sec: { key: string; label: string; icon: string; wide?: boolean };
  content: string;
  isEmpty: boolean;
  onReadMore: () => void;
}) {
  return (
    <div className={cn("px-[18px] py-4 rounded-xl bg-[#fafafa] transition-colors hover:bg-[#f0f0f0]", sec.wide && "col-span-2")}>
      <div className="text-xs font-bold text-black mb-1.5 flex items-center gap-1.5">
        {sec.icon} {sec.label}
      </div>
      {isEmpty ? (
        <p className="text-[13px] text-gray-400 italic">待填写</p>
      ) : content.startsWith("<") ? (
        <div className="text-[13px] text-[#333] leading-relaxed line-clamp-2" dangerouslySetInnerHTML={{ __html: content }} />
      ) : (
        <p className="text-[13px] text-[#333] leading-relaxed line-clamp-2 whitespace-pre-wrap">{content}</p>
      )}
      {!isEmpty && (
        <span onClick={onReadMore} className="inline-block text-xs font-bold text-[#ff6b35] mt-1.5 cursor-pointer hover:underline">
          阅读全文 →
        </span>
      )}
    </div>
  );
}

export function CustomerDetail({ customerId, onBack, onEdit, currentUser }: CustomerDetailProps) {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [projectLocation, setProjectLocation] = useState<Record<string, string> | null>(null);
  const [modal, setModal] = useState<{ dept: DepartmentData; sectionKey: string; sectionLabel: string } | null>(null);
  const [descModal, setDescModal] = useState(false);
  const [campusIndex, setCampusIndex] = useState(0);
  const [subSchoolIdx, setSubSchoolIdx] = useState<number | null>(null);
  const [dockActiveId, setDockActiveId] = useState<string>("detail-profile");
  const [dockExpanded, setDockExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 硬删除客户画像
  const handleDelete = async () => {
    if (!confirm(`确定要删除「${customer?.school_name}」的画像吗？\n\n此操作将同时删除所有关联的科室、模块、版本历史数据，不可恢复！`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/case-center/customers/${customerId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("画像已删除");
        onBack();
      } else {
        const { error } = await res.json();
        toast.error(error || "删除失败");
      }
    } catch {
      toast.error("删除请求失败");
    } finally {
      setDeleting(false);
    }
  };

  const [deptGroupTab, setDeptGroupTab] = useState<Record<string, number>>({});
  const [deptViewMode, setDeptViewMode] = useState<Record<string, "grouped" | "merged" | "slides" | "cards" | "compare" | "timeline" | "table">>({});
  const [deptCompareGroups, setDeptCompareGroups] = useState<Record<string, [number, number]>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [res, projRes] = await Promise.all([fetch(`/api/case-center/customers/${customerId}`), fetch("/api/projects", { headers })]);
      if (res.ok) {
        const { data } = await res.json();
        setCustomer(data.customer); setDepartments(data.departments || []); setModules(data.modules || []);
        if (projRes.ok) {
          const projData = await projRes.json();
          const projects = (projData.data || []) as Array<{ project_name: string; customer_location: Record<string, string>; longitude: string; latitude: string }>;
          const matched = projects.find((p) => p.project_name === data.customer.school_name);
          if (matched) setProjectLocation({ province: matched.customer_location?.province || "", city: matched.customer_location?.city || "", district: matched.customer_location?.district || "", town: matched.customer_location?.town || "", village: matched.customer_location?.village || "", longitude: matched.longitude || "", latitude: matched.latitude || "" });
        }
      }
    } catch { toast.error("加载客户详情失败"); }
    finally { setLoading(false); }
  }, [customerId]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDockScroll = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Intersection observer (computed values derived inline from raw state to avoid hoisting issues)
  useEffect(() => {
    if (loading || !customer) return;
    const cm = customer.campus_mode || "single";
    const cs = Array.isArray(customer.campuses) ? customer.campuses as CampusData[] : [];
    const isMC = cm !== "single" && cs.length > 0;
    const ac = isMC ? cs[campusIndex] : null;
    const fDepts = isMC && ac
      ? departments.filter((d) => !d.campus_id || d.campus_id === ac.name || d.dept_scope === "school_wide")
      : departments;
    const ids = ["detail-profile", "detail-hw", ...fDepts.map((d) => `detail-dept-${d.department_code}`)];
    const observer = new IntersectionObserver(
      (entries) => {
        let closest: { id: string; top: number } | null = null;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!closest || entry.boundingClientRect.top < closest.top) {
              closest = { id: entry.target.id, top: entry.boundingClientRect.top };
            }
          }
        }
        if (closest) setDockActiveId(closest.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [loading, customer, departments, modules, campusIndex, subSchoolIdx]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black mr-2" />加载中...
    </div>
  );
  if (!customer) return (
    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
      <AlertCircle className="w-10 h-10 mb-3 text-gray-400" />
      <p>客户不存在</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onBack}>返回列表</Button>
    </div>
  );

  // Campus filtering
  const campusMode = customer.campus_mode || "single";
  const campuses = Array.isArray(customer.campuses) ? customer.campuses as CampusData[] : [];
  const isMultiCampus = campusMode !== "single" && campuses.length > 0;
  const activeCampus = isMultiCampus ? campuses[campusIndex] : null;

  const filteredDepts = isMultiCampus && activeCampus
    ? departments.filter((d) => !d.campus_id || d.campus_id === activeCampus.name || d.dept_scope === "school_wide")
    : departments;
  const filteredModules = isMultiCampus && activeCampus
    ? modules.filter((m) => {
        const dept = departments.find((d) => d.id === m.customer_department_id);
        return dept && filteredDepts.includes(dept);
      })
    : modules;

  const displayHw = (isMultiCampus && activeCampus?.hardware && Object.keys(activeCampus.hardware).length > 0)
    ? activeCampus.hardware : (customer.hardware_info || {}) as Record<string, unknown>;
  const displayNw = (isMultiCampus && activeCampus?.network && Object.keys(activeCampus.network).length > 0)
    ? activeCampus.network : (customer.network_info || {}) as Record<string, unknown>;

  const subSchools = Array.isArray(customer.sub_schools) ? customer.sub_schools as SubSchoolData[] : [];
  const isEduBureau = (customer.customer_types || []).includes("教育局");

  const loc = (projectLocation || customer.location || {}) as Record<string, string>;
  const hwEntries = Object.entries(displayHw).filter(([k, v]) => v != null && v !== "" && !k.startsWith("_"));
  const nwEntries = Object.entries(displayNw).filter(([k, v]) => v != null && v !== "" && !k.startsWith("_"));

  // Build dock departments
  const dockDepts: DockDept[] = filteredDepts.map((dept) => {
    const deptMods = filteredModules.filter((m) => m.customer_department_id === dept.id);
    const landed = deptMods.filter((m) => m.status === "已采购-已使用").length;
    return {
      code: `detail-dept-${dept.department_code}`,
      name: dept.department_name,
      icon: deptIcons[dept.department_code] || "🏛️",
      landedCount: landed,
      totalCount: deptMods.length,
    };
  });

  // Section content helper
  const getSectionContent = (dept: DepartmentData, key: string): string => {
    const d = dept as unknown as Record<string, string>;
    return d[key] || "";
  };

  const openSectionModal = (dept: DepartmentData, sectionKey: string, sectionLabel: string) => {
    setModal({ dept, sectionKey, sectionLabel });
  };

  // Total stats
  const totalModules = filteredModules.length;
  const totalLanded = filteredModules.filter((m) => m.status === "已采购-已使用").length;
  const landingRate = totalModules > 0 ? Math.round((totalLanded / totalModules) * 100) : 0;

  return (
    <div className="bg-[#f5f5f7] h-screen overflow-y-auto scrollbar-none">
      {/* Dock — only for detail view */}
      <CaseDock
        onBack={onBack}
        departments={dockDepts}
        onScrollTo={handleDockScroll}
        activeId={dockActiveId}
        onExpandedChange={setDockExpanded}
        onVersionHistory={() => setShowVersionHistory(true)}
      />

      {/* Main content area — offset by dock, content centered within remaining space */}
      <div
        className={cn(
          "transition-[margin-left] duration-[250ms] ease-[cubic-bezier(.4,0,.2,1)]",
          dockExpanded ? "ml-[244px]" : "ml-[88px]"
        )}
      >
        <div className="max-w-[1380px] mx-auto pt-4 pb-16 pr-10">

        {/* Top bar — back left, actions right */}
        <div className="flex items-center justify-between py-2 mb-5">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#555] px-4 py-2 rounded-[10px] hover:bg-gray-200 hover:text-black transition-all"
          >
            ← 返回画像列表
          </button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={deleting}
              className="h-10 px-5 rounded-[10px] text-[13px] font-semibold border-[1.5px] border-red-200 text-red-600 bg-white hover:bg-red-50 hover:border-red-400"
              onClick={handleDelete}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />{deleting ? "删除中..." : "删除画像"}
            </Button>
            <Button
              className="h-10 px-5 rounded-[10px] text-[13px] font-semibold bg-black text-white hover:bg-[#222]"
              onClick={() => onEdit(customerId)}
            >
              <Pencil className="w-3.5 h-3.5 mr-1.5" />编辑画像
            </Button>
          </div>
        </div>

        {/* ====== KPI Row ====== */}
        <div className="grid grid-cols-4 gap-4 mb-5">
          {(() => {
            const trialCount = filteredModules.filter((m) => m.status === "已采购-未使用").length;
            const noneCount = filteredModules.filter((m) => m.status === "未购").length;
            const kpis = [
              { n: filteredDepts.length, l: "科室总数", sub: `覆盖 ${filteredDepts.length} 个科室`, color: "text-black" },
              { n: totalModules, l: "模块总数", sub: `已使用 ${totalLanded} · 未使用 ${trialCount} · 未购 ${noneCount}`, color: "text-black" },
              { n: totalLanded, l: "已采购-已使用", sub: `落地率 ${landingRate}%`, color: "text-[#059669]" },
              { n: landingRate + "%", l: "总落地率", sub: totalModules > 0 ? `${totalLanded}/${totalModules} 个模块` : "暂无模块", color: "text-[#ff6b35]" },
            ];
            return kpis.map((k, i) => (
              <div key={i} className="bg-white rounded-2xl py-5 px-6 flex flex-col gap-1 shadow-[0_1px_3px_rgba(0,0,0,.04)] hover:shadow-[0_6px_24px_rgba(0,0,0,.08)] transition-shadow">
                <div className={cn("text-[38px] font-extrabold tracking-[-1.5px] leading-none", k.color)}>{k.n}</div>
                <div className="text-[11px] font-bold text-[#888] uppercase tracking-[0.5px]">{k.l}</div>
                <div className="text-[10px] text-[#aaa] mt-0.5">{k.sub}</div>
              </div>
            ));
          })()}
        </div>

        {/* ====== Row 2: Profile + Module Chart ====== */}
        <div id="detail-profile" className="grid grid-cols-[6fr_4fr] gap-4 mb-5 scroll-mt-[100px]">
          {/* Profile card */}
          <div className="bg-white rounded-2xl p-8 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
            <h2 className="text-[28px] font-extrabold tracking-[-1px] text-black">{customer.school_name}</h2>
            <div className="flex flex-wrap gap-2 mt-3 items-center">
              {(customer.customer_types || []).map((t) => (
                <span key={t} className={cn("text-xs font-bold px-3 py-1 rounded-lg border-2 border-black tracking-[0.3px]", (customer.customer_types || []).indexOf(t) === 0 ? "bg-black text-white" : "text-black")}>{t}</span>
              ))}
              <span className="text-xs text-[#666]">{[loc.province, loc.city, loc.district].filter(Boolean).join(" ")}</span>
              <span className="text-xs text-[#666]">· 更新于 {new Date(customer.updated_at).toLocaleDateString("zh-CN")}</span>
            </div>
            {customer.description && (
              <div className="mt-3">
                {customer.description.startsWith("<") ? (
                  <div className="text-[13px] text-[#666] leading-relaxed line-clamp-2" dangerouslySetInnerHTML={{ __html: customer.description }} />
                ) : (
                  <p className="text-[13px] text-[#666] leading-relaxed line-clamp-2 whitespace-pre-wrap">{customer.description}</p>
                )}
                <span onClick={() => setDescModal(true)} className="inline-block text-xs font-bold text-[#ff6b35] mt-1 cursor-pointer hover:underline">
                  阅读全文 →
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-0.5 bg-[#e8e8e8] rounded-xl overflow-hidden mt-4">
              {[
                { l: "所在地", v: [loc.province, loc.city, loc.district].filter(Boolean).join(" · ") || "—" },
                ...(isEduBureau ? [] : [{ l: "校园模式", v: campusMode === "single" ? "单校区" : campusMode === "multi_independent" ? "多校区（独立管理）" : "多校区（统一管理）" }]),
                { l: "客户类型", v: (customer.customer_types || []).join(" · ") || "—" },
              ].map((item, i) => (
                <div key={i} className="bg-[#fafafa] px-4 py-3">
                  <div className="text-[9px] font-bold text-[#999] uppercase tracking-[1px] mb-0.5">{item.l}</div>
                  <div className="text-xs font-bold text-black">{item.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Module status donut chart */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,.04)] flex flex-col items-center justify-center">
            <div className="text-xs font-bold text-[#888] uppercase tracking-[1px] mb-3">模块状态分布</div>
            {(() => {
              const landed = filteredModules.filter((m) => m.status === "已采购-已使用").length;
              const trial = filteredModules.filter((m) => m.status === "已采购-未使用").length;
              const none = filteredModules.filter((m) => m.status === "未购").length;
              const total = totalModules || 1;
              const landedPct = Math.round((landed / total) * 100);
              const trialPct = Math.round((trial / total) * 100);
              const nonePct = 100 - landedPct - trialPct;
              const circumference = 2 * Math.PI * 48;
              const landedDash = (landedPct / 100) * circumference;
              const trialDash = (trialPct / 100) * circumference;
              return (
                <div className="flex items-center gap-6">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="48" fill="none" stroke="#f0f0f0" strokeWidth="16" />
                    <circle cx="60" cy="60" r="48" fill="none" stroke="#10b981" strokeWidth="16"
                      strokeDasharray={`${landedDash} ${circumference - landedDash}`} strokeDashoffset="0" strokeLinecap="round"
                      transform="rotate(-90 60 60)" />
                    <circle cx="60" cy="60" r="48" fill="none" stroke="#f59e0b" strokeWidth="16"
                      strokeDasharray={`${trialDash} ${circumference - trialDash}`} strokeDashoffset={`${-landedDash}`} strokeLinecap="round"
                      transform="rotate(-90 60 60)" />
                    {none > 0 && (
                      <circle cx="60" cy="60" r="48" fill="none" stroke="#d1d5db" strokeWidth="16"
                        strokeDasharray={`${(nonePct / 100) * circumference} ${circumference - (nonePct / 100) * circumference}`}
                        strokeDashoffset={`${-(landedDash + trialDash)}`} strokeLinecap="round"
                        transform="rotate(-90 60 60)" />
                    )}
                    <text x="60" y="57" textAnchor="middle" fontSize="20" fontWeight="800" fill="#111">{landingRate}%</text>
                    <text x="60" y="74" textAnchor="middle" fontSize="9" fontWeight="600" fill="#888">落地率</text>
                  </svg>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold"><span className="w-2.5 h-2.5 rounded-sm bg-[#10b981] flex-shrink-0" />已使用 {landed}</div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold"><span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b] flex-shrink-0" />未使用 {trial}</div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold"><span className="w-2.5 h-2.5 rounded-sm bg-[#d1d5db] flex-shrink-0" />未购 {none}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Campus tabs */}
        {isMultiCampus && (
          <div className="flex justify-center gap-1 mb-5">
            {campuses.map((c: CampusData, i: number) => (
              <button
                key={i}
                onClick={() => setCampusIndex(i)}
                className={cn(
                  "px-4 py-2 text-xs font-semibold rounded-xl border-[1.5px] transition-all",
                  i === campusIndex
                    ? "border-black text-black bg-white"
                    : "border-[#e8e8e8] text-[#555] bg-white hover:border-black hover:text-black"
                )}
              >
                🏫 {c.name}{c.type ? ` · ${c.type}` : ""}
              </button>
            ))}
          </div>
        )}

        {/* Row 3: Hardware + Dept Coverage Bars */}
        <div id="detail-hw" className="grid grid-cols-[3fr_7fr] gap-4 mb-5 scroll-mt-[100px]">
          {/* Hardware quick view */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
            <div className="text-xs font-bold text-[#3b82f6] uppercase tracking-[1px] mb-3">📍 硬件 · 网络</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {hwEntries.slice(0, 8).map(([k, v]) => (
                <div key={k}><div className="text-[14px] text-[#3b82f6] font-medium">{k}</div><div className="text-xs font-bold text-black truncate">{String(v)}</div></div>
              ))}
              {nwEntries.slice(0, 4).map(([k, v]) => (
                <div key={k}><div className="text-[14px] text-[#3b82f6] font-medium">{k}</div><div className="text-xs font-bold text-black truncate">{String(v)}</div></div>
              ))}
            </div>
          </div>

          {/* Department module coverage bars */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,.04)]">
            <div className="text-xs font-bold text-[#888] uppercase tracking-[1px] mb-3">科室模块落地覆盖</div>
            <div className="space-y-2.5">
              {filteredDepts.map((dept) => {
                const deptMods = filteredModules.filter((m) => m.customer_department_id === dept.id);
                const landed = deptMods.filter((m) => m.status === "已采购-已使用").length;
                const pct = deptMods.length > 0 ? Math.round((landed / deptMods.length) * 100) : null;
                const barColor = pct === null ? "bg-gray-200" : pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-amber-500" : "bg-rose-400";
                return (
                  <div key={dept.id} className="flex items-center gap-2.5">
                    <span className="text-[11px] font-semibold text-[#555] w-[72px] text-right flex-shrink-0 truncate">
                      {deptIcons[dept.department_code] || "🏛️"} {dept.department_name}
                    </span>
                    <div className="flex-1 h-[22px] bg-gray-100 rounded-md overflow-hidden">
                      <div className={cn("h-full rounded-md flex items-center pl-2 text-[10px] font-bold text-white transition-all", barColor)}
                        style={{ width: `${pct ?? 0}%`, minWidth: landed > 0 ? "24px" : "0" }}>
                        {landed > 0 ? `${landed}/${deptMods.length}` : ""}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#333] w-9 flex-shrink-0">{pct !== null ? `${pct}%` : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dept nav strip */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filteredDepts.map((dept) => {
            const deptMods = filteredModules.filter((m) => m.customer_department_id === dept.id);
            const landed = deptMods.filter((m) => m.status === "已采购-已使用").length;
            const isActive = dockActiveId === `detail-dept-${dept.department_code}`;
            return (
              <button
                key={dept.department_code}
                onClick={() => handleDockScroll(`detail-dept-${dept.department_code}`)}
                className={cn(
                  "px-[18px] py-2.5 rounded-xl text-[13px] font-semibold transition-all flex items-center gap-1.5 border-[1.5px] bg-white",
                  isActive
                    ? "border-black text-black"
                    : "border-[#e8e8e8] text-[#555] hover:border-black hover:text-black"
                )}
              >
                {deptIcons[dept.department_code] || "🏛️"} {dept.department_name}
                <span className="text-[10px] text-[#999] font-medium">{landed}/{deptMods.length}</span>
              </button>
            );
          })}
        </div>

        {/* Department cards */}
        {filteredDepts.map((dept) => {
          const deptMods = filteredModules.filter((m) => m.customer_department_id === dept.id);
          const personnel = Array.isArray(dept.personnel) ? dept.personnel : [];

          return (
            <div
              key={dept.department_code}
              id={`detail-dept-${dept.department_code}`}
              className="bg-white rounded-2xl overflow-hidden mb-4 shadow-[0_1px_3px_rgba(0,0,0,.04)] border-[1.5px] border-gray-100 transition-colors hover:border-black scroll-mt-[100px]"
            >
              {/* Dept head */}
              <div className="px-6 py-[18px] flex items-center justify-between border-b border-gray-100">
                <div className="text-base font-bold text-black flex items-center gap-2">
                  {deptIcons[dept.department_code] || "🏛️"} {dept.department_name}
                </div>
                <div className="text-xs text-[#888] font-medium">
                  {deptMods.length} 个模块 · {deptMods.filter((m) => m.status === "已采购-已使用").length} 已使用
                </div>
              </div>

              <div className="p-6">
                {/* Personnel */}
                {personnel.length > 0 && (
                  <div className="flex flex-wrap gap-2 items-center mb-5 pb-[18px] border-b border-gray-100">
                    <span className="text-xs font-bold text-[#ff6b35]">科室人员</span>
                    {personnel.map((p, j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#fff5f0] text-black text-xs font-semibold border border-[#ffe0d0]"
                      >
                        {p.name} · {p.role}
                      </span>
                    ))}
                  </div>
                )}

                {/* Content blocks — grouped when multiple business groups exist */}
                {(() => {
                  const groups = parseBusinessGroups(dept);
                  const hasMultiGroups = groups.length > 1 && groups.some((g) =>
                    g.daily_work || g.workflow || g.pain_points || g.tools || g.expectations
                  );
                  const deptId = dept.department_code;
                  const activeTab = deptGroupTab[deptId] || 0;
                  const viewMode = deptViewMode[deptId] || "grouped";

                  if (hasMultiGroups) {
                    return (
                      <div>
                        {/* View mode switcher */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex flex-wrap gap-1.5">
                            {groups.map((g, gi) => (
                              viewMode === "grouped" ? (
                                <button
                                  key={gi}
                                  onClick={() => setDeptGroupTab((prev) => ({ ...prev, [deptId]: gi }))}
                                  className={cn(
                                    "px-3 py-1.5 text-xs font-semibold rounded-lg border-[1.5px] transition-all",
                                    gi === activeTab
                                      ? "border-black text-black bg-white"
                                      : "border-[#e8e8e8] text-[#555] bg-white hover:border-black hover:text-black"
                                  )}
                                >
                                  {g.name}
                                </button>
                              ) : null
                            ))}
                          </div>
                          <div className="flex gap-1">
                            {([
                              { key: "grouped" as const, label: "分组查看" },
                              { key: "merged" as const, label: "合并查看" },
                              { key: "slides" as const, label: "幻灯片" },
                              { key: "cards" as const, label: "卡片墙" },
                              { key: "compare" as const, label: "对比视图" },
                              { key: "timeline" as const, label: "时间线" },
                              { key: "table" as const, label: "表格" },
                            ]).map(({ key, label }) => (
                              <button
                                key={key}
                                onClick={() => setDeptViewMode((prev) => ({ ...prev, [deptId]: key }))}
                                className={cn(
                                  "px-2.5 py-1 text-[10px] font-semibold rounded-md border transition-all whitespace-nowrap",
                                  viewMode === key
                                    ? "bg-black text-white border-black"
                                    : "bg-white text-[#888] border-[#e0e0e0] hover:border-black hover:text-black"
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {viewMode === "grouped" && (
                          <div className="grid grid-cols-2 gap-[14px]">
                            {SECTIONS.map((sec) => {
                              const content = groups[activeTab]?.[sec.key as keyof BusinessGroup] || "";
                              const isEmpty = !content || content === "待填写";
                              return (
                                <SectionBlock key={sec.key} sec={sec} content={content} isEmpty={isEmpty} onReadMore={() => openSectionModal(dept, sec.key, sec.label)} />
                              );
                            })}
                          </div>
                        )}

                        {viewMode === "merged" && (
                          <div className="grid grid-cols-2 gap-[14px]">
                            {SECTIONS.map((sec) => {
                              const content = getSectionContent(dept, sec.key);
                              const isEmpty = !content || content === "待填写";
                              return (
                                <SectionBlock key={sec.key} sec={sec} content={content} isEmpty={isEmpty} onReadMore={() => openSectionModal(dept, sec.key, sec.label)} />
                              );
                            })}
                          </div>
                        )}

                        {viewMode === "slides" && (
                          <div>
                            {/* Slide navigation */}
                            <div className="flex items-center justify-center gap-2 mb-3">
                              <button
                                onClick={() => setDeptGroupTab((prev) => ({ ...prev, [deptId]: Math.max(0, activeTab - 1) }))}
                                className="text-xs px-2 py-1 rounded border border-[#e0e0e0] hover:border-black hover:text-black transition-all disabled:opacity-30"
                                disabled={activeTab === 0}
                              >← 上一页</button>
                              <span className="text-[11px] text-[#888] font-medium">
                                {activeTab + 1} / {groups.length}
                              </span>
                              <button
                                onClick={() => setDeptGroupTab((prev) => ({ ...prev, [deptId]: Math.min(groups.length - 1, activeTab + 1) }))}
                                className="text-xs px-2 py-1 rounded border border-[#e0e0e0] hover:border-black hover:text-black transition-all disabled:opacity-30"
                                disabled={activeTab >= groups.length - 1}
                              >下一页 →</button>
                            </div>
                            {/* Slide dots */}
                            <div className="flex justify-center gap-1 mb-4">
                              {groups.map((_, gi) => (
                                <button
                                  key={gi}
                                  onClick={() => setDeptGroupTab((prev) => ({ ...prev, [deptId]: gi }))}
                                  className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    gi === activeTab ? "bg-black w-4" : "bg-[#d0d0d0] hover:bg-[#999]"
                                  )}
                                />
                              ))}
                            </div>
                            {/* Current slide — full content card */}
                            <div className="bg-white rounded-2xl border border-[#e0e0e0] shadow-sm overflow-hidden">
                              {/* Slide header */}
                              <div className="bg-black text-white px-5 py-3 flex items-center justify-between">
                                <div>
                                  <span className="text-[10px] uppercase tracking-[2px] opacity-60">
                                    {deptIcons[dept.department_code] || "🏛️"} {dept.department_name}
                                  </span>
                                  <span className="mx-2 text-white/30">|</span>
                                  <span className="text-sm font-bold">{groups[activeTab]?.name}</span>
                                </div>
                                <span className="text-[10px] opacity-50">{activeTab + 1}/{groups.length}</span>
                              </div>
                              {/* Slide body — full content */}
                              <div className="p-5 space-y-4">
                                {SECTIONS.map((sec) => {
                                  const content = groups[activeTab]?.[sec.key as keyof BusinessGroup] || "";
                                  const isEmpty = !content || content === "待填写";
                                  return (
                                    <div key={sec.key}>
                                      <div className="text-xs font-bold text-black mb-1.5 flex items-center gap-1.5 border-b border-[#f0f0f0] pb-1.5">
                                        <span className="w-1 h-3 rounded-full bg-[#ff6b35] inline-block" />
                                        {sec.icon} {sec.label}
                                      </div>
                                      {isEmpty ? (
                                        <p className="text-[13px] text-gray-400 italic pl-4">待填写</p>
                                      ) : content.startsWith("<") ? (
                                        <div
                                          className="text-[13px] text-[#333] leading-relaxed pl-4"
                                          dangerouslySetInnerHTML={{ __html: content }}
                                        />
                                      ) : (
                                        <p className="text-[13px] text-[#333] leading-relaxed pl-4 whitespace-pre-wrap">{content}</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 卡片墙：所有业务组以卡片网格平铺，一目了然 */}
                        {viewMode === "cards" && (
                          <div className="grid grid-cols-2 gap-3">
                            {groups.map((g, gi) => {
                              const cardColors = [
                                "border-l-blue-400", "border-l-amber-400", "border-l-emerald-400",
                                "border-l-violet-400", "border-l-rose-400", "border-l-cyan-400",
                              ];
                              return (
                                <div key={gi} className={cn(
                                  "bg-white rounded-xl border border-[#e0e0e0] border-l-[3px] overflow-hidden shadow-sm hover:shadow-md transition-shadow",
                                  cardColors[gi % cardColors.length]
                                )}>
                                  <div className="px-4 py-2.5 border-b border-[#f0f0f0] flex items-center gap-2">
                                    <span className="text-xs font-bold text-black">{g.name}</span>
                                    <span className="text-[10px] text-[#aaa]">#{gi + 1}</span>
                                  </div>
                                  <div className="p-3 space-y-2">
                                    {SECTIONS.map((sec) => {
                                      const content = g[sec.key as keyof BusinessGroup] || "";
                                      const isEmpty = !content || content === "待填写";
                                      const plain = content.startsWith("<") ? content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : content;
                                      return (
                                        <div key={sec.key} className="text-[11px]">
                                          <span className="text-[#888] font-medium">{sec.icon} {sec.label}</span>
                                          {isEmpty ? (
                                            <span className="ml-1 text-gray-300 italic">—</span>
                                          ) : (
                                            <p className="text-[#555] mt-0.5 leading-relaxed line-clamp-3 whitespace-pre-wrap">{plain}</p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 对比视图：任选两个业务组并排比较 */}
                        {viewMode === "compare" && (
                          <div>
                            {/* Group selector */}
                            <div className="flex items-center justify-center gap-3 mb-4">
                              {[0, 1].map((slot) => {
                                const sel = (deptCompareGroups[deptId] || [0, Math.min(1, groups.length - 1)])[slot];
                                return (
                                  <div key={slot} className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-[#888]">{slot === 0 ? "左" : "右"}</span>
                                    <select
                                      value={sel}
                                      onChange={(e) => {
                                        const prev = deptCompareGroups[deptId] || [0, Math.min(1, groups.length - 1)];
                                        const next: [number, number] = [...prev] as [number, number];
                                        next[slot] = Number(e.target.value);
                                        setDeptCompareGroups((p) => ({ ...p, [deptId]: next }));
                                      }}
                                      className="text-xs border border-[#e0e0e0] rounded-md px-2 py-1 bg-white"
                                    >
                                      {groups.map((g, gi) => (
                                        <option key={gi} value={gi}>{g.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Side-by-side columns */}
                            <div className="grid grid-cols-2 gap-3">
                              {([0, 1] as const).map((slot) => {
                                const sel = (deptCompareGroups[deptId] || [0, Math.min(1, groups.length - 1)])[slot];
                                const g = groups[sel];
                                if (!g) return <div key={slot} />;
                                return (
                                  <div key={slot} className="bg-white rounded-xl border border-[#e0e0e0] overflow-hidden shadow-sm">
                                    <div className={cn(
                                      "px-4 py-2.5 border-b border-[#f0f0f0] text-xs font-bold",
                                      slot === 0 ? "bg-blue-50 text-blue-800" : "bg-amber-50 text-amber-800"
                                    )}>
                                      {g.name}
                                    </div>
                                    <div className="p-3 space-y-2.5">
                                      {SECTIONS.map((sec) => {
                                        const content = g[sec.key as keyof BusinessGroup] || "";
                                        const isEmpty = !content || content === "待填写";
                                        return (
                                          <div key={sec.key}>
                                            <div className="text-[10px] font-bold text-[#aaa] mb-0.5">{sec.icon} {sec.label}</div>
                                            {isEmpty ? (
                                              <p className="text-[12px] text-gray-300 italic">待填写</p>
                                            ) : content.startsWith("<") ? (
                                              <div className="text-[12px] text-[#333] leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
                                            ) : (
                                              <p className="text-[12px] text-[#333] leading-relaxed whitespace-pre-wrap">{content}</p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* 时间线：业务组以竖线时间轴串联，适合展示演进/流程关系 */}
                        {viewMode === "timeline" && (
                          <div className="relative pl-8">
                            {/* Vertical line */}
                            <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-[#e0e0e0] rounded-full" />
                            <div className="space-y-5">
                              {groups.map((g, gi) => (
                                <div key={gi} className="relative">
                                  {/* Dot on the line */}
                                  <div className={cn(
                                    "absolute -left-[25px] top-3 w-[10px] h-[10px] rounded-full border-2 bg-white z-10",
                                    gi === 0 ? "border-black" : "border-[#ccc]"
                                  )} />
                                  {/* Card */}
                                  <div className="bg-white rounded-xl border border-[#e0e0e0] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div className="px-4 py-2.5 bg-[#fafafa] border-b border-[#f0f0f0] flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-black" />
                                      <span className="text-xs font-bold text-black">{g.name}</span>
                                      <span className="text-[10px] text-[#aaa]">#{gi + 1}</span>
                                    </div>
                                    <div className="p-3 space-y-2">
                                      {SECTIONS.map((sec) => {
                                        const content = g[sec.key as keyof BusinessGroup] || "";
                                        const isEmpty = !content || content === "待填写";
                                        return (
                                          <div key={sec.key} className="text-[12px] flex gap-2">
                                            <span className="text-[#888] font-medium flex-shrink-0 w-[80px] text-right">{sec.icon} {sec.label}</span>
                                            {isEmpty ? (
                                              <span className="text-gray-300 italic">待填写</span>
                                            ) : content.startsWith("<") ? (
                                              <div className="text-[#333] leading-relaxed line-clamp-2" dangerouslySetInnerHTML={{ __html: content }} />
                                            ) : (
                                              <span className="text-[#333] leading-relaxed line-clamp-2 whitespace-pre-wrap">{content}</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 表格：所有业务组 × 所有模块字段，适合扫描对比 */}
                        {viewMode === "table" && (
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-[12px]">
                              <thead>
                                <tr className="border-b-2 border-[#e0e0e0]">
                                  <th className="text-left py-2.5 px-3 text-[10px] font-bold text-[#888] uppercase tracking-[0.5px] w-[100px]">模块</th>
                                  {groups.map((g, gi) => (
                                    <th key={gi} className="text-left py-2.5 px-3 text-xs font-bold text-black">
                                      {g.name}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {SECTIONS.map((sec) => (
                                  <tr key={sec.key} className="border-b border-[#f0f0f0] hover:bg-[#fafafa] transition-colors">
                                    <td className="py-2.5 px-3 text-[#888] font-medium align-top">{sec.icon} {sec.label}</td>
                                    {groups.map((g, gi) => {
                                      const content = g[sec.key as keyof BusinessGroup] || "";
                                      const isEmpty = !content || content === "待填写";
                                      const plain = content.startsWith("<") ? content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() : content;
                                      return (
                                        <td key={gi} className="py-2.5 px-3 align-top">
                                          {isEmpty ? (
                                            <span className="text-gray-300 italic">—</span>
                                          ) : (
                                            <span className="text-[#555] leading-relaxed line-clamp-3 whitespace-pre-wrap">{plain}</span>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Single group or empty — flat rendering (original behavior)
                  return (
                    <div className="grid grid-cols-2 gap-[14px]">
                      {SECTIONS.map((sec) => {
                        const content = getSectionContent(dept, sec.key);
                        const isEmpty = !content || content === "待填写";
                        return (
                          <SectionBlock key={sec.key} sec={sec} content={content} isEmpty={isEmpty} onReadMore={() => openSectionModal(dept, sec.key, sec.label)} />
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Modules with descriptions */}
                <div className="mt-[18px] pt-4 border-t border-gray-100">
                  <span className="text-[10px] font-bold text-[#aaa] uppercase tracking-[1px] mb-2 block">模块</span>
                  <div className="space-y-2">
                    {deptMods.map((m) => {
                      const isLanded = m.status === "已采购-已使用";
                      const isTrial = m.status === "已采购-未使用";
                      const hasDesc = (m.effect || m.issues || m.current_practice || m.usage_description);
                      return (
                        <div key={m.id} className="border border-gray-100 rounded-xl p-3 bg-[#fcfcfc]">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className={cn(
                                "text-xs font-bold px-3 py-1 rounded-lg border-2 flex-shrink-0",
                                isLanded
                                  ? "text-[#00663d] border-[#00663d] bg-[#f0fdf7]"
                                  : isTrial
                                  ? "text-[#cc5500] border-[#cc5500] bg-[#fffaf5]"
                                  : "text-black border-[#ddd] bg-[#fafafa]"
                              )}
                            >
                              {isLanded ? "✓ " : isTrial ? "● " : "○ "}
                              {m.module_name}
                            </span>
                            <span className="text-[10px] text-[#888]">
                              使用率 {m.usage_rate}% · 活跃 {m.active_users || 0} 人
                            </span>
                          </div>
                          {hasDesc && (
                            <div className="grid grid-cols-1 gap-1 ml-1">
                              {m.effect && (
                                <div className="text-[11px] text-[#555] flex gap-1.5">
                                  <span className="text-[#10b981] font-semibold flex-shrink-0">效果:</span>
                                  {m.effect.startsWith("<") ? (
                                    <div className="line-clamp-1" dangerouslySetInnerHTML={{ __html: m.effect }} />
                                  ) : (
                                    <span className="line-clamp-1">{m.effect}</span>
                                  )}
                                </div>
                              )}
                              {m.issues && (
                                <div className="text-[11px] text-[#555] flex gap-1.5">
                                  <span className="text-[#f59e0b] font-semibold flex-shrink-0">问题:</span>
                                  {m.issues.startsWith("<") ? (
                                    <div className="line-clamp-1" dangerouslySetInnerHTML={{ __html: m.issues }} />
                                  ) : (
                                    <span className="line-clamp-1">{m.issues}</span>
                                  )}
                                </div>
                              )}
                              {m.current_practice && (
                                <div className="text-[11px] text-[#555] flex gap-1.5">
                                  <span className="text-[#6366f1] font-semibold flex-shrink-0">现状:</span>
                                  {m.current_practice.startsWith("<") ? (
                                    <div className="line-clamp-1" dangerouslySetInnerHTML={{ __html: m.current_practice }} />
                                  ) : (
                                    <span className="line-clamp-1">{m.current_practice}</span>
                                  )}
                                </div>
                              )}
                              {m.usage_description && (
                                <div className="text-[11px] text-[#555] flex gap-1.5">
                                  <span className="text-[#0891b2] font-semibold flex-shrink-0">用法:</span>
                                  {m.usage_description.startsWith("<") ? (
                                    <div className="line-clamp-1" dangerouslySetInnerHTML={{ __html: m.usage_description }} />
                                  ) : (
                                    <span className="line-clamp-1">{m.usage_description}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {deptMods.length === 0 && (
                      <p className="text-[12px] text-gray-400 italic">暂无模块</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Sub-schools (教育局模式) */}
        {isEduBureau && subSchools.length > 0 && (
          <div className="mt-6" id="detail-sub-schools">
            <div className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,.04)]">
              <div className="px-6 py-4 border-b border-gray-100">
                <h4 className="text-[15px] font-bold text-black">
                  下属学校 · {subSchools.length}所
                </h4>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  {subSchools.map((s, i) => (
                    <button
                      key={i}
                      id={`detail-sub-${i}`}
                      onClick={() => setSubSchoolIdx(subSchoolIdx === i ? null : i)}
                      className={cn(
                        "px-4 py-2 text-xs font-semibold rounded-xl border-[1.5px] transition-all",
                        subSchoolIdx === i
                          ? "border-black text-black bg-white"
                          : "border-[#e8e8e8] text-[#555] bg-white hover:border-black hover:text-black"
                      )}
                    >
                      🏫 {s.name || `学校${i + 1}`}
                    </button>
                  ))}
                </div>
                {subSchoolIdx !== null && (() => {
                  const s = subSchools[subSchoolIdx];
                  const types = (s.types || "").split(/[,，、]/).map((x: string) => x.trim()).filter(Boolean);
                  return (
                    <div className="bg-white border border-gray-100 rounded-2xl p-6">
                      <div className="text-center mb-4">
                        <h3 className="text-xl font-bold text-black">🏫 {s.name}</h3>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          {types.map((t: string) => (
                            <span key={t} className="text-[10px] bg-gray-100 text-black px-2.5 py-1 rounded-md">
                              {t}
                            </span>
                          ))}
                          <span className="text-[11px] text-[#666]">{s.location?.district}</span>
                        </div>
                      </div>
                      {s.description && (
                        <div className="text-sm text-[#333] leading-relaxed bg-[#fafafa] rounded-xl p-4">
                          {s.description.startsWith("<") ? (
                            <div dangerouslySetInnerHTML={{ __html: s.description }} />
                          ) : (
                            <div className="whitespace-pre-wrap">{s.description}</div>
                          )}
                        </div>
                      )}
                      {((s.hardware_info && Object.keys(s.hardware_info).length > 0) || (s.network_info && Object.keys(s.network_info).length > 0)) && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="text-[11px] font-bold text-[#aaa] uppercase tracking-[1px] mb-2">基本信息</div>
                          <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                            {Object.entries(s.hardware_info || {}).filter(([, v]) => v).map(([k, v]) => (
                              <div key={k}><span className="text-[#888]">{k}</span> <span className="font-bold">{String(v)}</span></div>
                            ))}
                            {Object.entries(s.network_info || {}).filter(([, v]) => v).map(([k, v]) => (
                              <div key={k}><span className="text-[#888]">{k}</span> <span className="font-bold">{String(v)}</span></div>
                            ))}
                          </div>
                        </div>
                      )}
                      {s.campus_mode === "multi_independent" && Array.isArray(s.campuses) && s.campuses.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="text-[11px] font-bold text-[#aaa] uppercase tracking-[1px] mb-2">校区 · {s.campuses.length}个</div>
                          <div className="flex flex-wrap gap-1.5">
                            {s.campuses.map((c, ci) => (
                              <span key={ci} className="text-[11px] bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-md">
                                🏫 {c.name || `校区${ci + 1}`}{c.address ? ` · ${c.address}` : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-[#888] mt-3 text-center">
                        📍 {[s.location?.district, s.location?.address].filter(Boolean).join(" · ") || "位置未设置"}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Description Modal */}
      {descModal && customer?.description && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setDescModal(false)}
        >
          <div
            className="bg-white rounded-[20px] shadow-[0_30px_60px_rgba(0,0,0,.15)] w-full max-w-[700px] max-h-[85vh] overflow-y-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-7 py-[22px] flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-[20px]">
              <h3 className="text-[17px] font-bold text-black">
                📝 {customer.school_name} · 机构介绍
              </h3>
              <button onClick={() => setDescModal(false)} className="text-xl text-[#999] hover:text-black transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-9 px-10">
              <div className="w-11 h-[3px] bg-black mx-auto mb-[22px] rounded-sm" />
              <div className="text-[15px] leading-[2.1] text-black text-justify">
                {customer.description.startsWith("<") ? (
                  <div dangerouslySetInnerHTML={{ __html: customer.description }} />
                ) : (
                  <div className="whitespace-pre-wrap">{customer.description}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Detail Modal */}
      {modal && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-[20px] shadow-[0_30px_60px_rgba(0,0,0,.15)] w-full max-w-[700px] max-h-[85vh] overflow-y-auto mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-7 py-[22px] flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-[20px]">
              <h3 className="text-[17px] font-bold text-black">
                {deptIcons[modal.dept.department_code] || "🏛️"} {modal.dept.department_name} · {modal.sectionLabel}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="text-xl text-[#999] hover:text-black transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-9 px-10">
              <div className="w-11 h-[3px] bg-black mx-auto mb-[22px] rounded-sm" />
              <div className="text-[15px] leading-[2.1] text-black text-justify whitespace-pre-wrap">
                {(() => {
                  const content = getSectionContent(modal.dept, modal.sectionKey) || "待填写";
                  const groups = content.split("\n<!--SECTION-->\n").filter((g) => g.trim());
                  if (groups.length === 0) return <p className="text-gray-400">待填写</p>;
                  return groups.map((g, i) => (
                    <div key={i}>
                      {i > 0 && <hr className="my-4 border-gray-100" />}
                      {g.startsWith("<") ? (
                        <div dangerouslySetInnerHTML={{ __html: g }} />
                      ) : (
                        <div>{g}</div>
                      )}
                    </div>
                  ));
                })()}
              </div>
              <div className="flex justify-between pt-4 mt-7 border-t border-gray-100 text-[11px] text-[#888]">
                <span>编辑：{currentUser.name} · {new Date(customer.updated_at).toLocaleDateString("zh-CN")}</span>
                <span>{new Date().toLocaleDateString("zh-CN")}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVersionHistory && (
        <VersionHistory customerId={customerId} onClose={() => setShowVersionHistory(false)} />
      )}
    </div>
  );
}
