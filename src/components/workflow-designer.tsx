"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowDown, GitBranch, Users, Clock, Bell } from "lucide-react";

export interface WorkflowNode {
  id: string;
  name: string;
  handler_ids: string[];
  handler_mode: "any_one" | "all";
  deadline_days: number;
  reminder_hours: number;
  fillable_fields: string[];
}

interface Props {
  nodes: WorkflowNode[];
  onChange: (nodes: WorkflowNode[]) => void;
  allowForward: boolean;
  onAllowForwardChange: (v: boolean) => void;
  allowReturn: boolean;
  onAllowReturnChange: (v: boolean) => void;
  userList: { id: string; name: string }[];
  formColumns: { name: string; type: string }[];
}

let _nodeCounter = 0;
function nextId() { return `node_${Date.now()}_${++_nodeCounter}`; }

export function WorkflowDesigner({
  nodes, onChange, allowForward, onAllowForwardChange,
  allowReturn, onAllowReturnChange, userList, formColumns,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const addNode = () => {
    onChange([...nodes, {
      id: nextId(), name: "", handler_ids: [], handler_mode: "any_one",
      deadline_days: 2, reminder_hours: 24, fillable_fields: [],
    }]);
  };

  const updateNode = (id: string, field: keyof WorkflowNode, value: unknown) => {
    onChange(nodes.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const removeNode = (id: string) => {
    onChange(nodes.filter(n => n.id !== id));
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      {/* 快捷模板 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">快捷模板:</span>
        {[
          { label: "标准三级", nodes: ["部门审批", "技术评审", "最终确认"] },
          { label: "技术评审", nodes: ["技术负责人", "架构评审"] },
        ].map(tpl => (
          <Button key={tpl.label} variant="outline" size="sm" className="h-7 text-xs"
            onClick={() => onChange(tpl.nodes.map((name, i) => ({
              id: nextId(), name, handler_ids: [], handler_mode: "any_one" as const,
              deadline_days: 2, reminder_hours: 24, fillable_fields: [],
            })))}>
            {tpl.label}
          </Button>
        ))}
      </div>

      {/* 节点链 */}
      <div className="space-y-1">
        {nodes.map((node, idx) => (
          <div key={node.id}>
            <div className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${editingId === node.id ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}
              onClick={() => setEditingId(editingId === node.id ? null : node.id)}>
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{node.name || "(未命名)"}</span>
                  {node.handler_ids.length > 0 && (
                    <span className="text-xs text-gray-400">
                      → {node.handler_ids.map(id => userList.find(u => u.id === id)?.name || id).join(", ")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{node.deadline_days}天</span>
                  <span className="flex items-center gap-1"><Bell className="w-3 h-3" />提前{node.reminder_hours}h</span>
                  {node.fillable_fields.length > 0 && (
                    <span>可填: {node.fillable_fields.join(", ")}</span>
                  )}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                className="p-1 text-red-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            {idx < nodes.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="w-4 h-4 text-gray-300" />
              </div>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addNode} className="w-full border-dashed">
        <Plus className="w-3.5 h-3.5 mr-1" /> 添加审批节点
      </Button>

      {/* 编辑面板 */}
      {editingId && (() => {
        const node = nodes.find(n => n.id === editingId);
        if (!node) return null;
        return (
          <div className="p-3 border rounded-lg bg-gray-50/50 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">节点名称</Label>
                <Input value={node.name} onChange={(e) => updateNode(node.id, "name", e.target.value)}
                  placeholder="如: 产品经理审批" className="h-7 text-sm" />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">截止天数</Label>
                <Input type="number" value={node.deadline_days} min={1} max={30}
                  onChange={(e) => updateNode(node.id, "deadline_days", parseInt(e.target.value) || 2)}
                  className="h-7 text-sm" />
              </div>
              <div className="w-24 space-y-1">
                <Label className="text-xs">提醒(h)</Label>
                <Input type="number" value={node.reminder_hours} min={1} max={72}
                  onChange={(e) => updateNode(node.id, "reminder_hours", parseInt(e.target.value) || 24)}
                  className="h-7 text-sm" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">处理人</Label>
              <Select value={node.handler_ids[0] || ""} onValueChange={(v) => updateNode(node.id, "handler_ids", [v])}>
                <SelectTrigger className="h-7 text-sm"><SelectValue placeholder="选择处理人" /></SelectTrigger>
                <SelectContent>
                  {userList.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">处理方式</Label>
              <Select value={node.handler_mode} onValueChange={(v) => updateNode(node.id, "handler_mode", v)}>
                <SelectTrigger className="h-7 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any_one">任一人处理即可</SelectItem>
                  <SelectItem value="all">全部人需处理</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formColumns.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">该节点可填写字段</Label>
                <div className="flex flex-wrap gap-1.5">
                  {formColumns.map(col => (
                    <label key={col.name} className="flex items-center gap-1 text-xs cursor-pointer">
                      <Checkbox checked={node.fillable_fields.includes(col.name)}
                        onCheckedChange={(c) => {
                          const fields = c ? [...node.fillable_fields, col.name] : node.fillable_fields.filter(f => f !== col.name);
                          updateNode(node.id, "fillable_fields", fields);
                        }} />
                      {col.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 全局设置 */}
      <div className="flex items-center gap-6 pt-2 border-t">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox checked={allowForward} onCheckedChange={(c) => onAllowForwardChange(!!c)} />
          允许转办
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox checked={allowReturn} onCheckedChange={(c) => onAllowReturnChange(!!c)} />
          允许退回
        </label>
      </div>
    </div>
  );
}
