"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban, Plus, Search, Clock, Users, Calendar,
  AlertCircle, X, UserPlus, Shield, Check,
  MoreHorizontal, Edit, Trash2, LayoutGrid, List,
  Building2, Phone, Mail, Tag, FileText, Layers,
  MapPin, Globe, Lock, Flag, Palette, ChevronRight, ArrowRight,
  SlidersHorizontal, Download, ChevronDown, CheckIcon, Package,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectForm } from "./project-form";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  project_name: string;
  project_code: string;
  project_type: string;
  project_stage: string;
  status?: string;
  created_at?: string;
  project_schema?: string;
  description?: string;
  customer_info?: {
    company_name?: string;
    contact_person?: string;
    contact_phone?: string;
    contact_email?: string;
  } | unknown;
  channel_info?: Array<{
    company_name: string;
    contact_person?: string;
    contact_phone?: string;
  }> | unknown;
  procurement_modules?: string[];
  procurement_amount?: number;
  software_amount?: number;
  hardware_amount?: number;
  department?: string;
  role_sales?: string;
  role_presales?: string;
  role_market_product?: string;
  role_project_manager?: string;
  customer_location?: {
    province?: string;
    city?: string;
    district?: string;
    town?: string;
    village?: string;
  };
  longitude?: string;
  latitude?: string;
  entry_date?: string;
  initial_acceptance_date?: string;
  final_acceptance_date?: string;
  school_photos?: string[];
  project_status?: string;
  customer_type?: string;
  deployment_mode?: string;
  tenant_id?: string;
  login_url?: string;
  login_username?: string;
  login_password?: string;
}

interface ProjectManagementProps {
  projects: Project[];
  initialProjectTypes: ProjectType[];
  initialProjectStages: ProjectStage[];
  initialProcurementModules: ProcurementModule[];
  users: { id: string; name: string }[];
  onProjectDelete: (id: string) => Promise<void>;
  onViewProject?: (project: Project) => void;
}

interface ProjectType {
  code: string;
  name: string;
}

interface ProjectStage {
  code: string;
  name: string;
}

interface ProcurementModule {
  code: string;
  name: string;
}

interface MemberRole {
  code: string;
  name: string;
}

// 扁平极简配色
const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

// 项目级权限定义
const PROJECT_PERMISSIONS = [
  { key: "project_edit", label: "编辑项目", desc: "修改项目基本信息" },
  { key: "member_manage", label: "成员管理", desc: "添加/移除项目成员" },
  { key: "module_manage", label: "模块管理", desc: "配置项目模块" },
  { key: "task_manage", label: "任务管理", desc: "创建和管理任务" },
  { key: "issue_handle", label: "问题处理", desc: "处理上报的问题" },
  { key: "issue_report", label: "问题上报", desc: "上报告问题" },
  { key: "data_view", label: "数据查看", desc: "查看项目数据" },
  { key: "data_export", label: "数据导出", desc: "导出项目数据" },
];

// 卡片顶部装饰色（统一蓝色）


