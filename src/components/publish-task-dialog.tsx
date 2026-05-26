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
  Table, Edit3,
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
  const [description, setDescription] = useState("");

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
    if (step === 2) {
      if (formSource === "standards") return !!selectedTableCode;
      if (formSource === "excel_import") return parsedColumns.length > 0;
      return true;
    }
    if (step === 3) {
      if (assignMode === "project") return selectedProjectIds.length > 0;
      return selectedAssigneeIds.length > 0;
    }
    return true;
  };

  const steps = [
    { num: 1, label: "基本信息", icon: Edit3 },
    { num: 2, label: "选择任务表单", icon: Table },
    { num: 3, label: "指派实施人员", icon: Users },
    { num: 4, label: "截止提醒", icon: Clock },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleReset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col items-center">
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
              <Label>任务标题 <span className="text-red-500">*</span></Label>
              <Input
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="输入任务标题，如：智慧校园调研表"
                className="mt-1"
              />
            </div>
            <div>
              <Label>任务类型</Label>
              <RadioGroup
                value={taskType}
                onValueChange={(v: string) => setTaskType(v as "periodic" | "regular")}
                className="flex gap-6 mt-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="regular" id="regular" />
                  <Label htmlFor="regular" className="cursor-pointer">普通任务</Label>
                  <span className="text-xs text-gray-400">一次性任务，规定时间完成</span>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="periodic" id="periodic" />
                  <Label htmlFor="periodic" className="cursor-pointer">周期任务</Label>
                  <span className="text-xs text-gray-400">按周期自动生成新实例</span>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label>任务描述</Label>
              <Textarea
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="描述任务内容和要求..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
        )}

        {/* 第2步：选择表单 */}
        {step === 2 && (
          <div className="space-y-4 w-full max-w-xl mx-auto">
            <RadioGroup
              value={formSource}
              onValueChange={(v: string) => setFormSource(v as typeof formSource)}
              className="space-y-3"
            >
              <div className="flex items-start gap-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="standards" id="standards" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="standards" className="cursor-pointer font-medium">关联规范表</Label>
                  <p className="text-xs text-gray-400">从规范管理已有表中选择，指派项目后自动在项目里建表</p>
                  {formSource === "standards" && (
                    <div className="mt-2">
                    <Select value={selectedTableCode} onValueChange={(v: string) => {
                      setSelectedTableCode(v);
                      const t = standardTables.find((st) => st.table_code === v);
                      setSelectedTableName(t?.table_name || "");
                    }}>
                      <SelectTrigger><SelectValue placeholder="选择规范表" /></SelectTrigger>
                      <SelectContent>
                        {standardTables.map((t) => (
                          <SelectItem key={t.table_code} value={t.table_code}>{t.table_name} ({t.table_code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 border rounded-lg hover:bg-gray-50">
                <RadioGroupItem value="excel_import" id="excel_import" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="excel_import" className="cursor-pointer font-medium">导入Excel建表</Label>
                  <p className="text-xs text-gray-400">上传Excel文件，自动解析表格结构生成规范表，指派项目后自动在项目里建表</p>
                  {formSource === "excel_import" && (
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
                  )}
                </div>
              </div>

            </RadioGroup>
          </div>
        )}

        {/* 第3步：指派 */}
        {step === 3 && (
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

        {/* 第4步：截止与提醒 */}
        {step === 4 && (
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
            {step < 4 ? (
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
