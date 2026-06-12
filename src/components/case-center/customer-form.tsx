"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Save, ChevronDown, ChevronUp, Plus, Trash2, Upload, X, Search, Check, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
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
  department_summary: string;
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
  collaborating_departments: string[];
  materials: Array<{ key: string; name: string; size: number }>;
}

interface CustomerFormProps {
  customerId: string | null;
  onSaved: (customerId: string) => void;
  onCancel: () => void;
  currentUser: { id: string; name: string };
}

// 模块名称搜索选择器
function ModuleSearchSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (name: string) => void;
  options: Array<{ code: string; module_name: string }>;
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
        <Command>
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
                  value={opt.module_name}
                  onSelect={() => {
                    onChange(opt.module_name);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="text-xs"
                >
                  {opt.module_name}
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
  const [customerTypes, setCustomerTypes] = useState<string[]>(["中职"]);
  const [description, setDescription] = useState("");

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

  // 硬件/网络信息
  const [hardwareInfo, setHardwareInfo] = useState<Record<string, string>>({});
  const [networkInfo, setNetworkInfo] = useState<Record<string, string>>({});

  // 科室数据
  const [departments, setDepartments] = useState<Record<string, DepartmentData>>({});
  // 模块数据: key = department_code
  const [modules, setModules] = useState<Record<string, ModuleFormData[]>>({});
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          const nwKeys = ["带宽","服务器数量","虚拟化平台","存储","数据库","公网IP","无线覆盖","堡垒机","内网IP段"];

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
            department_summary: String(r[6] || ""),
            personnel: [
              { name: String(r[7] || ""), role: String(r[8] || ""), phone: String(r[9] || ""), attitude: String(r[10] || "") },
              { name: String(r[11] || ""), role: String(r[12] || ""), phone: String(r[13] || ""), attitude: String(r[14] || "") },
            ].filter((p) => p.name),
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
          const statuses = ["已落地", "未落地", "未购"];
          const rawStatus = String(r[2] || "").trim();
          const status = statuses.includes(rawStatus) ? rawStatus : "未购";
          newModules[code].push({
            module_code: String(r[1] || ""),
            module_name: String(r[1] || ""),
            status,
            usage_rate: Number(r[3]) || 0,
            active_users: Number(r[4]) || 0,
            effect: status === "已落地" ? String(r[5] || "") : "",
            issues: String(r[6] || ""),
            current_practice: status === "未购" ? String(r[7] || "") : "",
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
    customer_type: string;
    customer_location: { province: string; city: string; district: string; town: string; village: string };
    longitude: string;
    latitude: string;
  }>>([]);
  const [moduleTypeList, setModuleTypeList] = useState<Array<{ code: string; module_name: string }>>([]);

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

  const applicableDepts = (() => {
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const ct of customerTypes) {
      const depts = CUSTOMER_TYPE_DEPARTMENTS[ct] || [];
      for (const d of depts) {
        if (!seen.has(d)) {
          seen.add(d);
          merged.push(d);
        }
      }
    }
    return merged;
  })();

  // 加载项目列表和模块类型列表
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [projRes, modRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/dicts?type=product_module_types"),
        ]);
        if (projRes.ok) {
          const { data } = await projRes.json();
          setProjectList((data || []).map((p: Record<string, unknown>) => {
            const loc = (p.customer_location as Record<string, string>) || {};
            return {
              id: p.id,
              project_name: p.project_name,
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
          // 去重：多个产品可能共享同一模块名称
          const seen = new Set<string>();
          setModuleTypeList((data || []).map((m: Record<string, unknown>) => {
            const name = (m.module_name as string) || (m.product_name as string) || "";
            return { code: name, module_name: name };
          }).filter((m: { module_name: string }) => {
            if (!m.module_name || seen.has(m.module_name)) return false;
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
          personnel: [],
          daily_work: "",
          workflow: "",
          pain_points: "",
          tools: "",
          expectations: "",
          department_summary: "",
        };

        // 自动生成默认模块
        const defaultModuleNames = DEFAULT_MODULES_BY_DEPT[name] || [];
        newModules[code] = defaultModuleNames.map((modName, i) => ({
          module_code: modName,
          module_name: modName,
          status: "未购" as const,
          usage_rate: 0,
          active_users: 0,
          effect: "",
          issues: "",
          current_practice: "",
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

  // 加载已有数据（编辑模式）
  useEffect(() => {
    if (!customerId) {
      initDepartments(customerTypes);
      return;
    }

    setFetching(true);
    // 同时加载客户数据和项目列表，确保能同步最新位置
    Promise.all([
      fetch(`/api/case-center/customers/${customerId}`).then((res) => res.json()),
      fetch("/api/projects").then((res) => res.json()),
    ])
      .then(([{ data }, projResult]) => {
        if (!data) return;

        // 更新项目列表（用于位置同步）
        if (projResult.data) {
          setProjectList((projResult.data || []).map((p: Record<string, unknown>) => {
            const loc = (p.customer_location as Record<string, string>) || {};
            return {
              id: p.id,
              project_name: p.project_name,
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
        setCustomerTypes(types.length > 0 ? types : ["中职"]);

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

        const loadedTypes: string[] = Array.isArray(c.customer_types) ? c.customer_types as string[] : (c.school_type ? [c.school_type as string] : ["中职"]);
        const deptNames: string[] = [];
        const deptSeen = new Set<string>();
        for (const t of loadedTypes) {
          for (const n of (CUSTOMER_TYPE_DEPARTMENTS[t] || [])) {
            if (!deptSeen.has(n)) { deptSeen.add(n); deptNames.push(n); }
          }
        }
        const newDepts: Record<string, DepartmentData> = {};
        const newModules: Record<string, ModuleFormData[]> = {};
        const newExpanded: Record<string, boolean> = {};

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
              department_summary: existingDept.department_summary || "",
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
              collaborating_departments: Array.isArray(m.collaborating_departments) ? m.collaborating_departments as string[] : [],
              materials: Array.isArray(m.materials) ? m.materials as Array<{ key: string; name: string; size: number }> : [],
            }));
          } else {
            newDepts[code] = {
              department_code: code,
              department_name: name,
              personnel: [],
              daily_work: "",
              workflow: "",
              pain_points: "",
              tools: "",
              expectations: "",
              department_summary: "",
            };
            const defaultModuleNames = DEFAULT_MODULES_BY_DEPT[name] || [];
            newModules[code] = defaultModuleNames.map((modName) => ({
              module_code: modName,
              module_name: modName,
              status: "未购" as const,
              usage_rate: 0,
              active_users: 0,
              effect: "",
              issues: "",
              current_practice: "",
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
    if (!customerId || customerTypes.length > 0) {
      initDepartments(customerTypes);
    }
  }, [customerTypes]);

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
      { name: "", role: "", phone: "", attitude: "" },
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
            hardware_info: hardwareInfo,
            network_info: networkInfo,
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
            department_summary: d.department_summary,
          }));

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
            hardware_info: hardwareInfo,
            network_info: networkInfo,
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

        // 用新 ID 更新本地 state，同时更新科室名称
        const newDepts = { ...departments };
        (deptData.data || []).forEach((d: { department_code: string; id: string }) => {
          if (newDepts[d.department_code]) {
            newDepts[d.department_code] = { ...newDepts[d.department_code], id: d.id };
          }
        });
        setDepartments(newDepts);

        // 更新科室业务字段（含可编辑的科室名称）
        const deptPayload = Object.values(newDepts).filter((d) => d.id).map((d) => ({
          id: d.id,
          personnel: d.personnel,
          daily_work: d.daily_work,
          workflow: d.workflow,
          pain_points: d.pain_points,
          tools: d.tools,
          expectations: d.expectations,
          department_summary: d.department_summary,
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

  return (
    <div className="flex flex-col">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <h2 className="font-semibold text-lg">{isEdit ? "编辑画像" : "新建画像"}</h2>
        </div>
        <div className="flex items-center gap-2">
          {!isEdit && (
            <>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="w-4 h-4 mr-1" />
                下载模板
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                导入Excel
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportExcel(file);
                }}
              />
            </>
          )}
          <Button variant="outline" size="sm" onClick={onCancel}>
            取消
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading}>
            <Save className="w-4 h-4 mr-1" />
            {loading ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      {/* 表单内容 */}
      <div className="p-4 space-y-4">
        {/* 基础信息 */}
        <Card className="shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-base">基础信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 学校名称（搜索下拉） */}
            <div className="flex items-start gap-4">
              <div className="space-y-1.5 w-[300px]">
                <Label className="text-xs">学校名称 *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="h-9 w-full justify-between text-xs font-normal"
                    >
                      {schoolName || "搜索选择项目学校..."}
                      <Search className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="搜索学校名称..."
                        className="h-8 text-xs"
                      />
                      <CommandList className="max-h-[200px]">
                        <CommandEmpty className="text-xs py-2 text-center">未找到匹配学校</CommandEmpty>
                        <CommandGroup>
                          {projectList.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.project_name}
                              onSelect={() => {
                                setSchoolName(p.project_name);
                                if (p.customer_type && !isEdit) {
                                  setCustomerTypes([p.customer_type]);
                                }
                                setProvince(p.customer_location.province || "");
                                setCity(p.customer_location.city || "");
                                setDistrict(p.customer_location.district || "");
                                setTown(p.customer_location.town || "");
                                setVillage(p.customer_location.village || "");
                                setLongitude(p.longitude || "");
                                setLatitude(p.latitude || "");
                                setLocationSynced(true);
                                setSyncedProjectName(p.project_name);
                              }}
                              className="text-xs"
                            >
                              <Check className={cn("mr-2 h-3.5 w-3.5", schoolName === p.project_name ? "opacity-100" : "opacity-0")} />
                              {p.project_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {!isEdit && (
                  <p className="text-[11px] text-muted-foreground">来源于已建项目，自动带出位置信息</p>
                )}
              </div>

              {/* 客户类型（多选） */}
              <div className="space-y-1.5 flex-1">
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
                  <Input
                    value={province}
                    onChange={(e) => { if (!locationSynced) { setProvince(e.target.value); setProvinceOpen(true); } }}
                    onFocus={() => { if (!locationSynced) setProvinceOpen(true); }}
                    placeholder="省/自治区/直辖市"
                    className={cn("h-8 pr-6 text-xs", locationSynced && "bg-muted/50 text-muted-foreground cursor-default")}
                    readOnly={locationSynced}
                  />
                  {province && !locationSynced && (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      onClick={() => { setProvince(""); setProvinceOpen(false); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {provinceOpen && !locationSynced && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-auto">
                      {PROVINCES.filter((p) => !province || p.includes(province) || p.replace(/[省市自治区特别行政区壮族回族维吾尔]/g, "").includes(province)).map((p) => (
                        <button
                          key={p}
                          type="button"
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          onClick={() => { setProvince(p); setProvinceOpen(false); }}
                        >
                          {p}
                        </button>
                      ))}
                      {PROVINCES.filter((p) => !province || p.includes(province) || p.replace(/[省市自治区特别行政区壮族回族维吾尔]/g, "").includes(province)).length === 0 && (
                        <div className="px-3 py-2 text-xs text-slate-400">无匹配结果</div>
                      )}
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

            {/* 描述 */}
            <div className="space-y-1.5">
              <Label className="text-xs">描述</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="学校简要描述..."
                className="min-h-[80px] text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* 硬件与网络信息 */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">硬件与网络信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">学校总人数</Label>
                <Input className="h-8 text-xs" value={hardwareInfo["总人数"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "总人数": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">教师人数</Label>
                <Input className="h-8 text-xs" value={hardwareInfo["教师人数"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "教师人数": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">学生人数</Label>
                <Input className="h-8 text-xs" value={hardwareInfo["学生人数"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "学生人数": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">班级数量</Label>
                <Input className="h-8 text-xs" value={hardwareInfo["班级数量"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "班级数量": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">教室数量</Label>
                <Input className="h-8 text-xs" value={hardwareInfo["教室数量"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "教室数量": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">功能教室数量</Label>
                <Input className="h-8 text-xs" value={hardwareInfo["功能教室数量"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "功能教室数量": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">学校总面积(m²)</Label>
                <Input className="h-8 text-xs" value={hardwareInfo["总面积"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "总面积": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">宿舍楼栋数</Label>
                <Input className="h-8 text-xs" value={hardwareInfo["宿舍楼栋数"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "宿舍楼栋数": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">校区数量</Label>
                <Input className="h-8 text-xs" value={hardwareInfo["校区数量"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "校区数量": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">校门数量</Label>
                <Input className="h-8 text-xs" value={hardwareInfo["校门数量"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "校门数量": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">食堂数量</Label>
                <Input className="h-8 text-xs" value={hardwareInfo["食堂数量"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "食堂数量": e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">二级学院/学部数</Label>
                <Input className="h-8 text-xs" value={hardwareInfo["二级学院数"] || ""} onChange={(e) => setHardwareInfo((prev) => ({ ...prev, "二级学院数": e.target.value }))} />
              </div>
            </div>

            <div className="border-t pt-3">
              <Label className="text-xs font-medium mb-2 block">网络基础设施</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">学校网络带宽</Label>
                  <Input className="h-8 text-xs" value={networkInfo["带宽"] || ""} onChange={(e) => setNetworkInfo((prev) => ({ ...prev, "带宽": e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">服务器总量(台)</Label>
                  <Input className="h-8 text-xs" value={networkInfo["服务器数量"] || ""} onChange={(e) => setNetworkInfo((prev) => ({ ...prev, "服务器数量": e.target.value }))} />
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
                  <Label className="text-xs">数据库类型及版本</Label>
                  <Input className="h-8 text-xs" value={networkInfo["数据库"] || ""} onChange={(e) => setNetworkInfo((prev) => ({ ...prev, "数据库": e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">公网IP及带宽</Label>
                  <Input className="h-8 text-xs" value={networkInfo["公网IP"] || ""} onChange={(e) => setNetworkInfo((prev) => ({ ...prev, "公网IP": e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">无线覆盖</Label>
                  <Select value={networkInfo["无线覆盖"] || ""} onValueChange={(v) => setNetworkInfo((prev) => ({ ...prev, "无线覆盖": v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="全覆盖">全覆盖</SelectItem>
                      <SelectItem value="部分覆盖">部分覆盖</SelectItem>
                      <SelectItem value="无">无</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">堡垒机</Label>
                  <Select value={networkInfo["堡垒机"] || ""} onValueChange={(v) => setNetworkInfo((prev) => ({ ...prev, "堡垒机": v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="选择..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="有">有</SelectItem>
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
          </CardContent>
        </Card>

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
              <Card className={cn("border-l-4 shadow-sm transition-colors", colors.bg, colors.border)}>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className={cn("py-3 cursor-pointer transition-colors rounded-tr-lg", colors.header)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {code === "school_leader" ? (
                          <CardTitle className="text-base">{deptName}</CardTitle>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <div className={cn("w-2 h-2 rounded-full", colors.accent)} />
                            <Input
                              className="h-8 w-40 text-base font-semibold border-0 bg-transparent focus-visible:ring-1 px-1"
                              value={dept.department_name}
                              onChange={(e) => updateDepartment(code, "department_name", e.target.value)}
                              onClick={(ev) => ev.stopPropagation()}
                            />
                          </div>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {deptModules.length} 个模块
                        </Badge>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
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
                            className="w-24 h-8 text-xs"
                            placeholder="职务"
                            value={p.role}
                            onChange={(e) => updatePersonnel(code, i, "role", e.target.value)}
                          />
                          <Input
                            className="w-28 h-8 text-xs"
                            placeholder="电话"
                            value={p.phone}
                            onChange={(e) => updatePersonnel(code, i, "phone", e.target.value)}
                          />
                          <Input
                            className="w-20 h-8 text-xs"
                            placeholder="态度"
                            value={p.attitude}
                            onChange={(e) => updatePersonnel(code, i, "attitude", e.target.value)}
                          />
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removePersonnel(code, i)}>
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* 业务描述 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">日常核心工作</Label>
                        <Textarea
                          className="h-20 text-xs"
                          value={dept.daily_work}
                          onChange={(e) => updateDepartment(code, "daily_work", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">业务流程（怎么做的）</Label>
                        <Textarea
                          className="h-20 text-xs"
                          value={dept.workflow}
                          onChange={(e) => updateDepartment(code, "workflow", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">当前痛点</Label>
                        <Textarea
                          className="h-20 text-xs"
                          value={dept.pain_points}
                          onChange={(e) => updateDepartment(code, "pain_points", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">在用工具/系统</Label>
                        <Textarea
                          className="h-20 text-xs"
                          value={dept.tools}
                          onChange={(e) => updateDepartment(code, "tools", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs">信息化期望</Label>
                        <Textarea
                          className="h-20 text-xs"
                          value={dept.expectations}
                          onChange={(e) => updateDepartment(code, "expectations", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs">科室总结</Label>
                        <Textarea
                          className="h-20 text-xs"
                          value={dept.department_summary}
                          onChange={(e) => updateDepartment(code, "department_summary", e.target.value)}
                        />
                      </div>
                    </div>

                    {/* 模块匹配表 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-medium">模块匹配</Label>
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => addModule(code)}>
                          <Plus className="w-3 h-3 mr-0.5" />
                          添加模块
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {deptModules.map((mod, mi) => (
                          <div key={mi} className={cn("border rounded-lg p-3 relative", colors.bg, "border-l-2 border-l-slate-300 dark:border-l-slate-600")}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 h-7 w-7 z-10"
                              onClick={() => removeModule(code, mi)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                            {/* Row 1: 模块名称 + 状态 */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[11px]">模块名称</Label>
                                <ModuleSearchSelect
                                  value={mod.module_name}
                                  onChange={(name) => {
                                    updateModule(code, mi, "module_name", name);
                                    updateModule(code, mi, "module_code", name);
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

                            {/* Row 2 (已落地): 使用率 + 活跃用户 */}
                            {mod.status === "已落地" && (
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-[11px]">使用率(%)</Label>
                                  <Input
                                    className="h-8 text-xs"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={mod.usage_rate}
                                    onChange={(e) => updateModule(code, mi, "usage_rate", Number(e.target.value))}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px]">活跃用户</Label>
                                  <Input
                                    className="h-8 text-xs"
                                    type="number"
                                    min="0"
                                    value={mod.active_users}
                                    onChange={(e) => updateModule(code, mi, "active_users", Number(e.target.value))}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Row 2 (未购): 当前替代做法 */}
                            {mod.status === "未购" && (
                              <div className="space-y-1">
                                <Label className="text-[11px]">当前替代做法</Label>
                                <Textarea
                                  className="min-h-[70px] text-xs"
                                  value={mod.current_practice}
                                  onChange={(e) => updateModule(code, mi, "current_practice", e.target.value)}
                                />
                              </div>
                            )}

                            {/* Row 3: 效果/原因 + 问题 */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[11px]">
                                  {mod.status === "已落地" ? "落地效果" : mod.status === "未落地" ? "未落地原因" : "备注"}
                                </Label>
                                <Textarea
                                  className="min-h-[70px] text-xs"
                                  value={mod.status === "已落地" ? mod.effect : mod.status === "未落地" ? mod.issues : mod.current_practice}
                                  onChange={(e) => {
                                    if (mod.status === "已落地") updateModule(code, mi, "effect", e.target.value);
                                    else if (mod.status === "未落地") updateModule(code, mi, "issues", e.target.value);
                                    else updateModule(code, mi, "current_practice", e.target.value);
                                  }}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px]">问题</Label>
                                <Textarea
                                  className="min-h-[70px] text-xs"
                                  value={mod.issues}
                                  onChange={(e) => updateModule(code, mi, "issues", e.target.value)}
                                />
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

                            {/* 素材上传 */}
                            {mod.status === "已落地" && (
                              <div className="mt-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-muted-foreground">素材：</span>
                                  {(mod.materials || []).map((m, matIdx) => (
                                    <Badge key={matIdx} variant="secondary" className="text-[10px] gap-1">
                                      {m.name.length > 15 ? m.name.slice(0, 15) + "..." : m.name}
                                      <X
                                        className="w-3 h-3 cursor-pointer"
                                        onClick={() => removeMaterial(code, mi, matIdx)}
                                      />
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
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-card sticky bottom-0 z-10">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          <Save className="w-4 h-4 mr-1" />
          {loading ? "保存中..." : (isEdit ? "保存" : "创建")}
        </Button>
      </div>
    </div>
  );
}
