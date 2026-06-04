"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Type, List, Hash, Calendar, User, CheckSquare, FileText, Upload } from "lucide-react";

export interface FormColumn {
  name: string;
  type: string;
  required?: boolean;
  options?: string[];
  sort_order: number;
}

const FIELD_TYPES = [
  { code: "text", name: "文本", icon: Type, desc: "单行文本输入" },
  { code: "textarea", name: "多行文本", icon: FileText, desc: "多行文本输入" },
  { code: "number", name: "数字", icon: Hash, desc: "数字输入" },
  { code: "date", name: "日期", icon: Calendar, desc: "日期选择" },
  { code: "user", name: "用户", icon: User, desc: "选择系统用户" },
  { code: "select", name: "单选", icon: CheckSquare, desc: "下拉单选（需配置选项）" },
  { code: "multiple_select", name: "多选", icon: List, desc: "多选（需配置选项）" },
  { code: "file", name: "文件", icon: Upload, desc: "文件上传" },
];

interface Props {
  columns: FormColumn[];
  onChange: (cols: FormColumn[]) => void;
  compact?: boolean;
}

export function TaskFormBuilder({ columns, onChange, compact }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const addColumn = (typeCode: string) => {
    const newCol: FormColumn = {
      name: "",
      type: typeCode,
      required: false,
      options: (typeCode === "select" || typeCode === "multiple_select") ? [] : undefined,
      sort_order: columns.length,
    };
    onChange([...columns, newCol]);
    setEditingIdx(columns.length);
    setShowTypeMenu(false);
  };

  const updateColumn = (idx: number, field: keyof FormColumn, value: unknown) => {
    const newCols = [...columns];
    newCols[idx] = { ...newCols[idx], [field]: value };
    onChange(newCols);
  };

  const removeColumn = (idx: number) => {
    onChange(columns.filter((_, i) => i !== idx));
    setEditingIdx(null);
  };

  const moveColumn = (from: number, to: number) => {
    if (to < 0 || to >= columns.length) return;
    const newCols = [...columns];
    [newCols[from], newCols[to]] = [newCols[to], newCols[from]];
    newCols.forEach((c, i) => (c.sort_order = i));
    onChange(newCols);
  };

  const selectedCol = editingIdx != null ? columns[editingIdx] : null;

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {columns.map((col, idx) => (
            <div key={idx} className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-xs group">
              <span className="font-medium">{col.name || `列${idx + 1}`}</span>
              <span className="text-gray-400">({FIELD_TYPES.find(t => t.code === col.type)?.name || col.type})</span>
              {col.required && <span className="text-red-400">*</span>}
              <button onClick={() => setEditingIdx(idx)} className="ml-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600">✎</button>
              <button onClick={() => removeColumn(idx)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">×</button>
            </div>
          ))}
          <button onClick={() => setShowTypeMenu(!showTypeMenu)} className="flex items-center gap-1 px-2 py-1 rounded border border-dashed border-gray-300 text-xs text-gray-400 hover:border-gray-400">
            <Plus className="w-3 h-3" /> 添加列
          </button>
        </div>
        {showTypeMenu && (
          <div className="flex flex-wrap gap-1 p-2 border rounded bg-white">
            {FIELD_TYPES.map(ft => (
              <button key={ft.code} onClick={() => addColumn(ft.code)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-gray-100 border">
                <ft.icon className="w-3 h-3" /> {ft.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* 左侧字段类型面板 */}
      <div className="w-40 shrink-0 space-y-1">
        <p className="text-xs font-medium text-gray-500 mb-2">字段类型</p>
        {FIELD_TYPES.map(ft => (
          <button key={ft.code} onClick={() => addColumn(ft.code)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors text-left">
            <ft.icon className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs font-medium">{ft.name}</p>
              <p className="text-[10px] text-gray-400">{ft.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* 中间列预览 */}
      <div className="flex-1 space-y-2">
        <p className="text-xs font-medium text-gray-500">已添加 {columns.length} 列</p>
        {columns.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm border border-dashed rounded-lg">
            点击左侧字段类型添加列
          </div>
        ) : (
          columns.map((col, idx) => (
            <div key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${editingIdx === idx ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
              onClick={() => setEditingIdx(idx)}>
              <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                {(() => { const ft = FIELD_TYPES.find(t => t.code === col.type); const Icon = ft?.icon; return Icon ? <Icon className="w-4 h-4 text-gray-500" /> : null; })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{col.name || "(未命名)"}</p>
                <p className="text-xs text-gray-400">{FIELD_TYPES.find(t => t.code === col.type)?.name || col.type}{col.required ? " · 必填" : ""}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); moveColumn(idx, idx - 1); }} disabled={idx === 0}
                className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30">↑</button>
              <button onClick={(e) => { e.stopPropagation(); moveColumn(idx, idx + 1); }} disabled={idx === columns.length - 1}
                className="p-1 text-gray-300 hover:text-gray-500 disabled:opacity-30">↓</button>
              <button onClick={(e) => { e.stopPropagation(); removeColumn(idx); }}
                className="p-1 text-red-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))
        )}
      </div>

      {/* 右侧配置面板 */}
      {selectedCol && (
        <div className="w-56 shrink-0 space-y-3 p-3 border rounded-lg bg-gray-50/50">
          <p className="text-xs font-medium text-gray-500">列配置</p>
          <div className="space-y-1.5">
            <Label className="text-xs">列名</Label>
            <Input value={selectedCol.name} onChange={(e) => updateColumn(editingIdx!, "name", e.target.value)}
              placeholder="输入列名" className="h-7 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">类型</Label>
            <Select value={selectedCol.type} onValueChange={(v) => updateColumn(editingIdx!, "type", v)}>
              <SelectTrigger className="h-7 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map(ft => <SelectItem key={ft.code} value={ft.code}>{ft.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(selectedCol.type === "select" || selectedCol.type === "multiple_select") && (
            <div className="space-y-1.5">
              <Label className="text-xs">选项（一行一个）</Label>
              <textarea value={(selectedCol.options || []).join("\n")}
                onChange={(e) => updateColumn(editingIdx!, "options", e.target.value.split("\n").filter(Boolean))}
                className="w-full h-20 text-xs border rounded p-1.5" placeholder="选项1&#10;选项2&#10;选项3" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox id={`req-${editingIdx}`} checked={selectedCol.required || false}
              onCheckedChange={(c) => updateColumn(editingIdx!, "required", !!c)} />
            <Label htmlFor={`req-${editingIdx}`} className="text-xs">必填</Label>
          </div>
        </div>
      )}
    </div>
  );
}
