"use client";

import { useState, useEffect, useCallback } from "react";
import { History, Pencil, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { VersionHistory } from "./version-history";
// WeeklyReportForm removed
import { LeftFloatNav, type NavSection } from "./left-float-nav";

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
  expectations: string; department_summary: string;
  metrics?: Array<{ indicator: string; value: string; source: string; period: string }>; sort_order: number;
  campus_id?: string; dept_scope?: string;
}
interface ModuleData {
  id: string; customer_department_id: string; customer_id: string; module_code: string; module_name: string;
  status: string; usage_rate: number; active_users: number; effect: string; issues: string;
  current_practice: string; collaborating_departments: string[];
  materials: Array<{ key: string; name: string; size: number; type?: string }>;
  department_name?: string; department_code?: string; sort_order: number;
}
interface CustomerDetailProps { customerId: string; onBack: () => void; onEdit: (id: string) => void; currentUser: { id: string; name: string }; }

// Section labels and keys
const SECTIONS = [
  { key: "daily_work", label: "日常核心工作" },
  { key: "workflow", label: "业务流程" },
  { key: "pain_points", label: "当前痛点" },
  { key: "tools", label: "在用工具/系统" },
  { key: "expectations", label: "信息化期望" },
];

export function CustomerDetail({ customerId, onBack, onEdit, currentUser }: CustomerDetailProps) {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [projectLocation, setProjectLocation] = useState<Record<string, string> | null>(null);
  // Modal state — which dept + which section
  const [modal, setModal] = useState<{ dept: DepartmentData; sectionKey: string; sectionLabel: string } | null>(null);
  // Campus state
  const [campusIndex, setCampusIndex] = useState(0);
  // Sub-school state (教育局模式)
  const [subSchoolIdx, setSubSchoolIdx] = useState<number | null>(null);

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

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-700 mr-2" />加载中...</div>;
  if (!customer) return <div className="flex flex-col items-center justify-center h-64 text-gray-400"><AlertCircle className="w-10 h-10 mb-3 text-red-400" /><p>客户不存在</p><Button variant="outline" size="sm" className="mt-3" onClick={onBack}>返回列表</Button></div>;

  const deptIcons: Record<string, string> = { school_leader: "🏫", academic_affairs: "📋", teaching_research: "📚", student_affairs: "👥", it_center: "🖥️", hr: "👔", finance: "💰", logistics: "🔧", security: "🛡️", admissions: "🎓", employment: "💼", supervision: "📊", psychology: "💚", dormitory: "🏠", school_office: "📝", grade_group: "🏢" };

  // Campus filtering
  const campusMode = customer.campus_mode || "single";
  const campuses = Array.isArray(customer.campuses) ? customer.campuses as CampusData[] : [];
  const isMultiCampus = campusMode !== "single" && campuses.length > 0;
  const activeCampus = isMultiCampus ? campuses[campusIndex] : null;

  // Filter departments by campus
  const filteredDepts = isMultiCampus && activeCampus
    ? departments.filter((d) => !d.campus_id || d.campus_id === activeCampus.name || d.dept_scope === "school_wide")
    : departments;
  const filteredModules = isMultiCampus && activeCampus
    ? modules.filter((m) => {
        const dept = departments.find((d) => d.id === m.customer_department_id);
        return dept && filteredDepts.includes(dept);
      })
    : modules;

  // Campus-specific hardware
  const displayHw = (isMultiCampus && activeCampus?.hardware && Object.keys(activeCampus.hardware).length > 0)
    ? activeCampus.hardware : (customer.hardware_info || {}) as Record<string, unknown>;
  const displayNw = (isMultiCampus && activeCampus?.network && Object.keys(activeCampus.network).length > 0)
    ? activeCampus.network : (customer.network_info || {}) as Record<string, unknown>;

  const subSchools = Array.isArray(customer.sub_schools) ? customer.sub_schools as SubSchoolData[] : [];
  const isEduBureau = (customer.customer_types || []).includes("教育局");

  const leftNavSections: NavSection[] = [
    { id: "detail-hw", icon: "📰", label: "硬件与网络" },
    { separator: true, label: isEduBureau ? "教育局科室" : "科室",
      items: filteredDepts.map((dept) => {
        const deptMods = filteredModules.filter((m) => m.customer_department_id === dept.id);
        const landedCount = deptMods.filter((m) => m.status === "已落地").length;
        const hasLanded = landedCount > 0;
        const hasTrialOnly = !hasLanded && deptMods.some((m) => m.status === "未落地");
        return { id: `detail-dept-${dept.department_code}`, icon: deptIcons[dept.department_code] || "📌", label: dept.department_name, dot: hasLanded ? "#16a34a" : hasTrialOnly ? "#ea580c" : "#94a3b8" };
      }),
    },
  ];
  // Add sub-schools to nav
  if (isEduBureau && subSchools.length > 0) {
    leftNavSections.push({
      separator: true, label: "下属学校",
      items: subSchools.map((s, i) => ({
        id: `detail-sub-${i}`, icon: "🏫", label: s.name || `学校${i + 1}`,
        dot: subSchoolIdx === i ? "#16a34a" : "#94a3b8",
      })),
    });
  }

  const loc = (projectLocation || customer.location || {}) as Record<string, string>;
  const hwEntries = Object.entries(displayHw).filter(([k, v]) => v != null && v !== "" && !k.startsWith("_"));
  const nwEntries = Object.entries(displayNw).filter(([k, v]) => v != null && v !== "" && !k.startsWith("_"));

  const openSectionModal = (dept: DepartmentData, sectionKey: string, sectionLabel: string) => {
    setModal({ dept, sectionKey, sectionLabel });
  };

  // Get content for a section — handle grouped entries (separated by <!--SECTION-->)
  const SECTION_SEP = "\n<!--SECTION-->\n";
  const getSectionContent = (dept: DepartmentData, key: string): string => {
    const d = dept as unknown as Record<string, string>;
    return d[key] || "";
  };
  const getSectionGroups = (dept: DepartmentData, key: string): string[] => {
    const content = getSectionContent(dept, key);
    if (!content) return [""];
    return content.split(SECTION_SEP).filter(g => g.trim());
  };

  return (
    <div>
      <LeftFloatNav sections={leftNavSections} onBack={onBack} />
      <div className="max-w-[820px] mx-auto px-6 pt-4 pb-16">

        {/* Masthead */}
        <div className="text-center pt-8 pb-5 border-b-[3px] border-double border-red-700 mb-6">
          <h1 className="text-4xl font-black text-red-700 tracking-[6px]" style={{ fontFamily: "STSong, Songti SC, Noto Serif SC, serif" }}>{customer.school_name}</h1>
          <p className="text-[11px] text-amber-700/60 tracking-[3px] mt-1">CUSTOMER PROFILE · DEPARTMENT DOSSIER</p>
          <div className="flex items-center justify-center gap-4 mt-2 text-[11px] text-gray-400 tracking-wide flex-wrap">
            {(customer.customer_types || []).map((t: string) => (<span key={t}>{t}</span>))}
            <span>{[loc.province, loc.city].filter(Boolean).join(" ")}</span>
            <span>{new Date(customer.updated_at).toLocaleDateString("zh-CN")}</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Button variant="outline" size="sm" className="h-7 text-[11px] border-[#d1c7b7] text-gray-500" onClick={() => setShowVersionHistory(true)}><History className="w-3 h-3 mr-1" />版本</Button>
            <Button size="sm" className="h-7 text-[11px] bg-red-700 hover:bg-red-800" onClick={() => onEdit(customerId)}><Pencil className="w-3 h-3 mr-1" />编辑画像</Button>
          </div>
        </div>

        {/* Campus tabs — only show for multi-campus */}
        {isMultiCampus && (
          <div className="flex justify-center gap-1 mb-5">
            {campuses.map((c: CampusData, i: number) => (
              <button key={i} onClick={() => setCampusIndex(i)}
                className={`px-4 py-1.5 text-xs border transition-colors ${
                  i === campusIndex
                    ? "bg-red-700 text-white border-red-700"
                    : "bg-white text-gray-500 border-[#d1c7b7] hover:bg-red-50"
                }`}>
                🏫 {c.name}{c.type ? ` · ${c.type}` : ""}
              </button>
            ))}
          </div>
        )}

        {/* HW */}
        <div className="bg-[#fdfcf8] border border-[#d1c7b7] mb-8" id="detail-hw">
          <div className="bg-red-700 text-white px-5 py-2 text-xs font-semibold tracking-wider">位置 · 硬件 · 网络</div>
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-xs">
              <div className="text-gray-400 font-semibold tracking-wide col-span-full border-b border-[#e8e0d0] pb-1 mb-1">位置信息</div>
              <div><span className="text-gray-400">省/直辖市</span><div className="text-gray-800 font-medium mt-0.5">{loc.province || "—"}</div></div>
              <div><span className="text-gray-400">市</span><div className="text-gray-800 font-medium mt-0.5">{loc.city || "—"}</div></div>
              <div><span className="text-gray-400">区/县</span><div className="text-gray-800 font-medium mt-0.5">{loc.district || "—"}</div></div>
              <div><span className="text-gray-400">镇/乡</span><div className="text-gray-800 font-medium mt-0.5">{loc.town || "—"}</div></div>
              {hwEntries.length > 0 && <><div className="text-gray-400 font-semibold tracking-wide col-span-full border-b border-[#e8e0d0] pb-1 mb-1 mt-2">校园规模</div>{hwEntries.map(([k, v]) => (<div key={k}><span className="text-gray-400">{k}</span><div className="text-gray-800 font-medium mt-0.5">{String(v)}</div></div>))}</>}
              {nwEntries.length > 0 && <><div className="text-gray-400 font-semibold tracking-wide col-span-full border-b border-[#e8e0d0] pb-1 mb-1 mt-2">网络基础设施</div>{nwEntries.map(([k, v]) => (<div key={k}><span className="text-gray-400">{k}</span><div className="text-gray-800 font-medium mt-0.5">{String(v)}</div></div>))}</>}
            </div>
          </div>
        </div>

        {/* Issue nav */}
        <div className="flex flex-wrap border border-[#d1c7b7] rounded-md overflow-hidden mb-6">
          {filteredDepts.map((dept) => {
            const deptMods = filteredModules.filter((m) => m.customer_department_id === dept.id);
            const landedCount = deptMods.filter((m) => m.status === "已落地").length;
            return (<button key={dept.department_code} onClick={() => document.getElementById(`detail-dept-${dept.department_code}`)?.scrollIntoView({ behavior: "smooth", block: "start" })} className="flex-1 min-w-[70px] py-2 px-1 text-center text-[10px] text-gray-500 hover:bg-red-50 hover:text-red-700 border-r border-[#e8e0d0] last:border-r-0 transition-colors"><span className="block text-sm mb-0.5">{deptIcons[dept.department_code] || "📌"}</span>{dept.department_name}<span className="block text-[9px] text-gray-400">{landedCount}/{deptMods.length}</span></button>);
          })}
        </div>

        {/* Editions */}
        {filteredDepts.map((dept) => {
          const deptMods = filteredModules.filter((m) => m.customer_department_id === dept.id);
          const personnel = Array.isArray(dept.personnel) ? dept.personnel : [];

          return (
            <div key={dept.department_code} id={`detail-dept-${dept.department_code}`} className="scroll-mt-[100px] mb-8 bg-[#fdfcf8] border border-[#d1c7b7] shadow-sm">
              <div className="bg-red-700 text-white px-5 py-2 flex items-center justify-between text-xs tracking-wider">
                <span className="font-semibold">{deptIcons[dept.department_code] || "📌"} {dept.department_name}</span>
                <span>{deptMods.length} 个模块 · {deptMods.filter((m) => m.status === "已落地").length} 已落地</span>
              </div>
              <div className="p-5">
                {/* Personnel */}
                {personnel.length > 0 && (
                  <div className="mb-4 pb-3 border-b border-[#e8e0d0]">
                    <span className="text-xs font-bold text-red-700">【科室人员】</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">{personnel.map((p, j) => (<span key={j} className="text-[11px] bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">{p.name} · {p.role}</span>))}</div>
                  </div>
                )}

                {/* Each section with its own preview + 阅读全文 */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  {SECTIONS.map((sec) => {
                    const content = getSectionContent(dept, sec.key);
                    const isEmpty = !content || content === "待填写";
                    return (
                      <div key={sec.key} className={sec.key === "daily_work" || sec.key === "expectations" ? "col-span-2" : ""}>
                        <span className="text-xs font-bold text-red-700">【{sec.label}】</span>
                        {isEmpty ? (
                          <p className="text-xs text-gray-300 italic mt-1">待填写</p>
                        ) : (
                          <>
                            {content && content.startsWith("<") ? (
                              <div className="mt-1 text-[12px] text-gray-600 leading-relaxed line-clamp-3" dangerouslySetInnerHTML={{ __html: content }} />
                            ) : (
                              <p className="mt-1 text-[12px] text-gray-600 leading-relaxed line-clamp-3 whitespace-pre-wrap">{content}</p>
                            )}
                            <button onClick={() => openSectionModal(dept, sec.key, sec.label)} className="text-[10px] text-red-600 hover:text-red-800 hover:underline mt-0.5 inline-block">阅读全文 →</button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Module tags */}
                <div className="flex flex-wrap gap-1.5 items-center mt-4 pt-3 border-t border-[#e8e0d0]">
                  <span className="text-[10px] text-gray-400 tracking-wide mr-1">模块</span>
                  {deptMods.map((m) => {
                    const isLanded = m.status === "已落地"; const isTrial = m.status === "未落地";
                    return <span key={m.id} className={cn("text-[10px] px-2 py-0.5 border rounded-sm", isLanded ? "border-green-300 bg-green-50 text-green-700" : isTrial ? "border-orange-300 bg-orange-50 text-orange-700" : "border-gray-200 bg-gray-50 text-gray-400")}>{isLanded ? "✓ " : isTrial ? "● " : "○ "}{m.module_name}</span>;
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section Detail Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-[#fdfcf8] border-2 border-[#d1c7b7] shadow-2xl w-full max-w-[700px] max-h-[85vh] overflow-y-auto mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-red-700 text-white px-6 py-3 flex items-center justify-between sticky top-0 z-10">
              <div>
                <span className="font-bold text-lg tracking-wider" style={{ fontFamily: "STSong, Songti SC, Noto Serif SC, serif" }}>{deptIcons[modal.dept.department_code] || "📌"} {modal.dept.department_name}</span>
                <span className="text-red-200 text-xs ml-3">· {modal.sectionLabel}</span>
              </div>
              <button onClick={() => setModal(null)} className="text-white/70 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="text-[11px] text-gray-400 tracking-[3px] uppercase mb-1">Department Dossier · Section Detail</div>
                <h2 className="text-2xl font-black text-red-700 tracking-[4px]" style={{ fontFamily: "STSong, Songti SC, Noto Serif SC, serif" }}>【{modal.sectionLabel}】</h2>
                <div className="w-16 h-[3px] bg-red-700 mx-auto mt-3 mb-4" />
              </div>
              <div className="text-[14px] leading-[2.2] text-gray-800 text-justify" style={{ fontFamily: "STSong, Songti SC, Noto Serif SC, serif" }}>
                {(() => {
                  const c = getSectionContent(modal.dept, modal.sectionKey) || "待填写";
                  // Split by section separator and render each group
                  const groups = c ? c.split("\n<!--SECTION-->\n").filter(g => g.trim()) : [];
                  if (groups.length === 0) return <p className="text-gray-400">待填写</p>;
                  return groups.map((g, i) => (
                    <div key={i}>
                      {i > 0 && <hr className="my-4 border-[#d1c7b7]" />}
                      {g.startsWith("<") ? <div dangerouslySetInnerHTML={{ __html: g }} /> : <div className="whitespace-pre-wrap">{g}</div>}
                    </div>
                  ));
                })()}
              </div>
              <div className="border-t border-[#d1c7b7] mt-6 pt-3 flex justify-between text-[10px] text-gray-400 tracking-wide">
                <span>本刊编辑：{currentUser.name} · {new Date(customer.updated_at).toLocaleDateString("zh-CN")}</span>
                <span>{new Date().toLocaleDateString("zh-CN")}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-schools display (教育局模式) */}
      {isEduBureau && subSchools.length > 0 && (
        <div className="mt-8" id="detail-sub-schools">
          <div className="bg-[#fdfcf8] border border-[#d1c7b7]">
            <div className="bg-red-700 text-white px-5 py-2 text-xs font-semibold tracking-wider">
              下属学校 · {subSchools.length}所
            </div>
            <div className="p-5">
              <div className="flex flex-wrap gap-2 mb-4">
                {subSchools.map((s, i) => (
                  <button key={i} id={`detail-sub-${i}`}
                    onClick={() => setSubSchoolIdx(subSchoolIdx === i ? null : i)}
                    className={`px-4 py-1.5 text-xs border transition-colors ${
                      subSchoolIdx === i ? "bg-red-700 text-white border-red-700" : "bg-white text-gray-500 border-[#d1c7b7] hover:bg-red-50"
                    }`}>
                    🏫 {s.name || `学校${i + 1}`}
                  </button>
                ))}
              </div>
              {subSchoolIdx !== null && (() => {
                const s = subSchools[subSchoolIdx];
                const types = (s.types || "").split(/[,，、]/).map((x: string) => x.trim()).filter(Boolean);
                return (
                  <div className="bg-white border border-[#d1c7b7] p-4">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-gray-900">🏫 {s.name}</h3>
                      <div className="flex items-center justify-center gap-2 mt-1">
                        {types.map((t: string) => (<span key={t} className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded">{t}</span>))}
                        <span className="text-[11px] text-gray-400">{s.location?.district}</span>
                      </div>
                    </div>
                    {s.description && (
                      <div className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-4">
                        {s.description.startsWith("<") ? <div dangerouslySetInnerHTML={{ __html: s.description }} /> : <div className="whitespace-pre-wrap">{s.description}</div>}
                      </div>
                    )}
                    {/* HW/NW info for sub-school */}
                    {((s.hardware_info && Object.keys(s.hardware_info).length > 0) || (s.network_info && Object.keys(s.network_info).length > 0)) && (
                      <div className="mt-3 pt-3 border-t border-[#e8e0d0]">
                        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">基本信息</div>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                          {Object.entries(s.hardware_info || {}).filter(([,v]) => v).map(([k, v]) => (
                            <div key={k}><span className="text-gray-400">{k}</span> <span className="font-medium">{v}</span></div>
                          ))}
                          {Object.entries(s.network_info || {}).filter(([,v]) => v).map(([k, v]) => (
                            <div key={k}><span className="text-gray-400">{k}</span> <span className="font-medium">{v}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Campus info for sub-school */}
                    {s.campus_mode === "multi_independent" && Array.isArray(s.campuses) && s.campuses.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#e8e0d0]">
                        <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">校区 · {s.campuses.length}个</div>
                        <div className="flex flex-wrap gap-1.5">
                          {s.campuses.map((c, ci) => (
                            <span key={ci} className="text-[11px] bg-amber-50 border border-amber-100 px-2 py-1 rounded">
                              🏫 {c.name || `校区${ci + 1}`}{c.address ? ` · ${c.address}` : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-3 text-center">
                      📍 {[s.location?.district, s.location?.address].filter(Boolean).join(" · ") || "位置未设置"}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {showVersionHistory && <VersionHistory customerId={customerId} onClose={() => setShowVersionHistory(false)} />}
    </div>
  );
}
