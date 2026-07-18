"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  Cpu,
  BarChart3,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-context";
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
const AIConfigPanel = dynamic(() => import("./ai-config-panel"), { ssr: false });
const AIStatsPanel = dynamic(() => import("./ai-stats-panel"), { ssr: false });



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

  { id: "knowledge-category", label: "信息广场分类", icon: Megaphone },
  { id: "ai-config", label: "大模型配置", icon: Cpu },
  { id: "ai-stats", label: "AI 使用统计", icon: BarChart3 },
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
  const { user: currentUser } = useAuth();
  const [activeMenu, setActiveMenu] = useState("users");

  // 角色权限菜单仅超级管理员可见
  const visibleMenuItems = menuItems.filter((item) => {
    if (item.id === "roles" && currentUser?.role !== "super_admin") return false;
    return true;
  });
  // 记录已访问过的菜单，避免组件重复挂载
  const [visitedMenus, setVisitedMenus] = useState<Set<string>>(new Set(["users"]));
  const [searchQuery, setSearchQuery] = useState("");
  // 下拉筛选
  const [deptFilter, setDeptFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  // 用户管理子 Tab
  const [userSubTab, setUserSubTab] = useState<"users" | "departments">("users");
  const [departments, setDepartments] = useState<{ id: string; code: string; name: string; description?: string; sort_order: number; is_enabled: boolean }[]>([]);
  const [deptSearchQuery, setDeptSearchQuery] = useState("");
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [deptFormData, setDeptFormData] = useState({ code: "", name: "", description: "", sort_order: 0, is_enabled: true });
  const deptFileInputRef = useRef<HTMLInputElement>(null);
  const [deptImporting, setDeptImporting] = useState(false);
  const [deptImportResult, setDeptImportResult] = useState<{ created: number; skipped: number; failed: number; total: number; results: { row: number; name: string; status: string; error?: string }[] } | null>(null);
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

  // 提取唯一下拉选项
  const uniqueDepartments = useMemo(
    () => [...new Set(users.map((u) => u.department).filter(Boolean))].sort(),
    [users]
  );
  const uniquePositions = useMemo(
    () => [...new Set(users.map((u) => u.position).filter(Boolean))].sort(),
    [users]
  );

  const filteredUsers = users.filter((user) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      user.name.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q);
    const matchesDept = deptFilter === "all" || user.department === deptFilter;
    const matchesPosition = positionFilter === "all" || user.position === positionFilter;
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesDept && matchesPosition && matchesRole;
  });

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
  const [departmentLoading, setDepartmentLoading] = useState(false);

  const loadDepartments = () => {
    fetch("/api/dicts?type=departments")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setDepartments(data.data.map((d: Record<string, unknown>) => ({
            id: d.id as string,
            code: d.code as string,
            name: d.name as string,
            description: d.description as string | undefined,
            sort_order: d.sort_order as number,
            is_enabled: d.is_enabled as boolean,
          })));
        }
      })
      .catch(() => {});
  };

  const handleDeptSubmit = async () => {
    if (!deptFormData.code.trim() || !deptFormData.name.trim()) return;
    setDepartmentLoading(true);
    try {
      const url = editingDeptId ? `/api/dicts/${editingDeptId}` : "/api/dicts/create";
      const method = editingDeptId ? "PUT" : "POST";
      const body = editingDeptId
        ? { type: "departments", id: editingDeptId, name: deptFormData.name, description: deptFormData.description, sort_order: deptFormData.sort_order, is_enabled: deptFormData.is_enabled }
        : { type: "departments", code: deptFormData.code, name: deptFormData.name, description: deptFormData.description, sort_order: deptFormData.sort_order, is_enabled: deptFormData.is_enabled };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "操作失败");
        return;
      }
      loadDepartments();
      setDeptDialogOpen(false);
    } catch {
      alert("操作失败");
    } finally {
      setDepartmentLoading(false);
    }
  };

  const handleDeptDelete = async (id: string) => {
    if (!confirm("确定删除该部门吗？")) return;
    const res = await fetch(`/api/dicts/${id}?type=departments`, { method: "DELETE" });
    if (res.ok) {
      loadDepartments();
    } else {
      alert("删除失败");
    }
  };

  // 统计数据
  const [productModuleCount, setProductModuleCount] = useState(0);
  
  useEffect(() => {
    // 获取产品目录数量
    fetch("/api/dicts?type=product_module_types")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProductModuleCount(data.length);
        }
      })
      .catch(() => {});
  }, []);

  // 加载部门列表
  useEffect(() => {
    fetch("/api/dicts?type=departments")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setDepartments(data.data.map((d: Record<string, unknown>) => ({
            id: d.id as string,
            code: d.code as string,
            name: d.name as string,
            description: d.description as string | undefined,
            sort_order: d.sort_order as number,
            is_enabled: d.is_enabled as boolean,
          })));
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

  // 部门搜索过滤
  const filteredDepartments = useMemo(() => {
    if (!deptSearchQuery.trim()) return departments;
    const q = deptSearchQuery.toLowerCase();
    return departments.filter(
      (d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
    );
  }, [departments, deptSearchQuery]);

  // 统计卡片配置 - 扁平风格
  // 导航分组
  const navGroups = [
    { title: "系统", items: ["users", "roles"] },
    { title: "数据", items: ["base-data", "module-mgmt", "issue-config"] },
    { title: "扩展", items: ["knowledge-category", "ai-config", "ai-stats"] },
    { title: "其他", items: ["config"] },
  ];

  return (
    <div className="h-full bg-[#f9fafb] flex">
      {/* 左侧导航 - fixed 居中 */}
      <div className="w-[180px] flex-shrink-0 relative">
        <div className="fixed top-1/2 -translate-y-1/2 w-[180px] pl-6 pr-3">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-5">
              <div className="text-[10px] uppercase tracking-[1.2px] text-[#9ca3af] font-semibold mb-1.5">{group.title}</div>
              {visibleMenuItems.filter((item) => group.items.includes(item.id)).map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveMenu(item.id);
                    setVisitedMenus(prev => new Set(prev).add(item.id));
                  }}
                  className={cn(
                    "block w-full text-left py-[5px] text-[14px] transition-colors",
                    activeMenu === item.id
                      ? "text-[#e8590c] font-semibold"
                      : "text-[#6b7280] hover:text-[#1e293b]"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 overflow-y-auto pr-12 pl-2 py-12">
          {/* 用户管理 */}
          <div className={activeMenu === "users" ? "" : "hidden"}>
            {/* 子 Tab 切换 */}
            <div className="flex gap-0 mb-4">
              <button type="button" onClick={() => setUserSubTab("users")}
                className={cn("px-4 py-1.5 text-xs font-medium border border-[#e5e7eb] bg-white transition-colors rounded-l", userSubTab === "users" ? "bg-[#111827] text-white border-[#111827]" : "text-[#6b7280] hover:bg-[#f9fafb]")}>
                用户账户
              </button>
              <button type="button" onClick={() => setUserSubTab("departments")}
                className={cn("px-4 py-1.5 text-xs font-medium border border-[#e5e7eb] bg-white transition-colors rounded-r -ml-px", userSubTab === "departments" ? "bg-[#111827] text-white border-[#111827]" : "text-[#6b7280] hover:bg-[#f9fafb]")}>
                部门管理
              </button>
            </div>

            {/* 用户列表 */}
            {userSubTab === "users" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="搜索用户..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {/* 部门筛选 */}
                  <Select
                    value={deptFilter}
                    onValueChange={(v) => { setDeptFilter(v); clearSelection(); }}
                  >
                    <SelectTrigger className="w-36 h-10 text-sm">
                      <SelectValue placeholder="部门" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部部门</SelectItem>
                      {uniqueDepartments.map((d) => (
                        <SelectItem key={d} value={d!}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* 职位筛选 */}
                  <Select
                    value={positionFilter}
                    onValueChange={(v) => { setPositionFilter(v); clearSelection(); }}
                  >
                    <SelectTrigger className="w-36 h-10 text-sm">
                      <SelectValue placeholder="职位" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部职位</SelectItem>
                      {uniquePositions.map((p) => (
                        <SelectItem key={p} value={p!}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* 角色筛选 */}
                  <Select
                    value={roleFilter}
                    onValueChange={(v) => { setRoleFilter(v); clearSelection(); }}
                  >
                    <SelectTrigger className="w-36 h-10 text-sm">
                      <SelectValue placeholder="角色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部角色</SelectItem>
                      <SelectItem value="super_admin">超级管理员</SelectItem>
                      <SelectItem value="sub_admin">子管理员</SelectItem>
                      <SelectItem value="user">普通用户</SelectItem>
                    </SelectContent>
                  </Select>
                  {(deptFilter !== "all" || positionFilter !== "all" || roleFilter !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 text-xs text-slate-500"
                      onClick={() => { setDeptFilter("all"); setPositionFilter("all"); setRoleFilter("all"); clearSelection(); }}
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      清除筛选
                    </Button>
                  )}
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
                          <Select
                            value={formData.department || ""}
                            onValueChange={(value) =>
                              setFormData((prev) => ({ ...prev, department: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="选择部门" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.filter(d => d.is_enabled).map((dept) => (
                                <SelectItem key={dept.code} value={dept.name}>{dept.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                        {currentUser?.role === "super_admin" && (
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
                        )}
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
                <div className="bg-card border border-border rounded-lg p-8 text-center">
                  <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 font-medium">暂无用户</p>
                  <p className="text-sm text-slate-400 mt-1">点击"添加用户"创建第一个用户</p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
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
                      {currentUser?.role === "super_admin" && (
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
                      )}
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
                      <TableRow className="bg-muted border-b border-border">
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
                        <TableRow key={user.id} className="border-b border-border">
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
                              "border-border bg-muted text-slate-600"
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
                                className="h-8 w-8 hover:bg-accent"
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
            )}

            {/* 部门管理 */}
            {userSubTab === "departments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">部门列表</h2>
                  <div className="relative w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="搜索部门名称或编码..."
                      value={deptSearchQuery}
                      onChange={(e) => setDeptSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={deptFileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setDeptImporting(true);
                      setDeptImportResult(null);
                      try {
                        const fd = new FormData();
                        fd.append("file", file);
                        const res = await fetch("/api/departments/import", {
                          method: "POST",
                          body: fd,
                        });
                        const json = await res.json();
                        if (!res.ok) { alert(json.error || "导入失败"); return; }
                        setDeptImportResult(json.data);
                        loadDepartments();
                      } catch (err) {
                        alert(err instanceof Error ? err.message : "导入失败");
                      } finally {
                        setDeptImporting(false);
                        if (deptFileInputRef.current) deptFileInputRef.current.value = "";
                      }
                    }}
                    className="hidden"
                  />
                  <Dialog open={!!deptImportResult} onOpenChange={(open) => { if (!open) setDeptImportResult(null); }}>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>导入结果</DialogTitle>
                        <DialogDescription>
                          共 {deptImportResult?.total} 行，成功 {deptImportResult?.created} 行，跳过 {deptImportResult?.skipped} 行，失败 {deptImportResult?.failed} 行
                        </DialogDescription>
                      </DialogHeader>
                      {deptImportResult && (
                        <div className="max-h-80 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>行号</TableHead>
                                <TableHead>部门名称</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>原因</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {deptImportResult.results.map((r, i) => (
                                <TableRow key={i}>
                                  <TableCell className="text-sm">{r.row}</TableCell>
                                  <TableCell className="text-sm font-medium">{r.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={cn(
                                      "text-xs",
                                      r.status === "成功" ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                                      r.status === "跳过" ? "border-amber-200 bg-amber-50 text-amber-700" :
                                      "border-red-200 bg-red-50 text-red-700"
                                    )}>{r.status}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-slate-500">{r.error || "-"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                      <DialogFooter>
                        <Button onClick={() => setDeptImportResult(null)}>关闭</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetch("/api/departments/template").then(res => res.blob()).then(blob => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "部门导入模板.xlsx";
                        a.click();
                        URL.revokeObjectURL(url);
                      });
                    }}
                  >
                    下载模板
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deptFileInputRef.current?.click()}
                    disabled={deptImporting}
                  >
                    {deptImporting ? "导入中..." : "Excel导入"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetch("/api/departments/export").then(res => res.blob()).then(blob => {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "部门数据导出.xlsx";
                        a.click();
                        URL.revokeObjectURL(url);
                      });
                    }}
                  >
                    导出
                  </Button>
                  <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => {
                      setEditingDeptId(null);
                      setDeptFormData({ code: "", name: "", description: "", sort_order: 0, is_enabled: true });
                    }} className="bg-blue-500 hover:bg-blue-600 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      添加部门
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingDeptId ? "编辑部门" : "添加部门"}</DialogTitle>
                      <DialogDescription>填写部门基本信息</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>部门编码 <span className="text-red-500">*</span></Label>
                        <Input
                          value={deptFormData.code}
                          onChange={(e) => setDeptFormData(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="如：tech_dept"
                          disabled={!!editingDeptId}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>部门名称 <span className="text-red-500">*</span></Label>
                        <Input
                          value={deptFormData.name}
                          onChange={(e) => setDeptFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="如：技术部"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>描述</Label>
                        <Input
                          value={deptFormData.description}
                          onChange={(e) => setDeptFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="部门描述"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>取消</Button>
                      <Button onClick={handleDeptSubmit} disabled={departmentLoading} className="bg-blue-500 hover:bg-blue-600">
                        {editingDeptId ? "保存" : "创建"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                </div>
              </div>

              {filteredDepartments.length === 0 ? (
                <div className="bg-card border border-border rounded-lg p-8 text-center">
                  <Database className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 font-medium">
                    {departments.length === 0 ? "暂无部门" : "无匹配部门"}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {departments.length === 0 ? "点击\"添加部门\"创建第一个部门" : "尝试修改搜索条件"}
                  </p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted border-b border-border">
                        <TableHead className="text-slate-600">部门名称</TableHead>
                        <TableHead className="text-slate-600">部门编码</TableHead>
                        <TableHead className="text-slate-600">描述</TableHead>
                        <TableHead className="text-slate-600">状态</TableHead>
                        <TableHead className="w-32 text-slate-600">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDepartments.map((dept) => (
                        <TableRow key={dept.id} className="border-b border-border">
                          <TableCell className="font-medium text-slate-900">{dept.name}</TableCell>
                          <TableCell className="font-mono text-sm text-slate-600">{dept.code}</TableCell>
                          <TableCell className="text-slate-500">{dept.description || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "text-xs font-medium",
                              dept.is_enabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-border bg-muted text-slate-400"
                            )}>
                              {dept.is_enabled ? "启用" : "禁用"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-accent"
                                onClick={() => {
                                  setEditingDeptId(dept.id);
                                  setDeptFormData({ code: dept.code, name: dept.name, description: dept.description || "", sort_order: dept.sort_order, is_enabled: dept.is_enabled });
                                  setDeptDialogOpen(true);
                                }}
                                title="编辑"
                              >
                                <Edit className="w-4 h-4 text-slate-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-red-50"
                                onClick={() => handleDeptDelete(dept.id)}
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
            )}
          </div>

          {/* 角色权限 */}
          <div className={activeMenu === "roles" ? "" : "hidden"}>
            {currentUser?.role === "super_admin" ? (
              <RolePermissionPanel users={users} onUserUpdate={onUserUpdate} />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">仅超级管理员可访问角色权限管理</p>
                </div>
              </div>
            )}
          </div>

          {/* 基础数据 */}
          <div className={activeMenu === "base-data" ? "" : "hidden"}>
            {visitedMenus.has("base-data") && <BaseDataManagement />}
          </div>

          {/* 工单配置 */}
          <div className={activeMenu === "issue-config" ? "" : "hidden"}>
            {visitedMenus.has("issue-config") && <IssueConfigPanel />}
          </div>


          {/* 信息广场分类维护 */}
          <div className={activeMenu === "knowledge-category" ? "" : "hidden"}>
            {visitedMenus.has("knowledge-category") && <KnowledgeCategoryPanel />}
          </div>

          {/* 大模型配置 */}
          <div className={activeMenu === "ai-config" ? "" : "hidden"}>
            {visitedMenus.has("ai-config") && <AIConfigPanel />}
          </div>

          {/* AI 使用统计 */}
          <div className={activeMenu === "ai-stats" ? "" : "hidden"}>
            {visitedMenus.has("ai-stats") && <AIStatsPanel />}
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
  const [editType, setEditType] = useState("tech_doc");
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addIcon, setAddIcon] = useState("Folder");
  const [addType, setAddType] = useState("tech_doc");

  const typeLabels: Record<string, string> = {
    tech_doc: "技术文档",
    product_manual: "产品手册",
    ops_tool: "运维工具",
    acceptance: "验收资料",
    solution_template: "方案模板",
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
        setAddType("tech_doc");
        loadCategories();
        toast.success("分类已添加");
      } else {
        const json = await res.json().catch(() => null);
        toast.error(json?.error || "新增分类失败，请稍后重试");
      }
    } catch (e) {
      console.error("新增分类失败", e);
      toast.error("新增分类失败，请稍后重试");
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
        toast.success("分类已更新");
      } else {
        const json = await res.json().catch(() => null);
        toast.error(json?.error || "更新分类失败，请稍后重试");
      }
    } catch (e) {
      console.error("更新分类失败", e);
      toast.error("更新分类失败，请稍后重试");
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
      <p className="text-sm text-gray-500">管理信息广场五大分类：技术文档、产品手册、运维工具、验收资料、方案模板。</p>

      {/* 按类型分组展示 */}
      {(["tech_doc", "product_manual", "ops_tool", "acceptance", "solution_template"] as const).map((type) => {
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
                          <SelectItem value="tech_doc">技术文档</SelectItem>
                          <SelectItem value="product_manual">产品手册</SelectItem>
                          <SelectItem value="ops_tool">运维工具</SelectItem>
                          <SelectItem value="acceptance">验收资料</SelectItem>
                          <SelectItem value="solution_template">方案模板</SelectItem>
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
                  <SelectItem value="tech_doc">技术文档</SelectItem>
                  <SelectItem value="product_manual">产品手册</SelectItem>
                  <SelectItem value="ops_tool">运维工具</SelectItem>
                  <SelectItem value="acceptance">验收资料</SelectItem>
                  <SelectItem value="solution_template">方案模板</SelectItem>
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

      {/* Attachment tag management */}
      <AttachmentTagPanel />
    </div>
  );
}

// 附件标签管理子面板
function AttachmentTagPanel() {
  const [tags, setTags] = useState<Array<{ id: string; name: string; sort_order: number; is_enabled: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState("");
  const [editTagId, setEditTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");

  const loadTags = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge/categories/tags");
      const json = await res.json();
      if (json.data) setTags(json.data);
    } catch (e) { console.error("加载附件标签失败", e); }
    setLoading(false);
  };

  useEffect(() => { loadTags(); }, []);

  const handleAdd = async () => {
    if (!newTagName.trim()) return;
    try {
      await fetch("/api/knowledge/categories/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });
      setNewTagName("");
      loadTags();
      toast.success("标签已添加");
    } catch (e) { toast.error("添加标签失败"); }
  };

  const handleUpdate = async (id: string) => {
    if (!editTagName.trim()) return;
    try {
      await fetch(`/api/knowledge/categories/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editTagName.trim() }),
      });
      setEditTagId(null);
      loadTags();
      toast.success("标签已更新");
    } catch (e) { toast.error("更新标签失败"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此标签？")) return;
    try {
      await fetch(`/api/knowledge/categories/tags/${id}`, { method: "DELETE" });
      loadTags();
      toast.success("标签已删除");
    } catch (e) { toast.error("删除标签失败"); }
  };

  if (loading) return null;

  return (
    <div className="border-t pt-6 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-base font-semibold text-gray-800">附件标签管理</h4>
        <div className="flex items-center gap-2">
          <Input
            value={newTagName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTagName(e.target.value)}
            placeholder="新标签名称"
            className="h-8 w-36"
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handleAdd(); }}
          />
          <Button size="sm" onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-3 w-3 mr-1" /> 添加
          </Button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-3">管理发布内容时可为附件选择的标签，用于分类和搜索。</p>
      <div className="space-y-1">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border">
            {editTagId === tag.id ? (
              <>
                <Input
                  value={editTagName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditTagName(e.target.value)}
                  className="h-8 w-40"
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === "Enter") handleUpdate(tag.id); }}
                />
                <Button size="sm" variant="ghost" onClick={() => handleUpdate(tag.id)} className="text-green-600">保存</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditTagId(null)}>取消</Button>
              </>
            ) : (
              <>
                <span className="text-sm text-gray-700 flex-1">{tag.name}</span>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditTagId(tag.id); setEditTagName(tag.name); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500" onClick={() => handleDelete(tag.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}
        {tags.length === 0 && <p className="text-sm text-gray-400 text-center py-4">暂无标签</p>}
      </div>
    </div>
  );
}

// ==========================================
// 角色权限管理面板
// ==========================================
function RolePermissionPanel({ users, onUserUpdate }: { users: User[]; onUserUpdate: (id: string, user: Partial<User>) => void }) {
  const [loading, setLoading] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  // 添加成员弹窗
  const [addMemberOpen, setAddMemberOpen] = useState<{ open: boolean; role: string }>({ open: false, role: "" });
  const [addSelectedIds, setAddSelectedIds] = useState<Set<string>>(new Set());
  // 添加成员弹窗内的搜索筛选
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [addMemberDeptFilter, setAddMemberDeptFilter] = useState("all");
  const [addMemberPositionFilter, setAddMemberPositionFilter] = useState("all");
  // 移除成员弹窗
  const [removeMemberOpen, setRemoveMemberOpen] = useState<{ open: boolean; role: string }>({ open: false, role: "" });
  const [removeSelectedIds, setRemoveSelectedIds] = useState<Set<string>>(new Set());

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

  // 各角色权限清单（只读展示）
  const rolePermissions: Record<string, string[]> = {
    super_admin: ["用户管理", "角色分配", "系统配置", "基础数据管理", "模块管理", "工单配置", "AI 配置", "全部数据访问"],
    sub_admin: ["用户管理", "基础数据管理", "模块管理", "工单配置"],
    user: ["创建项目", "项目内权限由管理员分配"],
  };

  const toggleCollapse = (role: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
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

  // 批量添加成员到某角色
  const handleBatchAddToRole = async () => {
    if (addSelectedIds.size === 0) return;
    const roleLabel = roleLabels[addMemberOpen.role] || addMemberOpen.role;
    if (!confirm(`确定将选中的 ${addSelectedIds.size} 名用户角色变更为「${roleLabel}」吗？`)) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const ids = Array.from(addSelectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/users/${id}/role`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ role: addMemberOpen.role }),
          }).then(async (res) => {
            if (res.ok) {
              onUserUpdate(id, { role: addMemberOpen.role as "super_admin" | "sub_admin" | "user" });
            }
          })
        )
      );
      setAddMemberOpen({ open: false, role: "" });
      setAddSelectedIds(new Set());
    } catch {
      alert("批量添加失败");
    } finally {
      setLoading(false);
    }
  };

  // 批量移除成员（改为普通用户）
  const handleBatchRemoveFromRole = async () => {
    if (removeSelectedIds.size === 0) return;
    if (!confirm(`确定将选中的 ${removeSelectedIds.size} 名用户角色变更为「普通用户」吗？`)) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const ids = Array.from(removeSelectedIds);
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/users/${id}/role`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ role: "user" }),
          }).then(async (res) => {
            if (res.ok) {
              onUserUpdate(id, { role: "user" });
            }
          })
        )
      );
      setRemoveMemberOpen({ open: false, role: "" });
      setRemoveSelectedIds(new Set());
    } catch {
      alert("批量移除失败");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Group users by role
  const roleGroups = [
    { role: "super_admin", label: "超级管理员", color: "bg-red-50 border-red-200", badgeColor: "border-red-200 bg-red-50 text-red-700", iconColor: "text-red-600", cardBorder: "border-l-red-400", btnClass: "hover:bg-red-100" },
    { role: "sub_admin", label: "子管理员", color: "bg-blue-50 border-blue-200", badgeColor: "border-blue-200 bg-blue-50 text-blue-700", iconColor: "text-blue-600", cardBorder: "border-l-blue-400", btnClass: "hover:bg-blue-100" },
    { role: "user", label: "普通用户", color: "bg-muted border-border", badgeColor: "border-border bg-muted text-slate-600", iconColor: "text-slate-600", cardBorder: "border-l-slate-300", btnClass: "hover:bg-slate-100" },
  ];

  const totalUsers = users.length;

  // 添加成员弹窗 — 可添加的用户及筛选
  const addableUsers = useMemo(
    () => users.filter((u) => (u.role || "user") !== addMemberOpen.role),
    [users, addMemberOpen.role]
  );
  const addDialogDepts = useMemo(
    () => [...new Set(addableUsers.map((u) => u.department).filter(Boolean))].sort(),
    [addableUsers]
  );
  const addDialogPositions = useMemo(
    () => [...new Set(addableUsers.map((u) => u.position).filter(Boolean))].sort(),
    [addableUsers]
  );
  const filteredAddableUsers = useMemo(() => {
    const q = addMemberSearch.toLowerCase();
    return addableUsers.filter((u) => {
      const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
      const matchesDept = addMemberDeptFilter === "all" || u.department === addMemberDeptFilter;
      const matchesPosition = addMemberPositionFilter === "all" || u.position === addMemberPositionFilter;
      return matchesSearch && matchesDept && matchesPosition;
    });
  }, [addableUsers, addMemberSearch, addMemberDeptFilter, addMemberPositionFilter]);

  const [roleFilter, setRoleFilter] = useState("all");
  const filteredByRole = roleFilter === "all" ? users : users.filter((u) => (u.role || "user") === roleFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-[#1e293b]">角色权限</span>
        <span className="text-xs text-[#9ca3af]">共 {filteredByRole.length} 名用户</span>
        <div className="flex-1" />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-[30px] px-2 text-[11px] border border-[#e5e7eb] bg-white text-[#4b5563] cursor-pointer"
        >
          <option value="all">全部角色</option>
          <option value="super_admin">超级管理员</option>
          <option value="sub_admin">子管理员</option>
          <option value="user">普通用户</option>
        </select>
      </div>

      {/* 用户角色列表 */}
      <div className="bg-white border border-[#e5e7eb]">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[#e5e7eb]">
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#6b7280] bg-[#f9fafb]">用户</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#6b7280] bg-[#f9fafb]">部门</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#6b7280] bg-[#f9fafb]">当前角色</th>
              <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-[#6b7280] bg-[#f9fafb]">操作</th>
            </tr>
          </thead>
          <tbody>
            {[...filteredByRole].sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh")).map((u) => (
              <tr key={u.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                <td className="px-4 py-2.5 text-[13px] font-medium text-[#1e293b]">{u.name}</td>
                <td className="px-4 py-2.5 text-[12px] text-[#6b7280]">{u.department || "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-medium ${
                    (u.role || "user") === "super_admin" ? "bg-[#fff7ed] text-[#e8590c]" :
                    (u.role || "user") === "sub_admin" ? "bg-[#eff6ff] text-[#3b82f6]" :
                    "bg-[#f3f4f6] text-[#6b7280]"
                  }`}>
                    {roleLabels[(u.role || "user") as string] || u.role || "普通用户"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <select
                    value={u.role || "user"}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="h-[30px] px-2 text-[11px] border border-[#e5e7eb] bg-white text-[#4b5563] cursor-pointer"
                    disabled={loading}
                  >
                    <option value="super_admin">超级管理员</option>
                    <option value="sub_admin">子管理员</option>
                    <option value="user">普通用户</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-8 text-[12px] text-[#9ca3af]">暂无用户数据</div>
        )}
      </div>

      {/* 添加成员弹窗 */}
      <Dialog open={addMemberOpen.open} onOpenChange={(open) => { if (!open) setAddMemberOpen({ open: false, role: "" }); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>添加成员到「{roleLabels[addMemberOpen.role] || addMemberOpen.role}」</DialogTitle>
            <DialogDescription>
              选择要添加到该角色的用户（已过滤当前已是该角色的用户）
            </DialogDescription>
          </DialogHeader>
          {/* 搜索与筛选 */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索姓名或用户名..."
                value={addMemberSearch}
                onChange={(e) => setAddMemberSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Select value={addMemberDeptFilter} onValueChange={setAddMemberDeptFilter}>
              <SelectTrigger className="w-28 h-9 text-xs">
                <SelectValue placeholder="部门" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部部门</SelectItem>
                {addDialogDepts.map((d) => (
                  <SelectItem key={d} value={d!}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={addMemberPositionFilter} onValueChange={setAddMemberPositionFilter}>
              <SelectTrigger className="w-28 h-9 text-xs">
                <SelectValue placeholder="职位" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部职位</SelectItem>
                {addDialogPositions.map((p) => (
                  <SelectItem key={p} value={p!}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(addMemberSearch || addMemberDeptFilter !== "all" || addMemberPositionFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-slate-500"
                onClick={() => { setAddMemberSearch(""); setAddMemberDeptFilter("all"); setAddMemberPositionFilter("all"); }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                清除
              </Button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1 py-1">
            {addableUsers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">所有用户已在此角色中</p>
            ) : filteredAddableUsers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">无匹配用户，请调整筛选条件</p>
            ) : (
              filteredAddableUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={addSelectedIds.has(user.id)}
                    onCheckedChange={() => {
                      const next = new Set(addSelectedIds);
                      if (next.has(user.id)) next.delete(user.id);
                      else next.add(user.id);
                      setAddSelectedIds(next);
                    }}
                  />
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.department || "-"} · {user.position || "-"} · 当前角色: {roleLabels[user.role || "user"]}</p>
                  </div>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen({ open: false, role: "" })}>取消</Button>
            <Button onClick={handleBatchAddToRole} disabled={addSelectedIds.size === 0 || loading} className="bg-blue-500 hover:bg-blue-600">
              {loading ? "处理中..." : `添加 ${addSelectedIds.size > 0 ? addSelectedIds.size : ""} 人`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 移除成员弹窗 */}
      <Dialog open={removeMemberOpen.open} onOpenChange={(open) => { if (!open) setRemoveMemberOpen({ open: false, role: "" }); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>从「{roleLabels[removeMemberOpen.role] || removeMemberOpen.role}」移除成员</DialogTitle>
            <DialogDescription>
              选中的用户将被变更为「普通用户」角色
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto space-y-1 py-2">
            {users
              .filter((u) => (u.role || "user") === removeMemberOpen.role)
              .length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">此角色中没有用户</p>
            ) : (
              users
                .filter((u) => (u.role || "user") === removeMemberOpen.role)
                .map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent cursor-pointer"
                  >
                    <Checkbox
                      checked={removeSelectedIds.has(user.id)}
                      onCheckedChange={() => {
                        const next = new Set(removeSelectedIds);
                        if (next.has(user.id)) next.delete(user.id);
                        else next.add(user.id);
                        setRemoveSelectedIds(next);
                      }}
                    />
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-blue-500 text-white text-xs">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.department || "-"} · {user.position || "-"}</p>
                    </div>
                  </label>
                ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveMemberOpen({ open: false, role: "" })}>取消</Button>
            <Button onClick={handleBatchRemoveFromRole} disabled={removeSelectedIds.size === 0 || loading} className="bg-red-500 hover:bg-red-600">
              {loading ? "处理中..." : `移除 ${removeSelectedIds.size > 0 ? removeSelectedIds.size : ""} 人`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 按角色分组的用户卡片网格 */}
      {roleGroups.map((group) => {
        const groupUsers = users.filter((u) => (u.role || "user") === group.role);
        const isCollapsed = collapsedGroups.has(group.role);
        return (
          <div key={group.role} className="space-y-3">
            <button
              type="button"
              onClick={() => toggleCollapse(group.role)}
              className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
            >
              <Badge variant="outline" className={group.badgeColor}>
                {group.label}
              </Badge>
              <span className="text-gray-400 text-sm">{groupUsers.length} 人</span>
              <span className="flex-1" />
              <span className="text-xs text-muted-foreground">
                {isCollapsed ? "展开" : "收起"}
              </span>
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {!isCollapsed && (
              groupUsers.length === 0 ? (
                <p className="text-sm text-gray-400 pl-2">暂无{group.label}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {groupUsers.map((user) => (
                    <div
                      key={user.id}
                      className={`flex flex-col gap-2 p-4 rounded-lg bg-white border border-l-4 ${group.cardBorder} hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className="bg-blue-500 text-white text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{user.name}</p>
                          <p className="text-xs text-gray-400 truncate font-mono">{user.username}</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {user.department && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">部门:</span>
                            <span className="truncate">{user.department}</span>
                          </div>
                        )}
                        {user.position && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">职位:</span>
                            <span className="truncate">{user.position}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1 pt-2 border-t border-border">
                        <Select
                          value={user.role || "user"}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={loading}
                        >
                          <SelectTrigger className="w-28 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">普通用户</SelectItem>
                            <SelectItem value="sub_admin">子管理员</SelectItem>
                            <SelectItem value="super_admin">超级管理员</SelectItem>
                          </SelectContent>
                        </Select>
                        {!user.is_active && (
                          <Badge variant="outline" className="text-xs border-red-200 bg-red-50 text-red-600">
                            已禁用
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
