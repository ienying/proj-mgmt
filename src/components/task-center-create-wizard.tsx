"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Check, FileText, Users, Clock,
  Plus, Trash2, GripVertical, ArrowUpDown, Calendar, Link2,
  Search, X, List, ChevronsUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { toast } from "sonner";

/* ─── 类型 ─── */
interface CurrentUser {
  id: string;
  name: string;
  department?: string;
  phone?: string;
}

interface FormColumn {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  default_value?: string;
  assigned_node_id?: string;
}

interface WorkflowNode {
  id: string;
  name: string;
  order: number;
  handler_id: string;
  handler_name: string;
  editable_fields: string[];
  required_fields: string[];
  deadline_hours: number;
}

interface BoardRecord {
  ref_id: string;
  label: string;
  source_schema: string;
  source_table: string;
  source_record_id: string;
  copy_columns: { source_col: string; target_col: string }[];
  feedback_columns: {
    target_col: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    assigned_node_id: string;
  }[];
}

interface CreateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: CurrentUser;
  onSave: (data: any) => Promise<void>;
}

const COLUMN_TYPES = [
  { value: "text", label: "文本" },
  { value: "number", label: "数字" },
  { value: "date", label: "日期" },
  { value: "datetime", label: "日期时间" },
  { value: "select", label: "下拉选择" },
  { value: "textarea", label: "多行文本" },
  { value: "boolean", label: "布尔值" },
];

const TIME_OPTIONS = [
  { value: "one_time", label: "一次性任务", desc: "执行一次即完成" },
  { value: "periodic", label: "周期性任务", desc: "按周期重复执行" },
];

const MODE_OPTIONS = [
  { value: "process", label: "流程型", desc: "工作流驱动，多节点流转审批", icon: "🔀" },
  { value: "project", label: "项目型", desc: "绑定项目模块，在项目详情中查看填写", icon: "📋" },
];

const PERIOD_OPTIONS = [
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每周" },
  { value: "monthly", label: "每月" },
  { value: "yearly", label: "每年" },
];