export function ProjectManagement({
  projects: initialProjects,
  initialProjectTypes,
  initialProjectStages,
  initialProcurementModules,
  users,
  onProjectDelete,
  onViewProject,
}: ProjectManagementProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStage, setFilterStage] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [filterDeployMode, setFilterDeployMode] = useState("all");
  const [filterManager, setFilterManager] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");

  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [projectStages, setProjectStages] = useState<ProjectStage[]>([]);
  const [customerTypes, setCustomerTypes] = useState<{ code: string; name: string }[]>([]);
  const [deploymentModes, setDeploymentModes] = useState<{ code: string; name: string }[]>([]);
  const [departmentDict, setDepartmentDict] = useState<{ code: string; name: string }[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<{name: string; code: string}[]>([]);
  const [procurementModules, setProcurementModules] = useState<ProcurementModule[]>([]);
  const [memberRoles, setMemberRoles] = useState<MemberRole[]>([]);

  // 成员与权限管理
  const [projectMembers, setProjectMembers] = useState<Array<Record<string, unknown>>>([]);
  const [memberPermissions, setMemberPermissions] = useState<Record<string, string[]>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleType, setSelectedRoleType] = useState("");
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [modSearch, setModSearch] = useState("");
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  // 加载项目成员和权限
  const loadProjectMembers = useCallback(async (projectId: string) => {
    setLoadingMembers(true);
    try {
      // 加载成员
      const memRes = await fetch(`/api/projects/${projectId}/members`);
      const memData = await memRes.json();
      const members = (memData.data || []) as Array<Record<string, unknown>>;
      setProjectMembers(members);

      // 加载每个成员的权限
      const permMap: Record<string, string[]> = {};
      for (const m of members) {
        const userId = String(m.user_id || m.id);
        try {
          const permRes = await fetch(`/api/projects/${projectId}/members/${userId}/permissions`);
          if (permRes.ok) {
            const permData = await permRes.json();
            permMap[userId] = (permData.data || []).map((p: Record<string, unknown>) => String(p.permission_key));
          }
        } catch { /* ignore */ }
      }
      setMemberPermissions(permMap);
    } catch (err) {
      console.error("加载成员失败:", err);
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  // 添加成员
  const handleAddMember = async () => {
    if (!selectedProject || !selectedUserId) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: selectedUserId, role_type: selectedRoleType || "成员" }),
      });
      if (res.ok) {
        await loadProjectMembers(selectedProject.id);
        setShowAddMember(false);
        setSelectedUserId("");
        setSelectedRoleType("");
      }
    } catch (err) {
      console.error("添加成员失败:", err);
    }
  };

  // 移除成员
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedProject) return;
    if (!confirm("确定要移除此成员吗？")) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/members/${memberId}`, { method: "DELETE" });
      if (res.ok) {
        await loadProjectMembers(selectedProject.id);
      }
    } catch (err) {
      console.error("移除成员失败:", err);
    }
  };

  // 切换权限
  const handleTogglePermission = async (userId: string, permissionKey: string) => {
    if (!selectedProject) return;
    const currentPerms = memberPermissions[userId] || [];
    const newPerms = currentPerms.includes(permissionKey)
      ? currentPerms.filter((k) => k !== permissionKey)
      : [...currentPerms, permissionKey];

    try {
      await fetch(`/api/projects/${selectedProject.id}/members/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: newPerms }),
      });
      setMemberPermissions((prev) => ({ ...prev, [userId]: newPerms }));
    } catch (err) {
      console.error("更新权限失败:", err);
    }
  };

  // 侧边阶段导航
  const [stageNavOpen, setStageNavOpen] = useState(false);
  const stageNavRef = useRef<HTMLDivElement>(null);

  // 阶段导航颜色
  const STAGE_COLORS = [
    { bg: "bg-blue-500", light: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-400" },
    { bg: "bg-violet-500", light: "bg-violet-50", text: "text-violet-600", ring: "ring-violet-400" },
    { bg: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-400" },
    { bg: "bg-amber-500", light: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-400" },
    { bg: "bg-rose-500", light: "bg-rose-50", text: "text-rose-600", ring: "ring-rose-400" },
    { bg: "bg-cyan-500", light: "bg-cyan-50", text: "text-cyan-600", ring: "ring-cyan-400" },
    { bg: "bg-orange-500", light: "bg-orange-50", text: "text-orange-600", ring: "ring-orange-400" },
    { bg: "bg-teal-500", light: "bg-teal-50", text: "text-teal-600", ring: "ring-teal-400" },
  ];

  // 点击外部关闭导航
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (stageNavRef.current && !stageNavRef.current.contains(e.target as Node)) {
        setStageNavOpen(false);
      }
    };
    if (stageNavOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [stageNavOpen]);

  // 每个阶段的项目数量
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projectStages.forEach(s => { counts[s.code] = 0; });
    projects.forEach(p => {
      if (p.project_stage) counts[p.project_stage] = (counts[p.project_stage] || 0) + 1;
    });
    return counts;
  }, [projects, projectStages]);

  // 侧边阶段导航点击
  const handleStageNavClick = useCallback((stageCode: string) => {
    setFilterStage(stageCode);
    setStageNavOpen(false);
  }, []);

  // 同步外部 projects prop
  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  // 从 API 刷新项目列表
  const refreshProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        const list = data.data || [];
        setProjects(list);
        // 同步更新 selectedProject
        if (selectedProject) {
          const updated = list.find((p: Project) => p.id === selectedProject.id);
          if (updated) setSelectedProject(updated);
        }
      }
    } catch {}
  };

  // 类型分布数据
  const typeDistribution = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    projects.forEach(p => {
      const typeName = projectTypes.find(t => t.code === p.project_type)?.name || p.project_type || "未分类";
      typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
    });
    return Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
  }, [projects, projectTypes]);

  // 筛选项目
  const departments = useMemo(() => [...new Set(projects.map(p => p.department).filter(Boolean))].sort(), [projects]);
  const deployModes = useMemo(() => [...new Set(projects.map(p => p.deployment_mode).filter(Boolean))].sort(), [projects]);
  const managers = useMemo(() => [...new Set(projects.map(p => p.role_project_manager).filter(Boolean))].sort(), [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = p.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.project_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (p.department || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === "all" || p.project_type === filterType;
      const matchStage = filterStage === "all" || p.project_stage === filterStage;
      const matchStatus = filterStatus === "all" || p.project_status === filterStatus || p.status === filterStatus;
      const matchDept = filterDept === "all" || p.department === filterDept;
      const matchDeployMode = filterDeployMode === "all" || p.deployment_mode === filterDeployMode;
      const matchManager = filterManager === "all" || p.role_project_manager === filterManager;
      const matchYear = filterYear === "all" || (p.created_at && new Date(p.created_at).getFullYear().toString() === filterYear);
      const matchMonth = filterMonth === "all" || (p.created_at && (new Date(p.created_at).getMonth() + 1).toString().padStart(2, "0") === filterMonth);
      return matchSearch && matchType && matchStage && matchStatus && matchDept && matchDeployMode && matchManager && matchYear && matchMonth;
    });
  }, [projects, searchQuery, filterType, filterStage, filterStatus, filterDept, filterDeployMode, filterManager, filterYear, filterMonth]);

  // 导出项目列表
  const handleExport = useCallback(() => {
    const headers = ["项目名称", "项目编号", "客户名称", "所属部门", "项目经理", "部署模式", "项目类型", "项目阶段", "项目状态", "创建时间"];
    const rows = filteredProjects.map((p: Project) => [
      p.project_name || "",
      p.project_code || "",
      (p.customer_info as Record<string, string>)?.company_name || "",
      p.department || "",
      p.role_project_manager || "",
      p.deployment_mode || "",
      p.project_type || "",
      p.project_stage || "",
      p.status || "",
      p.created_at ? new Date(p.created_at).toLocaleDateString("zh-CN") : ""
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `项目列表_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredProjects]);

  useEffect(() => {
    setProjectTypes(initialProjectTypes);
    setProjectStages(initialProjectStages);
    setProcurementModules(initialProcurementModules);
    // 加载项目状态、客户类型、部署模式
    fetch("/api/dicts?type=project_statuses")
      .then(res => res.json())
      .then(data => {
        if (data.data) setProjectStatuses(data.data.map((item: {name: string; code: string; is_enabled: boolean}) => item.is_enabled !== false ? {name: item.name, code: item.code || item.name} : null).filter(Boolean));
      })
      .catch(() => {});
    fetch("/api/dicts?type=customer_types")
      .then(res => res.json())
      .then(data => {
        if (data.data) setCustomerTypes(data.data.filter((item: { is_enabled: boolean }) => item.is_enabled !== false).map((item: { code: string; name: string }) => ({ code: item.code, name: item.name })));
      })
      .catch(() => {});
    fetch("/api/dicts?type=deployment_modes")
      .then(res => res.json())
      .then(data => {
        if (data.data) setDeploymentModes(data.data.filter((item: { is_enabled: boolean }) => item.is_enabled !== false).map((item: { code: string; name: string }) => ({ code: item.code, name: item.name })));
      })
      .catch(() => {});
    fetch("/api/dicts?type=departments")
      .then(res => res.json())
      .then(data => {
        if (data.data) setDepartmentDict(data.data.filter((item: { is_enabled: boolean }) => item.is_enabled !== false).map((item: { code: string; name: string }) => ({ code: item.code, name: item.name })));
      })
      .catch(() => {});
  }, [initialProjectTypes, initialProjectStages, initialProcurementModules]);

  // 切换项目时清空搜索
  useEffect(() => { setModSearch(""); }, [selectedProject?.id]);

  const getStatusBadge = (status?: string) => {
    const styles: Record<string, string> = {
      active: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      paused: "bg-amber-100 text-amber-700",
      overdue: "bg-red-100 text-red-700",
    };
    const currentStatus = status || 'active';
    // 优先从 projectStatuses 查找中文名称
    const statusName = projectStatuses.find(s => s.code === currentStatus)?.name;
    return (
      <span className={cn("px-2 py-0.5 text-xs font-medium rounded", styles[currentStatus] || "bg-gray-100 text-gray-700")}>
        {statusName || currentStatus}
      </span>
    );
  };

  const getStageBadge = (stage: string) => {
    const stageName = projectStages.find(s => s.code === stage)?.name || stage;
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700">
        {stageName}
      </span>
    );
  };

  // 将存储值（JSON数组字符串/逗号分隔字符串/数组）解析为 code 数组，并转为名称展示
  const formatCodeList = (raw: unknown, dict: { code: string; name: string }[]): string => {
    if (!raw) return "";
    let codes: string[] = [];
    if (Array.isArray(raw)) {
      codes = raw.map(String);
    } else if (typeof raw === "string") {
      // 兼容 JSON 数组格式 ["junior"] 和逗号分隔格式 junior,senior
      const trimmed = raw.trim();
      if (trimmed.startsWith("[")) {
        try { const p = JSON.parse(trimmed); if (Array.isArray(p)) codes = p.map(String); } catch { /* fall through */ }
      }
      if (codes.length === 0) {
        codes = trimmed.split(",").map(s => s.trim()).filter(Boolean);
      }
    }
    return codes.map(c => dict.find(d => d.code === c)?.name || c).join("、");
  };

  // 项目详情面板

  const renderProjectDetail = () => {
    if (!selectedProject) return null;

    return (
      <div className="w-80 shrink-0 h-full border-l border-slate-200 overflow-y-auto">
        {/* 头部 */}
        <div className="px-4 py-2 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-2">
              <h2 className="font-semibold text-slate-900 text-sm leading-tight mb-1">{selectedProject.project_name}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(selectedProject.project_status || selectedProject.status)}
                {getStageBadge(selectedProject.project_stage)}
              </div>
            </div>
            <button
              onClick={() => setSelectedProject(null)}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* 项目概览信息 */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {selectedProject.project_code && (
              <div>
                <span className="text-[11px] text-slate-400">项目编号</span>
                <p className="text-xs font-medium text-slate-700 truncate">{selectedProject.project_code}</p>
              </div>
            )}
            {selectedProject.project_type && (
              <div>
                <span className="text-[11px] text-slate-400">项目类型</span>
                <p className="text-xs font-medium text-slate-700 truncate">
                  {projectTypes.find(t => t.code === selectedProject.project_type)?.name || selectedProject.project_type}
                </p>
              </div>
            )}
            {selectedProject.department && (
              <div>
                <span className="text-[11px] text-slate-400">部门</span>
                <p className="text-xs font-medium text-slate-700 truncate">
                  {departmentDict.find(d => d.code === selectedProject.department)?.name || selectedProject.department}
                </p>
              </div>
            )}
            {selectedProject.customer_type && (
              <div>
                <span className="text-[11px] text-slate-400">客户类型</span>
                <p className="text-xs font-medium text-slate-700 truncate">
                  {formatCodeList(selectedProject.customer_type, customerTypes)}
                </p>
              </div>
            )}
            {typeof selectedProject.customer_info === 'object' && selectedProject.customer_info !== null && (() => {
              const ci = selectedProject.customer_info as { company_name?: string; contact_person?: string; contact_phone?: string; contact_email?: string };
              return (
                <>
                  {ci.company_name && (
                    <div className="col-span-2">
                      <span className="text-[11px] text-slate-400">客户名称</span>
                      <p className="text-xs font-medium text-slate-700 truncate">{ci.company_name}</p>
                    </div>
                  )}
                  {ci.contact_person && (
                    <div>
                      <span className="text-[11px] text-slate-400">联系人</span>
                      <p className="text-xs font-medium text-slate-700 truncate">{ci.contact_person}</p>
                    </div>
                  )}
                  {ci.contact_phone && (
                    <div>
                      <span className="text-[11px] text-slate-400">联系电话</span>
                      <p className="text-xs font-medium text-slate-700 truncate">{ci.contact_phone}</p>
                    </div>
                  )}
                </>
              );
            })()}
            {selectedProject.role_project_manager && (
              <div className="col-span-2">
                <span className="text-[11px] text-slate-400">项目经理</span>
                <p className="text-xs font-medium text-slate-700 truncate">{selectedProject.role_project_manager}</p>
              </div>
            )}
            {selectedProject.entry_date && (
              <div>
                <span className="text-[11px] text-slate-400">进场日期</span>
                <p className="text-xs font-medium text-slate-700">{String(selectedProject.entry_date).slice(0, 10)}</p>
              </div>
            )}
            {selectedProject.deployment_mode && (
              <div>
                <span className="text-[11px] text-slate-400">部署方式</span>
                <p className="text-xs font-medium text-slate-700 truncate">
                  {formatCodeList(selectedProject.deployment_mode, deploymentModes)}
                </p>
              </div>
            )}
            {selectedProject.description && (
              <div className="col-span-2">
                <span className="text-[11px] text-slate-400">项目描述</span>
                <p className="text-xs text-slate-600 line-clamp-2">{selectedProject.description}</p>
              </div>
            )}
          </div>
          {/* 金额信息 */}
          {(selectedProject.procurement_amount || selectedProject.software_amount || selectedProject.hardware_amount) && (
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center gap-3">
              {selectedProject.procurement_amount && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">总金额</span>
                  <span className="text-xs font-semibold text-indigo-600">{Number(selectedProject.procurement_amount).toLocaleString()}</span>
                </div>
              )}
              {selectedProject.software_amount && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">软件</span>
                  <span className="text-xs font-medium text-blue-600">{Number(selectedProject.software_amount).toLocaleString()}</span>
                </div>
              )}
              {selectedProject.hardware_amount && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">硬件</span>
                  <span className="text-xs font-medium text-amber-600">{Number(selectedProject.hardware_amount).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 采购模块 */}
        {selectedProject.procurement_modules && (selectedProject.procurement_modules as string[]).length > 0 && (() => {
          const modules = selectedProject.procurement_modules as string[];
          const filtered = modSearch
            ? modules.filter((code) => {
                const mod = procurementModules.find(m => m.code === code);
                const name = mod?.name || code;
                return name.toLowerCase().includes(modSearch.toLowerCase()) || code.toLowerCase().includes(modSearch.toLowerCase());
              })
            : modules;
          return (
            <div className="p-4 border-t border-slate-200">
              <h3 className="text-sm font-medium text-slate-500 flex items-center gap-1.5 mb-2">
                <Package className="w-3.5 h-3.5" />
                采购模块
                <span className="text-xs text-slate-400 ml-1">{modules.length} 个</span>
              </h3>
              <Input
                placeholder="搜索模块..."
                value={modSearch}
                onChange={(e) => setModSearch(e.target.value)}
                className="h-7 text-xs mb-2"
              />
              <div className="max-h-36 overflow-y-auto space-y-1">
                {filtered.map((code) => {
                  const mod = procurementModules.find(m => m.code === code);
                  return (
                    <div key={code} className="text-xs text-slate-700 py-0.5 px-2 rounded bg-slate-50 truncate">
                      {mod?.name || code}
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-2">无匹配模块</div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 成员与权限 */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              成员与权限
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">{projectMembers.length} 人</span>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs px-2"
                onClick={() => setShowAddMember(!showAddMember)}
              >
                <UserPlus className="w-3 h-3 mr-1" />
                添加
              </Button>
            </div>
          </div>

          {/* 添加成员表单 */}
          {showAddMember && (
            <div className="p-3 bg-slate-50 rounded-lg mb-3 space-y-2">
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <button className="flex w-full items-center justify-between h-8 rounded-md border border-input bg-transparent px-3 py-1 text-xs hover:bg-accent hover:text-accent-foreground">
                    {selectedUserId
                      ? users.find((u) => u.id === selectedUserId)?.name || "未知用户"
                      : <span className="text-muted-foreground">选择用户</span>}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="搜索用户姓名..." className="h-8 text-xs" />
                    <CommandList>
                      <CommandEmpty className="text-xs py-3">未找到匹配用户</CommandEmpty>
                      <CommandGroup>
                        {users
                          .filter((u) => !projectMembers.some((m) => (m.user_id || m.id) === u.id))
                          .map((u) => (
                            <CommandItem
                              key={u.id}
                              value={u.name}
                              onSelect={() => {
                                setSelectedUserId(selectedUserId === u.id ? "" : u.id);
                                setUserSearchOpen(false);
                              }}
                              className="text-xs"
                            >
                              <CheckIcon className={`mr-2 h-3.5 w-3.5 ${selectedUserId === u.id ? "opacity-100" : "opacity-0"}`} />
                              {u.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Select value={selectedRoleType} onValueChange={setSelectedRoleType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  {memberRoles.map((r) => (
                    <SelectItem key={r.code} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="项目经理">项目经理</SelectItem>
                  <SelectItem value="成员">成员</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs bg-blue-500 hover:bg-blue-600 text-white" onClick={handleAddMember} disabled={!selectedUserId}>
                  确认添加
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowAddMember(false); setSelectedUserId(""); setSelectedRoleType(""); }}>
                  取消
                </Button>
              </div>
            </div>
          )}

          {/* 成员列表 */}
          {loadingMembers ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
            </div>
          ) : projectMembers.length === 0 ? (
            <div className="text-center py-4">
              <Users className="w-6 h-6 text-slate-300 mx-auto mb-1" />
              <p className="text-xs text-slate-400">暂无成员</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {projectMembers.map((m) => {
                const memberId = String(m.user_id || m.id);
                const memberName = String(m.name || "未知");
                const roleType = String(m.role_type || "成员");
                const perms = memberPermissions[memberId] || [];
                const isExpanded = expandedMember === memberId;

                return (
                  <div key={memberId} className="border rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-50"
                      onClick={() => setExpandedMember(isExpanded ? null : memberId)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-blue-600">{memberName[0]}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{memberName}</div>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                              {roleType}
                            </Badge>
                            <span className="text-[10px] text-slate-400">{perms.length} 项权限</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1 hover:bg-red-50 rounded"
                          onClick={(e) => { e.stopPropagation(); handleRemoveMember(memberId); }}
                        >
                          <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
                        </button>
                        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
                      </div>
                    </div>

                    {/* 权限设置展开 */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-slate-100">
                        <div className="pt-2 space-y-1.5">
                          {PROJECT_PERMISSIONS.map((perm) => (
                            <label key={perm.key} className="flex items-center gap-2 cursor-pointer py-0.5">
                              <Checkbox
                                checked={perms.includes(perm.key)}
                                onCheckedChange={() => handleTogglePermission(memberId, perm.key)}
                                className="h-3.5 w-3.5"
                              />
                              <div className="flex-1">
                                <span className="text-xs text-slate-700">{perm.label}</span>
                                <span className="text-[10px] text-slate-400 ml-1.5">{perm.desc}</span>
                              </div>
                            </label>
                          ))}
                          {/* 快捷：全选/清空 */}
                          <div className="flex gap-2 pt-1 border-t border-slate-100">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2"
                              onClick={async () => {
                                if (!selectedProject) return;
                                const allKeys = PROJECT_PERMISSIONS.map((p) => p.key);
                                await fetch(`/api/projects/${selectedProject.id}/members/${memberId}/permissions`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ permissions: allKeys }),
                                });
                                setMemberPermissions((prev) => ({ ...prev, [memberId]: allKeys }));
                              }}
                            >
                              <Check className="w-3 h-3 mr-0.5" /> 全选
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2"
                              onClick={async () => {
                                if (!selectedProject) return;
                                await fetch(`/api/projects/${selectedProject.id}/members/${memberId}/permissions`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ permissions: [] }),
                                });
                                setMemberPermissions((prev) => ({ ...prev, [memberId]: [] }));
                              }}
                            >
                              清空
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="p-4 border-t border-slate-200 space-y-2">
          {onViewProject && (
            <Button 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white" 
              size="sm"
              onClick={() => onViewProject(selectedProject)}
            >
              <ArrowRight className="w-4 h-4 mr-1" />
              查看详情
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" size="sm"
              onClick={() => { setEditingProject(selectedProject); setShowProjectForm(true); }}
            >
              <Edit className="w-4 h-4 mr-1" />
              编辑
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50" 
              size="sm"
              onClick={async () => {
                if (confirm("确定要删除此项目吗？此操作不可恢复。")) {
                  await onProjectDelete(selectedProject.id);
                  setSelectedProject(null);
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              删除
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染列表视图
  const renderListView = () => (
    <div className="space-y-3">
      {filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <div className="text-slate-400 mb-2">暂无项目</div>
          <div className="text-sm text-slate-500">点击"新建项目"开始创建</div>
        </div>
      ) : (
        filteredProjects.map((project) => (
          <div
            key={project.id}
            onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
            className={cn(
              "bg-white border rounded-lg p-4 transition-colors cursor-pointer shadow-sm",
              selectedProject?.id === project.id
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 hover:border-slate-300 hover:shadow-md"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-medium text-slate-900">{project.project_name}</h3>
                  {getStatusBadge(project.project_status || project.status)}
                  {getStageBadge(project.project_stage)}
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="text-slate-400">编号:</span>
                    {project.project_code}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-slate-400">类型:</span>
                    {projectTypes.find(t => t.code === project.project_type)?.name || project.project_type}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={(e) => { e.stopPropagation(); onViewProject?.(project); }}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  详情
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="p-1 hover:bg-slate-100 rounded">
                      <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelectedProject(project)}>
                      <Edit className="w-4 h-4 mr-2" />
                      查看详情
                    </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm("确定要删除此项目吗？此操作不可恢复。")) {
                        await onProjectDelete(project.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        ))
      )}
    </div>
  );

  // 渲染卡片视图
  const renderCardView = () => (
    <div className="grid grid-cols-3 gap-4">
      {filteredProjects.length === 0 ? (
        <div className="col-span-3 bg-white border border-slate-200 rounded-lg p-8 text-center">
          <div className="text-slate-400 mb-2">暂无项目</div>
          <div className="text-sm text-slate-500">点击"新建项目"开始创建</div>
        </div>
      ) : (
        filteredProjects.map((project, index) => (
          <div
            key={project.id}
            onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
            className={cn(
              "bg-white border rounded-xl transition-all cursor-pointer group shadow-sm",
              selectedProject?.id === project.id
                ? "border-slate-800 shadow-lg"
                : "border-slate-200 hover:border-slate-300 hover:shadow-md"
            )}
          >
            <div className="p-5">
              {/* 头部：客户名称 + 操作按钮 */}
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-indigo-600 text-sm truncate">
                  {(project.customer_info as Record<string, string>)?.company_name || '未关联客户'}
                </h3>
                <div className="flex items-center gap-1.5">
                  {onViewProject && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewProject(project);
                      }}
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />
                      详情
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="p-1 hover:bg-slate-100 rounded">
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelectedProject(project)}>
                        <Edit className="w-4 h-4 mr-2" />
                        查看信息
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm("确定要删除此项目吗？此操作不可恢复。")) {
                            await onProjectDelete(project.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              {/* 项目名称 */}
              <h2 className="font-semibold text-slate-900 text-base mb-3 truncate">{project.project_name}</h2>
              
              {/* 状态标签 */}
              <div className="flex items-center gap-2 mb-3">
                {getStatusBadge(project.project_status || project.status)}
                {getStageBadge(project.project_stage)}
              </div>
              
              {/* 详情字段 */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span>编号</span>
                  <span className="font-mono text-slate-700">{project.project_code}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>所属部门</span>
                  <span className="text-slate-700">{project.department || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>项目经理</span>
                  <span className="text-slate-700">{project.role_project_manager || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>部署模式</span>
                  <span className="text-slate-700">{formatCodeList(project.deployment_mode, deploymentModes) || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="h-full flex bg-gray-50">
      {/* 浮动阶段导航 */}
      <div ref={stageNavRef} className="relative z-30 flex flex-shrink-0">
        {/* 触发粗线按钮 - 使用 sticky 保持垂直居中 */}
        <div className="sticky top-1/2 -translate-y-1/2 self-start h-0 flex items-center">
          <button
            onClick={() => setStageNavOpen(!stageNavOpen)}
            className={cn(
              "w-1.5 h-10 rounded-full transition-all duration-300 cursor-pointer",
              stageNavOpen
                ? "bg-blue-500 h-12"
                : "bg-slate-300 hover:bg-slate-400 hover:h-12"
            )}
            title="项目阶段导航"
          />
        </div>

        {/* 展开面板 */}
        <div className={cn(
          "bg-white/95 backdrop-blur-sm shadow-xl border border-slate-200 transition-all duration-300 overflow-hidden rounded-xl",
          stageNavOpen ? "w-20 opacity-100" : "w-0 opacity-0 border-transparent"
        )}>
          <div className="w-20 py-3">
            {/* 全部 */}
            <button
              onClick={() => handleStageNavClick("all")}
              className={cn(
                "w-full flex flex-col items-center py-2.5 px-1 transition-all cursor-pointer",
                filterStage === "all" ? "bg-blue-50" : "hover:bg-slate-50"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                filterStage === "all"
                  ? "bg-blue-500 shadow-md shadow-blue-200 scale-110"
                  : "bg-slate-100"
              )}>
                <span className={cn(
                  "text-xs font-bold",
                  filterStage === "all" ? "text-white" : "text-slate-400"
                )}>
                  {projects.length}
                </span>
              </div>
              <span className={cn(
                "text-[11px] mt-1.5 font-medium truncate w-full text-center",
                filterStage === "all" ? "text-blue-600" : "text-slate-500"
              )}>
                全部
              </span>
            </button>

            {/* 分隔线 */}
            <div className="mx-3 my-1 border-t border-slate-100" />

            {/* 各阶段 */}
            {projectStages.map((stage, idx) => {
              const color = STAGE_COLORS[idx % STAGE_COLORS.length];
              const count = stageCounts[stage.code] || 0;
              const isActive = filterStage === stage.code;
              return (
                <button
                  key={stage.code}
                  onClick={() => handleStageNavClick(stage.code)}
                  className={cn(
                    "w-full flex flex-col items-center py-2 px-1 transition-all cursor-pointer",
                    isActive ? cn(color.light) : "hover:bg-slate-50"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                    isActive
                      ? cn(color.bg, "shadow-md scale-110")
                      : "bg-slate-100"
                  )}>
                    <span className={cn(
                      "text-xs font-bold",
                      isActive ? "text-white" : "text-slate-400"
                    )}>
                      {count}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[11px] mt-1.5 font-medium truncate w-full text-center",
                    isActive ? color.text : "text-slate-500"
                  )}>
                    {stage.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* 页面标题 */}
        <div className="p-6">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <FolderKanban className="w-6 h-6" />
            项目管理
          </h2>
          <p className="text-sm text-muted-foreground mt-1">管理项目信息、跟踪进度、协调资源</p>
        </div>

        {/* 筛选工具栏 */}
        <div className="p-6 pb-0">
          <div className="border border-gray-200 rounded-xl p-4 space-y-3 shadow-sm">
            {/* 第一行：搜索 + 基本筛选 + 操作按钮 */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜索项目名称、编号..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
                <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="项目状态" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="进行中">进行中</SelectItem>
                  <SelectItem value="已完成">已完成</SelectItem>
                  <SelectItem value="已暂停">已暂停</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={(v) => setFilterType(v)}>
                <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="项目类型" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  {projectTypes.filter(t => t.code).map((t: { name: string; code: string }) => <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStage} onValueChange={(v) => setFilterStage(v)}>
                <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="项目阶段" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部阶段</SelectItem>
                  {projectStages.filter(s => s.code).map((s: { name: string; code: string }) => <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterDept === "all" ? "all" : filterDept} onValueChange={(v) => setFilterDept(v)}>
                <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="所属部门" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部部门</SelectItem>
                  {[...new Set(projects.map((p: Project) => p.department).filter(Boolean) as string[])].map((d: string) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterDeployMode === "all" ? "all" : filterDeployMode} onValueChange={(v) => setFilterDeployMode(v)}>
                <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="部署模式" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部模式</SelectItem>
                  {[...new Set(projects.map((p: Project) => p.deployment_mode).filter(Boolean) as string[])].map((m: string) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterManager === "all" ? "all" : filterManager} onValueChange={(v) => setFilterManager(v)}>
                <SelectTrigger className="w-[130px] h-9"><SelectValue placeholder="项目经理" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部经理</SelectItem>
                  {[...new Set(projects.map((p: Project) => p.role_project_manager).filter(Boolean) as string[])].map((m: string) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterYear === "all" ? "all" : filterYear} onValueChange={(v) => setFilterYear(v)}>
                <SelectTrigger className="w-[110px] h-9"><SelectValue placeholder="年份" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部年份</SelectItem>
                  {[...new Set(projects.map((p: Project) => p.created_at ? new Date(p.created_at).getFullYear().toString() : "").filter(Boolean) as string[])].sort().map((y: string) => <SelectItem key={y} value={y}>{y}年</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterMonth === "all" ? "all" : filterMonth} onValueChange={(v) => setFilterMonth(v)}>
                <SelectTrigger className="w-[110px] h-9"><SelectValue placeholder="月份" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部月份</SelectItem>
                  {Array.from({length: 12}, (_, i) => (i + 1).toString()).map((m: string) => <SelectItem key={m} value={m}>{m}月</SelectItem>)}
                </SelectContent>
              </Select>
              {(filterDept !== "all" || filterDeployMode !== "all" || filterManager !== "all" || filterYear !== "all" || filterMonth !== "all") && (
                <Button variant="ghost" size="sm" className="h-9 text-gray-500" onClick={() => { setFilterDept("all"); setFilterDeployMode("all"); setFilterManager("all"); setFilterYear("all"); setFilterMonth("all"); }}>
                  清除筛选
                  </Button>
                )}
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={handleExport}
              >
                <Download className="w-3.5 h-3.5" />
                导出
              </Button>
              <Button size="sm" className="h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700" onClick={() => { setEditingProject(null); setShowProjectForm(true); }}>
                <Plus className="w-3.5 h-3.5" />
                新建项目
              </Button>
            </div>
          </div>
        </div>
        {/* 项目表单弹窗 */}
        <ProjectForm
          open={showProjectForm}
          onOpenChange={(open: boolean) => { if (!open) { setShowProjectForm(false); setEditingProject(null); } }}
          initialData={editingProject as unknown as Record<string, unknown> | null}
          onSuccess={() => { setShowProjectForm(false); setEditingProject(null); refreshProjects(); }}
          projectTypes={projectTypes}
          projectStages={projectStages}
          memberRoles={memberRoles.map(r => r.name).filter(Boolean)}
          productModules={procurementModules.map(m => ({ module_code: m.code, module_name: m.name, product_name: m.name }))}
          users={users}
        />
        {/* 主内容区 */}
        <div className="flex-1 p-6 overflow-y-auto">
          {viewMode === "list" ? renderListView() : renderCardView()}
        </div>
      </div>

      {/* 右侧项目详情面板 */}
      {selectedProject && renderProjectDetail()}
    </div>
  );
}

export default ProjectManagement;
