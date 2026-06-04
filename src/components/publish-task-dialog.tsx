"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Upload, FileSpreadsheet, ChevronRight, ChevronLeft, Check,
  Calendar, Users, Building2, Clock, AlertCircle, Loader2,
  Table, Edit3, ListTodo, Trash2, Plus, ChevronDown, X, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PublishTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser?: { id: string; name: string } | null;
  onSuccess?: () => void;
}

interface ParsedColumn {
  name: string;
  type: string;
  options?: string[];
  required: boolean;
  description: string;
  sample_data: string[];
  linked_source_field?: string;
  linked_configs?: Array<{ project_id: string; module_code: string; table_code: string; column_name: string; record_ids: string[] }>;
}

interface StandardTable {
  id: string;
  table_code: string;
  table_name: string;
}

interface ProjectItem {
  id: string;
  project_name: string;
  project_code: string;
  manager_id?: string;
  manager_name?: string;
}

interface UserItem {
  id: string;
  name: string;
  department?: string;
}

const TYPE_LABELS: Record<string, string> = {
  text: "文本",
  number: "数字",
  date: "日期",
  select: "单选",
  textarea: "多行文本",
  checkbox: "多选",
  linked_select: "关联选择",
  linked_text: "关联文本",
  image: "图片",
  office: "Office文件",
  pdf: "PDF文件",
  md: "Markdown文件",
  user: "用户",
};

