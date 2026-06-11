"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Save, ChevronDown, ChevronUp, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  SCHOOL_TYPE_OPTIONS,
  INFO_LEVEL_OPTIONS,
  SCHOOL_TYPE_DEPARTMENTS,
  ALL_DEPARTMENTS,
  MODULE_STATUS_OPTIONS,
  DEFAULT_MODULES_BY_DEPT,
} from "@/lib/case-center-constants";
import { toast } from "sonner";

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

export function CustomerForm({ customerId, onSaved, onCancel, currentUser }: CustomerFormProps) {
  const isEdit = !!customerId;

  // 基础信息
  const [schoolName, setSchoolName] = useState("");
  const [schoolType, setSchoolType] = useState("中职");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [infoLevel, setInfoLevel] = useState("初级");
  const [description, setDescription] = useState("");

  // 科室数据
  const [departments, setDepartments] = useState<Record<string, DepartmentData>>({});
  // 模块数据: key = department_code
  const [modules, setModules] = useState<Record<string, ModuleFormData[]>>({});
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const applicableDepts = SCHOOL_TYPE_DEPARTMENTS[schoolType] || [];

  // 初始化科室
  const initDepartments = useCallback((type: string) => {
    const deptNames = SCHOOL_TYPE_DEPARTMENTS[type] || [];
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
      initDepartments(schoolType);
      return;
    }

    setFetching(true);
    fetch(`/api/case-center/customers/${customerId}`)
      .then((res) => res.json())
      .then(({ data }) => {
        if (!data) return;

        const c = data.customer;
        setSchoolName(c.school_name || "");
        setSchoolType(c.school_type || "中职");
        setProvince(c.province || "");
        setCity(c.city || "");
        setInfoLevel(c.info_level || "初级");
        setDescription(c.description || "");

        const deptNames = SCHOOL_TYPE_DEPARTMENTS[c.school_type] || [];
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

  // 切换学校类型
  const handleSchoolTypeChange = (newType: string) => {
    if (isEdit && schoolType !== newType) {
      if (!confirm("更改学校类型将重新生成科室结构。已有数据中适配新类型的科室将保留，不适用的科室数据将丢失。确认继续？")) {
        return;
      }
    }
    setSchoolType(newType);
  };

  useEffect(() => {
    if (!customerId || schoolType) {
      initDepartments(schoolType);
    }
  }, [schoolType]);

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
        await fetch(`/api/case-center/customers/${cid}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            school_name: schoolName,
            school_type: schoolType,
            province,
            city,
            info_level: infoLevel,
            description,
          }),
        });

        // 更新科室业务字段
        const deptPayload = Object.values(departments).filter((d) => d.id).map((d) => ({
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
      } else {
        // 新建
        const res = await fetch("/api/case-center/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            school_name: schoolName,
            school_type: schoolType,
            province,
            city,
            info_level: infoLevel,
            description,
            created_by: currentUser.name,
          }),
        });

        if (!res.ok) throw new Error("创建失败");
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

        // 更新科室业务字段
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
    <div className="flex flex-col h-full">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
          <h2 className="font-semibold text-lg">{isEdit ? "编辑画像" : "新建画像"}</h2>
        </div>
        <div className="flex items-center gap-2">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 基础信息 */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">基础信息</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">学校名称 *</Label>
              <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="如：永康五金技师学院" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">学校类型 *</Label>
              <Select value={schoolType} onValueChange={handleSchoolTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHOOL_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.code} value={t.code}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">信息化等级</Label>
              <Select value={infoLevel} onValueChange={setInfoLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INFO_LEVEL_OPTIONS.map((l) => (
                    <SelectItem key={l.code} value={l.code}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">省份</Label>
              <Input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="如：浙江" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">城市</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="如：金华" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">描述</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="学校简要描述..." />
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

          return (
            <Collapsible
              key={code}
              open={isExpanded}
              onOpenChange={(open) => setExpandedDepts((prev) => ({ ...prev, [code]: open }))}
            >
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{deptName}</CardTitle>
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
                          <div key={mi} className="border rounded-lg p-3 bg-background">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-[11px]">模块名称</Label>
                                  <Input
                                    className="h-8 text-xs"
                                    value={mod.module_name}
                                    onChange={(e) => updateModule(code, mi, "module_name", e.target.value)}
                                    placeholder="如：课表中心"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[11px]">状态</Label>
                                  <Select
                                    value={mod.status}
                                    onValueChange={(v) => updateModule(code, mi, "status", v)}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {MODULE_STATUS_OPTIONS.map((s) => (
                                        <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {mod.status === "已落地" && (
                                  <>
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
                                  </>
                                )}
                                {mod.status === "未购" && (
                                  <div className="space-y-1">
                                    <Label className="text-[11px]">当前替代做法</Label>
                                    <Input
                                      className="h-8 text-xs"
                                      value={mod.current_practice}
                                      onChange={(e) => updateModule(code, mi, "current_practice", e.target.value)}
                                    />
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => removeModule(code, mi)}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </div>

                            {/* 效果/问题 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                              <div className="space-y-1">
                                <Label className="text-[11px]">
                                  {mod.status === "已落地" ? "落地效果" : mod.status === "未落地" ? "未落地原因" : "备注"}
                                </Label>
                                <Input
                                  className="h-8 text-xs"
                                  value={mod.status === "未购" ? mod.current_practice : (mod.status === "已落地" ? mod.effect : mod.issues)}
                                  onChange={(e) => {
                                    if (mod.status === "已落地") updateModule(code, mi, "effect", e.target.value);
                                    else if (mod.status === "未落地") updateModule(code, mi, "issues", e.target.value);
                                    else updateModule(code, mi, "current_practice", e.target.value);
                                  }}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px]">问题</Label>
                                <Input
                                  className="h-8 text-xs"
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
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-card">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          <Save className="w-4 h-4 mr-1" />
          {loading ? "保存中..." : (isEdit ? "保存" : "创建")}
        </Button>
      </div>
    </div>
  );
}
