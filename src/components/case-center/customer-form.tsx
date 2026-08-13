"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Save, ChevronDown, ChevronUp, Plus, Trash2, Upload, X, Search, Check, Download, FileSpreadsheet, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AIInputDialog } from "./ai-input-dialog";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { CaseDock, type DockDept } from "./case-dock";
import RichTextEditor from "@/components/rich-text-editor";
import {
  CUSTOMER_TYPE_OPTIONS,
  MULTI_SELECT_CUSTOMER_TYPES,
  CUSTOMER_TYPE_DEPARTMENTS,
  ALL_DEPARTMENTS,
  MODULE_STATUS_OPTIONS,
  DEFAULT_MODULES_BY_DEPT,
  PROVINCES,
} from "@/lib/case-center-constants";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface DepartmentData {
  id?: string;
  department_code: string;
  department_name: string;
  personnel: Array<{ name: string; role: string; phone: string; attitude: string }>;
  daily_work: string;
  workflow: string;
  pain_points: string;
  tools: string;
  expectations: string;
  group_names: string;
  department_summary: string;
  metrics: Array<{ indicator: string; value: string; source: string; period: string }>;
  dept_scope: string;
  campus_id: string;
}

interface ModuleFormData {
  id?: string;
  module_code: string;
  module_name: string;
  status: string;
  usage_rate: number;
  active_users: number;
  effect: string;
  issues: string;
  current_practice: string;
  usage_description: string;
  collaborating_departments: string[];
  materials: Array<{ key: string; name: string; size: number }>;
}

interface CustomerFormProps {
  customerId: string | null;
  onSaved: (customerId: string) => void;
  onCancel: () => void;
  currentUser: { id: string; name: string };
}

