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
  const steps = ["基本信息", "任务类型", "制作表单", "指派人员", "截止提醒"];
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
              ${i < step ? "bg-green-500 text-white" : i === step ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-500"}`}>
              {i < step ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={`text-xs ${i === step ? "font-medium text-blue-600" : "text-gray-400"}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && <div className={`w-6 h-px ${i < step ? "bg-green-400" : "bg-gray-200"}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  /* ─── Step 0: 基本信息 ─── */
  const renderStepBasicInfo = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">任务名称</label>
        <Input placeholder="请输入任务名称" value={taskName} onChange={(e) => setTaskName(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">时间类型</label>
        <div className="grid grid-cols-2 gap-3">
          {TIME_OPTIONS.map((opt) => (
            <Card key={opt.value}
              className={`cursor-pointer hover:border-blue-400 transition-colors ${timeType === opt.value ? "border-blue-500 bg-blue-50" : ""}`}
              onClick={() => setTimeType(opt.value)}>
              <CardContent className="p-4 text-center">
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {timeType === "periodic" && (
        <div>
          <label className="text-sm font-medium mb-1 block">周期类型</label>
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
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
          className={`cursor-pointer hover:border-blue-400 transition-colors ${taskMode === opt.value ? "border-blue-500 bg-blue-50" : ""}`}
          onClick={() => setTaskMode(opt.value)}>
          <CardContent className="p-6 text-center">
            <div className="text-3xl mb-2">{opt.icon}</div>
            <div className="font-medium">{opt.label}</div>
            <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  /* ─── Step 2: 制作表单 ─── */
  const renderStepForm = () => (
    <div className="space-y-4">
      {/* Sub-step A: Form columns */}
      <div>
        <label className="text-sm font-medium mb-2 block">基础字段</label>
        <div className="flex gap-2 mb-3">
          <Input placeholder="列名 (英文)" className="w-1/4" value={newCol.name}
            onChange={(e) => setNewCol({ ...newCol, name: e.target.value })} />
          <Input placeholder="显示标签" className="w-1/4" value={newCol.label}
            onChange={(e) => setNewCol({ ...newCol, label: e.target.value })} />
          <Select value={newCol.type} onValueChange={(v) => setNewCol({ ...newCol, type: v })}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {COLUMN_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={newCol.required}
              onChange={(e) => setNewCol({ ...newCol, required: e.target.checked })} />
            必填
          </label>
          <Button size="sm" onClick={addFormColumn} disabled={!newCol.name || !newCol.label}>
            <Plus className="w-4 h-4" />添加
          </Button>
        </div>

        {newCol.type === "select" && (
          <div className="flex gap-2 mb-3 ml-2">
            <Input placeholder="选项 (逗号分隔)" className="w-64" value={colOptInput}
              onChange={(e) => { setColOptInput(e.target.value); setNewCol({ ...newCol, options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }); }} />
          </div>
        )}

        <div className="space-y-1">
          {formColumns.map((col, i) => (
            <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-3 py-1.5 flex-wrap">
              <GripVertical className="w-3 h-3 text-gray-400" />
              <span className="font-mono text-xs bg-gray-200 px-1 rounded">{col.name}</span>
              <span>{col.label}</span>
              <Badge variant="outline" className="text-xs">{COLUMN_TYPES.find((t) => t.value === col.type)?.label}</Badge>
              {col.required && <Badge className="text-xs bg-red-100 text-red-600">必填</Badge>}
              {taskMode === "process" && (
                workflowNodes.length > 0 ? (
                  <Select value={col.assigned_node_id || ""}
                    onValueChange={(v) => {
                      const cols = [...formColumns];
                      cols[i].assigned_node_id = v || undefined;
                      setFormColumns(cols);
                    }}>
                    <SelectTrigger className="h-6 text-xs w-28">
                      <SelectValue placeholder="指派节点" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">全部节点可填</SelectItem>
                      {workflowNodes.map((n) => (<SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-gray-400">先去 Step4 创建节点后再指派</span>
                )
              )}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setFormColumns(formColumns.filter((_, j) => j !== i))}>
                <Trash2 className="w-3 h-3 text-red-400" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-step B: Board records */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">引用看板记录（可选）</label>
          <Button variant="outline" size="sm" onClick={() => setShowBoardSelector(!showBoardSelector)}>
            <Link2 className="w-4 h-4 mr-1" />{showBoardSelector ? "关闭选择器" : "引用项目记录"}
          </Button>
        </div>

        {showBoardSelector && (
          <Card className="p-3 mb-3">
            <div className="space-y-3">
              <div>
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

              {boardLoading && <div className="text-sm text-gray-400">加载中...</div>}

              {boardRecords2.length > 0 && (
                <div className="max-h-48 overflow-auto space-y-1">
                  {boardRecords2.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between text-sm hover:bg-gray-50 rounded px-2 py-1">
                      <span className="truncate flex-1">{getRecordDisplayLabel(r)}</span>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setColumnPickerRecord(r);
                        // Pre-select first 5 non-system columns
                        const cols = Object.keys(r).filter((k) => !SYSTEM_COLS.includes(k)).slice(0, 5);
                        setColumnPickerSelected(new Set(cols));
                      }}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Column picker modal */}
              {columnPickerRecord && (
                <div className="border rounded p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">选择要显示的列 — {getRecordDisplayLabel(columnPickerRecord)}</span>
                    <Button variant="ghost" size="sm" onClick={() => { setColumnPickerRecord(null); setColumnPickerSelected(new Set()); }}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-auto space-y-1 mb-2">
                    {Object.keys(columnPickerRecord)
                      .filter((k) => !SYSTEM_COLS.includes(k))
                      .map((col) => (
                        <label key={col} className="flex items-center gap-2 text-sm hover:bg-white rounded px-2 py-1 cursor-pointer">
                          <input type="checkbox" checked={columnPickerSelected.has(col)}
                            onChange={() => {
                              const next = new Set(columnPickerSelected);
                              if (next.has(col)) next.delete(col); else next.add(col);
                              setColumnPickerSelected(next);
                            }} />
                          <span>{col}</span>
                        </label>
                      ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => {
                      addBoardRecord(columnPickerRecord, Array.from(columnPickerSelected));
                      setColumnPickerRecord(null);
                      setColumnPickerSelected(new Set());
                    }} disabled={columnPickerSelected.size === 0}>
                      确认添加 ({columnPickerSelected.size}列)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setColumnPickerRecord(null); setColumnPickerSelected(new Set()); }}>
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Added board records */}
        <div className="space-y-2">
          {boardRecords.map((ref) => (
            <Card key={ref.ref_id} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{ref.label}</span>
                <Button variant="ghost" size="sm" onClick={() => setBoardRecords(boardRecords.filter((r) => r.ref_id !== ref.ref_id))}>
                  <Trash2 className="w-3 h-3 text-red-400" />
                </Button>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {(() => {
                  const proj = boardProjects.find((p: any) => p.project_schema === ref.source_schema);
                  const cnTable = tableDefsMap[ref.source_table];
                  return (
                    <span>项目: {proj?.project_name || ref.source_schema} | 表: {cnTable ? `${cnTable}(${ref.source_table})` : ref.source_table} | 对照列: {ref.copy_columns.map((c) => c.source_col).join(", ")}</span>
                  );
                })()}
              </div>
              {/* Feedback columns */}
              <div className="space-y-1 mb-2">
                {ref.feedback_columns.map((fc, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-blue-50 rounded px-2 py-1">
                    <span>{fc.label}</span>
                    <Badge variant="outline" className="text-xs">{fc.type}</Badge>
                    <span className="text-gray-400">→ {(workflowNodes.find((n) => n.id === fc.assigned_node_id)?.name) || fc.assigned_node_id || "未指定"}</span>
                    <Button variant="ghost" size="sm" className="ml-auto" onClick={() => {
                      ref.feedback_columns.splice(i, 1);
                      setBoardRecords([...boardRecords]);
                    }}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              {/* Add feedback column */}
              <div className="flex items-center gap-1 flex-wrap">
                <Input placeholder="反馈列标签" className="h-7 text-xs w-28" value={editingRefId === ref.ref_id ? newFbCol.label : ""}
                  onFocus={() => setEditingRefId(ref.ref_id)}
                  onChange={(e) => setNewFbCol({ ...newFbCol, label: e.target.value })} />
                <Select value={editingRefId === ref.ref_id ? newFbCol.type : "text"}
                  onValueChange={(v) => setNewFbCol({ ...newFbCol, type: v })}>
                  <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMN_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                {workflowNodes.length > 0 ? (
                  <Select value={editingRefId === ref.ref_id ? newFbCol.assigned_node_id : ""}
                    onValueChange={(v) => setNewFbCol({ ...newFbCol, assigned_node_id: v })}>
                    <SelectTrigger className="h-7 text-xs w-24"><SelectValue placeholder="绑定节点" /></SelectTrigger>
                    <SelectContent>
                      {workflowNodes.map((n) => (<SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-gray-400">先去 Step4 创建节点</span>
                )}
                <Button size="sm" className="h-7 text-xs" disabled={!newFbCol.label}
                  onClick={() => {
                    if (!newFbCol.label) return;
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
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  /* ─── Step 3: 指派人员 ─── */
  const renderStepAssign = () => (
    <div className="space-y-4">
      {taskMode === "process" ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">工作流节点</label>
            <Button size="sm" variant="outline" onClick={addWorkflowNode}>
              <Plus className="w-4 h-4 mr-1" />添加节点
            </Button>
          </div>
          <div className="space-y-3">
            {workflowNodes.map((node, i) => (
              <Card key={node.id} className="p-3">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded">节点{i + 1}</span>
                  <Input className="h-7 text-sm w-28" placeholder="节点名称" value={node.name}
                    onChange={(e) => {
                      const nodes = [...workflowNodes];
                      nodes[i].name = e.target.value;
                      setWorkflowNodes(nodes);
                    }} />
                  <Popover open={userComboOpen === node.id} onOpenChange={(open) => setUserComboOpen(open ? node.id : null)}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" role="combobox"
                        className={`h-7 text-sm w-44 justify-between px-2 font-normal ${!node.handler_id ? "text-muted-foreground" : ""}`}>
                        {node.handler_id
                          ? (() => { const u = systemUsers.find((u: any) => u.id === node.handler_id); return u ? `${u.name}${u.department ? ` (${u.department})` : ""}` : (node.handler_name || "选择处理人"); })()
                          : "选择处理人"}
                        <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0" align="start">
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
                  <Input className="h-7 text-sm w-14" type="number" placeholder="时限(h)" value={node.deadline_hours}
                    onChange={(e) => {
                      const nodes = [...workflowNodes];
                      nodes[i].deadline_hours = Number(e.target.value);
                      setWorkflowNodes(nodes);
                    }} />
                  <Button variant="ghost" size="sm" onClick={() => setWorkflowNodes(workflowNodes.filter((_, j) => j !== i))}>
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </Button>
                </div>
              </Card>
            ))}
            {workflowNodes.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">
                点击"添加节点"创建工作流，至少需要一个节点
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">选择项目</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="选择项目..." /></SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">模块代码</label>
            <Input placeholder="例如: procurement" value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );

  /* ─── Step 4: 截止提醒 ─── */
  const renderStepDeadline = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">截止日期</label>
        <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">提前提醒（天）</label>
        <Select value={remindDays} onValueChange={setRemindDays}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">不提醒</SelectItem>
            <SelectItem value="1">提前 1 天</SelectItem>
            <SelectItem value="3">提前 3 天</SelectItem>
            <SelectItem value="7">提前 7 天</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>创建任务</DialogTitle>
        </DialogHeader>

        {renderStepIndicator()}

        {step === 0 && renderStepBasicInfo()}
        {step === 1 && renderStepTaskMode()}
        {step === 2 && renderStepForm()}
        {step === 3 && renderStepAssign()}
        {step === 4 && renderStepDeadline()}

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)}>
            {step === 0 ? "取消" : <><ChevronLeft className="w-4 h-4 mr-1" />上一步</>}
          </Button>
          <div className="flex gap-2">
            {step < 4 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
                下一步<ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "创建中..." : <><Check className="w-4 h-4 mr-1" />完成创建</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
