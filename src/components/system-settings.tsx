"use client";

import { useState, useEffect, useRef } from "react";
import {
  Settings,
  Users,
  Shield,
  Database,
  Key,
  Search,
  UserPlus,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  LayoutGrid,
  Briefcase,
  Megaphone,
  GripVertical,
  Plus,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
  Folder,
  FileText,
  RefreshCw,
  GraduationCap,
  BookOpen,
  Compass,
  Wrench,
  Video,
  Lightbulb,
  CheckCircle,
  Award,
  ThumbsUp,
  Star,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import dynamic from "next/dynamic";
const BaseDataManagement = dynamic(() => import("./base-data-management"), { ssr: false });
const SchemaRulesConfig = dynamic(() => import("./schema-rules-config").then(m => ({ default: m.SchemaRulesConfig })), { ssr: false });
const IssueConfigPanel = dynamic(() => import("./issue-config-panel"), { ssr: false });
const ModuleManagement = dynamic(() => import("./module-management"), { ssr: false });
const CaseCenterSettings = dynamic(() => import("./case-center-settings").then(m => ({ default: m.CaseCenterSettings })), { ssr: false });


interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  role?: "super_admin" | "sub_admin" | "user";
  is_active: boolean;
}

interface SystemSettingsProps {
  users: User[];
  projectTypes: { code: string; name: string }[];
  projectStages: { code: string; name: string }[];
  onUserCreate: (user: Omit<User, "id">) => void;
  onUserUpdate: (id: string, user: Partial<User>) => void;
  onUserDelete: (id: string) => void;
  onUserToggleActive: (id: string, active: boolean) => void;
  onBaseDataChange?: () => void;
}

const menuItems = [
  { id: "users", label: "用户管理", icon: Users },
  { id: "roles", label: "角色权限", icon: Shield },
  { id: "base-data", label: "基础数据", icon: Database },
  { id: "module-mgmt", label: "模块管理", icon: LayoutGrid },
  { id: "issue-config", label: "工单配置", icon: AlertTriangle },
  { id: "case-center-config", label: "案例中心设置", icon: Briefcase },
  { id: "knowledge-category", label: "信息广场分类", icon: Megaphone },
  { id: "config", label: "系统配置", icon: Key },
];