// 添加科室按钮 — 支持预定义 + 自定义名称
function AddDepartmentButton({ addedNames, predefined, onAdd }: {
  addedNames: Set<string>; predefined: Array<{ code: string; name: string }>; onAdd: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const available = predefined.filter(d => !addedNames.has(d.name));

  const handleAddCustom = () => {
    const name = customName.trim();
    if (name && !addedNames.has(name)) { onAdd(name); setCustomName(""); setOpen(false); }
  };

  return (
    <div className="mt-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs border-[#e0e0e0] text-black hover:bg-gray-100">
            <Plus className="w-3 h-3 mr-1" />添加科室
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder="搜索或输入自定义名称..." className="h-8 text-xs" />
            <CommandList className="max-h-[200px]">
              <CommandEmpty className="text-xs py-2 text-center">无匹配结果，可自定义添加</CommandEmpty>
              <CommandGroup heading="预定义科室">
                {available.map((d) => (
                  <CommandItem key={d.code} value={d.name} className="text-xs" onSelect={() => { onAdd(d.name); setOpen(false); }}>
                    {d.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              <div className="border-t border-[#e8e8e8] p-2 flex items-center gap-2">
                <Input className="h-7 text-xs flex-1" value={customName} placeholder="输入自定义科室名称"
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddCustom(); }} />
                <Button size="sm" className="h-7 text-[10px] bg-black hover:bg-[#222] shrink-0" onClick={handleAddCustom}>添加</Button>
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Multi-group business fields — stores groups using <!--SECTION--> separator across all fields
const SECTION_SEP = "\n<!--SECTION-->\n";
function splitSections(val: string): string[] {
  if (!val) return [""];
  const parts = val.split(SECTION_SEP);
  return parts.length === 0 ? [""] : parts;
}
function joinSections(parts: string[]): string {
  // Preserve empty entries so group count is maintained. Only collapse to "" when all parts are empty.
  if (parts.every(p => !p.trim())) return "";
  return parts.join(SECTION_SEP);
}

const BUSINESS_FIELDS = [
  { key: "daily_work", label: "日常核心工作", placeholder: "描述该科室日常核心工作内容...", colSpan: true },
  { key: "workflow", label: "业务流程", placeholder: "描述该科室主要业务流程...", colSpan: true },
  { key: "pain_points", label: "当前痛点", placeholder: "描述该科室当前面临的痛点和挑战...", colSpan: false },
  { key: "tools", label: "在用工具/系统", placeholder: "列出该科室当前使用的工具和系统...", colSpan: false },
  { key: "expectations", label: "信息化期望", placeholder: "描述该科室对信息化的期望和需求...", colSpan: true },
];

// BusinessGroups — renders all 5 business fields as named, coordinated groups.
// One "添加业务组" adds a complete set; removing a group removes all fields at that index.
// Each group has a name input stored in the group_names field (SECTION_SEP-delimited).
function BusinessGroups({ code, dept, updateDepartment }: {
  code: string;
  dept: DepartmentData;
  updateDepartment: (code: string, field: string, value: unknown) => void;
}) {
  // Read all 5 fields + group_names and split each into sections
  const allSections = BUSINESS_FIELDS.map(f => splitSections((dept as unknown as Record<string, string>)[f.key] || ""));
  const nameSections = splitSections(dept.group_names || "");
  const maxGroups = Math.max(...allSections.map(s => s.length), nameSections.length, 1);

  // Normalize all field arrays to the same length
  const normalized = allSections.map(s => {
    const arr = [...s];
    while (arr.length < maxGroups) arr.push("");
    return arr;
  });
  // Normalize names too
  const normalizedNames = [...nameSections];
  while (normalizedNames.length < maxGroups) normalizedNames.push("");

  // Build groups: each group is {daily_work, workflow, pain_points, tools, expectations, name}
  const groups = Array.from({ length: maxGroups }, (_, gi) => {
    const group: Record<string, string> = {};
    BUSINESS_FIELDS.forEach((f, fi) => { group[f.key] = normalized[fi][gi]; });
    group._name = normalizedNames[gi];
    return group;
  });

  const updateGroupField = (groupIndex: number, fieldKey: string, value: string) => {
    const fieldIdx = BUSINESS_FIELDS.findIndex(f => f.key === fieldKey);
    const arr = [...normalized[fieldIdx]];
    arr[groupIndex] = value;
    updateDepartment(code, fieldKey, joinSections(arr));
  };

  const updateGroupName = (groupIndex: number, name: string) => {
    const arr = [...normalizedNames];
    arr[groupIndex] = name;
    updateDepartment(code, "group_names", joinSections(arr));
  };

  const addGroup = () => {
    BUSINESS_FIELDS.forEach(f => {
      const arr = [...splitSections((dept as unknown as Record<string, string>)[f.key] || "")];
      arr.push("");
      updateDepartment(code, f.key, joinSections(arr));
    });
    const nameArr = [...splitSections(dept.group_names || "")];
    nameArr.push("");
    updateDepartment(code, "group_names", joinSections(nameArr));
  };

  const removeGroup = (groupIndex: number) => {
    if (maxGroups <= 1) return;
    BUSINESS_FIELDS.forEach(f => {
      const arr = splitSections((dept as unknown as Record<string, string>)[f.key] || "");
      if (arr.length > 1) {
        arr.splice(groupIndex, 1);
        updateDepartment(code, f.key, joinSections(arr));
      }
    });
    const nameArr = splitSections(dept.group_names || "");
    if (nameArr.length > 1) {
      nameArr.splice(groupIndex, 1);
      updateDepartment(code, "group_names", joinSections(nameArr));
    }
  };

  // 业务组背景色板（每2组一循环，相邻组视觉区分明显）
  const GROUP_BG = [
    { bg: "bg-white", border: "border-[#e0e0e0]", dot: "bg-blue-500" },
    { bg: "bg-amber-50/60", border: "border-amber-200", dot: "bg-amber-500" },
    { bg: "bg-emerald-50/60", border: "border-emerald-200", dot: "bg-emerald-500" },
    { bg: "bg-violet-50/60", border: "border-violet-200", dot: "bg-violet-500" },
    { bg: "bg-rose-50/60", border: "border-rose-200", dot: "bg-rose-500" },
    { bg: "bg-cyan-50/60", border: "border-cyan-200", dot: "bg-cyan-500" },
  ];

  return (
    <div>
      <Label className="text-xs font-medium mb-2">业务描述</Label>
      <div className="space-y-3">
        {groups.map((group, gi) => {
          const clr = GROUP_BG[gi % GROUP_BG.length];
          return (
          <div key={gi} className={cn("border p-3 relative rounded-md", clr.bg, clr.border)}>
            {/* Group indicator dot */}
            <div className={cn("absolute top-3.5 left-3 w-2.5 h-2.5 rounded-full", clr.dot)} title={`业务组 ${gi + 1}`} />
            <div className="flex items-center justify-between mb-2 gap-2 pl-5">
              <div className="flex-1 min-w-0">
                <Input
                  className="h-7 w-full text-xs font-semibold border-[#e0e0e0]"
                  placeholder={`业务组 ${gi + 1}`}
                  value={group._name}
                  onChange={(e) => updateGroupName(gi, e.target.value)}
                />
              </div>
              {groups.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-gray-400 hover:text-black hover:bg-gray-100"
                  onClick={() => removeGroup(gi)}
                >
                  <Trash2 className="w-3 h-3 mr-0.5" />移除此组
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {BUSINESS_FIELDS.map(f => (
                <div key={f.key} className={cn("space-y-1.5", f.colSpan && "col-span-2")}>
                  <Label className="text-[11px]">{f.label}</Label>
                  <RichTextEditor
                    className="min-h-[100px] rounded-none"
                    value={group[f.key]}
                    onChange={(v: string) => updateGroupField(gi, f.key, v)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
          );
        })}
      </div>
      <div className="mt-3">
        <Button variant="ghost" size="sm" className="h-6 text-xs text-black bg-blue-50 hover:bg-blue-100 border border-blue-200" onClick={addGroup}>
          <Plus className="w-3 h-3 mr-0.5" />添加业务组
        </Button>
      </div>
    </div>
  );
}

// 模块名称搜索选择器（数据来源：系统设置-基础数据-产品名称-模块名称）
function ModuleSearchSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (code: string, name: string) => void;
  options: Array<{ code: string; module_name: string; category_name?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? options.filter((o) => o.module_name.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="h-8 w-full justify-between text-xs font-normal"
        >
          {value || "搜索选择模块..."}
          <Search className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="搜索模块名称..."
            value={search}
            onValueChange={setSearch}
            className="h-8 text-xs"
          />
          <CommandList className="max-h-[200px]">
            <CommandEmpty className="text-xs py-2 text-center">未找到匹配模块</CommandEmpty>
            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem
                  key={opt.code}
                  value={opt.code}
                  onSelect={() => {
                    onChange(opt.code, opt.module_name);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="text-xs"
                >
                  <div>
                    <span>{opt.module_name}</span>
                    {opt.category_name && (
                      <span className="text-[10px] text-gray-400 ml-1.5">{opt.category_name}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function CustomerForm({ customerId, onSaved, onCancel, currentUser }: CustomerFormProps) {
  const isEdit = !!customerId;

  // 基础信息
  const [schoolName, setSchoolName] = useState("");
  const [schoolPopoverOpen, setSchoolPopoverOpen] = useState(false);
  const [customerTypes, setCustomerTypes] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [schoolNature, setSchoolNature] = useState(""); // 办学性质: 公办/民办

  // AI 录入弹窗
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiTargetDesc, setAiTargetDesc] = useState("");

  // 位置信息（同步自项目管理页面创建新项目的数据）
  const [province, setProvince] = useState("");
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [town, setTown] = useState("");
  const [village, setVillage] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");
  const [locationSynced, setLocationSynced] = useState(false);
  const [syncedProjectName, setSyncedProjectName] = useState("");
  const provinceRef = useRef<HTMLDivElement>(null);

  // 关闭省份下拉的点击外部监听
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (provinceRef.current && !provinceRef.current.contains(e.target as Node)) {
        setProvinceOpen(false);
      }
    };
    if (provinceOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [provinceOpen]);

  // 校区管理
  const [campusMode, setCampusMode] = useState<string>("single");
  const [campuses, setCampuses] = useState<Array<{
    name: string; type: string; address: string;
    hardware: Record<string, string>;
    network: Record<string, string>;
  }>>([]);

  // 硬件/网络信息
  const [hardwareInfo, setHardwareInfo] = useState<Record<string, string>>({});
  const [networkInfo, setNetworkInfo] = useState<Record<string, string>>({});

  // 下属学校（教育局模式）
  const isEducationBureau = customerTypes.includes("教育局");
  const [subSchools, setSubSchools] = useState<Array<{
    name: string; types: string; location: { district: string; address: string }; description: string;
    hardware_info: Record<string, string>; network_info: Record<string, string>;
    campus_mode: string; campuses: Array<{ name: string; type: string; address: string; hardware: Record<string, string>; network: Record<string, string> }>;
  }>>([]);
  const [subDepts, setSubDepts] = useState<Record<number, Record<string, DepartmentData>>>({});
  const [subModules, setSubModules] = useState<Record<number, Record<string, ModuleFormData[]>>>({});
  const [subExpanded, setSubExpanded] = useState<Record<string, boolean>>({});
  const [activeSubSchool, setActiveSubSchool] = useState(0); // Tab index for sub-schools

  const addSubSchool = () => {
    const idx = subSchools.length;
    setSubSchools(prev => [...prev, { name: "", types: "", location: { district: "", address: "" }, description: "", hardware_info: {}, network_info: {}, campus_mode: "single", campuses: [] }]);
    setSubDepts(prev => ({ ...prev, [idx]: {} }));
    setSubModules(prev => ({ ...prev, [idx]: {} }));
    setActiveSubSchool(idx); // Auto-switch to new tab
  };
  const removeSubSchool = (idx: number) => {
    setSubSchools(prev => prev.filter((_, i) => i !== idx));
    setSubDepts(prev => { const n = { ...prev }; delete n[idx]; return n; });
    setSubModules(prev => { const n = { ...prev }; delete n[idx]; return n; });
  };
  const updateSubSchool = (idx: number, field: string, value: unknown) => {
    setSubSchools(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };
  const updateSubSchoolLocation = (idx: number, field: string, value: string) => {
    setSubSchools(prev => prev.map((s, i) => i === idx ? { ...s, location: { ...s.location, [field]: value } } : s));
  };
  const addSubSchoolCampus = (schoolIdx: number) => {
    setSubSchools(prev => prev.map((s, i) => i === schoolIdx ? { ...s, campuses: [...s.campuses, { name: "", type: "", address: "", hardware: {}, network: {} }] } : s));
  };
  const removeSubSchoolCampus = (schoolIdx: number, campusIdx: number) => {
    setSubSchools(prev => prev.map((s, i) => i === schoolIdx ? { ...s, campuses: s.campuses.filter((_, ci) => ci !== campusIdx) } : s));
  };
  const updateSubSchoolCampus = (schoolIdx: number, campusIdx: number, field: string, value: unknown) => {
    setSubSchools(prev => prev.map((s, i) => i === schoolIdx ? { ...s, campuses: s.campuses.map((c, ci) => ci === campusIdx ? { ...c, [field]: value as string } : c) } : s));
  };
  const addSubDept = (schoolIdx: number, deptName: string) => {
    const deptDef = ALL_DEPARTMENTS.find(d => d.name === deptName);
    const code = deptDef?.code || deptName;
    setSubDepts(prev => {
      const schoolDepts = { ...(prev[schoolIdx] || {}) };
      if (!schoolDepts[code]) {
        schoolDepts[code] = {
          department_code: code, department_name: deptName,
          personnel: [{ name: "", role: "", phone: "", attitude: "支持" }],
          daily_work: "", workflow: "", pain_points: "", tools: "", expectations: "", group_names: "", department_summary: "",
          metrics: [], dept_scope: "school_wide", campus_id: "",
        };
        // Auto-generate 1 default module
        const modNames = DEFAULT_MODULES_BY_DEPT[deptName] || [];
        const firstMod = modNames.length > 0 ? [modNames[0]] : [];
        setSubModules(prev2 => {
          const schoolMods = { ...(prev2[schoolIdx] || {}) };
          schoolMods[code] = firstMod.map(m => ({
            module_code: m, module_name: m, status: "未购" as const,
            usage_rate: 0, active_users: 0, effect: "", issues: "", current_practice: "", usage_description: "",
            collaborating_departments: [] as string[], materials: [] as Array<{ key: string; name: string; size: number }>,
          }));
          return { ...prev2, [schoolIdx]: schoolMods };
        });
      }
      return { ...prev, [schoolIdx]: schoolDepts };
    });
  };
  const removeSubDept = (schoolIdx: number, code: string) => {
    setSubDepts(prev => {
      const schoolDepts = { ...prev[schoolIdx] }; delete schoolDepts[code];
      return { ...prev, [schoolIdx]: schoolDepts };
    });
  };

  // Sub-school department helpers
  const updateSubDept = (si: number, code: string, field: string, value: unknown) => {
    setSubDepts(prev => ({
      ...prev,
      [si]: { ...prev[si], [code]: { ...prev[si][code], [field]: value } },
    }));
  };
  const addSubPersonnel = (si: number, code: string) => {
    updateSubDept(si, code, "personnel", [
      ...(subDepts[si]?.[code]?.personnel || []),
      { name: "", role: "", phone: "", attitude: "支持" },
    ]);
  };
  const updateSubPersonnel = (si: number, code: string, idx: number, field: string, value: string) => {
    const updated = [...(subDepts[si]?.[code]?.personnel || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    updateSubDept(si, code, "personnel", updated);
  };
  const removeSubPersonnel = (si: number, code: string, idx: number) => {
    const updated = (subDepts[si]?.[code]?.personnel || []).filter((_, i) => i !== idx);
    updateSubDept(si, code, "personnel", updated);
  };
  const updateSubModule = (si: number, code: string, mi: number, field: string, value: unknown) => {
    setSubModules(prev => {
      const schoolMods = [...(prev[si]?.[code] || [])];
      schoolMods[mi] = { ...schoolMods[mi], [field]: value };
      return { ...prev, [si]: { ...prev[si], [code]: schoolMods } };
    });
  };
  const addSubModule = (si: number, code: string) => {
    setSubModules(prev => ({
      ...prev,
      [si]: {
        ...prev[si],
        [code]: [...(prev[si]?.[code] || []), {
          module_code: "", module_name: "", status: "未购",
          usage_rate: 0, active_users: 0, effect: "", issues: "", current_practice: "", usage_description: "",
          collaborating_departments: [] as string[], materials: [] as Array<{ key: string; name: string; size: number }>,
        }],
      },
    }));
  };
  const removeSubModule = (si: number, code: string, mi: number) => {
    setSubModules(prev => ({
      ...prev,
      [si]: { ...prev[si], [code]: (prev[si]?.[code] || []).filter((_, i) => i !== mi) },
    }));
  };
  const uploadSubMaterial = async (si: number, code: string, mi: number, file: File) => {
    const mod = subModules[si]?.[code]?.[mi];
    if (!mod || (mod.materials?.length || 0) >= 3) { toast.error("每个模块最多上传3个文件"); return; }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", "office");
    try {
      const res = await fetch("/api/files/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("上传失败");
      const data = await res.json();
      updateSubModule(si, code, mi, "materials", [...(mod.materials || []), { key: data.key, name: data.name, size: data.size }]);
      toast.success("文件上传成功");
    } catch { toast.error("文件上传失败"); }
  };
  const removeSubMaterial = (si: number, code: string, mi: number, matIdx: number) => {
    const mod = subModules[si]?.[code]?.[mi];
    if (!mod) return;
    updateSubModule(si, code, mi, "materials", (mod.materials || []).filter((_, i) => i !== matIdx));
  };

  // 科室数据
  const [departments, setDepartments] = useState<Record<string, DepartmentData>>({});
  // 模块数据: key = department_code
  const [modules, setModules] = useState<Record<string, ModuleFormData[]>>({});
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formDockExpanded, setFormDockExpanded] = useState(false);
  const [formDockActiveId, setFormDockActiveId] = useState<string | undefined>("form-basic");
  const handleFormScroll = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // 下载模板
  const handleDownloadTemplate = useCallback(() => {
    const a = document.createElement("a");
    a.href = "/api/case-center/template";
    a.download = "画像录入模板.xlsx";
    a.click();
  }, []);

  // 导入 Excel
  const handleImportExcel = useCallback(async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });

      // Sheet 1: 基础信息与位置
      const basicSheet = wb.Sheets["基础信息与位置"];
      if (basicSheet) {
        const rows = XLSX.utils.sheet_to_json<string[]>(basicSheet, { header: 1 });
        if (rows.length > 1) {
          const r = rows[1] as string[];
          if (r[0] && r[0] !== "示例：北京电子信息学校") setSchoolName(String(r[0] || ""));
          if (r[1]) setCustomerTypes(String(r[1]).split(/[,，、]/).map((s) => s.trim()).filter(Boolean));
          if (r[2]) setDescription(String(r[2] || ""));
          setProvince(String(r[3] || ""));
          setCity(String(r[4] || ""));
          setDistrict(String(r[5] || ""));
          setTown(String(r[6] || ""));
          setVillage(String(r[7] || ""));
          setLongitude(String(r[8] || ""));
          setLatitude(String(r[9] || ""));
          setLocationSynced(false);
          setSyncedProjectName("");
        }
      }

      // Sheet 2: 硬件与网络信息
      const hwSheet = wb.Sheets["硬件与网络信息"];
      if (hwSheet) {
        const rows = XLSX.utils.sheet_to_json<string[]>(hwSheet, { header: 1 });
        if (rows.length > 1) {
          const r = rows[1] as string[];
          const hw: Record<string, string> = {};
          const hwKeys = ["总人数","教师人数","学生人数","班级数量","教室数量","功能教室数量","总面积","宿舍楼栋数","校区数量","校门数量","食堂数量","二级学院数"];
          const nw: Record<string, string> = {};
          const nwKeys = ["带宽","服务器数量","虚拟化平台","存储","公网IP","无线覆盖","内网IP段"];

          hwKeys.forEach((k, i) => { if (r[i] !== undefined && r[i] !== "") hw[k] = String(r[i]); });
          nwKeys.forEach((k, i) => { const v = r[12 + i]; if (v !== undefined && v !== "") nw[k] = String(v); });

          setHardwareInfo(hw);
          setNetworkInfo(nw);
        }
      }

      // Sheet 3: 科室业务
      const deptSheet = wb.Sheets["科室业务"];
      const deptNameToCode: Record<string, string> = {};
      if (deptSheet) {
        const rows = XLSX.utils.sheet_to_json<string[]>(deptSheet, { header: 1 });
        const newDepts: Record<string, typeof departments[string]> = { ...departments };
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i] as string[];
          if (!r[0]) continue;
          const name = String(r[0]).trim();
          const deptDef = ALL_DEPARTMENTS.find((d) => d.name === name);
          const code = deptDef?.code || name;
          deptNameToCode[name] = code;
          newDepts[code] = {
            department_code: code,
            department_name: name,
            daily_work: String(r[1] || ""),
            workflow: String(r[2] || ""),
            pain_points: String(r[3] || ""),
            tools: String(r[4] || ""),
            expectations: String(r[5] || ""),
            group_names: "",
            department_summary: String(r[6] || ""),
            personnel: [
              { name: String(r[7] || ""), role: String(r[8] || ""), phone: String(r[9] || ""), attitude: "支持" },
              { name: String(r[10] || ""), role: String(r[11] || ""), phone: String(r[12] || ""), attitude: "支持" },
            ].filter((p) => p.name),
            metrics: [],
            dept_scope: "school_wide",
            campus_id: "",
          };
        }
        setDepartments(newDepts);
      }

      // Sheet 4: 模块状态
      const modSheet = wb.Sheets["模块状态"];
      if (modSheet) {
        const rows = XLSX.utils.sheet_to_json<string[]>(modSheet, { header: 1 });
        const newModules: Record<string, typeof modules[string]> = { ...modules };
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i] as string[];
          if (!r[0] || !r[1]) continue;
          const deptName = String(r[0]).trim();
          const code = deptNameToCode[deptName] || ALL_DEPARTMENTS.find((d) => d.name === deptName)?.code || deptName;
          if (!newModules[code]) newModules[code] = [];
          const statuses = ["已采购-已使用", "已采购-未使用", "未购"];
          const rawStatus = String(r[2] || "").trim();
          const status = statuses.includes(rawStatus) ? rawStatus : "未购";
          newModules[code].push({
            module_code: String(r[1] || ""),
            module_name: String(r[1] || ""),
            status,
            usage_rate: Number(r[3]) || 0,
            active_users: Number(r[4]) || 0,
            effect: status === "已采购-已使用" ? String(r[5] || "") : "",
            issues: String(r[6] || ""),
            current_practice: status === "未购" ? String(r[7] || "") : "",
            usage_description: status === "已采购-已使用" ? String(r[8] || "") : "",
            collaborating_departments: [] as string[],
            materials: [] as Array<{ key: string; name: string; size: number }>,
          });
        }
        setModules(newModules);
      }

      toast.success("Excel 导入成功，请检查并补充数据后保存");
    } catch {
      toast.error("Excel 解析失败，请确认文件格式正确");
    } finally {
      // 重置 file input 以便重复选择同一文件
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [departments, modules]);

  // 下拉数据源
  const [projectList, setProjectList] = useState<Array<{
    id: string;
    project_name: string;
    final_customer: string;
    customer_type: string;
    customer_location: { province: string; city: string; district: string; town: string; village: string };
    longitude: string;
    latitude: string;
  }>>([]);
  const [moduleTypeList, setModuleTypeList] = useState<Array<{ code: string; module_name: string; category_name?: string }>>([]);

  // 从多个客户类型合并科室列表（去重保持顺序）
  // 科室板块颜色映射（看板风格）
  const DEPT_COLORS: Record<string, { bg: string; border: string; header: string; accent: string }> = {
    school_leader:      { bg: "bg-slate-50 dark:bg-slate-950", border: "border-l-slate-400", header: "bg-slate-100 dark:bg-slate-900", accent: "bg-slate-500" },
    academic_affairs:   { bg: "bg-blue-50 dark:bg-blue-950", border: "border-l-blue-400", header: "bg-blue-100 dark:bg-blue-900", accent: "bg-blue-500" },
    teaching_research:  { bg: "bg-indigo-50 dark:bg-indigo-950", border: "border-l-indigo-400", header: "bg-indigo-100 dark:bg-indigo-900", accent: "bg-indigo-500" },
    student_affairs:    { bg: "bg-emerald-50 dark:bg-emerald-950", border: "border-l-emerald-400", header: "bg-emerald-100 dark:bg-emerald-900", accent: "bg-emerald-500" },
    it_center:          { bg: "bg-purple-50 dark:bg-purple-950", border: "border-l-purple-400", header: "bg-purple-100 dark:bg-purple-900", accent: "bg-purple-500" },
    hr:                 { bg: "bg-amber-50 dark:bg-amber-950", border: "border-l-amber-400", header: "bg-amber-100 dark:bg-amber-900", accent: "bg-amber-500" },
    finance:            { bg: "bg-green-50 dark:bg-green-950", border: "border-l-green-400", header: "bg-green-100 dark:bg-green-900", accent: "bg-green-500" },
    logistics:          { bg: "bg-orange-50 dark:bg-orange-950", border: "border-l-orange-400", header: "bg-orange-100 dark:bg-orange-900", accent: "bg-orange-500" },
    security:           { bg: "bg-red-50 dark:bg-red-950", border: "border-l-red-400", header: "bg-red-100 dark:bg-red-900", accent: "bg-red-500" },
    admissions:         { bg: "bg-teal-50 dark:bg-teal-950", border: "border-l-teal-400", header: "bg-teal-100 dark:bg-teal-900", accent: "bg-teal-500" },
    employment:         { bg: "bg-cyan-50 dark:bg-cyan-950", border: "border-l-cyan-400", header: "bg-cyan-100 dark:bg-cyan-900", accent: "bg-cyan-500" },
    supervision:        { bg: "bg-rose-50 dark:bg-rose-950", border: "border-l-rose-400", header: "bg-rose-100 dark:bg-rose-900", accent: "bg-rose-500" },
    psychology:         { bg: "bg-pink-50 dark:bg-pink-950", border: "border-l-pink-400", header: "bg-pink-100 dark:bg-pink-900", accent: "bg-pink-500" },
    dormitory:          { bg: "bg-violet-50 dark:bg-violet-950", border: "border-l-violet-400", header: "bg-violet-100 dark:bg-violet-900", accent: "bg-violet-500" },
    school_office:      { bg: "bg-stone-50 dark:bg-stone-950", border: "border-l-stone-400", header: "bg-stone-100 dark:bg-stone-900", accent: "bg-stone-500" },
    grade_group:        { bg: "bg-lime-50 dark:bg-lime-950", border: "border-l-lime-400", header: "bg-lime-100 dark:bg-lime-900", accent: "bg-lime-500" },
  };

  // Dynamic department list — allows add/remove
  const [applicableDepts, setApplicableDepts] = useState<string[]>([]);
  const [deptListInitialized, setDeptListInitialized] = useState(false);

  // Initialize dept list when customerTypes changes
  useEffect(() => {
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const ct of customerTypes) {
      const depts = CUSTOMER_TYPE_DEPARTMENTS[ct] || [];
      for (const d of depts) {
        if (!seen.has(d)) { seen.add(d); merged.push(d); }
      }
    }
    setApplicableDepts(merged);
  }, [customerTypes]);

  // IntersectionObserver: track active section for dock highlighting
  useEffect(() => {
    const ids = ["form-basic", "form-hw", ...applicableDepts.map((name) => {
      const def = ALL_DEPARTMENTS.find((d) => d.name === name);
      return `form-dept-${def?.code || name}`;
    }), ...(isEducationBureau ? ["form-sub-schools"] : [])];
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
        if (closest) setFormDockActiveId(closest.id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [applicableDepts, isEducationBureau]);

  const addDepartment = (deptName: string) => {
    setApplicableDepts(prev => { if (prev.includes(deptName)) return prev; return [...prev, deptName]; });
    // Initialize department data if not exists
    const deptDef = ALL_DEPARTMENTS.find(d => d.name === deptName);
    const code = deptDef?.code || deptName;
    if (!departments[code]) {
      const modNames = DEFAULT_MODULES_BY_DEPT[deptName] || [];
      const firstMod = modNames.length > 0 ? [modNames[0]] : [];
      setDepartments(prev => ({ ...prev, [code]: {
        department_code: code, department_name: deptName,
        personnel: [{ name: "", role: "", phone: "", attitude: "支持" }],
        daily_work: "", workflow: "", pain_points: "", tools: "", expectations: "", group_names: "", department_summary: "",
        metrics: [], dept_scope: "school_wide", campus_id: "",
      }}));
      setModules(prev => ({ ...prev, [code]: firstMod.map(m => ({
        module_code: m, module_name: m, status: "未购" as const,
        usage_rate: 0, active_users: 0, effect: "", issues: "", current_practice: "", usage_description: "",
        collaborating_departments: [] as string[], materials: [] as Array<{ key: string; name: string; size: number }>,
      })) }));
      setExpandedDepts(prev => ({ ...prev, [code]: true }));
    }
  };

  const removeDepartment = (deptName: string) => {
    setApplicableDepts(prev => prev.filter(n => n !== deptName));
    const deptDef = ALL_DEPARTMENTS.find(d => d.name === deptName);
    const code = deptDef?.code || deptName;
    setDepartments(prev => { const n = { ...prev }; delete n[code]; return n; });
    setModules(prev => { const n = { ...prev }; delete n[code]; return n; });
  };

  // 加载项目列表和模块类型列表
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const [projRes, modRes] = await Promise.all([
          fetch("/api/projects", { headers }),
          fetch("/api/dicts?type=product_module_types"),
        ]);
        if (projRes.ok) {
          const { data } = await projRes.json();
          setProjectList((data || []).map((p: Record<string, unknown>) => {
            const loc = (p.customer_location as Record<string, string>) || {};
            return {
              id: p.id,
              project_name: (p.project_name as string) || "",
              final_customer: (p.final_customer as string) || (p.project_name as string) || "",
              customer_type: p.customer_type || "",
              customer_location: {
                province: loc.province || "",
                city: loc.city || "",
                district: loc.district || "",
                town: loc.town || "",
                village: loc.village || "",
              },
              longitude: (p.longitude as string) || "",
              latitude: (p.latitude as string) || "",
            };
          }));
        }
        if (modRes.ok) {
          const { data } = await modRes.json();
          // 系统设置-基础数据-产品名称-模块名称，仅展示已启用的模块
          const seen = new Set<string>();
          setModuleTypeList((data || [])
            .filter((m: Record<string, unknown>) => m.is_enabled !== false)
            .map((m: Record<string, unknown>) => ({
              code: (m.code as string) || "",
              module_name: (m.module_name as string) || (m.product_name as string) || "",
              category_name: (m.category_name as string) || (m.product_category as string) || "",
            }))
            .filter((m: { code: string; module_name: string }) => {
              if (!m.code || !m.module_name || seen.has(m.module_name)) return false;
              seen.add(m.module_name);
              return true;
            }));
        }
      } catch { /* ignore */ }
    };
    fetchDropdownData();
  }, []);

  // 初始化科室（从多个客户类型合并）
  const initDepartments = useCallback((types: string[]) => {
    const seen = new Set<string>();
    const deptNames: string[] = [];
    for (const t of types) {
      const names = CUSTOMER_TYPE_DEPARTMENTS[t] || [];
      for (const n of names) {
        if (!seen.has(n)) { seen.add(n); deptNames.push(n); }
      }
    }
    const newDepts: Record<string, DepartmentData> = {};
    const newModules: Record<string, ModuleFormData[]> = {};
    const newExpanded: Record<string, boolean> = {};

    deptNames.forEach((name, index) => {
      const deptDef = ALL_DEPARTMENTS.find((d) => d.name === name);
      const code = deptDef?.code || name;

      // 保留已有数据
      if (departments[code]) {
        newDepts[code] = departments[code];
        newModules[code] = modules[code] || [];
      } else {
        newDepts[code] = {
          department_code: code,
          department_name: name,
          personnel: [{ name: "", role: "", phone: "", attitude: "支持" }],
          daily_work: "",
          workflow: "",
          pain_points: "",
          tools: "",
          expectations: "",
          group_names: "",
          department_summary: "",
          metrics: [],
          dept_scope: "school_wide",
          campus_id: "",
        };

        // 自动生成默认模块（仅1个）
        const defaultModuleNames = DEFAULT_MODULES_BY_DEPT[name] || [];
        const firstModule = defaultModuleNames.length > 0 ? [defaultModuleNames[0]] : [];
        newModules[code] = firstModule.map((modName) => ({
          module_code: modName,
          module_name: modName,
          status: "未购" as const,
          usage_rate: 0,
          active_users: 0,
          effect: "",
          issues: "",
          current_practice: "",
          usage_description: "",
          collaborating_departments: [] as string[],
          materials: [] as Array<{ key: string; name: string; size: number }>,
        }));
      }

      newExpanded[code] = expandedDepts[code] ?? (index === 0);
    });

    setDepartments(newDepts);
    setModules(newModules);
    setExpandedDepts(newExpanded);
  }, []);

  // 新建模式：自动从项目表中匹配位置信息（schoolName 改变时自动同步）
  useEffect(() => {
    if (customerId) return; // 只在新建模式下生效
    if (!schoolName.trim() || projectList.length === 0) return;
    const matched = projectList.find(
      (p) => p.final_customer === schoolName || p.project_name === schoolName
    );
    if (matched) {
      setProvince(matched.customer_location.province || "");
      setCity(matched.customer_location.city || "");
      setDistrict(matched.customer_location.district || "");
      setTown(matched.customer_location.town || "");
      setVillage(matched.customer_location.village || "");
      setLongitude(matched.longitude || "");
      setLatitude(matched.latitude || "");
      if (!locationSynced) {
        setLocationSynced(true);
        setSyncedProjectName(matched.project_name);
      }
    }
  }, [schoolName, projectList, customerId, locationSynced]);

  // 加载已有数据（编辑模式）
  useEffect(() => {
    if (!customerId) {
      initDepartments(customerTypes);
      return;
    }

    setFetching(true);
    // 同时加载客户数据和项目列表，确保能同步最新位置
    const token = localStorage.getItem("auth_token");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      fetch(`/api/case-center/customers/${customerId}`).then((res) => res.json()),
      fetch("/api/projects", { headers }).then((res) => res.json()),
    ])
      .then(([{ data }, projResult]) => {
        if (!data) return;

        // 更新项目列表（用于位置同步）
        if (projResult.data) {
          setProjectList((projResult.data || []).map((p: Record<string, unknown>) => {
            const loc = (p.customer_location as Record<string, string>) || {};
            return {
              id: p.id,
              project_name: (p.project_name as string) || "",
              final_customer: (p.final_customer as string) || (p.project_name as string) || "",
              customer_type: p.customer_type || "",
              customer_location: {
                province: loc.province || "",
                city: loc.city || "",
                district: loc.district || "",
                town: loc.town || "",
                village: loc.village || "",
              },
              longitude: (p.longitude as string) || "",
              latitude: (p.latitude as string) || "",
            };
          }));
        }

        const c = data.customer;
        setSchoolName(c.school_name || "");
        // Load school_nature and sub_schools from hardware_info (temporary storage)
        const hwInfo = (c.hardware_info || {}) as Record<string, unknown>;
        setSchoolNature((hwInfo._school_nature as string) || "");
        try { const ss = JSON.parse((hwInfo._sub_schools as string) || "[]"); if (Array.isArray(ss)) setSubSchools(ss); } catch {}

        // 查找匹配项目，优先使用项目最新位置
        const allProjects = ((projResult.data || []) as Record<string, unknown>[]).map((p: Record<string, unknown>) => {
          const loc = (p.customer_location as Record<string, string>) || {};
          return {
            id: p.id as string,
            project_name: p.project_name as string,
            customer_type: p.customer_type || "",
            customer_location: {
              province: loc.province || "",
              city: loc.city || "",
              district: loc.district || "",
              town: loc.town || "",
              village: loc.village || "",
            },
            longitude: (p.longitude as string) || "",
            latitude: (p.latitude as string) || "",
          };
        });
        const matchedProject = allProjects.find((p) => p.project_name === c.school_name);

        const types = Array.isArray(c.customer_types) ? c.customer_types as string[] : [];
        setCustomerTypes(types.length > 0 ? types : []);

        // 位置信息：优先使用项目最新数据
        if (matchedProject) {
          setProvince(matchedProject.customer_location.province || "");
          setCity(matchedProject.customer_location.city || "");
          setDistrict(matchedProject.customer_location.district || "");
          setTown(matchedProject.customer_location.town || "");
          setVillage(matchedProject.customer_location.village || "");
          setLongitude(matchedProject.longitude || "");
          setLatitude(matchedProject.latitude || "");
          setLocationSynced(true);
          setSyncedProjectName(matchedProject.project_name);
        } else {
          const loc = typeof c.location === "object" && c.location !== null ? c.location as Record<string, string> : {};
          setProvince(loc.province || "");
          setCity(loc.city || "");
          setDistrict(loc.district || "");
          setTown(loc.town || "");
          setVillage(loc.village || "");
          setLongitude(loc.longitude || "");
          setLatitude(loc.latitude || "");
          setLocationSynced(false);
          setSyncedProjectName("");
        }
        setDescription(c.description || "");
        setHardwareInfo(typeof c.hardware_info === "object" && c.hardware_info !== null ? c.hardware_info as Record<string, string> : {});
        setNetworkInfo(typeof c.network_info === "object" && c.network_info !== null ? c.network_info as Record<string, string> : {});
        setCampusMode((c.campus_mode as string) || "single");
        setCampuses(Array.isArray(c.campuses) ? (c.campuses as Array<Record<string, unknown>>).map((cam) => ({
          name: (cam.name as string) || "",
          type: (cam.type as string) || "中职",
          address: (cam.address as string) || "",
          hardware: (cam.hardware as Record<string, string>) || {},
          network: (cam.network as Record<string, string>) || {},
        })) : []);

        const loadedTypes: string[] = Array.isArray(c.customer_types) ? c.customer_types as string[] : (c.school_type ? [c.school_type as string] : []);
        const deptNames: string[] = [];
        const deptSeen = new Set<string>();
        for (const t of loadedTypes) {
          for (const n of (CUSTOMER_TYPE_DEPARTMENTS[t] || [])) {
            if (!deptSeen.has(n)) { deptSeen.add(n); deptNames.push(n); }
          }
        }
        // Also include custom departments from saved data (user-added ones)
        for (const savedDept of (data.departments || [])) {
          const name = (savedDept as { department_name: string }).department_name;
          if (name && !deptSeen.has(name)) { deptSeen.add(name); deptNames.push(name); }
        }
        const newDepts: Record<string, DepartmentData> = {};
        const newModules: Record<string, ModuleFormData[]> = {};
        const newExpanded: Record<string, boolean> = {};

        // init applicableDepts with loaded + custom
        setApplicableDepts([...deptNames]);

        deptNames.forEach((name, index) => {
          const deptDef = ALL_DEPARTMENTS.find((d) => d.name === name);
          const code = deptDef?.code || name;

          const existingDept = (data.departments || []).find(
            (d: { department_code: string }) => d.department_code === code
          );

          if (existingDept) {
            newDepts[code] = {
              id: existingDept.id,
              department_code: existingDept.department_code,
              department_name: existingDept.department_name,
              personnel: Array.isArray(existingDept.personnel) ? existingDept.personnel : [],
              daily_work: existingDept.daily_work || "",
              workflow: existingDept.workflow || "",
              pain_points: existingDept.pain_points || "",
              tools: existingDept.tools || "",
              expectations: existingDept.expectations || "",
              group_names: existingDept.group_names || "",
              department_summary: existingDept.department_summary || "",
              metrics: Array.isArray(existingDept.metrics) ? existingDept.metrics as Array<{ indicator: string; value: string; source: string; period: string }> : [],
              dept_scope: (existingDept.dept_scope as string) || "school_wide",
              campus_id: (existingDept.campus_id as string) || "",
            };

            const deptModules = (data.modules || []).filter(
              (m: { customer_department_id: string }) => m.customer_department_id === existingDept.id
            );
            newModules[code] = deptModules.map((m: Record<string, unknown>) => ({
              id: m.id as string | undefined,
              module_code: m.module_code as string,
              module_name: m.module_name as string,
              status: m.status as string || "未购",
              usage_rate: Number(m.usage_rate) || 0,
              active_users: Number(m.active_users) || 0,
              effect: (m.effect as string) || "",
              issues: (m.issues as string) || "",
              current_practice: (m.current_practice as string) || "",
              usage_description: (m.usage_description as string) || "",
              collaborating_departments: Array.isArray(m.collaborating_departments) ? m.collaborating_departments as string[] : [],
              materials: Array.isArray(m.materials) ? m.materials as Array<{ key: string; name: string; size: number }> : [],
            }));
          } else {
            newDepts[code] = {
              department_code: code,
              department_name: name,
              personnel: [{ name: "", role: "", phone: "", attitude: "支持" }],
              daily_work: "",
              workflow: "",
              pain_points: "",
              tools: "",
              expectations: "",
              group_names: "",
              department_summary: "",
              metrics: [],
              dept_scope: "school_wide",
              campus_id: "",
            };
            const defaultModuleNames = DEFAULT_MODULES_BY_DEPT[name] || [];
            const firstModule = defaultModuleNames.length > 0 ? [defaultModuleNames[0]] : [];
            newModules[code] = firstModule.map((modName) => ({
              module_code: modName,
              module_name: modName,
              status: "未购" as const,
              usage_rate: 0,
              active_users: 0,
              effect: "",
              issues: "",
              current_practice: "",
              usage_description: "",
              collaborating_departments: [] as string[],
              materials: [] as Array<{ key: string; name: string; size: number }>,
            }));
          }

          newExpanded[code] = index === 0;
        });

        setDepartments(newDepts);
        setModules(newModules);
        setExpandedDepts(newExpanded);
      })
      .catch(() => toast.error("加载客户数据失败"))
      .finally(() => setFetching(false));
  }, [customerId]);

  // 切换客户类型（多选 toggle）
  const toggleCustomerType = (type: string) => {
    if (isEdit) {
      if (!confirm("更改客户类型将重新生成科室结构。已有数据中适配新类型的科室将保留，不适用的科室数据将丢失。确认继续？")) {
        return;
      }
    }
    if (MULTI_SELECT_CUSTOMER_TYPES.includes(type)) {
      // 多选组：toggle 当前项
      setCustomerTypes((prev) =>
        prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
      );
    } else {
      // 单选组：点击已选中的取消，否则替换非多选组的选择
      setCustomerTypes((prev) => {
        const multiSelected = prev.filter((t) => MULTI_SELECT_CUSTOMER_TYPES.includes(t));
        if (prev.includes(type)) {
          return multiSelected.length > 0 ? multiSelected : prev.filter((t) => t !== type);
        }
        return [...multiSelected, type];
      });
    }
  };

  useEffect(() => {
    // Only init departments for new profiles — edit mode loads from API
    if (!customerId) {
      initDepartments(customerTypes);
    }
  }, [customerTypes, customerId]);

  // 更新科室字段
  const updateDepartment = (code: string, field: string, value: unknown) => {
    setDepartments((prev) => ({
      ...prev,
      [code]: { ...prev[code], [field]: value },
    }));
  };

  // 人员管理
  const addPersonnel = (deptCode: string) => {
    updateDepartment(deptCode, "personnel", [
      ...(departments[deptCode]?.personnel || []),
      { name: "", role: "", phone: "", attitude: "支持" },
    ]);
  };

  const updatePersonnel = (deptCode: string, index: number, field: string, value: string) => {
    const updated = [...(departments[deptCode]?.personnel || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateDepartment(deptCode, "personnel", updated);
  };

  const removePersonnel = (deptCode: string, index: number) => {
    const updated = (departments[deptCode]?.personnel || []).filter((_, i) => i !== index);
    updateDepartment(deptCode, "personnel", updated);
  };

  // 模块管理
  const updateModule = (deptCode: string, moduleIndex: number, field: string, value: unknown) => {
    setModules((prev) => {
      const updated = [...(prev[deptCode] || [])];
      updated[moduleIndex] = { ...updated[moduleIndex], [field]: value };
      return { ...prev, [deptCode]: updated };
    });
  };

  const addModule = (deptCode: string) => {
    setModules((prev) => ({
      ...prev,
      [deptCode]: [
        ...(prev[deptCode] || []),
        {
          module_code: "",
          module_name: "",
          status: "未购",
          usage_rate: 0,
          active_users: 0,
          effect: "",
          issues: "",
          current_practice: "",
          usage_description: "",
          collaborating_departments: [],
          materials: [],
        },
      ],
    }));
  };

  const removeModule = (deptCode: string, moduleIndex: number) => {
    setModules((prev) => ({
      ...prev,
      [deptCode]: (prev[deptCode] || []).filter((_, i) => i !== moduleIndex),
    }));
  };

  // 文件上传
  const uploadMaterial = async (deptCode: string, moduleIndex: number, file: File) => {
    const mod = modules[deptCode]?.[moduleIndex];
    if (!mod || (mod.materials?.length || 0) >= 3) {
      toast.error("每个模块最多上传3个文件");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", "office");

    try {
      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("上传失败");
      const data = await res.json();

      updateModule(deptCode, moduleIndex, "materials", [
        ...(mod.materials || []),
        { key: data.key, name: data.name, size: data.size },
      ]);
      toast.success("文件上传成功");
    } catch {
      toast.error("文件上传失败");
    }
  };

  const removeMaterial = (deptCode: string, moduleIndex: number, materialIndex: number) => {
    const mod = modules[deptCode]?.[moduleIndex];
    if (!mod) return;
    const updated = (mod.materials || []).filter((_, i) => i !== materialIndex);
    updateModule(deptCode, moduleIndex, "materials", updated);
  };

  // 提交
  const handleSubmit = async () => {
    if (!schoolName.trim()) {
      toast.error("请输入学校名称");
      return;
    }

    // Check duplicate — one profile per school name (only for new profiles)
    if (!isEdit) {
      try {
        const checkRes = await fetch(`/api/case-center/customers?q=${encodeURIComponent(schoolName)}`);
        if (checkRes.ok) {
          const { data } = await checkRes.json();
          if (data && data.length > 0) {
            const exists = data.some((c: { school_name: string }) => c.school_name === schoolName);
            if (exists) { toast.error(`"${schoolName}" 已有画像记录，请勿重复创建。如需修改请编辑已有画像。`); return; }
          }
        }
      } catch { /* ignore check errors */ }
    }

    setLoading(true);
    try {
      let cid = customerId;

      if (isEdit && cid) {
        // 更新基本信息
        const updateRes = await fetch(`/api/case-center/customers/${cid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            school_name: schoolName,
            customer_types: customerTypes,
            location: {
              province, city, district, town, village, longitude, latitude,
            },
            description,
            hardware_info: { ...hardwareInfo, _school_nature: schoolNature, _sub_schools: JSON.stringify(subSchools) },
            network_info: networkInfo,
            campus_mode: campusMode,
            campuses,
          }),
        });

        if (!updateRes.ok) {
          const errData = await updateRes.json().catch(() => ({}));
          throw new Error(errData.error || "更新失败");
        }

        // 更新科室业务字段（含可编辑的科室名称）
        const buildDeptPayload = (depts: Record<string, DepartmentData>) =>
          Object.values(depts).filter((d) => d.id).map((d) => ({
            id: d.id,
            department_name: d.department_name,
            personnel: d.personnel,
            daily_work: d.daily_work,
            workflow: d.workflow,
            pain_points: d.pain_points,
            tools: d.tools,
            expectations: d.expectations,
            group_names: d.group_names,
            department_summary: d.department_summary,
            metrics: d.metrics,
            dept_scope: d.dept_scope,
            campus_id: d.campus_id,
          }));

        // Create custom departments (ones without IDs) first
        const editCustomDepts = Object.values(departments).filter((d) => !d.id);
        for (const cd of editCustomDepts) {
          try {
            const cdRes = await fetch(`/api/case-center/customers/${cid}/departments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customer_id: cid,
                department_code: cd.department_code,
                department_name: cd.department_name,
                personnel: cd.personnel,
                daily_work: cd.daily_work,
                workflow: cd.workflow,
                pain_points: cd.pain_points,
                tools: cd.tools,
                expectations: cd.expectations,
                group_names: cd.group_names,
                department_summary: cd.department_summary,
                dept_scope: cd.dept_scope,
                campus_id: cd.campus_id,
              }),
            });
            if (cdRes.ok) {
              const cdData = await cdRes.json();
              if (cdData.data?.id) {
                const updated = { ...departments };
                updated[cd.department_code] = { ...cd, id: cdData.data.id };
                setDepartments(updated);
              }
            }
          } catch { /* skip */ }
        }

        const deptPayload = buildDeptPayload(departments);

        if (deptPayload.length > 0) {
          await fetch(`/api/case-center/customers/${cid}/departments`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ departments: deptPayload }),
          });
        }
      } else {
        // 新建
        const res = await fetch("/api/case-center/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            school_name: schoolName,
            customer_types: customerTypes,
            location: {
              province, city, district, town, village, longitude, latitude,
            },
            description,
            hardware_info: { ...hardwareInfo, _school_nature: schoolNature, _sub_schools: JSON.stringify(subSchools) },
            network_info: networkInfo,
            campus_mode: campusMode,
            campuses,
            created_by: currentUser.name,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "创建失败");
        }
        const { data } = await res.json();
        cid = data.id;

        // 获取刚创建的科室列表（含 ID）
        const deptRes = await fetch(`/api/case-center/customers/${cid}/departments`);
        const deptData = await deptRes.json();

        // 用新 ID 更新本地 state
        const newDepts = { ...departments };
        (deptData.data || []).forEach((d: { department_code: string; id: string }) => {
          if (newDepts[d.department_code]) {
            newDepts[d.department_code] = { ...newDepts[d.department_code], id: d.id };
          }
        });
        setDepartments(newDepts);

        // Create custom departments (ones without IDs) first
        const customDepts = Object.values(newDepts).filter((d) => !d.id);
        for (const cd of customDepts) {
          try {
            const cdRes = await fetch(`/api/case-center/customers/${cid}/departments`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customer_id: cid,
                department_code: cd.department_code,
                department_name: cd.department_name,
                personnel: cd.personnel,
                daily_work: cd.daily_work,
                workflow: cd.workflow,
                pain_points: cd.pain_points,
                tools: cd.tools,
                expectations: cd.expectations,
                group_names: cd.group_names,
                department_summary: cd.department_summary,
                dept_scope: cd.dept_scope,
                campus_id: cd.campus_id,
              }),
            });
            if (cdRes.ok) {
              const cdData = await cdRes.json();
              if (cdData.data?.id) {
                newDepts[cd.department_code] = { ...cd, id: cdData.data.id };
              }
            }
          } catch { /* skip failed custom dept creation */ }
        }

        // Update ALL departments (now with IDs)
        const deptPayload = Object.values(newDepts).filter((d) => d.id).map((d) => ({
          id: d.id,
          personnel: d.personnel,
          daily_work: d.daily_work,
          workflow: d.workflow,
          pain_points: d.pain_points,
          tools: d.tools,
          expectations: d.expectations,
          group_names: d.group_names,
          department_summary: d.department_summary,
          metrics: d.metrics,
          dept_scope: d.dept_scope,
          campus_id: d.campus_id,
          department_name: d.department_name,
        }));

        if (deptPayload.length > 0) {
          await fetch(`/api/case-center/customers/${cid}/departments`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ departments: deptPayload }),
          });
        }
      }

      // 保存模块（批量 upsert）
      if (cid) {
        const allModules: Record<string, unknown>[] = [];
        for (const [deptCode, mods] of Object.entries(modules)) {
          const dept = departments[deptCode];
          if (!dept?.id) continue;

          for (const mod of mods) {
            if (!mod.module_name.trim()) continue;
            allModules.push({
              ...(mod.id ? { id: mod.id } : {}),
              customer_department_id: dept.id,
              module_code: mod.module_code || mod.module_name,
              module_name: mod.module_name,
              status: mod.status,
              usage_rate: mod.usage_rate,
              active_users: mod.active_users,
              effect: mod.effect,
              issues: mod.issues,
              current_practice: mod.current_practice,
              usage_description: mod.usage_description,
              collaborating_departments: mod.collaborating_departments,
              materials: mod.materials,
            });
          }
        }

        await fetch(`/api/case-center/customers/${cid}/modules`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modules: allModules }),
        });

        // 创建版本快照
        await fetch("/api/case-center/versions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_id: cid,
            change_summary: isEdit ? "编辑画像" : "新建画像",
            changed_fields: ["基础信息", "科室业务", "模块状态"],
            operator: currentUser.name,
          }),
        });
      }

      toast.success(isEdit ? "保存成功" : "创建成功");
      if (cid) onSaved(cid);
    } catch (error) {
      toast.error("保存失败: " + (error instanceof Error ? error.message : "未知错误"));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current mr-2" />
        加载中...
      </div>
    );
  }

  const deptIcons: Record<string, string> = {
    school_leader: "🏫", academic_affairs: "📋", teaching_research: "📚", student_affairs: "👥",
    it_center: "🖥️", hr: "👔", finance: "💰", logistics: "🔧", security: "🛡️",
    admissions: "🎓", employment: "💼", supervision: "📊", psychology: "💚",
    dormitory: "🏠", school_office: "📝", grade_group: "🏢",
  };

  // Build dock departments for CaseDock nav
  const formDockDepts: DockDept[] = [
    ...applicableDepts.map((name) => {
      const def = ALL_DEPARTMENTS.find((d) => d.name === name);
      const c = def?.code || name;
      const dept = departments[c];
      const deptMods = modules[c] || [];
      const landedCount = deptMods.filter((m) => m.status === "已采购-已使用").length;
      const displayName = dept?.department_name || name;
      return { code: `form-dept-${c}`, name: displayName, icon: deptIcons[c] || "🏛️", landedCount, totalCount: deptMods.length };
    }),
    ...(isEducationBureau && subSchools.length > 0
      ? subSchools.map((s, i) => ({ code: `form-sub-${i}`, name: s.name || `学校${i + 1}`, icon: "🏫", landedCount: 0, totalCount: 0 }))
      : []),
  ];

  return (
    <div className="bg-[#f5f5f7] min-h-screen">
      <CaseDock
        onBack={onCancel}
        departments={formDockDepts}
        onScrollTo={handleFormScroll}
        activeId={formDockActiveId}
        onExpandedChange={setFormDockExpanded}
        profileId="form-basic"
        hwId="form-hw"
      />

      {/* Main content area — offset by dock */}
      <div
        className={cn(
          "transition-[margin-left] duration-[250ms] ease-[cubic-bezier(.4,0,.2,1)]",
          formDockExpanded ? "ml-[244px]" : "ml-[88px]"
        )}
      >
        <div className="max-w-[1380px] mx-auto px-10 pt-4 pb-16">
        {/* Header */}
        <div className="text-center pt-8 pb-5 mb-6">
          <h1 className="text-[32px] font-extrabold tracking-[-1px] text-black">
            {isEdit ? "编辑画像" : "新建用户画像"}
          </h1>
          <p className="text-[11px] text-[#999] tracking-[3px] mt-1">
            {isEdit ? "EDIT CUSTOMER PROFILE" : "CREATE CUSTOMER PROFILE"}
          </p>
          <p className="text-xs text-gray-400 mt-2">按步骤填写学校信息，构建完整的客户画像档案</p>
        </div>

        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between py-2 mb-5">
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#555] px-4 py-2 rounded-[10px] hover:bg-gray-200 hover:text-black transition-all"
          >
            ← 返回画像列表
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="h-10 px-5 rounded-[10px] text-[13px] font-semibold border-[1.5px] border-[#e0e0e0] text-black bg-white hover:bg-gray-100">
              <Download className="w-3.5 h-3.5 mr-1.5" />下载模板
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-10 px-5 rounded-[10px] text-[13px] font-semibold border-[1.5px] border-[#e0e0e0] text-black bg-white hover:bg-gray-100">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />导入Excel
            </Button>
            <input ref={fileInputRef} type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImportExcel(file);
                  }}
                />
            <Button variant="outline" size="sm" className="h-10 px-5 rounded-[10px] text-[13px] font-semibold border-[1.5px] border-[#e0e0e0] text-black bg-white hover:bg-gray-100" onClick={onCancel}>
              取消
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={loading} className="h-10 px-5 rounded-[10px] text-[13px] font-semibold bg-black text-white hover:bg-[#222]">
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {loading ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>

      {/* 表单内容 */}
      <div className="space-y-6">
        {/* 基础信息 */}
        <div id="form-basic" className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,.04)] scroll-mt-[100px]">
          <div className="bg-black text-white px-5 py-2.5 text-xs font-bold tracking-wider">基础信息</div>
          <div className="p-5 space-y-4">
            {/* 学校名称 — 整行 */}
            <div className="space-y-1.5">
                <Label className="text-xs">最终用户 *</Label>
                <Popover open={schoolPopoverOpen} onOpenChange={setSchoolPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="h-9 w-full justify-between text-xs font-normal">
                      {schoolName || "搜索选择项目学校..."}
                      <Search className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[560px] min-w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="搜索学校名称..." className="h-8 text-xs" />
                      <CommandList className="max-h-[200px]">
                        <CommandEmpty className="text-xs py-2 text-center">未找到匹配学校</CommandEmpty>
                        <CommandGroup>
                          {projectList.map((p) => (
                            <CommandItem key={p.id} value={p.final_customer} onSelect={() => {
                              setSchoolPopoverOpen(false);
                              setSchoolName(p.final_customer);
                              if (p.customer_type && !isEdit) {
                                const types = p.customer_type.split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean);
                                // Only set if we got valid types that match known customer categories
                                const validTypes = types.filter((t: string) => CUSTOMER_TYPE_OPTIONS.some(opt => opt.code === t));
                                if (validTypes.length > 0) setCustomerTypes(validTypes);
                              }
                              setProvince(p.customer_location.province || ""); setCity(p.customer_location.city || ""); setDistrict(p.customer_location.district || ""); setTown(p.customer_location.town || ""); setVillage(p.customer_location.village || ""); setLongitude(p.longitude || ""); setLatitude(p.latitude || ""); setLocationSynced(true); setSyncedProjectName(p.project_name);
                            }} className="text-xs">
                              <div>
                                <span>{p.final_customer}</span>
                                {p.final_customer !== p.project_name && (
                                  <span className="text-[10px] text-gray-400 ml-1.5">{p.project_name}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {!isEdit && (<p className="text-[11px] text-muted-foreground">来源于已建项目，自动带出位置信息</p>)}
            </div>

            {/* 校区模式 + 办学性质 并排一行 */}
            {!customerTypes.includes("教育局") && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">校区模式</Label>
                <Select value={campusMode} onValueChange={setCampusMode}>
                  <SelectTrigger className="h-9 w-full text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">单校区</SelectItem>
                    <SelectItem value="multi_independent">多校区独立</SelectItem>
                    <SelectItem value="multi_cross">多校区交叉</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">办学性质</Label>
                <Select value={schoolNature} onValueChange={setSchoolNature}>
                  <SelectTrigger className="h-9 w-full text-xs"><SelectValue placeholder="请选择" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="公办">公办</SelectItem>
                    <SelectItem value="民办">民办</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            )}

            {/* 客户类型（多选） */}
            <div className="space-y-1.5">
              <Label className="text-xs">客户类型</Label>
              <div className="flex flex-wrap gap-1.5">
                {CUSTOMER_TYPE_OPTIONS.map((t) => {
                  const selected = customerTypes.includes(t.code);
                  const isMulti = MULTI_SELECT_CUSTOMER_TYPES.includes(t.code);
                  return (
                    <Badge
                      key={t.code}
                      variant={selected ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-xs py-1 px-2 transition-colors",
                        selected ? "hover:bg-primary/80" : "hover:bg-muted"
                      )}
                      onClick={() => toggleCustomerType(t.code)}
                    >
                      {t.name}
                      {isMulti && selected && customerTypes.filter((ct) => MULTI_SELECT_CUSTOMER_TYPES.includes(ct)).length > 1 && (
                        <span className="ml-1 opacity-70">({customerTypes.filter((ct) => MULTI_SELECT_CUSTOMER_TYPES.includes(ct)).indexOf(t.code) + 1})</span>
                      )}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                幼儿园/小学/初中/中职/高中 支持多选，其余单选
              </p>
            </div>

            {/* 位置信息（同步自项目管理页面创建新项目的数据） */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs">位置信息</Label>
                {locationSynced && (
                  <Badge variant="secondary" className="text-[10px] gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                    <Check className="w-3 h-3" />
                    来源于项目数据
                  </Badge>
                )}
              </div>
              {locationSynced && (
                <p className="text-[11px] text-muted-foreground">
                  位置数据同步自项目管理「{syncedProjectName}」的最新数据，自动更新。如需修改请前往项目管理页面。
                </p>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div className="relative" ref={provinceRef}>
                  <Input value={province} onChange={(e) => { if (!locationSynced) { setProvince(e.target.value); setProvinceOpen(true); } }} onFocus={() => { if (!locationSynced) setProvinceOpen(true); }} placeholder="省/自治区/直辖市" className={cn("h-8 pr-6 text-xs", locationSynced && "bg-muted/50 text-muted-foreground cursor-default")} readOnly={locationSynced} />
                  {province && !locationSynced && (<button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" onClick={() => { setProvince(""); setProvinceOpen(false); }}><X className="h-3.5 w-3.5" /></button>)}
                  {provinceOpen && !locationSynced && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-auto">
                      {PROVINCES.filter((p) => !province || p.includes(province) || p.replace(/[省市自治区特别行政区壮族回族维吾尔]/g, "").includes(province)).map((p) => (<button key={p} type="button" className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => { setProvince(p); setProvinceOpen(false); }}>{p}</button>))}
                    </div>
                  )}
                </div>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="市" className={cn("h-8 text-xs", locationSynced && "bg-muted/50 text-muted-foreground")} readOnly={locationSynced} />
                <Input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="区/县" className={cn("h-8 text-xs", locationSynced && "bg-muted/50 text-muted-foreground")} readOnly={locationSynced} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input value={town} onChange={(e) => setTown(e.target.value)} placeholder="镇/乡" className={cn("h-8 text-xs", locationSynced && "bg-muted/50 text-muted-foreground")} readOnly={locationSynced} />
                <Input value={village} onChange={(e) => setVillage(e.target.value)} placeholder="村" className={cn("h-8 text-xs", locationSynced && "bg-muted/50 text-muted-foreground")} readOnly={locationSynced} />
                <div className="grid grid-cols-2 gap-3">
                  <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="经度" className={cn("h-8 text-xs", locationSynced && "bg-muted/50 text-muted-foreground")} readOnly={locationSynced} />
                  <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="纬度" className={cn("h-8 text-xs", locationSynced && "bg-muted/50 text-muted-foreground")} readOnly={locationSynced} />
                </div>
              </div>
            </div>

            {/* 多校区列表配置 — placed after location info */}
            {!customerTypes.includes("教育局") && campusMode !== "single" && (
            <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">校区列表</Label>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setCampuses((prev) => [...prev, { name: "", type: "中职", address: "", hardware: {}, network: {} }])}>
                      <Plus className="w-3 h-3 mr-0.5" />添加校区
                    </Button>
                  </div>
                  {campuses.map((campus, ci) => (
                    <div key={ci} className="p-3 border rounded-md bg-muted/20 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input className="flex-1 h-8 text-xs" value={campus.name} placeholder="校区名称（必填）" onChange={(e) => { const updated = [...campuses]; updated[ci] = { ...updated[ci], name: e.target.value }; setCampuses(updated); }} />
                        <div className="flex flex-wrap gap-1">
                          {CUSTOMER_TYPE_OPTIONS.filter(t => t.code !== "教育局").map((t) => {
                            const types = (campus.type || "").split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean); const selected = types.includes(t.code);
                            return <Badge key={t.code} variant={selected ? "default" : "outline"} className="cursor-pointer text-[10px] py-0.5 px-1.5" onClick={() => { const updated = [...campuses]; let newTypes: string[]; if (selected) newTypes = types.filter((x) => x !== t.code); else newTypes = [...types, t.code]; updated[ci] = { ...updated[ci], type: newTypes.join(",") }; setCampuses(updated); }}>{t.name}</Badge>;
                          })}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setCampuses((prev) => prev.filter((_, i) => i !== ci))}><Trash2 className="w-3.5 h-3.5 text-gray-400" /></Button>
                      </div>
                      <Input className="h-8 text-xs" value={campus.address} placeholder="校区地址（选填）" onChange={(e) => { const updated = [...campuses]; updated[ci] = { ...updated[ci], address: e.target.value }; setCampuses(updated); }} />
                      {/* Campus hardware */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                        {["总人数","教师人数","学生人数","班级数量","教室数量","功能教室数量","总面积","宿舍楼栋数"].map((key) => (
                          <div key={key} className="space-y-0.5"><Label className="text-[9px]">{key}</Label>
                            <Input type="number" inputMode="numeric" min="0" step="1" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} className="h-8 text-[10px]" value={campus.hardware?.[key] || ""}
                              onChange={(e) => { const updated = [...campuses]; updated[ci] = { ...updated[ci], hardware: { ...updated[ci].hardware, [key]: e.target.value } }; setCampuses(updated); }} />
                          </div>))}
                      </div>
                      {/* Campus network */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                        {["带宽","服务器数量","虚拟化平台","存储","公网IP","无线覆盖","内网IP段"].map((key) => (
                          <div key={key} className="space-y-0.5"><Label className="text-[9px]">{key}</Label>
                            <Input className="h-8 text-[10px]" value={campus.network?.[key] || ""}
                              onChange={(e) => { const updated = [...campuses]; updated[ci] = { ...updated[ci], network: { ...updated[ci].network, [key]: e.target.value } }; setCampuses(updated); }} />
                          </div>))}
                      </div>
                    </div>
                  ))}
                  {campuses.length === 0 && (<p className="text-[11px] text-muted-foreground">请添加至少一个校区</p>)}
                </div>
            </div>
            )}

            {/* 描述 — rich text editor */}
            <div className="space-y-1.5">
              <Label className="text-xs">描述</Label>
              <RichTextEditor
                value={description}
                onChange={(v: string) => setDescription(v)}
                placeholder="学校简要描述..."
                className="min-h-[160px]"
              />
            </div>
          </div>
        </div>

        {/* 硬件与网络信息 — hidden when multi-campus */}
        {campusMode === "single" && (
        <div id="form-hw" className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,.04)] scroll-mt-[100px]">
          <div className="bg-black text-white px-5 py-2.5 text-xs font-bold tracking-wider">硬件与网络信息</div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">学校总人数</Label>
                <Input type="number" inputMode="numeric" min="0" step="1" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} value={hardwareInfo["总人数"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "总人数": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">教师人数</Label>
                <Input type="number" inputMode="numeric" min="0" step="1" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} value={hardwareInfo["教师人数"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "教师人数": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">学生人数</Label>
                <Input type="number" inputMode="numeric" min="0" step="1" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} value={hardwareInfo["学生人数"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "学生人数": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">班级数量</Label>
                <Input type="number" inputMode="numeric" min="0" step="1" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} value={hardwareInfo["班级数量"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "班级数量": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">教室数量</Label>
                <Input type="number" inputMode="numeric" min="0" step="1" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} value={hardwareInfo["教室数量"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "教室数量": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">功能教室数量</Label>
                <Input type="number" inputMode="numeric" min="0" step="1" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} value={hardwareInfo["功能教室数量"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "功能教室数量": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">学校总面积(m²)</Label>
                <Input type="number" inputMode="numeric" min="0" step="1" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} value={hardwareInfo["总面积"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "总面积": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">宿舍楼栋数</Label>
                <Input type="number" inputMode="numeric" min="0" step="1" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} value={hardwareInfo["宿舍楼栋数"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "宿舍楼栋数": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">校区数量</Label>
                <Input type="number" inputMode="numeric" min="0" step="1" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} value={hardwareInfo["校区数量"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "校区数量": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">校门数量</Label>
                <Input type="number" inputMode="numeric" min="0" step="1" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} value={hardwareInfo["校门数量"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "校门数量": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">食堂数量</Label>
                <Input type="number" inputMode="numeric" min="0" step="1" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} value={hardwareInfo["食堂数量"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "食堂数量": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">二级学院/学部数</Label>
                <Input type="number" inputMode="numeric" min="0" step="1" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} value={hardwareInfo["二级学院数"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "二级学院数": e.target.value }))} />
              </div>
            </div>

            <div className="border-t pt-3">
              <Label className="text-xs font-medium mb-2 block">网络基础设施</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">学校网络带宽</Label>
                  <Input className="h-8 text-xs" value={networkInfo["带宽"] || ""} onChange={(e) => setNetworkInfo((prev) => ({ ...prev, "带宽": e.target.value }))} placeholder="例如：1000M" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">服务器总量(台)</Label>
                  <Input type="number" inputMode="numeric" min="0" step="1" className="h-8 text-xs" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} value={networkInfo["服务器数量"] || ""} onChange={(e) => setNetworkInfo((prev) => ({ ...prev, "服务器数量": e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">虚拟化平台</Label>
                  <Input className="h-8 text-xs" value={networkInfo["虚拟化平台"] || ""} onChange={(e) => setNetworkInfo((prev) => ({ ...prev, "虚拟化平台": e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">存储品牌及容量</Label>
                  <Input className="h-8 text-xs" value={networkInfo["存储"] || ""} onChange={(e) => setNetworkInfo((prev) => ({ ...prev, "存储": e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">公网IP及带宽</Label>
                  <Input className="h-8 text-xs" value={networkInfo["公网IP"] || ""} onChange={(e) => setNetworkInfo((prev) => ({ ...prev, "公网IP": e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">无线覆盖</Label>
                  <Select value={networkInfo["无线覆盖"] || ""} onValueChange={(v) => setNetworkInfo((prev) => ({ ...prev, "无线覆盖": v }))}>
                    <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="无线覆盖..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="全覆盖">全覆盖</SelectItem>
                      <SelectItem value="部分覆盖">部分覆盖</SelectItem>
                      <SelectItem value="无">无</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">内网IP段</Label>
                  <Input className="h-8 text-xs" value={networkInfo["内网IP段"] || ""} onChange={(e) => setNetworkInfo((prev) => ({ ...prev, "内网IP段": e.target.value }))} />
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* 科室面板 */}
        {applicableDepts.map((deptName) => {
          const deptDef = ALL_DEPARTMENTS.find((d) => d.name === deptName);
          const code = deptDef?.code || deptName;
          const dept = departments[code];
          const deptModules = modules[code] || [];
          const isExpanded = expandedDepts[code] ?? false;

          if (!dept) return null;

          const colors = DEPT_COLORS[code] || DEPT_COLORS.school_leader;

          return (
            <Collapsible
              key={code}
              open={isExpanded}
              onOpenChange={(open) => setExpandedDepts((prev) => ({ ...prev, [code]: open }))}
            >
              <div id={`form-dept-${code}`} className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,.04)] relative scroll-mt-[100px]">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className={cn("py-3 pr-9 cursor-pointer transition-colors rounded-tr-lg", colors.header)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                            <div className={cn("w-2 h-2 rounded-full", colors.accent)} />
                            <Input
                              className="h-8 min-w-[120px] max-w-[260px] text-base font-semibold border border-transparent bg-white/60 hover:border-gray-300 focus-visible:ring-1 focus-visible:border-black rounded-md px-2"
                              value={dept.department_name}
                              onChange={(e) => updateDepartment(code, "department_name", e.target.value)}
                              onClick={(ev) => ev.stopPropagation()}
                              placeholder="科室名称"
                            />
                          </div>
                        {campusMode === "multi_cross" && (
                          <Select
                            value={dept.dept_scope || "school_wide"}
                            onValueChange={(v) => {
                              updateDepartment(code, "dept_scope", v);
                              if (v === "school_wide") updateDepartment(code, "campus_id", "");
                            }}
                          >
                            <SelectTrigger className="h-7 w-28 text-[10px]" onClick={(ev) => ev.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="school_wide">全校共享</SelectItem>
                              <SelectItem value="campus_specific">校区专属</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {(campusMode !== "single" && dept.dept_scope === "campus_specific") && (
                          <Select
                            value={dept.campus_id || ""}
                            onValueChange={(v) => updateDepartment(code, "campus_id", v)}
                          >
                            <SelectTrigger className="h-7 w-28 text-[10px]" onClick={(ev) => ev.stopPropagation()}>
                              <SelectValue placeholder="选择校区" />
                            </SelectTrigger>
                            <SelectContent>
                              {campuses.map((c, i) => (
                                <SelectItem key={i} value={c.name || `校区${i + 1}`}>
                                  {c.name || `校区${i + 1}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {deptModules.length} 个模块
                        </Badge>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                {/* Delete button outside trigger to avoid button-in-button */}
                <button
                  className="absolute top-3 right-3 z-10 inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-gray-100 text-gray-400 hover:text-black"
                  onClick={(ev) => { ev.stopPropagation(); ev.preventDefault(); removeDepartment(deptName); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {/* 人员 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-medium">科室人员</Label>
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addPersonnel(code)}>
                          <Plus className="w-3 h-3 mr-0.5" />
                          添加人员
                        </Button>
                      </div>
                      {(dept.personnel || []).map((p, i) => (
                        <div key={i} className="flex items-center gap-2 mb-2 p-2 border rounded-md bg-muted/20">
                          <Input
                            className="flex-1 h-8 text-xs"
                            placeholder="姓名"
                            value={p.name}
                            onChange={(e) => updatePersonnel(code, i, "name", e.target.value)}
                          />
                          <Input
                            className="flex-1 h-8 text-xs"
                            placeholder="职务"
                            value={p.role}
                            onChange={(e) => updatePersonnel(code, i, "role", e.target.value)}
                          />
                          <Input
                            className="flex-1 h-8 text-xs"
                            placeholder="电话"
                            value={p.phone}
                            onChange={(e) => updatePersonnel(code, i, "phone", e.target.value)}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removePersonnel(code, i)}>
                            <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* 业务描述 — supports multiple groups */}
                    <BusinessGroups code={code} dept={dept} updateDepartment={updateDepartment} />

                    {/* 模块匹配表 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-medium">模块匹配</Label>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-black hover:bg-gray-100" onClick={() => addModule(code)}>
                          <Plus className="w-3 h-3 mr-0.5" />
                          添加模块
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {deptModules.map((mod, mi) => (
                          <div key={mi} className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,.04)] p-3 relative">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-7 w-7 z-10"
                              onClick={() => removeModule(code, mi)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                            </Button>
                            {/* Row 1: 模块名称 + 状态 */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[11px]">模块名称</Label>
                                <ModuleSearchSelect
                                  value={mod.module_name}
                                  onChange={(modCode, modName) => {
                                    updateModule(code, mi, "module_code", modCode);
                                    updateModule(code, mi, "module_name", modName);
                                  }}
                                  options={moduleTypeList}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px]">状态</Label>
                                <Select
                                  value={mod.status}
                                  onValueChange={(v) => updateModule(code, mi, "status", v)}
                                >
                                  <SelectTrigger className="h-8 w-full text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MODULE_STATUS_OPTIONS.map((s) => (
                                      <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* 已采购-已使用: 使用介绍 */}
                            {mod.status === "已采购-已使用" && (
                              <div className="space-y-1">
                                <Label className="text-[11px]">使用介绍</Label>
                                <RichTextEditor className="min-h-[80px] rounded-none" value={mod.usage_description || ""} onChange={(v: string) => updateModule(code, mi, "usage_description", v)}
                                  placeholder="例如：教务处每周使用该模块进行排课和调课，教师通过移动端查看课表..." />
                              </div>
                            )}

                            {/* Row 2 (未购): 当前替代做法 */}
                            {mod.status === "未购" && (
                              <div className="space-y-1">
                                <Label className="text-[11px]">当前替代做法</Label>
                                <RichTextEditor className="min-h-[80px] rounded-none" value={mod.current_practice} onChange={(v: string) => updateModule(code, mi, "current_practice", v)}
                                  placeholder="例如：目前使用Excel手工管理，每周汇总一次..." />
                              </div>
                            )}

                            {/* Row 3: 效果/原因 + 问题 */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[11px]">
                                  {mod.status === "已采购-已使用" ? "使用效果" : mod.status === "已采购-未使用" ? "未使用原因" : "备注"}
                                </Label>
                                <RichTextEditor className="min-h-[80px] rounded-none"
                                  value={mod.status === "已采购-已使用" ? mod.effect : mod.status === "已采购-未使用" ? mod.issues : (mod.effect || "")}
                                  onChange={(v: string) => { if (mod.status === "已采购-已使用") updateModule(code, mi, "effect", v); else if (mod.status === "已采购-未使用") updateModule(code, mi, "issues", v); else updateModule(code, mi, "effect", v); }}
                                  placeholder={mod.status === "已采购-已使用" ? "例如：教师反馈积极，使用频率高..." : mod.status === "已采购-未使用" ? "例如：预算未批复、教师培训不足..." : "例如：暂无相关需求或计划..."} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px]">问题</Label>
                                <RichTextEditor className="min-h-[80px] rounded-none" value={mod.issues} onChange={(v: string) => updateModule(code, mi, "issues", v)}
                                  placeholder="例如：系统响应速度慢、部分功能不完善、教师使用意愿低..." />
                              </div>
                            </div>

                            {/* 协同科室 */}
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] text-muted-foreground">协同科室：</span>
                              {applicableDepts
                                .filter((name) => {
                                  const d = ALL_DEPARTMENTS.find((dd) => dd.name === name);
                                  return d && d.code !== code;
                                })
                                .map((name) => {
                                  const d = ALL_DEPARTMENTS.find((dd) => dd.name === name);
                                  const dCode = d?.code || name;
                                  const selected = (mod.collaborating_departments || []).includes(dCode);
                                  return (
                                    <Badge
                                      key={dCode}
                                      variant={selected ? "default" : "outline"}
                                      className="cursor-pointer text-[10px]"
                                      onClick={() => {
                                        const current = [...(mod.collaborating_departments || [])];
                                        const idx = current.indexOf(dCode);
                                        if (idx >= 0) current.splice(idx, 1);
                                        else current.push(dCode);
                                        updateModule(code, mi, "collaborating_departments", current);
                                      }}
                                    >
                                      {name}
                                    </Badge>
                                  );
                                })}
                            </div>

                            {/* 素材上传 — available for all statuses */}
                            {(
                              <div className="mt-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-muted-foreground">素材：</span>
                                  {(mod.materials || []).map((m, matIdx) => (
                                    <Badge key={matIdx} variant="secondary" className="text-[10px] gap-1">
                                      <a href={`/api/files/${m.key}`} download={m.name} className="hover:underline cursor-pointer" onClick={(e) => e.stopPropagation()}>
                                        {m.name.length > 15 ? m.name.slice(0, 15) + "..." : m.name}
                                      </a>
                                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeMaterial(code, mi, matIdx)} />
                                    </Badge>
                                  ))}
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".mp4,.mov,.avi,.ppt,.pptx,.md,.txt"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) uploadMaterial(code, mi, file);
                                        e.target.value = "";
                                      }}
                                    />
                                    <Badge variant="outline" className="text-[10px] gap-1 cursor-pointer hover:bg-muted">
                                      <Upload className="w-3 h-3" />
                                      {(mod.materials || []).length}/3
                                    </Badge>
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {/* Add department button — supports predefined + custom */}
      <AddDepartmentButton
        addedNames={new Set(applicableDepts)}
        predefined={ALL_DEPARTMENTS}
        onAdd={(name) => addDepartment(name)}
      />

      {/* 下属学校（教育局模式）— Tab 切换，每次只显示一个学校 */}
      {isEducationBureau && (
        <div id="form-sub-schools" className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,.04)] mt-6 scroll-mt-[100px]">
          <div className="bg-black text-white px-5 py-2.5 text-xs font-bold tracking-wider flex items-center justify-between">
            <span>下属学校</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs text-white hover:bg-[#333]" onClick={addSubSchool}>＋ 添加下属学校</Button>
          </div>
          {subSchools.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">暂无下属学校，点击上方"＋ 添加下属学校"按钮添加</div>
          ) : (
            <>
              {/* Tab bar */}
              <div className="flex border-b border-[#e0e0e0] bg-white overflow-x-auto">
                {subSchools.map((school, si) => (
                  <button key={si} id={`form-sub-${si}`}
                    onClick={() => setActiveSubSchool(si)}
                    className={cn(
                      "shrink-0 px-4 py-2.5 text-xs font-medium border-r border-[#e8e8e8] transition-colors flex items-center gap-1.5",
                      activeSubSchool === si
                        ? "bg-gray-100 text-black border-b-2 border-b-black -mb-px"
                        : "text-gray-500 hover:bg-gray-50"
                    )}>
                    🏫 {school.name || `学校 ${si + 1}`}
                    {subSchools.length > 1 && (
                      <span className="text-gray-400 hover:text-black ml-0.5" onClick={(ev) => { ev.stopPropagation(); removeSubSchool(si); if (activeSubSchool >= si && activeSubSchool > 0) setActiveSubSchool(activeSubSchool - 1); }}>
                        <X className="w-3 h-3" /></span>
                    )}
                  </button>
                ))}
              </div>
              {/* Active tab content */}
              {subSchools[activeSubSchool] && (() => {
                const school = subSchools[activeSubSchool];
                const si = activeSubSchool;
                return (
              <div className="p-5 space-y-4">
                {/* Row 1: 学校名称 + 学校类型 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">学校名称</Label>
                    <div className="flex gap-1">
                      <Input className="h-8 text-xs flex-1" value={school.name} onChange={(e) => updateSubSchool(si, "name", e.target.value)} placeholder="如：天河区第一小学" />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-[10px] shrink-0" title="从项目中选择">📋</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-0" align="end">
                          <Command>
                            <CommandInput placeholder="搜索项目学校..." className="h-8 text-xs" />
                            <CommandList className="max-h-[160px]">
                              <CommandEmpty className="text-xs py-2 text-center">未找到</CommandEmpty>
                              <CommandGroup>
                                {projectList.filter(p => p.final_customer !== schoolName).map((p) => (
                                  <CommandItem key={p.id} value={p.final_customer} className="text-xs" onSelect={() => {
                                    updateSubSchool(si, "name", p.final_customer);
                                    updateSubSchool(si, "types", p.customer_type || "");
                                    updateSubSchoolLocation(si, "district", p.customer_location?.district || "");
                                    updateSubSchool(si, "description", (p as any).description || "");
                                  }}>
                                    {p.final_customer}
                                    <span className="text-[10px] text-gray-400 ml-1">{p.customer_type}</span>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">学校类型</Label>
                    <div className="flex flex-wrap gap-1">
                      {CUSTOMER_TYPE_OPTIONS.filter(t => t.code !== "教育局").map((t) => {
                        const types = (school.types || "").split(/[,，、]/).map((s: string) => s.trim()).filter(Boolean);
                        const sel = types.includes(t.code);
                        return <Badge key={t.code} variant={sel ? "default" : "outline"} className="cursor-pointer text-[10px] py-0.5 px-1.5" onClick={() => { const n = sel ? types.filter(x => x !== t.code) : [...types, t.code]; updateSubSchool(si, "types", n.join(",")); }}>{t.name}</Badge>;
                      })}
                    </div>
                  </div>
                </div>
                {/* Row 2: 区/县 + 地址 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">区/县</Label>
                    <Input className="h-8 text-xs" value={school.location?.district || ""} onChange={(e) => updateSubSchoolLocation(si, "district", e.target.value)} placeholder="如：天河区" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">地址</Label>
                    <Input className="h-8 text-xs" value={school.location?.address || ""} onChange={(e) => updateSubSchoolLocation(si, "address", e.target.value)} placeholder="详细地址" />
                  </div>
                </div>
                {/* 学校描述 */}
                <div className="space-y-1.5">
                  <Label className="text-xs">学校描述</Label>
                  <RichTextEditor className="min-h-[120px] rounded-none" value={school.description} onChange={(v: string) => updateSubSchool(si, "description", v)} placeholder="学校简要描述..." />
                </div>
                {/* HW/NW — single campus mode */}
                {(school.campus_mode || "single") === "single" && (
                <div>
                  <div className="border-t border-[#e8e8e8] pt-3 mb-3" />
                  <Label className="text-xs font-medium mb-2 block">基本信息</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {["总人数","教师人数","学生人数","班级数量","教室数量","功能教室数量","总面积"].map((key) => (
                      <div key={key} className="space-y-0.5">
                        <Label className="text-[10px]">{key}</Label>
                        <Input type="number" inputMode="numeric" min="0" step="1" onKeyDown={(e) => { if (e.key === '.' || e.key === 'e' || e.key === 'E' || e.key === '-' || e.key === '+') e.preventDefault() }} className="h-7 text-[10px]" placeholder={key}
                          value={(school.hardware_info || {})[key] || ""}
                          onChange={(e) => updateSubSchool(si, "hardware_info", { ...(school.hardware_info || {}), [key]: e.target.value })} />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {["带宽","服务器数量","无线覆盖"].map((key) => (
                      <div key={key} className="space-y-0.5">
                        <Label className="text-[10px]">{key}</Label>
                        <Input className="h-7 text-[10px]" placeholder={key}
                          value={(school.network_info || {})[key] || ""}
                          onChange={(e) => updateSubSchool(si, "network_info", { ...(school.network_info || {}), [key]: e.target.value })} />
                      </div>
                    ))}
                  </div>
                </div>
                )}
                {/* Campus mode */}
                <div className="border-t border-[#e8e8e8] pt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">校区模式</Label>
                      <Select value={school.campus_mode || "single"} onValueChange={(v) => updateSubSchool(si, "campus_mode", v)}>
                        <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">单校区</SelectItem>
                          <SelectItem value="multi_independent">多校区独立</SelectItem>
                          <SelectItem value="multi_cross">多校区交叉</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(school.campus_mode === "multi_independent" || school.campus_mode === "multi_cross") && (
                      <div className="flex items-end pb-0.5">
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-black hover:bg-gray-100" onClick={() => addSubSchoolCampus(si)}>＋ 添加校区</Button>
                      </div>
                    )}
                  </div>
                </div>
                {/* Campus list */}
                {(school.campus_mode === "multi_independent" || school.campus_mode === "multi_cross") && school.campuses.map((campus, ci) => (
                  <div key={ci} className="bg-gray-50 border border-[#e8e8e8] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold">🏫 校区 {ci + 1}</span>
                      <Button variant="ghost" size="sm" className="h-5 text-[10px] text-gray-400" onClick={() => removeSubSchoolCampus(si, ci)}>✕</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="space-y-0.5"><Label className="text-[10px]">校区名称</Label>
                        <Input className="h-7 text-[10px]" value={campus.name} placeholder="校区名称" onChange={(e) => updateSubSchoolCampus(si, ci, "name", e.target.value)} /></div>
                      <div className="space-y-0.5"><Label className="text-[10px]">地址</Label>
                        <Input className="h-7 text-[10px]" value={campus.address} placeholder="校区地址" onChange={(e) => updateSubSchoolCampus(si, ci, "address", e.target.value)} /></div>
                    </div>
                    <div className="text-[10px] font-medium text-gray-500 mb-1">硬件信息</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {["总人数","教师人数","学生人数","班级数量","教室数量","功能教室数量","总面积","宿舍楼栋数"].map((key) => (
                        <div key={key} className="space-y-0.5"><Label className="text-[9px]">{key}</Label>
                          <Input type="number" inputMode="numeric" min="0" step="1" className="h-7 text-[10px]" value={(campus.hardware || {})[key] || ""}
                            onChange={(e) => { const hw = { ...(campus.hardware || {}), [key]: e.target.value }; setSubSchools(prev => prev.map((s, i) => i === si ? { ...s, campuses: s.campuses.map((c, j) => j === ci ? { ...c, hardware: hw } : c) } : s)); }} />
                        </div>))}
                    </div>
                    <div className="text-[10px] font-medium text-gray-500 mt-2 mb-1">网络信息</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {["带宽","服务器数量","虚拟化平台","存储","无线覆盖"].map((key) => (
                        <div key={key} className="space-y-0.5"><Label className="text-[9px]">{key}</Label>
                          <Input className="h-7 text-[10px]" value={(campus.network || {})[key] || ""}
                            onChange={(e) => { const nw = { ...(campus.network || {}), [key]: e.target.value }; setSubSchools(prev => prev.map((s, i) => i === si ? { ...s, campuses: s.campuses.map((c, j) => j === ci ? { ...c, network: nw } : c) } : s)); }} />
                        </div>))}
                    </div>
                  </div>
                ))}
                {/* Sub-school departments */}
                <div className="border-t border-[#e8e8e8] pt-3">
                  <AddDepartmentButton
                    addedNames={new Set(Object.values(subDepts[si] || {}).map(d => d.department_name))}
                    predefined={ALL_DEPARTMENTS}
                    onAdd={(name) => addSubDept(si, name)}
                  />
                  {Object.keys(subDepts[si] || {}).length === 0 && (
                    <p className="text-xs text-gray-400 mt-2">暂未添加科室，点击上方按钮添加</p>
                  )}
                  {Object.entries(subDepts[si] || {}).map(([code, dept]) => {
                    const subMods = subModules[si]?.[code] || [];
                    const colors = DEPT_COLORS[code] || DEPT_COLORS.school_leader;
                    return (
                    <Collapsible key={code} defaultOpen className="mt-3">
                      <div className="border-l-2 border-l-gray-300 pl-3">
                        <CollapsibleTrigger className="w-full text-left">
                          <div className="flex items-center justify-between mb-2 cursor-pointer">
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-2 h-2 rounded-full", colors.accent)} />
                              <Input className="h-7 min-w-[100px] max-w-[200px] text-sm font-semibold border border-transparent bg-white/60 hover:border-gray-300 focus-visible:ring-1 focus-visible:border-black rounded-md px-2"
                                value={dept.department_name}
                                onChange={(e) => updateSubDept(si, code, "department_name", e.target.value)}
                                onClick={(ev) => ev.stopPropagation()}
                                placeholder="科室名称" />
                              <Badge variant="secondary" className="text-[10px]">{subMods.length} 模块</Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-gray-400 hover:text-black"
                                onClick={(ev) => { ev.stopPropagation(); ev.preventDefault(); removeSubDept(si, code); }}>
                                <Trash2 className="w-3 h-3 mr-0.5" />移除</Button>
                              <ChevronDown className="w-3.5 h-3.5 text-gray-400 Collapsible__open-icon" />
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pb-3 mb-3 border-b border-dashed border-[#e8e8e8]">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-medium text-gray-500">科室人员</span>
                              <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={() => addSubPersonnel(si, code)}>＋ 添加</Button>
                            </div>
                            {(dept.personnel || []).map((p, pi) => (
                              <div key={pi} className="flex items-center gap-1.5 mb-1.5">
                                <Input className="flex-1 h-7 text-[11px]" placeholder="姓名" value={p.name}
                                  onChange={(e) => updateSubPersonnel(si, code, pi, "name", e.target.value)} />
                                <Input className="flex-1 h-7 text-[11px]" placeholder="职务" value={p.role}
                                  onChange={(e) => updateSubPersonnel(si, code, pi, "role", e.target.value)} />
                                <Input className="flex-1 h-7 text-[11px]" placeholder="电话" value={p.phone}
                                  onChange={(e) => updateSubPersonnel(si, code, pi, "phone", e.target.value)} />
                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeSubPersonnel(si, code, pi)}>
                                  <X className="w-3 h-3 text-gray-400" /></Button>
                              </div>
                            ))}
                          </div>
                          <div className="pb-3 mb-3 border-b border-dashed border-[#e8e8e8]">
                            <BusinessGroups code={code} dept={dept} updateDepartment={(c, f, v) => updateSubDept(si, c, f, v)} />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-medium text-gray-500">模块匹配</span>
                              <Button variant="ghost" size="sm" className="h-5 text-[10px] text-black hover:bg-gray-100" onClick={() => addSubModule(si, code)}>＋ 添加</Button>
                            </div>
                            <div className="space-y-2">
                              {subMods.map((mod, mi) => (
                                <div key={mi} className="bg-gray-50/50 border border-dashed border-[#e8e8e8] p-2.5 relative">
                                  <Button variant="ghost" size="icon" className="absolute top-1.5 right-1.5 h-6 w-6 z-10"
                                    onClick={() => removeSubModule(si, code, mi)}><X className="w-3 h-3 text-gray-400" /></Button>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1"><Label className="text-[10px]">模块名称</Label>
                                      <ModuleSearchSelect value={mod.module_name}
                                        onChange={(modCode, modName) => { updateSubModule(si, code, mi, "module_code", modCode); updateSubModule(si, code, mi, "module_name", modName); }}
                                        options={moduleTypeList} /></div>
                                    <div className="space-y-1"><Label className="text-[10px]">状态</Label>
                                      <Select value={mod.status} onValueChange={(v) => updateSubModule(si, code, mi, "status", v)}>
                                        <SelectTrigger className="h-7 w-full text-[11px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>{MODULE_STATUS_OPTIONS.map(s => (<SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>))}</SelectContent></Select></div>
                                  </div>
                                  {mod.status === "已采购-已使用" && (
                                    <div className="space-y-1 mt-2"><Label className="text-[10px]">使用介绍</Label>
                                      <RichTextEditor className="min-h-[60px] rounded-none" value={mod.usage_description || ""}
                                        onChange={(v: string) => updateSubModule(si, code, mi, "usage_description", v)}
                                        placeholder="例如：教务处每周使用该模块进行排课和调课..." /></div>)}
                                  {mod.status === "未购" && (
                                    <div className="space-y-1 mt-2"><Label className="text-[10px]">当前替代做法</Label>
                                      <RichTextEditor className="min-h-[60px] rounded-none" value={mod.current_practice}
                                        onChange={(v: string) => updateSubModule(si, code, mi, "current_practice", v)}
                                        placeholder="目前使用Excel手工管理..." /></div>)}
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="space-y-1"><Label className="text-[10px]">{mod.status === "已采购-已使用" ? "使用效果" : mod.status === "已采购-未使用" ? "未使用原因" : "备注"}</Label>
                                      <RichTextEditor className="min-h-[60px] rounded-none"
                                        value={mod.status === "已采购-已使用" ? mod.effect : mod.issues}
                                        onChange={(v: string) => { if (mod.status === "已采购-已使用") updateSubModule(si, code, mi, "effect", v); else updateSubModule(si, code, mi, "issues", v); }} /></div>
                                    <div className="space-y-1"><Label className="text-[10px]">问题</Label>
                                      <RichTextEditor className="min-h-[60px] rounded-none" value={mod.issues}
                                        onChange={(v: string) => updateSubModule(si, code, mi, "issues", v)}
                                        placeholder="系统响应速度慢..." /></div>
                                  </div>
                                  <div className="mt-2 flex items-center gap-1.5">
                                    <span className="text-[10px] text-gray-400">素材：</span>
                                    {(mod.materials || []).map((m, matIdx) => (
                                      <Badge key={matIdx} variant="secondary" className="text-[9px] gap-0.5 py-0 px-1">
                                        <a href={`/api/files/${m.key}`} download={m.name} className="hover:underline cursor-pointer">{m.name.length > 12 ? m.name.slice(0, 12) + "…" : m.name}</a>
                                        <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => removeSubMaterial(si, code, mi, matIdx)} /></Badge>))}
                                    <label className="cursor-pointer"><input type="file" className="hidden" accept=".mp4,.mov,.avi,.ppt,.pptx,.md,.txt"
                                      onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadSubMaterial(si, code, mi, file); e.target.value = ""; }} />
                                      <Badge variant="outline" className="text-[9px] gap-0.5 cursor-pointer hover:bg-muted py-0 px-1"><Upload className="w-2.5 h-2.5" />{(mod.materials || []).length}/3</Badge></label>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                    );
                  })}
                </div>
              </div>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* 底部操作栏 */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-card sticky bottom-0 z-10">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          <Save className="w-4 h-4 mr-1" />
          {loading ? "保存中..." : (isEdit ? "保存" : "创建")}
        </Button>
      </div>

      <AIInputDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        onConfirm={(text, _mappings) => {
          // 如果有 target 描述字段则填入，否则追加到项目描述
          setDescription((prev) => prev + (prev ? "\n\n" : "") + text);
        }}
        fieldOptions={[
          { key: "description", label: "项目描述" },
          { key: "business", label: "科室业务描述" },
          { key: "needs", label: "需求分析" },
          { key: "remark", label: "备注" },
        ]}
      />
      </div>{/* close dock margin wrapper */}
      </div>{/* close max-w */}
    </div>
  );
}