export default function TaskCenterCreateWizard({ open, onOpenChange, currentUser, onSave }: CreateWizardProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1: Basic info
  const [taskName, setTaskName] = useState("");
  const [timeType, setTimeType] = useState("one_time");
  const [periodType, setPeriodType] = useState("monthly");

  // Step 2: Task mode
  const [taskMode, setTaskMode] = useState("process");

  // Step 3: Form columns
  const [formColumns, setFormColumns] = useState<FormColumn[]>([]);
  const [newCol, setNewCol] = useState<FormColumn>({ name: "", label: "", type: "text", required: false });
  const [showColOptions, setShowColOptions] = useState(false);
  const [colOptInput, setColOptInput] = useState("");

  // Step 3b: Board records
  const [boardRecords, setBoardRecords] = useState<BoardRecord[]>([]);
  const [showBoardSelector, setShowBoardSelector] = useState(false);
  const [boardProjects, setBoardProjects] = useState<any[]>([]);
  const [boardSelectedProject, setBoardSelectedProject] = useState("");
  const [boardSelectedSchema, setBoardSelectedSchema] = useState("");
  const [boardTables, setBoardTables] = useState<any[]>([]);
  const [boardSelectedTable, setBoardSelectedTable] = useState("");
  const [boardRecords2, setBoardRecords2] = useState<any[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);

  // Step 4: Assignees
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([]);
  const [projectId, setProjectId] = useState("");
  const [moduleCode, setModuleCode] = useState("");
  const [projects, setProjects] = useState<any[]>([]);

  // System users for assignee selection
  const [systemUsers, setSystemUsers] = useState<any[]>([]);

  // Step 5: Deadline
  const [dueDate, setDueDate] = useState("");
  const [remindDays, setRemindDays] = useState("1");

  // Feedback column editing for board records
  const [editingRefId, setEditingRefId] = useState<string | null>(null);
  const [newFbCol, setNewFbCol] = useState({ label: "", type: "text", required: false, assigned_node_id: "" });

  // Table definitions map: table_code → Chinese table_name
  const [tableDefsMap, setTableDefsMap] = useState<Record<string, string>>({});
  // User combobox open state (which node's combobox is open)
  const [userComboOpen, setUserComboOpen] = useState<string | null>(null);
  // Column picker for board record references
  const [columnPickerRecord, setColumnPickerRecord] = useState<any | null>(null);
  const [columnPickerSelected, setColumnPickerSelected] = useState<Set<string>>(new Set());
  // System columns to exclude from board record column picker
  const SYSTEM_COLS = ["id", "created_at", "updated_at", "sort_order", "created_by", "allow_delete", "data_source", "_readonly"];

  /* ─── Helper: extract readable label from record ─── */
  const getRecordDisplayLabel = (record: any): string => {
    // Try common name-like fields first
    const nameFields = ["名称", "name", "title", "标题", "subject", "主题", "项目名称", "产品名称", "任务名称"];
    for (const f of nameFields) {
      if (record[f] && String(record[f]).trim()) return String(record[f]).trim();
    }
    // Fall back to first non-id string field
    for (const [k, v] of Object.entries(record)) {
      if (k === "id" || k === "created_at" || k === "updated_at" || k === "sort_order") continue;
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    // Last resort: use id
    return record.id?.slice(0, 12) || "记录";
  };

  /* ─── Reset on open ─── */
  useEffect(() => {
    if (open) {
      setStep(0);
      setTaskName("");
      setTimeType("one_time");
      setTaskMode("process");
      setFormColumns([]);
      setBoardRecords([]);
      setWorkflowNodes([]);
      setProjectId("");
      setModuleCode("");
      setDueDate("");
      setRemindDays("1");
    }
  }, [open]);

  // Load system users for assignee selection
  useEffect(() => {
    if (open) {
      fetch("/api/users")
        .then((r) => r.json())
        .then((j) => { if (j.data) setSystemUsers(j.data); })
        .catch(() => {});
    }
  }, [open]);

  // Load projects for Step 4
  useEffect(() => {
    if (open) {
      fetch("/api/projects")
        .then((r) => r.json())
        .then((j) => { if (j.data) setProjects(j.data); })
        .catch(() => {});
    }
  }, [open]);

  // Load board selector projects + table definitions
  useEffect(() => {
    if (showBoardSelector) {
      fetch("/api/projects")
        .then((r) => r.json())
        .then((j) => { if (j.data) setBoardProjects(j.data); })
        .catch(() => {});
      // Load table definitions for Chinese table name mapping
      fetch("/api/standards")
        .then((r) => r.json())
        .then((j) => {
          if (j.data && Array.isArray(j.data)) {
            const map: Record<string, string> = {};
            for (const def of j.data) {
              if (def.table_code && def.table_name) map[def.table_code] = def.table_name;
            }
            setTableDefsMap(map);
          }
        })
        .catch(() => {});
    }
  }, [showBoardSelector]);

  // Load board tables when schema selected
  const loadBoardTables = async (schema: string) => {
    setBoardSelectedSchema(schema);
    setBoardLoading(true);
    try {
      const res = await fetch(`/api/tasks/board-records?schema=${schema}`);
      const json = await res.json();
      if (json.data) setBoardTables(json.data);
    } catch (e) {} finally { setBoardLoading(false); }
  };

  // Load board records when table selected
  const loadBoardRecords = async (table: string) => {
    setBoardSelectedTable(table);
    setBoardLoading(true);
    try {
      const res = await fetch(`/api/tasks/board-records?schema=${boardSelectedSchema}&table=${table}`);
      const json = await res.json();
      if (json.data) setBoardRecords2(json.data);
    } catch (e) {} finally { setBoardLoading(false); }
  };

  /* ─── 添加表单列 ─── */
  const addFormColumn = () => {
    if (!newCol.name || !newCol.label) return;
    const colName = newCol.name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
    setFormColumns([...formColumns, { ...newCol, name: colName }]);
    setNewCol({ name: "", label: "", type: "text", required: false });
    setShowColOptions(false);
    setColOptInput("");
  };

  /* ─── 添加工作流节点 ─── */
  const addWorkflowNode = () => {
    const node: WorkflowNode = {
      id: `node_${Date.now()}`,
      name: `节点 ${workflowNodes.length + 1}`,
      order: workflowNodes.length,
      handler_id: "",
      handler_name: "",
      editable_fields: formColumns.map((c) => c.name),
      required_fields: formColumns.filter((c) => c.required).map((c) => c.name),
      deadline_hours: 48,
    };
    setWorkflowNodes([...workflowNodes, node]);
  };

  /* ─── 添加看板引用记录 ─── */
  const addBoardRecord = (record: any, selectedColumns?: string[]) => {
    const refId = `ref_${Date.now()}`;
    const sourceTable = boardSelectedTable;
    const cols = selectedColumns || Object.keys(record).filter((k) => !["id", "created_at", "updated_at", "sort_order"].includes(k));
    const ref: BoardRecord = {
      ref_id: refId,
      label: getRecordDisplayLabel(record),
      source_schema: boardSelectedSchema,
      source_table: sourceTable,
      source_record_id: record.id,
      copy_columns: cols.map((k) => ({ source_col: k, target_col: `${refId}_${k}` })),
      feedback_columns: [],
    };
    setBoardRecords([...boardRecords, ref]);
    toast.success("已添加引用记录");
  };

  /* ─── 构建最终数据 ─── */
  const buildData = () => {
    return {
      task_name: taskName,
      time_type: timeType,
      task_mode: taskMode,
      periodic_config: timeType === "periodic" ? { type: periodType } : null,
      form_columns: formColumns,
      workflow_nodes: taskMode === "process" ? workflowNodes : null,
      assignee_config: taskMode === "project" ? { project_id: projectId, module_code: moduleCode } : null,
      board_records: boardRecords.length > 0 ? boardRecords : null,
      deadline_config: {
        due_date: dueDate || null,
        remind_days: Number(remindDays) || 0,
      },
      created_by: currentUser.id,
      created_by_name: currentUser.name,
    };
  };

  /* ─── 验证当前步骤 ─── */
  const canNext = () => {
    switch (step) {
      case 0: return !!taskName;
      case 1: return true;
      case 2: return formColumns.length > 0;
      case 3: return taskMode === "process" ? workflowNodes.length > 0 && workflowNodes.every((n) => n.handler_id) : !!projectId;
      case 4: return true;
      default: return true;
    }
  };

  const handleSave = async () => {
    if (!canNext()) return;
    setSaving(true);
    try {
      await onSave(buildData());
    } finally {
      setSaving(false);
    }
  };

  /* ─── 渲染步骤指示器 ─── */
  const stepIcons = [FileText, Clock, List, Users, Calendar];
  const steps = ["基本信息", "任务类型", "制作表单", "指派人员", "截止提醒"];
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const Icon = stepIcons[i];
        const done = i < step;
        const active = i === step;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm
                ${done ? "bg-emerald-500 text-white shadow-emerald-200" : active ? "bg-blue-500 text-white shadow-blue-200 scale-110" : "bg-gray-100 text-gray-400"}`}>
                {done ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs mt-1.5 font-medium transition-colors ${active ? "text-blue-600" : done ? "text-emerald-500" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 w-10 md:w-14 mb-5 rounded transition-colors duration-300 ${i < step ? "bg-emerald-400" : "bg-gray-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  /* ─── Step 0: 基本信息 ─── */
  const renderStepBasicInfo = () => (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">任务名称</label>
        <Input placeholder="请输入任务名称" className="h-10" value={taskName} onChange={(e) => setTaskName(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-semibold text-gray-700 mb-3 block">时间类型</label>
        <div className="grid grid-cols-2 gap-3">
          {TIME_OPTIONS.map((opt) => (
            <Card key={opt.value}
              className={`cursor-pointer border-2 transition-all duration-200 hover:shadow-md
                ${timeType === opt.value ? "border-blue-400 bg-gradient-to-br from-blue-50 to-white shadow-sm" : "border-gray-100 hover:border-gray-300"}`}
              onClick={() => setTimeType(opt.value)}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${timeType === opt.value ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-400"}`}>
                    {opt.value === "one_time" ? <FileText className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {timeType === "periodic" && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">周期类型</label>
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  /* ─── Step 1: 任务类型 ─── */
  const renderStepTaskMode = () => (
    <div className="grid grid-cols-2 gap-4">
      {MODE_OPTIONS.map((opt) => (
        <Card key={opt.value}
          className={`cursor-pointer border-2 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]
            ${taskMode === opt.value ? "border-blue-400 bg-gradient-to-br from-blue-50 to-white shadow-md" : "border-gray-100 hover:border-gray-300"}`}
          onClick={() => setTaskMode(opt.value)}>
          <CardContent className="p-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 mx-auto transition-colors
              ${taskMode === opt.value ? "bg-blue-500 text-white" : "bg-gray-100"}`}>
              {opt.icon}
            </div>
            <div className={`text-center font-semibold text-base ${taskMode === opt.value ? "text-blue-700" : ""}`}>{opt.label}</div>
            <div className="text-center text-xs text-gray-500 mt-1.5 leading-relaxed">{opt.desc}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  /* ─── Step 2: 制作表单 ─── */
  const renderStepForm = () => (
    <div className="space-y-5">
      {/* Sub-step A: Form columns */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-blue-500 rounded-full" />
          <label className="text-sm font-semibold text-gray-700">基础字段</label>
          <Badge className="text-xs bg-blue-100 text-blue-600 hover:bg-blue-100">{formColumns.length}</Badge>
        </div>
        <div className="flex gap-2 mb-3 flex-wrap">
          <Input placeholder="列名 (英文)" className="w-32 h-8 text-sm" value={newCol.name}
            onChange={(e) => setNewCol({ ...newCol, name: e.target.value })} />
          <Input placeholder="显示标签" className="w-32 h-8 text-sm" value={newCol.label}
            onChange={(e) => setNewCol({ ...newCol, label: e.target.value })} />
          <Select value={newCol.type} onValueChange={(v) => setNewCol({ ...newCol, type: v })}>
            <SelectTrigger className="h-8 w-28 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLUMN_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 text-sm bg-gray-100 rounded-md px-2.5 h-8 cursor-pointer hover:bg-gray-200 transition-colors">
            <input type="checkbox" checked={newCol.required}
              onChange={(e) => setNewCol({ ...newCol, required: e.target.checked })} />
            必填
          </label>
          <Button size="sm" className="h-8" onClick={addFormColumn} disabled={!newCol.name || !newCol.label}>
            <Plus className="w-4 h-4" />添加
          </Button>
        </div>

        {newCol.type === "select" && (
          <div className="flex gap-2 mb-3">
            <Input placeholder="选项 (逗号分隔)" className="h-8 text-sm w-56" value={colOptInput}
              onChange={(e) => { setColOptInput(e.target.value); setNewCol({ ...newCol, options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }); }} />
          </div>
        )}

        <div className="space-y-1.5">
          {formColumns.map((col, i) => (
            <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 hover:bg-white hover:border-gray-200 transition-colors">
              <GripVertical className="w-3.5 h-3.5 text-gray-300" />
              <span className="font-mono text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{col.name}</span>
              <span className="font-medium text-gray-700">{col.label}</span>
              <Badge variant="outline" className="text-xs font-normal">{COLUMN_TYPES.find((t) => t.value === col.type)?.label}</Badge>
              {col.required && <Badge className="text-xs bg-rose-50 text-rose-600 border-rose-200 font-normal">必填</Badge>}
              {taskMode === "process" && (
                workflowNodes.length > 0 ? (
                  <Select value={col.assigned_node_id || "__all__"}
                    onValueChange={(v) => {
                      const cols = [...formColumns];
                      cols[i].assigned_node_id = v === "__all__" ? undefined : v;
                      setFormColumns(cols);
                    }}>
                    <SelectTrigger className="h-6 text-xs w-28 border-dashed">
                      <SelectValue placeholder="指派节点" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">全部节点可填</SelectItem>
                      {workflowNodes.map((n) => (<SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-gray-400 italic">去 Step4 指派节点</span>
                )
              )}
              <Button variant="ghost" size="sm" className="ml-auto h-7 w-7 p-0" onClick={() => setFormColumns(formColumns.filter((_, j) => j !== i))}>
                <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
              </Button>
            </div>
          ))}
          {formColumns.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm border border-dashed rounded-lg">
              暂无字段，在上方添加表单字段
            </div>
          )}
        </div>
      </div>

      {/* Sub-step B: Board records */}
      <div className="border-t border-gray-200 pt-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-purple-500 rounded-full" />
          <label className="text-sm font-semibold text-gray-700">引用看板记录</label>
          <Badge className="text-xs bg-purple-100 text-purple-600 hover:bg-purple-100">{boardRecords.length}</Badge>
          <span className="text-xs text-gray-400">(可选)</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-400">从项目看板中引用记录，不同处理人可分别反馈</span>
          <Button variant="outline" size="sm" onClick={() => setShowBoardSelector(!showBoardSelector)} className="border-dashed">
            <Link2 className="w-3.5 h-3.5 mr-1" />{showBoardSelector ? "关闭选择器" : "引用项目记录"}
          </Button>
        </div>

        {showBoardSelector && (
          <Card className="p-4 mb-4 bg-gray-50/50 border-dashed">
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-0">
                  <label className="text-xs text-gray-500 mb-1 block">选择项目</label>
                <Select value={boardSelectedProject} onValueChange={(v) => {
                  setBoardSelectedProject(v);
                  const proj = boardProjects.find((p: any) => p.id === v);
                  if (proj?.project_schema) loadBoardTables(proj.project_schema);
                }}>
                  <SelectTrigger><SelectValue placeholder="选择项目..." /></SelectTrigger>
                  <SelectContent>
                    {boardProjects.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {boardTables.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">选择表</label>
                  <Select value={boardSelectedTable} onValueChange={loadBoardRecords}>
                    <SelectTrigger><SelectValue placeholder="选择表..." /></SelectTrigger>
                    <SelectContent>
                      {boardTables.map((t: any) => {
                        const cnName = tableDefsMap[t.table_name];
                        return (
                          <SelectItem key={t.table_name} value={t.table_name}>
                            {cnName ? `${cnName} (${t.table_name})` : t.table_name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
              </div>

              {boardLoading && <div className="text-sm text-gray-400 py-2">加载中...</div>}

              {boardRecords2.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">选择记录（点击 + 选择要显示的列）</label>
                  <div className="max-h-48 overflow-auto space-y-1 border rounded-lg bg-white p-1">
                    {boardRecords2.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between text-sm hover:bg-blue-50 rounded-md px-3 py-2 transition-colors">
                        <span className="truncate flex-1 font-medium text-gray-700">{getRecordDisplayLabel(r)}</span>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => {
                          setColumnPickerRecord(r);
                          const cols = Object.keys(r).filter((k) => !SYSTEM_COLS.includes(k)).slice(0, 5);
                          setColumnPickerSelected(new Set(cols));
                        }}>
                          <Plus className="w-4 h-4 text-blue-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Column picker */}
              {columnPickerRecord && (
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                      选择要显示的列
                      <span className="text-gray-400 font-normal ml-2">— {getRecordDisplayLabel(columnPickerRecord)}</span>
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setColumnPickerRecord(null); setColumnPickerSelected(new Set()); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-auto space-y-0.5 mb-3 border rounded-lg p-2">
                    {Object.keys(columnPickerRecord)
                      .filter((k) => !SYSTEM_COLS.includes(k))
                      .map((col) => (
                        <label key={col} className="flex items-center gap-2.5 text-sm hover:bg-blue-50 rounded-md px-2.5 py-1.5 cursor-pointer transition-colors">
                          <input type="checkbox" className="rounded" checked={columnPickerSelected.has(col)}
                            onChange={() => {
                              const next = new Set(columnPickerSelected);
                              if (next.has(col)) next.delete(col); else next.add(col);
                              setColumnPickerSelected(next);
                            }} />
                          <span className="font-mono text-xs text-gray-600">{col}</span>
                        </label>
                      ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">已选 {columnPickerSelected.size} 列</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setColumnPickerRecord(null); setColumnPickerSelected(new Set()); }}>取消</Button>
                      <Button size="sm" onClick={() => {
                        addBoardRecord(columnPickerRecord, Array.from(columnPickerSelected));
                        setColumnPickerRecord(null);
                        setColumnPickerSelected(new Set());
                      }} disabled={columnPickerSelected.size === 0}>
                        <Plus className="w-3.5 h-3.5 mr-1" />确认添加
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Added board records */}
        <div className="space-y-3">
          {boardRecords.map((ref) => {
            const proj = boardProjects.find((p: any) => p.project_schema === ref.source_schema);
            const cnTable = tableDefsMap[ref.source_table];
            return (
            <Card key={ref.ref_id} className="p-4 border-l-4 border-l-purple-300 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">{ref.label}</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setBoardRecords(boardRecords.filter((r) => r.ref_id !== ref.ref_id))}>
                  <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs mb-3">
                <Badge variant="outline" className="text-xs font-normal">{proj?.project_name || ref.source_schema}</Badge>
                <Badge variant="outline" className="text-xs font-normal">{cnTable || ref.source_table}</Badge>
                {ref.copy_columns.map((c) => (
                  <Badge key={c.source_col} variant="secondary" className="text-xs font-normal bg-gray-100">{c.source_col}</Badge>
                ))}
              </div>
              {/* Feedback columns */}
              <div className="space-y-1.5 mb-3">
                {ref.feedback_columns.map((fc, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-100 rounded-md px-3 py-1.5">
                    <span className="font-medium text-blue-700">{fc.label}</span>
                    <Badge variant="outline" className="text-xs font-normal">{fc.type}</Badge>
                    <span className="text-gray-400">→ {(workflowNodes.find((n) => n.id === fc.assigned_node_id)?.name) || "未指定"}</span>
                    <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={() => {
                      ref.feedback_columns.splice(i, 1);
                      setBoardRecords([...boardRecords]);
                    }}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              {/* Add feedback column */}
              <div className="space-y-2 bg-gray-50 rounded-lg p-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Input placeholder="反馈列标签" className="h-7 text-xs w-28 border-dashed" value={newFbCol.label}
                    onFocus={() => setEditingRefId(ref.ref_id)}
                    onChange={(e) => setNewFbCol({ ...newFbCol, label: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newFbCol.label && (workflowNodes.length === 0 || newFbCol.assigned_node_id)) {
                        e.preventDefault();
                        ref.feedback_columns.push({
                          target_col: `${ref.ref_id}_fb_${ref.feedback_columns.length}`,
                          label: newFbCol.label,
                          type: newFbCol.type,
                          required: newFbCol.required,
                          assigned_node_id: newFbCol.assigned_node_id || "",
                        });
                        setBoardRecords([...boardRecords]);
                        setNewFbCol({ label: "", type: "text", required: false, assigned_node_id: "" });
                      }
                    }} />
                  <Select value={newFbCol.type}
                    onValueChange={(v) => { setEditingRefId(ref.ref_id); setNewFbCol({ ...newFbCol, type: v }); }}>
                    <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLUMN_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  {workflowNodes.length > 0 ? (
                    <Select value={newFbCol.assigned_node_id || ""}
                      onValueChange={(v) => { setEditingRefId(ref.ref_id); setNewFbCol({ ...newFbCol, assigned_node_id: v }); }}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="绑定节点" /></SelectTrigger>
                      <SelectContent>
                        {workflowNodes.map((n, ni) => (<SelectItem key={n.id} value={n.id}>{ni + 1}. {n.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-gray-400 italic">去 Step4 创建节点</span>
                  )}
                </div>
                <Button size="sm" className="h-7 text-xs w-full" variant="outline"
                  disabled={!newFbCol.label || (workflowNodes.length > 0 && !newFbCol.assigned_node_id)}
                  onClick={() => {
                    if (!newFbCol.label) return;
                    if (workflowNodes.length > 0 && !newFbCol.assigned_node_id) { toast.error("请选择绑定节点"); return; }
                    ref.feedback_columns.push({
                      target_col: `${ref.ref_id}_fb_${ref.feedback_columns.length}`,
                      label: newFbCol.label,
                      type: newFbCol.type,
                      required: newFbCol.required,
                      assigned_node_id: newFbCol.assigned_node_id || "",
                    });
                    setBoardRecords([...boardRecords]);
                    setNewFbCol({ label: "", type: "text", required: false, assigned_node_id: "" });
                    setEditingRefId(null);
                  }}>
                  <Plus className="w-3.5 h-3.5 mr-1" />添加反馈列
                </Button>
              </div>
            </Card>
          );
          })}
        </div>
      </div>
    </div>
  );

  /* ─── Step 3: 指派人员 ─── */
  const renderStepAssign = () => (
    <div className="space-y-4">
      {taskMode === "process" ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-amber-500 rounded-full" />
              <label className="text-sm font-semibold text-gray-700">工作流节点</label>
              <Badge className="text-xs bg-amber-100 text-amber-600 hover:bg-amber-100">{workflowNodes.length}</Badge>
            </div>
            <Button size="sm" variant="outline" className="border-dashed" onClick={addWorkflowNode}>
              <Plus className="w-4 h-4 mr-1" />添加节点
            </Button>
          </div>
          <div className="space-y-3">
            {workflowNodes.map((node, i) => (
              <Card key={node.id} className={`p-4 border-2 transition-all ${i === 0 ? "border-blue-200 bg-gradient-to-r from-blue-50/50 to-white" : "border-gray-100"}`}>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                    {i + 1}
                  </div>
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <Input className="h-8 text-sm w-28 font-medium" placeholder="节点名称" value={node.name}
                      onChange={(e) => {
                        const nodes = [...workflowNodes];
                        nodes[i].name = e.target.value;
                        setWorkflowNodes(nodes);
                      }} />
                    <Popover open={userComboOpen === node.id} onOpenChange={(open) => setUserComboOpen(open ? node.id : null)}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" role="combobox"
                          className={`h-8 text-sm w-72 justify-between px-3 font-normal ${!node.handler_id ? "text-muted-foreground border-dashed" : "border-blue-200"}`}>
                          {node.handler_id
                            ? (() => { const u = systemUsers.find((u: any) => u.id === node.handler_id); return u ? `${u.name}${u.department ? ` · ${u.department}` : ""}` : (node.handler_name || "选择处理人"); })()
                            : "选择处理人"}
                          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <Command>
                          <CommandInput placeholder="搜索人员..." />
                          <CommandList>
                            <CommandEmpty>未找到人员</CommandEmpty>
                            <CommandGroup>
                              {systemUsers.map((u: any) => (
                                <CommandItem key={u.id} value={`${u.name} ${u.department || ""} ${u.username || ""}`}
                                  onSelect={() => {
                                    const nodes = [...workflowNodes];
                                    nodes[i].handler_id = u.id;
                                    nodes[i].handler_name = u.name || "";
                                    setWorkflowNodes(nodes);
                                    setUserComboOpen(null);
                                  }}>
                                  <span>{u.name}</span>
                                  {u.department && <span className="text-xs text-gray-400 ml-1">({u.department})</span>}
                                  {u.position && <span className="text-xs text-gray-400 ml-1">{u.position}</span>}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <div className="flex items-center gap-1.5 bg-gray-100 rounded-md px-2.5 h-8">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <Input className="h-7 text-sm w-12 border-0 bg-transparent p-0" type="number" placeholder="48" value={node.deadline_hours || ""}
                        onChange={(e) => {
                          const nodes = [...workflowNodes];
                          nodes[i].deadline_hours = Number(e.target.value);
                          setWorkflowNodes(nodes);
                        }} />
                      <span className="text-xs text-gray-400">h</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setWorkflowNodes(workflowNodes.filter((_, j) => j !== i))}>
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                  </Button>
                </div>
                {node.handler_id && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                    <span>可编辑字段：{node.editable_fields?.length || 0} 个</span>
                    <span>·</span>
                    <span>必填字段：{node.required_fields?.length || 0} 个</span>
                  </div>
                )}
              </Card>
            ))}
            {workflowNodes.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed rounded-xl">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                点击"添加节点"创建工作流，至少需要添加一个节点
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-amber-500 rounded-full" />
              <label className="text-sm font-semibold text-gray-700">项目绑定</label>
            </div>
            <label className="text-xs text-gray-500 mb-1.5 block">选择项目</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="选择项目..." /></SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1.5 block">模块代码</label>
            <Input className="h-9" placeholder="例如: procurement" value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );

  /* ─── Step 4: 截止提醒 ─── */
  const renderStepDeadline = () => (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 bg-emerald-500 rounded-full" />
        <label className="text-sm font-semibold text-gray-700">时间与提醒</label>
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">截止日期</label>
        <Input type="date" className="h-9" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">提前提醒</label>
        <Select value={remindDays} onValueChange={setRemindDays}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">不提醒</SelectItem>
            <SelectItem value="1">提前 1 天</SelectItem>
            <SelectItem value="3">提前 3 天</SelectItem>
            <SelectItem value="7">提前 7 天</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {dueDate && remindDays !== "0" && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          <Clock className="w-4 h-4 inline mr-1" />
          将在 {dueDate} 前 {remindDays} 天提醒处理人
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[88vh] overflow-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b px-6 py-4 rounded-t-lg">
          <DialogTitle className="text-lg">创建任务</DialogTitle>
          <p className="text-xs text-gray-500 mt-1">
            {step === 0 && "填写任务名称，选择时间类型"}
            {step === 1 && "选择流程型或项目型任务模式"}
            {step === 2 && "设计表单字段，可选引用看板记录"}
            {step === 3 && "设置处理人或绑定项目"}
            {step === 4 && "设置截止时间与提醒规则"}
          </p>
        </div>

        <div className="px-6 pt-5 pb-2">
          {renderStepIndicator()}
        </div>

        <div className="px-6 pb-4">
          {step === 0 && renderStepBasicInfo()}
          {step === 1 && renderStepTaskMode()}
          {step === 2 && renderStepForm()}
          {step === 3 && renderStepAssign()}
          {step === 4 && renderStepDeadline()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50/95 backdrop-blur border-t px-6 py-3 rounded-b-lg flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)} className="text-gray-500">
            {step === 0 ? "取消" : <><ChevronLeft className="w-4 h-4 mr-1" />上一步</>}
          </Button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{step + 1} / {steps.length}</span>
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="shadow-sm">
                下一步<ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving} className="shadow-sm bg-emerald-600 hover:bg-emerald-700">
                {saving ? "创建中..." : <><Check className="w-4 h-4 mr-1" />完成创建</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