export function PublishTaskDialog({
  open,
  onOpenChange,
  currentUser,
  onSuccess,
}: PublishTaskDialogProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // 第1步：基本信息
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<"periodic" | "regular">("regular");
  const [taskMode, setTaskMode] = useState<"form" | "project" | "approval">("form");
  const [description, setDescription] = useState("");
  const [workflowNodes, setWorkflowNodes] = useState<Array<{ order: number; name: string; assignee_id: string; assignee_name: string; due_days: number; remind_days: number }>>([{ order: 1, name: "", assignee_id: "", assignee_name: "", due_days: 3, remind_days: 1 }]);

  // 第2步：表单来源
  const [formSource, setFormSource] = useState<"standards" | "excel_import">("standards");
  const [standardTables, setStandardTables] = useState<StandardTable[]>([]);
  const [selectedTableCode, setSelectedTableCode] = useState("");
  const [selectedTableName, setSelectedTableName] = useState("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedColumns, setParsedColumns] = useState<ParsedColumn[]>([]);
  const [excelPreview, setExcelPreview] = useState<Record<string, string>[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importData, setImportData] = useState(false);

  // 第3步：指派
  const [assignMode, setAssignMode] = useState<"project" | "person">("project");
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [assigneeProjectId, setAssigneeProjectId] = useState("");

  // 第4步：截止与提醒
  const [periodicType, setPeriodicType] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [dayOfMonth, setDayOfMonth] = useState(28);
  const [dayOfWeek, setDayOfWeek] = useState(5);
  const [specificDate, setSpecificDate] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderBeforeDays, setReminderBeforeDays] = useState(3);
  const [allowLateComplete, setAllowLateComplete] = useState(true);
  const [showEditor, setShowEditor] = useState(true);
  const [loadingLinkedRecords, setLoadingLinkedRecords] = useState<Record<string, boolean>>({});
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<Record<string, boolean>>({});
  const [treeRecords, setTreeRecords] = useState<Record<string, Array<{ id: string; value: string }>>>({});
  const [projectTableDefs, setProjectTableDefs] = useState<Array<{ table_code: string; table_name: string; module_codes: string[]; columns_config: ParsedColumn[] }>>([]);
  const [moduleTypes, setModuleTypes] = useState<Array<{ code: string; name: string }>>([]);
  const [stageModuleMap, setStageModuleMap] = useState<Array<{ project_type_code: string; project_stage_code: string; module_code: string; is_enabled: boolean }>>([]);
  const [dictData, setDictData] = useState<Record<string, Array<{ code: string; name: string }>>>({});

  // 加载基础数据
  useEffect(() => {
    if (open) {
      fetch("/api/standards")
        .then((r) => r.json())
        .then((d) => {
          if (d.data) setStandardTables(d.data.filter((t: Record<string, unknown>) => t.is_enabled !== false));
        })
        .catch(() => {});

      fetch("/api/projects")
        .then((r) => r.json())
        .then((d) => {
          if (d.data) {
            const projs = (d.data as Record<string, unknown>[]).map((p) => ({
              id: String(p.id),
              project_name: String(p.project_name),
              project_code: String(p.project_code),
              manager_id: p.role_project_manager ? String(p.role_project_manager) : undefined,
              manager_name: p.manager_name ? String(p.manager_name) : undefined,
            }));
            setProjects(projs);
          }
        })
        .catch(() => {});

      fetch("/api/users")
        .then((r) => r.json())
        .then((d) => {
          if (d.data) {
            setUsers(
              (d.data as Record<string, unknown>[]).map((u) => ({
                id: String(u.id),
                name: String(u.name),
                department: u.department ? String(u.department) : undefined,
              }))
            );
          }
        })
        .catch(() => {});
      fetch("/api/dicts/batch?types=product_module_types,product_categories,product_vendors,product_scopes,member_role_types,departments").then((r) => r.json()).then((d) => { if (d.data) setDictData(d.data); }).catch(() => {});
      fetch("/api/module-types").then((r) => r.json()).then((d) => { if (d.data) setModuleTypes(d.data); }).catch(() => {});
      fetch("/api/module-config").then((r) => r.json()).then((d) => { if (d.data) setStageModuleMap(d.data); }).catch(() => {});
      fetch("/api/standards").then((r) => r.json()).then((d) => { if (d.data) setProjectTableDefs((d.data as any[]).map((t: any) => ({ table_code: String(t.table_code||""), table_name: String(t.table_name||""), module_codes: (t.module_type as string[])||[], columns_config: Array.isArray(t.columns_config)?t.columns_config:[] }))); }).catch(() => {});
    }
  }, [open]);

  // 根据选中人员筛选其作为项目经理的项目
  const managerProjects = useMemo(() => {
    if (selectedAssigneeIds.length === 0) return [];
    return projects.filter((p) => p.manager_id && selectedAssigneeIds.includes(p.manager_id));
  }, [projects, selectedAssigneeIds]);

  // Excel 上传解析
  const handleExcelUpload = useCallback(async (file: File) => {
    setExcelFile(file);
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/todo-tasks/parse-excel", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setParsedColumns(data.data.columns || []);
      setExcelPreview(data.data.preview || []);
    } catch {
      alert("Excel解析失败");
    } finally {
      setParsing(false);
    }
  }, []);

  const addColumn = () => { setParsedColumns((p) => [...p, { name: "", type: "text", required: false, description: "", options: [], sample_data: [] }]); setShowEditor(true); };
  const removeColumn = (i) => { setParsedColumns((p) => p.filter((_, j) => j !== i)); };
  const updateColumn = (i, f, v) => { setParsedColumns((p) => p.map((c, j) => j === i ? { ...c, [f]: v } : c)); };
  const addLinkedTarget = (ci) => { setParsedColumns((p) => p.map((c, i) => i === ci ? { ...c, linked_configs: [...(c.linked_configs || []), { project_id: "", module_code: "", table_code: "", column_name: "", record_ids: [] }] } : c)); };
  const removeLinkedTarget = (ci, ti) => { setParsedColumns((p) => p.map((c, i) => { if (i !== ci) return c; const cf = [...(c.linked_configs || [])]; cf.splice(ti, 1); return { ...c, linked_configs: cf }; })); };
  const updateLinkedTarget = (ci, ti, f, v) => { setParsedColumns((p) => p.map((c, i) => { if (i !== ci) return c; return { ...c, linked_configs: (c.linked_configs || []).map((t, j) => j === ti ? { ...t, [f]: v } : t) }; })); };
  const toggleTreeNode = (k) => { setExpandedTreeNodes((p) => ({ ...p, [k]: !p[k] })); };
  const loadTreeRecordsForSource = async (ci, si, pid, tc, cn) => { const k = ci + "_" + si; if (treeRecords[k]) { toggleTreeNode(k); return; } setLoadingLinkedRecords((p) => ({ ...p, [k]: true })); try { const proj = projects.find((p) => p.id === pid); if (!proj) return; const r = await fetch("/api/project-data?projectSchema=yuansu_" + proj.project_code + "&tableCode=" + tc); const j = await r.json(); const rows = (j.data || []); const ck = cn.toLowerCase().replace(/\s+/g, "_"); const recs = rows.map((r) => ({ id: String(r.id||""), value: String(r[ck]||r[cn]||"") })).filter((x) => x.id&&x.value); setTreeRecords((p) => ({ ...p, [k]: recs })); toggleTreeNode(k); } catch(e){} finally { setLoadingLinkedRecords((p) => ({ ...p, [k]: false })); } };
  const addWorkflowNode = () => { setWorkflowNodes((p) => [...p, { order: p.length + 1, name: "", assignee_id: "", assignee_name: "", due_days: 3, remind_days: 1 }]); };
  const removeWorkflowNode = (o) => { setWorkflowNodes((p) => p.filter((n) => n.order !== o).map((n, i) => ({ ...n, order: i + 1 }))); };
  const updateWorkflowNode = (o, f, v) => { setWorkflowNodes((p) => p.map((n) => n.order === o ? { ...n, [f]: v } : n)); };
  const addColumnOption = (ci, opt) => { setParsedColumns((p) => p.map((c, i) => { if (i !== ci) return c; const existing = c.options || []; if (existing.includes(opt)) return c; return { ...c, options: [...existing, opt] }; })); };
  const removeColumnOption = (ci, oi) => { setParsedColumns((p) => p.map((c, i) => { if (i !== ci) return c; return { ...c, options: (c.options || []).filter((_, j) => j !== oi) }; })); };
  const importOptionsFromDict = (ci, dt) => { const items = dictData[dt]; if (!items || items.length === 0) return; setParsedColumns((p) => p.map((c, i) => { if (i !== ci) return c; const existing = c.options || []; const newOpts = items.map((it) => it.name || it.code).filter((n) => !existing.includes(n)); return { ...c, options: [...existing, ...newOpts] }; })); };

  // 提交
  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("请输入任务标题");
      return;
    }

    setSaving(true);
    try {
      let formTableCode = selectedTableCode;
      let formTableName = selectedTableName;

      // 如果是关联规范表且有项目，同步到项目 schema
      if (formSource === "standards" && selectedTableCode && selectedProjectIds.length > 0) {
        for (const pid of selectedProjectIds) {
          await fetch("/api/standards/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tableCode: selectedTableCode,
              projectIds: [pid],
              syncMode: "structure_data",
            }),
          });
        }
      }

      // 如果是Excel导入，先创建规范表定义
      if (formSource === "excel_import" && parsedColumns.length > 0) {
        const columnsConfig = parsedColumns.map((col) => ({
          name: col.name,
          type: col.type,
          required: col.required,
          description: col.description,
          options: col.options,
        }));

        const tableCode = `task_${Date.now()}`;
        const createRes = await fetch("/api/standards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table_name: title + "表",
            table_code: tableCode,
            columns_config: columnsConfig,
            is_enabled: true,
          }),
        });

        const createData = await createRes.json();
        if (createData.error) {
          alert("创建规范表失败：" + createData.error);
          setSaving(false);
          return;
        }
        formTableCode = tableCode;
        formTableName = title + "表";

        // 同步到选中项目的 schema
        if (selectedProjectIds.length > 0) {
          for (const pid of selectedProjectIds) {
            await fetch("/api/standards/sync", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tableCode,
                projectIds: [pid],
                syncMode: "structure_data",
              }),
            });
          }
        }
      }

      // 构建周期配置
      const periodicConfig: Record<string, unknown> = {};
      if (taskType === "periodic") {
        if (periodicType === "monthly") periodicConfig.day_of_month = dayOfMonth;
        if (periodicType === "weekly") periodicConfig.day_of_week = dayOfWeek;
      }

      const deadlineConfig: Record<string, unknown> = {};
      if (taskType === "regular" && specificDate) {
        deadlineConfig.specific_date = specificDate;
      }

      const body = {
        title: title.trim(),
        description,
        task_type: taskType,
        task_mode: taskMode,
        workflow_nodes: taskMode === "approval" ? workflowNodes.filter((n) => n.name.trim()) : null,
        form_fields_config: taskMode === "approval" ? parsedColumns : null,
        assignee_ids: assignMode === "person" ? selectedAssigneeIds : [],
        project_ids: assignMode === "project"
          ? selectedProjectIds
          : (assigneeProjectId && assigneeProjectId !== "none" ? [assigneeProjectId] : []),
        form_source: formSource,
        form_table_code: formTableCode || null,
        form_table_name: formTableName || null,
        periodic_type: taskType === "periodic" ? periodicType : null,
        periodic_config: taskType === "periodic" ? periodicConfig : null,
        deadline_config: Object.keys(deadlineConfig).length > 0 ? deadlineConfig : null,
        reminder_enabled: reminderEnabled,
        reminder_before_days: reminderBeforeDays,
        allow_late_complete: allowLateComplete,
        created_by: currentUser?.id || null,
        created_by_name: currentUser?.name || null,
      };

      const res = await fetch("/api/todo-tasks/defs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (result.error) {
        alert("创建任务失败：" + result.error);
        return;
      }

      onSuccess?.();
      handleReset();
      onOpenChange(false);
    } catch {
      alert("创建任务失败");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setTitle("");
    setTaskType("regular");
    setDescription("");
    setFormSource("standards");
    setSelectedTableCode("");
    setSelectedTableName("");
    setExcelFile(null);
    setParsedColumns([]);
    setExcelPreview([]);
    setImportData(false);
    setAssignMode("project");
    setSelectedProjectIds([]);
    setSelectedAssigneeIds([]);
    setAssigneeProjectId("");
    setPeriodicType("monthly");
    setDayOfMonth(28);
    setDayOfWeek(5);
    setSpecificDate("");
    setReminderEnabled(true);
    setReminderBeforeDays(3);
    setAllowLateComplete(true);
  };

  const canNext = () => {
    if (step === 1) return title.trim().length > 0;
    if (step === 2) return true;
    if (step === 3) return parsedColumns.length > 0;
    if (step === 4) {
      if (assignMode === "project") return selectedProjectIds.length > 0;
      return selectedAssigneeIds.length > 0;
    }
    if (step === 5) {
      if (taskType === "regular") return !!specificDate;
      return true;
    }
    return true;
  };

  const steps = [
    { num: 1, label: "基本信息", icon: Edit3 },
    { num: 2, label: "任务类型", icon: ListTodo },
    { num: 3, label: "制作任务表单", icon: Table },
    { num: 4, label: "指派实施人员", icon: Users },
    { num: 5, label: "截止提醒", icon: Clock },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[90%] sm:max-h-[90vh] sm:h-[90vh] overflow-hidden flex flex-col items-center">
        <DialogHeader>
          <DialogTitle>发布任务</DialogTitle>
          <DialogDescription>创建新任务并指派给指定人员或项目</DialogDescription>
        </DialogHeader>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <button
                onClick={() => { if (s.num < step) setStep(s.num); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors",
                  step === s.num
                    ? "bg-indigo-100 text-indigo-700 font-medium"
                    : step > s.num
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-50 text-gray-400"
                )}
              >
                {step > s.num ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <s.icon className="w-3.5 h-3.5" />
                )}
                {s.label}
              </button>
              {i < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-300" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 第1步：基本信息 */}
        {step === 1 && (
          <div className="space-y-4 w-full max-w-xl mx-auto">
            <div>
              <Label className="text-base">任务周期</Label>
              <RadioGroup value={taskType} onValueChange={(v: string) => setTaskType(v as "periodic" | "regular")}
                className="flex gap-4 mt-2">
                <label className={cn("flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  taskType === "regular" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300")}>
                  <RadioGroupItem value="regular" className="sr-only" />
                  <div className="text-lg mb-1">📋</div>
                  <div className="font-semibold text-sm">一次性任务</div>
                  <div className="text-xs text-gray-500 mt-1">发起后执行一次，完成后结束</div>
                </label>
                <label className={cn("flex-1 p-4 rounded-xl border-2 cursor-pointer transition-all",
                  taskType === "periodic" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300")}>
                  <RadioGroupItem value="periodic" className="sr-only" />
                  <div className="text-lg mb-1">🔄</div>
                  <div className="font-semibold text-sm">周期性任务</div>
                  <div className="text-xs text-gray-500 mt-1">按周期自动重复，每次生成新实例</div>
                </label>
              </RadioGroup>
              {taskType === "periodic" && (
                <div className="flex gap-3 mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1"><Label className="text-xs">频率</Label>
                    <Select value={periodicType} onValueChange={setPeriodicType}>
                      <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="daily">每天</SelectItem><SelectItem value="weekly">每周</SelectItem><SelectItem value="monthly">每月</SelectItem></SelectContent></Select></div>
                  <div className="w-24"><Label className="text-xs">截止(天)</Label><Input type="number" value={7} onChange={() => {}} className="h-8 mt-1" /></div>
                  <div className="w-24"><Label className="text-xs">提醒(天)</Label><Input type="number" value={1} onChange={() => {}} className="h-8 mt-1" /></div>
                </div>
              )}
            </div>
            <div><Label>任务标题 <span className="text-red-500">*</span></Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入任务标题" className="mt-1" /></div>
            <div><Label>任务描述</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="描述任务内容和要求..." className="mt-1" rows={3} /></div>
          </div>
        )}

        {/* 第2步：任务类型（卡片式） */}
        {step === 2 && (
          <div className="space-y-4 w-full max-w-3xl mx-auto">
            <p className="text-sm text-gray-500 text-center">选择适合的任务类型</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { mode: "form" as const, icon: "📝", title: "普通表单任务", desc: "自定义表单字段\n指定人员填写提交", tags: ["日报/周报","调查/收集"], color: "border-blue-500 bg-blue-50" },
                { mode: "project" as const, icon: "📋", title: "项目任务", desc: "关联多个项目\n拉取项目记录作为数据行", tags: ["巡检/验收","检查/评估"], color: "border-green-500 bg-green-50" },
                { mode: "approval" as const, icon: "🔀", title: "流程型任务", desc: "表单+项目数据+写回\n多级审批流转", tags: ["需求评审","采购/变更审批"], color: "border-purple-500 bg-purple-50" },
              ].map(card => (
                <div key={card.mode} onClick={() => setTaskMode(card.mode)}
                  className={cn("p-5 rounded-xl border-2 cursor-pointer transition-all text-center",
                    taskMode === card.mode ? `${card.color} shadow-sm border-2` : "border-gray-200 hover:border-gray-300 hover:bg-gray-50")}>
                  <div className="text-3xl mb-3">{card.icon}</div>
                  <div className="font-semibold text-sm">{card.title}</div>
                  <div className="text-xs text-gray-500 mt-2 whitespace-pre-line">{card.desc}</div>
                  <div className="flex flex-wrap justify-center gap-1 mt-3">
                    {card.tags.map(t => <span key={t} className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-500">{t}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 第3步：制作任务表单 */}
        {step === 3 && taskMode === "form" && (
          <div className="space-y-4 w-full max-w-xl mx-auto">
            <div className="p-3 border rounded-lg">
              <p className="text-xs text-gray-400 mb-3">制作任务表单：上传Excel自动解析字段，或手动添加。指派项目后自动建表。</p>
              <div className="space-y-3">
                    <div className="mt-3 space-y-3">
                      {!excelFile ? (
                        <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-500">点击上传 Excel 文件 (.xlsx / .xls)</span>
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const f = e.target.files?.[0];
                              if (f) handleExcelUpload(f);
                            }}
                          />
                        </label>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                            <FileSpreadsheet className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-700 flex-1 truncate">{excelFile.name}</span>
                            <button
                              className="text-xs text-gray-400 hover:text-red-500"
                              onClick={() => { setExcelFile(null); setParsedColumns([]); setExcelPreview([]); }}
                            >
                              重新上传
                            </button>
                          </div>

                          {parsing && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              正在解析...
                            </div>
                          )}

                          {parsedColumns.length > 0 && !parsing && (
                            <div className="space-y-3">
                              <div className="text-sm font-medium text-gray-700">
                                解析结果（{parsedColumns.length} 个字段）
                              </div>
                              <div className="max-h-60 overflow-y-auto border rounded-lg">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                      <th className="text-left p-2">字段名</th>
                                      <th className="text-left p-2">类型</th>
                                      <th className="text-left p-2">示例数据</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {parsedColumns.map((col, idx) => (
                                      <tr key={idx} className="border-t">
                                        <td className="p-2">{col.name}</td>
                                        <td className="p-2">
                                          <Select
                                            value={col.type}
                                            onValueChange={(v: string) => {
                                              const newCols = [...parsedColumns];
                                              newCols[idx] = { ...newCols[idx], type: v };
                                              setParsedColumns(newCols);
                                            }}
                                          >
                                            <SelectTrigger className="h-7 text-xs w-28">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {Object.entries(TYPE_LABELS).map(([k, l]) => (
                                                <SelectItem key={k} value={k}>{l}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </td>
                                        <td className="p-2 text-xs text-gray-400 truncate max-w-[150px]">
                                          {col.sample_data.join(", ")}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id="importData"
                                  checked={importData}
                                  onCheckedChange={(v: boolean | "indeterminate") => setImportData(v === true)}
                                />
                                <Label htmlFor="importData" className="text-sm">
                                  同时导入Excel数据到表中
                                </Label>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
              </div>
            </div>
          </div>
        )}

        {/* 第3步：审批流程设计 */}
        {step === 3 && taskMode === "approval" && (
          <div className="space-y-4 w-full max-w-[75%] mx-auto">
            <div className="p-3 border rounded-lg bg-amber-50/50"><p className="text-sm font-medium text-amber-800 mb-2">审批表单设计</p><p className="text-xs text-amber-600">流程审批支持多节点流转，配置节点后发布即可。</p></div>
            <div className="border-t pt-4"><p className="text-sm font-medium text-amber-800 mb-3">流程节点配置</p><div className="space-y-3">
                {workflowNodes.map((node) => (
                  <div key={node.order} className="bg-white border rounded-lg p-3 space-y-2"><div className="flex items-center gap-2"><span className="text-xs font-bold text-amber-700 bg-amber-100 rounded-full w-5 h-5 flex items-center justify-center">{node.order}</span><Input value={node.name} onChange={(e) => updateWorkflowNode(node.order, "name", e.target.value)} placeholder={`节点${node.order}名称`} className="h-7 text-xs flex-1" />{workflowNodes.length > 1 && <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeWorkflowNode(node.order)}><Trash2 className="w-3.5 h-3.5 text-red-400" /></Button>}</div>
                    <div className="flex items-center gap-3"><div className="flex-1"><Select value={node.assignee_id} onValueChange={(v) => { const u = users.find((ur) => ur.id === v); updateWorkflowNode(node.order, "assignee_id", v); updateWorkflowNode(node.order, "assignee_name", u?.name || ""); }}><SelectTrigger className="h-7 text-xs"><SelectValue placeholder="选择处理人" /></SelectTrigger><SelectContent>{users.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent></Select></div><div className="w-20"><Input type="number" min={1} max={30} value={node.due_days} onChange={(e) => updateWorkflowNode(node.order, "due_days", Number(e.target.value))} className="h-7 text-xs" placeholder="天" /></div><div className="w-20"><Input type="number" min={0} max={14} value={node.remind_days} onChange={(e) => updateWorkflowNode(node.order, "remind_days", Number(e.target.value))} className="h-7 text-xs" placeholder="提醒" /></div></div></div>
                ))}
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={addWorkflowNode}><Plus className="w-3.5 h-3.5 mr-1" />添加节点</Button>
              </div></div>
          </div>
        )}

        {/* 第4步：指派 */}
        {step === 4 && (
          <div className="space-y-4 w-full max-w-xl mx-auto">
            <p className="text-xs text-indigo-500 bg-indigo-50 p-2 rounded">选择项目后，任务表单将自动在对应项目里建表；仅选择人员则不在项目里建表</p>
            <RadioGroup
              value={assignMode}
              onValueChange={(v: string) => setAssignMode(v as "project" | "person")}
              className="flex gap-6"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="project" id="assign_project" />
                <Label htmlFor="assign_project" className="cursor-pointer">按项目指派</Label>
                <span className="text-xs text-gray-400">每个项目生成一个实例</span>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="person" id="assign_person" />
                <Label htmlFor="assign_person" className="cursor-pointer">指定人员</Label>
              </div>
            </RadioGroup>

            {assignMode === "project" && (
              <div className="space-y-2">
                <Label>选择项目</Label>
                <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {projects.length === 0 ? (
                    <p className="text-sm text-gray-400 p-2">暂无项目</p>
                  ) : (
                    projects.map((p) => (
                      <label
                        key={p.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer",
                          selectedProjectIds.includes(p.id) && "bg-indigo-50"
                        )}
                      >
                        <Checkbox
                          checked={selectedProjectIds.includes(p.id)}
                          onCheckedChange={(v: boolean | "indeterminate") => {
                            if (v) {
                              setSelectedProjectIds([...selectedProjectIds, p.id]);
                            } else {
                              setSelectedProjectIds(selectedProjectIds.filter((id) => id !== p.id));
                            }
                          }}
                        />
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-sm flex-1">{p.project_name}</span>
                        <span className="text-xs text-gray-400">{p.project_code}</span>
                      </label>
                    ))
                  )}
                </div>
                {selectedProjectIds.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {selectedProjectIds.map((pid) => {
                      const p = projects.find((pr) => pr.id === pid);
                      return p ? (
                        <Badge key={pid} variant="secondary" className="text-xs">
                          {p.project_name}
                          <button
                            className="ml-1 hover:text-red-500"
                            onClick={() => setSelectedProjectIds(selectedProjectIds.filter((id) => id !== pid))}
                          >
                            ×
                          </button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}

            {assignMode === "person" && (
              <div className="space-y-3">
                <div>
                  <Label>选择人员</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1 mt-1">
                    {users.map((u) => (
                      <label
                        key={u.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer",
                          selectedAssigneeIds.includes(u.id) && "bg-indigo-50"
                        )}
                      >
                        <Checkbox
                          checked={selectedAssigneeIds.includes(u.id)}
                          onCheckedChange={(v: boolean | "indeterminate") => {
                            if (v) {
                              setSelectedAssigneeIds([...selectedAssigneeIds, u.id]);
                            } else {
                              setSelectedAssigneeIds(selectedAssigneeIds.filter((id) => id !== u.id));
                              // 如果取消选中的人员是当前关联项目的经理，清除项目选择
                              if (assigneeProjectId) {
                                const proj = projects.find((p) => p.id === assigneeProjectId);
                                if (proj?.manager_id === u.id) {
                                  setAssigneeProjectId("");
                                }
                              }
                            }
                          }}
                        />
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{u.name}</span>
                        {u.department && <span className="text-xs text-gray-400">{u.department}</span>}
                      </label>
                    ))}
                  </div>
                </div>
                {selectedAssigneeIds.length > 0 && managerProjects.length > 0 && (
                  <div>
                    <Label>关联项目（可选）</Label>
                    <p className="text-xs text-gray-400 mb-1">以下为选中人员作为项目经理的项目</p>
                    <Select value={assigneeProjectId} onValueChange={setAssigneeProjectId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="选择关联项目" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不关联项目</SelectItem>
                        {managerProjects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assigneeProjectId && assigneeProjectId !== "none" ? (
                      <p className="text-xs text-indigo-500 bg-indigo-50 p-2 rounded mt-2">已选择项目，任务表单将自动在对应项目里建表</p>
                    ) : (
                      <p className="text-xs text-gray-400 bg-gray-50 p-2 rounded mt-2">未选择项目，任务表单将不在项目里建表</p>
                    )}
                  </div>
                )}
                {selectedAssigneeIds.length > 0 && managerProjects.length === 0 && (
                  <p className="text-xs text-gray-400 bg-gray-50 p-2 rounded">选中人员没有作为项目经理的项目，任务表单将不在项目里建表</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 第5步：截止与提醒 */}
        {step === 5 && (
          <div className="space-y-4 w-full max-w-xl mx-auto">
            {taskType === "periodic" && (
              <>
                <div>
                  <Label>周期类型</Label>
                  <Select value={periodicType} onValueChange={(v: string) => setPeriodicType(v as typeof periodicType)}>
                    <SelectTrigger className="mt-1 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">每天</SelectItem>
                      <SelectItem value="weekly">每周</SelectItem>
                      <SelectItem value="monthly">每月</SelectItem>
                      <SelectItem value="yearly">每年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(periodicType === "monthly" || periodicType === "yearly") && (
                  <div>
                    <Label>每期截止日</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">
                        {periodicType === "monthly" ? "每月" : "每年"}第
                      </span>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={dayOfMonth}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDayOfMonth(Number(e.target.value))}
                        className="w-20"
                      />
                      <span className="text-sm text-gray-500">日</span>
                    </div>
                  </div>
                )}
                {periodicType === "weekly" && (
                  <div>
                    <Label>每周截止日</Label>
                    <Select value={String(dayOfWeek)} onValueChange={(v: string) => setDayOfWeek(Number(v))}>
                      <SelectTrigger className="mt-1 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">周一</SelectItem>
                        <SelectItem value="2">周二</SelectItem>
                        <SelectItem value="3">周三</SelectItem>
                        <SelectItem value="4">周四</SelectItem>
                        <SelectItem value="5">周五</SelectItem>
                        <SelectItem value="6">周六</SelectItem>
                        <SelectItem value="7">周日</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {taskType === "regular" && (
              <div>
                <Label>截止日期</Label>
                <Input
                  type="date"
                  value={specificDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpecificDate(e.target.value)}
                  className="mt-1 w-48"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="reminder"
                checked={reminderEnabled}
                onCheckedChange={(v: boolean | "indeterminate") => setReminderEnabled(v === true)}
              />
              <Label htmlFor="reminder">提前提醒</Label>
              {reminderEnabled && (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={reminderBeforeDays}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReminderBeforeDays(Number(e.target.value))}
                    className="w-16"
                  />
                  <span className="text-sm text-gray-500">天</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="allowLate"
                checked={allowLateComplete}
                onCheckedChange={(v: boolean | "indeterminate") => setAllowLateComplete(v === true)}
              />
              <Label htmlFor="allowLate">允许超时补交</Label>
            </div>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex justify-between mt-6 pt-4 border-t w-full max-w-xl mx-auto">
          <Button
            variant="outline"
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else { handleReset(); onOpenChange(false); }
            }}
          >
            {step > 1 ? <ChevronLeft className="w-4 h-4 mr-1" /> : null}
            {step > 1 ? "上一步" : "取消"}
          </Button>
          <div className="flex gap-2">
            {step < 5 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canNext()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                下一步
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={saving || !canNext()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    确认发布
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
