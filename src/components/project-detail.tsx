"use client";

import React, { Fragment, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft, FolderKanban, Users, Building2,
  Plus, Pencil, Check, X,
  LayoutGrid, List, Layers, Target, TrendingUp,
  DollarSign, Users as UsersIcon, MessageSquare, Shield,
  ShoppingCart, Briefcase, Archive,
  Columns3, GitBranch, FileSearch, GanttChart, Group,
  ChevronDown, ChevronRight as ChevronRightIcon,
  Settings2, Trash2, Download, Upload, Filter,
  Link as LinkIcon, Search, Table as TableIcon, Sparkles, Copy, Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Markdown } from "@/components/markdown";
import { AIPromptDialog } from "@/components/ai-prompt-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileUploadField, renderFileCellDisplay } from "@/components/file-upload-field";
import { VideoUploadField, renderVideoCellDisplay } from "@/components/video-upload-field";

// 模块定义
// 图标名称→组件映射（用于从数据库动态加载模块时匹配图标）
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Target, TrendingUp, Check, DollarSign, UsersIcon, MessageSquare, Shield,
  ShoppingCart, Briefcase, Archive, Layers, FolderKanban, Users, Building2,
  LayoutGrid, List, Columns3, GitBranch, GanttChart, Group, FileSearch,
  ArrowLeft, Plus, Pencil, X, Settings2, Trash2, Download, Upload, Filter,
};

const PROJECT_MODULES = [
  { code: "scope", name: "范围管理", icon: Target },
  { code: "schedule", name: "进度管理", icon: TrendingUp },
  { code: "quality", name: "质量管理", icon: Check },
  { code: "cost", name: "成本管理", icon: DollarSign },
  { code: "collaboration", name: "协同管理", icon: UsersIcon },
  { code: "communication", name: "沟通管理", icon: MessageSquare },
  { code: "risk", name: "风险管理", icon: Shield },
  { code: "procurement", name: "采购管理", icon: ShoppingCart },
  { code: "resource", name: "资源管理", icon: Briefcase },
  { code: "document", name: "资料管理", icon: Archive },
];