export default function SystemSettings({
  users,
  projectTypes,
  projectStages,
  onUserCreate,
  onUserUpdate,
  onUserDelete,
  onUserToggleActive,
  onBaseDataChange,
}: SystemSettingsProps) {
  const [activeMenu, setActiveMenu] = useState("users");
  // 记录已访问过的菜单，避免组件重复挂载
  const [visitedMenus, setVisitedMenus] = useState<Set<string>>(new Set(["users"]));
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; failed: number; total: number; results: { row: number; name: string; status: string; error?: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<User, "id"> & { password?: string }>({
    username: "",
    name: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    role: "user",
    is_active: true,
    password: "",
  });

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({
      username: "",
      name: "",
      email: "",
      phone: "",
      department: "",
      position: "",
      role: "user",
      is_active: true,
      password: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingId(user.id);
    setFormData({ ...user });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (editingId) {
      onUserUpdate(editingId, formData);
    } else {
      // Create user via API with password
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            password: formData.password || "yuansu0718", // default password
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "创建用户失败");
        }
        const result = await res.json();
        onUserCreate(result.data || formData);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "创建用户失败";
        alert(msg);
        return;
      }
    }
    setDialogOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/users/import", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "导入失败");
      setImportResult(json.data);
      // Refresh user list
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 批量选择
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个用户吗？此操作不可恢复。`)) return;
    setBatchLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => fetch(`/api/users/${id}`, { method: "DELETE" })));
      clearSelection();
      window.location.reload();
    } catch {
      alert("批量删除失败");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchRoleChange = async (newRole: string) => {
    if (selectedIds.size === 0) return;
    const roleLabels: Record<string, string> = { super_admin: "超级管理员", sub_admin: "子管理员", user: "普通用户" };
    if (!confirm(`确定将选中的 ${selectedIds.size} 个用户角色批量变更为「${roleLabels[newRole]}」吗？`)) return;
    setBatchLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`/api/users/${id}/role`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ role: newRole }),
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
      if (failed > 0) {
        alert(`批量角色变更完成，${failed} 个失败`);
      }
      clearSelection();
      window.location.reload();
    } catch {
      alert("批量角色变更失败");
    } finally {
      setBatchLoading(false);
    }
  };

  // 统计数据
  const [productModuleCount, setProductModuleCount] = useState(0);
  
  useEffect(() => {
    // 获取产品模块数量
    fetch("/api/dicts?type=product_module_types")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProductModuleCount(data.length);
        }
      })
      .catch(() => {});
  }, []);
  
  const stats = {
    users: users.length,
    activeUsers: users.filter((u) => u.is_active).length,
    roles: 5,
    rules: 8,
    modules: productModuleCount,
    types: projectTypes.length,
    stages: projectStages.length,
  };

  // 统计卡片配置 - 扁平风格
  return (
    <div className="h-full bg-slate-50">
      {/* 顶部标题栏 */}
      <div className="bg-white border-b border-slate-200">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Settings className="w-5 h-5 text-slate-600" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">系统设置</h1>
          </div>
        </div>
      </div>

      {/* 主内容区 - 双栏布局 */}
      <div className="flex h-[calc(100vh-220px)]">
        {/* 左侧导航 - 固定不滚动 */}
        <div className="w-48 bg-white border-r border-slate-200 p-4 flex-shrink-0">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveMenu(item.id);
                  setVisitedMenus(prev => new Set(prev).add(item.id));
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  activeMenu === item.id
                    ? "bg-blue-500 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 右侧内容区 - 仅右侧滚动 */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* 用户管理 */}
          <div className={activeMenu === "users" ? "" : "hidden"}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="搜索用户..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetch("/api/users/template").then(res => res.blob()).then(blob => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "用户导入模板.xlsx";
                      a.click();
                      URL.revokeObjectURL(url);
                    })}
                  >
                    下载模板
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                  >
                    {importing ? "导入中..." : "Excel导入"}
                  </Button>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={openCreateDialog} className="bg-blue-500 hover:bg-blue-600 text-white">
                        <UserPlus className="w-4 h-4 mr-2" />
                        添加用户
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>
                        {editingId ? "编辑用户" : "添加用户"}
                      </DialogTitle>
                      <DialogDescription>
                        填写用户基本信息
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>
                            用户名 <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={formData.username || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, username: e.target.value }))
                            }
                            placeholder="用户名"
                            disabled={!!editingId}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>
                            姓名 <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            value={formData.name || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, name: e.target.value }))
                            }
                            placeholder="姓名"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>邮箱</Label>
                          <Input
                            type="email"
                            value={formData.email || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, email: e.target.value }))
                            }
                            placeholder="邮箱"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>手机</Label>
                          <Input
                            value={formData.phone || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, phone: e.target.value }))
                            }
                            placeholder="手机号"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>部门</Label>
                          <Input
                            value={formData.department || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, department: e.target.value }))
                            }
                            placeholder="部门"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>职位</Label>
                          <Input
                            value={formData.position || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, position: e.target.value }))
                            }
                            placeholder="职位"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>角色</Label>
                          <Select
                            value={formData.role || "user"}
                            onValueChange={(value) =>
                              setFormData((prev) => ({ ...prev, role: value as "super_admin" | "sub_admin" | "user" }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择角色" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">普通用户</SelectItem>
                              <SelectItem value="sub_admin">子管理员</SelectItem>
                              <SelectItem value="super_admin">超级管理员</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {!editingId && (
                          <div className="space-y-2">
                            <Label>初始密码</Label>
                            <Input
                              type="password"
                              value={formData.password || ""}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, password: e.target.value }))
                              }
                              placeholder="默认 yuansu0718"
                            />
                          </div>
                        )}
                      </div>
                      {!editingId && (
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={formData.is_active}
                            onCheckedChange={(checked) =>
                              setFormData((prev) => ({ ...prev, is_active: checked }))
                            }
                          />
                          <Label>启用账号</Label>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={handleSubmit} className="bg-blue-500 hover:bg-blue-600">
                        {editingId ? "保存" : "创建"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
                  <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 font-medium">暂无用户</p>
                  <p className="text-sm text-slate-400 mt-1">点击"添加用户"创建第一个用户</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  {/* 批量操作栏 */}
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border-b border-blue-200">
                      <span className="text-sm font-medium text-blue-700">
                        已选择 {selectedIds.size} 项
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                        onClick={clearSelection}
                      >
                        取消选择
                      </Button>
                      <div className="flex-1" />
                      <Select onValueChange={handleBatchRoleChange} disabled={batchLoading}>
                        <SelectTrigger className="h-7 w-32 text-xs border-blue-300">
                          <SelectValue placeholder="批量改角色" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">普通用户</SelectItem>
                          <SelectItem value="sub_admin">子管理员</SelectItem>
                          <SelectItem value="super_admin">超级管理员</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                        onClick={handleBatchDelete}
                        disabled={batchLoading}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        批量删除
                      </Button>
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 border-b border-slate-200">
                        <TableHead className="w-10 text-slate-600">
                          <Checkbox
                            checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="text-slate-600">用户</TableHead>
                        <TableHead className="text-slate-600">用户名</TableHead>
                        <TableHead className="text-slate-600">部门</TableHead>
                        <TableHead className="text-slate-600">职位</TableHead>
                        <TableHead className="text-slate-600">角色</TableHead>
                        <TableHead className="text-slate-600">状态</TableHead>
                        <TableHead className="w-40 text-slate-600">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-b border-slate-100">
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(user.id)}
                              onCheckedChange={() => toggleSelect(user.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-blue-500 text-white text-xs">
                                  {getInitials(user.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-slate-900">{user.name}</p>
                                <p className="text-xs text-slate-500">
                                  {user.email || "-"}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-slate-600">
                            {user.username}
                          </TableCell>
                          <TableCell className="text-slate-600">{user.department || "-"}</TableCell>
                          <TableCell className="text-slate-600">{user.position || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "text-xs font-medium",
                              user.role === "super_admin" ? "border-red-200 bg-red-50 text-red-700" :
                              user.role === "sub_admin" ? "border-blue-200 bg-blue-50 text-blue-700" :
                              "border-slate-200 bg-slate-50 text-slate-600"
                            )}>
                              {user.role === "super_admin" ? "超级管理员" :
                               user.role === "sub_admin" ? "子管理员" : "普通用户"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={user.is_active}
                                onCheckedChange={(checked) =>
                                  onUserToggleActive(user.id, checked)
                                }
                              />
                              <span className={cn(
                                "text-xs font-medium",
                                user.is_active ? "text-emerald-600" : "text-slate-400"
                              )}>
                                {user.is_active ? "启用" : "禁用"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-slate-100"
                                onClick={() => openEditDialog(user)}
                                title="编辑"
                              >
                                <Edit className="w-4 h-4 text-slate-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-amber-50"
                                onClick={async () => {
                                  if (confirm("确定要重置该用户密码为默认密码(yuansu0718)吗？")) {
                                    try {
                                      const token = localStorage.getItem("auth_token");
                                      const res = await fetch(`/api/users/${user.id}/reset-password`, {
                                        method: "POST",
                                        headers: token ? { Authorization: `Bearer ${token}` } : {},
                                      });
                                      const data = await res.json();
                                      if (res.ok) {
                                        alert("密码已重置为 yuansu0718");
                                      } else {
                                        alert(data.error || "重置失败");
                                      }
                                    } catch {
                                      alert("重置密码失败");
                                    }
                                  }
                                }}
                                title="重置密码"
                              >
                                <KeyRound className="w-4 h-4 text-amber-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-red-50"
                                onClick={() => onUserDelete(user.id)}
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          {/* 角色权限 */}
          <div className={activeMenu === "roles" ? "" : "hidden"}>
            <RolePermissionPanel users={users} onUserUpdate={onUserUpdate} />
          </div>

          {/* 基础数据 */}
          <div className={activeMenu === "base-data" ? "" : "hidden"}>
            {visitedMenus.has("base-data") && <BaseDataManagement />}
          </div>

          {/* 工单配置 */}
          <div className={activeMenu === "issue-config" ? "" : "hidden"}>
            {visitedMenus.has("issue-config") && <IssueConfigPanel />}
          </div>

          {/* 案例中心设置 */}
          <div className={activeMenu === "case-center-config" ? "" : "hidden"}>
            {visitedMenus.has("case-center-config") && <CaseCenterSettings />}
          </div>

          {/* 信息广场分类维护 */}
          <div className={activeMenu === "knowledge-category" ? "" : "hidden"}>
            {visitedMenus.has("knowledge-category") && <KnowledgeCategoryPanel />}
          </div>

          {/* 模块管理 */}
          <div className={activeMenu === "module-mgmt" ? "" : "hidden"}>
            {visitedMenus.has("module-mgmt") && <ModuleManagement />}
          </div>

          {/* 系统配置 */}
          <div className={activeMenu === "config" ? "" : "hidden"}>
            {visitedMenus.has("config") && <SchemaRulesConfig 
              projectTypes={projectTypes} 
              projectStages={projectStages} 
            />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 信息广场分类维护面板
// ==========================================
function KnowledgeCategoryPanel() {
  const [categories, setCategories] = useState<Array<{
    id: string; name: string; category_type: string; icon: string;
    sort_order: number; is_enabled: boolean; created_at: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editType, setEditType] = useState("material");
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addIcon, setAddIcon] = useState("Folder");
  const [addType, setAddType] = useState("material");

  const typeLabels: Record<string, string> = {
    announcement: "公告通知",
    material: "共享资料",
    share: "经验分享",
  };

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge/categories");
      const json = await res.json();
      if (json.data) {
        const sorted = [...json.data].sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);
        setCategories(sorted);
      }
    } catch (e) {
      console.error("加载分类失败", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCategories(); }, []);

  const handleAdd = async () => {
    if (!addName.trim()) return;
    const maxOrder = categories.reduce((m: number, c: { sort_order: number }) => Math.max(m, c.sort_order), 0);
    try {
      const res = await fetch("/api/knowledge/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          category_type: addType,
          icon: addIcon,
          sort_order: maxOrder + 1,
          is_enabled: true,
        }),
      });
      if (res.ok) {
        setAddOpen(false);
        setAddName("");
        setAddIcon("Folder");
        setAddType("material");
        loadCategories();
      }
    } catch (e) {
      console.error("新增分类失败", e);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, icon: editIcon, category_type: editType }),
      });
      if (res.ok) {
        setEditId(null);
        loadCategories();
      }
    } catch (e) {
      console.error("更新分类失败", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此分类？")) return;
    try {
      await fetch(`/api/knowledge/categories/${id}`, { method: "DELETE" });
      loadCategories();
    } catch (e) {
      console.error("删除分类失败", e);
    }
  };

  const handleToggleEnabled = async (cat: { id: string; is_enabled: boolean; name: string; icon: string; category_type: string; sort_order: number }) => {
    try {
      await fetch(`/api/knowledge/categories/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !cat.is_enabled }),
      });
      loadCategories();
    } catch (e) {
      console.error("切换状态失败", e);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LucideIcons: Record<string, any> = {
    Folder, Megaphone, FileText, RefreshCw, GraduationCap,
    BookOpen, Compass, Presentation: FileText, FileSignature: FileText, Wrench,
    Video, Lightbulb, CheckCircle, Award, ThumbsUp,
    Newspaper: Megaphone, Info: FileText, Bell: Megaphone, ClipboardList: FileText, Star,
  };

  const renderIcon = (iconName: string, className = "h-4 w-4") => {
    const IconComp = LucideIcons[iconName];
    if (IconComp) return <IconComp className={className} />;
    return <Folder className={className} />;
  };

  const iconOptions = [
    "Folder", "Megaphone", "FileText", "RefreshCw", "GraduationCap",
    "BookOpen", "Compass", "Video", "Wrench",
    "Lightbulb", "CheckCircle", "Award", "ThumbsUp", "Star"
  ];

  // 排序：仅在同类型内排序
  const handleMoveUp = async (catId: string, type: string) => {
    const sameType = categories.filter((c) => c.category_type === type).sort((a, b) => a.sort_order - b.sort_order);
    const idx = sameType.findIndex((c) => c.id === catId);
    if (idx <= 0) return;
    // 交换排序号
    const prev = sameType[idx - 1];
    const curr = sameType[idx];
    await Promise.all([
      fetch(`/api/knowledge/categories/${prev.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: curr.sort_order }) }),
      fetch(`/api/knowledge/categories/${curr.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: prev.sort_order }) }),
    ]);
    loadCategories();
  };

  const handleMoveDown = async (catId: string, type: string) => {
    const sameType = categories.filter((c) => c.category_type === type).sort((a, b) => a.sort_order - b.sort_order);
    const idx = sameType.findIndex((c) => c.id === catId);
    if (idx < 0 || idx >= sameType.length - 1) return;
    const curr = sameType[idx];
    const next = sameType[idx + 1];
    await Promise.all([
      fetch(`/api/knowledge/categories/${curr.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: next.sort_order }) }),
      fetch(`/api/knowledge/categories/${next.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sort_order: curr.sort_order }) }),
    ]);
    loadCategories();
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">信息广场分类维护</h3>
        <Button size="sm" onClick={() => setAddOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-1" /> 新增分类
        </Button>
      </div>
      <p className="text-sm text-gray-500">管理公告通知、共享资料、经验分享的分类标签，支持排序和启用/禁用。</p>

      {/* 按类型分组展示 */}
      {(["announcement", "material", "share"] as const).map((type) => {
        const cats = categories.filter((c) => c.category_type === type);
        if (cats.length === 0) return null;
        return (
          <div key={type} className="space-y-2">
            <h4 className="text-sm font-medium text-gray-600 border-b pb-1">
              {typeLabels[type]}分类
            </h4>
            <div className="space-y-1">
              {cats.map((cat, idx) => (
                <div key={cat.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border hover:shadow-sm transition-shadow">
                  {editId === cat.id ? (
                    <>
                      <Input value={editName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)} className="h-8 w-36" />
                      <Select value={editIcon} onValueChange={setEditIcon}>
                        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {iconOptions.map((ic) => <SelectItem key={ic} value={ic}><span className="flex items-center gap-1.5">{renderIcon(ic, "h-3.5 w-3.5")}{ic}</span></SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select value={editType} onValueChange={setEditType}>
                        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="announcement">公告通知</SelectItem>
                          <SelectItem value="material">共享资料</SelectItem>
                          <SelectItem value="share">经验分享</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => handleUpdate(cat.id)} className="text-green-600 hover:text-green-700">保存</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>取消</Button>
                    </>
                  ) : (
                    <>
                      <span className="text-indigo-500 w-6 text-center flex items-center justify-center">{renderIcon(cat.icon)}</span>
                      <span className={`text-sm font-medium ${cat.is_enabled ? "text-gray-800" : "text-gray-400 line-through"}`}>{cat.name}</span>
                      <span className="text-xs text-gray-400">排序:{cat.sort_order}</span>
                      <div className="flex-1" />
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleMoveUp(cat.id, cat.category_type)} disabled={idx === 0}>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleMoveDown(cat.id, cat.category_type)} disabled={idx === cats.length - 1}>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleToggleEnabled(cat)}>
                        {cat.is_enabled ? <Eye className="h-3.5 w-3.5 text-green-500" /> : <EyeOff className="h-3.5 w-3.5 text-gray-400" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditId(cat.id); setEditName(cat.name); setEditIcon(cat.icon); setEditType(cat.category_type); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600" onClick={() => handleDelete(cat.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* 新增弹窗 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增分类</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">分类名称</label>
              <Input value={addName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddName(e.target.value)} placeholder="输入分类名称" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">所属板块</label>
              <Select value={addType} onValueChange={setAddType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">公告通知</SelectItem>
                  <SelectItem value="material">共享资料</SelectItem>
                  <SelectItem value="share">经验分享</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">图标</label>
              <Select value={addIcon} onValueChange={setAddIcon}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {iconOptions.map((ic) => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
            <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700" disabled={!addName.trim()}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// 角色权限管理面板
// ==========================================
function RolePermissionPanel({ users, onUserUpdate }: { users: User[]; onUserUpdate: (id: string, user: Partial<User>) => void }) {
  const [loading, setLoading] = useState(false);

  const roleLabels: Record<string, string> = {
    super_admin: "超级管理员",
    sub_admin: "子管理员",
    user: "普通用户",
  };

  const roleDescriptions: Record<string, string> = {
    super_admin: "拥有系统所有权限，可管理用户角色、系统配置等",
    sub_admin: "由超级管理员授权，可管理用户、基础数据等",
    user: "普通用户，可创建项目，项目内权限由管理员或项目经理分配",
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const roleLabel = roleLabels[newRole] || newRole;
    if (!confirm(`确定将用户「${targetUser?.name}」的角色变更为「${roleLabel}」吗？`)) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        onUserUpdate(userId, { role: newRole as "super_admin" | "sub_admin" | "user" });
      } else {
        alert(data.error || "角色变更失败");
      }
    } catch {
      alert("角色变更失败");
    } finally {
      setLoading(false);
    }
  };

  // Group users by role
  const roleGroups = [
    { role: "super_admin", label: "超级管理员", color: "bg-red-50 border-red-200", badgeColor: "border-red-200 bg-red-50 text-red-700" },
    { role: "sub_admin", label: "子管理员", color: "bg-blue-50 border-blue-200", badgeColor: "border-blue-200 bg-blue-50 text-blue-700" },
    { role: "user", label: "普通用户", color: "bg-slate-50 border-slate-200", badgeColor: "border-slate-200 bg-slate-50 text-slate-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">角色权限管理</h3>
      </div>

      {/* 角色说明卡片 */}
      <div className="grid grid-cols-3 gap-4">
        {roleGroups.map((group) => (
          <div key={group.role} className={`p-4 rounded-lg border ${group.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5" />
              <h4 className="font-semibold">{group.label}</h4>
            </div>
            <p className="text-sm text-gray-600">{roleDescriptions[group.role]}</p>
          </div>
        ))}
      </div>

      {/* 按角色分组的用户列表 */}
      {roleGroups.map((group) => {
        const groupUsers = users.filter((u) => (u.role || "user") === group.role);
        return (
          <div key={group.role} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Badge variant="outline" className={group.badgeColor}>
                  {group.label}
                </Badge>
                <span className="text-gray-400">{groupUsers.length} 人</span>
              </h4>
            </div>
            {groupUsers.length === 0 ? (
              <p className="text-sm text-gray-400 pl-2">暂无{group.label}</p>
            ) : (
              <div className="space-y-1">
                {groupUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white border hover:shadow-sm transition-shadow">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-500 text-white text-xs">
                        {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.department || "-"} · {user.position || "-"}</p>
                    </div>
                    {/* Role change dropdown */}
                    <Select
                      value={user.role || "user"}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                      disabled={loading}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">普通用户</SelectItem>
                        <SelectItem value="sub_admin">子管理员</SelectItem>
                        <SelectItem value="super_admin">超级管理员</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
