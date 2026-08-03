"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Plus, Trash2, GripVertical, FileText, Clock,
  Link2, X, ChevronsUpDown, Eye, List,
  Send, Save, RotateCcw, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  node_type: "sequential" | "parallel";
  handler_id: string;
  handler_ids: string[];
  handler_name: string;
  handler_names: string[];
  max_records: number; // 多人模式下每人最多填写条数，0=不限制
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
  currentUser: CurrentUser;
  onSave: (data: any) => Promise<void>;
  onBack: () => void;
  initialData?: any | null;
}

const COLUMN_TYPES = [
  { value: "text", label: "文本" },
  { value: "number", label: "数字" },
  { value: "date", label: "日期" },
  { value: "select", label: "下拉选择" },
  { value: "textarea", label: "多行文本" },
  { value: "boolean", label: "布尔值" },
  { value: "url", label: "网址" },
];

const MODE_OPTIONS = [
  { value: "process", label: "流程型", desc: "工作流驱动，多节点流转审批" },
  { value: "project", label: "项目型", desc: "绑定项目模块，在项目详情中查看填写" },
];

const PERIOD_OPTIONS = [
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每周" },
  { value: "monthly", label: "每月" },
  { value: "yearly", label: "每年" },
];

export default function TaskCenterCreateWizard({ currentUser, onSave, onBack, initialData }: CreateWizardProps) {
  const [saving, setSaving] = useState(false);

  // Form state
  const [taskName, setTaskName] = useState(initialData?.task_name || "");
  const [timeType, setTimeType] = useState(initialData?.time_type || "one_time");
  const [periodType, setPeriodType] = useState(initialData?.periodic_config?.type || "monthly");
  const [taskMode, setTaskMode] = useState(initialData?.task_mode || "process");
  const [formColumns, setFormColumns] = useState<FormColumn[]>(initialData?.form_columns || []);
  const [newCol, setNewCol] = useState<FormColumn>({ name: "", label: "", type: "text", required: false });
  const [colOptInput, setColOptInput] = useState("");
  const [colOpts, setColOpts] = useState<string[]>([]);

  // Board records
  const [boardRecords, setBoardRecords] = useState<BoardRecord[]>(initialData?.board_records || []);
  const [showBoardSelector, setShowBoardSelector] = useState(false);
  const [boardProjects, setBoardProjects] = useState<any[]>([]);
  const [boardSelectedProject, setBoardSelectedProject] = useState("");
  const [boardSelectedSchema, setBoardSelectedSchema] = useState("");
  const [boardTables, setBoardTables] = useState<any[]>([]);
  const [boardSelectedTable, setBoardSelectedTable] = useState("");
  const [boardRecords2, setBoardRecords2] = useState<any[]>([]);
  const [boardLoading, setBoardLoading] = useState(false);

  // Workflow
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>(initialData?.workflow_nodes || []);
  const [projectId, setProjectId] = useState(initialData?.assignee_config?.project_id || "");
  const [moduleCode, setModuleCode] = useState(initialData?.assignee_config?.module_code || "");
  const [projects, setProjects] = useState<any[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [userComboOpen, setUserComboOpen] = useState<string | null>(null);
  const [multiSelectTemp, setMultiSelectTemp] = useState<string[]>([]);
  const [multiSelectSearch, setMultiSelectSearch] = useState("");
  const [multiSelectDeptFilter, setMultiSelectDeptFilter] = useState("全部");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute unique departments from system users
  const departments = React.useMemo(() => {
    const depts = new Set<string>();
    systemUsers.forEach((u: any) => { if (u.department) depts.add(u.department); });
    return ["全部", ...Array.from(depts).sort()];
  }, [systemUsers]);

  // Deadline
  const [dueDate, setDueDate] = useState("");
  const [remindDays, setRemindDays] = useState("1");

  // Feedback columns
  const [newFbCol, setNewFbCol] = useState({ label: "", type: "text", required: false, assigned_node_id: "", options: [] as string[] });

  // Table definitions
  const [tableDefsMap, setTableDefsMap] = useState<Record<string, string>>({});
  const [refDataSources, setRefDataSources] = useState<{ schema: string; table: string; table_cn: string }[]>([]);
  const [showRefPicker, setShowRefPicker] = useState(false);

  // Column picker
  const [columnPickerRecord, setColumnPickerRecord] = useState<any | null>(null);
  const [columnPickerSelected, setColumnPickerSelected] = useState<Set<string>>(new Set());
  const SYSTEM_COLS = ["id", "created_at", "updated_at", "sort_order", "created_by", "allow_delete", "data_source", "_readonly"];

  // Recently published (mock for preview)
  const [recentDefs, setRecentDefs] = useState<any[]>([]);

  /* ─── Helper ─── */
  const getRecordDisplayLabel = (record: any): string => {
    const nameFields = ["名称", "name", "title", "标题", "subject", "主题", "项目名称", "产品名称", "任务名称"];
    for (const f of nameFields) {
      if (record[f] && String(record[f]).trim()) return String(record[f]).trim();
    }
    for (const [k, v] of Object.entries(record)) {
      if (k === "id" || k === "created_at" || k === "updated_at" || k === "sort_order") continue;
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return record.id?.slice(0, 12) || "记录";
  };

  /* ─── Init on mount ─── */
  useEffect(() => {
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
    // Load initial data
    fetch("/api/tasks/defs?status=active&_limit=5").then(r => r.json()).then(j => {
      if (j.data) setRecentDefs(j.data.slice(0, 5));
    }).catch(() => {});
    fetch("/api/users").then(r => r.json()).then(j => { if (j.data) setSystemUsers(j.data); }).catch(() => {});
    fetch("/api/projects", { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` } }).then(r => r.json()).then(j => { if (j.data) setProjects(j.data); }).catch(() => {});
    // Load reference data sources for dropdown options
    fetch("/api/standards").then(r => r.json()).then(j => {
      if (j.data && Array.isArray(j.data)) {
        const sources: { schema: string; table: string; table_cn: string }[] = [];
        const seen = new Set<string>();
        for (const def of j.data) {
          const key = `${def.project_schema || ""}/${def.table_code}`;
          if (!seen.has(key) && def.table_code && !def.table_code.startsWith("task_")) {
            seen.add(key);
            sources.push({
              schema: def.project_schema || "public",
              table: def.table_code,
              table_cn: def.table_name || def.table_code,
            });
          }
        }
        setRefDataSources(sources.slice(0, 20));
      }
    }).catch(() => {});
  }, []);

  // Load board data
  useEffect(() => {
    if (showBoardSelector) {
      fetch("/api/projects", { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}` } }).then(r => r.json()).then(j => { if (j.data) setBoardProjects(j.data); }).catch(() => {});
      fetch("/api/standards").then(r => r.json()).then(j => {
        if (j.data && Array.isArray(j.data)) {
          const map: Record<string, string> = {};
          for (const def of j.data) {
            if (def.table_code && def.table_name) map[def.table_code] = def.table_name;
          }
          setTableDefsMap(map);
        }
      }).catch(() => {});
    }
  }, [showBoardSelector]);

  const loadBoardTables = async (schema: string) => {
    setBoardSelectedSchema(schema);
    setBoardLoading(true);
    try {
      const res = await fetch(`/api/tasks/board-records?schema=${schema}`);
      const json = await res.json();
      if (json.data) setBoardTables(json.data);
    } catch (e) { } finally { setBoardLoading(false); }
  };

  const loadBoardRecords = async (table: string) => {
    setBoardSelectedTable(table);
    setBoardLoading(true);
    try {
      const res = await fetch(`/api/tasks/board-records?schema=${boardSelectedSchema}&table=${table}`);
      const json = await res.json();
      if (json.data) setBoardRecords2(json.data);
    } catch (e) { } finally { setBoardLoading(false); }
  };

  /* ─── 操作 ─── */
  const addFormColumn = () => {
    if (!newCol.label) return;
    const colName = `field_${formColumns.length + 1}`;
    const finalOptions = newCol.type === "select" ? (colOpts.length > 0 ? colOpts : newCol.options) : undefined;
    setFormColumns([...formColumns, { ...newCol, name: colName, options: finalOptions }]);
    setNewCol({ name: "", label: "", type: "text", required: false });
    setColOptInput("");
    setColOpts([]);
  };

  const addWorkflowNode = () => {
    const node: WorkflowNode = {
      id: `node_${Date.now()}`,
      name: `节点 ${workflowNodes.length + 1}`,
      order: workflowNodes.length,
      node_type: "sequential",
      handler_id: "",
      handler_ids: [],
      handler_name: "",
      handler_names: [],
      max_records: 0,
      editable_fields: formColumns.map(c => c.name),
      required_fields: formColumns.filter(c => c.required).map(c => c.name),
      deadline_hours: 48,
    };
    setWorkflowNodes([...workflowNodes, node]);
  };

  const addBoardRecord = (record: any, selectedColumns?: string[]) => {
    const refId = `ref_${Date.now()}`;
    const sourceTable = boardSelectedTable;
    const cols = selectedColumns || Object.keys(record).filter(k => !["id", "created_at", "updated_at", "sort_order"].includes(k));
    const ref: BoardRecord = {
      ref_id: refId,
      label: getRecordDisplayLabel(record),
      source_schema: boardSelectedSchema,
      source_table: sourceTable,
      source_record_id: record.id,
      copy_columns: cols.map(k => ({ source_col: k, target_col: `${refId}_${k}` })),
      feedback_columns: [],
    };
    setBoardRecords([...boardRecords, ref]);
    toast.success("已添加引用记录");
  };

  /* ─── 构建数据 ─── */
  const buildData = () => ({
    task_name: taskName,
    time_type: timeType,
    task_mode: taskMode,
    periodic_config: timeType === "periodic" ? { type: periodType } : null,
    form_columns: formColumns,
    workflow_nodes: taskMode === "process" ? workflowNodes : null,
    assignee_config: taskMode === "project" ? { project_id: projectId, module_code: moduleCode } : null,
    board_records: boardRecords.length > 0 ? boardRecords : null,
    deadline_config: { due_date: dueDate || null, remind_days: Number(remindDays) || 0 },
    created_by: currentUser.id,
    created_by_name: currentUser.name,
  });

  const canSave = () => !!taskName && formColumns.length > 0 && (
    taskMode === "process" ? workflowNodes.length > 0 && workflowNodes.every(n =>
      n.node_type === "parallel" ? n.handler_ids.length > 0 : !!n.handler_id
    ) : !!projectId
  );

  const handleSave = async () => {
    if (!canSave()) return;
    setSaving(true);
    try { await onSave({ ...buildData(), status: "active" }); } finally { setSaving(false); }
  };

  const handleReset = () => {
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
  };

  /* ─── 实时预览数据 ─── */
  const previewData = {
    taskName: taskName || "—",
    dueDate: dueDate || "—",
    remindDays: remindDays !== "0" ? `提前 ${remindDays} 天` : "不提醒",
    timeType: timeType === "periodic" ? `周期性 · ${PERIOD_OPTIONS.find(p => p.value === periodType)?.label || periodType}` : "一次性",
    taskMode: MODE_OPTIONS.find(m => m.value === taskMode)?.label || taskMode,
    projectName: taskMode === "project" ? projects.find(p => p.id === projectId)?.project_name || "—" : "—",
    assignee: taskMode === "process" ? (
      workflowNodes[0]?.node_type === "parallel"
        ? workflowNodes[0]?.handler_names?.join("、") || "—"
        : workflowNodes[0]?.handler_name || "—"
    ) : "—",
    columns: formColumns.length,
    nodes: workflowNodes.length,
    boardRefs: boardRecords.length,
    subtasks: formColumns.map(c => c.label).slice(0, 5),
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 标题栏 */}
      <div className="shrink-0 bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-black">
                <FileText className="w-5 h-5 text-orange-500" />
                发布新任务
              </h2>
              <p className="text-xs text-black mt-0.5">创建任务定义，设计表单字段与工作流</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-black">草稿箱 (2)</span>
          </div>
        </div>
      </div>

      {/* 主区域：两栏布局 */}
      <div className="flex-1 flex overflow-hidden">
          {/* 左栏：表单 */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* 基本信息 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-blue-500 rounded-full" />
                <h3 className="text-sm font-bold text-black">基本信息</h3>
              </div>

              {/* 第一行：任务名称 */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-black mb-1.5 block">
                  <span className="text-red-500 mr-0.5">*</span>任务名称
                </label>
                <Input placeholder="简明扼要描述任务内容" className="h-9 text-sm" value={taskName}
                  onChange={e => setTaskName(e.target.value)} />
              </div>

              {/* 第二行：截止日期 + 提醒 + 周期类型 */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="text-xs font-semibold text-black mb-1.5 block">截止日期</label>
                  <Input type="date" className="h-9 text-sm" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-black mb-1.5 block">提前提醒</label>
                  <Select value={remindDays} onValueChange={setRemindDays}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">不提醒</SelectItem>
                      <SelectItem value="1">提前 1 天</SelectItem>
                      <SelectItem value="3">提前 3 天</SelectItem>
                      <SelectItem value="7">提前 7 天</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-black mb-1.5 block">周期类型</label>
                  <Select value={timeType} onValueChange={setTimeType}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">一次性</SelectItem>
                      <SelectItem value="periodic">周期性</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {timeType === "periodic" && (
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">重复周期</label>
                    <Select value={periodType} onValueChange={setPeriodType}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PERIOD_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {dueDate && remindDays !== "0" && (
                <p className="text-xs text-amber-600 -mt-2 mb-3 flex items-center gap-1">
                  <Clock className="w-3 h-3" />将在 {dueDate} 前 {remindDays} 天提醒
                </p>
              )}

              {/* 第三行：任务模式 */}
              <div>
                <label className="text-xs font-semibold text-black mb-2 block">
                  <span className="text-red-500 mr-0.5">*</span>任务模式
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {MODE_OPTIONS.map(opt => (
                    <div key={opt.value}
                      className={`border-2 px-4 py-3 cursor-pointer transition-all duration-200 text-center
                        ${taskMode === opt.value ? "border-blue-400 bg-blue-50" : "border-gray-100 hover:border-gray-300"}`}
                      onClick={() => {
                        setTaskMode(opt.value);
                        if (opt.value === "process" && workflowNodes.length === 0) addWorkflowNode();
                      }}
                    >
                      <div className={`text-sm font-semibold ${taskMode === opt.value ? "text-blue-700" : "text-black"}`}>{opt.label}</div>
                      <div className="text-xs text-black mt-1">{opt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* 表单设计 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-purple-500 rounded-full" />
                <h3 className="text-sm font-bold text-black">表单设计</h3>
                <Badge className="text-[11px] bg-purple-50 text-purple-600">{formColumns.length} 个字段</Badge>
              </div>

              {/* 表格 */}
              <div className="border border-gray-200 rounded-none overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-8 text-center text-[11px] font-medium text-black py-2.5">#</th>
                      <th className="text-left text-[11px] font-medium text-black py-2.5 px-2">显示标签</th>
                      <th className="text-left text-[11px] font-medium text-black py-2.5 px-2 w-[90px]">类型</th>
                      <th className="text-center text-[11px] font-medium text-black py-2.5 px-2 w-[52px]">必填</th>
                      {taskMode === "process" && (
                        <th className="text-left text-[11px] font-medium text-black py-2.5 px-2 w-[130px]">指派节点</th>
                      )}
                      <th className="text-center text-[11px] font-medium text-black py-2.5 w-10">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 新增行 */}
                    <tr className="border-b border-gray-100 bg-purple-50/30">
                      <td className="text-center text-black text-xs py-2">
                        <Plus className="w-3.5 h-3.5" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          placeholder="例如: 任务名称"
                          className="h-8 text-xs border-gray-300 bg-white"
                          value={newCol.label}
                          onChange={e => setNewCol({ ...newCol, label: e.target.value })}
                          onKeyDown={e => { if (e.key === "Enter" && newCol.label) addFormColumn(); }}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Select value={newCol.type} onValueChange={v => {
                          setNewCol({ ...newCol, type: v });
                          if (v !== "select") { setColOpts([]); setColOptInput(""); }
                        }}>
                          <SelectTrigger className="h-8 text-xs bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {COLUMN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="text-center px-2 py-1.5">
                        <input
                          type="checkbox"
                          className="rounded w-4 h-4 accent-purple-500 cursor-pointer"
                          checked={newCol.required}
                          onChange={e => setNewCol({ ...newCol, required: e.target.checked })}
                        />
                      </td>
                      {taskMode === "process" && (
                        <td className="px-2 py-1.5">
                          {workflowNodes.length > 0 ? (
                            <Select value="__all__" onValueChange={() => {}}>
                              <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="全部节点" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__all__">全部节点可填</SelectItem>
                                {workflowNodes.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-[11px] text-black">—</span>
                          )}
                        </td>
                      )}
                      <td className="text-center px-1 py-1.5">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-purple-500 hover:bg-purple-600"
                          onClick={addFormColumn}
                          disabled={!newCol.label}
                        >
                          添加
                        </Button>
                      </td>
                    </tr>

                    {/* 下拉选项的额外行 */}
                    {newCol.type === "select" && (
                      <tr className="border-b border-gray-100 bg-purple-50/20">
                        <td colSpan={taskMode === "process" ? 6 : 5} className="px-4 py-2">
                          <div className="space-y-2">
                            {/* 逐条输入选项 */}
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-black shrink-0">添加选项：</span>
                              <Input
                                placeholder="输入选项，回车确认"
                                className="h-7 text-xs flex-1 bg-white"
                                value={colOptInput}
                                onChange={e => setColOptInput(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === "Enter" && colOptInput.trim()) {
                                    e.preventDefault();
                                    const opt = colOptInput.trim();
                                    if (!colOpts.includes(opt)) {
                                      const next = [...colOpts, opt];
                                      setColOpts(next);
                                      setNewCol({ ...newCol, options: next });
                                    }
                                    setColOptInput("");
                                  }
                                }}
                              />
                              {refDataSources.length > 0 && (
                                <Popover open={showRefPicker} onOpenChange={setShowRefPicker}>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0 text-purple-600 hover:text-purple-700">
                                      从规范引用
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-64 p-2" align="end">
                                    <div className="text-[11px] text-black mb-2">选择数据源（将取其字段值作为选项）</div>
                                    <div className="max-h-48 overflow-auto space-y-0.5">
                                      {refDataSources.map((src, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center justify-between px-2 py-1.5 text-xs hover:bg-purple-50 cursor-pointer rounded"
                                          onClick={async () => {
                                            setShowRefPicker(false);
                                            try {
                                              const res = await fetch(`/api/tasks/board-records?schema=${src.schema}&table=${src.table}&_limit=50`);
                                              const json = await res.json();
                                              if (json.data && Array.isArray(json.data)) {
                                                const vals: string[] = [];
                                                for (const row of json.data) {
                                                  // Pick first string column as label
                                                  for (const [k, v] of Object.entries(row)) {
                                                    if (k === "id" || k === "created_at") continue;
                                                    if (typeof v === "string" && v.trim()) {
                                                      if (!vals.includes(v.trim())) vals.push(v.trim());
                                                      break;
                                                    }
                                                  }
                                                }
                                                const merged = [...new Set([...colOpts, ...vals])];
                                                setColOpts(merged);
                                                setNewCol({ ...newCol, options: merged });
                                                toast.success(`已导入 ${vals.length} 个选项`);
                                              }
                                            } catch (e) { toast.error("导入失败"); }
                                          }}
                                        >
                                          <span className="text-black truncate">{src.table_cn}</span>
                                          <span className="text-[10px] text-black ml-2 shrink-0">{src.table}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                            {/* 已添加的选项标签 */}
                            {colOpts.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {colOpts.map((opt, i) => (
                                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-300 text-xs text-black">
                                    {opt}
                                    <button className="text-black hover:text-red-500 ml-0.5" onClick={() => {
                                      const next = colOpts.filter((_, j) => j !== i);
                                      setColOpts(next);
                                      setNewCol({ ...newCol, options: next });
                                    }}>×</button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* 已添加字段 */}
                    {formColumns.length === 0 ? (
                      <tr>
                        <td colSpan={taskMode === "process" ? 6 : 5} className="text-center py-10 text-black">
                          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs">暂无字段，在上方添加</p>
                        </td>
                      </tr>
                    ) : (
                      formColumns.map((col, i) => (
                        <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50/70 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                          <td className="text-center text-[11px] text-black py-2.5 font-mono">{i + 1}</td>
                          <td className="px-2 py-2.5">
                            <span className="text-xs font-medium text-black">{col.label}</span>
                          </td>
                          <td className="px-2 py-2.5">
                            <Badge variant="outline" className="text-[10px] font-normal text-black">
                              {COLUMN_TYPES.find(t => t.value === col.type)?.label || col.type}
                            </Badge>
                          </td>
                          <td className="text-center px-2 py-2.5">
                            {col.required ? (
                              <span className="text-red-500 text-xs font-bold">*</span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                          {taskMode === "process" && (
                            <td className="px-2 py-2.5">
                              {workflowNodes.length > 0 ? (
                                <Select
                                  value={col.assigned_node_id || "__all__"}
                                  onValueChange={v => {
                                    const cols = [...formColumns];
                                    cols[i].assigned_node_id = v === "__all__" ? undefined : v;
                                    setFormColumns(cols);
                                  }}
                                >
                                  <SelectTrigger className="h-7 text-[10px] border-gray-200">
                                    <SelectValue placeholder="全部节点可填" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__all__">全部节点可填</SelectItem>
                                    {workflowNodes.map(n => (
                                      <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-[10px] text-black">—</span>
                              )}
                            </td>
                          )}
                          <td className="text-center px-1 py-2.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-red-50"
                              onClick={() => setFormColumns(formColumns.filter((_, j) => j !== i))}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-black hover:text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* 看板引用 */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-green-500 rounded-full" />
                  <h3 className="text-sm font-bold text-black">引用看板记录</h3>
                  <Badge className="text-[10px] bg-green-50 text-green-600">{boardRecords.length}</Badge>
                  <span className="text-[11px] text-black">(可选)</span>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs border-dashed"
                  onClick={() => setShowBoardSelector(!showBoardSelector)}>
                  <Link2 className="w-3 h-3 mr-1" />{showBoardSelector ? "关闭" : "引用记录"}
                </Button>
              </div>

              {showBoardSelector && (
                <div className="bg-gray-50/80 rounded-none p-4 mb-3 space-y-3 border border-dashed">
                  <div className="flex gap-2 flex-wrap items-end">
                    <div className="flex-1 min-w-0">
                      <label className="text-[11px] text-black mb-1 block">选择项目</label>
                      <Select value={boardSelectedProject} onValueChange={v => {
                        setBoardSelectedProject(v);
                        const proj = boardProjects.find(p => p.id === v);
                        if (proj?.project_schema) loadBoardTables(proj.project_schema);
                      }}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="选择项目..." /></SelectTrigger>
                        <SelectContent>
                          {boardProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {boardTables.length > 0 && (
                      <div>
                        <label className="text-[11px] text-black mb-1 block">选择表</label>
                        <Select value={boardSelectedTable} onValueChange={loadBoardRecords}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="选择表..." /></SelectTrigger>
                          <SelectContent>
                            {boardTables.map(t => {
                              const cnName = tableDefsMap[t.table_name];
                              return <SelectItem key={t.table_name} value={t.table_name}>{cnName ? `${cnName}` : t.table_name}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {boardLoading && <div className="text-xs text-black py-2">加载中...</div>}

                  {boardRecords2.length > 0 && (
                    <div>
                      <label className="text-[11px] text-black mb-1 block">选择记录（点击 + 选择要显示的列）</label>
                      <div className="max-h-40 overflow-auto space-y-1 border rounded-none bg-white p-1">
                        {boardRecords2.map(r => (
                          <div key={r.id} className="flex items-center justify-between text-sm hover:bg-blue-50 rounded-none px-3 py-2">
                            <span className="truncate flex-1 text-xs font-medium text-black">{getRecordDisplayLabel(r)}</span>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                              onClick={() => {
                                setColumnPickerRecord(r);
                                const cols = Object.keys(r).filter(k => !SYSTEM_COLS.includes(k)).slice(0, 5);
                                setColumnPickerSelected(new Set(cols));
                              }}>
                              <Plus className="w-3.5 h-3.5 text-blue-500" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {columnPickerRecord && (
                    <div className="border-2 border-blue-200 rounded-none p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-black">
                          选择要显示的列 — <span className="text-black font-normal text-xs">{getRecordDisplayLabel(columnPickerRecord)}</span>
                        </span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setColumnPickerRecord(null); setColumnPickerSelected(new Set()); }}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <div className="max-h-32 overflow-auto space-y-0.5 mb-3 border rounded-none p-2">
                        {Object.keys(columnPickerRecord).filter(k => !SYSTEM_COLS.includes(k)).map(col => (
                          <label key={col} className="flex items-center gap-2.5 text-xs hover:bg-blue-50 rounded-none px-2.5 py-1.5 cursor-pointer">
                            <input type="checkbox" className="rounded" checked={columnPickerSelected.has(col)}
                              onChange={() => {
                                const next = new Set(columnPickerSelected);
                                if (next.has(col)) next.delete(col); else next.add(col);
                                setColumnPickerSelected(next);
                              }} />
                            <span className="font-mono text-black">{col}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-black">已选 {columnPickerSelected.size} 列</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setColumnPickerRecord(null); setColumnPickerSelected(new Set()); }}>取消</Button>
                          <Button size="sm" className="h-7 text-xs" onClick={() => {
                            addBoardRecord(columnPickerRecord, Array.from(columnPickerSelected));
                            setColumnPickerRecord(null);
                            setColumnPickerSelected(new Set());
                          }} disabled={columnPickerSelected.size === 0}>
                            <Plus className="w-3 h-3 mr-1" />确认添加
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 已添加的看板记录 */}
              <div className="space-y-2">
                {boardRecords.map(ref => {
                  const proj = boardProjects.find(p => p.project_schema === ref.source_schema);
                  const cnTable = tableDefsMap[ref.source_table];
                  return (
                    <Card key={ref.ref_id} className="p-3 border-l-4 border-l-green-300 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-black flex items-center gap-1.5">
                          <Link2 className="w-3 h-3 text-green-500" />{ref.label}
                        </span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                          onClick={() => setBoardRecords(boardRecords.filter(r => r.ref_id !== ref.ref_id))}>
                          <Trash2 className="w-3 h-3 text-black hover:text-red-500" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px] mb-2">
                        <Badge variant="outline" className="text-[10px] font-normal">{proj?.project_name || ref.source_schema}</Badge>
                        <Badge variant="outline" className="text-[10px] font-normal">{cnTable || ref.source_table}</Badge>
                        {ref.copy_columns.map(c => <Badge key={c.source_col} variant="secondary" className="text-[10px] font-normal bg-gray-100">{c.source_col}</Badge>)}
                      </div>
                      {/* Feedback cols */}
                      {ref.feedback_columns.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {ref.feedback_columns.map((fc, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[10px] bg-blue-50 border border-blue-100 rounded-none px-2.5 py-1">
                              <span className="font-medium text-blue-700">{fc.label}</span>
                              <Badge variant="outline" className="text-[9px] font-normal">{fc.type}</Badge>
                              <span className="text-black">→ {workflowNodes.find(n => n.id === fc.assigned_node_id)?.name || "?"}</span>
                              <Button variant="ghost" size="sm" className="ml-auto h-5 w-5 p-0"
                                onClick={() => { ref.feedback_columns.splice(i, 1); setBoardRecords([...boardRecords]); }}>
                                <X className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Add feedback col */}
                      <div className="flex items-center gap-1.5 flex-wrap bg-gray-50 rounded-none p-2">
                        <Input placeholder="反馈列标签" className="h-7 text-[10px] w-24 border-dashed"
                          value={newFbCol.label}
                          onChange={e => setNewFbCol({ ...newFbCol, label: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === "Enter" && newFbCol.label && (workflowNodes.length === 0 || newFbCol.assigned_node_id)) {
                              e.preventDefault();
                              ref.feedback_columns.push({
                                target_col: `${ref.ref_id}_fb_${ref.feedback_columns.length}`,
                                label: newFbCol.label, type: newFbCol.type, required: newFbCol.required,
                                assigned_node_id: newFbCol.assigned_node_id || "",
                                options: newFbCol.options.length > 0 ? newFbCol.options : undefined,
                              });
                              setBoardRecords([...boardRecords]);
                              setNewFbCol({ label: "", type: "text", required: false, assigned_node_id: "", options: [] });
                            }
                          }} />
                        <Select value={newFbCol.type} onValueChange={v => setNewFbCol({ ...newFbCol, type: v })}>
                          <SelectTrigger className="h-7 text-[10px] w-16"><SelectValue /></SelectTrigger>
                          <SelectContent>{COLUMN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                        {workflowNodes.length > 0 && (
                          <Select value={newFbCol.assigned_node_id || ""} onValueChange={v => setNewFbCol({ ...newFbCol, assigned_node_id: v })}>
                            <SelectTrigger className="h-7 text-[10px] w-24"><SelectValue placeholder="绑定节点" /></SelectTrigger>
                            <SelectContent>
                              {workflowNodes.map((n, ni) => <SelectItem key={n.id} value={n.id}>{ni + 1}. {n.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        <Button size="sm" className="h-7 text-[10px]" variant="outline"
                          disabled={!newFbCol.label || (workflowNodes.length > 0 && !newFbCol.assigned_node_id)}
                          onClick={() => {
                            if (!newFbCol.label) return;
                            if (workflowNodes.length > 0 && !newFbCol.assigned_node_id) { toast.error("请选择绑定节点"); return; }
                            ref.feedback_columns.push({
                              target_col: `${ref.ref_id}_fb_${ref.feedback_columns.length}`,
                              label: newFbCol.label, type: newFbCol.type, required: newFbCol.required,
                              assigned_node_id: newFbCol.assigned_node_id || "",
                              options: newFbCol.options.length > 0 ? newFbCol.options : undefined,
                            });
                            setBoardRecords([...boardRecords]);
                            setNewFbCol({ label: "", type: "text", required: false, assigned_node_id: "", options: [] });
                          }}>
                          <Plus className="w-3 h-3 mr-0.5" />添加
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* 指派/绑定 */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-amber-500 rounded-full" />
                <h3 className="text-sm font-bold text-black">
                  {taskMode === "process" ? "工作流配置" : "项目绑定"}
                </h3>
              </div>

              {taskMode === "process" ? (
                <div className="space-y-3">
                  {workflowNodes.map((node, i) => {
                    const isParallel = node.node_type === "parallel";
                    const handlerCount = isParallel ? node.handler_ids.length : (node.handler_id ? 1 : 0);
                    const prevIsParallel = i > 0 && workflowNodes[i - 1].node_type === "parallel";
                    return (
                    <Card key={node.id} className={`p-3 border-2 ${i === 0 ? "border-blue-200 bg-gradient-to-r from-blue-50/30 to-white" : "border-gray-100"}`}>
                      {/* 第一行：序号 + 名称 + 模式切换 */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <div className={`w-7 h-7 rounded-none flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-blue-500 text-white" : "bg-gray-200 text-black"}`}>
                          {i + 1}
                        </div>
                        <Input className="h-8 text-xs w-24 font-medium" placeholder="节点名称" value={node.name}
                          onChange={e => {
                            const nodes = [...workflowNodes];
                            nodes[i].name = e.target.value;
                            setWorkflowNodes(nodes);
                          }} />
                        <Select value={node.node_type} onValueChange={v => {
                          const nodes = [...workflowNodes];
                          nodes[i].node_type = v as "sequential" | "parallel";
                          if (v === "sequential") {
                            // 切回单人：保留第一个 handler
                            nodes[i].handler_id = node.handler_ids[0] || "";
                            nodes[i].handler_name = node.handler_names[0] || "";
                          }
                          setWorkflowNodes(nodes);
                        }}>
                          <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sequential">单人填写</SelectItem>
                            <SelectItem value="parallel">多人填写</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1 bg-gray-100 rounded-none px-2 h-8">
                          <Clock className="w-3 h-3 text-black" />
                          <Input className="h-7 text-xs w-10 border-0 bg-transparent p-0" type="number" placeholder="48" value={node.deadline_hours || ""}
                            onChange={e => { const nodes = [...workflowNodes]; nodes[i].deadline_hours = Number(e.target.value); setWorkflowNodes(nodes); }} />
                          <span className="text-[10px] text-black">h</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 ml-auto"
                          onClick={() => setWorkflowNodes(workflowNodes.filter((_, j) => j !== i))}>
                          <Trash2 className="w-3.5 h-3.5 text-black hover:text-red-500" />
                        </Button>
                      </div>

                      {/* 第二行：处理人选择 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-black shrink-0">处理人:</span>
                        {isParallel ? (
                          <>
                            {/* 已选处理人标签 */}
                            {node.handler_ids.map((hid, hi) => {
                              const u = systemUsers.find((u: any) => u.id === hid);
                              return (
                                <span key={hid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-200 text-xs text-black">
                                  {node.handler_names[hi] || hid}
                                  {u?.department && <span className="text-black/60">·{u.department}</span>}
                                  <button className="text-black hover:text-red-500 ml-0.5" onClick={() => {
                                    const nodes = [...workflowNodes];
                                    nodes[i].handler_ids = nodes[i].handler_ids.filter((_, j) => j !== hi);
                                    nodes[i].handler_names = nodes[i].handler_names.filter((_, j) => j !== hi);
                                    setWorkflowNodes(nodes);
                                  }}>×</button>
                                </span>
                              );
                            })}
                            {/* 添加处理人按钮（多选） */}
                            <Popover open={userComboOpen === node.id} onOpenChange={o => {
                              if (o) {
                                setMultiSelectTemp([...node.handler_ids]);
                                setMultiSelectSearch("");
                                setMultiSelectDeptFilter("全部");
                              }
                              setUserComboOpen(o ? node.id : null);
                            }}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 text-xs px-2.5 font-normal border-dashed text-black">
                                  <Plus className="w-3 h-3 mr-0.5" />选择处理人
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-0" align="start">
                                <div className="p-2 border-b">
                                  <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="搜索人员姓名..."
                                    className="w-full h-8 text-xs border border-gray-200 px-2 rounded-none outline-none focus:border-blue-400"
                                    autoFocus
                                    onInput={() => {
                                      setMultiSelectSearch(searchInputRef.current?.value || "");
                                    }}
                                  />
                                </div>
                                {/* 部门筛选 */}
                                <div className="flex items-center gap-1.5 px-2 py-1.5 border-b flex-wrap">
                                  <span className="text-[10px] text-black shrink-0">部门:</span>
                                  <Select value={multiSelectDeptFilter} onValueChange={setMultiSelectDeptFilter}>
                                    <SelectTrigger className="h-6 text-[10px] w-28"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                  <span className="text-[10px] text-black ml-auto">
                                    已选 <b>{multiSelectTemp.length}</b> 人
                                  </span>
                                </div>
                                {/* 人员列表 - 使用 useMemo 预计算 */}
                                {(() => {
                                  const s = multiSelectSearch.toLowerCase();
                                  const filtered = systemUsers.filter((u: any) => {
                                    if (multiSelectDeptFilter !== "全部" && u.department !== multiSelectDeptFilter) return false;
                                    if (s) {
                                      const name = (u.name || "").toLowerCase();
                                      const dept = (u.department || "").toLowerCase();
                                      if (!name.includes(s) && !dept.includes(s)) return false;
                                    }
                                    return true;
                                  });
                                  return (
                                    <div className="max-h-48 overflow-y-auto p-1">
                                      {filtered.length === 0 ? (
                                        <div className="py-6 text-center text-xs text-black">未找到</div>
                                      ) : (
                                        filtered.map((u: any) => {
                                          const checked = multiSelectTemp.includes(u.id);
                                          return (
                                            <label key={u.id}
                                              className={`flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-blue-50 transition-colors ${checked ? "bg-blue-50/50" : ""}`}
                                            >
                                              <input type="checkbox" className="rounded w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                                                checked={checked}
                                                onChange={() => {
                                                  if (checked) {
                                                    setMultiSelectTemp(multiSelectTemp.filter(id => id !== u.id));
                                                  } else {
                                                    setMultiSelectTemp([...multiSelectTemp, u.id]);
                                                  }
                                                }}
                                              />
                                              <span className="flex-1 text-black">{u.name}</span>
                                              {u.department && <span className="text-[10px] text-black/60">{u.department}</span>}
                                            </label>
                                          );
                                        })
                                      )}
                                    </div>
                                  );
                                })()}
                                {/* 底部按钮 */}
                                <div className="flex items-center justify-between px-3 py-2 border-t">
                                  <button className="text-[10px] text-black hover:text-blue-600"
                                    onClick={() => {
                                      const filtered = systemUsers.filter((u: any) => {
                                        if (multiSelectDeptFilter !== "全部" && u.department !== multiSelectDeptFilter) return false;
                                        if (multiSelectSearch) {
                                          const s = multiSelectSearch.toLowerCase();
                                          const name = (u.name || "").toLowerCase();
                                          const dept = (u.department || "").toLowerCase();
                                          if (!name.includes(s) && !dept.includes(s)) return false;
                                        }
                                        return true;
                                      });
                                      setMultiSelectTemp(filtered.map((u: any) => u.id));
                                    }}
                                  >全选当前</button>
                                  <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs"
                                      onClick={() => setUserComboOpen(null)}>取消</Button>
                                    <Button size="sm" className="h-7 text-xs bg-blue-500 hover:bg-blue-600"
                                      onClick={() => {
                                        const nodes = [...workflowNodes];
                                        const names = multiSelectTemp.map(id => systemUsers.find((u: any) => u.id === id)?.name || "");
                                        nodes[i].handler_ids = multiSelectTemp;
                                        nodes[i].handler_names = names;
                                        setWorkflowNodes(nodes);
                                        setUserComboOpen(null);
                                      }}
                                    >确定 ({multiSelectTemp.length})</Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </>
                        ) : (
                          /* 单人模式 */
                          <Popover open={userComboOpen === node.id} onOpenChange={o => setUserComboOpen(o ? node.id : null)}>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm"
                                className={`h-8 text-xs w-56 justify-between px-2.5 font-normal ${!node.handler_id ? "text-black border-dashed" : "border-blue-200"}`}>
                                {node.handler_id
                                  ? `${node.handler_name}${(() => { const u = systemUsers.find((u: any) => u.id === node.handler_id); return u?.department ? ` · ${u.department}` : ""; })()}`
                                  : "选择处理人"}
                                <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0" align="start">
                              <Command>
                                <CommandInput placeholder="搜索人员..." />
                                <CommandList>
                                  <CommandEmpty>未找到</CommandEmpty>
                                  <CommandGroup>
                                    {systemUsers.map((u: any) => (
                                      <CommandItem key={u.id} value={`${u.name} ${u.department || ""}`}
                                        onSelect={() => {
                                          const nodes = [...workflowNodes];
                                          nodes[i].handler_id = u.id;
                                          nodes[i].handler_name = u.name || "";
                                          setWorkflowNodes(nodes);
                                          setUserComboOpen(null);
                                        }}>
                                        <span>{u.name}</span>
                                        {u.department && <span className="text-xs text-black ml-1">({u.department})</span>}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>

                      {/* 多人模式每人填写上限 */}
                      {isParallel && handlerCount > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[11px] text-black">每人最多填写</span>
                          <Input className="h-7 text-xs w-16 text-center" type="number" min="0"
                            value={node.max_records || ""} placeholder="不限"
                            onChange={e => {
                              const nodes = [...workflowNodes];
                              nodes[i].max_records = Math.max(0, Number(e.target.value) || 0);
                              setWorkflowNodes(nodes);
                            }} />
                          <span className="text-[11px] text-black">条记录（0=不限制）</span>
                        </div>
                      )}

                      {/* 多人模式提示 */}
                      {isParallel && handlerCount > 0 && (
                        <div className="mt-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                          该节点将同时发给 <b>{handlerCount} 人</b>，每人独立填写，全部提交后进入下一节点
                        </div>
                      )}

                      {/* 汇总节点提示 */}
                      {prevIsParallel && !isParallel && (
                        <div className="mt-2 px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-[11px] text-blue-800">
                          📋 汇总节点 — 可查看前序节点所有候选人的填写结果，并可基于收集结果进行任务分配
                        </div>
                      )}

                      {/* 底部信息 */}
                      {(node.handler_id || node.handler_ids.length > 0) && (
                        <div className="mt-2 pt-2 border-t border-gray-100 text-[10px] text-black flex gap-3">
                          <span>可编辑: {node.editable_fields?.length || 0} 字段</span>
                          <span>必填: {node.required_fields?.length || 0} 字段</span>
                          <span>时限: {node.deadline_hours}h</span>
                          {isParallel && <span>每人上限: {node.max_records > 0 ? `${node.max_records}条` : "不限"}</span>}
                          <span className="ml-auto">模式: {isParallel ? `${handlerCount}人` : "单人"}</span>
                        </div>
                      )}
                    </Card>
                  );
                  })}
                  <Button size="sm" variant="outline" className="border-dashed w-full text-xs" onClick={addWorkflowNode}>
                    <Plus className="w-3.5 h-3.5 mr-1" />添加节点
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">绑定项目</label>
                    <Select value={projectId} onValueChange={setProjectId}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="选择项目..." /></SelectTrigger>
                      <SelectContent>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-black mb-1.5 block">模块代码</label>
                    <Input className="h-9 text-sm" placeholder="例如: procurement" value={moduleCode} onChange={e => setModuleCode(e.target.value)} />
                  </div>
                </div>
              )}
            </section>

            {/* 操作按钮 */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Button className="h-10 px-6"
                onClick={handleSave} disabled={saving || !canSave()}>
                <Send className="w-4 h-4 mr-1.5" />{saving ? "发布中..." : initialData ? "更新并发布" : "发布任务"}
              </Button>
              <Button variant="outline" className="h-10"
                onClick={() => {
                  setSaving(true);
                  onSave({ ...buildData(), status: "draft" }).finally(() => setSaving(false));
                }}
                disabled={saving || !taskName}>
                <Save className="w-4 h-4 mr-1.5" />保存草稿
              </Button>
              <Button variant="ghost" className="h-10 text-red-500 hover:text-red-700" onClick={handleReset}>
                <RotateCcw className="w-4 h-4 mr-1.5" />重置
              </Button>
            </div>
          </div>

          {/* 右栏：预览 + 最近发布 */}
          <div className="w-[320px] shrink-0 border-l bg-gray-50/50 overflow-y-auto px-4 py-5 space-y-4">
            {/* 实时预览 */}
            <div className="bg-white rounded-none border border-gray-200 p-4">
              <h4 className="text-sm font-bold text-black mb-3 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-black" />实时预览
              </h4>
              <div className="space-y-2.5">
                {[
                  { label: "任务名称", value: previewData.taskName },
                  { label: "截止日期", value: previewData.dueDate, highlight: true },
                  { label: "周期类型", value: previewData.timeType },
                  { label: "提前提醒", value: previewData.remindDays },
                  { label: "任务模式", value: previewData.taskMode },
                  { label: "所属项目", value: previewData.projectName },
                  { label: "负责人", value: previewData.assignee },
                  { label: "表单字段", value: `${previewData.columns} 个` },
                  { label: "工作流节点", value: previewData.nodes > 0 ? `${previewData.nodes} 个` : "—" },
                  { label: "引用记录", value: previewData.boardRefs > 0 ? `${previewData.boardRefs} 条` : "—" },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-xs border-b border-gray-50 pb-2">
                    <span className="text-black">{item.label}</span>
                    <span className={`font-medium ${item.highlight ? "text-red-500" : "text-black"}`}>{item.value}</span>
                  </div>
                ))}
                {previewData.subtasks.length > 0 && (
                  <div>
                    <div className="text-[11px] text-black mt-1 mb-1">字段列表</div>
                    {previewData.subtasks.map((s, i) => (
                      <div key={i} className="text-[11px] text-black flex items-center gap-1.5 py-0.5">
                        <span className="w-1 h-1 rounded-full bg-gray-400" />{s}
                      </div>
                    ))}
                    {formColumns.length > 5 && (
                      <div className="text-[11px] text-black mt-0.5">...及其他 {formColumns.length - 5} 个字段</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 最近发布 */}
            <div className="bg-white rounded-none border border-gray-200 p-4">
              <h4 className="text-sm font-bold text-black mb-3 flex items-center gap-1.5">
                <List className="w-4 h-4 text-black" />最近发布
              </h4>
              <div className="space-y-2">
                {recentDefs.length > 0 ? recentDefs.map(def => (
                  <div key={def.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-none text-xs cursor-pointer hover:bg-blue-50 transition-colors">
                    <span className="flex-1 font-medium text-black truncate">{def.task_name}</span>
                    <Badge className="text-[9px] bg-green-50 text-green-600 border-0">进行中</Badge>
                  </div>
                )) : (
                  <div className="text-xs text-black text-center py-4">暂无发布记录</div>
                )}
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
