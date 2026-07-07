"use client";

import { useState, Fragment, useEffect, useRef } from "react";
import { RefreshCw, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Settings,
  GripVertical,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  Database,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  Eye,
  Check,
  Table as TableIcon,
  X,
  Download,
  Upload,
  HelpCircle,
  Link as LinkIcon,
  ArrowLeftRight,
  Lock,
} from "lucide-react";
import { FileUploadField, renderFileCellDisplay } from "@/components/file-upload-field";
import type { ReferenceConfig } from "@/storage/database/shared/schema";

export interface TableDefinition {
  id: string;
  table_code: string;
  table_name: string;
  module_type: string[];
  description?: string;
  columns_config: ColumnConfig[];
  references_config?: ReferenceConfig[];
  apply_project_types: string[];
  apply_project_stages: string[];
  stage_desc_column?: string;
  stage_display_mode?: string;
  stage_progress_column?: string;
  stage_progress_target?: string;
  stage_summary_fields?: string;
  stage_role_column?: string;
  stage_plan_start_col?: string;
  stage_plan_end_col?: string;
  stage_actual_start_col?: string;
  stage_actual_end_col?: string;
  gantt_enabled?: boolean;
  gantt_start_col?: string;
  gantt_end_col?: string;
  gantt_name_col?: string;
  gantt_group_col?: string;
  gantt_milestone_col?: string;
  gantt_milestone_value?: string;
  sort_order: number;
  is_active: boolean;
  allow_add?: boolean;
  allow_delete?: boolean;
  readonly_mode?: "and" | "or";
}

export interface ColumnConfig {
  name: string;
  type: string;
  required: boolean;
  readonly?: boolean;
  readonly_reason?: string;
  description?: string;
  options?: string[]; // 单选/多选类型的选项列表
  data_source?: string; // 数据来源: "custom"|"project_types"|"project_stages"|...
  allow_custom?: boolean;
  calc_left_col?: string;
  calc_operator?: string;
  calc_right_col?: string;
  calc_sum?: boolean;
  calc_format?: string;
  quick_inputs?: string[];
  display_mode?: "dropdown" | "checkbox" | "project" | "system"; // 单选展示方式 或 采购模块数据来源
  multiple?: boolean; // 采购模块选择是否多选
  label?: string;
  file_type?: string; // 附件列允许的文件类型，如 "pdf,doc,xlsx"
  max_size?: string;
  max_count?: number; // 视频最多上传个数
  format?: "number" | "percent"; // 数字列的显示格式
  reference_config?: {
    source_table_code: string;
    source_column: string;
    match_field?: string;
  };
}

function dedupeColumnsByName(cols: ColumnConfig[]): ColumnConfig[] {
  const seen = new Set<string>();
  return cols.filter((col) => {
    if (seen.has(col.name)) return false;
    seen.add(col.name);
    return true;
  });
}

const MODULE_TYPES = [
  { code: "scope", name: "范围管理" },
  { code: "schedule", name: "进度管理" },
  { code: "quality", name: "质量管理" },
  { code: "cost", name: "成本管理" },
  { code: "collaboration", name: "协同管理" },
  { code: "communication", name: "沟通管理" },
  { code: "risk", name: "风险管理" },
  { code: "procurement", name: "采购管理" },
  { code: "resource", name: "资源管理" },
  { code: "document", name: "资料管理" },
];

const COLUMN_TYPES = [
  { code: "text", name: "文本" },
  { code: "textarea", name: "多行文本" },
  { code: "number", name: "数字" },
  { code: "date", name: "日期" },
  { code: "select", name: "单选" },
  { code: "multiple_select", name: "多选" },
  { code: "attachment", name: "附件" },
  { code: "calc", name: "计算" },
  { code: "video", name: "视频" },
  { code: "procurement_module", name: "产品目录" },
  { code: "procurement_record", name: "采购模块记录" },
  { code: "user", name: "用户" },
];

