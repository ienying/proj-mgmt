"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Edit, Trash2, ChevronRight, ChevronDown, AlertTriangle, Clock, ShieldCheck, Users, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface CategoryItem {
  id: string;
  name: string;
  code: string;
  parent_id: string | null;
  is_enabled: boolean;
  sort_order: number;
  children?: CategoryItem[];
}

interface CommonDictItem {
  id: string;
  name: string;
  code: string;
  is_enabled: boolean;
  sort_order: number;
}

interface FormDataType {
  name: string;
  code: string;
  sort_order: number;
  parent_id: string | null;
}

type DictType = "category" | "urgency" | "warranty";

const URL_MAP: Record<DictType, string> = {
  category: "/api/issue-dicts/categories",
  urgency: "/api/issue-dicts/urgency",
  warranty: "/api/issue-dicts/warranty",
};

const LABEL_MAP: Record<DictType, string> = {
  category: "类别",
  urgency: "紧急程度",
  warranty: "保修情况",
};

export default function IssueConfigPanel() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [urgencyList, setUrgencyList] = useState<CommonDictItem[]>([]);
  const [warrantyList, setWarrantyList] = useState<CommonDictItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CommonDictItem | CategoryItem | null>(null);
  const [currentType, setCurrentType] = useState<DictType>("category");
  const [formData, setFormData] = useState<FormDataType>({
    name: "",
    code: "",
    sort_order: 0,
    parent_id: null,
  });

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/issue-dicts/categories");
      const json = await res.json();
      const data: CategoryItem[] = json.data || [];
      const rootCategories = data.filter((c) => !c.parent_id);
      const withChildren = rootCategories.map((root) => ({
        ...root,
        children: data
          .filter((c) => c.parent_id === root.id)
          .sort((a, b) => a.sort_order - b.sort_order),
      }));
      setCategories(withChildren.sort((a, b) => a.sort_order - b.sort_order));
    } catch (err) {
      console.error("获取问题类别失败", err);
    }
  }, []);

  const fetchUrgency = useCallback(async () => {
    try {
      const res = await fetch("/api/issue-dicts/urgency");
      const json = await res.json();
      const data: CommonDictItem[] = json.data || [];
      setUrgencyList(data.sort((a, b) => a.sort_order - b.sort_order));
    } catch (err) {
      console.error("获取紧急程度失败", err);
    }
  }, []);

  const fetchWarranty = useCallback(async () => {
    try {
      const res = await fetch("/api/issue-dicts/warranty");
      const json = await res.json();
      const data: CommonDictItem[] = json.data || [];
      setWarrantyList(data.sort((a, b) => a.sort_order - b.sort_order));
    } catch (err) {
      console.error("获取保修情况失败", err);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCategories(), fetchUrgency(), fetchWarranty()]);
    setLoading(false);
  }, [fetchCategories, fetchUrgency, fetchWarranty]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  const openDialog = (type: DictType, item?: CommonDictItem | CategoryItem) => {
    setCurrentType(type);
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        code: item.code,
        sort_order: item.sort_order,
        parent_id: (item as CategoryItem).parent_id || null,
      });
    } else {
      setEditingItem(null);
      setFormData({ name: "", code: "", sort_order: 0, parent_id: null });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = URL_MAP[currentType];
      if (editingItem) {
        await fetch(`${url}?id=${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
      }
      setDialogOpen(false);
      await fetchAll();
    } catch (err) {
      console.error("保存失败", err);
    }
  };

  const handleDelete = async (type: DictType, id: string) => {
    if (!confirm("确定要删除吗？")) return;
    try {
      await fetch(`${URL_MAP[type]}?id=${id}`, { method: "DELETE" });
      await fetchAll();
    } catch (err) {
      console.error("删除失败", err);
    }
  };

  const toggleEnabled = async (type: DictType, item: CommonDictItem | CategoryItem, checked: boolean) => {
    try {
      await fetch(`${URL_MAP[type]}?id=${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, is_enabled: checked }),
      });
      await fetchAll();
    } catch (err) {
      console.error("更新状态失败", err);
    }
  };

  const getAvailableParentCategories = (): CategoryItem[] => {
    return categories;
  };

  const renderTableHeader = () => (
    <TableHeader>
      <TableRow>
        <TableHead className="w-[200px]">名称</TableHead>
        <TableHead className="w-[140px]">编码</TableHead>
        <TableHead className="w-[80px]">排序</TableHead>
        <TableHead className="w-[80px]">启用</TableHead>
        <TableHead className="text-right w-[100px]">操作</TableHead>
      </TableRow>
    </TableHeader>
  );

  const renderActions = (type: DictType, item: CommonDictItem | CategoryItem) => (
    <TableCell className="text-right">
      <div className="flex items-center justify-end gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDialog(type, item)}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-red-600 hover:text-red-700"
          onClick={() => handleDelete(type, item.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </TableCell>
  );

  return (
    <div className="space-y-4">
      {/* 问题类别 */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900">问题类别</h3>
            <span className="text-xs text-slate-400">{categories.length} 个大类</span>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDialog("category")}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            新增类别
          </Button>
        </div>
        <Table>
          {renderTableHeader()}
          <TableBody>
            {loading && categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-400 py-6">
                  加载中...
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <React.Fragment key={category.id}>
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        {category.children && category.children.length > 0 ? (
                          <button
                            onClick={() => toggleExpand(category.id)}
                            className="mr-1.5 p-0.5 hover:bg-accent rounded"
                          >
                            {expandedCategories.has(category.id) ? (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            )}
                          </button>
                        ) : (
                          <span className="mr-5" />
                        )}
                        {category.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs font-mono">{category.code}</TableCell>
                    <TableCell>{category.sort_order}</TableCell>
                    <TableCell>
                      <Switch
                        checked={category.is_enabled}
                        onCheckedChange={(checked: boolean) => toggleEnabled("category", category, checked)}
                      />
                    </TableCell>
                    {renderActions("category", category)}
                  </TableRow>
                  {category.children &&
                    expandedCategories.has(category.id) &&
                    category.children.map((child) => (
                      <TableRow key={child.id}>
                        <TableCell>
                          <div className="flex items-center pl-8 text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mr-2" />
                            {child.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs font-mono">{child.code}</TableCell>
                        <TableCell>{child.sort_order}</TableCell>
                        <TableCell>
                          <Switch
                            checked={child.is_enabled}
                            onCheckedChange={(checked: boolean) => toggleEnabled("category", child, checked)}
                          />
                        </TableCell>
                        {renderActions("category", child)}
                      </TableRow>
                    ))}
                </React.Fragment>
              ))
            )}
            {!loading && categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-400 py-6">
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 紧急程度 + 保修情况 并排 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 紧急程度 */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-slate-900">紧急程度</h3>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDialog("urgency")}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              新增
            </Button>
          </div>
          <Table>
            {renderTableHeader()}
            <TableBody>
              {urgencyList.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-slate-500 text-xs font-mono">{item.code}</TableCell>
                  <TableCell>{item.sort_order}</TableCell>
                  <TableCell>
                    <Switch
                      checked={item.is_enabled}
                      onCheckedChange={(checked: boolean) => toggleEnabled("urgency", item, checked)}
                    />
                  </TableCell>
                  {renderActions("urgency", item)}
                </TableRow>
              ))}
              {urgencyList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-4">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* 保修情况 */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <h3 className="text-sm font-semibold text-slate-900">保修情况</h3>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openDialog("warranty")}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              新增
            </Button>
          </div>
          <Table>
            {renderTableHeader()}
            <TableBody>
              {warrantyList.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-slate-500 text-xs font-mono">{item.code}</TableCell>
                  <TableCell>{item.sort_order}</TableCell>
                  <TableCell>
                    <Switch
                      checked={item.is_enabled}
                      onCheckedChange={(checked: boolean) => toggleEnabled("warranty", item, checked)}
                    />
                  </TableCell>
                  {renderActions("warranty", item)}
                </TableRow>
              ))}
              {warrantyList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-4">
                    暂无数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 外部工单接收人配置 */}
      <ExternalReceiversConfig />

      {/* 编辑/新增弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "编辑" : "新增"}
              {LABEL_MAP[currentType]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">名称</label>
              <Input
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入名称"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">编码</label>
              <Input
                value={formData.code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, code: e.target.value })}
                placeholder="请输入编码（如 SOFTWARE_BUG）"
              />
            </div>
            {currentType === "category" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">父级类别</label>
                <Select
                  value={formData.parent_id || "__root__"}
                  onValueChange={(val: string) =>
                    setFormData({ ...formData, parent_id: val === "__root__" ? null : val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择父级（空则为顶级）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__root__">无（顶级类别）</SelectItem>
                    {getAvailableParentCategories()
                      .filter((c) => c.id !== editingItem?.id)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">排序</label>
              <Input
                type="number"
                value={formData.sort_order}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={!formData.name || !formData.code}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// 外部工单接收人配置 + QR 码展示
// ==========================================
function ExternalReceiversConfig() {
  const [receivers, setReceivers] = useState<Array<{ id: string; user_id: string; user_name: string; is_enabled: boolean }>>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const loadReceivers = async () => {
    try {
      const res = await fetch("/api/issue-config/external-receivers");
      const json = await res.json();
      if (json.data) setReceivers(json.data);
    } catch (e) {
      console.error("加载接收人失败", e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.data) {
        setUsers((json.data || []).map((u: Record<string, unknown>) => ({
          id: u.id as string,
          name: u.name as string,
        })));
      }
    } catch (e) {
      console.error("加载用户失败", e);
    }
  };

  useEffect(() => {
    Promise.all([loadReceivers(), loadUsers()]).finally(() => setLoading(false));
  }, []);

  const handleAdd = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    try {
      await fetch("/api/issue-config/external-receivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, user_name: user.name }),
      });
      loadReceivers();
    } catch (e) {
      console.error("添加接收人失败", e);
    }
  };

  const handleToggle = async (r: { id: string; is_enabled: boolean }) => {
    try {
      await fetch(`/api/issue-config/external-receivers?id=${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !r.is_enabled }),
      });
      loadReceivers();
    } catch (e) {
      console.error("切换状态失败", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该接收人吗？")) return;
    try {
      await fetch(`/api/issue-config/external-receivers?id=${id}`, { method: "DELETE" });
      loadReceivers();
    } catch (e) {
      console.error("删除接收人失败", e);
    }
  };

  if (loading) return null;

  return (
    <>
      {/* 外部工单接收人 */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-slate-900">外部工单接收人</h3>
            <span className="text-xs text-slate-400">{receivers.length} 人</span>
          </div>
          <Popover open={addOpen} onOpenChange={setAddOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Plus className="h-3 w-3" /> 添加接收人
                <ChevronsUpDown className="h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="end">
              <Command>
                <CommandInput placeholder="搜索用户名..." />
                <CommandList>
                  <CommandEmpty>无匹配用户</CommandEmpty>
                  <CommandGroup>
                    {users
                      .filter((u) => !receivers.some((r) => r.user_id === u.id))
                      .map((u) => (
                        <CommandItem key={u.id} value={u.name} onSelect={() => {
                          handleAdd(u.id);
                          setAddOpen(false);
                        }}>
                          {u.name}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          外部用户扫码提交的工单将同时推送至所有启用的接收人待办事项中，一人受理后其他人待办自动取消。
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">接收人</TableHead>
              <TableHead className="w-[80px]">启用</TableHead>
              <TableHead className="text-right w-[80px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receivers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-slate-400 py-4">
                  暂未配置接收人，请添加
                </TableCell>
              </TableRow>
            ) : (
              receivers.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.user_name}</TableCell>
                  <TableCell>
                    <Switch
                      checked={r.is_enabled}
                      onCheckedChange={() => handleToggle(r)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-red-600 hover:text-red-700"
                      onClick={() => handleDelete(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

    </>
  );
}