// 模块主题色映射
const MODULE_COLORS: Record<string, { bg: string; light: string; border: string; text: string; badge: string; header: string; hoverRow: string; ring: string; hex: string }> = {
  scope:         { bg: "bg-blue-500",    light: "bg-blue-50",    border: "border-blue-200",    text: "text-blue-600",    badge: "bg-blue-100 text-blue-700",    header: "bg-gradient-to-r from-blue-500 to-blue-600",    hoverRow: "hover:bg-blue-50/50",    ring: "ring-blue-200", hex: "#3b82f6" },
  schedule:      { bg: "bg-emerald-500", light: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700", header: "bg-gradient-to-r from-emerald-500 to-emerald-600", hoverRow: "hover:bg-emerald-50/50", ring: "ring-emerald-200", hex: "#10b981" },
  quality:       { bg: "bg-violet-500",  light: "bg-violet-50",  border: "border-violet-200",  text: "text-violet-600",  badge: "bg-violet-100 text-violet-700",  header: "bg-gradient-to-r from-violet-500 to-violet-600",  hoverRow: "hover:bg-violet-50/50", ring: "ring-violet-200", hex: "#8b5cf6" },
  cost:          { bg: "bg-amber-400",   light: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-500",   badge: "bg-amber-50 text-amber-600",    header: "bg-gradient-to-r from-amber-300 to-amber-400",   hoverRow: "hover:bg-amber-50/50", ring: "ring-amber-200", hex: "#fbbf24" },
  collaboration: { bg: "bg-cyan-500",    light: "bg-cyan-50",    border: "border-cyan-200",    text: "text-cyan-600",    badge: "bg-cyan-100 text-cyan-700",     header: "bg-gradient-to-r from-cyan-500 to-cyan-600",     hoverRow: "hover:bg-cyan-50/50", ring: "ring-cyan-200", hex: "#06b6d4" },
  communication: { bg: "bg-pink-400",    light: "bg-pink-50",    border: "border-pink-200",    text: "text-pink-500",    badge: "bg-pink-50 text-pink-600",      header: "bg-gradient-to-r from-pink-300 to-pink-400",      hoverRow: "hover:bg-pink-50/50", ring: "ring-pink-200", hex: "#f472b6" },
  risk:          { bg: "bg-red-500",     light: "bg-red-50",     border: "border-red-200",     text: "text-red-600",     badge: "bg-red-100 text-red-700",       header: "bg-gradient-to-r from-red-500 to-red-600",       hoverRow: "hover:bg-red-50/50", ring: "ring-red-200", hex: "#ef4444" },
  procurement:   { bg: "bg-orange-400",  light: "bg-orange-50",  border: "border-orange-200",  text: "text-orange-500",  badge: "bg-orange-50 text-orange-600",  header: "bg-gradient-to-r from-orange-300 to-orange-400", hoverRow: "hover:bg-orange-50/50", ring: "ring-orange-200", hex: "#fb923c" },
  resource:      { bg: "bg-teal-500",    light: "bg-teal-50",    border: "border-teal-200",    text: "text-teal-600",    badge: "bg-teal-100 text-teal-700",     header: "bg-gradient-to-r from-teal-500 to-teal-600",     hoverRow: "hover:bg-teal-50/50", ring: "ring-teal-200", hex: "#14b8a6" },
  document:      { bg: "bg-indigo-500",  light: "bg-indigo-50",  border: "border-indigo-200",  text: "text-indigo-600",  badge: "bg-indigo-100 text-indigo-700", header: "bg-gradient-to-r from-indigo-500 to-indigo-600", hoverRow: "hover:bg-indigo-50/50", ring: "ring-indigo-200", hex: "#6366f1" },
};

const getModuleColor = (code: string) => MODULE_COLORS[code] || MODULE_COLORS.scope;

interface ProjectDetailProps {
  project: {
    id: string;
    project_name: string;
    project_code: string;
    project_type: string;
    project_stage: string;
    project_schema: string;
    status: string;
    created_at: string;
    customer_info?: {
      company_name?: string;
      contact_person?: string;
      contact_phone?: string;
      contact_email?: string;
    };
    channel_info?: Array<{
      company_name: string;
      contact_person?: string;
      contact_phone?: string;
    }>;
    procurement_modules?: string[];
    description?: string;
  };
  projectTypes: { code: string; name: string }[];
  projectStages: { code: string; name: string }[];
  onBack: () => void;
  onSwitchLayout?: (mode: "management" | "stage") => void;
}

interface ColumnConfig {
  key: string; // 列标识，等同于 name
  name: string;
  label: string;
  type: string;
  required: boolean;
  readonly?: boolean;
  options?: string[];
  data_source?: string;
  allow_custom?: boolean;
  calc_left_col?: string;
  calc_operator?: string;
  calc_right_col?: string;
  calc_sum?: boolean;
  calc_format?: string;
  quick_inputs?: string[];
  multiple?: boolean;
  display_mode?: "dropdown" | "checkbox" | "project" | "system";
  max_size?: string; // 视频最大文件大小: "100MB" / "500MB" / "1GB"
  max_count?: number; // 视频最多上传个数
  reference_config?: {
    source_table_code: string;
    source_column: string;
    match_field?: string;
  };
}

interface TableDefinition {
  id: string;
  table_code: string;
  table_name: string;
  module_codes: string[];
  allow_add?: boolean;
  readonly_mode?: "and" | "or";
  columns_config: ColumnConfig[];
  references_config?: Array<{
    id: string;
    name: string;
    source_table_code: string;
    match_condition: { target_column: string; source_column: string };
    column_mapping: Array<{ target_column: string; source_column: string }>;
    filter_condition?: Array<{ column: string; operator: string; value: string }>;
    bidirectional: boolean;
    entry_column: string;
  }>;
}

interface TableData {
  id: string;
  [key: string]: unknown;
}

function dedupeColumnsByName(columns: ColumnConfig[]): ColumnConfig[] {
  const seen = new Set<string>();
  return columns.filter((col) => {
    if (seen.has(col.name)) return false;
    seen.add(col.name);
    return true;
  });
}

// 采购模块搜索选择组件
function ProcurementModuleSelect({
  col,
  value,
  onChange,
  projectModules,
  systemModules,
}: {
  col: ColumnConfig;
  value: string;
  onChange: (val: string) => void;
  projectModules: string[];
  systemModules: string[];
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const isMultiple = col.multiple || false;
  const isSystem = col.display_mode === "system";
  const modules = [...new Set(isSystem ? systemModules : projectModules)];
  const filtered = modules.filter((m: string) => m.toLowerCase().includes(search.toLowerCase()));

  const currentValues: string[] = (() => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value) {
      if (value.startsWith("[") || value.includes(",")) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed;
        } catch { /* ignore */ }
        return value.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
      return [value];
    }
    return [];
  })();

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
    setDropdownOpen(true);
  };

  const handleSelect = (mod: string) => {
    if (isMultiple) {
      const exists = currentValues.includes(mod);
      const newValues = exists
        ? currentValues.filter((v: string) => v !== mod)
        : [...currentValues, mod];
      onChange(newValues.join(","));
    } else {
      onChange(mod);
      setDropdownOpen(false);
      setSearch("");
    }
  };

  return (
    <div className="relative w-full">
      <Button
        ref={triggerRef}
        variant="outline"
        type="button"
        className="h-7 text-sm w-full min-w-[120px] justify-between font-normal"
        onClick={openDropdown}
      >
        <span className="truncate">
          {currentValues.length > 0
            ? (isMultiple ? currentValues.join(", ") : currentValues[0])
            : `选择${isSystem ? "系统产品模块" : "项目采购模块"}...`}
        </span>
        <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
      </Button>
      {dropdownOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          data-procurement-dropdown-menu
          className="fixed z-[99999] w-[280px] rounded-md border bg-popover shadow-lg"
          style={{ top: dropdownPos.top, left: dropdownPos.left }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b">
            <Input
              placeholder="搜索模块..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3">
                {search ? "无匹配模块" : isSystem ? "暂无系统产品模块" : "当前项目无采购模块"}
              </div>
            ) : (
              filtered.map((mod: string) => {
                const isSelected = currentValues.includes(mod);
                return (
                  <div
                    key={mod}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm cursor-pointer hover:bg-accent ${isSelected ? "bg-accent/50" : ""}`}
                    onClick={() => handleSelect(mod)}
                  >
                    {isMultiple ? (
                      <Checkbox checked={isSelected} className="h-3.5 w-3.5" />
                    ) : (
                      <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-primary" : "border-muted-foreground/30"}`}>
                        {isSelected && <div className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                    )}
                    <span className="truncate">{mod}</span>
                  </div>
                );
              })
            )}
          </div>
          {isMultiple && currentValues.length > 0 && (
            <div className="border-t p-1">
              <button
                type="button"
                className="w-full text-center rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                onClick={() => { onChange(""); setDropdownOpen(false); setSearch(""); }}
              >
                清除选择
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export function ProjectDetail({
  project,
  projectTypes,
  projectStages,
  onBack,
  onSwitchLayout,
}: ProjectDetailProps) {
  const [activeModule, setActiveModule] = useState("scope");
  
  // 动态模块列表（根据项目类型+阶段从API获取）
  const [enabledModules, setEnabledModules] = useState<{code: string; name: string; icon: React.ComponentType<{className?: string}>}[]>(PROJECT_MODULES as {code: string; name: string; icon: React.ComponentType<{className?: string}>}[]);
  
  // 表定义和数据状态
  const [tableDefinitions, setTableDefinitions] = useState<TableDefinition[]>([]);
  const [tableDataMap, setTableDataMap] = useState<Record<string, TableData[]>>({});
  const [loading, setLoading] = useState(true);

  // 当前选中的表（侧边栏导航用）
  const [selectedTableCode, setSelectedTableCode] = useState<string | null>(null);
  const prevModuleRef = useRef<string | null>(null);

  // 关联的流程任务
  const [linkedTasksMap, setLinkedTasksMap] = useState<Record<string, any[]>>({});
  const [linkedTasksOpen, setLinkedTasksOpen] = useState<string | null>(null);

  // AI 分析状态
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ analysis: string; tableCount: number; totalRows: number } | null>(null);
  const [aiError, setAiError] = useState("");
  const [aiAnalyzingTable, setAiAnalyzingTable] = useState("");
  const [aiConversationHistory, setAiConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [aiFollowUpQuestion, setAiFollowUpQuestion] = useState("");
  const [aiFollowUpLoading, setAiFollowUpLoading] = useState(false);
  const [aiPromptDialogOpen, setAiPromptDialogOpen] = useState(false);
  const [aiPendingTableCode, setAiPendingTableCode] = useState<string>("");
  const [aiCustomSystemMessage, setAiCustomSystemMessage] = useState("");
  const [aiCustomUserPrompt, setAiCustomUserPrompt] = useState("");

  // AI 按钮 → 打开提示词对话框
  const openAIPromptDialog = useCallback((tableCode?: string) => {
    setAiPendingTableCode(tableCode || "");
    setAiPromptDialogOpen(true);
  }, []);

  // 提示词对话框 → 执行分析
  const handleAIPromptSubmit = useCallback((result: { systemMessage: string; userPrompt: string; templateId?: string }) => {
    setAiCustomSystemMessage(result.systemMessage);
    setAiCustomUserPrompt(result.userPrompt);
    setAiPromptDialogOpen(false);
    // 触发分析
    handleAIAnalysis(aiPendingTableCode || undefined, result.systemMessage, result.userPrompt);
  }, [aiPendingTableCode]);

  const handleAIAnalysis = useCallback(async (tableCode?: string, customSystem?: string, customUserPrompt?: string) => {
    setAiDialogOpen(true);
    setAiLoading(true);
    setAiResult(null);
    setAiError("");
    setAiAnalyzingTable(tableCode || "");
    setAiConversationHistory([]);
    setAiFollowUpQuestion("");

    try {
      const res = await fetch("/api/ai/analyze-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSchema: project.project_schema,
          projectName: project.project_name,
          moduleName: activeModule,
          tableCode: tableCode || undefined,
          ...(customSystem ? { systemMessage: customSystem } : {}),
          ...(customUserPrompt ? { userPrompt: customUserPrompt } : {}),
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        if (json.code === "NO_KEY") {
          setAiError("NO_KEY");
        } else {
          setAiError(json.error || "分析失败");
        }
        return;
      }

      if (json.data) {
        setAiResult({
          analysis: json.data.analysis || "",
          tableCount: json.data.tableCount || 0,
          totalRows: json.data.totalRows || 0,
        });
        if (json.data.conversationHistory) {
          setAiConversationHistory(json.data.conversationHistory);
        }
      }
    } catch (e) {
      setAiError(String(e));
    } finally {
      setAiLoading(false);
    }
  }, [project.project_schema, activeModule]);

  const handleAIFollowUp = useCallback(async () => {
    const q = aiFollowUpQuestion.trim();
    if (!q || aiConversationHistory.length === 0) return;

    setAiFollowUpLoading(true);
    setAiFollowUpQuestion("");

    // 乐观更新：先显示用户问题
    const updatedHistory = [
      ...aiConversationHistory,
      { role: "user", content: q },
    ];
    setAiConversationHistory(updatedHistory);

    try {
      const res = await fetch("/api/ai/analyze-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSchema: project.project_schema,
          question: q,
          conversationHistory: aiConversationHistory,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error || "追问失败");
        // 回滚用户消息
        setAiConversationHistory(aiConversationHistory);
        return;
      }

      if (json.data?.analysis) {
        const finalHistory = [
          ...updatedHistory,
          { role: "assistant", content: json.data.analysis },
        ];
        setAiConversationHistory(finalHistory);
        // 用最新回复更新展示
        setAiResult((prev) => prev ? { ...prev, analysis: json.data.analysis } : null);
      }
    } catch (e) {
      toast.error("追问失败: " + String(e));
      setAiConversationHistory(aiConversationHistory);
    } finally {
      setAiFollowUpLoading(false);
    }
  }, [aiFollowUpQuestion, aiConversationHistory, project.project_schema]);
  
  // 编辑状态
  const [editingCell, setEditingCell] = useState<{ tableCode: string; rowId: string; column: string } | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "compact" | "kanban" | "tree" | "form" | "gantt" | "group">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("project_detail_view_mode");
      return (saved === "card" || saved === "compact" || saved === "kanban" || saved === "tree" || saved === "form" || saved === "gantt" || saved === "group") ? saved : "compact";
    }
    return "compact";
  });
  const handleViewModeChange = useCallback((mode: typeof viewMode) => {
    setViewMode(mode);
    localStorage.setItem("project_detail_view_mode", mode);
  }, []);
  // 列宽状态：key = `${tableCode}:${colName}`, value = width in px
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("project_detail_col_widths");
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return {};
  });
  const [editValue, setEditValue] = useState<string>("");
  // 产品模块列表（系统产品模块名称，用于采购模块选择类型）
  const [productModuleNames, setProductModuleNames] = useState<string[]>([]);
  const [dictCache, setDictCache] = useState<Record<string, string[]>>({});
  const getOpts = (col: ColumnConfig) => {
    const s = col.data_source && col.data_source !== "custom" ? (dictCache[col.data_source] || []) : [];
    const c = col.options || [];
    // 懒加载字典
    if (col.data_source && col.data_source !== "custom" && !dictCache[col.data_source]) {
      const m: Record<string, string> = { project_types: "project_types", project_stages: "project_stages", project_statuses: "project_statuses", todo_statuses: "todo_statuses", customer_types: "customer_types", construction_units: "construction_units", member_role_types: "member_role_types", deployment_modes: "deployment_modes", departments: "departments", procurement_system: "product_module_types", procurement_project: "product_module_types" };
      const api = m[col.data_source];
      if (api) {
        fetch(`/api/dicts?type=${api}`).then(r => r.json()).then(d => {
          setDictCache(prev => ({ ...prev, [col.data_source!]: (d.data || []).map((i: any) => i.name || i.module_name || i.product_name || i.code) }));
        }).catch(() => {});
      }
    }
    return s.length > 0 ? (col.allow_custom ? [...new Set([...s, ...c])] : s) : c;
  };
  // 树形视图展开状态
  const [treeExpanded, setTreeExpanded] = useState<Set<string>>(new Set());
  // 树形视图迷你表格行展开详情
  const [expandedTreeRow, setExpandedTreeRow] = useState<string | null>(null);
  // 表单式视图当前记录索引
  const [formRecordIndex, setFormRecordIndex] = useState<number>(0);
  // 分组视图展开状态
  const [groupExpanded, setGroupExpanded] = useState<Set<string>>(new Set());
  const toggleGroupExpand = useCallback((key: string) => {
    setGroupExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);
  // 视图配置（每个表独立配置，持久化到 localStorage）
  const [viewSettings, setViewSettings] = useState<Record<string, Record<string, unknown>>>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("project_detail_view_settings");
      if (saved) {
        try { return JSON.parse(saved); } catch { /* ignore */ }
      }
    }
    return {};
  });
  const getTableSetting = useCallback((tableCode: string, key: string, defaultValue: unknown = undefined): unknown => {
    return viewSettings[tableCode]?.[key] ?? defaultValue;
  }, [viewSettings]);
  const setTableSetting = useCallback((tableCode: string, key: string, value: unknown) => {
    setViewSettings(prev => {
      const next = { ...prev, [tableCode]: { ...(prev[tableCode] || {}), [key]: value } };
      localStorage.setItem("project_detail_view_settings", JSON.stringify(next));
      return next;
    });
  }, []);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [currentTableForAdd, setCurrentTableForAdd] = useState<TableDefinition | null>(null);
  const [newRowData, setNewRowData] = useState<Record<string, string>>({});

  // 引用选择器状态
  const [refSelectorOpen, setRefSelectorOpen] = useState(false);
  const [refSelectorConfig, setRefSelectorConfig] = useState<{
    ref: NonNullable<TableDefinition['references_config']>[0];
    sourceTableDef: TableDefinition;
    sourceData: TableData[];
    targetTableCode: string;
    entryColumn: string;
  } | null>(null);
  const [refSelectorSearch, setRefSelectorSearch] = useState("");

  // 获取项目统计
  const projectStats = useMemo(() => {
    const totalRecords = Object.values(tableDataMap).reduce((sum, data) => sum + data.length, 0);
    return {
      totalTables: tableDefinitions.length,
      totalRecords,
    };
  }, [tableDefinitions, tableDataMap]);

  // 获取模块对应的表定义
  const moduleTables = useMemo(() => {
    return tableDefinitions.filter(t => t.module_codes.includes(activeModule));
  }, [tableDefinitions, activeModule]);

  // 模块切换或数据加载后自动选中第一个表
  useEffect(() => {
    const tables = tableDefinitions.filter(t => t.module_codes.includes(activeModule));
    if (tables.length === 0) {
      setSelectedTableCode(null);
      return;
    }
    // 模块切换 或 当前选中不在模块内 → 选第一个
    if (
      prevModuleRef.current !== activeModule ||
      (selectedTableCode && !tables.some(t => t.table_code === selectedTableCode))
    ) {
      setSelectedTableCode(tables[0].table_code);
    }
    // 初次加载且尚未选中 → 选第一个
    if (prevModuleRef.current === null && !selectedTableCode) {
      setSelectedTableCode(tables[0].table_code);
    }
    prevModuleRef.current = activeModule;
  }, [activeModule, tableDefinitions, selectedTableCode]);

  // 加载表定义和数据
  useEffect(() => {
    loadTableDefinitionsAndData();
  }, [project.project_schema]);

  // 加载产品模块名称列表
  useEffect(() => {
    const fetchModuleNames = async () => {
      try {
        const res = await fetch("/api/dicts?type=product_module_types");
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const names = [...new Set(json.data.map((item: Record<string, unknown>) => item.module_name).filter(Boolean) as string[])];
          setProductModuleNames(names);
        }
      } catch { /* ignore */ }
    };
    fetchModuleNames();
  }, []);

  // 动态加载模块配置（根据项目类型+阶段）
  useEffect(() => {
    const fetchModuleConfig = async () => {
      try {
        // 1. 获取所有模块定义
        const modRes = await fetch("/api/module-types");
        const modJson = await modRes.json();
        const allModules: Array<{ code: string; name: string; icon: string; color: string; is_enabled: boolean; sort_order: number }> = modJson.data || [];
        
        // 2. 获取类型+阶段→模块配置
        const configRes = await fetch("/api/module-config");
        const configJson = await configRes.json();
        const configs: Array<{ project_type_code: string; project_stage_code: string; module_code: string; is_enabled: boolean }> = configJson.data || [];

        // 3. 获取当前项目的类型编码和阶段编码（project.project_type/project_stage 存的是 code）
        const typeCode = project.project_type;
        const stageCode = project.project_stage;

        if (typeCode && stageCode && configs.length > 0) {
          // 精细模式：按类型+阶段筛选启用的模块
          const enabledCodes = configs
            .filter(c => c.project_type_code === typeCode && c.project_stage_code === stageCode && c.is_enabled)
            .map(c => c.module_code);

          if (enabledCodes.length > 0) {
            const dynamicModules = allModules
              .filter(m => m.is_enabled && enabledCodes.includes(m.code))
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(m => {
                const IconComp = ICON_MAP[m.icon] || Target;
                return { code: m.code, name: m.name, icon: IconComp };
              });
            setEnabledModules(dynamicModules);
            if (!enabledCodes.includes(activeModule)) {
              setActiveModule(dynamicModules[0]?.code || "scope");
            }
            return;
          }
        }

        // 降级：没有配置则显示所有启用的模块
        if (allModules.length > 0) {
          const dynamicModules = allModules
            .filter(m => m.is_enabled)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map(m => {
              const IconComp = ICON_MAP[m.icon] || Target;
              return { code: m.code, name: m.name, icon: IconComp };
            });
          setEnabledModules(dynamicModules);
        }
      } catch {
        // 降级：使用硬编码模块
        setEnabledModules(PROJECT_MODULES);
      }
    };
    fetchModuleConfig();
  }, [project.project_type, project.project_stage]);

  // Fetch task center workflows linked to records in the current project tables
  const fetchLinkedTasks = async (definitions: TableDefinition[], dataMap: Record<string, TableData[]>) => {
    try {
      const schema = project.project_schema;
      const tableNames = definitions.map(d => d.table_code).filter(Boolean);
      if (tableNames.length === 0) return;

      // 批量查询：一次请求查所有表的关联流程
      const res = await fetch(`/api/tasks/by-source-record-batch?schema=${encodeURIComponent(schema)}&tables=${encodeURIComponent(tableNames.join(","))}`);
      const json = await res.json();
      if (!json.data || Object.keys(json.data).length === 0) return;

      const newMap: Record<string, any[]> = {};
      // json.data 格式: { tableName: [{ def_id, task_name, referenced_record_ids, instances, ... }] }
      for (const tableEntries of Object.values(json.data) as any[]) {
        for (const defEntry of tableEntries) {
          for (const recordId of defEntry.referenced_record_ids || []) {
            if (!newMap[recordId]) newMap[recordId] = [];
            newMap[recordId].push(defEntry);
          }
        }
      }

      setLinkedTasksMap(newMap);
    } catch (err) {
      console.error("加载关联流程失败:", err);
    }
  };

  const loadTableDefinitionsAndData = async () => {
    setLoading(true);
    try {
      // 1. 获取表定义
      const defResponse = await fetch("/api/standards");
      const defData = await defResponse.json();
      
      if (defData.data) {
        const definitions = (defData.data as Record<string, unknown>[])
          .filter((d) => !String(d.table_code || "").startsWith("task_"))
          .map((d) => ({
            id: d.id as string,
            table_code: d.table_code as string,
            table_name: d.table_name as string,
            module_codes: (d.module_type as string[]) || [],
            allow_add: d.allow_add as boolean | undefined,
            readonly_mode: d.readonly_mode as ("and" | "or") | undefined,
            columns_config: dedupeColumnsByName(d.columns_config as ColumnConfig[]).map(col => ({ ...col, key: col.key || col.name })),
            references_config: d.references_config as TableDefinition['references_config'],
          }));

        // 检测含有采购模块记录类型列的表，自动设置 allow_add = false
        definitions.forEach((def: TableDefinition) => {
          if (def.columns_config.some((col: ColumnConfig) => col.type === "procurement_record")) {
            def.allow_add = false;
          }
        });

        // 查询 schema 中实际存在的表，只展示规则匹配创建的表
        const existingTableSet = new Set<string>();
        try {
          const existingRes = await fetch(`/api/project-data/tables?schema=${encodeURIComponent(project.project_schema)}`);
          const existingData = await existingRes.json();
          if (existingData.tables && Array.isArray(existingData.tables)) {
            existingData.tables.forEach((t: string) => existingTableSet.add(t));
          }
        } catch {
          // 查不到就不过滤
        }
        const visibleDefs = existingTableSet.size > 0
          ? definitions.filter((def: TableDefinition) => existingTableSet.has(def.table_code))
          : definitions;

        setTableDefinitions(visibleDefs);

        // 并获取数据
        const dataMap: Record<string, TableData[]> = {};
        // 并行获取所有表数据
        const dataResults = await Promise.all(
          visibleDefs.map((def: TableDefinition) =>
            fetch(
              `/api/project-data?projectSchema=${project.project_schema}&tableCode=${def.table_code}`
            )
              .then((r) => r.json())
              .then((r) => ({ code: def.table_code, data: r.data || [] }))
              .catch(() => ({ code: def.table_code, data: [] }))
          )
        );
        for (const result of dataResults) {
          dataMap[result.code] = result.data;
        }

        // 3. 同步采购模块记录：对于含有 procurement_record 类型列的表，
        //    确保每个采购模块都有一条对应记录
        await sortProcurementModuleRecords(visibleDefs, dataMap);

        // 4. 触发引用关系双向同步
        const hasReferences = visibleDefs.some((def: TableDefinition) =>
          def.references_config && def.references_config.length > 0
        );
        if (hasReferences) {
          try {
            await fetch("/api/project-data/sync-references", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectSchema: project.project_schema }),
            });
            // 同步后重新获取相关表数据
            const refTableCodes = new Set<string>();
            visibleDefs.forEach((def: TableDefinition) => {
              if (def.references_config?.length) refTableCodes.add(def.table_code);
              def.references_config?.forEach(ref => refTableCodes.add(ref.source_table_code));
            });
            for (const tc of refTableCodes) {
              const res = await fetch(
                `/api/project-data?projectSchema=${project.project_schema}&tableCode=${tc}`
              );
              const r = await res.json();
              dataMap[tc] = r.data || [];
            }
          } catch (err) {
            console.error("引用同步失败:", err);
          }
        }

        setTableDataMap(dataMap);

        // Fetch linked task center workflows for records in these tables
        fetchLinkedTasks(visibleDefs, dataMap);
      }
    } catch (error) {
      console.error("加载数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 同步采购模块记录
  const sortProcurementModuleRecords = async (
    definitions: TableDefinition[],
    dataMap: Record<string, TableData[]>
  ) => {
    const procurementModules = project.procurement_modules || [];
    if (procurementModules.length === 0) return;

    // 获取产品模块详情（含排序信息）
    let moduleDetails: Array<{ code: string; sort_order: number }> = [];
    try {
      const modRes = await fetch("/api/dicts?type=product_module_types");
      const modJson = await modRes.json();
      if (modJson.data && Array.isArray(modJson.data)) {
        moduleDetails = modJson.data.map((item: Record<string, unknown>) => ({
          code: String(item.code || ""),
          sort_order: Number(item.sort_order || 0),
        }));
      }
    } catch { /* ignore */ }

    // 找出含有 procurement_record 类型列的表，按模块排序
    const pmrTables = definitions.filter(def =>
      def.columns_config.some(col => col.type === "procurement_record")
    );

    for (const table of pmrTables) {
      const existingData = dataMap[table.table_code] || [];
      const pmrCol = table.columns_config.find(col => col.type === "procurement_record");
      if (!pmrCol) continue;

      // 只做排序，不做插入（插入由后端 ensure-table 和项目编辑API负责）
      existingData.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aCode = String(a._module_code || a[pmrCol.name] || "");
        const bCode = String(b._module_code || b[pmrCol.name] || "");
        const aSort = moduleDetails.find(m => m.code === aCode)?.sort_order ?? 999;
        const bSort = moduleDetails.find(m => m.code === bCode)?.sort_order ?? 999;
        return aSort - bSort;
      });
    }
  };

  // 开始编辑单元格
  const startEdit = (tableCode: string, rowId: string, column: string, value: unknown) => {
    if (isCellReadonly(tableCode, rowId, column)) return;
    setEditingCell({ tableCode, rowId, column });
    setEditValue(String(value ?? ""));
  };

  // 简易编辑入口（自动从数据中取值）
  // 判断某列在某行是否只读（AND/OR 模式）
  const isCellReadonly = (tableCode: string, rowId: string, column: string): boolean => {
    const table = tableDefinitions.find(t => t.table_code === tableCode);
    if (!table) return false;
    const col = table.columns_config.find(c => (c.key || c.name) === column);
    if (!col?.readonly) return false; // 列未设只读 → 可编辑

    const data = tableDataMap[tableCode] || [];
    const row = data.find(r => r.id === rowId);
    const rowReadonly = row?._readonly === true;
    const isOrMode = table.readonly_mode === "or";

    if (isOrMode) return true;      // OR 模式: 列只读即锁定
    return rowReadonly;             // AND 模式: 列只读 + 行只读才锁定
  };

  // 判断整行是否全部锁定（用于决定是否隐藏编辑按钮）
  const isRowReadonly = (tableCode: string, rowId: string): boolean => {
    const table = tableDefinitions.find(t => t.table_code === tableCode);
    if (!table) return false;

    const data = tableDataMap[tableCode] || [];
    const row = data.find(r => r.id === rowId);
    const rowReadonly = row?._readonly === true;
    const isOrMode = table.readonly_mode === "or";

    if (isOrMode && rowReadonly) return true;  // OR: 行只读 → 全行锁定
    if (!isOrMode && rowReadonly && table.columns_config.every(c => c.readonly)) {
      return true;  // AND: 全部列只读 + 行只读 → 全行锁定
    }
    return false;
  };

  const startEditCell = (tableCode: string, rowId: string, column: string) => {
    if (isCellReadonly(tableCode, rowId, column)) return;
    const data = tableDataMap[tableCode] || [];
    const row = data.find((r: Record<string, unknown>) => r.id === rowId);
    const value = row ? String(row[column] ?? "") : "";
    setEditingCell({ tableCode, rowId, column });
    setEditValue(value);
  };

  // 保存编辑
  const saveEdit = async (overrideValue?: string) => {
    if (!editingCell) return;
    
    const { tableCode, rowId, column } = editingCell;
    const valueToSave = overrideValue !== undefined ? overrideValue : editValue;
    
    try {
      const response = await fetch("/api/project-data", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSchema: project.project_schema,
          tableCode,
          rowId,
          data: { [column]: valueToSave },
        }),
      });
      
      if (!response.ok) throw new Error("保存失败");
      
      // 更新本地状态
      setTableDataMap(prev => ({
        ...prev,
        [tableCode]: prev[tableCode].map(row => 
          row.id === rowId ? { ...row, [column]: valueToSave } : row
        ),
      }));
      
      toast.success("保存成功");
    } catch (error) {
      toast.error("保存失败");
    } finally {
      setEditingCell(null);
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  // 打开新增对话框
  const openAddDialog = (table: TableDefinition) => {
    setCurrentTableForAdd(table);
    const initialData: Record<string, string> = {};
    table.columns_config.forEach(col => {
      initialData[col.name] = "";
    });
    setNewRowData(initialData);
    setAddDialogOpen(true);
  };

  // 打开引用选择器
  const openRefSelector = async (
    ref: NonNullable<TableDefinition['references_config']>[0],
    sourceTableDef: TableDefinition,
    targetTableCode: string,
    entryColumn: string
  ) => {
    // 加载源表数据
    const res = await fetch(
      `/api/project-data?projectSchema=${project.project_schema}&tableCode=${ref.source_table_code}`
    );
    const result = await res.json();
    setRefSelectorConfig({ ref, sourceTableDef, sourceData: result.data || [], targetTableCode, entryColumn });
    setRefSelectorSearch("");
    setRefSelectorOpen(true);
  };

  // 选择源记录并填充目标表
  const handleSelectSourceRecord = async () => {
    if (!refSelectorConfig) return;
    // 此函数由用户在源表选择 Dialog 中点击确认后调用
    // 实际填充逻辑在 add dialog 中处理
    setRefSelectorOpen(false);
  };

  // 新增记录
  const handleAddRow = async () => {
    if (!currentTableForAdd) return;
    
    try {
      const response = await fetch("/api/project-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSchema: project.project_schema,
          tableCode: currentTableForAdd.table_code,
          data: newRowData,
        }),
      });
      
      const result = await response.json();

      if (!response.ok) {
        const errMsg = result?.error || `HTTP ${response.status}`;
        console.error("新增记录失败:", errMsg, result);
        throw new Error(errMsg);
      }

      // 更新本地状态（补充 data_source 和 allow_delete，后端 RETURNING * 可能不返回）
      const newRecord = { ...result.data, data_source: "manual", allow_delete: true };
      setTableDataMap(prev => ({
        ...prev,
        [currentTableForAdd.table_code]: [
          ...prev[currentTableForAdd.table_code],
          newRecord,
        ],
      }));

      toast.success("新增成功");
      setAddDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "新增失败";
      console.error("新增记录异常:", message, error);
      toast.error(message || "新增失败");
    }
  };

  // 删除记录
  const handleDeleteRow = async (tableCode: string, rowId: string) => {
    if (!confirm("确定要删除这条记录吗？")) return;
    
    try {
      const response = await fetch(
        `/api/project-data?projectSchema=${project.project_schema}&tableCode=${tableCode}&rowId=${rowId}`,
        { method: "DELETE" }
      );
      
      if (!response.ok) throw new Error("删除失败");
      
      // 更新本地状态
      setTableDataMap(prev => ({
        ...prev,
        [tableCode]: prev[tableCode].filter(row => row.id !== rowId),
      }));
      
      toast.success("删除成功");
    } catch (error) {
      toast.error("删除失败");
    }
  };

  // 获取状态标签
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
      completed: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
      paused: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
      overdue: "bg-red-100 text-red-700 ring-1 ring-red-200",
    };
    const labels: Record<string, string> = {
      active: "进行中",
      completed: "已完成",
      paused: "已暂停",
      overdue: "已逾期",
    };
    return (
      <span className={cn("px-2.5 py-1 text-xs font-semibold rounded-full", styles[status] || "bg-gray-100 text-gray-700 ring-1 ring-gray-200")}>
        {labels[status] || status}
      </span>
    );
  };

  // 渲染数据表
  // 获取选项的彩色标签样式
  const getSelectTagColor = (value: string): string => {
    const colors = [
      "bg-emerald-50 text-emerald-700 border-emerald-200",
      "bg-blue-50 text-blue-700 border-blue-200",
      "bg-violet-50 text-violet-700 border-violet-200",
      "bg-amber-50 text-amber-700 border-amber-200",
      "bg-rose-50 text-rose-700 border-rose-200",
      "bg-cyan-50 text-cyan-700 border-cyan-200",
      "bg-pink-50 text-pink-700 border-pink-200",
      "bg-teal-50 text-teal-700 border-teal-200",
    ];
    let hash = 0;
    for (let i = 0; i < value.length; i++) hash = value.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // 渲染 select 值为彩色标签
  const renderSelectTag = (value: string) => {
    if (!value || value === "-") return <span className="text-slate-400">-</span>;
    return (
      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border", getSelectTagColor(value))}>
        {value}
      </span>
    );
  };

  // 渲染多选值为多个彩色标签
  const renderMultiSelectTags = (value: string) => {
    if (!value || value === "-") return <span className="text-slate-400">-</span>;
    const values = value.split(",").map((s: string) => s.trim()).filter(Boolean);
    return (
      <div className="flex flex-wrap gap-1">
        {values.map((v: string) => (
          <span key={v} className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border", getSelectTagColor(v))}>
            {v}
          </span>
        ))}
      </div>
    );
  };

  // 渲染单元格显示值（非编辑态）
  const computeCalc = (col: ColumnConfig, row?: Record<string, unknown>, allRows?: Record<string, unknown>[]) => {
    if (col.type !== "calc" || !col.calc_left_col || !col.calc_right_col) return null;
    if (col.calc_sum && allRows) {
      let sum = 0;
      for (const r of allRows) {
        const l = Number(r[col.calc_left_col] ?? 0); const rv = Number(r[col.calc_right_col] ?? 0);
        sum += col.calc_operator === "-" ? (l - rv) : col.calc_operator === "*" ? (l * rv) : col.calc_operator === "/" ? (rv ? l / rv : 0) : (l + rv);
      }
      return sum;
    }
    if (!row) return null;
    const l = Number(row[col.calc_left_col] ?? 0); const r = Number(row[col.calc_right_col] ?? 0);
    return col.calc_operator === "-" ? (l - r) : col.calc_operator === "*" ? (l * r) : col.calc_operator === "/" ? (r ? l / r : 0) : (l + r);
  };

  const renderCellValue = (col: ColumnConfig, value: unknown, row?: Record<string, unknown>) => {
    if (col.type === "calc") {
      const result = computeCalc(col, row);
      if (result !== null) {
        const formatted = col.calc_format === "currency" ? `¥${result.toLocaleString()}` : col.calc_format === "percent" ? `${result}%` : String(result);
        return <span className="font-mono text-sm">{formatted}</span>;
      }
      return <span className="text-slate-400">-</span>;
    }
    const strValue = String(value ?? "-");
    if (col.type === "select" && getOpts(col).length > 0) {
      return value ? renderSelectTag(strValue) : <span className="text-slate-400">-</span>;
    }
    if (col.type === "multiple_select") {
      return value ? renderMultiSelectTags(strValue) : <span className="text-slate-400">-</span>;
    }
    if (col.type === "procurement_module") {
      if (!value) return <span className="text-slate-400">-</span>;
      if (col.multiple) return renderMultiSelectTags(strValue);
      return renderSelectTag(strValue);
    }
    if (["attachment"].includes(col.type)) {
      return renderFileCellDisplay(String(value ?? ""), col.type);
    }
    if (col.type === "video") {
      return renderVideoCellDisplay(String(value ?? ""));
    }
    if (col.type === "procurement_record") {
      // 采购模块记录类型：显示模块名称，带模块标识
      if (!value) return <span className="text-slate-400">-</span>;
      return (
        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
          <ShoppingCart className="h-3 w-3" />
          {strValue}
        </span>
      );
    }
    if (col.type === "date") {
      if (!value) return <span className="text-slate-400">-</span>;
      const d = new Date(String(value));
      if (isNaN(d.getTime())) return <span className="text-slate-400">-</span>;
      return d.toISOString().slice(0, 10);
    }
    return strValue;
  };

  // 渲染编辑态单元格内容
  const renderEditCell = (col: ColumnConfig, isReadonly: boolean, cellValue: unknown) => {
    // 只读列直接显示值，不可编辑
    if (isReadonly) {
      return (
        <div className="flex items-center gap-1 opacity-70">
          {renderCellValue(col, cellValue)}
          <span className="text-[10px] text-muted-foreground">(只读)</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1">
        {col.type === "multiple_select" && getOpts(col).length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {getOpts(col).map((opt: string) => {
              const currentValues: string[] = (() => {
                if (Array.isArray(editValue)) return editValue;
                if (typeof editValue === "string" && editValue) return editValue.split(",").map((s: string) => s.trim());
                return [];
              })();
              const isSelected = currentValues.includes(opt);
              return (
                <label key={opt} className="inline-flex items-center gap-1 text-xs cursor-pointer">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      const newValues = checked
                        ? [...currentValues, opt]
                        : currentValues.filter((v: string) => v !== opt);
                      setEditValue(newValues.join(","));
                    }}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        ) : col.type === "select" && getOpts(col).length > 0 ? (
          col.display_mode === "checkbox" ? (
            <RadioGroup
              value={editValue || ""}
              onValueChange={(val) => { setEditValue(val); saveEdit(val); }}
              className="flex flex-wrap gap-1.5"
            >
              {getOpts(col).map((opt: string) => (
                <div key={opt} className="flex items-center space-x-1">
                  <RadioGroupItem value={opt} id={`edit_${col.name}_${opt}`} className="h-3.5 w-3.5" />
                  <Label htmlFor={`edit_${col.name}_${opt}`} className="text-xs cursor-pointer">{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <Select value={editValue || undefined} onValueChange={(val) => { setEditValue(val); saveEdit(val); }}>
              <SelectTrigger className="h-7 text-sm w-full min-w-[80px]">
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {getOpts(col).map((opt: string) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        ) : col.type === "procurement_module" ? (
          <ProcurementModuleSelect
            col={col}
            value={editValue}
            onChange={(val) => { setEditValue(val); saveEdit(val); }}
            projectModules={project.procurement_modules || []}
            systemModules={productModuleNames}
          />
        ) : ["attachment"].includes(col.type) ? (
          <FileUploadField
            fileType={col.type}
            value={editValue || ""}
            onChange={(val) => { setEditValue(val); saveEdit(val); }}
          />
        ) : col.type === "video" ? (
          <VideoUploadField
            projectCode={project.project_code}
            value={editValue || ""}
            onChange={(val) => { setEditValue(val); saveEdit(val); }}
            maxFiles={col.max_count || 3}
            maxSizeMB={(() => { const s = col.max_size || "1GB"; if (s.includes("GB")) return parseInt(s) * 1024; return parseInt(s) || 1024; })()}
          />
        ) : col.type === "date" ? (
          <Input
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); }}
            className="h-7 text-sm"
            autoFocus
          />
        ) : col.type === "text" && (col.quick_inputs || []).length > 0 ? (
          <div className="flex items-center gap-1 flex-1">
            {(col.quick_inputs || []).map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => { setEditValue(phrase); saveEdit(phrase); }}
                className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded-full border border-green-200 hover:bg-green-100 hover:border-green-300 transition-colors whitespace-nowrap"
              >
                {phrase}
              </button>
            ))}
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
              className="h-7 text-sm flex-1"
              autoFocus
            />
          </div>
        ) : (
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
            className="h-7 text-sm"
            autoFocus
          />
        )}
        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => saveEdit()}>
          <Check className="w-3 h-3 text-green-600" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={cancelEdit}>
          <X className="w-3 h-3 text-red-600" />
        </Button>
      </div>
    );
  };

  // 视图模式切换按钮
  const renderViewModeSwitcher = (table?: TableDefinition) => {
    const modes = [
      { key: "compact" as const, label: "表格", icon: List },
      { key: "card" as const, label: "卡片", icon: LayoutGrid },
      { key: "kanban" as const, label: "看板", icon: Columns3 },
      { key: "tree" as const, label: "树形", icon: GitBranch },
      { key: "form" as const, label: "表单", icon: FileSearch },
      { key: "gantt" as const, label: "甘特", icon: GanttChart },
      { key: "group" as const, label: "分组", icon: Group },
    ];
    // 判断当前视图是否有可配置项
    const configurableViews = ["kanban", "group", "gantt", "compact", "tree"];
    const hasSettings = configurableViews.includes(viewMode);

    return (
      <div className="flex items-center gap-px bg-slate-100/80 p-0.5 flex-wrap justify-center">
        {modes.map(({ key, label }) => (
          <button
            key={key}
            className={cn(
              "px-2 py-1 text-[11px] leading-tight font-medium transition-all whitespace-nowrap text-center",
              viewMode === key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            )}
            onClick={() => handleViewModeChange(key)}
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => openAIPromptDialog()}
          className="px-2 py-1 text-[11px] leading-tight font-medium transition-all whitespace-nowrap text-center text-teal-600 hover:bg-teal-50 flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />
          AI 分析
        </button>
      </div>
    );
  };

  /** 视图配置 Popover */
  const renderViewSettingsPopover = (table?: TableDefinition) => {
    const activeTable = table;
    if (!activeTable) return null;
    const tc = activeTable.table_code;
    const cols = activeTable.columns_config || [];
    // 按类型筛选可选字段
    const selectFields = cols.filter(c => c.type === "select" || c.type === "radio" || c.type === "multiselect");
    const dateFields = cols.filter(c => c.type === "date");
    const allFields = cols;

    const renderKanbanSettings = () => {
      const current = (getTableSetting(tc, "kanban_field") as string) || (selectFields[0]?.key || selectFields[0]?.name || "");
      const displayFields = (getTableSetting(tc, "kanban_display_fields") as string[]) || [];
      const allFieldKeys = new Set(allFields.map(f => f.key || f.name));
      return (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">看板字段</Label>
            <Select value={current} onValueChange={v => setTableSetting(tc, "kanban_field", v)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="选择字段" /></SelectTrigger>
              <SelectContent>
                {selectFields.map(f => (
                  <SelectItem key={f.key || f.name} value={f.key || f.name}>{f.label || f.name}</SelectItem>
                ))}
                {selectFields.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">无选项类型字段</div>}
              </SelectContent>
            </Select>
          </div>
          <div className="border-t" />
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">显示字段</Label>
            <p className="text-[10px] text-muted-foreground">勾选要在卡片上显示的字段</p>
            <div className="max-h-[200px] overflow-y-auto space-y-1">
              {allFields.map(f => {
                const fKey = f.key || f.name;
                const groupFieldsConfigured = (getTableSetting(tc, "group_display_fields_configured") as boolean) || false;
                const checked = !groupFieldsConfigured || displayFields.includes(fKey);
                return (
                  <label key={fKey} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                    <input type="checkbox" checked={checked} className="rounded border-gray-300"
                      onChange={() => {
                        const next = checked
                          ? displayFields.filter((k: string) => k !== fKey)
                          : [...displayFields, fKey];
                        setTableSetting(tc, "kanban_display_fields", next);
                        setTableSetting(tc, "kanban_display_fields_configured", true);
                      }} />
                    <span>{f.label || f.name}</span>
                    {f.type === "select" || f.type === "radio" ? <span className="text-[9px] text-gray-400">({f.type})</span> : null}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      );
    };

    const renderGroupSettings = () => {
      const groupFields = (getTableSetting(tc, "group_fields") as string[]) || [];
      const displayFields = (getTableSetting(tc, "group_display_fields") as string[]) || [];
      // 兼容旧版单字段设置
      const legacyField = getTableSetting(tc, "group_field") as string;
      const effectiveGroupFields = groupFields.length > 0 ? groupFields : (legacyField ? [legacyField] : []);

      const addGroupField = () => {
        const used = new Set(effectiveGroupFields);
        const next = allFields.find(f => !used.has(f.key || f.name));
        if (next) {
          const newFields = [...effectiveGroupFields, next.key || next.name];
          setTableSetting(tc, "group_fields", newFields);
          // 清除旧版单字段设置
          setTableSetting(tc, "group_field", "");
        }
      };
      const removeGroupField = (idx: number) => {
        const newFields = effectiveGroupFields.filter((_: string, i: number) => i !== idx);
        setTableSetting(tc, "group_fields", newFields);
      };
      const updateGroupField = (idx: number, value: string) => {
        const newFields = [...effectiveGroupFields];
        newFields[idx] = value;
        setTableSetting(tc, "group_fields", newFields);
      };

      return (
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">分组字段（支持多个）</Label>
            {effectiveGroupFields.map((fKey: string, i: number) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-[10px] text-gray-400 shrink-0 w-4">{i + 1}.</span>
                <Select value={fKey} onValueChange={v => updateGroupField(i, v)}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="选择字段" /></SelectTrigger>
                  <SelectContent>
                    {allFields.map(f => (
                      <SelectItem key={f.key || f.name} value={f.key || f.name}>{f.label || f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeGroupField(i)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            {effectiveGroupFields.length < allFields.length && (
              <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-500 w-full" onClick={addGroupField}>+ 添加分组字段</Button>
            )}
          </div>
          <div className="border-t" />
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">显示字段</Label>
            <p className="text-[10px] text-muted-foreground">勾选要在分组内显示的字段</p>
            <div className="max-h-[160px] overflow-y-auto space-y-1">
              {allFields.map(f => {
                const fKey = f.key || f.name;
                const kanbanFieldsConfigured = (getTableSetting(tc, "kanban_display_fields_configured") as boolean) || false;
                const checked = !kanbanFieldsConfigured || displayFields.includes(fKey);
                return (
                  <label key={fKey} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5">
                    <input type="checkbox" checked={checked} className="rounded border-gray-300"
                      onChange={() => {
                        const next = checked
                          ? displayFields.filter((k: string) => k !== fKey)
                          : [...displayFields, fKey];
                        setTableSetting(tc, "group_display_fields", next);
                        setTableSetting(tc, "group_display_fields_configured", true);
                      }} />
                    <span>{f.label || f.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      );
    };

    const renderGanttSettings = () => {
      const planStartCurrent = (getTableSetting(tc, "gantt_plan_start_field") as string) || "";
      const planEndCurrent = (getTableSetting(tc, "gantt_plan_end_field") as string) || "";
      const actualStartCurrent = (getTableSetting(tc, "gantt_actual_start_field") as string) || (dateFields[0]?.key || dateFields[0]?.name || "");
      const actualEndCurrent = (getTableSetting(tc, "gantt_actual_end_field") as string) || (dateFields.length > 1 ? (dateFields[1]?.key || dateFields[1]?.name) : (dateFields[0]?.key || dateFields[0]?.name || ""));
      const groupCurrent = (getTableSetting(tc, "gantt_group_field") as string) || "";
      const progressCurrent = (getTableSetting(tc, "gantt_progress_field") as string) || "";
      const scaleCurrent = (getTableSetting(tc, "gantt_scale") as string) || "week";
      const selectFields = allFields.filter(f => f.type === 'select' || f.type === 'radio');
      const numberFields = allFields.filter(f => f.type === 'number');
      const noneOption = (key: string) => <SelectItem key={key} value={key}>不设置</SelectItem>;
      const dateSelectItems = dateFields.length === 0 
        ? <div className="px-2 py-1.5 text-xs text-muted-foreground">无日期类型字段</div>
        : dateFields.map(f => <SelectItem key={f.key || f.name} value={f.key || f.name}>{f.label || f.name}</SelectItem>);
      return (
        <div className="space-y-2">
          {/* 计划日期 - 两列 */}
          <div className="flex items-center gap-1.5 mb-0.5"><Label className="text-[10px] font-semibold text-blue-600">计划日期</Label></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">开始</Label>
              <Select value={planStartCurrent || "__none__"} onValueChange={v => setTableSetting(tc, "gantt_plan_start_field", v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="可选" /></SelectTrigger>
                <SelectContent>{noneOption("__none__")}{dateSelectItems}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">结束</Label>
              <Select value={planEndCurrent || "__none__"} onValueChange={v => setTableSetting(tc, "gantt_plan_end_field", v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="可选" /></SelectTrigger>
                <SelectContent>{noneOption("__none__")}{dateSelectItems}</SelectContent>
              </Select>
            </div>
          </div>
          {/* 实际日期 - 两列 */}
          <div className="flex items-center gap-1.5 mb-0.5"><Label className="text-[10px] font-semibold text-green-600">实际日期</Label></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">开始</Label>
              <Select value={actualStartCurrent || "__none__"} onValueChange={v => setTableSetting(tc, "gantt_actual_start_field", v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="选择" /></SelectTrigger>
                <SelectContent>{noneOption("__none__")}{dateSelectItems}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">结束</Label>
              <Select value={actualEndCurrent || "__none__"} onValueChange={v => setTableSetting(tc, "gantt_actual_end_field", v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="选择" /></SelectTrigger>
                <SelectContent>{noneOption("__none__")}{dateSelectItems}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-t" />
          {/* 分组 + 进度 - 两列 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">分组字段</Label>
              <Select value={groupCurrent || "__none__"} onValueChange={v => setTableSetting(tc, "gantt_group_field", v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="不分组" /></SelectTrigger>
                <SelectContent>
                  {noneOption("__none__")}
                  {selectFields.map(f => <SelectItem key={f.key || f.name} value={f.key || f.name}>{f.label || f.name}</SelectItem>)}
                  {selectFields.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">无选项字段</div>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-gray-500">进度字段</Label>
              <Select value={progressCurrent || "__none__"} onValueChange={v => setTableSetting(tc, "gantt_progress_field", v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="不显示" /></SelectTrigger>
                <SelectContent>
                  {noneOption("__none__")}
                  {numberFields.map(f => <SelectItem key={f.key || f.name} value={f.key || f.name}>{f.label || f.name}</SelectItem>)}
                  {numberFields.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">无数字字段</div>}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* 时间刻度 */}
          <div className="border-t" />
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-gray-500">时间刻度</Label>
            <div className="flex gap-0.5 bg-gray-100 rounded-md p-0.5">
              {(["day", "week", "month"] as const).map(s => (
                <button key={s} onClick={() => setTableSetting(tc, "gantt_scale", s)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                          scaleCurrent === s ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}>
                  {s === "day" ? "日" : s === "week" ? "周" : "月"}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">计划(浅色)和实际(深色)可同时显示，延期部分标红</p>
        </div>
      );
    };

    const renderCompactSettings = () => {
      const freezeCols = (getTableSetting(tc, "compact_freeze_cols") as number) ?? 1;
      const freezeRows = (getTableSetting(tc, "compact_freeze_rows") as number) ?? 1;
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium">冻结列数</Label>
            <Select value={String(freezeCols)} onValueChange={v => setTableSetting(tc, "compact_freeze_cols", Number(v))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {allFields.map((_, i) => (
                  <SelectItem key={i} value={String(i + 1)}>前 {i + 1} 列</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">冻结行数</Label>
            <Select value={String(freezeRows)} onValueChange={v => setTableSetting(tc, "compact_freeze_rows", Number(v))}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">表头行</SelectItem>
                <SelectItem value="2">前 2 行</SelectItem>
                <SelectItem value="3">前 3 行</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-[10px] text-muted-foreground">设置表格冻结的列数和行数</p>
        </div>
      );
    };

    const renderTreeSettings = () => {
      const level1 = (getTableSetting(tc, "tree_level1_field") as string) || "";
      const level2 = (getTableSetting(tc, "tree_level2_field") as string) || "";
      const level3 = (getTableSetting(tc, "tree_level3_field") as string) || "";
      const level4 = (getTableSetting(tc, "tree_level4_field") as string) || "";
      const levels = [level1, level2, level3, level4].filter(Boolean);
      return (
        <div className="space-y-3">
          {[{ label: "一级节点（根）", value: level1, key: "tree_level1_field" },
            { label: "二级节点", value: level2, key: "tree_level2_field" },
            { label: "三级节点", value: level3, key: "tree_level3_field" },
            { label: "四级节点", value: level4, key: "tree_level4_field" },
          ].map((item, i) => (
            <div key={item.key} className="space-y-1.5">
              <Label className="text-xs font-medium">{item.label}</Label>
              <Select value={item.value || "__none__"} onValueChange={v => setTableSetting(tc, item.key, v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="不设置" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不设置</SelectItem>
                  {allFields.map(f => (
                    <SelectItem key={f.key || f.name} value={f.key || f.name} disabled={i > 0 && !levels[i - 1]}>{f.label || f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">逐级设置树形节点字段，可只设置部分层级，未设为节点的字段在最后一级横向展示</p>
        </div>
      );
    };


    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const settingsMap: Record<string, () => any> = {
      kanban: renderKanbanSettings,
      group: renderGroupSettings,
      gantt: renderGanttSettings,
      compact: renderCompactSettings,
      tree: renderTreeSettings,
    };

    const viewLabels: Record<string, string> = {
      kanban: "看板",
      group: "分组",
      gantt: "甘特图",
      compact: "表格",
      tree: "树形",
    };

    if (!settingsMap[viewMode]) return null;
    // compact, kanban, tree, gantt have inline settings in toolbar
    if (["compact", "kanban", "tree", "gantt", "group"].includes(viewMode)) return null;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="secondary" className="h-7 bg-white/20 text-white hover:bg-white/30 border-0">
            <Settings2 className="w-3.5 h-3.5 mr-1" />
            设置
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn("p-3", viewMode === "group" ? "w-72 max-h-[70vh] overflow-y-auto" : "w-64")} align="end">
          <div className="space-y-1 mb-3">
            <h4 className="text-sm font-medium">{viewLabels[viewMode]}设置</h4>
          </div>
          {settingsMap[viewMode]?.()}
        </PopoverContent>
      </Popover>
    );
  };

  // ==================== 方案 A：卡片式行 ====================
  const renderCardView = (table: TableDefinition) => {
    const data = tableDataMap[table.table_code] || [];
    const columns = table.columns_config;
    const mc = getModuleColor(activeModule);
    const tc = table.table_code;
    const cardFieldsConfigured = (getTableSetting(tc, "card_display_fields_configured") as boolean) || false;
    const cardDisplayFields = (getTableSetting(tc, "card_display_fields") as string[]) || [];
    const visibleCols = cardFieldsConfigured && cardDisplayFields.length > 0
      ? columns.filter((c: ColumnConfig) => cardDisplayFields.includes(c.key ?? c.name))
      : columns;

    return (
      <div className="flex flex-col">
        {/* 工具栏 */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-gray-50/50">
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors",
                cardFieldsConfigured ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-200"
              )}>
                <Settings2 className="h-3 w-3" />
                显示字段
                {cardFieldsConfigured && cardDisplayFields.length > 0 && (
                  <span className="bg-blue-500 text-white text-[9px] rounded-full px-1">{cardDisplayFields.length}</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="text-[10px] text-gray-400 mb-1.5">选择卡片显示的字段</div>
              <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                {columns.map(col => {
                  const fKey = col.key ?? col.name;
                  const checked = !cardFieldsConfigured || cardDisplayFields.includes(fKey);
                  return (
                    <label key={fKey} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-xs">
                      <input type="checkbox" checked={checked} onChange={() => {
                        const next = checked
                          ? cardDisplayFields.filter((k: string) => k !== fKey)
                          : [...cardDisplayFields, fKey];
                        setTableSetting(tc, "card_display_fields", next);
                        setTableSetting(tc, "card_display_fields_configured", true);
                      }} className="rounded border-gray-300" />
                      {col.label || col.name}
                    </label>
                  );
                })}
              </div>
              {cardFieldsConfigured && (
                <button onClick={() => {
                  setTableSetting(tc, "card_display_fields", []);
                  setTableSetting(tc, "card_display_fields_configured", false);
                }} className="mt-1.5 text-[10px] text-blue-500 hover:bg-blue-50 px-2 py-0.5 rounded w-full text-left">
                  重置为全部显示
                </button>
              )}
            </PopoverContent>
          </Popover>
          <button
            onClick={() => openAIPromptDialog(table.table_code)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-teal-600 hover:bg-teal-50 transition-colors"
          >
            <Sparkles className="h-3 w-3" />AI
          </button>
        </div>
        {/* 卡片列表 */}
        <div className="space-y-3 p-2">
        {data.length === 0 ? (
          <div className={cn("px-3 py-10 text-center border border-dashed", mc.border, mc.text, "opacity-50")}>
            {table.allow_add !== false ? '暂无数据，点击上方"添加"按钮新增记录' : "暂无数据"}
          </div>
        ) : (
          data.map((row, ri) => {
            const isRowEditing = editingCell?.tableCode === table.table_code && editingCell?.rowId === row.id;
            return (
              <div key={row.id || ri} className={cn(
                "border border-slate-200/80 overflow-hidden transition-all hover:shadow-md",
                isRowEditing && "ring-2 ring-offset-1",
                isRowEditing && mc.ring
              )}>
                {/* 卡片头部：第一个字段 + 操作 */}
                <div className={cn("px-4 py-2 flex items-center justify-between", mc.bg)}>
                  <span className="font-semibold text-sm text-white">
                    {columns[0] ? String(row[columns[0].name] ?? "-") : `记录 ${row.id}`}
                  </span>
                  <div className="flex items-center gap-1">
                    {(row.data_source === "manual" || row.allow_delete !== false) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteRow(table.table_code, row.id as string)}
                      >
                        删除
                      </Button>
                    )}
                  </div>
                </div>
                {/* 卡片内容：可见字段 */}
                <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
                  {visibleCols.filter((c: ColumnConfig) => (c.key ?? c.name) !== (columns[0]?.key ?? columns[0]?.name)).map((col: ColumnConfig) => {
                    const isEditing = editingCell?.tableCode === table.table_code && 
                                     editingCell?.rowId === row.id && 
                                     editingCell?.column === col.name;
                    const isReadonly = table.readonly_mode === "or" ? (!!col.readonly || row?._readonly === true) : (!!col.readonly && row?._readonly === true);
                    return (
                      <div key={col.name} className="min-w-0">
                        <div className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                          {col.label || col.name}
                          {col.required && <span className="text-red-400">*</span>}
                          {isReadonly && <span className="opacity-60">(只读)</span>}
                        </div>
                        {isEditing ? (
                          renderEditCell(col, !!isReadonly, row[col.name])
                        ) : (
                          <div
                            className={cn(
                              "text-sm min-h-[22px]",
                              !isReadonly && "cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1"
                            )}
                            onClick={() => !isReadonly && startEdit(table.table_code, row.id as string, col.name, row[col.name])}
                          >
                            {isReadonly ? (
                              <span className="text-slate-500">{renderCellValue(col, row[col.name], row)}</span>
                            ) : (
                              <span className="flex items-center gap-1 group">
                                {renderCellValue(col, row[col.name], row)}
                                <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>
    );
  };

  // ==================== 方案 B：紧凑表格 + 圆角行 + 彩色标签 ====================
  // 列宽调整拖拽（组件级别，避免 hooks 规则违规）
  const MIN_COL_WIDTH = 60;
  const DEFAULT_COL_WIDTH = 150;
  const handleResize = useCallback((colKey: string, startWidth: number, startX: number) => {
    const onMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX;
      const newWidth = Math.max(MIN_COL_WIDTH, startWidth + diff);
      setColWidths(prev => {
        const next = { ...prev, [colKey]: newWidth };
        localStorage.setItem("project_detail_col_widths", JSON.stringify(next));
        return next;
      });
    };
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const getColWidthForTable = (tableCode: string, colName: string) => {
    const key = `${tableCode}:${colName}`;
    return colWidths[key] || DEFAULT_COL_WIDTH;
  };

  const renderCompactView = (table: TableDefinition) => {
    const data = tableDataMap[table.table_code] || [];
    const columns = table.columns_config;
    const mc = getModuleColor(activeModule);
    const FREEZE_COLS = (getTableSetting(table.table_code, "compact_freeze_cols") as number) ?? 1;
    const FREEZE_ROWS = (getTableSetting(table.table_code, "compact_freeze_rows") as number) ?? 1;

    const getColWidth = (colName: string) => getColWidthForTable(table.table_code, colName);

    // 筛选逻辑
    type FilterItem = { field: string; operator: string; value: string };
    const filters: FilterItem[] = (getTableSetting(table.table_code, "compact_filters") as FilterItem[]) || [];
    const filteredData = filters.length === 0 ? data : data.filter((row: Record<string, unknown>) => {
      return filters.every(f => {
        if (!f.field) return true;
        const val = row[f.field];
        const strVal = val == null ? "" : String(val).toLowerCase();
        const filterVal = f.value.toLowerCase();
        switch (f.operator) {
          case "contains": return strVal.includes(filterVal);
          case "excludes": return !strVal.includes(filterVal);
          case "equals": return strVal === filterVal;
          case "not_equals": return strVal !== filterVal;
          case "starts_with": return strVal.startsWith(filterVal);
          case "ends_with": return strVal.endsWith(filterVal);
          case "is_empty": return val == null || val === "";
          case "is_not_empty": return val != null && val !== "";
          default: return true;
        }
      });
    });

    return (
      <div className="flex flex-col">
        {/* 工具栏 */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-gray-50/50 flex-wrap">
          {/* 筛选按钮 */}
          <div className="relative" id={`filter-popover-${table.table_code}`}>
            <button onClick={() => {
              const el = document.getElementById(`filter-panel-${table.table_code}`);
              if (el) el.classList.toggle('hidden');
            }} className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors",
              filters.length > 0
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                : "text-gray-600 hover:bg-gray-200"
            )}>
              <Filter className="h-3 w-3" />筛选
              {filters.length > 0 && <span className="ml-0.5 bg-blue-500 text-white rounded-full w-4 h-4 text-[9px] leading-4 text-center">{filters.length}</span>}
            </button>
            {/* 筛选面板 */}
            <div id={`filter-panel-${table.table_code}`} className="hidden absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border z-50 w-[480px]">
              {(() => {
                const FILTER_OPERATORS = [
                  { value: "contains", label: "包含" },
                  { value: "excludes", label: "不包含" },
                  { value: "equals", label: "等于" },
                  { value: "not_equals", label: "不等于" },
                  { value: "starts_with", label: "开头是" },
                  { value: "ends_with", label: "结尾是" },
                  { value: "is_empty", label: "为空" },
                  { value: "is_not_empty", label: "不为空" },
                ];
                const updateFilters = (newFilters: FilterItem[]) => {
                  setTableSetting(table.table_code, "compact_filters", newFilters);
                };
                return (
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700">筛选条件</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateFilters([])} className="text-[10px] text-gray-400 hover:text-red-500">清空</button>
                        <button onClick={() => {
                          const el = document.getElementById(`filter-panel-${table.table_code}`);
                          if (el) el.classList.add('hidden');
                        }} className="text-gray-400 hover:text-gray-600 text-sm leading-none">&times;</button>
                      </div>
                    </div>
                    {filters.map((filter, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        {/* 字段选择 */}
                        <select value={filter.field} onChange={e => {
                          const next = [...filters];
                          next[idx] = { ...next[idx], field: e.target.value };
                          updateFilters(next);
                        }} className="flex-1 min-w-0 h-7 text-[11px] border rounded px-1.5 bg-white">
                          <option value="">选择字段</option>
                          {columns.map((col: ColumnConfig) => (
                            <option key={col.key ?? col.name} value={col.key ?? col.name}>{col.label || col.name}</option>
                          ))}
                        </select>
                        {/* 操作符选择 */}
                        <select value={filter.operator} onChange={e => {
                          const next = [...filters];
                          next[idx] = { ...next[idx], operator: e.target.value };
                          updateFilters(next);
                        }} className="w-[72px] h-7 text-[11px] border rounded px-1 bg-white shrink-0">
                          {FILTER_OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                        {/* 值输入 (为空/不为空时隐藏) */}
                        {filter.operator !== "is_empty" && filter.operator !== "is_not_empty" ? (
                          <input value={filter.value} onChange={e => {
                            const next = [...filters];
                            next[idx] = { ...next[idx], value: e.target.value };
                            updateFilters(next);
                          }} placeholder="筛选值" className="flex-1 min-w-0 h-7 text-[11px] border rounded px-2" />
                        ) : (
                          <div className="flex-1" />
                        )}
                        {/* 删除 */}
                        <button onClick={() => {
                          const next = filters.filter((_, i) => i !== idx);
                          updateFilters(next);
                        }} className="shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 rounded hover:bg-red-50">
                          &times;
                        </button>
                      </div>
                    ))}
                    <button onClick={() => {
                      updateFilters([...filters, { field: "", operator: "contains", value: "" }]);
                    }} className="w-full h-7 text-[11px] text-blue-600 hover:bg-blue-50 rounded border border-dashed border-blue-300">
                      + 添加筛选条件
                    </button>
                    {filters.length > 0 && (
                      <div className="text-[10px] text-gray-400 pt-1">多个条件同时满足(AND)</div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="w-px h-4 bg-gray-300" />
          <button onClick={async () => {
            try {
              const XLSX = await import("xlsx");
              const exportData = filteredData.map((row: Record<string, unknown>) => {
                const record: Record<string, string> = {};
                columns.forEach((col: ColumnConfig) => {
                  const v = row[col.key ?? col.name];
                  if (col.type === "multiselect" && Array.isArray(v)) {
                    record[col.label || col.name] = v.join(", ");
                  } else if (col.type === "boolean") {
                    record[col.label || col.name] = v === true || v === "true" ? "是" : "否";
                  } else {
                    record[col.label || col.name] = v != null ? String(v) : "";
                  }
                });
                return record;
              });
              const ws = XLSX.utils.json_to_sheet(exportData);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, table.table_name || "数据");
              XLSX.writeFile(wb, `${table.table_name || table.table_code}_数据.xlsx`);
              toast.success("导出成功");
            } catch (e) { toast.error("导出失败: " + String(e)); }
          }} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-gray-600 hover:bg-gray-200 transition-colors">
            <Download className="h-3 w-3" />导出
          </button>
          <label className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer">
            <Upload className="h-3 w-3" />导入
            <input type="file" accept=".xlsx,.xls" className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append("file", file);
                try {
                  const res = await fetch(`/api/project-data/import?projectSchema=${project.project_schema}&tableCode=${table.table_code}`, {
                    method: "POST",
                    body: formData,
                  });
                  const result = await res.json();
                  if (result.success) {
                    toast.success(`导入成功，共 ${result.imported} 条`);
                    const res2 = await fetch(`/api/project-data?projectSchema=${project.project_schema}&tableCode=${table.table_code}`);
                    const result2 = await res2.json();
                    setTableDataMap(prev => ({ ...prev, [table.table_code]: result2.data || [] }));
                  } else {
                    toast.error(result.error || "导入失败");
                  }
                } catch { toast.error("导入失败"); }
                e.target.value = "";
              }} />
          </label>
          <div className="w-px h-4 bg-gray-300" />
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                <Settings2 className="h-3 w-3" />设置
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-1 mb-3">
                <h4 className="text-sm font-medium">表格设置</h4>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">冻结列数</Label>
                  <Select value={String(FREEZE_COLS)} onValueChange={v => setTableSetting(table.table_code, "compact_freeze_cols", Number(v))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {columns.map((_, i) => (
                        <SelectItem key={i} value={String(i + 1)}>前 {i + 1} 列</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">冻结行数</Label>
                  <Select value={String(FREEZE_ROWS)} onValueChange={v => setTableSetting(table.table_code, "compact_freeze_rows", Number(v))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">表头行</SelectItem>
                      <SelectItem value="2">前 2 行</SelectItem>
                      <SelectItem value="3">前 3 行</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-muted-foreground">设置表格冻结的列数和行数</p>
              </div>
            </PopoverContent>
          </Popover>
          <button
            onClick={() => openAIPromptDialog(table.table_code)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-teal-600 hover:bg-teal-50 transition-colors"
          >
            <Sparkles className="h-3 w-3" />AI
          </button>
        </div>
        {/* 表格区域 */}
        <div className="relative overflow-auto max-h-[520px]" style={{ overscrollBehavior: "contain" }}>
        <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
          <colgroup>
            {columns.map((col) => (
              <col key={col.name} style={{ width: getColWidth(col.name) }} />
            ))}
            <col style={{ width: 80 }} />
          </colgroup>
          <thead className="sticky top-0 z-20">
            <tr className={cn("border-b-2", mc.border, mc.light)}>
              {columns.map((col, idx) => {
                const colKey = `${table.table_code}:${col.name}`;
                const isFrozen = idx < FREEZE_COLS;
                return (
                  <th key={col.name} className={cn(
                    "px-2 py-2 text-left text-xs font-semibold relative border-r border-slate-200 last:border-r-0",
                    mc.text,
                    isFrozen && "sticky left-0 z-30 border-r-2"
                  )} style={isFrozen ? { width: getColWidth(col.name) } : undefined}>
                    <div className="flex items-center gap-1 truncate">
                      <span className="truncate">{col.label || col.name}</span>
                      {col.required && <span className="text-red-400">*</span>}
                      {col.readonly && <span className="opacity-60 text-[10px]">(只读)</span>}
                    </div>
                    {/* 拖拽调整宽度的手柄 */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-300/50 z-40"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleResize(colKey, getColWidth(col.name), e.clientX);
                      }}
                    />
                  </th>
                );
              })}
              <th className="px-2 py-2 text-right text-xs font-semibold text-slate-400 border-l border-slate-200 sticky right-0 z-30 bg-slate-50">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className={cn("px-3 py-10 text-center text-sm", mc.text, "opacity-50 border-b border-slate-100")}>
                  {filters.length > 0 ? '无匹配数据，请调整筛选条件' : (table.allow_add !== false ? '暂无数据，点击上方"添加"按钮新增记录' : "暂无数据")}
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIdx) => {
                const isRowEditing = editingCell?.tableCode === table.table_code && editingCell?.rowId === row.id;
                const isFrozenRow = rowIdx < (FREEZE_ROWS - 1);
                return (
                  <tr key={row.id || rowIdx} className={cn(
                    "border-b border-slate-100 hover:bg-blue-50/40 transition-colors",
                    isRowEditing && cn(mc.ring, "ring-1 ring-inset"),
                    rowIdx % 2 === 1 && "bg-slate-50/30",
                    isFrozenRow && "sticky z-10 bg-white"
                  )} style={isFrozenRow ? { top: `${(rowIdx + 1) * 36}px` } : undefined}>
                    {columns.map((col, idx) => {
                      const isEditing = editingCell?.tableCode === table.table_code &&
                                       editingCell?.rowId === row.id &&
                                       editingCell?.column === col.name;
                      const isReadonly = table.readonly_mode === "or" ? (!!col.readonly || row?._readonly === true) : (!!col.readonly && row?._readonly === true);
                      const isFrozen = idx < FREEZE_COLS;
                      return (
                        <td key={col.name} className={cn(
                          "px-2 py-1.5 text-sm border-r border-slate-100 last:border-r-0 align-top",
                          isFrozen && "sticky left-0 z-[15] bg-white border-r-2 border-slate-200",
                          isRowEditing && isFrozen && "!bg-white",
                          isRowEditing && !isFrozen && "bg-white",
                          isFrozen && rowIdx % 2 === 1 && "!bg-slate-50"
                        )}>
                          {isEditing ? (
                            renderEditCell(col, !!isReadonly, row[col.name])
                          ) : (
                            <div
                              className={cn(
                                "min-h-[22px] whitespace-normal break-words leading-5",
                                !isReadonly && "cursor-pointer hover:bg-blue-50/80 rounded px-1 -mx-1"
                              )}
                              onClick={() => !isReadonly && startEdit(table.table_code, row.id as string, col.name, row[col.name])}
                            >
                              {isReadonly ? (
                                <span className="text-slate-500">{renderCellValue(col, row[col.name], row)}</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 group">
                                  {renderCellValue(col, row[col.name], row)}
                                  <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5 text-right border-l border-slate-100 sticky right-0 z-10 bg-white">
                      <div className="flex items-center justify-end gap-1">
                        {/* Task center workflow badge */}
                        {linkedTasksMap[row.id as string] && linkedTasksMap[row.id as string].length > 0 && (
                          <Popover open={linkedTasksOpen === `${table.table_code}:${row.id}`} onOpenChange={(o) => setLinkedTasksOpen(o ? `${table.table_code}:${row.id}` : null)}>
                            <PopoverTrigger asChild>
                              <Badge className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer border-purple-300">
                                <GitBranch className="w-3 h-3 mr-0.5" />
                                流程 ({linkedTasksMap[row.id as string].length})
                              </Badge>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" align="end">
                              <div className="p-3 border-b">
                                <span className="text-sm font-semibold">关联流程任务</span>
                              </div>
                              <div className="max-h-64 overflow-auto">
                                {linkedTasksMap[row.id as string].map((entry: any, ei: number) => {
                                  const STATUS_LABELS: Record<string, string> = {
                                    pending: "待处理", in_progress: "进行中", completed: "已完成",
                                    returned: "已退回", cancelled: "已撤回", terminated: "已终止",
                                  };
                                  const STATUS_COLORS: Record<string, string> = {
                                    pending: "bg-yellow-100 text-yellow-700",
                                    in_progress: "bg-blue-100 text-blue-700",
                                    completed: "bg-green-100 text-green-700",
                                    returned: "bg-orange-100 text-orange-700",
                                    cancelled: "bg-gray-100 text-gray-500",
                                    terminated: "bg-red-100 text-red-700",
                                  };
                                  return (
                                    <div key={ei} className="p-3 border-b last:border-b-0 hover:bg-gray-50">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-medium text-gray-800">{entry.task_name}</span>
                                        <Badge className={`text-xs ${STATUS_COLORS[entry.instances?.[0]?.status] || "bg-gray-100"}`}>
                                          {STATUS_LABELS[entry.instances?.[0]?.status] || "—"}
                                        </Badge>
                                      </div>
                                      {entry.instances && entry.instances.length > 0 && (
                                        <div className="space-y-1 mt-2">
                                          {entry.instances.slice(0, 3).map((inst: any, ii: number) => {
                                            const nodes = entry.workflow_nodes || [];
                                            const ci = inst.current_node_index ?? 0;
                                            return (
                                              <div key={ii} className="text-xs text-gray-500">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="text-gray-400">#{ii + 1}</span>
                                                  {nodes.map((n: any, ni: number) => {
                                                    const done = ni < ci || (inst.node_history || []).some((h: any) => h.node_id === n.id && h.action === "submit");
                                                    const active = ni === ci && inst.status !== "completed";
                                                    return (
                                                      <span key={n.id} className={`inline-flex items-center gap-0.5 ${done ? "text-green-600" : active ? "text-blue-600 font-medium" : "text-gray-300"}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${done ? "bg-green-400" : active ? "bg-blue-400" : "bg-gray-200"}`} />
                                                        {n.name}
                                                      </span>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            );
                                          })}
                                          {entry.instances.length > 3 && (
                                            <div className="text-xs text-gray-400">...共 {entry.instances.length} 个实例</div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                        {!isRowReadonly(table.table_code, row.id as string) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-1.5"
                          onClick={() => startEdit(table.table_code, row.id as string, columns[0]?.name || "", row[columns[0]?.name || ""])}
                        >
                          编辑
                        </Button>
                        )}
                        {(row.data_source === "manual" || row.allow_delete !== false) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-1.5"
                            onClick={() => handleDeleteRow(table.table_code, row.id as string)}
                          >
                            删除
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    );
  };

  const renderKanbanView = (table: TableDefinition) => {
    const data = tableDataMap[table.table_code] || [];
    const columns = table.columns_config;
    const mc = getModuleColor(activeModule);

    // 找到看板分组字段：优先使用设置，否则用第一个 select 类型字段
    const selectFields = columns.filter((c: ColumnConfig) => c.type === 'select' || c.type === 'radio' || c.type === 'multiselect');
    const savedField = getTableSetting(table.table_code, "kanban_field") as string;
    let groupCol = savedField ? columns.find((c: ColumnConfig) => (c.key || c.name) === savedField) : null;
    if (!groupCol && selectFields.length > 0) groupCol = selectFields[0];
    if (!groupCol) {
      return (
        <div className="text-center py-8 text-gray-500">
          需要至少一个单选字段才能使用看板视图
        </div>
      );
    }
    const groupOptions: string[] = groupCol.options || [];
    const groups = groupOptions.map((opt: string) => ({
      label: opt,
      items: data.filter((row: Record<string, unknown>) => String(row[groupCol.key] || '') === opt),
    }));
    // 未分组
    const ungrouped = data.filter((row: Record<string, unknown>) => {
      const val = String(row[groupCol.key] || '');
      return !groupOptions.includes(val);
    });
    if (ungrouped.length > 0) {
      groups.push({ label: '未分类', items: ungrouped });
    }

    const otherCols = columns.filter((c: ColumnConfig) => c.key !== groupCol.key);
    // 显示字段设置
    const kanbanFieldsConfigured = (getTableSetting(table.table_code, "kanban_display_fields_configured") as boolean) || false;
    const displayFieldKeys = (getTableSetting(table.table_code, "kanban_display_fields") as string[]) || [];
    const visibleCols = kanbanFieldsConfigured && displayFieldKeys.length > 0
      ? otherCols.filter((c: ColumnConfig) => displayFieldKeys.includes(c.key ?? c.name))
      : otherCols;

    return (
      <div className="flex flex-col">
        {/* 工具栏 */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-gray-50/50">
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors",
                kanbanFieldsConfigured ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-200"
              )}>
                <Settings2 className="h-3 w-3" />
                显示字段
                {kanbanFieldsConfigured && displayFieldKeys.length > 0 && (
                  <span className="bg-blue-500 text-white text-[9px] rounded-full px-1">{displayFieldKeys.length}</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="text-[10px] text-gray-400 mb-1.5">选择看板卡片显示的字段</div>
              <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                {otherCols.map(col => {
                  const fKey = col.key ?? col.name;
                  const checked = !kanbanFieldsConfigured || displayFieldKeys.includes(fKey);
                  return (
                    <label key={fKey} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-xs">
                      <input type="checkbox" checked={checked} onChange={() => {
                        const next = checked
                          ? displayFieldKeys.filter((k: string) => k !== fKey)
                          : [...displayFieldKeys, fKey];
                        setTableSetting(table.table_code, "kanban_display_fields", next);
                        setTableSetting(table.table_code, "kanban_display_fields_configured", true);
                      }} className="rounded border-gray-300" />
                      {col.label || col.name}
                    </label>
                  );
                })}
              </div>
              {kanbanFieldsConfigured && (
                <button onClick={() => {
                  setTableSetting(table.table_code, "kanban_display_fields", []);
                  setTableSetting(table.table_code, "kanban_display_fields_configured", false);
                }} className="mt-1.5 text-[10px] text-blue-500 hover:bg-blue-50 px-2 py-0.5 rounded w-full text-left">
                  重置为全部显示
                </button>
              )}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                <Settings2 className="h-3 w-3" />设置
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="space-y-1 mb-3">
                <h4 className="text-sm font-medium">看板设置</h4>
              </div>
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">看板分组字段</Label>
                  <Select value={groupCol.key || groupCol.name} onValueChange={v => setTableSetting(table.table_code, "kanban_field", v)}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="选择字段" /></SelectTrigger>
                    <SelectContent>
                      {columns.filter(f => f.type === 'select' || f.type === 'radio' || f.type === 'multiselect').map(f => (
                        <SelectItem key={f.key || f.name} value={f.key || f.name}>{f.label || f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <button
            onClick={() => openAIPromptDialog(table.table_code)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-teal-600 hover:bg-teal-50 transition-colors"
          >
            <Sparkles className="h-3 w-3" />AI
          </button>
        </div>
        {/* 看板列 */}
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 300 }}>
        {groups.map((group) => (
          <div key={group.label} className="flex-shrink-0 w-72">
            <div className={cn("px-3 py-2 font-semibold text-sm text-white", mc.bg)}>
              {group.label}
              <span className="ml-2 text-xs text-white/70">({group.items.length})</span>
            </div>
            <div className="bg-gray-50 p-2 space-y-2 min-h-[200px]">
              {group.items.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-400">暂无数据</div>
              )}
              {group.items.map((row: Record<string, unknown>) => {
                const rowId = String(row.id || '');
                const canDelete = row.data_source === 'manual' || row.allow_delete !== false;
                return (
                  <div key={rowId} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-default">
                    {visibleCols.map((col: ColumnConfig) => {
                      const colKey = col.key ?? col.name;
                      const isEditing = editingCell?.tableCode === table.table_code &&
                                       editingCell?.rowId === rowId &&
                                       editingCell?.column === col.name;
                      const isReadonly = table.readonly_mode === "or" ? (!!col.readonly || row?._readonly === true) : (!!col.readonly && row?._readonly === true);
                      return (
                        <div key={col.key} className="mb-1">
                          <span className="text-[10px] text-gray-400 mr-1">{col.label || col.key}:</span>
                          {isEditing ? (
                            <span className="text-xs">{renderEditCell(col, isReadonly, row[colKey])}</span>
                          ) : (
                            <span
                              className={!isReadonly ? "text-xs cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1 inline-block" : "text-xs"}
                              onClick={() => !isReadonly && startEdit(table.table_code, rowId, col.name, row[colKey])}
                            >
                              {isReadonly ? (
                                renderCellValue(col, row[colKey], row)
                              ) : (
                                <span className="group inline-flex items-center gap-1">
                                  {renderCellValue(col, row[colKey], row)}
                                  <Pencil className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0" />
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex gap-1 mt-2 pt-1 border-t border-gray-50">
                      {!isRowReadonly(table.table_code, rowId) && <button onClick={() => startEdit(table.table_code, rowId, visibleCols[0]?.name || '', row[visibleCols[0]?.key ?? visibleCols[0]?.name ?? ''])} className="text-[10px] px-2 py-0.5 rounded text-gray-500 hover:bg-gray-100">编辑</button>}
                      {canDelete && (
                        <button onClick={() => handleDeleteRow(table.table_code, rowId)} className="text-[10px] px-2 py-0.5 rounded text-red-500 hover:bg-red-50">删除</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        </div>
      </div>
    );
  };

  // ===== 树形视图 =====
  const renderTreeView = (table: TableDefinition) => {
    const data = tableDataMap[table.table_code] || [];
    const columns = table.columns_config;
    const mc = getModuleColor(activeModule);

    // 获取4级节点字段配置（可为空，表示不设置该级）
    const savedL1 = (getTableSetting(table.table_code, "tree_level1_field") as string) || "";
    const savedL2 = (getTableSetting(table.table_code, "tree_level2_field") as string) || "";
    const savedL3 = (getTableSetting(table.table_code, "tree_level3_field") as string) || "";
    const savedL4 = (getTableSetting(table.table_code, "tree_level4_field") as string) || "";

    const findCol = (key: string) => key ? columns.find((c: ColumnConfig) => (c.key || c.name) === key) : null;
    const l1Col = findCol(savedL1);
    const l2Col = findCol(savedL2);
    const l3Col = findCol(savedL3);
    const l4Col = findCol(savedL4);

    // 已设置的层级字段列表（只包含有值的）
    const activeLevels = [l1Col, l2Col, l3Col, l4Col].filter(Boolean) as ColumnConfig[];

    // 未设为节点的字段，用于叶子节点横向展示
    const levelKeys = new Set(activeLevels.map(c => c.key));
    const displayCols = columns.filter((c: ColumnConfig) => !levelKeys.has(c.key));

    // 构建树形数据结构
    interface TreeNode {
      key: string;
      label: string;
      children: TreeNode[];
      rows: Record<string, unknown>[];
    }

    const buildTree = (): TreeNode[] => {
      if (activeLevels.length === 0) {
        // 没有设置任何节点，所有数据平铺
        return [{ key: "__all__", label: "全部数据", children: [], rows: data as Record<string, unknown>[] }];
      }

      const buildLevel = (rows: Record<string, unknown>[], levels: ColumnConfig[], depth: number): TreeNode[] => {
        if (depth >= levels.length) return [];
        const col = levels[depth];
        const map = new Map<string, Record<string, unknown>[]>();
        rows.forEach((row: Record<string, unknown>) => {
          const v = String(row[col.key] || "未分组");
          if (!map.has(v)) map.set(v, []);
          map.get(v)!.push(row);
        });

        const nodes: TreeNode[] = [];
        map.forEach((subRows, val) => {
          const children = buildLevel(subRows, levels, depth + 1);
          nodes.push({
            key: val,
            label: val,
            children,
            rows: children.length === 0 ? subRows : [],
          });
        });
        return nodes;
      };

      return buildLevel(data as Record<string, unknown>[], activeLevels, 0);
    };

    const tree = buildTree();

    const toggleTree = (key: string) => {
      setTreeExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
    };

    // 层级视觉配置
    const levelConfig = [
      { indent: 12, border: mc.border, font: "font-semibold text-sm" },
      { indent: 32, border: mc.text?.replace("text-", "") || mc.border, font: "font-medium text-[13px]" },
      { indent: 52, border: "#8b5cf6", font: "font-normal text-[13px]" },
      { indent: 72, border: "#f59e0b", font: "font-normal text-xs" },
    ];

    // 渲染叶子节点的迷你表格（方案D：固定前2列+横向滚动+点击行展开详情）
    const renderMiniTable = (rows: Record<string, unknown>[], depth: number) => {
      if (displayCols.length === 0 && activeLevels.length === 0) {
        return (
          <div className="text-xs text-gray-400 py-2 pl-2">
            {rows.length} 条记录（无可显示字段）
          </div>
        );
      }

      const indent = depth > 0
        ? (levelConfig[Math.min(depth - 1, levelConfig.length - 1)]?.indent || 72) + 16
        : 12;

      // 前2列固定宽度
      const stickyWidths = [140, 140];

      return (
        <div style={{ paddingLeft: `${indent}px` }} className="pb-2">
          <div className="overflow-x-auto border rounded-md text-xs relative">
            <table className="w-full min-w-max">
              <thead>
                <tr className="bg-gray-50/80">
                  {displayCols.map((col: ColumnConfig, ci: number) => (
                    <th
                      key={col.key}
                      className={cn(
                        "px-2 py-1.5 text-left text-gray-500 font-medium whitespace-nowrap border-b",
                        ci < 2 && "sticky top-0 z-[2] bg-gray-50"
                      )}
                      style={ci < 2 ? { left: ci === 0 ? 0 : stickyWidths[0], width: stickyWidths[ci], minWidth: stickyWidths[ci] } : undefined}
                    >
                      {col.label || col.name}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-left text-gray-500 font-medium whitespace-nowrap border-b w-16 sticky top-0 z-[2] bg-gray-50"
                    style={{ left: displayCols.length >= 2 ? stickyWidths[0] + stickyWidths[1] : displayCols.length === 1 ? stickyWidths[0] : 0 }}
                  >
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: Record<string, unknown>) => {
                  const rowId = String(row.id || '');
                  const canDelete = row.data_source === 'manual' || row.allow_delete !== false;
                  const isEditing = editingCell?.tableCode === table.table_code && editingCell?.rowId === rowId;
                  const isExpanded = expandedTreeRow === rowId;

                  return (
                    <Fragment key={rowId}>
                      <tr
                        className={cn(
                          "hover:bg-gray-50/60 group/row border-b last:border-b-0",
                          isExpanded && "bg-blue-50/40"
                        )}
                        onClick={() => setExpandedTreeRow(isExpanded ? null : rowId)}
                      >
                        {displayCols.map((col: ColumnConfig, ci: number) => {
                          const cellKey = col.key ?? col.name;
                          const cellValue = row[cellKey];
                          const isEditingThis = isEditing && editingCell?.column === cellKey;
                          const isReadonlyCol = table.readonly_mode === "or" ? (!!col.readonly || row?._readonly === true) : (!!col.readonly && row?._readonly === true);
                          return (
                            <td
                              key={cellKey}
                              className={cn(
                                "px-2 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate",
                                ci < 2 && "sticky z-[1] bg-white group-hover/row:bg-gray-50/60",
                                isExpanded && ci < 2 && "!bg-blue-50/40",
                                !isReadonlyCol && "cursor-pointer"
                              )}
                              style={ci < 2 ? { left: ci === 0 ? 0 : stickyWidths[0], width: stickyWidths[ci], minWidth: stickyWidths[ci] } : undefined}
                              onDoubleClick={(e) => { e.stopPropagation(); !isReadonlyCol && startEditCell(table.table_code, rowId, cellKey); }}
                            >
                              {isEditingThis
                                ? renderEditCell(col, isReadonlyCol, cellValue)
                                : <span className={isReadonlyCol ? "text-gray-400" : ""}>{renderCellValue(col, cellValue)}</span>
                              }
                            </td>
                          );
                        })}
                        <td
                          className="px-2 py-1.5 sticky z-[1] bg-white group-hover/row:bg-gray-50/60"
                          style={{ left: displayCols.length >= 2 ? stickyWidths[0] + stickyWidths[1] : displayCols.length === 1 ? stickyWidths[0] : 0 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex gap-1 opacity-0 group-hover/row:opacity-100">
                            <button
                              onClick={() => {
                                const colKey = displayCols[0]?.key || columns[0]?.key || '';
                                if (colKey) startEditCell(table.table_code, rowId, colKey);
                              }}
                              className="px-1.5 py-0.5 rounded text-gray-500 hover:bg-gray-100 text-[10px]"
                            >
                              编辑
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteRow(table.table_code, rowId)}
                                className="px-1.5 py-0.5 rounded text-red-500 hover:bg-red-50 text-[10px]"
                              >
                                删除
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* 展开详情面板 */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={displayCols.length + 1} className="p-0">
                            <div className="bg-blue-50/30 border-y border-blue-100 px-4 py-3">
                              <div className="flex flex-col gap-2">
                                {columns.map((col: ColumnConfig) => {
                                  const cellKey = col.key ?? col.name;
                                  const cellValue = row[cellKey];
                                  const isNodeField = levelKeys.has(col.key);
                                  const isEditingThis = isEditing && editingCell?.column === cellKey;
                                  const isReadonlyCol = table.readonly_mode === "or" ? (!!col.readonly || row?._readonly === true) : (!!col.readonly && row?._readonly === true);
                                  return (
                                    <div key={cellKey} className="flex items-start gap-2 text-xs">
                                      <span className={cn("shrink-0 text-gray-400 min-w-[120px] text-right", isNodeField && "font-medium text-blue-500")}>
                                        {col.label || col.name}:
                                      </span>
                                      <div
                                        className={cn("flex-1 min-w-0", !isReadonlyCol && "cursor-pointer")}
                                        onDoubleClick={() => !isReadonlyCol && startEditCell(table.table_code, rowId, cellKey)}
                                      >
                                        {isEditingThis
                                          ? renderEditCell(col, isReadonlyCol, cellValue)
                                          : <span className={isReadonlyCol ? "text-gray-400" : "text-gray-700"}>{renderCellValue(col, cellValue) || "-"}</span>
                                        }
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex gap-2 mt-3 pt-2 border-t border-blue-100">
                                <button
                                  onClick={() => {
                                    const colKey = displayCols[0]?.key || columns[0]?.key || '';
                                    if (colKey) startEditCell(table.table_code, rowId, colKey);
                                  }}
                                  className="px-3 py-1 rounded text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-600"
                                >
                                  编辑
                                </button>
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteRow(table.table_code, rowId)}
                                    className="px-3 py-1 rounded text-xs bg-white border border-red-200 hover:bg-red-50 text-red-500"
                                  >
                                    删除
                                  </button>
                                )}
                                <button
                                  onClick={() => setExpandedTreeRow(null)}
                                  className="px-3 py-1 rounded text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-400"
                                >
                                  收起
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    // 递归渲染节点
    const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
      const isExpanded = treeExpanded.has(node.key);
      const hasChildren = node.children.length > 0;
      const hasRows = node.rows.length > 0;
      const cfg = levelConfig[Math.min(depth, levelConfig.length - 1)];

      return (
        <div key={node.key}>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded cursor-pointer hover:bg-gray-50"
            style={{ paddingLeft: `${cfg.indent}px`, borderLeft: `3px solid ${cfg.border}` }}
            onClick={() => (hasChildren || hasRows) && toggleTree(node.key)}
          >
            <span className={`text-[10px] transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>
              {(hasChildren || hasRows) && '▶'}
            </span>
            <span className={cn(cfg.font)}>
              {node.label}
            </span>
            <span className="text-[10px] text-gray-400 ml-1 flex-shrink-0">
              ({hasRows ? node.rows.length : node.children.length}条)
            </span>
          </div>
          {isExpanded && hasChildren && (
            <div>
              {node.children.map(child => renderNode(child, depth + 1))}
            </div>
          )}
          {isExpanded && hasRows && renderMiniTable(node.rows, depth)}
        </div>
      );
    };

    // 层级描述
    const levelDesc = activeLevels.length > 0
      ? activeLevels.map((c, i) => `L${i + 1}: ${c.label || c.key}`).join(" → ")
      : "未设置节点（平铺展示）";

    return (
      <div className="flex flex-col">
        {/* 工具栏 */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-gray-50/50">
          <Popover>
            <PopoverTrigger asChild>
              <button className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                <Settings2 className="h-3 w-3" />
                设置
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
              <div className="space-y-1 mb-2">
                <h4 className="text-xs font-medium">树形设置</h4>
              </div>
              {(() => {
                const ttc = table.table_code;
                const level1 = (getTableSetting(ttc, "tree_level1_field") as string) || "";
                const level2 = (getTableSetting(ttc, "tree_level2_field") as string) || "";
                const level3 = (getTableSetting(ttc, "tree_level3_field") as string) || "";
                const level4 = (getTableSetting(ttc, "tree_level4_field") as string) || "";
                const levels = [level1, level2, level3, level4].filter(Boolean);
                return (
                  <div className="space-y-3">
                    {[{ label: "一级节点（根）", value: level1, key: "tree_level1_field" },
                      { label: "二级节点", value: level2, key: "tree_level2_field" },
                      { label: "三级节点", value: level3, key: "tree_level3_field" },
                      { label: "四级节点", value: level4, key: "tree_level4_field" },
                    ].map((item, i) => (
                      <div key={item.key} className="space-y-1.5">
                        <Label className="text-xs font-medium">{item.label}</Label>
                        <Select value={item.value || "__none__"} onValueChange={v => setTableSetting(ttc, item.key, v === "__none__" ? "" : v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="不设置" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">不设置</SelectItem>
                            {columns.map((f: ColumnConfig) => (
                              <SelectItem key={f.key || f.name} value={f.key || f.name} disabled={i > 0 && !levels[i - 1]}>{f.label || f.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground">逐级设置树形节点字段，可只设置部分层级，未设为节点的字段在最后一级横向展示</p>
                  </div>
                );
              })()}
            </PopoverContent>
          </Popover>
          <span className="text-[10px] text-gray-400">
            {levelDesc} · {data.length} 条记录
          </span>
          <button
            onClick={() => openAIPromptDialog(table.table_code)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-teal-600 hover:bg-teal-50 transition-colors"
          >
            <Sparkles className="h-3 w-3" />AI
          </button>
        </div>
        {/* 树形内容 */}
        <div className="space-y-1">
          {tree.map(node => renderNode(node, 0))}
        </div>
      </div>
    );
  };

  // ===== 表单式视图 =====
  const renderFormView = (table: TableDefinition) => {
    const data = tableDataMap[table.table_code] || [];
    const columns = table.columns_config;
    const mc = getModuleColor(activeModule);
    if (data.length === 0) {
      return <div className="text-center py-8 text-gray-500">暂无数据</div>;
    }

    const currentRow = data[formRecordIndex] as Record<string, unknown>;
    const rowId = String(currentRow.id || '');
    const canDelete = currentRow.data_source === 'manual' || currentRow.allow_delete !== false;

    return (
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">
            {formRecordIndex + 1} / {data.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setFormRecordIndex(Math.max(0, formRecordIndex - 1))}
              disabled={formRecordIndex === 0}
              className="px-3 py-1 rounded text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            >
              ◀ 上一条
            </button>
            <button
              onClick={() => setFormRecordIndex(Math.min(data.length - 1, formRecordIndex + 1))}
              disabled={formRecordIndex === data.length - 1}
              className="px-3 py-1 rounded text-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-30"
            >
              下一条 ▶
            </button>
            <button
              onClick={() => openAIPromptDialog(table.table_code)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-teal-600 hover:bg-teal-50 transition-colors"
            >
              <Sparkles className="h-3 w-3" />AI
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className={cn("px-6 py-3 font-semibold text-sm text-white", mc.bg)}>
            {columns[0] && String(currentRow[columns[0].key] || '记录详情')}
          </div>
          <div className="p-6 space-y-4">
            {columns.map((col: ColumnConfig) => {
              const cellKey = col.key ?? col.name;
              const cellValue = currentRow[cellKey];
              const isEditingThis = editingCell?.tableCode === table.table_code &&
                                   editingCell?.rowId === rowId &&
                                   editingCell?.column === col.name;
              const isReadonlyCol = table.readonly_mode === "or" ? (!!col.readonly || currentRow?._readonly === true) : (!!col.readonly && currentRow?._readonly === true);
              return (
                <div key={col.key} className="flex items-start border-b border-gray-50 pb-3">
                  <div className="w-28 flex-shrink-0 text-sm font-medium text-gray-500">{col.label || col.key}</div>
                  <div className="flex-1 text-sm">
                    {isEditingThis ? (
                      renderEditCell(col, isReadonlyCol, cellValue)
                    ) : (
                      <div
                        className={cn(!isReadonlyCol && "cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1")}
                        onClick={() => !isReadonlyCol && startEdit(table.table_code, rowId, col.name, cellValue)}
                      >
                        {isReadonlyCol ? (
                          <span className="text-gray-400">{renderCellValue(col, cellValue) || "-"}</span>
                        ) : (
                          <span className="group inline-flex items-center gap-1">
                            {renderCellValue(col, cellValue) || "-"}
                            <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0" />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-6 py-3 bg-gray-50 flex gap-2">
            <button
              onClick={() => !isRowReadonly(table.table_code, rowId) && startEdit(table.table_code, rowId, columns[0]?.name || '', currentRow[columns[0]?.key ?? columns[0]?.name ?? ''])}
              className="px-4 py-1.5 rounded text-sm text-white"
              style={{ backgroundColor: mc.border }}
            >
              编辑
            </button>
            {canDelete && (
              <button
                onClick={() => handleDeleteRow(table.table_code, rowId)}
                className="px-4 py-1.5 rounded text-sm text-red-500 border border-red-200 hover:bg-red-50"
              >
                删除
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ===== 甘特图视图 =====
  const renderGanttView = (table: TableDefinition) => {
    const data = tableDataMap[table.table_code] || [];
    const columns = table.columns_config;
    const mc = getModuleColor(activeModule);
    const tc = table.table_code;
    const settings = getTableSetting(tc, "gantt") as Record<string, string> || {};

    const allFields = columns;
    const dateFields = allFields.filter(f => f.type === 'date');
    const selectFields = allFields.filter(f => f.type === 'select' || f.type === 'radio');
    const numberFields = allFields.filter(f => f.type === 'number');

    // 读取配置
    const planStartField = (getTableSetting(tc, "gantt_plan_start_field") as string) || "";
    const planEndField = (getTableSetting(tc, "gantt_plan_end_field") as string) || "";
    const actualStartField = (getTableSetting(tc, "gantt_actual_start_field") as string) || (dateFields[0]?.key || dateFields[0]?.name || "");
    const actualEndField = (getTableSetting(tc, "gantt_actual_end_field") as string) || (dateFields.length > 1 ? (dateFields[1]?.key || dateFields[1]?.name) : (dateFields[0]?.key || dateFields[0]?.name || ""));
    const groupField = (getTableSetting(tc, "gantt_group_field") as string) || "";
    const progressField = (getTableSetting(tc, "gantt_progress_field") as string) || "";

    // 时间刻度: day / week / month
    const ganttScale = (getTableSetting(tc, "gantt_scale") as string) || "week";

    // 获取字段值
    const getVal = (row: Record<string, unknown>, field: string) => {
      if (!field) return null;
      return row[field] ?? row[columns.find(c => (c.key || c.name) === field)?.name || field] ?? null;
    };

    const parseDate = (v: unknown): Date | null => {
      if (!v) return null;
      const d = new Date(String(v));
      return isNaN(d.getTime()) ? null : d;
    };

    // 计算日期范围
    const allDates: Date[] = [];
    data.forEach(row => {
      [planStartField, planEndField, actualStartField, actualEndField].forEach(f => {
        const d = parseDate(getVal(row, f));
        if (d) allDates.push(d);
      });
    });

    if (allDates.length === 0) {
      return (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          无日期数据，请在设置中配置日期字段
        </div>
      );
    }

    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    // 根据刻度调整日期范围
    if (ganttScale === "month") {
      minDate.setMonth(minDate.getMonth() - 1);
      minDate.setDate(1);
      maxDate.setMonth(maxDate.getMonth() + 2);
      maxDate.setDate(0);
    } else if (ganttScale === "week") {
      // 扩展到整周
      const dayOfWeek = minDate.getDay() || 7;
      minDate.setDate(minDate.getDate() - dayOfWeek + 1);
      const endDayOfWeek = maxDate.getDay() || 7;
      maxDate.setDate(maxDate.getDate() + (7 - endDayOfWeek) + 1);
      maxDate.setDate(maxDate.getDate() - 1);
    } else {
      // day: 前后各留1天
      minDate.setDate(minDate.getDate() - 1);
      maxDate.setDate(maxDate.getDate() + 2);
    }

    // 刻度对应的像素宽度
    const SCALE_CONFIG: Record<string, { dayWidth: number; rowHeight: number; barH: number; gap: number }> = {
      day:   { dayWidth: 36, rowHeight: 52, barH: 18, gap: 6 },
      week:  { dayWidth: 5,  rowHeight: 44, barH: 16, gap: 4 },
      month: { dayWidth: 1.5, rowHeight: 36, barH: 14, gap: 3 },
    };
    const sc = SCALE_CONFIG[ganttScale] || SCALE_CONFIG.week;

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000);
    const totalWidth = Math.max(totalDays * sc.dayWidth, 200);

    // 生成时间轴标签
    const months: { label: string; left: number; width: number }[] = [];
    const subLabels: { label: string; left: number; width?: number }[] = [];

    let cursor = new Date(minDate);
    while (cursor <= maxDate) {
      const monthStart = new Date(Math.max(cursor.getTime(), minDate.getTime()));
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const monthEnd = nextMonth > maxDate ? new Date(maxDate.getTime()) : new Date(nextMonth.getTime() - 1);
      const left = ((monthStart.getTime() - minDate.getTime()) / 86400000) * sc.dayWidth;
      const right = ((monthEnd.getTime() - minDate.getTime()) / 86400000) * sc.dayWidth;
      months.push({
        label: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
        left,
        width: right - left,
      });

      if (ganttScale === "day") {
        // 日视图：子标签为每天
        let dayCursor = new Date(monthStart);
        while (dayCursor <= monthEnd) {
          const dLeft = ((dayCursor.getTime() - minDate.getTime()) / 86400000) * sc.dayWidth;
          const isWeekend = dayCursor.getDay() === 0 || dayCursor.getDay() === 6;
          subLabels.push({
            label: String(dayCursor.getDate()),
            left: dLeft,
            width: sc.dayWidth,
          });
          dayCursor.setDate(dayCursor.getDate() + 1);
        }
      } else if (ganttScale === "week") {
        // 周视图：子标签为每周
        let weekCursor = new Date(monthStart);
        let weekNum = 1;
        while (weekCursor <= monthEnd) {
          const weekLeft = ((weekCursor.getTime() - minDate.getTime()) / 86400000) * sc.dayWidth;
          subLabels.push({ label: `W${weekNum}`, left: weekLeft });
          weekCursor.setDate(weekCursor.getDate() + 7);
          weekNum++;
        }
      }
      // 月视图无子标签

      cursor = nextMonth;
    }

    // 今日线位置
    const today = new Date();
    const todayOffset = ((today.getTime() - minDate.getTime()) / 86400000) * sc.dayWidth;
    const showToday = todayOffset >= 0 && todayOffset <= totalWidth;

    // 分组
    const grouped: Record<string, Record<string, unknown>[]> = {};
    const groupOrder: string[] = [];
    if (groupField) {
      data.forEach(row => {
        const gv = String(getVal(row, groupField) || "未分组");
        if (!grouped[gv]) { grouped[gv] = []; groupOrder.push(gv); }
        grouped[gv].push(row);
      });
    } else {
      grouped["all"] = data;
      groupOrder.push("all");
    }

    // 计算条位置
    const calcPos = (start: Date | null, end: Date | null) => {
      if (!start || !end) return null;
      const left = ((start.getTime() - minDate.getTime()) / 86400000) * sc.dayWidth;
      const width = Math.max(((end.getTime() - start.getTime()) / 86400000) * sc.dayWidth, sc.dayWidth * 2);
      return { left, width };
    };

    // 渲染条形
    const renderBar = (row: Record<string, unknown>, idx: number) => {
      const planStart = parseDate(getVal(row, planStartField));
      const planEnd = parseDate(getVal(row, planEndField));
      const actualStart = parseDate(getVal(row, actualStartField));
      const actualEnd = parseDate(getVal(row, actualEndField));
      const progress = progressField ? Number(getVal(row, progressField) || 0) : null;
      const progressPct = progress !== null ? Math.min(Math.max(progress, 0), 100) : null;

      const taskName = String(getVal(row, columns[0]?.key || columns[0]?.name || "") || `记录${idx + 1}`);
      const planPos = calcPos(planStart, planEnd);
      const actualPos = calcPos(actualStart, actualEnd);
      const isDelayed = !!(planEnd && (today > planEnd || (actualEnd && actualEnd > planEnd)));
      const delayDays = isDelayed && planEnd ? Math.ceil((today.getTime() - planEnd.getTime()) / 86400000) : 0;
      const delayPos = isDelayed && planEnd ? calcPos(planEnd, actualEnd && actualEnd > planEnd ? actualEnd : today) : null;

      const getCellValue = (f: string) => {
        const v = getVal(row, f);
        return v ? String(v) : "";
      };

      const showDateText = ganttScale !== "month";
      const barTop1 = sc.gap;
      const barTop2 = sc.barH + sc.gap * 2;

      // 统一 tooltip - 所有条形共享
      const tipId = `gantt-tip-${tc}-${idx}`;
      const planDays = (planStart && planEnd) ? Math.ceil((planEnd.getTime() - planStart.getTime()) / 86400000) : null;
      const actualDays = (actualStart && actualEnd) ? Math.ceil((actualEnd.getTime() - actualStart.getTime()) / 86400000) : null;

      return (
        <div key={String(row.id || idx)} className="flex items-center border-b border-gray-100 hover:bg-gray-50/50 group relative"
             style={{ height: sc.rowHeight }}>
          {/* 统一 Tooltip */}
          <div id={tipId} className="fixed z-[9999] pointer-events-none hidden">
            <div className="bg-gray-900 text-white rounded-lg px-3 py-2 shadow-xl text-xs space-y-0.5 min-w-[140px]">
              <div className="flex items-baseline gap-1.5">
                <span className="text-gray-400 shrink-0">任务:</span>
                <span className="font-semibold">{taskName}</span>
              </div>
              {planStartField && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-gray-400 shrink-0">计划:</span>
                  <span style={{ color: "#60a5fa" }}>{getCellValue(planStartField)} → {getCellValue(planEndField)}</span>
                  {planDays !== null && <span className="text-gray-500 ml-0.5">({planDays}天)</span>}
                </div>
              )}
              {actualStartField && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-gray-400 shrink-0">实际:</span>
                  <span style={{ color: "#4ade80" }}>{getCellValue(actualStartField)} → {getCellValue(actualEndField)}</span>
                  {actualDays !== null && <span className="text-gray-500 ml-0.5">({actualDays}天)</span>}
                </div>
              )}
              {progressPct !== null && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-gray-400 shrink-0">进度:</span>
                  <span>{progressPct}%</span>
                </div>
              )}
              {isDelayed && (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-gray-400 shrink-0">状态:</span>
                  <span style={{ color: "#f87171" }}>⚠ 截止今日延期 {delayDays}天</span>
                </div>
              )}
            </div>
          </div>
          {/* 左侧任务名 */}
          <div className="w-[200px] shrink-0 sticky left-0 bg-white z-10 px-3 flex items-center gap-2 border-r border-gray-100">
            <span className="text-xs truncate font-medium text-gray-700">{taskName}</span>
            {isDelayed && <span className="text-[10px] text-red-500 font-medium shrink-0">延期{delayDays}天</span>}
          </div>
          {/* 条形区域 */}
          <div className="relative" style={{ width: totalWidth, height: sc.rowHeight }}>
            {/* 计划条 */}
            {planPos && (
              <div className="absolute rounded-sm border border-dashed cursor-pointer hover:brightness-110 transition-all"
                   style={{
                     left: planPos.left, width: planPos.width,
                     top: barTop1, height: sc.barH,
                     backgroundColor: `${mc.hex}22`,
                     borderColor: `${mc.hex}44`,
                   }}
                   onMouseMove={(e) => {
                     const tip = document.getElementById(tipId);
                     if (tip) {
                       const tipW = tip.offsetWidth || 160;
                       const tipH = tip.offsetHeight || 60;
                       let x = e.clientX + 12;
                       let y = e.clientY - tipH - 8;
                       if (x + tipW > window.innerWidth - 8) x = e.clientX - tipW - 12;
                       if (y < 8) y = e.clientY + 16;
                       tip.style.display = "block";
                       tip.style.left = `${x}px`;
                       tip.style.top = `${y}px`;
                     }
                   }}
                   onMouseLeave={() => {
                     const tip = document.getElementById(tipId);
                     if (tip) tip.style.display = "none";
                   }}>
                {showDateText && planPos.width > 60 && (
                  <span className="absolute left-1 top-0 text-[9px] whitespace-nowrap leading-[16px]" style={{ color: `${mc.hex}99` }}>
                    {getCellValue(planStartField)} → {getCellValue(planEndField)}
                  </span>
                )}
              </div>
            )}
            {/* 实际条 */}
            {actualPos && (
              <div className="absolute rounded-sm overflow-hidden cursor-pointer hover:brightness-110 transition-all"
                   style={{
                     left: actualPos.left, width: actualPos.width,
                     top: barTop2, height: sc.barH,
                     backgroundColor: `${mc.hex}33`,
                   }}
                   onMouseMove={(e) => {
                     const tip = document.getElementById(tipId);
                     if (tip) {
                       const tipW = tip.offsetWidth || 160;
                       const tipH = tip.offsetHeight || 60;
                       let x = e.clientX + 12;
                       let y = e.clientY - tipH - 8;
                       if (x + tipW > window.innerWidth - 8) x = e.clientX - tipW - 12;
                       if (y < 8) y = e.clientY + 16;
                       tip.style.display = "block";
                       tip.style.left = `${x}px`;
                       tip.style.top = `${y}px`;
                     }
                   }}
                   onMouseLeave={() => {
                     const tip = document.getElementById(tipId);
                     if (tip) tip.style.display = "none";
                   }}>
                {progressPct !== null ? (
                  <>
                    <div className="h-full rounded-sm transition-all"
                         style={{ width: `${progressPct}%`, backgroundColor: `${mc.hex}bb` }} />
                    {(ganttScale !== "month" || actualPos.width > 30) && (
                      <span className="absolute right-1 top-0 text-[9px] font-medium text-white leading-[14px]">
                        {progressPct}%
                      </span>
                    )}
                  </>
                ) : (
                  <div className="h-full rounded-sm" style={{ backgroundColor: `${mc.hex}bb` }} />
                )}
              </div>
            )}
            {/* 延期部分 */}
            {delayPos && (
              <div className="absolute rounded-sm overflow-hidden cursor-pointer"
                   style={{
                     left: delayPos.left, width: delayPos.width,
                     top: barTop2, height: sc.barH,
                     backgroundColor: 'rgba(239,68,68,0.5)',
                   }}
                   onMouseMove={(e) => {
                     const tip = document.getElementById(tipId);
                     if (tip) {
                       const tipW = tip.offsetWidth || 160;
                       const tipH = tip.offsetHeight || 60;
                       let x = e.clientX + 12;
                       let y = e.clientY - tipH - 8;
                       if (x + tipW > window.innerWidth - 8) x = e.clientX - tipW - 12;
                       if (y < 8) y = e.clientY + 16;
                       tip.style.display = "block";
                       tip.style.left = `${x}px`;
                       tip.style.top = `${y}px`;
                     }
                   }}
                   onMouseLeave={() => {
                     const tip = document.getElementById(tipId);
                     if (tip) tip.style.display = "none";
                   }}>
                {ganttScale !== "month" && (
                  <span className="absolute right-1 top-0 text-[9px] font-medium text-white leading-[14px]">!</span>
                )}
              </div>
            )}
            {!planPos && !actualPos && (
              <div className="absolute top-3 left-0 text-[10px] text-gray-300">无日期</div>
            )}
          </div>
          {/* 操作按钮 */}
          <div className="shrink-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 transition-opacity">
            <button onClick={() => !isRowReadonly(tc, String(row.id)) && startEditCell(tc, String(row.id), columns[0]?.key || columns[0]?.name || "")}
                    className={cn("p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600", isRowReadonly(tc, String(row.id)) && "opacity-30 pointer-events-none")}>
              <Pencil className="h-3 w-3" />
            </button>
            {row.allow_delete !== false && (
              <button onClick={() => handleDeleteRow(tc, String(row.id))}
                      className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="flex flex-col">
        {/* 工具栏: 图例 + 刻度切换 */}
        <div className="flex items-center gap-4 px-3 py-2 border-b bg-gray-50/50 text-[10px] text-gray-500">
          {planStartField && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-8 h-2.5 rounded-sm border border-dashed" style={{ backgroundColor: `${mc.hex}22`, borderColor: `${mc.hex}44` }} />
              计划
            </span>
          )}
          {actualStartField && (
            <span className="flex items-center gap-1">
              <span className="inline-block w-8 h-2.5 rounded-sm" style={{ backgroundColor: `${mc.hex}bb` }} />
              实际
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-2.5 rounded-sm" style={{ backgroundColor: 'rgba(239,68,68,0.5)' }} />
            延期
          </span>
          {/* 导出Excel */}
          <button onClick={async () => {
            try {
              const XLSX = await import('xlsx');
              const getVal = (row: Record<string, unknown>, field: string) => {
                if (!field) return null;
                return row[field] ?? row[columns.find(c => (c.key || c.name) === field)?.name || field] ?? null;
              };
              const parseDate = (v: unknown): Date | null => {
                if (!v) return null;
                const d = new Date(String(v));
                return isNaN(d.getTime()) ? null : d;
              };
              const fmtDate = (v: unknown) => {
                const d = parseDate(v);
                return d ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : "";
              };
              const today = new Date();
              const exportData = data.map((row, idx) => {
                const planStart = parseDate(getVal(row, planStartField));
                const planEnd = parseDate(getVal(row, planEndField));
                const actualStart = parseDate(getVal(row, actualStartField));
                const actualEnd = parseDate(getVal(row, actualEndField));
                const progress = progressField ? Number(getVal(row, progressField) || 0) : null;
                const planDays = planStart && planEnd ? Math.ceil((planEnd.getTime() - planStart.getTime()) / 86400000) : "";
                const actualDays = actualStart && actualEnd ? Math.ceil((actualEnd.getTime() - actualStart.getTime()) / 86400000) : "";
                const isDelayed = !!(planEnd && (actualEnd ? actualEnd > planEnd : today > planEnd));
                const delayDays = isDelayed ? Math.ceil(((actualEnd || today).getTime() - planEnd.getTime()) / 86400000) : "";
                return {
                  '任务名称': String(getVal(row, columns[0]?.key || columns[0]?.name || "") || `记录${idx+1}`),
                  ...(groupField ? { '分组': String(getVal(row, groupField) || "未分组") } : {}),
                  '计划开始': fmtDate(getVal(row, planStartField)),
                  '计划结束': fmtDate(getVal(row, planEndField)),
                  '计划工期(天)': planDays,
                  '实际开始': fmtDate(getVal(row, actualStartField)),
                  '实际结束': fmtDate(getVal(row, actualEndField)),
                  '实际工期(天)': actualDays,
                  '进度(%)': progress !== null ? progress : "",
                  '延期天数': delayDays,
                  '状态': isDelayed ? "延期" : (actualEnd ? "已完成" : (actualStart ? "进行中" : "未开始")),
                };
              });
              const ws = XLSX.utils.json_to_sheet(exportData);
              const colWidths = Object.keys(exportData[0] || {}).map(k => ({ wch: Math.max(k.length * 2, 12) }));
              ws['!cols'] = colWidths;
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, table.table_name || tc);
              XLSX.writeFile(wb, `${table.table_name || tc}_甘特图.xlsx`);
              toast.success("导出成功");
            } catch (e) {
              toast.error("导出失败: " + String(e));
            }
          }}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
            <Download className="h-3 w-3" />
            导出Excel
          </button>
          {/* 设置 */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                <Settings2 className="h-3 w-3" />
                设置
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="space-y-1 mb-2">
                <h4 className="text-xs font-medium">甘特图设置</h4>
              </div>
              {(() => {
                const gtc = tc;
                const gDateFields = columns.filter((f: ColumnConfig) => f.type === 'date');
                const gSelectFields = columns.filter((f: ColumnConfig) => f.type === 'select' || f.type === 'radio');
                const gNumberFields = columns.filter((f: ColumnConfig) => f.type === 'number');
                const planStartCurrent = (getTableSetting(gtc, "gantt_plan_start_field") as string) || "";
                const planEndCurrent = (getTableSetting(gtc, "gantt_plan_end_field") as string) || "";
                const actualStartCurrent = (getTableSetting(gtc, "gantt_actual_start_field") as string) || (gDateFields[0]?.key || gDateFields[0]?.name || "");
                const actualEndCurrent = (getTableSetting(gtc, "gantt_actual_end_field") as string) || (gDateFields.length > 1 ? (gDateFields[1]?.key || gDateFields[1]?.name) : (gDateFields[0]?.key || gDateFields[0]?.name || ""));
                const groupCurrent = (getTableSetting(gtc, "gantt_group_field") as string) || "";
                const progressCurrent = (getTableSetting(gtc, "gantt_progress_field") as string) || "";
                const noneOption = (key: string) => <SelectItem key={key} value={key}>不设置</SelectItem>;
                const dateSelectItems = gDateFields.length === 0
                  ? <div className="px-2 py-1.5 text-xs text-muted-foreground">无日期类型字段</div>
                  : gDateFields.map((f: ColumnConfig) => <SelectItem key={f.key || f.name} value={f.key || f.name}>{f.label || f.name}</SelectItem>);
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 mb-0.5"><Label className="text-[10px] font-semibold text-blue-600">计划日期</Label></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">开始</Label>
                        <Select value={planStartCurrent || "__none__"} onValueChange={v => setTableSetting(gtc, "gantt_plan_start_field", v === "__none__" ? "" : v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="可选" /></SelectTrigger>
                          <SelectContent>{noneOption("__none__")}{dateSelectItems}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">结束</Label>
                        <Select value={planEndCurrent || "__none__"} onValueChange={v => setTableSetting(gtc, "gantt_plan_end_field", v === "__none__" ? "" : v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="可选" /></SelectTrigger>
                          <SelectContent>{noneOption("__none__")}{dateSelectItems}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mb-0.5"><Label className="text-[10px] font-semibold text-green-600">实际日期</Label></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">开始</Label>
                        <Select value={actualStartCurrent || "__none__"} onValueChange={v => setTableSetting(gtc, "gantt_actual_start_field", v === "__none__" ? "" : v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="选择" /></SelectTrigger>
                          <SelectContent>{noneOption("__none__")}{dateSelectItems}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">结束</Label>
                        <Select value={actualEndCurrent || "__none__"} onValueChange={v => setTableSetting(gtc, "gantt_actual_end_field", v === "__none__" ? "" : v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="选择" /></SelectTrigger>
                          <SelectContent>{noneOption("__none__")}{dateSelectItems}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="border-t" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">分组字段</Label>
                        <Select value={groupCurrent || "__none__"} onValueChange={v => setTableSetting(gtc, "gantt_group_field", v === "__none__" ? "" : v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="不分组" /></SelectTrigger>
                          <SelectContent>
                            {noneOption("__none__")}
                            {gSelectFields.map((f: ColumnConfig) => <SelectItem key={f.key || f.name} value={f.key || f.name}>{f.label || f.name}</SelectItem>)}
                            {gSelectFields.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">无选项字段</div>}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-gray-500">进度字段</Label>
                        <Select value={progressCurrent || "__none__"} onValueChange={v => setTableSetting(gtc, "gantt_progress_field", v === "__none__" ? "" : v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="不显示" /></SelectTrigger>
                          <SelectContent>
                            {noneOption("__none__")}
                            {gNumberFields.map((f: ColumnConfig) => <SelectItem key={f.key || f.name} value={f.key || f.name}>{f.label || f.name}</SelectItem>)}
                            {gNumberFields.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">无数字字段</div>}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">计划(浅色)和实际(深色)可同时显示，延期部分标红</p>
                  </div>
                );
              })()}
            </PopoverContent>
          </Popover>
          {/* 刻度切换 */}
          <div className="flex items-center gap-0.5 bg-gray-200 rounded-md p-0.5">
            {(["day", "week", "month"] as const).map(s => (
              <button key={s} onClick={() => setTableSetting(tc, "gantt_scale", s)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                        ganttScale === s ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                      )}>
                {s === "day" ? "日" : s === "week" ? "周" : "月"}
              </button>
            ))}
          </div>
          <button
            onClick={() => openAIPromptDialog(table.table_code)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-teal-600 hover:bg-teal-50 transition-colors ml-auto"
          >
            <Sparkles className="h-3 w-3" />AI
          </button>
        </div>
        {/* 甘特图容器 */}
        <div className="overflow-auto">
          {/* 月份头 (始终显示) */}
          <div className="flex sticky top-0 z-20 bg-white border-b">
            <div className="w-[200px] shrink-0 sticky left-0 bg-white z-30 px-3 py-1.5 border-r text-xs font-medium text-gray-500">
              任务名称
            </div>
            <div className="relative" style={{ width: totalWidth }}>
              {months.map((m, i) => (
                <div key={i} className="absolute top-0 h-6 flex items-center px-2 text-[10px] font-medium text-gray-500 border-r"
                     style={{ left: m.left, width: Math.max(m.width, 0) }}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>
          {/* 子标签 (日/周) + 网格线 */}
          {subLabels.length > 0 && (
            <div className="flex border-b">
              <div className="w-[200px] shrink-0 sticky left-0 bg-white z-30 border-r" />
              <div className="relative" style={{ width: totalWidth, height: 20 }}>
                {subLabels.map((w, i) => (
                  <div key={i} className="absolute top-0 h-full flex items-end justify-center text-[8px] text-gray-300 border-l border-dashed border-gray-200"
                       style={{ left: w.left, width: w.width || sc.dayWidth * 7 }}>
                    {w.label}
                  </div>
                ))}
                {/* 日视图周末背景 */}
                {ganttScale === "day" && (() => {
                  const weekendBgs: React.ReactNode[] = [];
                  let dc = new Date(minDate);
                  while (dc <= maxDate) {
                    if (dc.getDay() === 0 || dc.getDay() === 6) {
                      const dl = ((dc.getTime() - minDate.getTime()) / 86400000) * sc.dayWidth;
                      weekendBgs.push(
                        <div key={`we-${dc.toISOString()}`} className="absolute top-0 bottom-0 bg-gray-50"
                             style={{ left: dl, width: sc.dayWidth }} />
                      );
                    }
                    dc.setDate(dc.getDate() + 1);
                  }
                  return weekendBgs;
                })()}
              </div>
            </div>
          )}
          {/* 今日线 */}
          {showToday && (
            <div className="flex relative">
              <div className="w-[200px] shrink-0 sticky left-0 bg-transparent z-30 border-r" />
              <div className="relative" style={{ width: totalWidth }}>
                <div className="absolute top-0 bottom-0 z-10" style={{ left: todayOffset }}>
                  <div className="w-0.5 h-full bg-red-400 opacity-70" />
                  <div className="absolute -top-0 -translate-x-1/2 bg-red-500 text-white text-[8px] px-1 rounded-b font-medium">
                    今日
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* 数据行 */}
          {groupField ? groupOrder.map(gv => (
            <div key={gv}>
              <div className="flex items-center px-3 py-1.5 bg-gray-50 border-b border-gray-200 sticky left-0 z-10">
                <button onClick={() => {
                  const el = document.getElementById(`gantt-group-${tc}-${gv}`);
                  if (el) el.classList.toggle('hidden');
                }} className="mr-1.5">
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                </button>
                <span className="text-xs font-semibold text-gray-600">{gv}</span>
                <span className="text-[10px] text-gray-400 ml-1">({grouped[gv].length}项)</span>
              </div>
              <div id={`gantt-group-${tc}-${gv}`}>
                {grouped[gv].map((row, i) => renderBar(row, i))}
              </div>
            </div>
          )) : data.map((row, i) => renderBar(row, i))}
          <div className="h-4" />
        </div>
      </div>
    );
  };

  const renderGroupView = (table: TableDefinition) => {
    const data = tableDataMap[table.table_code] || [];
    const columns = table.columns_config;
    const mc = getModuleColor(activeModule);
    const tc = table.table_code;
    const getColWidth = (colName: string) => getColWidthForTable(tc, colName);

    // 分组字段（支持多个）
    const groupFieldKeys = (getTableSetting(tc, "group_fields") as string[]) || [];
    const legacyField = getTableSetting(tc, "group_field") as string;
    const effectiveGroupKeys: string[] = groupFieldKeys.length > 0 ? [...groupFieldKeys] : (legacyField ? [legacyField] : []);
    
    // 如果没设置分组字段，用第一个 select 字段
    if (effectiveGroupKeys.length === 0) {
      const selectFields = columns.filter((c: ColumnConfig) => c.type === 'select' || c.type === 'radio' || c.type === 'multiselect');
      if (selectFields.length > 0) effectiveGroupKeys.push(selectFields[0]?.key || selectFields[0]?.name || '');
    }
    if (effectiveGroupKeys.length === 0) {
      return <div className="text-center py-8 text-gray-500">请先在设置中配置分组字段</div>;
    }

    const groupCols = effectiveGroupKeys.map((k: string) => columns.find((c: ColumnConfig) => (c.key || c.name) === k)).filter(Boolean) as ColumnConfig[];

    // 显示字段设置
    const groupFieldsConfigured = (getTableSetting(tc, "group_display_fields_configured") as boolean) || false;
    const displayFieldKeys = (getTableSetting(tc, "group_display_fields") as string[]) || [];
    const groupKeySet = new Set(groupCols.map(c => c.key));
    const nonGroupCols = columns.filter((c: ColumnConfig) => !groupKeySet.has(c.key));
    const displayCols = groupFieldsConfigured && displayFieldKeys.length > 0
      ? nonGroupCols.filter((c: ColumnConfig) => displayFieldKeys.includes(c.key ?? c.name))
      : nonGroupCols;

    // 多层分组：递归构建嵌套结构
    interface GroupNode {
      key: string;
      label: string;
      col: ColumnConfig;
      rows: Record<string, unknown>[];
      children: GroupNode[];
    }

    const buildGroupTree = (rows: Record<string, unknown>[], cols: ColumnConfig[], depth: number): GroupNode[] => {
      if (depth >= cols.length) return [];
      const col = cols[depth];
      const map = new Map<string, Record<string, unknown>[]>();
      rows.forEach((row: Record<string, unknown>) => {
        const v = String(row[col.key] || '未填写');
        if (!map.has(v)) map.set(v, []);
        map.get(v)!.push(row);
      });
      return Array.from(map.entries()).map(([key, items]) => ({
        key,
        label: key,
        col,
        rows: items,
        children: buildGroupTree(items, cols, depth + 1),
      }));
    };

    const groupTree = buildGroupTree(data as Record<string, unknown>[], groupCols, 0);

    // 渲染分组节点（递归）
    const renderGroupNode = (node: GroupNode, depth: number): React.ReactNode => {
      const expandKey = `${node.col.key}:${node.key}`;
      const isExpanded = groupExpanded.has(expandKey);
      const indent = depth * 16;
      const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];
      const borderColor = colors[depth % colors.length];

      return (
        <div key={expandKey} className="rounded-lg border border-gray-200 overflow-hidden mb-2">
          <div
            className="flex items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-gray-50"
            style={{ borderLeft: `4px solid ${borderColor}`, paddingLeft: `${indent + 16}px` }}
            onClick={() => toggleGroupExpand(expandKey)}
          >
            <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
            <span className="text-[10px] text-gray-400 mr-1">{node.col.label || node.col.key}:</span>
            <span className="font-medium text-sm">{node.label}</span>
            <span className="ml-auto text-xs text-gray-400 px-2 py-0.5 rounded-full" style={{ backgroundColor: mc.light, color: mc.text }}>
              {node.rows.length} 条
            </span>
          </div>
          {isExpanded && (
            <div className="border-t border-gray-100">
              {/* 子分组 */}
              {node.children.length > 0 && (
                <div className="px-2 py-2">
                  {node.children.map(child => renderGroupNode(child, depth + 1))}
                </div>
              )}
              {/* 最底层：显示数据表格 */}
              {node.children.length === 0 && displayCols.length > 0 && (
                <table className="w-full text-sm" style={{ tableLayout: "fixed" }}>
                  <colgroup>
                    {displayCols.map((col: ColumnConfig) => (
                      <col key={col.key} style={{ width: getColWidth(col.name) }} />
                    ))}
                    <col style={{ width: 80 }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500">
                      {displayCols.map((col: ColumnConfig) => (
                        <th key={col.key} className="px-2 py-2 text-left font-medium relative">
                          {col.label || col.key}
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-400 transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleResize(`${tc}:${col.name}`, getColWidth(col.name), e.clientX);
                            }}
                          />
                        </th>
                      ))}
                      <th className="px-2 py-2 text-right font-medium" style={{ width: 80 }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {node.rows.map((row: Record<string, unknown>) => {
                      const rowId = String(row.id || '');
                      const canDelete = row.data_source === 'manual' || row.allow_delete !== false;
                      const isEditing = editingCell?.tableCode === tc && editingCell?.rowId === rowId;
                      return (
                        <tr key={rowId} className="border-t border-gray-50 hover:bg-gray-50">
                          {displayCols.map((col: ColumnConfig) => {
                            const cellKey = col.key ?? col.name;
                            const cellValue = row[cellKey];
                            const isEditingThis = isEditing && editingCell?.column === col.name;
                            const isReadonlyCol = table.readonly_mode === "or" ? (!!col.readonly || row?._readonly === true) : (!!col.readonly && row?._readonly === true);
                            return (
                              <td key={col.key} className="px-2 py-1.5">
                                {isEditingThis ? (
                                  renderEditCell(col, isReadonlyCol, cellValue)
                                ) : (
                                  <div
                                    className={cn(!isReadonlyCol && "cursor-pointer hover:bg-blue-50 rounded px-1 -mx-1")}
                                    onClick={() => !isReadonlyCol && startEdit(tc, rowId, col.name, cellValue)}
                                  >
                                    {isReadonlyCol ? (
                                      <span className="text-gray-400">{renderCellValue(col, cellValue)}</span>
                                    ) : (
                                      <span className="group inline-flex items-center gap-1">
                                        {renderCellValue(col, cellValue)}
                                        <Pencil className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0" />
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 text-right">
                            {!isRowReadonly(tc, rowId) && <button onClick={() => startEdit(tc, rowId, displayCols[0]?.name || '', row[displayCols[0]?.key ?? displayCols[0]?.name ?? ''])} className="text-xs text-gray-500 hover:text-gray-700 mr-2">编辑</button>}
                            {canDelete && (
                              <button onClick={() => handleDeleteRow(tc, rowId)} className="text-xs text-red-500 hover:text-red-700">删除</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {/* 最底层但没有显示字段时，显示卡片式 */}
              {node.children.length === 0 && displayCols.length === 0 && (
                <div className="p-2 space-y-1">
                  {node.rows.map((row: Record<string, unknown>) => {
                    const rowId = String(row.id || '');
                    return (
                      <div key={rowId} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded text-xs">
                        {nonGroupCols.slice(0, 3).map((col: ColumnConfig) => (
                          <span key={col.key}><span className="text-gray-400">{col.label}:</span> {renderCellValue(col, row[col.key ?? col.name])}</span>
                        ))}
                        {!isRowReadonly(tc, rowId) && <button onClick={() => startEditCell(tc, rowId, nonGroupCols[0]?.key || '')} className="text-gray-500 hover:text-gray-700 ml-auto">编辑</button>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      );
    };

    const groupLabels = groupCols.map(c => c.label || c.key).join(' → ');

    // 分组字段设置（内联）
    const allGroupFields = columns;
    const groupFieldsForUI: string[] = effectiveGroupKeys;
    const groupDisplayFields = displayFieldKeys;

    // 分组设置 Popover 内容
    const renderGroupSettingsInline = () => (
      <div className="space-y-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">分组字段（支持多级）</Label>
          {groupFieldsForUI.map((fKey: string, i: number) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 shrink-0 w-4">{i + 1}.</span>
              <Select value={fKey} onValueChange={v => {
                const next = [...groupFieldsForUI];
                next[i] = v;
                setTableSetting(tc, "group_fields", next);
              }}>
                <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="选择字段" /></SelectTrigger>
                <SelectContent>
                  {allGroupFields.map(f => (
                    <SelectItem key={f.key || f.name} value={f.key || f.name}>{f.label || f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => {
                const next = groupFieldsForUI.filter((_: string, j: number) => j !== i);
                setTableSetting(tc, "group_fields", next);
              }}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {groupFieldsForUI.length < allGroupFields.length && (
            <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-500 w-full" onClick={() => {
              const used = new Set(groupFieldsForUI);
              const next = allGroupFields.find(f => !used.has(f.key || f.name));
              if (next) setTableSetting(tc, "group_fields", [...groupFieldsForUI, next.key || next.name]);
            }}>+ 添加分组字段</Button>
          )}
        </div>
        <div className="border-t" />
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">显示字段</Label>
          <p className="text-[10px] text-muted-foreground">勾选要在分组内显示的字段</p>
          <div className="max-h-[160px] overflow-y-auto space-y-1">
            {nonGroupCols.map((f: ColumnConfig) => {
              const fKey = f.key || f.name;
              const checked = !groupFieldsConfigured || groupDisplayFields.includes(fKey);
              return (
                <label key={fKey} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
                  <input type="checkbox" checked={checked} onChange={() => {
                    const next = checked
                      ? groupDisplayFields.filter((k: string) => k !== fKey)
                      : [...groupDisplayFields, fKey];
                    setTableSetting(tc, "group_display_fields", next);
                    setTableSetting(tc, "group_display_fields_configured", true);
                  }} className="rounded" />
                  {f.label || f.name}
                </label>
              );
            })}
          </div>
          {groupFieldsConfigured && (
            <button
              onClick={() => {
                setTableSetting(tc, "group_display_fields", []);
                setTableSetting(tc, "group_display_fields_configured", false);
              }}
              className="text-[10px] text-blue-500 hover:bg-blue-50 px-2 py-0.5 rounded w-full text-left"
            >重置为全部显示</button>
          )}
        </div>
      </div>
    );

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">按「{groupLabels}」分组 · {data.length} 条记录</span>
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                  <Settings2 className="h-3 w-3" />
                  分组设置
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 max-h-[70vh] overflow-y-auto p-3" align="end">
                {renderGroupSettingsInline()}
              </PopoverContent>
            </Popover>
            <button
              onClick={() => openAIPromptDialog(table.table_code)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-teal-600 hover:bg-teal-50 transition-colors"
            >
              <Sparkles className="h-3 w-3" />AI
            </button>
          </div>
        </div>
        {groupTree.map(node => renderGroupNode(node, 0))}
        {groupTree.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">暂无数据</div>
        )}
      </div>
    );
  };

  // ==================== 脉络视图共享逻辑 ====================

  /** 获取脉络视图的配置（3种视图共享） */

  // 主渲染函数
  const renderDataTable = (table: TableDefinition) => {
    const data = tableDataMap[table.table_code] || [];
    const mc = getModuleColor(activeModule);

    return (
      <div className="flex flex-col h-full">
        {/* 表头 */}
        <div className={cn("px-4 py-3", mc.bg)}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4" />
                {table.table_name}
                <span className="text-white/60 text-xs font-normal ml-1">{data.length} 条</span>
              </h4>
              {renderViewModeSwitcher(table)}
            </div>
            <div className="flex items-center gap-2">
              {renderViewSettingsPopover(table)}

              {table.allow_add !== false && (
                <Button size="sm" variant="secondary" className="h-7 bg-white/20 text-white hover:bg-white/30 border-0" onClick={() => openAddDialog(table)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  添加
                </Button>
              )}
            </div>
          </div>
        </div>
        {/* 数据区域 */}
        <div className="flex-1">
          {viewMode === "card" && renderCardView(table)}
          {viewMode === "compact" && renderCompactView(table)}
          {viewMode === "kanban" && renderKanbanView(table)}
          {viewMode === "tree" && renderTreeView(table)}
          {viewMode === "form" && renderFormView(table)}
          {viewMode === "gantt" && renderGanttView(table)}
          {viewMode === "group" && renderGroupView(table)}
        </div>
      </div>
    );
  };

  const mc = getModuleColor(activeModule);

  return (
    <div className="h-full flex flex-col bg-slate-50/80">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="px-6 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", mc.light)}>
                <FolderKanban className={cn("w-4 h-4", mc.text)} />
              </div>
              <div>
                <h1 className="font-semibold text-slate-900">{project.project_name}</h1>
                <p className="text-xs text-slate-400">{project.project_code}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onSwitchLayout && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSwitchLayout("stage")}
                className="text-xs h-7 gap-1 border-[#e8590c] text-[#e8590c] hover:bg-orange-50 hover:text-[#d9480f]"
              >
                <GitBranch className="w-3.5 h-3.5" />
                切换到阶段式布局
              </Button>
            )}
            {getStatusBadge(project.status)}
          </div>
        </div>
        </div>
        <div className={cn("h-1", mc.bg)} />
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* 模块 Tab 导航 */}
        <div className="bg-white border-b border-slate-200/80 px-6">
          <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 scrollbar-thin">
            {enabledModules.map((module) => {
              const Icon = module.icon;
              const tableCount = tableDefinitions.filter(t => t.module_codes.includes(module.code)).length;
              const moduleColor = getModuleColor(module.code);
              const isActive = activeModule === module.code;
              
              return (
                <button
                  key={module.code}
                  onClick={() => setActiveModule(module.code)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                    isActive
                      ? cn(moduleColor.bg, "text-white shadow-sm", `shadow-${module.code === "scope" ? "blue" : "slate"}-200/50`)
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{module.name}</span>
                  {tableCount > 0 && (
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                      isActive ? "bg-white/25 text-white" : cn(moduleColor.light, moduleColor.text)
                    )}>
                      {tableCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 左侧概览+统计 + 中间数据区 */}
        <div className="flex-1 flex min-h-0">
          {/* 左侧：统计 */}
          <div className="w-60 bg-white border-r border-slate-200/80 overflow-y-auto flex flex-col shrink-0">
            {/* 数据统计 */}
            <div className="p-4 space-y-5 flex-1">
            {/* 数据统计 */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">数据统计</h3>
              <div className="space-y-3">
                <div className={cn("p-4 border-l-4", mc.bg, "border-l-current", mc.light)} style={{ borderLeftColor: "var(--module-color, #3b82f6)" }}>
                  <div className={cn("text-3xl font-bold", mc.text)}>{projectStats.totalTables}</div>
                  <div className={cn("text-xs mt-1", mc.text, "opacity-70")}>数据表</div>
                </div>
                <div className={cn("p-4 border-l-4", mc.bg, "border-l-current", mc.light)} style={{ borderLeftColor: "var(--module-color, #3b82f6)" }}>
                  <div className={cn("text-3xl font-bold", mc.text)}>{projectStats.totalRecords}</div>
                  <div className={cn("text-xs mt-1", mc.text, "opacity-70")}>数据记录</div>
                </div>
              </div>
            </div>

            {/* 当前模块表统计 */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">当前模块</h3>
              {(() => {
                const currentModuleDef = PROJECT_MODULES.find(m => m.code === activeModule);
                const tables = moduleTables;
                const currentModuleRecords = tables.reduce((sum, t) => sum + (tableDataMap[t.table_code] || []).length, 0);
                return (
                  <div className="space-y-2">
                    <div className={cn("flex items-center gap-2.5 px-3 py-2", mc.light)}>
                      {currentModuleDef && <currentModuleDef.icon className={cn("w-5 h-5", mc.text)} />}
                      <span className={cn("font-semibold text-sm", mc.text)}>{currentModuleDef?.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className={cn("p-2.5 border", mc.border)}>
                        <div className={cn("text-lg font-bold", mc.text)}>{tables.length}</div>
                        <div className="text-[10px] text-slate-400">表</div>
                      </div>
                      <div className={cn("p-2.5 border", mc.border)}>
                        <div className={cn("text-lg font-bold", mc.text)}>{currentModuleRecords}</div>
                        <div className="text-[10px] text-slate-400">记录</div>
                      </div>
                    </div>
                    {/* 各表记录数 */}
                    {tables.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        {tables.map((t) => {
                          const count = (tableDataMap[t.table_code] || []).length;
                          const isSelected = selectedTableCode === t.table_code;
                          return (
                            <button
                              key={t.table_code}
                              onClick={() => setSelectedTableCode(t.table_code)}
                              className={cn(
                                "flex items-center justify-between text-xs px-3 py-2 w-full text-left transition-all cursor-pointer",
                                isSelected
                                  ? cn(mc.bg, "text-white shadow-sm")
                                  : cn("border-l-3", mc.border, mc.light, "hover:bg-slate-100"),
                              )}
                              style={isSelected ? {} : { borderLeftWidth: 3 }}
                            >
                              <span className={cn(
                                "truncate mr-2 font-medium",
                                isSelected ? "text-white" : "text-slate-700",
                              )}>
                                {t.table_name}
                              </span>
                              <span className={cn(
                                "font-mono font-semibold shrink-0",
                                isSelected ? "text-white/80" : mc.text,
                              )}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
          </div>

          {/* 中间数据区 */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-slate-500">加载中...</div>
              </div>
            ) : moduleTables.length === 0 ? (
              (() => {
                const currentModuleDef = PROJECT_MODULES.find(m => m.code === activeModule);
                const IconComponent = currentModuleDef?.icon || FolderKanban;
                return (
                  <div className={cn("rounded-xl border-2 border-dashed p-12 text-center", mc.border, mc.light)}>
                    <IconComponent className={cn("w-12 h-12 mx-auto mb-4", mc.text, "opacity-40")} />
                    <p className={cn("font-medium mb-1", mc.text)}>该模块暂无数据表</p>
                    <p className="text-sm text-slate-400">请在规范管理中配置对应的数据表</p>
                  </div>
                );
              })()
            ) : !selectedTableCode ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-slate-400">请从左侧选择一个数据表</div>
              </div>
            ) : (() => {
              const selectedTable = tableDefinitions.find(t => t.table_code === selectedTableCode);
              if (!selectedTable) {
                return (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-slate-400">数据表未找到</div>
                  </div>
                );
              }
              return renderDataTable(selectedTable);
            })()}
          </div>
        </div>
      </div>

      {/* 新增记录对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen} modal={false}>
        <DialogContent className="sm:max-w-[1100px] max-h-[72vh] overflow-hidden flex flex-col p-0 gap-0 border-0 shadow-2xl shadow-slate-900/10 rounded-xl" showCloseButton={false}>
          {/* 渐变标题栏 */}
          <div className="shrink-0 px-6 pt-5 pb-4 bg-gradient-to-r from-indigo-600 to-violet-500 rounded-t-xl relative">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-semibold text-white flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  新增记录
                </DialogTitle>
                <p className="text-indigo-100 text-sm mt-1 ml-9">{currentTableForAdd?.table_name}</p>
              </div>
              <button
                onClick={() => setAddDialogOpen(false)}
                className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* 表单区域 */}
          <div className="space-y-3 px-6 py-5 overflow-y-auto flex-1 min-h-0 bg-slate-50/30">
            {currentTableForAdd?.columns_config.map((col) => (
              <div key={col.name} className="space-y-1.5 bg-white rounded-lg p-3 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold text-slate-700 flex items-center gap-1.5">
                    {col.label || col.name}
                    {col.required && <span className="text-red-400 text-xs">*</span>}
                  </label>
                  {/* 引用选择器按钮 */}
                  {currentTableForAdd?.references_config?.filter(ref => ref.entry_column === col.name).map(ref => {
                    const sourceDef = tableDefinitions.find(t => t.table_code === ref.source_table_code);
                    if (!sourceDef) return null;
                    return (
                      <Button
                        key={ref.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => openRefSelector(ref, sourceDef, currentTableForAdd.table_code, col.name)}
                      >
                        <LinkIcon className="h-3 w-3 mr-1" /> 选择{sourceDef.table_name}记录
                      </Button>
                    );
                  })}
                </div>
                {col.type === "multiple_select" && getOpts(col).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {getOpts(col).map((opt: string) => {
                        const currentValues: string[] = (() => {
                          const raw = newRowData[col.name];
                          if (Array.isArray(raw)) return raw;
                          if (typeof raw === "string" && raw) return raw.split(",").map((s: string) => s.trim());
                          return [];
                        })();
                        const isSelected = currentValues.includes(opt);
                        return (
                          <label key={opt} className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const newValues = checked
                                  ? [...currentValues, opt]
                                  : currentValues.filter((v: string) => v !== opt);
                                setNewRowData(prev => ({ ...prev, [col.name]: newValues.join(",") }));
                              }}
                              
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                ) : col.type === "select" && getOpts(col).length > 0 ? (
                    col.display_mode === "checkbox" ? (
                      <RadioGroup
                        value={newRowData[col.name] || ""}
                        onValueChange={(value) => setNewRowData(prev => ({ ...prev, [col.name]: value }))}
                        
                        className="flex flex-wrap gap-2"
                      >
                        {getOpts(col).map((opt: string) => (
                          <div key={opt} className="flex items-center space-x-1.5">
                            <RadioGroupItem value={opt} id={`${col.name}_${opt}`} />
                            <Label htmlFor={`${col.name}_${opt}`} className="text-sm cursor-pointer">{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <Select
                        value={newRowData[col.name] || undefined}
                        onValueChange={(value) => setNewRowData(prev => ({ ...prev, [col.name]: value }))}
                        
                      >
                        <SelectTrigger className="h-8 w-full min-w-[120px]">
                          <SelectValue placeholder={`请选择${col.label || col.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {getOpts(col).map((opt: string) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                ) : col.type === "procurement_module" ? (
                  <ProcurementModuleSelect
                    col={col}
                    value={newRowData[col.name] || ""}
                    onChange={(val) => setNewRowData(prev => ({ ...prev, [col.name]: val }))}
                    projectModules={project.procurement_modules || []}
                    systemModules={productModuleNames}
                  />
                ) : ["attachment"].includes(col.type) ? (
                  <FileUploadField
                    fileType={col.type}
                    value={newRowData[col.name] || ""}
                    onChange={(val) => setNewRowData(prev => ({ ...prev, [col.name]: val }))}
                  />
                ) : col.type === "video" ? (
                  <VideoUploadField
                    projectCode={project.project_code}
                    value={newRowData[col.name] || ""}
                    onChange={(val) => setNewRowData(prev => ({ ...prev, [col.name]: val }))}
                    maxFiles={col.max_count || 3}
                    maxSizeMB={(() => { const s = col.max_size || "1GB"; if (s.includes("GB")) return parseInt(s) * 1024; return parseInt(s) || 1024; })()}
                  />
                ) : col.type === "procurement_record" ? (
                  <div className="px-3 py-2 bg-cyan-50 rounded-md text-sm text-cyan-700">
                    采购模块记录由系统根据项目采购模块自动生成，无需手动填写
                  </div>
                ) : col.type === "textarea" ? (
                  <textarea
                    value={newRowData[col.name] || ""}
                    onChange={(e) => setNewRowData(prev => ({ ...prev, [col.name]: e.target.value }))}
                    placeholder={`请输入${col.label || col.name}`}
                    
                    className="w-full min-h-[72px] px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-shadow resize-none"
                    rows={3}
                  />
                ) : col.type === "date" ? (
                  <Input
                    type="date"
                    value={newRowData[col.name] || ""}
                    onChange={(e) => setNewRowData(prev => ({ ...prev, [col.name]: e.target.value }))}
                    
                  />
                ) : col.type === "number" ? (
                  <Input
                    type="number"
                    value={newRowData[col.name] || ""}
                    onChange={(e) => setNewRowData(prev => ({ ...prev, [col.name]: e.target.value }))}
                    placeholder={`请输入${col.label || col.name}`}

                  />
                ) : col.type === "text" && (col.quick_inputs || []).length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(col.quick_inputs || []).map((phrase) => (
                        <button
                          key={phrase}
                          type="button"
                          onClick={() => setNewRowData(prev => ({ ...prev, [col.name]: phrase }))}
                          className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full border border-green-200 hover:bg-green-100 hover:border-green-300 transition-colors"
                        >
                          {phrase}
                        </button>
                      ))}
                    </div>
                    <Input
                      value={newRowData[col.name] || ""}
                      onChange={(e) => setNewRowData(prev => ({ ...prev, [col.name]: e.target.value }))}
                      placeholder={`请输入${col.label || col.name}`}

                    />
                  </div>
                ) : (
                  <Input
                    value={newRowData[col.name] || ""}
                    onChange={(e) => setNewRowData(prev => ({ ...prev, [col.name]: e.target.value }))}
                    placeholder={`请输入${col.label || col.name}`}

                  />
                )}
              </div>
            ))}
          </div>
          {/* 底部操作栏 */}
          <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-white/80 backdrop-blur-sm">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} className="h-9 px-5 rounded-lg">取消</Button>
            <Button onClick={handleAddRow} className="h-9 px-6 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-500 hover:from-indigo-700 hover:to-violet-600 shadow-sm">保存</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 源表记录选择器 Dialog */}
      <Dialog open={refSelectorOpen} onOpenChange={setRefSelectorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>选择 {refSelectorConfig?.sourceTableDef.table_name} 记录</DialogTitle>
            <DialogDescription>选择一条记录，其值将自动填充到目标表的对应列中</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {/* 搜索框 */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索..."
                value={refSelectorSearch}
                onChange={(e) => setRefSelectorSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            {/* 源表记录列表 */}
            <div className="border rounded-md max-h-80 overflow-y-auto">
              {refSelectorConfig && (
                <Table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="w-10 px-3 py-2"></th>
                      {refSelectorConfig.ref.column_mapping.map(m => {
                        const srcCol = refSelectorConfig.sourceTableDef.columns_config.find(c => c.name === m.source_column);
                        return <th key={m.source_column} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{srcCol?.label || m.source_column}</th>;
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = refSelectorConfig.sourceData.filter(row => {
                        if (!refSelectorSearch) return true;
                        const search = refSelectorSearch.toLowerCase();
                        return refSelectorConfig.ref.column_mapping.some(m =>
                          String(row[m.source_column] ?? "").toLowerCase().includes(search)
                        );
                      });
                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={refSelectorConfig.ref.column_mapping.length + 1} className="px-3 py-8 text-center text-sm text-muted-foreground">
                              无匹配记录
                            </td>
                          </tr>
                        );
                      }
                      return filtered.map(row => (
                        <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            if (!refSelectorConfig || !currentTableForAdd) return;
                            // 根据 column_mapping 填充目标表
                            const updates: Record<string, string> = {};
                            for (const m of refSelectorConfig.ref.column_mapping) {
                              updates[m.target_column] = String(row[m.source_column] ?? "");
                            }
                            setNewRowData(prev => ({ ...prev, ...updates }));
                            // 同时设置入口列的值（匹配条件中的源列值）
                            const matchValue = String(row[refSelectorConfig.ref.match_condition.source_column] ?? "");
                            setNewRowData(prev => ({ ...prev, [refSelectorConfig.ref.entry_column]: matchValue }));
                            setRefSelectorOpen(false);
                          }}
                        >
                          <td className="px-3 py-2"><div className="h-3 w-3 rounded-full border-2 border-muted-foreground/30" /></td>
                          {refSelectorConfig.ref.column_mapping.map(m => (
                            <td key={m.source_column} className="px-3 py-2 text-sm">{String(row[m.source_column] ?? "-")}</td>
                          ))}
                        </tr>
                      ));
                    })()}
                  </tbody>
                </Table>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefSelectorOpen(false)}>取消</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI 提示词模板弹窗 */}
      <AIPromptDialog
        open={aiPromptDialogOpen}
        onOpenChange={setAiPromptDialogOpen}
        onSubmit={handleAIPromptSubmit}
        projectSchema={project.project_schema}
        promptType={aiPendingTableCode ? "single_table" : "global"}
        tableName={aiPendingTableCode || undefined}
      />

      {/* AI 数据分析弹窗 */}
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-500" />
              AI 数据分析
              {aiAnalyzingTable ? (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm font-normal text-gray-500">{aiAnalyzingTable}</span>
                </>
              ) : (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm font-normal text-gray-500">{activeModule}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
            {aiLoading && (
              <div className="flex flex-col items-center py-12">
                <Sparkles className="w-12 h-12 text-teal-400 animate-pulse mb-4" />
                <p className="text-sm text-gray-500 mb-2">AI 正在分析数据...</p>
                <p className="text-xs text-gray-400">
                  {aiAnalyzingTable
                    ? `正在读取表 ${aiAnalyzingTable} 的 ${Math.min(50, 999)} 条样本数据`
                    : `正在读取 ${project.project_schema} Schema 下当前模块的数据表`}
                </p>
              </div>
            )}

            {aiError && !aiLoading && (
              <div className="py-8 text-center">
                {aiError === "NO_KEY" ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">AI 功能尚未配置</p>
                    <p className="text-gray-400 text-xs">
                      请联系管理员在 系统设置 &gt; 大模型配置 中设置 DeepSeek API Key
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-red-500 text-sm">分析失败</p>
                    <p className="text-red-400 text-xs">{aiError}</p>
                    <Button variant="outline" size="sm" onClick={() => handleAIAnalysis(aiAnalyzingTable || undefined, aiCustomSystemMessage || undefined, aiCustomUserPrompt || undefined)}>
                      重试
                    </Button>
                  </div>
                )}
              </div>
            )}

            {aiResult && !aiLoading && (
              <>
                {/* 对话历史 */}
                {aiConversationHistory.length > 0 ? (
                  <div className="space-y-4">
                    {/* 初始分析结果：直接展示 markdown */}
                    <div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 mb-3">
                        <span>共扫描 {aiResult.tableCount} 张表</span>
                        <span>·</span>
                        <span>{aiResult.totalRows.toLocaleString()} 条数据</span>
                      </div>
                      <Markdown>{aiResult.analysis}</Markdown>
                    </div>

                    {/* 追问消息（从第3条开始，跳过 system/user/assistant 初始三轮） */}
                    {aiConversationHistory.slice(3).map((msg, i) => (
                      <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
                        <div className={msg.role === "user"
                          ? "bg-teal-500 text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] text-sm"
                          : "bg-gray-100 text-gray-700 rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%] text-sm prose prose-sm"
                        }>
                          {msg.role === "user" ? (
                            msg.content
                          ) : (
                            <Markdown>{msg.content}</Markdown>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* 追问加载中 */}
                    {aiFollowUpLoading && (
                      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        AI 思考中...
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* 无对话历史：单纯展示结果 */}
                    <div className="flex items-center gap-3 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                      <span>共扫描 {aiResult.tableCount} 张表</span>
                      <span>·</span>
                      <span>{aiResult.totalRows.toLocaleString()} 条数据</span>
                    </div>

                    <Markdown>{aiResult.analysis}</Markdown>
                  </>
                )}

                {/* 操作栏 */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(aiResult.analysis);
                      toast.success("已复制分析结果");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    复制结果
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAIAnalysis(aiAnalyzingTable || undefined, aiCustomSystemMessage || undefined, aiCustomUserPrompt || undefined)}
                  >
                    <Loader2 className="w-3.5 h-3.5 mr-1" />
                    重新分析
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* 追问输入框（有对话历史时显示） */}
          {aiResult && !aiLoading && aiConversationHistory.length > 0 && (
            <div className="border-t pt-3 mt-2">
              <div className="flex gap-2">
                <Input
                  value={aiFollowUpQuestion}
                  onChange={(e) => setAiFollowUpQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAIFollowUp(); } }}
                  placeholder="对分析结果追问，例如：延期风险最大的任务是什么？"
                  className="flex-1 h-9 text-sm"
                  disabled={aiFollowUpLoading}
                />
                <Button
                  size="sm"
                  onClick={handleAIFollowUp}
                  disabled={aiFollowUpLoading || !aiFollowUpQuestion.trim()}
                  className="bg-teal-500 hover:bg-teal-600 text-white"
                >
                  {aiFollowUpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "发送"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProjectDetail;