interface StandardManagementProps {
  definitions: TableDefinition[];
  projectTypes: { code: string; name: string }[];
  projectStages: { code: string; name: string }[];
  onCreate: (data: unknown) => void;
  onUpdate: (id: string, data: unknown) => void;
  onDelete: (id: string) => void;
  onDuplicate: (def: TableDefinition) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

// ============ Section Panel Component ============
function SectionPanel({
  title,
  icon: Icon,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ElementType;
  badge?: number | null;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border bg-card">
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-accent/50 transition-colors cursor-pointer rounded-lg">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm">{title}</span>
          {badge !== undefined && badge !== null && (
            <Badge variant="secondary" className="ml-auto text-xs shrink-0">
              {badge}
            </Badge>
          )}
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-1 border-t">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ============ Preview Panel Component ============
function PreviewPanel({
  formData,
  projectTypes,
  projectStages,
  moduleTypesList,
  definitions = [],
}: {
  formData: Partial<TableDefinition>;
  projectTypes: { code: string; name: string }[];
  projectStages: { code: string; name: string }[];
  moduleTypesList: { code: string; name: string }[];
  definitions?: TableDefinition[];
}) {
  const selectedModules = moduleTypesList.filter((m) =>
    formData.module_type?.includes(m.code)
  );
  const selectedTypes = projectTypes.filter((t) =>
    formData.apply_project_types?.includes(t.code)
  );
  const selectedStages = projectStages.filter((s) =>
    formData.apply_project_stages?.includes(s.code)
  );

  const hasBasicInfo = formData.table_code || formData.table_name || selectedModules.length > 0;
  const hasColumns = formData.columns_config && formData.columns_config.length > 0;

  return (
    <div className="w-[300px] shrink-0 rounded-lg border bg-gradient-to-br from-muted/30 to-muted/10 p-4 overflow-y-auto h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b shrink-0">
        <Eye className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">预览</span>
      </div>

      <div className="space-y-3 text-xs">
        {/* 基本信息 */}
        <div>
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <FileText className="h-3 w-3" />
            <span>基本信息</span>
          </div>
          {hasBasicInfo ? (
            <div className="pl-4 space-y-0.5">
              {formData.table_code && (
                <p>
                  <span className="text-muted-foreground">代码:</span>{" "}
                  <strong className="font-mono">{formData.table_code}</strong>
                </p>
              )}
              {formData.table_name && (
                <p>
                  <span className="text-muted-foreground">名称:</span>{" "}
                  <strong>{formData.table_name}</strong>
                </p>
              )}
              {formData.description && (
                <p className="text-muted-foreground italic line-clamp-2 mt-1">
                  {formData.description}
                </p>
              )}
            </div>
          ) : (
            <p className="pl-4 text-muted-foreground/60 italic">暂未填写</p>
          )}
        </div>

        {/* 所属模块 */}
        <div>
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Layers className="h-3 w-3" />
            <span>所属模块</span>
          </div>
          {selectedModules.length > 0 ? (
            <div className="pl-4 flex flex-wrap gap-1">
              {selectedModules.map((m) => (
                <Badge
                  key={m.code}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 bg-primary/5"
                >
                  {m.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="pl-4 text-muted-foreground/60 italic">暂未选择</p>
          )}
        </div>

        {/* 适用范围 */}
        <div>
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Settings className="h-3 w-3" />
            <span>适用范围</span>
          </div>
          <div className="pl-4 space-y-1">
            <div>
              <span className="text-muted-foreground text-[10px]">项目类型:</span>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {selectedTypes.length > 0 ? (
                  selectedTypes.map((t) => (
                    <Badge
                      key={t.code}
                      variant="secondary"
                      className="text-[10px] px-1 py-0 h-3.5"
                    >
                      {t.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground/60 text-[10px]">全部</span>
                )}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px]">项目阶段:</span>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {selectedStages.length > 0 ? (
                  selectedStages.map((s) => (
                    <Badge
                      key={s.code}
                      variant="outline"
                      className="text-[10px] px-1 py-0 h-3.5"
                    >
                      {s.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground/60 text-[10px]">全部</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 操作权限 */}
        <div>
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Settings className="h-3 w-3" />
            <span>操作权限</span>
          </div>
          <div className="pl-4 space-y-0.5">
            <p>
              <span className="text-muted-foreground">允许添加:</span>{" "}
              <strong>{formData.allow_add !== false ? "是" : "否"}</strong>
            </p>
          </div>
        </div>

        {/* 列配置 */}
        <div>
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Database className="h-3 w-3" />
            <span>列配置</span>
          </div>
          {hasColumns ? (
            <div className="pl-4 space-y-0.5">
              <p className="text-muted-foreground">
                共 <strong>{formData.columns_config?.length}</strong> 列
              </p>
              <div className="max-h-[120px] overflow-y-auto space-y-0.5 mt-1">
                {formData.columns_config?.map((col, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground"
                  >
                    {col.required && <Check className="h-2.5 w-2.5 text-primary" />}
                    <span>{col.name}</span>
                    <span className="text-muted-foreground/60">
                      ({COLUMN_TYPES.find((t) => t.code === col.type)?.name})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="pl-4 text-muted-foreground/60 italic">暂无列定义</p>
          )}
        </div>

        {/* 引用关系 */}
        <div>
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <LinkIcon className="h-3 w-3" />
            <span>引用关系</span>
          </div>
          {formData.references_config && formData.references_config.length > 0 ? (
            <div className="pl-4 space-y-0.5">
              <p className="text-muted-foreground">
                共 <strong>{formData.references_config.length}</strong> 个引用
              </p>
              <div className="max-h-[80px] overflow-y-auto space-y-0.5 mt-1">
                {formData.references_config.map((ref) => {
                  const sourceDef = moduleTypesList.find(() => false) || definitions.find(d => d.table_code === ref.source_table_code);
                  return (
                    <div key={ref.id} className="text-[10px] text-muted-foreground">
                      {ref.name} → {(sourceDef as any)?.table_name || ref.source_table_code}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="pl-4 text-muted-foreground/60 italic">暂无引用</p>
          )}
        </div>
      </div>
    </div>
  );
}

// 产品目录下拉选择字段组件（用于规范管理数据编辑）
function ProductModuleField({
  col,
  value,
  onChange,
  moduleNames,
  disabled,
}: {
  col: { name: string; multiple?: boolean; type?: string; display_mode?: string; options?: string[]; required?: boolean; description?: string; readonly?: boolean; label?: string };
  value: string;
  onChange: (val: string) => void;
  moduleNames: string[];
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMultiple = !!col.multiple;
  const selectedValues = isMultiple ? value.split(",").filter(Boolean) : value ? [value] : [];
  const filtered = moduleNames.filter((n) => n.toLowerCase().includes(search.toLowerCase()));

  // 点击外部关闭
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  if (disabled) {
    return (
      <div className="w-full min-h-[36px] rounded-md border px-3 py-1 text-sm bg-muted cursor-not-allowed">
        {selectedValues.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {selectedValues.map((v) => (
              <span key={v} className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{v}</span>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        className="w-full min-h-[36px] rounded-md border px-3 py-1 text-left text-sm cursor-pointer hover:border-primary flex items-center justify-between"
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        <span className="flex flex-wrap gap-1">
          {selectedValues.length > 0 ? (
            selectedValues.map((v) => (
              <span key={v} className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{v}</span>
            ))
          ) : (
            <span className="text-muted-foreground">选择产品目录...</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
      {dropdownOpen && (
        <div className="absolute z-[9999] top-full left-0 mt-1 w-64 rounded-md border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <Input
              placeholder="搜索模块..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto px-1 pb-1">
            {filtered.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">无匹配模块</div>
            ) : (
              filtered.map((mod) => {
                const isSelected = selectedValues.includes(mod);
                return (
                  <button
                    key={mod}
                    type="button"
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent ${isSelected ? "bg-accent/50" : ""}`}
                    onClick={() => {
                      if (isMultiple) {
                        const newVals = isSelected
                          ? selectedValues.filter((v) => v !== mod)
                          : [...selectedValues, mod];
                        onChange(newVals.join(","));
                      } else {
                        onChange(mod);
                        setDropdownOpen(false);
                        setSearch("");
                      }
                    }}
                  >
                    {isMultiple && <Checkbox checked={isSelected} />}
                    <span>{mod}</span>
                  </button>
                );
              })
            )}
          </div>
          {isMultiple && selectedValues.length > 0 && (
            <div className="border-t p-1">
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                onClick={() => onChange("")}
              >
                清除选择
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 用户下拉选择字段组件（用于规范管理数据编辑）
function UserField({
  col,
  value,
  onChange,
  users,
  disabled,
}: {
  col: { name: string; multiple?: boolean; type?: string; display_mode?: string; options?: string[]; required?: boolean; description?: string; readonly?: boolean; label?: string };
  value: string;
  onChange: (val: string) => void;
  users: Array<{ id: string; name: string; username: string }>;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMultiple = !!col.multiple;
  const selectedIds = isMultiple ? value.split(",").filter(Boolean) : value ? [value] : [];
  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    return u.name.toLowerCase().includes(s) || u.username.toLowerCase().includes(s);
  });

  const getUserDisplay = (id: string) => {
    const u = users.find((u) => u.id === id);
    return u ? `${u.name} (${u.username})` : id;
  };

  // 点击外部关闭
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  if (disabled) {
    return (
      <div className="w-full min-h-[36px] rounded-md border px-3 py-1 text-sm bg-muted cursor-not-allowed">
        {selectedIds.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {selectedIds.map((id) => (
              <span key={id} className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{getUserDisplay(id)}</span>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        className="w-full min-h-[36px] rounded-md border px-3 py-1 text-left text-sm cursor-pointer hover:border-primary flex items-center justify-between"
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        <span className="flex flex-wrap gap-1">
          {selectedIds.length > 0 ? (
            selectedIds.map((id) => (
              <span key={id} className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{getUserDisplay(id)}</span>
            ))
          ) : (
            <span className="text-muted-foreground">选择用户...</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
      {dropdownOpen && (
        <div className="absolute z-[9999] top-full left-0 mt-1 w-72 rounded-md border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <Input
              placeholder="搜索用户..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto px-1 pb-1">
            {filtered.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">无匹配用户</div>
            ) : (
              filtered.map((user) => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent ${isSelected ? "bg-accent/50" : ""}`}
                    onClick={() => {
                      if (isMultiple) {
                        const newIds = isSelected
                          ? selectedIds.filter((id) => id !== user.id)
                          : [...selectedIds, user.id];
                        onChange(newIds.join(","));
                      } else {
                        onChange(user.id);
                        setDropdownOpen(false);
                        setSearch("");
                      }
                    }}
                  >
                    {isMultiple && <Checkbox checked={isSelected} />}
                    <div className="flex flex-col items-start">
                      <span>{user.name}</span>
                      <span className="text-[10px] text-muted-foreground">{user.username}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {isMultiple && selectedIds.length > 0 && (
            <div className="border-t p-1">
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                onClick={() => onChange("")}
              >
                清除选择
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StandardManagement({
  definitions,
  projectTypes,
  projectStages,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
  onDuplicate,
}: StandardManagementProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pasteColumnsOpen, setPasteColumnsOpen] = useState(false);
  const [pasteColumnsText, setPasteColumnsText] = useState("");
  const [selectedProjectType, setSelectedProjectType] = useState<string>("all");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [searchName, setSearchName] = useState("");

  // 抽屉式展开编辑
  const [expandedDefId, setExpandedDefId] = useState<string | null>(null);
  const [drawerFormData, setDrawerFormData] = useState<TableDefinition | null>(null);
  const [drawerFullscreen, setDrawerFullscreen] = useState(false);

  // 规范定义列表拖拽排序
  const [dragDefIndex, setDragDefIndex] = useState<number | null>(null);
  const [dragOverDefIndex, setDragOverDefIndex] = useState<number | null>(null);

  // 数据记录拖拽排序
  const [dragRecordIndex, setDragRecordIndex] = useState<number | null>(null);
  const [dragOverRecordIndex, setDragOverRecordIndex] = useState<number | null>(null);

  // 数据记录对话框状态
  const [dataDialogOpen, setDataDialogOpen] = useState(false);
  const [currentTableDef, setCurrentTableDef] = useState<TableDefinition | null>(null);
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [recordFormOpen, setRecordFormOpen] = useState(false);
  const [productModuleNames, setProductModuleNames] = useState<string[]>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
  const [moduleTypes, setModuleTypes] = useState<{code: string; name: string}[]>(MODULE_TYPES);

  // 加载模块类型列表（从数据库动态获取）
  useEffect(() => {
    const fetchModuleTypes = async () => {
      try {
        const res = await fetch("/api/module-types");
        const json = await res.json();
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          setModuleTypes(json.data.map((item: Record<string, unknown>) => ({ code: item.code as string, name: item.name as string })));
        }
      } catch { /* 降级使用硬编码 */ }
    };
    fetchModuleTypes();
  }, []);

  // 加载产品目录名称列表
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
  const [userList, setUserList] = useState<Array<{ id: string; name: string; username: string }>>([]);

  // 加载系统用户列表
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setUserList(json.data.map((item: Record<string, unknown>) => ({
            id: String(item.id),
            name: String(item.name || ""),
            username: String(item.username || ""),
          })));
        }
      } catch { /* ignore */ }
    };
    fetchUsers();
  }, []);
  const [editingRecord, setEditingRecord] = useState<Record<string, unknown> | null>(null);
  const [recordFormData, setRecordFormData] = useState<Record<string, unknown>>({});

  // 同步对话框状态
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncTableDef, setSyncTableDef] = useState<TableDefinition | null>(null);
  const [syncProjects, setSyncProjects] = useState<Array<{project_id: string; project_name: string; project_code: string; schema: string}>>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [syncMode, setSyncMode] = useState<'structure' | 'data' | 'both'>('both');
  const [syncDataMode, setSyncDataMode] = useState<'overwrite' | 'append'>('overwrite');
  const [syncing, setSyncing] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);

  // 引用关系对话框状态
  const [refDialogOpen, setRefDialogOpen] = useState(false);
  const [editingRef, setEditingRef] = useState<ReferenceConfig | null>(null);
  const [refForm, setRefForm] = useState<Omit<ReferenceConfig, 'id'>>({
    name: "",
    source_table_code: "",
    match_condition: { target_column: "", source_column: "" },
    column_mapping: [],
    bidirectional: true,
    entry_column: "",
  });

  const openAddRefDialog = () => {
    setEditingRef(null);
    setRefForm({
      name: "",
      source_table_code: "",
      match_condition: { target_column: "", source_column: "" },
      column_mapping: [],
      bidirectional: true,
      entry_column: "",
    });
    setRefDialogOpen(true);
  };

  const openEditRefDialog = (ref: ReferenceConfig) => {
    setEditingRef(ref);
    setRefForm({
      name: ref.name,
      source_table_code: ref.source_table_code,
      match_condition: { ...ref.match_condition },
      column_mapping: ref.column_mapping.map(m => ({ ...m })),
      bidirectional: ref.bidirectional,
      entry_column: ref.entry_column,
    });
    setRefDialogOpen(true);
  };

  const handleSaveRef = () => {
    if (!refForm.name || !refForm.source_table_code || !refForm.entry_column) return;
    if (!refForm.match_condition.target_column || !refForm.match_condition.source_column) return;
    if (refForm.column_mapping.length === 0) return;
    if (editingRef) {
      setFormData(prev => ({
        ...prev,
        references_config: (prev.references_config || []).map(r =>
          r.id === editingRef.id ? { ...refForm, id: editingRef.id } : r
        ),
      }));
    } else {
      const newRef: ReferenceConfig = { ...refForm, id: crypto.randomUUID() };
      setFormData(prev => ({
        ...prev,
        references_config: [...(prev.references_config || []), newRef],
      }));
    }
    setRefDialogOpen(false);
  };

  const handleDeleteRef = (refId: string) => {
    setFormData(prev => ({
      ...prev,
      references_config: (prev.references_config || []).filter(r => r.id !== refId),
    }));
  };

  const addRefColumnMapping = () => {
    setRefForm(prev => ({
      ...prev,
      column_mapping: [...prev.column_mapping, { target_column: "", source_column: "" }],
    }));
  };

  const updateRefColumnMapping = (index: number, field: 'target_column' | 'source_column', value: string) => {
    setRefForm(prev => ({
      ...prev,
      column_mapping: prev.column_mapping.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      ),
    }));
  };

  const removeRefColumnMapping = (index: number) => {
    setRefForm(prev => ({
      ...prev,
      column_mapping: prev.column_mapping.filter((_, i) => i !== index),
    }));
  };

  const addRefFilter = () => {
    setRefForm(prev => ({
      ...prev,
      filter_condition: [...(prev.filter_condition || []), { column: "", operator: "=", value: "" }],
    }));
  };

  const updateRefFilter = (index: number, field: 'column' | 'operator' | 'value', value: string) => {
    setRefForm(prev => ({
      ...prev,
      filter_condition: (prev.filter_condition || []).map((f, i) =>
        i === index ? { ...f, [field]: value } : f
      ),
    }));
  };

  const removeRefFilter = (index: number) => {
    setRefForm(prev => ({
      ...prev,
      filter_condition: (prev.filter_condition || []).filter((_, i) => i !== index),
    }));
  };

  const openSyncDialog = async (def: TableDefinition, mode: 'structure' | 'data' | 'both' = 'both') => {
    setSyncTableDef(def);
    setSelectedProjectIds([]);
    setSyncMode(mode);
    setSyncDataMode('overwrite');
    setSyncing(false);
    setShowAllProjects(false); // 每次打开重置为默认模式
    // 加载包含此表的项目
    try {
      const res = await fetch(`/api/standards/sync?tableCode=${encodeURIComponent(def.table_code)}`);
      const result = await res.json();
      const projects = result.data || [];
      setSyncProjects(projects);
      setSelectedProjectIds(projects.map((p: { project_id: string }) => p.project_id));
    } catch {
      setSyncProjects([]);
    }
    setSyncDialogOpen(true);
  };

  // 切换"显示所有项目"开关时重新加载项目列表
  const handleToggleShowAll = async (showAll: boolean) => {
    setShowAllProjects(showAll);
    if (!syncTableDef) return;
    try {
      const params = new URLSearchParams({ tableCode: syncTableDef.table_code });
      if (showAll) params.set("showAll", "true");
      const res = await fetch(`/api/standards/sync?${params.toString()}`);
      const result = await res.json();
      const projects = result.data || [];
      setSyncProjects(projects);
      // 保留已选中的项目，新项目也默认选中
      setSelectedProjectIds(prev => {
        const newIds = projects.map((p: { project_id: string }) => p.project_id);
        // 保留之前选中且仍然在列表中的项目
        const kept = prev.filter(id => newIds.includes(id));
        // 如果之前全选了，切换后也全选
        if (kept.length === 0 || prev.length === 0) return newIds;
        // 新增的项目也加入选中
        const added = newIds.filter((id: string) => !prev.includes(id));
        return [...kept, ...added];
      });
    } catch {
      setSyncProjects([]);
    }
  };

  const toggleProjectSelect = (projectId: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProjectIds.length === syncProjects.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(syncProjects.map(p => p.project_id));
    }
  };

  const handleSync = async () => {
    if (!syncTableDef || selectedProjectIds.length === 0) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/standards/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableCode: syncTableDef.table_code,
          projectIds: selectedProjectIds,
          syncSchema: syncMode === 'structure' || syncMode === 'both',
          syncData: syncMode === 'data' || syncMode === 'both',
          syncDataMode,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        const results = result.data || [];
        const summary = results.map((r: { project: string; schema: boolean; data: boolean; errors: string[] }) => {
          const parts: string[] = [];
          if (r.schema) parts.push('结构同步成功');
          if (r.data) parts.push('数据同步成功');
          if (r.errors.length > 0) parts.push(`错误: ${r.errors.join(', ')}`);
          return `${r.project}: ${parts.join(', ') || '无变更'}`;
        }).join('\n');
        alert(`同步完成：\n${summary}`);
        setSyncDialogOpen(false);
      } else {
        alert('同步失败: ' + (result.error || '未知错误'));
      }
    } catch (err) {
      alert('同步失败: ' + String(err));
    } finally {
      setSyncing(false);
    }
  };

  const [formData, setFormData] = useState<Partial<TableDefinition>>({
    table_code: "",
    table_name: "",
    module_type: [],
    description: "",
    columns_config: [],
    apply_project_types: [],
    apply_project_stages: [],
    stage_desc_column: "",
    stage_display_mode: "both",
    stage_role_column: "",
    sort_order: 0,
    is_active: true,
    allow_add: true,
  });

  const filteredDefinitions = definitions.filter((def) => {
    if (selectedProjectType !== "all" && !def.apply_project_types.includes(selectedProjectType)) {
      return false;
    }
    if (selectedModule !== "all") {
      const modules = Array.isArray(def.module_type)
        ? def.module_type
        : def.module_type
        ? [def.module_type]
        : [];
      if (!modules.includes(selectedModule)) {
        return false;
      }
    }
    if (selectedStage !== "all" && !def.apply_project_stages.includes(selectedStage)) {
      return false;
    }
    if (searchName) {
      const keyword = searchName.toLowerCase();
      const nameMatch = def.table_name?.toLowerCase().includes(keyword);
      const codeMatch = def.table_code?.toLowerCase().includes(keyword);
      if (!nameMatch && !codeMatch) return false;
    }
    return true;
  });

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({
      table_code: "",
      table_name: "",
      module_type: [],
      description: "",
      columns_config: [],
      references_config: [],
      apply_project_types: [],
      apply_project_stages: [],
      sort_order: definitions.length,
      is_active: true,
      allow_add: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (def: TableDefinition) => {
    setEditingId(def.id);
    // 兼容旧数据：确保 module_type 是数组
    const dedupedColumns = dedupeColumnsByName(def.columns_config || []);
    if (dedupedColumns.length < (def.columns_config || []).length) {
      toast.warning(`检测到 ${(def.columns_config || []).length - dedupedColumns.length} 个重复列名，已自动去除`);
    }
    const normalizedDef = {
      ...def,
      columns_config: dedupedColumns,
      module_type: Array.isArray(def.module_type)
        ? def.module_type
        : def.module_type
        ? [def.module_type]
        : [],
      references_config: def.references_config || [],
    };
    setFormData(normalizedDef);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const cols = formData.columns_config || [];
    const deduped = dedupeColumnsByName(cols);
    if (deduped.length < cols.length) {
      toast.warning(`检测到 ${cols.length - deduped.length} 个重复列名，已自动去除`);
    }
    const cleanFormData = { ...formData, columns_config: deduped };
    if (editingId) {
      onUpdate(editingId, cleanFormData);
    } else {
      onCreate(cleanFormData);
    }
    setDialogOpen(false);
  };

  const addColumn = () => {
    setFormData((prev) => ({
      ...prev,
      columns_config: [
        ...(prev.columns_config || []),
        { name: "", type: "text", required: false, readonly: false, description: "", options: [] },
      ],
    }));
  };

  const removeColumn = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      columns_config: prev.columns_config?.filter((_, i) => i !== index),
    }));
  };

  const updateColumn = (index: number, field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      columns_config: prev.columns_config?.map((col, i) =>
        i === index ? { ...col, [field]: value } : col
      ),
    }));
  };

  const addColumnOption = (colIndex: number, option: string) => {
    if (!option.trim()) return;
    setFormData((prev) => ({
      ...prev,
      columns_config: prev.columns_config?.map((col, i) =>
        i === colIndex ? { ...col, options: [...(col.options || []), option.trim()] } : col
      ),
    }));
  };

  const removeColumnOption = (colIndex: number, optIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      columns_config: prev.columns_config?.map((col, i) =>
        i === colIndex ? { ...col, options: (col.options || []).filter((_, oi) => oi !== optIndex) } : col
      ),
    }));
  };

  const addColumnQuickInput = (colIndex: number, phrase: string) => {
    if (!phrase.trim()) return;
    setFormData((prev) => ({
      ...prev,
      columns_config: prev.columns_config?.map((col, i) =>
        i === colIndex ? { ...col, quick_inputs: [...(col.quick_inputs || []), phrase.trim()] } : col
      ),
    }));
  };

  const removeColumnQuickInput = (colIndex: number, qiIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      columns_config: prev.columns_config?.map((col, i) =>
        i === colIndex ? { ...col, quick_inputs: (col.quick_inputs || []).filter((_, qii) => qii !== qiIndex) } : col
      ),
    }));
  };

  // 导出列配置为 Excel
  const handleExportColumns = async () => {
    const cols = formData.columns_config || [];
    if (cols.length === 0) {
      toast.warning("暂无列配置，无法导出");
      return;
    }
    try {
      const XLSX = await import("xlsx");
      const xlsxLib = (XLSX as any).default || XLSX;
      const exportData = cols.map((col) => ({
        "列名": col.name,
        "类型": col.type,
        "必填": col.required ? "是" : "否",
        "只读": col.readonly ? "是" : "否",
        "描述": col.description || "",
        "选项": (col.options || []).join(", "),
        "快捷语": (col.quick_inputs || []).join(", "),
        "显示格式": col.format || "",
      }));
      const worksheet = xlsxLib.utils.json_to_sheet(exportData);
      const workbook = xlsxLib.utils.book_new();
      xlsxLib.utils.book_append_sheet(workbook, worksheet, "列配置");
      xlsxLib.writeFile(workbook, `${formData.table_name || "列配置"}_列配置.xlsx`);
      toast.success(`导出成功，共 ${cols.length} 列`);
    } catch (e) {
      console.error("导出列配置失败:", e);
      toast.error(`导出失败: ${(e as Error).message}`);
    }
  };

  // 从 Excel 导入列配置
  const handleImportColumns = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const xlsxLib = (XLSX as any).default || XLSX;
      const workbook = xlsxLib.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: Record<string, unknown>[] = xlsxLib.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.warning("Excel 文件为空");
        event.target.value = "";
        return;
      }

      const typeMap: Record<string, string> = {
        "文本": "text", "text": "text",
        "数字": "number", "number": "number",
        "日期": "date", "date": "date",
        "单选": "select", "select": "select",
        "多选": "multiple_select", "multiple_select": "multiple_select",
        "多行文本": "textarea", "textarea": "textarea",
        "产品目录": "procurement_module", "procurement_module": "procurement_module",
        "附件": "attachment", "attachment": "attachment",
        "视频": "video", "video": "video",
        "采购模块记录": "procurement_record", "procurement_record": "procurement_record",
        "用户": "user", "user": "user",
      };

      const imported: ColumnConfig[] = jsonData.map((row) => {
        const rawType = String(row["类型"] ?? row["type"] ?? "text");
        const type = typeMap[rawType] || rawType;
        const optionsStr = String(row["选项"] ?? row["options"] ?? "");
        const options = optionsStr ? optionsStr.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) : [];
        const quickInputsStr = String(row["快捷语"] ?? row["quick_inputs"] ?? "");
        const quickInputs = quickInputsStr ? quickInputsStr.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) : [];

        const rawFormat = String(row["显示格式"] ?? row["format"] ?? "");
        const format = (rawFormat === "percent" || rawFormat === "百分比") ? "percent" : (rawFormat === "number" || rawFormat === "普通数字") ? undefined : undefined;

        return {
          name: String(row["列名"] ?? row["name"] ?? ""),
          type,
          required: String(row["必填"] ?? row["required"] ?? "") === "是",
          readonly: String(row["只读"] ?? row["readonly"] ?? "") === "是",
          description: String(row["描述"] ?? row["description"] ?? "") || undefined,
          options: options.length > 0 ? options : undefined,
          quick_inputs: quickInputs.length > 0 ? quickInputs : undefined,
          format: format as ColumnConfig["format"],
        };
      }).filter((col) => col.name);

      if (imported.length === 0) {
        toast.warning("未能解析到有效的列配置，请检查列名是否正确");
        event.target.value = "";
        return;
      }

      setFormData((prev) => ({ ...prev, columns_config: imported }));
      toast.success(`成功导入 ${imported.length} 个列配置`);
    } catch (e) {
      console.error("导入列配置失败:", e);
      toast.error(`导入失败: ${(e as Error).message}`);
    }

    event.target.value = "";
  };

  // 拖拽排序相关
  const [dragColIndex, setDragColIndex] = useState<number | null>(null);
  const [dragOverColIndex, setDragOverColIndex] = useState<number | null>(null);

  const moveColumn = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setFormData((prev) => {
      const cols = [...(prev.columns_config || [])];
      const [moved] = cols.splice(fromIndex, 1);
      cols.splice(toIndex, 0, moved);
      return { ...prev, columns_config: cols };
    });
  };

  const toggleModule = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      module_type: prev.module_type?.includes(code)
        ? prev.module_type.filter((m) => m !== code)
        : [...(prev.module_type || []), code],
    }));
  };

  const toggleProjectType = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      apply_project_types: prev.apply_project_types?.includes(code)
        ? prev.apply_project_types.filter((t) => t !== code)
        : [...(prev.apply_project_types || []), code],
    }));
  };

  const toggleProjectStage = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      apply_project_stages: prev.apply_project_stages?.includes(code)
        ? prev.apply_project_stages.filter((s) => s !== code)
        : [...(prev.apply_project_stages || []), code],
    }));
  };

  // ============ 抽屉式编辑面板 ============
  const openDrawer = (def: TableDefinition) => {
    if (expandedDefId === def.id) {
      setExpandedDefId(null);
      setDrawerFormData(null);
      return;
    }
    setExpandedDefId(def.id);
    setDrawerFormData({
      ...def,
      module_type: Array.isArray(def.module_type) ? [...def.module_type] : def.module_type ? [def.module_type] : [],
      columns_config: (def.columns_config || []).map((c) => ({ ...c })),
      references_config: (def.references_config || []).map((r) => ({ ...r })),
      apply_project_types: [...(def.apply_project_types || [])],
      apply_project_stages: [...(def.apply_project_stages || [])],
    });
  };

  const closeDrawer = () => {
    setExpandedDefId(null);
    setDrawerFormData(null);
    setDrawerFullscreen(false);
  };

  const handleDrawerSave = () => {
    if (!drawerFormData || !expandedDefId) return;
    const deduped = dedupeColumnsByName(drawerFormData.columns_config || []);
    if (deduped.length < (drawerFormData.columns_config || []).length) {
      toast.warning(`检测到 ${(drawerFormData.columns_config || []).length - deduped.length} 个重复列名，已自动去除`);
    }
    onUpdate(expandedDefId, { ...drawerFormData, columns_config: deduped });
    closeDrawer();
  };

  const drawerUpdateField = (field: string, value: unknown) => {
    setDrawerFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const drawerToggleModule = (code: string) => {
    setDrawerFormData((prev) => {
      if (!prev) return null;
      const modules = prev.module_type || [];
      return { ...prev, module_type: modules.includes(code) ? modules.filter((m) => m !== code) : [...modules, code] };
    });
  };

  const drawerToggleProjectType = (code: string) => {
    setDrawerFormData((prev) => {
      if (!prev) return null;
      const types = prev.apply_project_types || [];
      return { ...prev, apply_project_types: types.includes(code) ? types.filter((t) => t !== code) : [...types, code] };
    });
  };

  const drawerToggleProjectStage = (code: string) => {
    setDrawerFormData((prev) => {
      if (!prev) return null;
      const stages = prev.apply_project_stages || [];
      return { ...prev, apply_project_stages: stages.includes(code) ? stages.filter((s) => s !== code) : [...stages, code] };
    });
  };

  const drawerAddColumn = () => {
    setDrawerFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        columns_config: [...(prev.columns_config || []), { name: "", type: "text", required: false, readonly: false, description: "", options: [] }],
      };
    });
  };

  const drawerRemoveColumn = (index: number) => {
    setDrawerFormData((prev) => {
      if (!prev) return null;
      return { ...prev, columns_config: (prev.columns_config || []).filter((_, i) => i !== index) };
    });
  };

  const drawerUpdateColumn = (index: number, field: string, value: unknown) => {
    setDrawerFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        columns_config: (prev.columns_config || []).map((col, i) => (i === index ? { ...col, [field]: value } : col)),
      };
    });
  };

  const drawerAddColumnOption = (colIndex: number, option: string) => {
    if (!option.trim()) return;
    setDrawerFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        columns_config: (prev.columns_config || []).map((col, i) =>
          i === colIndex ? { ...col, options: [...(col.options || []), option.trim()] } : col
        ),
      };
    });
  };

  const drawerRemoveColumnOption = (colIndex: number, optIndex: number) => {
    setDrawerFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        columns_config: (prev.columns_config || []).map((col, i) =>
          i === colIndex ? { ...col, options: (col.options || []).filter((_, oi) => oi !== optIndex) } : col
        ),
      };
    });
  };

  const drawerAddColumnQuickInput = (colIndex: number, phrase: string) => {
    if (!phrase.trim()) return;
    setDrawerFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        columns_config: (prev.columns_config || []).map((col, i) =>
          i === colIndex ? { ...col, quick_inputs: [...(col.quick_inputs || []), phrase.trim()] } : col
        ),
      };
    });
  };

  const drawerRemoveColumnQuickInput = (colIndex: number, qiIndex: number) => {
    setDrawerFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        columns_config: (prev.columns_config || []).map((col, i) =>
          i === colIndex ? { ...col, quick_inputs: (col.quick_inputs || []).filter((_, qii) => qii !== qiIndex) } : col
        ),
      };
    });
  };

  // 打开数据记录对话框
  const openDataDialog = async (def: TableDefinition) => {
    setCurrentTableDef({ ...def, columns_config: dedupeColumnsByName(def.columns_config || []) });
    setDataDialogOpen(true);
    await loadTableData(def.table_code);
  };

  // 加载表数据
  const loadTableData = async (tableCode: string) => {
    setLoadingData(true);
    setSelectedRecordIds(new Set());
    try {
      const res = await fetch(`/api/standards-data/${tableCode}`);
      if (res.ok) {
        const result = await res.json();
        setTableData(result.data || []);
      } else {
        setTableData([]);
      }
    } catch {
      setTableData([]);
    } finally {
      setLoadingData(false);
    }
  };

  // 打开新增记录表单
  const openAddRecordForm = () => {
    if (!currentTableDef) return;
    setEditingRecord(null);
    const initialData: Record<string, unknown> = {};
    currentTableDef.columns_config?.forEach((col) => {
      initialData[col.name] = col.type === "boolean" ? false : "";
    });
    setRecordFormData(initialData);
    setRecordFormOpen(true);
  };

  // 打开编辑记录表单
  const openEditRecordForm = (record: Record<string, unknown>) => {
    setEditingRecord(record);
    setRecordFormData({ ...record });
    setRecordFormOpen(true);
  };

  // 保存记录
  const handleSaveRecord = async () => {
    if (!currentTableDef) return;
    try {
      const url = `/api/standards-data/${currentTableDef.table_code}`;
      const method = editingRecord ? "PUT" : "POST";
      const body = editingRecord 
        ? { id: editingRecord.id, data: recordFormData }
        : recordFormData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await loadTableData(currentTableDef.table_code);
        setRecordFormOpen(false);
        setEditingRecord(null);
      } else {
        const error = await res.json();
        console.error("保存失败:", error);
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  // 删除记录
  const handleDeleteRecord = async (recordId: string) => {
    if (!currentTableDef) return;
    if (!confirm("确定要删除这条记录吗？")) return;
    
    try {
      const res = await fetch(`/api/standards-data/${currentTableDef.table_code}?id=${recordId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await loadTableData(currentTableDef.table_code);
      }
    } catch (error) {
      console.error("删除失败:", error);
    }
  };

  // 切换记录的权限状态（可删除 / 行只读）
  const handleToggleAllowDelete = async (recordId: string, checked: boolean, field = "allow_delete") => {
    if (!currentTableDef) return;
    try {
      const res = await fetch(`/api/standards-data/${currentTableDef.table_code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recordId, data: { [field]: checked } }),
      });
      if (res.ok) await loadTableData(currentTableDef.table_code);
    } catch (error) {
      console.error("更新状态失败:", error);
    }
  };

  // 批量设置可删除状态
  const handleBatchToggleAllowDelete = async (allowDelete: boolean) => {
    if (!currentTableDef || selectedRecordIds.size === 0) return;
    try {
      const res = await fetch(`/api/standards-data/${currentTableDef.table_code}/batch`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedRecordIds), data: { allow_delete: allowDelete } }),
      });
      if (res.ok) {
        toast.success(`已设置 ${selectedRecordIds.size} 条记录${allowDelete ? "可删除" : "不可删除"}`);
        setSelectedRecordIds(new Set());
        await loadTableData(currentTableDef.table_code);
      } else {
        const error = await res.json();
        toast.error("批量设置失败: " + (error.error || "未知错误"));
      }
    } catch (error) {
      toast.error("批量设置失败");
      console.error("批量设置可删除状态失败:", error);
    }
  };

  // 批量删除记录
  const handleBatchDelete = async () => {
    if (!currentTableDef || selectedRecordIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedRecordIds.size} 条记录吗？`)) return;
    try {
      const res = await fetch(`/api/standards-data/${currentTableDef.table_code}/batch`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedRecordIds) }),
      });
      if (res.ok) {
        const result = await res.json();
        toast.success(`已删除 ${result.deleted || selectedRecordIds.size} 条记录`);
        setSelectedRecordIds(new Set());
        await loadTableData(currentTableDef.table_code);
      } else {
        const error = await res.json();
        toast.error("批量删除失败: " + (error.error || "未知错误"));
      }
    } catch (error) {
      toast.error("批量删除失败");
      console.error("批量删除失败:", error);
    }
  };

  // 切换选中状态
  const toggleRecordSelect = (id: string) => {
    setSelectedRecordIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 全选/取消全选记录
  const toggleRecordSelectAll = () => {
    if (selectedRecordIds.size === tableData.length && tableData.length > 0) {
      setSelectedRecordIds(new Set());
    } else {
      setSelectedRecordIds(new Set(tableData.map(r => r.id as string).filter(Boolean)));
    }
  };

  // 调整记录顺序（拖拽）
  const handleMoveRecord = async (fromIndex: number, toIndex: number) => {
    if (!currentTableDef) return;
    try {
      const res = await fetch(`/api/standards-data/${currentTableDef.table_code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromIndex, toIndex }),
      });

      if (res.ok) {
        await loadTableData(currentTableDef.table_code);
      }
    } catch (error) {
      console.error("调整顺序失败:", error);
    }
  };

  // 调整记录顺序（上下移动按钮）
  const handleMoveRecordDirection = async (id: string, direction: "up" | "down") => {
    if (!currentTableDef) return;
    try {
      const res = await fetch(`/api/standards-data/${currentTableDef.table_code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, direction }),
      });

      if (res.ok) {
        await loadTableData(currentTableDef.table_code);
      }
    } catch (error) {
      console.error("移动记录失败:", error);
    }
  };

  // 导出数据为 Excel
  const handleExportData = async () => {
    if (!currentTableDef) return;
    try {
      const res = await fetch(`/api/standards-data/${currentTableDef.table_code}/export`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${currentTableDef.table_code}_export.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
        toast.success("导出成功");
      } else {
        const errorData = await res.json();
        toast.error("导出失败: " + (errorData.error || "未知错误"));
      }
    } catch (error) {
      console.error("导出失败:", error);
      toast.error("导出失败");
    }
  };

  // 导入 Excel 数据
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentTableDef) return;
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/standards-data/${currentTableDef.table_code}/import`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        if (result.errors && result.errors.length > 0) {
          toast.warning(`导入完成: 成功 ${result.imported}/${result.total} 条，部分失败`, {
            description: result.errors.slice(0, 3).join("\n"),
          });
        } else {
          toast.success(`导入成功: ${result.imported} 条记录`);
        }
        await loadTableData(currentTableDef.table_code);
      } else {
        const errorData = await res.json();
        toast.error("导入失败: " + (errorData.error || "未知错误"));
      }
    } catch (error) {
      console.error("导入失败:", error);
      toast.error("导入失败: 文件格式错误");
    }
    
    // 清空文件输入
    event.target.value = "";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Settings className="w-6 h-6" />
              规范管理
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              创建和管理项目数据表模板，用于新项目时自动复制
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                新建数据表
              </Button>
            </DialogTrigger>
            <DialogContent className="!max-w-[1000px] !w-[95vw] !flex !flex-col !p-0 !gap-0" style={{ height: '85vh' }}>
              <DialogHeader className="px-6 pt-5 pb-3 shrink-0 border-b">
                <DialogTitle>{editingId ? "编辑数据表" : "新建数据表"}</DialogTitle>
                <DialogDescription>定义数据表的结构和适用范围</DialogDescription>
              </DialogHeader>
              
              <div className="flex gap-4 flex-1 min-h-0 p-4 overflow-hidden">
                {/* 左侧：表单内容 */}
                <div className="flex-1 min-w-0 space-y-3 overflow-y-auto pr-2">
                  {/* 基本信息 */}
                  <SectionPanel title="基本信息" icon={FileText} defaultOpen>
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div>
                        <Label className="text-[11px]">表代码 *</Label>
                        <Input value={formData.table_code || ""} onChange={(e) => setFormData((prev) => ({ ...prev, table_code: e.target.value }))}
                          placeholder="如: scope_wbs" disabled={!!editingId} className="h-7 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[11px]">表名称 *</Label>
                        <Input value={formData.table_name || ""} onChange={(e) => setFormData((prev) => ({ ...prev, table_name: e.target.value }))}
                          placeholder="如: WBS分解表" className="h-7 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[11px]">描述</Label>
                        <Input value={formData.description || ""} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="表描述" className="h-7 text-xs" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-2 mt-2 border-t">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <Switch checked={formData.allow_add !== false} onCheckedChange={(c: boolean) => setFormData((prev) => ({ ...prev, allow_add: c }))} className="scale-75" />
                        <span className="text-[11px] font-medium">允许添加</span>
                      </label>
                      <span className="text-[9px] text-muted-foreground">关闭后项目中将不显示"添加"按钮</span>
                    </div>
                  </SectionPanel>
                  <SectionPanel title="所属模块" icon={Layers} badge={formData.module_type?.length || null}>
                    <div className="pt-2">
                      <div className="grid grid-cols-5 gap-1">
                        {moduleTypes.map((module) => (
                          <label key={module.code}
                            className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs cursor-pointer hover:bg-accent has-[:checked]:bg-primary/10 has-[:checked]:text-primary">
                            <Checkbox checked={formData.module_type?.includes(module.code)} onCheckedChange={() => toggleModule(module.code)} className="h-3 w-3" />
                            <span className="truncate text-[11px]">{module.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </SectionPanel>

                  {/* 适用范围 */}
                  <SectionPanel title="适用范围" icon={Settings} badge={(formData.apply_project_types?.length || 0) + (formData.apply_project_stages?.length || 0) || null}>
                    <div className="pt-2 space-y-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.5px] font-semibold">适用类型</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {projectTypes.map((type) => (
                            <button key={type.code} type="button" onClick={() => toggleProjectType(type.code)}
                              className={`text-[10px] px-2 py-1 rounded border ${
                                formData.apply_project_types?.includes(type.code) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-border"}`}>{type.name}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-[0.5px] font-semibold">适用阶段</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {projectStages.map((stage) => (
                            <button key={stage.code} type="button" onClick={() => toggleProjectStage(stage.code)}
                              className={`text-[10px] px-2 py-1 rounded border ${
                                formData.apply_project_stages?.includes(stage.code) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-border"}`}>{stage.name}</button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3">
                        <Label className="text-xs font-medium mb-2 block">
                          阶段式布局-任务概述列 <span className="text-muted-foreground font-normal">(可选)</span>
                        </Label>
                        <p className="text-[10px] text-muted-foreground mb-1.5">
                          选中后，阶段式布局中点击该表记录时，将显示此列的内容作为任务概述
                        </p>
                        <select
                          value={formData.stage_desc_column || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, stage_desc_column: e.target.value }))
                          }
                          className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                        >
                          <option value="">不选（无概述）</option>
                          {(formData.columns_config || []).map((col, ci) => (
                            <option key={`col-${ci}-${col.name}`} value={col.name}>
                              {col.name || "(未命名列)"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-3">
                        <Label className="text-xs font-medium mb-2 block">
                          阶段式布局-显示位置
                        </Label>
                        <p className="text-[10px] text-muted-foreground mb-1.5">
                          控制该表在阶段式布局中的显示位置
                        </p>
                        <select
                          value={formData.stage_display_mode || "both"}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, stage_display_mode: e.target.value }))
                          }
                          className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs"
                        >
                          <option value="both">两者都显示</option>
                          <option value="menu">仅在左侧菜单显示</option>
                          <option value="phase">仅在阶段任务显示</option>
                        </select>
                      </div>
                    </div>
                  </SectionPanel>

                  {/* 阶段式布局-进度与汇总 */}
                  <SectionPanel title="阶段式布局-进度与汇总" icon={Settings}>
                    <div className="pt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[11px]">进度计算列</Label>
                          <p className="text-[9px] text-muted-foreground mb-0.5">选择用于判断完成状态的列</p>
                          <select value={formData.stage_progress_column || ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, stage_progress_column: e.target.value }))}
                            className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                            <option value="">不计算进度</option>
                            {(formData.columns_config || []).map((col, ci) => (
                              <option key={`pc_${ci}`} value={col.name}>{col.name || "(未命名)"}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-[11px]">完成目标值</Label>
                          <p className="text-[9px] text-muted-foreground mb-0.5">所有记录此列等于该值即 100%</p>
                          {(() => {
                            const progressCol = (formData.columns_config || []).find((c) => c.name === formData.stage_progress_column);
                            const options = progressCol?.options || [];
                            return options.length > 0 ? (
                              <select value={formData.stage_progress_target || ""}
                                onChange={(e) => setFormData((prev) => ({ ...prev, stage_progress_target: e.target.value }))}
                                className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                                <option value="">选择目标</option>
                                {options.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <Input value={formData.stage_progress_target || ""}
                                onChange={(e) => setFormData((prev) => ({ ...prev, stage_progress_target: e.target.value }))}
                                placeholder="输入目标值" className="h-7 text-[11px]" />
                            );
                          })()}
                        </div>
                      </div>
                      <div>
                        <Label className="text-[11px]">汇总显示列 <span className="text-muted-foreground font-normal">（最多6列，横向选择）</span></Label>
                        <p className="text-[9px] text-muted-foreground mb-1">勾选 = 摘要区显示，红色 = 明细表中隐藏</p>
                        {(() => {
                          const currentFields = (formData.stage_summary_fields || "").split("\n").map((l) => l.trim()).filter(Boolean);
                          return (
                            <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto border rounded p-1.5">
                              {(formData.columns_config || []).map((col) => {
                                if (!col.name) return null;
                                const existingLine = currentFields.find(
                                  (l) => l === col.name || l === `-${col.name}`
                                );
                                const isSelected = !!existingLine;
                                const isHidden = existingLine?.startsWith("-");
                                const canAdd = !isSelected && currentFields.length < 6;
                                return (
                                  <label key={col.name}
                                    className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] cursor-pointer ${
                                      isSelected ? "bg-primary/10" : "hover:bg-muted"
                                    } ${!isSelected && !canAdd ? "opacity-40 pointer-events-none" : ""}`}>
                                    <input type="checkbox" checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          const next = [...currentFields, col.name];
                                          setFormData((prev) => ({ ...prev, stage_summary_fields: next.join("\n") }));
                                        } else {
                                          const next = currentFields.filter((l) => l !== col.name && l !== `-${col.name}`);
                                          setFormData((prev) => ({ ...prev, stage_summary_fields: next.join("\n") }));
                                        }
                                      }}
                                      className="w-3 h-3" />
                                    <span className="flex-1 truncate">{col.name}</span>
                                    {isSelected && (
                                      <button type="button"
                                        onClick={() => {
                                          const next = currentFields.map((l) =>
                                            l === col.name ? `-${col.name}` : l === `-${col.name}` ? col.name : l
                                          );
                                          setFormData((prev) => ({ ...prev, stage_summary_fields: next.join("\n") }));
                                        }}
                                        className={`text-[9px] px-1 py-0.5 rounded border cursor-pointer ${
                                          isHidden ? "text-red-500 border-red-300" : "text-green-600 border-green-300"
                                        }`}
                                        title={isHidden ? "隐藏中，点击显示" : "显示中，点击隐藏"}>
                                        {isHidden ? "隐藏" : "显示"}
                                      </button>
                                    )}
                                  </label>
                                );
                              })}
                              {(formData.columns_config || []).filter((c) => c.name).length === 0 && (
                                <span className="text-[10px] text-muted-foreground p-1">请先配置列</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    {/* 阶段日期绑定 */}
                    <div className="pt-2 mt-2 border-t">
                      <Label className="text-[11px] font-medium mb-1.5 block">阶段日期绑定</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px]">计划开始列</Label>
                          <select value={formData.stage_plan_start_col || ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, stage_plan_start_col: e.target.value }))}
                            className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                            <option value="">不绑定</option>
                            {(formData.columns_config || []).filter((c) => c.type === "date").map((c) => (
                              <option key={c.name} value={c.name}>{c.name || "(未命名)"}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-[10px]">计划完成列</Label>
                          <select value={formData.stage_plan_end_col || ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, stage_plan_end_col: e.target.value }))}
                            className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                            <option value="">不绑定</option>
                            {(formData.columns_config || []).filter((c) => c.type === "date").map((c) => (
                              <option key={c.name} value={c.name}>{c.name || "(未命名)"}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-[10px]">实际开始列</Label>
                          <select value={formData.stage_actual_start_col || ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, stage_actual_start_col: e.target.value }))}
                            className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                            <option value="">不绑定</option>
                            {(formData.columns_config || []).filter((c) => c.type === "date").map((c) => (
                              <option key={c.name} value={c.name}>{c.name || "(未命名)"}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-[10px]">实际完成列</Label>
                          <select value={formData.stage_actual_end_col || ""}
                            onChange={(e) => setFormData((prev) => ({ ...prev, stage_actual_end_col: e.target.value }))}
                            className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                            <option value="">不绑定</option>
                            {(formData.columns_config || []).filter((c) => c.type === "date").map((c) => (
                              <option key={c.name} value={c.name}>{c.name || "(未命名)"}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    {/* 甘特图配置 */}
                    <div className="pt-2 mt-2 border-t">
                      <Label className="text-[11px] font-medium mb-1.5 flex items-center gap-2">
                        <input type="checkbox" checked={formData.gantt_enabled === true}
                          onChange={(e) => setFormData((prev) => ({ ...prev, gantt_enabled: e.target.checked }))}
                          className="w-3.5 h-3.5" />
                        甘特图显示
                      </Label>
                      {formData.gantt_enabled && (
                        <div className="grid grid-cols-2 gap-2 pl-5 mt-1">
                          <div>
                            <Label className="text-[10px]">起始日期列</Label>
                            <select value={formData.gantt_start_col || ""}
                              onChange={(e) => setFormData((prev) => ({ ...prev, gantt_start_col: e.target.value }))}
                              className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                              <option value="">选择列</option>
                              {(formData.columns_config || []).filter((c) => c.type === "date" && c.name).map((c) => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-[10px]">结束日期列</Label>
                            <select value={formData.gantt_end_col || ""}
                              onChange={(e) => setFormData((prev) => ({ ...prev, gantt_end_col: e.target.value }))}
                              className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                              <option value="">选择列</option>
                              {(formData.columns_config || []).filter((c) => c.type === "date" && c.name).map((c) => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-[10px]">任务名称列</Label>
                            <select value={formData.gantt_name_col || ""}
                              onChange={(e) => setFormData((prev) => ({ ...prev, gantt_name_col: e.target.value }))}
                              className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                              <option value="">选择列</option>
                              {(formData.columns_config || []).filter((c) => c.name).map((c) => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-[10px]">分组列（可选）</Label>
                            <select value={formData.gantt_group_col || ""}
                              onChange={(e) => setFormData((prev) => ({ ...prev, gantt_group_col: e.target.value }))}
                              className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                              <option value="">不分组</option>
                              {(formData.columns_config || []).filter((c) => c.name).map((c) => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-[10px]">里程碑标记列（可选）</Label>
                            <select value={formData.gantt_milestone_col || ""}
                              onChange={(e) => setFormData((prev) => ({ ...prev, gantt_milestone_col: e.target.value }))}
                              className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                              <option value="">无里程碑</option>
                              {(formData.columns_config || []).filter((c) => c.name).map((c) => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          {formData.gantt_milestone_col && (
                            <div>
                              <Label className="text-[10px]">里程碑标记值</Label>
                              <Input value={formData.gantt_milestone_value || ""}
                                onChange={(e) => setFormData((prev) => ({ ...prev, gantt_milestone_value: e.target.value }))}
                                placeholder="如: 是" className="h-7 text-[11px]" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </SectionPanel>

                  {/* 阶段式布局-阶段统计 */}
                  <SectionPanel title="阶段式布局-阶段统计" icon={Settings}>
                    <div className="pt-2 space-y-2">
                      <div>
                        <Label className="text-[11px]">角色列</Label>
                        <p className="text-[9px] text-muted-foreground mb-1">选择后，阶段详情中的人力将以此列的去重值统计</p>
                        <select
                          value={formData.stage_role_column || ""}
                          onChange={(e) => setFormData((prev) => ({ ...prev, stage_role_column: e.target.value }))}
                          className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]"
                        >
                          <option value="">不统计人力</option>
                          {(formData.columns_config || []).map((col, ci) => (
                            <option key={`rc_${ci}`} value={col.name}>
                              {col.name || "(未命名)"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </SectionPanel>

                  {/* 列配置 */}
                  <SectionPanel
                    title="列配置"
                    icon={Database}
                    badge={formData.columns_config?.length || null}
                  >
                    <div className="pt-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={addColumn} className="h-8 text-xs gap-1">
                          <Plus className="h-3.5 w-3.5" /> 添加列
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setPasteColumnsOpen(true)} className="h-8 text-xs gap-1">
                          <span className="text-xs mr-0.5">📋</span> 粘贴列名
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleExportColumns} className="h-8 text-xs gap-1" disabled={formData.columns_config?.length === 0}>
                          <Download className="h-3.5 w-3.5" /> 导出列配置
                        </Button>
                        <label>
                          <Button type="button" variant="outline" size="sm" asChild className="h-8 text-xs gap-1">
                            <span>
                              <Upload className="h-3.5 w-3.5" /> 导入列配置
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleImportColumns}
                          />
                        </label>
                      </div>

                      {formData.columns_config?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">暂无列定义</p>
                        </div>
                      ) : (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="w-8"></TableHead>
                                <TableHead className="text-xs">列名</TableHead>
                                <TableHead className="text-xs w-28">类型</TableHead>
                                <TableHead className="text-xs w-12 text-center">必填</TableHead>
                                <TableHead className="text-xs w-12 text-center">只读</TableHead>
                                <TableHead className="text-xs">描述</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {formData.columns_config?.map((col, index) => (
                                <Fragment key={index}>
                                <TableRow
                                  draggable
                                  onDragStart={(e) => {
                                    setDragColIndex(index);
                                    setDragOverColIndex(null);
                                    e.dataTransfer.effectAllowed = "move";
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                    setDragOverColIndex(index);
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    if (dragColIndex !== null && dragColIndex !== index) {
                                      moveColumn(dragColIndex, index);
                                    }
                                    setDragColIndex(null);
                                    setDragOverColIndex(null);
                                  }}
                                  onDragEnd={() => {
                                    setDragColIndex(null);
                                    setDragOverColIndex(null);
                                  }}
                                  className={`${dragColIndex === index ? "opacity-40 bg-muted/20" : ""} ${dragOverColIndex === index && dragColIndex !== index ? "ring-2 ring-primary ring-inset" : ""} transition-all cursor-grab active:cursor-grabbing`}
                                >
                                  <TableCell>
                                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={col.name}
                                      onChange={(e) => updateColumn(index, "name", e.target.value)}
                                      placeholder="列名"
                                      className="h-8 text-sm min-w-[160px]"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Select
                                      value={col.type}
                                      onValueChange={(value) => updateColumn(index, "type", value)}
                                    >
                                      <SelectTrigger className="h-8 text-sm w-full min-w-[120px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {COLUMN_TYPES.map((type) => (
                                          <SelectItem key={type.code} value={type.code}>
                                            {type.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={col.required}
                                      onCheckedChange={(checked) =>
                                        updateColumn(index, "required", checked)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Checkbox
                                      checked={col.readonly || false}
                                      onCheckedChange={(checked) =>
                                        updateColumn(index, "readonly", checked)
                                      }
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={col.description || ""}
                                      onChange={(e) =>
                                        updateColumn(index, "description", e.target.value)
                                      }
                                      placeholder="描述"
                                      className="h-8 text-sm"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => removeColumn(index)}
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                                {(col.type === "select" || col.type === "multiple_select") && (
                                  <TableRow
                                    key={`opts-${index}`}
                                    className={`${dragColIndex === index ? "opacity-40 bg-muted/20" : ""} ${dragOverColIndex === index && dragColIndex !== index ? "ring-2 ring-primary ring-inset" : ""} transition-all`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = "move";
                                      setDragOverColIndex(index);
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      if (dragColIndex !== null && dragColIndex !== index) {
                                        moveColumn(dragColIndex, index);
                                      }
                                      setDragColIndex(null);
                                      setDragOverColIndex(null);
                                    }}
                                  >
                                    <TableCell colSpan={8} className="bg-muted/30 px-4 py-3">
                                      <div className="flex flex-col gap-2">
                                        {col.type === "select" && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground shrink-0">展示方式:</span>
                                            <div className="flex gap-1">
                                              <Button
                                                type="button"
                                                variant={col.display_mode !== "checkbox" ? "default" : "outline"}
                                                size="sm"
                                                className="h-6 text-xs px-2"
                                                onClick={() => updateColumn(index, "display_mode", "dropdown")}
                                              >
                                                下拉
                                              </Button>
                                              <Button
                                                type="button"
                                                variant={col.display_mode === "checkbox" ? "default" : "outline"}
                                                size="sm"
                                                className="h-6 text-xs px-2"
                                                onClick={() => updateColumn(index, "display_mode", "checkbox")}
                                              >
                                                单选框
                                              </Button>
                                            </div>
                                          </div>
                                        )}
                                        {/* 数据来源 */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs text-muted-foreground shrink-0">数据来源:</span>
                                          <select value={col.data_source || "custom"}
                                            onChange={(e) => updateColumn(index, "data_source", e.target.value)}
                                            className="h-6 text-xs border rounded px-1.5">
                                            <option value="custom">自定义选项</option>
                                            <optgroup label="基础数据">
                                              <option value="project_types">项目类型</option>
                                              <option value="project_stages">项目阶段</option>
                                              <option value="project_statuses">项目状态</option>
                                              <option value="todo_statuses">事项状态</option>
                                              <option value="customer_types">客户类型</option>
                                              <option value="construction_units">施工单位</option>
                                              <option value="member_role_types">成员角色</option>
                                              <option value="deployment_modes">部署模式</option>
                                              <option value="dev_integration_types">开发对接类型</option>
                                              <option value="custom_dev_types">定制开发类型</option>
                                            </optgroup>
                                            <optgroup label="产品目录">
                                              <option value="procurement_project">项目采购模块</option>
                                              <option value="procurement_system">系统产品目录</option>
                                            </optgroup>
                                            <optgroup label="用户数据">
                                              <option value="departments">部门</option>
                                            </optgroup>
                                          </select>
                                          <label className="flex items-center gap-1 text-xs cursor-pointer">
                                            <input type="checkbox" checked={col.allow_custom === true}
                                              onChange={(e) => updateColumn(index, "allow_custom", e.target.checked)}
                                              className="w-3 h-3" />
                                            允许自定义输入
                                          </label>
                                        </div>
                                        {/* 选项列表（仅自定义模式下显示） */}
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-xs text-muted-foreground shrink-0">选项:</span>
                                          {(col.options || []).map((opt, oi) => (
                                            <span key={oi} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                                              {opt}
                                              <button
                                                type="button"
                                                onClick={() => removeColumnOption(index, oi)}
                                                className="hover:text-destructive"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            </span>
                                          ))}
                                          <input
                                            type="text"
                                            placeholder="输入选项后回车"
                                            className="h-6 text-xs border-b border-dashed border-muted-foreground/30 bg-transparent outline-none focus:border-primary w-28"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                const val = (e.target as HTMLInputElement).value;
                                                if (val.trim()) {
                                                  addColumnOption(index, val);
                                                  (e.target as HTMLInputElement).value = "";
                                                }
                                              }
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                                {col.type === "text" && (
                                  <TableRow
                                    key={`qi-${index}`}
                                    className={`${dragColIndex === index ? "opacity-40 bg-muted/20" : ""} ${dragOverColIndex === index && dragColIndex !== index ? "ring-2 ring-primary ring-inset" : ""} transition-all`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = "move";
                                      setDragOverColIndex(index);
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      if (dragColIndex !== null && dragColIndex !== index) {
                                        moveColumn(dragColIndex, index);
                                      }
                                      setDragColIndex(null);
                                      setDragOverColIndex(null);
                                    }}
                                  >
                                    <TableCell colSpan={8} className="bg-muted/30 px-4 py-3">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-muted-foreground shrink-0">快捷语:</span>
                                        {(col.quick_inputs || []).map((phrase, qi) => (
                                          <span key={qi} className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                                            {phrase}
                                            <button
                                              type="button"
                                              onClick={() => removeColumnQuickInput(index, qi)}
                                              className="hover:text-destructive"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </span>
                                        ))}
                                        <input
                                          type="text"
                                          placeholder="输入快捷语后回车"
                                          className="h-6 text-xs border-b border-dashed border-muted-foreground/30 bg-transparent outline-none focus:border-primary w-32"
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              const val = (e.target as HTMLInputElement).value;
                                              if (val.trim()) {
                                                addColumnQuickInput(index, val);
                                                (e.target as HTMLInputElement).value = "";
                                              }
                                            }
                                          }}
                                        />
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                                {col.type === "number" && (
                                  <TableRow
                                    key={`fmt-${index}`}
                                    className={`${dragColIndex === index ? "opacity-40 bg-muted/20" : ""} ${dragOverColIndex === index && dragColIndex !== index ? "ring-2 ring-primary ring-inset" : ""} transition-all`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = "move";
                                      setDragOverColIndex(index);
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      if (dragColIndex !== null && dragColIndex !== index) {
                                        moveColumn(dragColIndex, index);
                                      }
                                      setDragColIndex(null);
                                      setDragOverColIndex(null);
                                    }}
                                  >
                                    <TableCell colSpan={8} className="bg-muted/30 px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground shrink-0">显示格式:</span>
                                        <div className="flex gap-1">
                                          <Button
                                            type="button"
                                            variant={col.format !== "percent" ? "default" : "outline"}
                                            size="sm"
                                            className="h-6 text-xs px-2"
                                            onClick={() => updateColumn(index, "format", undefined)}
                                          >
                                            普通数字
                                          </Button>
                                          <Button
                                            type="button"
                                            variant={col.format === "percent" ? "default" : "outline"}
                                            size="sm"
                                            className="h-6 text-xs px-2"
                                            onClick={() => updateColumn(index, "format", "percent")}
                                          >
                                            百分比
                                          </Button>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                                {(col.type as string) === "procurement_module" && (
                                  <TableRow
                                    key={`pm-${index}`}
                                    className={`${dragColIndex === index ? "opacity-40 bg-muted/20" : ""} ${dragOverColIndex === index && dragColIndex !== index ? "ring-2 ring-primary ring-inset" : ""} transition-all`}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.dataTransfer.dropEffect = "move";
                                      setDragOverColIndex(index);
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      if (dragColIndex !== null && dragColIndex !== index) {
                                        moveColumn(dragColIndex, index);
                                      }
                                      setDragColIndex(null);
                                      setDragOverColIndex(null);
                                    }}
                                  >
                                    <TableCell colSpan={8} className="bg-muted/30 px-4 py-3">
                                      <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground shrink-0">数据来源:</span>
                                          <div className="flex gap-1">
                                            <Button
                                              type="button"
                                              variant={col.display_mode !== "system" ? "default" : "outline"}
                                              size="sm"
                                              className="h-6 text-xs px-2"
                                              onClick={() => updateColumn(index, "display_mode", "project")}
                                            >
                                              项目采购模块
                                            </Button>
                                            <Button
                                              type="button"
                                              variant={col.display_mode === "system" ? "default" : "outline"}
                                              size="sm"
                                              className="h-6 text-xs px-2"
                                              onClick={() => updateColumn(index, "display_mode", "system")}
                                            >
                                              系统产品目录
                                            </Button>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground shrink-0">选择方式:</span>
                                          <div className="flex gap-1">
                                            <Button
                                              type="button"
                                              variant={!col.multiple ? "default" : "outline"}
                                              size="sm"
                                              className="h-6 text-xs px-2"
                                              onClick={() => updateColumn(index, "multiple", false)}
                                            >
                                              单选
                                            </Button>
                                            <Button
                                              type="button"
                                              variant={col.multiple ? "default" : "outline"}
                                              size="sm"
                                              className="h-6 text-xs px-2"
                                              onClick={() => updateColumn(index, "multiple", true)}
                                            >
                                              多选
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                                {col.type === 'attachment' && (
                                  <TableRow>
                                    <TableCell colSpan={5} className="py-2 px-3 bg-muted/30">
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-xs text-muted-foreground shrink-0">允许文件类型:</span>
                                        <div className="flex flex-wrap gap-1.5">
                                          {["pdf","doc","docx","xls","xlsx","ppt","pptx","md","txt","jpg","png","gif","zip","rar"].map((ft) => {
                                            const selected = (col.file_type || "pdf,doc,docx,xls,xlsx,ppt,pptx,md,zip").split(",");
                                            const isSelected = selected.includes(ft);
                                            return (
                                              <button key={ft}
                                                onClick={() => {
                                                  const next = isSelected ? selected.filter((s: string) => s !== ft) : [...selected, ft];
                                                  updateColumn(index, "file_type", next.join(","));
                                                }}
                                                className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                                                  isSelected ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-border"
                                                }`}>
                                                {ft.toUpperCase()}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                                {col.type === 'calc' && (
                                  <TableRow>
                                    <TableCell colSpan={5} className="py-2 px-3 bg-muted/30">
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-xs text-muted-foreground shrink-0">计算公式:</span>
                                        <select value={col.calc_left_col || ""} onChange={(e) => updateColumn(index, "calc_left_col", e.target.value)}
                                          className="h-6 text-xs border rounded px-1.5">
                                          <option value="">选择列</option>
                                          {(formData.columns_config || []).filter((c) => c.type === "number" && c.name).map((c) => (
                                            <option key={c.name} value={c.name}>{c.name}</option>
                                          ))}
                                        </select>
                                        <select value={col.calc_operator || "*"} onChange={(e) => updateColumn(index, "calc_operator", e.target.value)}
                                          className="h-6 text-xs border rounded px-1.5 w-16">
                                          <option value="+">＋</option>
                                          <option value="-">－</option>
                                          <option value="*">×</option>
                                          <option value="/">÷</option>
                                        </select>
                                        <select value={col.calc_right_col || ""} onChange={(e) => updateColumn(index, "calc_right_col", e.target.value)}
                                          className="h-6 text-xs border rounded px-1.5">
                                          <option value="">选择列</option>
                                          {(formData.columns_config || []).filter((c) => c.type === "number" && c.name).map((c) => (
                                            <option key={c.name} value={c.name}>{c.name}</option>
                                          ))}
                                        </select>
                                        <label className="flex items-center gap-1 text-xs cursor-pointer">
                                          <input type="checkbox" checked={col.calc_sum === true}
                                            onChange={(e) => updateColumn(index, "calc_sum", e.target.checked)} className="w-3 h-3" />
                                          汇总全部行
                                        </label>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                                {col.type === 'video' && (
                                  <TableRow>
                                    <TableCell colSpan={5} className="py-2 px-3 bg-muted/30">
                                      <div className="flex items-center gap-4 flex-wrap">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground shrink-0">最大文件:</span>
                                          <Select value={col.max_size || '1GB'} onValueChange={(v) => updateColumn(index, 'max_size', v)}>
                                            <SelectTrigger className="h-6 w-24 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="100MB">100MB</SelectItem>
                                              <SelectItem value="500MB">500MB</SelectItem>
                                              <SelectItem value="1GB">1GB</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground shrink-0">最多上传:</span>
                                          <Select value={String(col.max_count || 5)} onValueChange={(v) => updateColumn(index, 'max_count', Number(v))}>
                                            <SelectTrigger className="h-6 w-16 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="1">1个</SelectItem>
                                              <SelectItem value="3">3个</SelectItem>
                                              <SelectItem value="5">5个</SelectItem>
                                              <SelectItem value="10">10个</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                                {col.type === 'procurement_record' && (
                                  <TableRow>
                                    <TableCell colSpan={5} className="py-2 px-3 bg-muted/30">
                                      <div className="flex items-center gap-2">
                                        <Info className="h-3.5 w-3.5 text-blue-500" />
                                        <span className="text-xs text-muted-foreground">根据项目采购模块自动生成记录，每条记录自动带入模块名称、产品类别、产品名称、厂商</span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                                {(col.type as string) === 'user' && (
                                  <TableRow>
                                    <TableCell colSpan={5} className="py-2 px-3 bg-muted/30">
                                      <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-muted-foreground shrink-0">选择方式:</span>
                                          <div className="flex gap-1">
                                            <Button
                                              type="button"
                                              variant={!col.multiple ? "default" : "outline"}
                                              size="sm"
                                              className="h-6 text-xs px-2"
                                              onClick={() => updateColumn(index, "multiple", false)}
                                            >
                                              单选
                                            </Button>
                                            <Button
                                              type="button"
                                              variant={col.multiple ? "default" : "outline"}
                                              size="sm"
                                              className="h-6 text-xs px-2"
                                              onClick={() => updateColumn(index, "multiple", true)}
                                            >
                                              多选
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                                </Fragment>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </SectionPanel>

                  {/* 引用关系 */}
                  <SectionPanel
                    title="引用关系"
                    icon={LinkIcon}
                    badge={formData.references_config?.length || null}
                  >
                    <div className="pt-3 space-y-3">
                      <Button type="button" variant="outline" size="sm" onClick={openAddRefDialog} className="h-8 text-xs gap-1">
                        <Plus className="h-3.5 w-3.5" /> 添加引用关系
                      </Button>

                      {formData.references_config?.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">
                          <LinkIcon className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
                          <p className="text-sm">暂无引用关系</p>
                          <p className="text-xs text-muted-foreground/60 mt-1">配置后可在项目中引用其他表的记录</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {formData.references_config?.map((ref) => {
                            const sourceDef = definitions.find(d => d.table_code === ref.source_table_code);
                            return (
                              <div key={ref.id} className="rounded-md border p-3 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{ref.name}</span>
                                  <div className="flex gap-1">
                                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEditRefDialog(ref)}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteRef(ref.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="text-muted-foreground space-y-0.5">
                                  <p>源表: {sourceDef?.table_name || ref.source_table_code}</p>
                                  <p>入口列: {ref.entry_column}</p>
                                  <p>匹配: {ref.match_condition.target_column} = {sourceDef?.table_name || ref.source_table_code}.{ref.match_condition.source_column}</p>
                                  <p>同步列: {ref.column_mapping.map(m => `${m.target_column}↔${m.source_column}`).join(", ")}</p>
                                  <p>双向同步: {ref.bidirectional ? "是" : "否"}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </SectionPanel>
                </div>

                {/* 右侧：预览面板 */}
                <PreviewPanel
                  formData={formData}
                  projectTypes={projectTypes}
                  projectStages={projectStages}
                  moduleTypesList={moduleTypes}
                  definitions={definitions}
                />
              </div>

              <div className="px-6 pb-5 pt-3 border-t shrink-0 flex justify-end gap-2 bg-background">
                <Button variant="outline" onClick={() => setDialogOpen(false)} size="sm">
                  取消
                </Button>
                <Button type="button" size="sm" onClick={handleSubmit}>
                  {editingId ? "保存" : "创建"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">名称</Label>
            <Input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="搜索表代码/名称..."
              className="w-[180px] h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">项目类型</Label>
            <Select value={selectedProjectType} onValueChange={setSelectedProjectType}>
              <SelectTrigger className="w-full min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {projectTypes.map((type) => (
                  <SelectItem key={type.code} value={type.code}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">适用阶段</Label>
            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger className="w-full min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部阶段</SelectItem>
                {projectStages.map((stage) => (
                  <SelectItem key={stage.code} value={stage.code}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">模块</Label>
            <Select value={selectedModule} onValueChange={setSelectedModule}>
              <SelectTrigger className="w-full min-w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部模块</SelectItem>
                {moduleTypes.map((module) => (
                  <SelectItem key={module.code} value={module.code}>
                    {module.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 紧凑统计栏 */}
      <div className="px-6 pt-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>共 <strong className="text-foreground">{definitions.length}</strong> 张表</span>
          <span className="text-border">|</span>
          <span>覆盖 <strong className="text-foreground">{new Set(definitions.flatMap(d => Array.isArray(d.module_type) ? d.module_type : d.module_type ? [d.module_type] : [])).size}</strong> 个模块</span>
          <span className="text-border">|</span>
          <span><strong className="text-foreground">{new Set(definitions.flatMap(d => d.apply_project_types || [])).size}</strong> 种类型</span>
          <span className="text-border">|</span>
          <span><strong className="text-foreground">{new Set(definitions.flatMap(d => d.apply_project_stages || [])).size}</strong> 个阶段</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {filteredDefinitions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">暂无数据表定义</p>
            <p className="text-sm">点击&quot;新建数据表&quot;创建第一个模板</p>
          </div>
        ) : (
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-6"></TableHead>
                <TableHead className="w-[18%]">表名称</TableHead>
                <TableHead className="w-[15%]">模块</TableHead>
                <TableHead className="w-[11%]">类型</TableHead>
                <TableHead className="w-[11%]">阶段</TableHead>
                <TableHead className="w-[8%]">显示位置</TableHead>
                <TableHead className="w-[6%]">状态</TableHead>
                <TableHead className="w-[38%]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDefinitions.map((def, index) => (
                <Fragment key={def.id}>
                  <TableRow
                    draggable
                    onDragStart={() => setDragDefIndex(index)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverDefIndex(index); }}
                    onDrop={() => {
                      if (dragDefIndex !== null && dragDefIndex !== index) {
                        onReorder(dragDefIndex, index);
                      }
                      setDragDefIndex(null);
                      setDragOverDefIndex(null);
                    }}
                    onDragEnd={() => { setDragDefIndex(null); setDragOverDefIndex(null); }}
                    onClick={() => openDrawer(def)}
                    className={`${dragDefIndex === index ? "opacity-50 bg-muted/50" : ""} ${dragOverDefIndex === index && dragDefIndex !== index ? "border-t-2 border-t-primary" : ""} transition-colors cursor-pointer ${expandedDefId === def.id ? "bg-accent/80 border-l-2 border-l-primary" : ""}`}
                  >
                    <TableCell>
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium text-sm">{def.table_name}</TableCell>
                    <TableCell>
                      {(() => {
                        const mods = Array.isArray(def.module_type) ? def.module_type : def.module_type ? [def.module_type] : [];
                        if (mods.length === 0) return <span className="text-[11px] text-muted-foreground">-</span>;
                        const names = mods.map((m) => moduleTypes.find((mt) => mt.code === m)?.name || m);
                        return <span className="text-[11px] truncate block max-w-[90px]" title={names.join("、")}>{names.slice(0, 2).join("、")}{names.length > 2 ? ` +${names.length - 2}` : ""}</span>;
                      })()}
                    </TableCell>
                    <TableCell>
                      {def.apply_project_types.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground">-</span>
                      ) : (
                        <span className="text-[11px] truncate block max-w-[70px]" title={def.apply_project_types.map((t) => projectTypes.find((pt) => pt.code === t)?.name || t).join("、")}>
                          {def.apply_project_types.slice(0, 2).map((t) => projectTypes.find((pt) => pt.code === t)?.name || t).join("、")}
                          {def.apply_project_types.length > 2 ? ` +${def.apply_project_types.length - 2}` : ""}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {def.apply_project_stages.length === 0 ? (
                        <span className="text-[11px] text-muted-foreground">-</span>
                      ) : (
                        <span className="text-[11px] truncate block max-w-[70px]" title={def.apply_project_stages.map((s) => projectStages.find((ps) => ps.code === s)?.name || s).join("、")}>
                          {def.apply_project_stages.slice(0, 2).map((s) => projectStages.find((ps) => ps.code === s)?.name || s).join("、")}
                          {def.apply_project_stages.length > 2 ? ` +${def.apply_project_stages.length - 2}` : ""}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-[10px] ${
                        def.stage_display_mode === "phase" ? "text-orange-500" :
                        def.stage_display_mode === "menu" ? "text-blue-500" :
                        "text-muted-foreground"
                      }`}>
                        {def.stage_display_mode === "phase" ? "阶段任务" :
                         def.stage_display_mode === "menu" ? "左侧菜单" : "两者"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={def.is_active ? "default" : "secondary"}>
                        {def.is_active ? "启用" : "禁用"}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => openEditDialog(def)} className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground rounded hover:bg-accent">编辑</button>
                        <button onClick={() => { openDrawer(def); setDrawerFullscreen(true); }} className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground rounded hover:bg-accent">全屏</button>
                        <button onClick={() => openDataDialog(def)} className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground rounded hover:bg-accent">数据</button>
                        <button onClick={() => openSyncDialog(def)} className="h-6 px-1.5 text-[10px] text-blue-600 hover:text-blue-700 rounded hover:bg-accent">同步</button>
                        <button onClick={() => {
                          const code = prompt("请输入新表代码（只能小写字母/数字/下划线）:", def.table_code + "_copy");
                          if (!code) return;
                          if (!/^[a-z][a-z0-9_]*$/.test(code)) { alert("表代码只能包含小写字母、数字和下划线，且必须以字母开头"); return; }
                          const name = prompt("请输入新表名称:", def.table_name + "（副本）");
                          if (!name) return;
                          onDuplicate({ ...def, table_code: code, table_name: name });
                        }} className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground rounded hover:bg-accent">复制</button>
                        <button onClick={() => onDelete(def.id)} className="h-6 px-1 text-destructive hover:text-destructive rounded hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* 抽屉式编辑面板 */}
                  {expandedDefId === def.id && drawerFormData && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={8} className="p-0">
                        <div className={`overflow-hidden ${drawerFullscreen ? "fixed inset-0 z-50 bg-background" : ""}`}>
                        {drawerFullscreen && (
                          <div className="flex items-center justify-between px-6 py-3 border-b bg-card">
                            <span className="font-bold text-sm">编辑: {drawerFormData.table_name || drawerFormData.table_code}</span>
                            <div className="flex items-center gap-1.5">
                              <button onClick={handleDrawerSave} className="h-7 px-3 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90">保存</button>
                              <button onClick={closeDrawer} className="h-7 px-3 text-xs border border-border rounded hover:bg-muted">取消</button>
                              <button onClick={() => setDrawerFullscreen(false)} className="h-7 px-3 text-xs border border-border rounded hover:bg-muted">退出全屏</button>
                            </div>
                          </div>
                        )}
                        <div className={`px-6 py-4 space-y-4 border-b-2 border-b-primary/20 ${
                          drawerFullscreen ? "max-h-[calc(100vh-60px)] overflow-y-auto" : "max-h-[65vh] overflow-y-auto"
                        }`}>
                          {/* Row 1: 基本信息 + 所属模块 + 适用范围（紧凑布局） */}
                          <div className="rounded-lg border bg-card p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium text-xs">基本信息</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 mb-2">
                              <div>
                                <Label className="text-[11px]">表代码</Label>
                                <Input value={drawerFormData.table_code || ""} disabled className="h-7 text-xs" />
                              </div>
                              <div>
                                <Label className="text-[11px]">表名称 *</Label>
                                <Input value={drawerFormData.table_name || ""} onChange={(e) => drawerUpdateField("table_name", e.target.value)} placeholder="如: WBS分解表" className="h-7 text-xs" />
                              </div>
                              <div>
                                <Label className="text-[11px]">描述</Label>
                                <Input value={drawerFormData.description || ""} onChange={(e) => drawerUpdateField("description", e.target.value)} className="h-7 text-xs" />
                              </div>
                              <div className="flex flex-col items-start justify-end pb-0.5 gap-0.5">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <Switch checked={drawerFormData.allow_add !== false} onCheckedChange={(c: boolean) => drawerUpdateField("allow_add", c)} className="scale-75" />
                                  <span className="text-[11px] font-medium">允许添加</span>
                                </label>
                                <span className="text-[9px] text-muted-foreground leading-tight">关闭后项目中将不显示"添加"按钮</span>
                              </div>
                            </div>
                            {/* 所属模块 + 适用范围 合并一行，带竖向分隔 */}
                            <div className="grid grid-cols-3 gap-0 pt-2 border-t">
                              <div className="px-2">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-[0.5px] font-semibold">所属模块</span>
                                <div className="flex flex-wrap gap-0.5 mt-0.5">
                                  {moduleTypes.map((m) => (
                                    <button key={m.code} type="button" onClick={() => drawerToggleModule(m.code)}
                                      className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                        (drawerFormData.module_type || []).includes(m.code) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-border"}`}>{m.name}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="px-2 border-l">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-[0.5px] font-semibold">适用类型</span>
                                <div className="flex flex-wrap gap-0.5 mt-0.5">
                                  {projectTypes.map((t) => (
                                    <button key={t.code} type="button" onClick={() => drawerToggleProjectType(t.code)}
                                      className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                        (drawerFormData.apply_project_types || []).includes(t.code) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-border"}`}>{t.name}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="px-2 border-l">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-[0.5px] font-semibold">适用阶段</span>
                                <div className="flex flex-wrap gap-0.5 mt-0.5">
                                  {projectStages.map((s) => (
                                    <button key={s.code} type="button" onClick={() => drawerToggleProjectStage(s.code)}
                                      className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                        (drawerFormData.apply_project_stages || []).includes(s.code) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-border"}`}>{s.name}</button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Row 2.5: 进度与汇总 */}
                          <div className="rounded-lg border bg-card p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Settings className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-medium text-xs">阶段式布局-进度与汇总</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                <Label className="text-[10px]">进度计算列</Label>
                                <select value={drawerFormData.stage_progress_column || ""}
                                  onChange={(e) => drawerUpdateField("stage_progress_column", e.target.value)}
                                  className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                                  <option value="">不计算</option>
                                  {(drawerFormData.columns_config || []).map((col, ci) => (
                                    <option key={`dp_${ci}_${col.name}`} value={col.name}>{col.name || "(未命名)"}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <Label className="text-[10px]">完成目标值</Label>
                                {(() => {
                                  const pcol = (drawerFormData.columns_config || []).find((c) => c.name === drawerFormData.stage_progress_column);
                                  const opts = pcol?.options || [];
                                  return opts.length > 0 ? (
                                    <select value={drawerFormData.stage_progress_target || ""}
                                      onChange={(e) => drawerUpdateField("stage_progress_target", e.target.value)}
                                      className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                                      <option value="">选择目标</option>
                                      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                  ) : (
                                    <Input value={drawerFormData.stage_progress_target || ""}
                                      onChange={(e) => drawerUpdateField("stage_progress_target", e.target.value)}
                                      placeholder="输入目标值" className="h-7 text-[11px]" />
                                  );
                                })()}
                              </div>
                            </div>
                            <div>
                              <Label className="text-[10px]">汇总显示列（点击勾选，最多6列）</Label>
                              {(() => {
                                const currentFields = (drawerFormData.stage_summary_fields || "").split("\n").map((l) => l.trim()).filter(Boolean);
                                return (
                                  <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto border rounded p-1.5 mt-0.5">
                                    {(drawerFormData.columns_config || []).map((col) => {
                                      if (!col.name) return null;
                                      const existingLine = currentFields.find((l) => l === col.name || l === `-${col.name}`);
                                      const isSelected = !!existingLine;
                                      const isHidden = existingLine?.startsWith("-");
                                      const canAdd = !isSelected && currentFields.length < 6;
                                      return (
                                        <label key={col.name}
                                          className={`flex items-center gap-1.5 px-1.5 py-1 rounded text-[11px] cursor-pointer ${
                                            isSelected ? "bg-primary/10" : "hover:bg-muted"
                                          } ${!isSelected && !canAdd ? "opacity-40 pointer-events-none" : ""}`}>
                                          <input type="checkbox" checked={isSelected}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                const next = [...currentFields, col.name];
                                                drawerUpdateField("stage_summary_fields", next.join("\n"));
                                              } else {
                                                const next = currentFields.filter((l) => l !== col.name && l !== `-${col.name}`);
                                                drawerUpdateField("stage_summary_fields", next.join("\n"));
                                              }
                                            }}
                                            className="w-3 h-3" />
                                          <span className="flex-1 truncate">{col.name}</span>
                                          {isSelected && (
                                            <button type="button"
                                              onClick={() => {
                                                const next = currentFields.map((l) =>
                                                  l === col.name ? `-${col.name}` : l === `-${col.name}` ? col.name : l
                                                );
                                                drawerUpdateField("stage_summary_fields", next.join("\n"));
                                              }}
                                              className={`text-[9px] px-1 py-0.5 rounded border cursor-pointer ${
                                                isHidden ? "text-red-500 border-red-300" : "text-green-600 border-green-300"
                                              }`}>
                                              {isHidden ? "隐藏" : "显示"}
                                            </button>
                                          )}
                                        </label>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          {/* 阶段日期绑定 */}
                          <div className="rounded-lg border bg-card p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-xs">阶段日期绑定</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                ["计划开始列", "stage_plan_start_col"],
                                ["计划完成列", "stage_plan_end_col"],
                                ["实际开始列", "stage_actual_start_col"],
                                ["实际完成列", "stage_actual_end_col"],
                              ].map(([label, field]) => (
                                <div key={field}>
                                  <Label className="text-[10px]">{label}</Label>
                                  <select value={(drawerFormData as any)[field] || ""}
                                    onChange={(e) => drawerUpdateField(field, e.target.value)}
                                    className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                                    <option value="">不绑定</option>
                                    {(drawerFormData.columns_config || []).filter((c) => c.type === "date").map((c) => (
                                      <option key={c.name} value={c.name}>{c.name || "(未命名)"}</option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 甘特图配置 */}
                          <div className="rounded-lg border bg-card p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <label className="flex items-center gap-2 text-xs cursor-pointer">
                                <input type="checkbox" checked={drawerFormData.gantt_enabled === true}
                                  onChange={(e) => drawerUpdateField("gantt_enabled", e.target.checked)}
                                  className="w-3.5 h-3.5" />
                                甘特图显示
                              </label>
                            </div>
                            {drawerFormData.gantt_enabled && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[10px]">起始日期列</Label>
                                  <select value={drawerFormData.gantt_start_col || ""}
                                    onChange={(e) => drawerUpdateField("gantt_start_col", e.target.value)}
                                    className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                                    <option value="">选择</option>
                                    {(drawerFormData.columns_config || []).filter((c) => c.type === "date" && c.name).map((c) => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-[10px]">结束日期列</Label>
                                  <select value={drawerFormData.gantt_end_col || ""}
                                    onChange={(e) => drawerUpdateField("gantt_end_col", e.target.value)}
                                    className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                                    <option value="">选择</option>
                                    {(drawerFormData.columns_config || []).filter((c) => c.type === "date" && c.name).map((c) => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-[10px]">任务名称列</Label>
                                  <select value={drawerFormData.gantt_name_col || ""}
                                    onChange={(e) => drawerUpdateField("gantt_name_col", e.target.value)}
                                    className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                                    <option value="">选择</option>
                                    {(drawerFormData.columns_config || []).filter((c) => c.name).map((c) => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-[10px]">分组列</Label>
                                  <select value={drawerFormData.gantt_group_col || ""}
                                    onChange={(e) => drawerUpdateField("gantt_group_col", e.target.value)}
                                    className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                                    <option value="">不分组</option>
                                    {(drawerFormData.columns_config || []).filter((c) => c.name).map((c) => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-[10px]">里程碑列</Label>
                                  <select value={drawerFormData.gantt_milestone_col || ""}
                                    onChange={(e) => drawerUpdateField("gantt_milestone_col", e.target.value)}
                                    className="w-full h-7 px-1.5 rounded border border-input bg-background text-[11px]">
                                    <option value="">无</option>
                                    {(drawerFormData.columns_config || []).filter((c) => c.name).map((c) => (
                                      <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                {drawerFormData.gantt_milestone_col && (
                                  <div>
                                    <Label className="text-[10px]">标记值</Label>
                                    <Input value={drawerFormData.gantt_milestone_value || ""}
                                      onChange={(e) => drawerUpdateField("gantt_milestone_value", e.target.value)}
                                      placeholder="如: 是" className="h-7 text-[11px]" />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Row 3: 列配置 —— 矩阵式布局（独立横向滚动） */}
                          <div className="rounded-lg border bg-card p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <Database className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium text-sm">列配置</span>
                              <Badge variant="secondary" className="ml-auto text-xs shrink-0">
                                {(drawerFormData.columns_config || []).length}
                              </Badge>
                            </div>

                            {(drawerFormData.columns_config || []).length === 0 ? (
                              <div className="text-center py-6 text-muted-foreground">
                                <Database className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
                                <p className="text-sm">暂无列定义</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <div className="flex gap-3 min-w-max">
                                  {(drawerFormData.columns_config || []).map((col, ci) => (
                                    <div key={`colcard-${ci}`} className="w-[210px] shrink-0 rounded-md border bg-muted/30 p-3 space-y-3">
                                      {/* 列名 */}
                                      <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">列名</Label>
                                        <Input
                                          value={col.name}
                                          onChange={(e) => drawerUpdateColumn(ci, "name", e.target.value)}
                                          placeholder="列名"
                                          className="h-8 text-sm"
                                        />
                                      </div>

                                      {/* 必填 + 只读 */}
                                      <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                          <Checkbox
                                            checked={col.required}
                                            onCheckedChange={(checked) => drawerUpdateColumn(ci, "required", checked)}
                                            className="h-3.5 w-3.5"
                                          />
                                          <span className="text-muted-foreground">必填</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                                          <Checkbox
                                            checked={col.readonly || false}
                                            onCheckedChange={(checked) => drawerUpdateColumn(ci, "readonly", checked)}
                                            className="h-3.5 w-3.5"
                                          />
                                          <span className="text-muted-foreground">只读</span>
                                        </label>
                                      </div>

                                      {/* 类型 */}
                                      <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">类型</Label>
                                        <Select
                                          value={col.type}
                                          onValueChange={(value) => drawerUpdateColumn(ci, "type", value)}
                                        >
                                          <SelectTrigger className="h-8 text-sm w-full">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {COLUMN_TYPES.map((type) => (
                                              <SelectItem key={type.code} value={type.code}>
                                                {type.name}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* 描述 */}
                                      <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">描述</Label>
                                        <Input
                                          value={col.description || ""}
                                          onChange={(e) => drawerUpdateColumn(ci, "description", e.target.value)}
                                          placeholder="列描述"
                                          className="h-8 text-sm"
                                        />
                                      </div>

                                      {/* select/multiple_select: 数据来源 + 选项 */}
                                      {(col.type === "select" || col.type === "multiple_select") && (
                                        <div className="space-y-2 pt-1 border-t">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <Label className="text-xs text-muted-foreground">数据来源:</Label>
                                            <select value={col.data_source || "custom"}
                                              onChange={(e) => drawerUpdateColumn(ci, "data_source", e.target.value)}
                                              className="h-6 text-[10px] border rounded px-1">
                                              <option value="custom">自定义</option>
                                              <optgroup label="基础">
                                                <option value="project_types">项目类型</option>
                                                <option value="project_stages">项目阶段</option>
                                                <option value="project_statuses">项目状态</option>
                                                <option value="customer_types">客户类型</option>
                                                <option value="construction_units">施工单位</option>
                                                <option value="member_role_types">成员角色</option>
                                                <option value="deployment_modes">部署模式</option>
                                              </optgroup>
                                              <optgroup label="产品">
                                                <option value="procurement_project">项目采购模块</option>
                                                <option value="procurement_system">系统产品目录</option>
                                              </optgroup>
                                              <optgroup label="用户">
                                                <option value="departments">部门</option>
                                              </optgroup>
                                            </select>
                                            <label className="flex items-center gap-1 text-[10px] cursor-pointer">
                                              <input type="checkbox" checked={col.allow_custom === true}
                                                onChange={(e) => drawerUpdateColumn(ci, "allow_custom", e.target.checked)}
                                                className="w-3 h-3" />
                                              允许自定义
                                            </label>
                                          </div>
                                          <Label className="text-xs text-muted-foreground">选项 {col.data_source && col.data_source !== "custom" ? "(自动加载)" : ""}</Label>
                                          <div className="flex flex-wrap items-center gap-1 min-h-[28px]">
                                            {(col.options || []).map((opt, oi) => (
                                              <span key={oi} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                                                {opt}
                                                <button type="button" onClick={() => drawerRemoveColumnOption(ci, oi)} className="hover:text-destructive">
                                                  <X className="w-3 h-3" />
                                                </button>
                                              </span>
                                            ))}
                                          </div>
                                          <input
                                            type="text"
                                            placeholder="输入选项后回车"
                                            className="h-7 text-xs border-b border-dashed border-muted-foreground/30 bg-transparent outline-none focus:border-primary w-full"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                const val = (e.target as HTMLInputElement).value;
                                                drawerAddColumnOption(ci, val);
                                                (e.target as HTMLInputElement).value = "";
                                              }
                                            }}
                                          />
                                        </div>
                                      )}

                                      {/* select: 展示方式 */}
                                      {col.type === "select" && (
                                        <div className="space-y-1 pt-1 border-t">
                                          <Label className="text-xs text-muted-foreground">展示方式</Label>
                                          <div className="flex gap-1">
                                            <Button type="button" variant={col.display_mode !== "checkbox" ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => drawerUpdateColumn(ci, "display_mode", "dropdown")}>下拉</Button>
                                            <Button type="button" variant={col.display_mode === "checkbox" ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => drawerUpdateColumn(ci, "display_mode", "checkbox")}>单选框</Button>
                                          </div>
                                        </div>
                                      )}

                                      {/* text: 快捷语 */}
                                      {col.type === "text" && (
                                        <div className="space-y-2 pt-1 border-t">
                                          <Label className="text-xs text-muted-foreground">快捷语</Label>
                                          <div className="flex flex-wrap items-center gap-1 min-h-[28px]">
                                            {(col.quick_inputs || []).map((phrase, qi) => (
                                              <span key={qi} className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                                                {phrase}
                                                <button type="button" onClick={() => drawerRemoveColumnQuickInput(ci, qi)} className="hover:text-destructive">
                                                  <X className="w-3 h-3" />
                                                </button>
                                              </span>
                                            ))}
                                          </div>
                                          <input
                                            type="text"
                                            placeholder="输入快捷语后回车"
                                            className="h-7 text-xs border-b border-dashed border-muted-foreground/30 bg-transparent outline-none focus:border-primary w-full"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                const val = (e.target as HTMLInputElement).value;
                                                drawerAddColumnQuickInput(ci, val);
                                                (e.target as HTMLInputElement).value = "";
                                              }
                                            }}
                                          />
                                        </div>
                                      )}

                                      {/* number: 显示格式 */}
                                      {col.type === "number" && (
                                        <div className="space-y-1 pt-1 border-t">
                                          <Label className="text-xs text-muted-foreground">显示格式</Label>
                                          <div className="flex gap-1">
                                            <Button type="button" variant={col.format !== "percent" ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => drawerUpdateColumn(ci, "format", undefined)}>普通数字</Button>
                                            <Button type="button" variant={col.format === "percent" ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => drawerUpdateColumn(ci, "format", "percent")}>百分比</Button>
                                          </div>
                                        </div>
                                      )}

                                      {/* procurement_module: 数据来源 + 选择方式 */}
                                      {col.type === "procurement_module" && (
                                        <div className="space-y-2 pt-1 border-t">
                                          <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">数据来源</Label>
                                            <div className="flex gap-1 flex-wrap">
                                              <Button type="button" variant={col.display_mode !== "system" ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => drawerUpdateColumn(ci, "display_mode", "project")}>项目采购模块</Button>
                                              <Button type="button" variant={col.display_mode === "system" ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => drawerUpdateColumn(ci, "display_mode", "system")}>系统产品目录</Button>
                                            </div>
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">选择方式</Label>
                                            <div className="flex gap-1">
                                              <Button type="button" variant={!col.multiple ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => drawerUpdateColumn(ci, "multiple", false)}>单选</Button>
                                              <Button type="button" variant={col.multiple ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => drawerUpdateColumn(ci, "multiple", true)}>多选</Button>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* user: 选择方式 */}
                                      {col.type === "user" && (
                                        <div className="space-y-1 pt-1 border-t">
                                          <Label className="text-xs text-muted-foreground">选择方式</Label>
                                          <div className="flex gap-1">
                                            <Button type="button" variant={!col.multiple ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => drawerUpdateColumn(ci, "multiple", false)}>单选</Button>
                                            <Button type="button" variant={col.multiple ? "default" : "outline"} size="sm" className="h-6 text-xs px-2" onClick={() => drawerUpdateColumn(ci, "multiple", true)}>多选</Button>
                                          </div>
                                        </div>
                                      )}

                                      {/* attachment: 文件子类型 */}
                                      {col.type === "attachment" && (
                                        <div className="space-y-1">
                                          <Label className="text-xs text-muted-foreground">允许文件类型</Label>
                                          <div className="flex flex-wrap gap-1">
                                            {["pdf","doc","docx","xls","xlsx","ppt","pptx","md","txt","jpg","png","gif","zip","rar"].map((ft) => {
                                              const sel = (col.file_type || "pdf,doc,docx,xls,xlsx,ppt,pptx,md,zip").split(",");
                                              const active = sel.includes(ft);
                                              return (
                                                <button key={ft} type="button"
                                                  onClick={() => {
                                                    const n = active ? sel.filter((s: string) => s !== ft) : [...sel, ft];
                                                    drawerUpdateColumn(ci, "file_type", n.join(","));
                                                  }}
                                                  className={`text-[10px] px-1.5 py-0.5 rounded border cursor-pointer ${
                                                    active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-border"
                                                  }`}>
                                                  {ft.toUpperCase()}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* calc: 计算列 */}
                                      {col.type === "calc" && (
                                        <div className="space-y-2 pt-1 border-t">
                                          <Label className="text-xs text-muted-foreground">计算公式</Label>
                                          <div className="flex items-center gap-1 flex-wrap">
                                            <select value={col.calc_left_col || ""} onChange={(e) => drawerUpdateColumn(ci, "calc_left_col", e.target.value)}
                                              className="h-6 text-[10px] border rounded px-1">
                                              <option value="">左列</option>
                                              {(drawerFormData?.columns_config || []).filter((c) => c.type === "number" && c.name).map((c) => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                              ))}
                                            </select>
                                            <select value={col.calc_operator || "*"} onChange={(e) => drawerUpdateColumn(ci, "calc_operator", e.target.value)}
                                              className="h-6 text-[10px] border rounded px-1 w-14">
                                              <option value="+">＋</option><option value="-">－</option>
                                              <option value="*">×</option><option value="/">÷</option>
                                            </select>
                                            <select value={col.calc_right_col || ""} onChange={(e) => drawerUpdateColumn(ci, "calc_right_col", e.target.value)}
                                              className="h-6 text-[10px] border rounded px-1">
                                              <option value="">右列</option>
                                              {(drawerFormData?.columns_config || []).filter((c) => c.type === "number" && c.name).map((c) => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                              ))}
                                            </select>
                                            <label className="flex items-center gap-1 text-[10px] cursor-pointer ml-1">
                                              <input type="checkbox" checked={col.calc_sum === true}
                                                onChange={(e) => drawerUpdateColumn(ci, "calc_sum", e.target.checked)} className="w-3 h-3" />
                                              汇总
                                            </label>
                                          </div>
                                        </div>
                                      )}
                                      {/* video: 文件限制 */}
                                      {col.type === "video" && (
                                        <div className="space-y-2 pt-1 border-t">
                                          <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">最大文件</Label>
                                            <Select value={col.max_size || "1GB"} onValueChange={(v) => drawerUpdateColumn(ci, "max_size", v)}>
                                              <SelectTrigger className="h-7 text-xs w-full"><SelectValue /></SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="100MB">100MB</SelectItem>
                                                <SelectItem value="500MB">500MB</SelectItem>
                                                <SelectItem value="1GB">1GB</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground">最多上传</Label>
                                            <Select value={String(col.max_count || 5)} onValueChange={(v) => drawerUpdateColumn(ci, "max_count", Number(v))}>
                                              <SelectTrigger className="h-7 text-xs w-full"><SelectValue /></SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="1">1个</SelectItem>
                                                <SelectItem value="3">3个</SelectItem>
                                                <SelectItem value="5">5个</SelectItem>
                                                <SelectItem value="10">10个</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                      )}

                                      {/* 删除列 */}
                                      <div className="pt-1 border-t flex justify-center">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => drawerRemoveColumn(ci)}
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="mt-3 pt-3 border-t">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={drawerAddColumn}
                                className="h-8 text-xs gap-1"
                              >
                                <Plus className="h-3.5 w-3.5" /> 添加列
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setPasteColumnsOpen(true)}
                                className="h-8 text-xs gap-1 ml-2"
                              >
                                <span className="text-xs mr-0.5">📋</span> 粘贴列名
                              </Button>
                            </div>
                          </div>

                          {/* Row 4: 引用配置概览 */}
                          <div className="rounded-lg border bg-card p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="font-medium text-sm">引用关系</span>
                              <Badge variant="secondary" className="ml-auto text-xs shrink-0">
                                {(drawerFormData.references_config || []).length}
                              </Badge>
                            </div>
                            {(drawerFormData.references_config || []).length === 0 ? (
                              <p className="text-xs text-muted-foreground py-2">暂无引用关系</p>
                            ) : (
                              <div className="space-y-1.5">
                                {(drawerFormData.references_config || []).map((ref) => {
                                  const sourceDef = definitions.find(d => d.table_code === ref.source_table_code);
                                  return (
                                    <div key={ref.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-muted/50">
                                      <span className="font-medium">{ref.name}</span>
                                      <span className="text-muted-foreground">
                                        → {sourceDef?.table_name || ref.source_table_code}.{ref.match_condition.source_column}
                                      </span>
                                      <span className="text-muted-foreground">
                                        入口: {ref.entry_column}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        </div>
                        {/* 操作按钮（全屏时固定在底部） */}
                        <div className={`flex justify-end gap-2 px-6 py-3 border-t bg-muted/30 ${drawerFullscreen ? "sticky bottom-0 z-10" : ""}`}>
                          <Button variant="outline" size="sm" onClick={closeDrawer}>取消</Button>
                          <Button size="sm" onClick={handleDrawerSave}>保存</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 数据记录对话框 */}
      <Dialog open={dataDialogOpen} onOpenChange={setDataDialogOpen}>
        <DialogContent className="!max-w-[900px] !w-[95vw] !flex !flex-col !p-0 !gap-0" style={{ height: '80vh' }}>
          <DialogHeader className="px-6 pt-5 pb-3 shrink-0 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{currentTableDef?.table_name || "数据记录"}</DialogTitle>
                <DialogDescription>
                  表代码: {currentTableDef?.table_code}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleExportData}>
                  <Download className="w-4 h-4 mr-2" />
                  导出
                </Button>
                <label>
                  <Button size="sm" variant="outline" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      导入
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleImportData}
                  />
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1"><Settings className="w-3.5 h-3.5" />权限</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3 text-sm" align="end">
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">数据权限</p>
                      <div className="flex items-center justify-between"><span className="text-xs">允许添加记录</span>
                        <Switch checked={currentTableDef?.allow_add !== false} onCheckedChange={async (checked: boolean) => { setCurrentTableDef(prev => prev ? { ...prev, allow_add: checked } : prev); if (currentTableDef) await onUpdate(currentTableDef.id, { allow_add: checked }); }} />
                      </div>
                      <div className="flex items-center justify-between"><span className="text-xs">允许删除规范数据</span>
                        <Switch checked={currentTableDef?.allow_delete !== false} onCheckedChange={async (checked: boolean) => { setCurrentTableDef(prev => prev ? { ...prev, allow_delete: checked } : prev); if (currentTableDef) await onUpdate(currentTableDef.id, { allow_delete: checked }); }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">只读模式</span>
                        <div className="flex items-center gap-0.5 bg-gray-100 rounded p-0.5">
                          <button className={`px-2 py-0.5 text-[10px] rounded ${currentTableDef?.readonly_mode !== "or" ? "bg-white shadow-sm" : "text-gray-500"}`} onClick={async () => { setCurrentTableDef(prev => prev ? { ...prev, readonly_mode: "and" as const } : prev); if (currentTableDef) await onUpdate(currentTableDef.id, { readonly_mode: "and" }); }}>AND</button>
                          <button className={`px-2 py-0.5 text-[10px] rounded ${currentTableDef?.readonly_mode === "or" ? "bg-white shadow-sm" : "text-gray-500"}`} onClick={async () => { setCurrentTableDef(prev => prev ? { ...prev, readonly_mode: "or" as const } : prev); if (currentTableDef) await onUpdate(currentTableDef.id, { readonly_mode: "or" }); }}>OR</button>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground">列只读点击表头🔒切换，行只读/删除逐行开关</p>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button size="sm" variant="outline" className="text-blue-600 hover:text-blue-700" onClick={() => { if (currentTableDef) openSyncDialog(currentTableDef, 'data'); }}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  同步数据
                </Button>
                <Button size="sm" onClick={openAddRecordForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加记录
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-6">
            {/* 批量操作工具栏 */}
            {selectedRecordIds.size > 0 && (
              <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-muted/50 rounded-lg border">
                <span className="text-sm text-muted-foreground">已选 {selectedRecordIds.size} 条</span>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBatchToggleAllowDelete(true)}>
                  批量可删除
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleBatchToggleAllowDelete(false)}>
                  批量不可删除
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleBatchDelete}>
                  批量删除
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto" onClick={() => setSelectedRecordIds(new Set())}>
                  取消选择
                </Button>
              </div>
            )}
            {loadingData ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                加载中...
              </div>
            ) : tableData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TableIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">暂无数据</p>
                <p className="text-sm">点击"添加记录"创建第一条数据</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={tableData.length > 0 && selectedRecordIds.size === tableData.length}
                        onCheckedChange={toggleRecordSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-10"></TableHead>

                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500">
                        <span>删除</span><span className="text-gray-300">|</span><span>只读</span>
                      </div>
                    </TableHead>
                    {currentTableDef?.columns_config?.map((col) => (
                      <TableHead key={col.name}>
                        <div className="flex items-center gap-1 cursor-pointer group" title="点击切换只读" onClick={async () => {
                          const newCols = [...(currentTableDef.columns_config || [])];
                          const idx = newCols.indexOf(col);
                          if (idx >= 0) {
                            newCols[idx] = { ...newCols[idx], readonly: !col.readonly };
                            setCurrentTableDef(prev => prev ? { ...prev, columns_config: newCols } : prev);
                            await fetch(`/api/standards/${currentTableDef.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: currentTableDef.id, columns_config: newCols }) });
                          }
                        }}>
                          <span>{col.name}</span>
                          {col.readonly ? <Lock className="w-3 h-3 text-red-500" /> : <Lock className="w-3 h-3 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-24 sticky right-0 bg-background z-20">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((record, index) => (
                    <TableRow
                      key={(record.id as string) || index}
                      className={`${selectedRecordIds.has(record.id as string) ? "bg-primary/5" : ""} ${dragRecordIndex === index ? "opacity-50 bg-muted/50" : ""} ${dragOverRecordIndex === index && dragRecordIndex !== index ? "border-t-2 border-t-primary" : ""} transition-colors`}
                      draggable
                      onDragStart={() => setDragRecordIndex(index)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverRecordIndex(index); }}
                      onDrop={() => {
                        if (dragRecordIndex !== null && dragRecordIndex !== index) {
                          handleMoveRecord(dragRecordIndex, index);
                        }
                        setDragRecordIndex(null);
                        setDragOverRecordIndex(null);
                      }}
                      onDragEnd={() => { setDragRecordIndex(null); setDragOverRecordIndex(null); }}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedRecordIds.has(record.id as string)}
                          onCheckedChange={() => toggleRecordSelect(record.id as string)}
                        />
                      </TableCell>
                      <TableCell>
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            <Switch className="scale-75" checked={record.allow_delete !== false} onCheckedChange={(checked: boolean) => handleToggleAllowDelete(record.id as string, checked)} />
                            <span className={`text-[9px] ${record.allow_delete !== false ? "text-green-600" : "text-red-400"}`}>{record.allow_delete !== false ? "删" : "×"}</span>
                          </div>
                          <span className="text-gray-200">|</span>
                          <div className="flex items-center gap-0.5">
                            <Switch className="scale-75" checked={record._readonly === true} onCheckedChange={(checked: boolean) => handleToggleAllowDelete(record.id as string, checked, "_readonly")} />
                            <span className={`text-[9px] ${record._readonly ? "text-orange-500" : "text-gray-400"}`}>{record._readonly ? "锁" : "编"}</span>
                          </div>
                        </div>
                      </TableCell>
                      {currentTableDef?.columns_config?.map((col) => (
                        <TableCell key={col.name}>
                          {col.type === "boolean"
                            ? (record[col.name] ? "是" : "否")
                            : (col.type as string) === "user"
                            ? (() => {
                                const raw = String(record[col.name] ?? "");
                                if (!raw) return "-";
                                const ids = raw.split(",").filter(Boolean);
                                return ids.map((id) => {
                                  const u = userList.find((u) => u.id === id);
                                  return u ? u.name : id;
                                }).join(", ") || "-";
                              })()
                            : ["attachment"].includes(col.type as string)
                            ? renderFileCellDisplay(String(record[col.name] ?? ""), col.type as string)
                            : col.type === "number" && col.format === "percent"
                            ? `${String(record[col.name] ?? "-")}%`
                            : String(record[col.name] ?? "-")}
                        </TableCell>
                      ))}
                      <TableCell className="sticky right-0 bg-background z-20">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="上移"
                            onClick={() => handleMoveRecordDirection(record.id as string, "up")}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="下移"
                            onClick={() => handleMoveRecordDirection(record.id as string, "down")}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => openEditRecordForm(record)}
                          >
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteRecord(record.id as string)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 记录编辑表单对话框 */}
      <Dialog open={recordFormOpen} onOpenChange={setRecordFormOpen}>
        <DialogContent className="!max-w-[860px] !w-[95vw]">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "编辑记录" : "添加记录"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            {currentTableDef?.columns_config?.map((col) => {
              const rowReadonly = editingRecord?._readonly === true;
              const colReadonly = !!col.readonly;
              const isOrMode = currentTableDef?.readonly_mode === "or";
              const isReadonly = isOrMode
                ? (colReadonly || rowReadonly)
                : (colReadonly && rowReadonly);
              return (
                <div key={col.name} className="space-y-1.5">
                  <Label className={`text-sm ${isReadonly ? "text-muted-foreground" : ""}`}>
                    {col.description || col.name}
                    {col.required && <span className="text-destructive ml-1">*</span>}
                    {isReadonly && (
                      <span className="ml-2 text-xs text-muted-foreground">(只读)</span>
                    )}
                  </Label>
                  {col.type === "textarea" ? (
                    <Textarea
                      value={String(recordFormData[col.name] || "")}
                      onChange={(e) => setRecordFormData((prev) => ({ ...prev, [col.name]: e.target.value }))}
                      placeholder={col.description || `请输入${col.name}`}
                      disabled={isReadonly}
                      className={`${isReadonly ? "bg-muted cursor-not-allowed" : ""} min-h-[80px] resize-y`}
                      title={isReadonly ? (col.readonly_reason || "只读字段，不可编辑") : ""}
                    />
                  ) : col.type === "text" ? (
                    <div className="space-y-2">
                      {(col.quick_inputs || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {(col.quick_inputs || []).map((phrase) => (
                            <button
                              key={phrase}
                              type="button"
                              disabled={isReadonly}
                              onClick={() => setRecordFormData((prev) => ({ ...prev, [col.name]: phrase }))}
                              className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full border border-green-200 hover:bg-green-100 hover:border-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {phrase}
                            </button>
                          ))}
                        </div>
                      )}
                      <Input
                        value={String(recordFormData[col.name] || "")}
                        onChange={(e) => setRecordFormData((prev) => ({ ...prev, [col.name]: e.target.value }))}
                        placeholder={col.description || `请输入${col.name}`}
                        disabled={isReadonly}
                        className={isReadonly ? "bg-muted cursor-not-allowed" : ""}
                        title={isReadonly ? (col.readonly_reason || "只读字段，不可编辑") : ""}
                      />
                    </div>
                  ) : col.type === "number" ? (
                    <div className="relative">
                      <Input
                        type="number"
                        value={String(recordFormData[col.name] || "")}
                        onChange={(e) => setRecordFormData((prev) => ({ ...prev, [col.name]: e.target.value }))}
                        placeholder={col.description || `请输入${col.name}`}
                        disabled={isReadonly}
                        className={`${isReadonly ? "bg-muted cursor-not-allowed" : ""} ${col.format === "percent" ? "pr-8" : ""}`}
                        title={isReadonly ? (col.readonly_reason || "只读字段，不可编辑") : ""}
                      />
                      {col.format === "percent" && (
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
                      )}
                    </div>
                  ) : col.type === "date" ? (
                    <Input
                      type="date"
                      value={String(recordFormData[col.name] || "")}
                      onChange={(e) => setRecordFormData((prev) => ({ ...prev, [col.name]: e.target.value }))}
                      disabled={isReadonly}
                      className={isReadonly ? "bg-muted cursor-not-allowed" : ""}
                      title={isReadonly ? (col.readonly_reason || "只读字段，不可编辑") : ""}
                    />
                  ) : col.type === "boolean" ? (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={Boolean(recordFormData[col.name])}
                        onCheckedChange={(checked) => setRecordFormData((prev) => ({ ...prev, [col.name]: checked }))}
                        disabled={isReadonly}
                      />
                      <span className={`text-sm ${isReadonly ? "text-muted-foreground" : ""}`}>
                        {col.description || "是/否"}
                      </span>
                    </div>
                  ) : col.type === "multiple_select" && (col.options || []).length > 0 ? (
                      <div className={`flex flex-wrap gap-2 ${isReadonly ? "opacity-60 pointer-events-none" : ""}`}>
                        {(col.options || []).map((opt) => {
                          const currentValues: string[] = (() => {
                            const raw = recordFormData[col.name];
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
                                  setRecordFormData((prev) => ({ ...prev, [col.name]: newValues.join(",") }));
                                }}
                                disabled={isReadonly}
                              />
                              <span>{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                  ) : col.type === "select" && (col.options || []).length > 0 && col.display_mode === "checkbox" ? (
                      <RadioGroup
                        value={String(recordFormData[col.name] || "") || undefined}
                        onValueChange={(val) => setRecordFormData((prev) => ({ ...prev, [col.name]: val }))}
                        disabled={isReadonly}
                        className={`flex flex-wrap gap-2 ${isReadonly ? "opacity-60 pointer-events-none" : ""}`}
                      >
                        {(col.options || []).map((opt) => (
                          <label key={opt} className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                            <RadioGroupItem value={opt} disabled={isReadonly} />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </RadioGroup>
                  ) : col.type === "select" && (col.options || []).length > 0 ? (
                      <Select
                        value={String(recordFormData[col.name] || "") || undefined}
                        onValueChange={(value) => setRecordFormData((prev) => ({ ...prev, [col.name]: value }))}
                        disabled={isReadonly}
                      >
                        <SelectTrigger className={`w-full min-w-[120px] ${isReadonly ? "bg-muted cursor-not-allowed" : ""}`}>
                          <SelectValue placeholder={`请选择${col.description || col.name}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {col.options?.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  ) : (col.type as string) === "procurement_module" ? (
                      <ProductModuleField
                        col={col}
                        value={String(recordFormData[col.name] || "")}
                        onChange={(val) => setRecordFormData((prev) => ({ ...prev, [col.name]: val }))}
                        moduleNames={productModuleNames}
                        disabled={isReadonly}
                      />
                  ) : (col.type as string) === "user" ? (
                      <UserField
                        col={col}
                        value={String(recordFormData[col.name] || "")}
                        onChange={(val) => setRecordFormData((prev) => ({ ...prev, [col.name]: val }))}
                        users={userList}
                        disabled={isReadonly}
                      />
                  ) : ["attachment"].includes(col.type as string) ? (
                      <FileUploadField
                        fileType={col.type as string}
                        value={String(recordFormData[col.name] || "")}
                        onChange={(val) => setRecordFormData((prev) => ({ ...prev, [col.name]: val }))}
                        disabled={isReadonly}
                      />
                  ) : (
                    <Input
                      value={String(recordFormData[col.name] || "")}
                      onChange={(e) => setRecordFormData((prev) => ({ ...prev, [col.name]: e.target.value }))}
                      placeholder={col.description}
                      disabled={isReadonly}
                      className={isReadonly ? "bg-muted cursor-not-allowed" : ""}
                      title={isReadonly ? (col.readonly_reason || "只读字段，不可编辑") : ""}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRecordFormOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveRecord}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 同步到项目对话框 */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              同步到项目 - {syncTableDef?.table_name || ""}
            </DialogTitle>
            <DialogDescription>
              将「{syncTableDef?.table_name || ""}」的变更同步到选中的项目 Schema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 同步内容选择 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">同步内容</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className={`flex flex-col items-start gap-0.5 rounded-md border p-3 text-left transition-colors cursor-pointer ${syncMode === 'structure' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setSyncMode('structure')}
                >
                  <span className="text-sm font-medium">仅结构</span>
                  <span className="text-xs text-muted-foreground">将新增的列同步到项目表，不影响已有数据</span>
                </button>
                <button
                  type="button"
                  className={`flex flex-col items-start gap-0.5 rounded-md border p-3 text-left transition-colors cursor-pointer ${syncMode === 'data' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setSyncMode('data')}
                >
                  <span className="text-sm font-medium">仅数据</span>
                  <span className="text-xs text-muted-foreground">将规范表数据同步到项目表，不改变列结构</span>
                </button>
                <button
                  type="button"
                  className={`flex flex-col items-start gap-0.5 rounded-md border p-3 text-left transition-colors cursor-pointer ${syncMode === 'both' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                  onClick={() => setSyncMode('both')}
                >
                  <span className="text-sm font-medium">结构+数据</span>
                  <span className="text-xs text-muted-foreground">同时同步列结构和数据到项目表</span>
                </button>
              </div>
            </div>

            {/* 数据同步模式 - 仅在涉及数据同步时显示 */}
            {(syncMode === 'data' || syncMode === 'both') && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">数据同步方式</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`flex flex-col items-start gap-0.5 rounded-md border p-3 text-left transition-colors cursor-pointer ${syncDataMode === 'append' ? 'border-blue-500 bg-blue-50' : 'border-border hover:border-blue-500/50'}`}
                    onClick={() => setSyncDataMode('append')}
                  >
                    <span className="text-sm font-medium">追加模式</span>
                    <span className="text-xs text-muted-foreground">保留项目原有数据，将规范表数据追加到末尾</span>
                  </button>
                  <button
                    type="button"
                    className={`flex flex-col items-start gap-0.5 rounded-md border p-3 text-left transition-colors cursor-pointer ${syncDataMode === 'overwrite' ? 'border-amber-500 bg-amber-50' : 'border-border hover:border-amber-500/50'}`}
                    onClick={() => setSyncDataMode('overwrite')}
                  >
                    <span className="text-sm font-medium">覆盖模式</span>
                    <span className="text-xs text-muted-foreground">清空项目表数据后写入规范表数据，以规范为准</span>
                  </button>
                </div>
                {syncDataMode === 'overwrite' && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    覆盖模式将清空项目中的现有数据，不可恢复，请谨慎操作
                  </div>
                )}
              </div>
            )}

            {/* 项目选择 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  选择项目（共 {syncProjects.length} 个）
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showAllProjects}
                      onCheckedChange={handleToggleShowAll}
                      id="show-all-projects"
                    />
                    <label
                      htmlFor="show-all-projects"
                      className="text-xs text-muted-foreground cursor-pointer select-none"
                    >
                      显示所有项目
                    </label>
                  </div>
                  <Button variant="outline" size="sm" onClick={toggleRecordSelectAll}>
                    {selectedProjectIds.length === syncProjects.length && syncProjects.length > 0 ? "取消全选" : "全选"}
                  </Button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                {syncProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {showAllProjects ? "没有可用的项目" : "没有包含该表的项目 Schema，可开启「显示所有项目」后选择"}
                  </p>
                ) : (
                  syncProjects.map((p) => (
                    <label
                      key={p.project_id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProjectIds.includes(p.project_id)}
                        onChange={() => toggleProjectSelect(p.project_id)}
                        className="rounded"
                      />
                      <span className="text-sm">{p.project_name}</span>
                      {(p as { has_table?: boolean }).has_table === false && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">新表</span>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto font-mono">{p.schema}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSync}
              disabled={selectedProjectIds.length === 0 || syncing}
            >
              {syncing ? "同步中..." : `同步到 ${selectedProjectIds.length} 个项目`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 引用关系编辑对话框 */}
      <Dialog open={refDialogOpen} onOpenChange={setRefDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingRef ? "编辑引用关系" : "添加引用关系"}</DialogTitle>
            <DialogDescription>配置表之间的引用关系，实现数据自动填充和双向同步</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto">
            {/* 引用名称 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">引用名称</Label>
              <Input
                value={refForm.name}
                onChange={(e) => setRefForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="如: 引用 A 表任务数据"
                className="h-9"
              />
            </div>

            {/* 源表 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">源表</Label>
              <Select
                value={refForm.source_table_code}
                onValueChange={(v) => setRefForm(prev => ({
                  ...prev,
                  source_table_code: v,
                  match_condition: { ...prev.match_condition, source_column: "" },
                  column_mapping: prev.column_mapping.map(m => ({ ...m, source_column: "" })),
                }))}
              >
                <SelectTrigger className="h-9"><SelectValue placeholder="选择源表" /></SelectTrigger>
                <SelectContent>
                  {definitions.filter(d => d.table_code !== formData.table_code).map(def => (
                    <SelectItem key={def.table_code} value={def.table_code}>{def.table_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 入口列 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">入口列（选择源记录的列）</Label>
              <Select
                value={refForm.entry_column}
                onValueChange={(v) => setRefForm(prev => ({ ...prev, entry_column: v }))}
              >
                <SelectTrigger className="h-9"><SelectValue placeholder="选择当前表的列" /></SelectTrigger>
                <SelectContent>
                  {formData.columns_config?.map(col => (
                    <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 匹配条件 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">匹配条件</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={refForm.match_condition.target_column}
                  onValueChange={(v) => setRefForm(prev => ({
                    ...prev,
                    match_condition: { ...prev.match_condition, target_column: v },
                  }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="当前表列" /></SelectTrigger>
                  <SelectContent>
                    {formData.columns_config?.map(col => (
                      <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground shrink-0">=</span>
                <Select
                  value={refForm.match_condition.source_column}
                  onValueChange={(v) => setRefForm(prev => ({
                    ...prev,
                    match_condition: { ...prev.match_condition, source_column: v },
                  }))}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="源表列" /></SelectTrigger>
                  <SelectContent>
                    {definitions.find(d => d.table_code === refForm.source_table_code)?.columns_config?.map((col: ColumnConfig) => (
                      <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 列映射 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">列映射（双向同步的列）</Label>
                <Button type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={addRefColumnMapping}>
                  <Plus className="h-3 w-3 mr-1" /> 添加
                </Button>
              </div>
              {refForm.column_mapping.length === 0 ? (
                <p className="text-xs text-muted-foreground">至少添加一个列映射</p>
              ) : (
                <div className="space-y-1.5">
                  {refForm.column_mapping.map((m, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Select
                        value={m.target_column}
                        onValueChange={(v) => updateRefColumnMapping(i, 'target_column', v)}
                      >
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="当前表" /></SelectTrigger>
                        <SelectContent>
                          {formData.columns_config?.map(col => (
                            <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Select
                        value={m.source_column}
                        onValueChange={(v) => updateRefColumnMapping(i, 'source_column', v)}
                      >
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="源表" /></SelectTrigger>
                        <SelectContent>
                          {definitions.find(d => d.table_code === refForm.source_table_code)?.columns_config?.map((col: ColumnConfig) => (
                            <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => removeRefColumnMapping(i)}>
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 过滤条件 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">过滤条件（可选）</Label>
                <Button type="button" variant="outline" size="sm" className="h-6 text-xs" onClick={addRefFilter}>
                  <Plus className="h-3 w-3 mr-1" /> 添加
                </Button>
              </div>
              {refForm.filter_condition && refForm.filter_condition.length > 0 && (
                <div className="space-y-1.5">
                  {refForm.filter_condition.map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <Select
                        value={f.column}
                        onValueChange={(v) => updateRefFilter(i, 'column', v)}
                      >
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="源表列" /></SelectTrigger>
                        <SelectContent>
                          {definitions.find(d => d.table_code === refForm.source_table_code)?.columns_config?.map((col: ColumnConfig) => (
                            <SelectItem key={col.name} value={col.name}>{col.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={f.operator}
                        onValueChange={(v) => updateRefFilter(i, 'operator', v)}
                      >
                        <SelectTrigger className="h-7 text-xs w-20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="=">=</SelectItem>
                          <SelectItem value="!=">≠</SelectItem>
                          <SelectItem value=">">&gt;</SelectItem>
                          <SelectItem value="<">&lt;</SelectItem>
                          <SelectItem value="contains">包含</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        value={f.value}
                        onChange={(e) => updateRefFilter(i, 'value', e.target.value)}
                        placeholder="值"
                        className="h-7 text-xs flex-1"
                      />
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => removeRefFilter(i)}>
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 同步方向 */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">同步方向</Label>
              <RadioGroup
                value={refForm.bidirectional ? "bidirectional" : "one-way"}
                onValueChange={(v) => setRefForm(prev => ({ ...prev, bidirectional: v === "bidirectional" }))}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="bidirectional" id="ref-bidirectional" />
                  <Label htmlFor="ref-bidirectional" className="text-sm cursor-pointer">双向同步</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="one-way" id="ref-oneway" />
                  <Label htmlFor="ref-oneway" className="text-sm cursor-pointer">仅源→目标</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefDialogOpen(false)}>取消</Button>
            <Button onClick={handleSaveRef} disabled={!refForm.name || !refForm.source_table_code || !refForm.entry_column || !refForm.match_condition.target_column || !refForm.match_condition.source_column || refForm.column_mapping.length === 0}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 粘贴列名弹窗（弹窗和抽屉共用） */}
      <Dialog open={pasteColumnsOpen} onOpenChange={setPasteColumnsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📋 粘贴列名
            </DialogTitle>
            <DialogDescription>
              从 Excel 复制一列或一行列名，粘贴到下方。每行一个列名，默认类型为「文本」。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <textarea value={pasteColumnsText}
              onChange={(e) => setPasteColumnsText(e.target.value)}
              placeholder={"任务名称\n负责人\n开始日期\n结束日期\n..."}
              className="w-full h-40 px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:border-primary"
              autoFocus />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                识别到 <strong>{pasteColumnsText.split(/[\n\r\t]+/).filter(Boolean).length}</strong> 个列名，默认类型: 文本
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setPasteColumnsOpen(false); setPasteColumnsText(""); }}>
              取消
            </Button>
            <Button size="sm" onClick={() => {
              const names = pasteColumnsText.split(/[\n\r\t]+/).map((s) => s.trim()).filter(Boolean);
              if (names.length === 0) return;
              const newCols = names.map((n) => ({ name: n, type: "text", required: false, readonly: false, description: "", options: [] }));
              // 同时添加到 formData 和 drawerFormData（哪个存在就加哪个）
              setFormData((prev) => prev.columns_config ? {
                ...prev, columns_config: [...(prev.columns_config || []), ...newCols],
              } : prev);
              setDrawerFormData((prev) => prev ? {
                ...prev, columns_config: [...(prev.columns_config || []), ...newCols],
              } : null);
              setPasteColumnsOpen(false); setPasteColumnsText("");
            }}>
              添加 {pasteColumnsText.split(/[\n\r\t]+/).filter(Boolean).length} 列
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
