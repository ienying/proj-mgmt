"use client";

import { useState, useEffect, Component, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { TopDock } from "@/components/top-dock";
import { ProjectDetail } from "@/components/project-detail";
import { ChunkErrorHandler } from "@/components/chunk-error-handler";
import { LoginPage } from "@/components/login-page";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { useAuth } from "@/components/auth-context";
import type { TableDefinition } from "@/components/standard-management";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current mr-2" />
      加载中...
    </div>
  );
}

// All heavy components loaded dynamically to prevent SSR issues and ChunkLoadError cascade
const ProjectManagement = dynamic(() => import("@/components/project-management"), { ssr: false, loading: () => <LoadingFallback /> });
const StandardManagement = dynamic(() => import("@/components/standard-management").then(m => ({ default: m.StandardManagement })), { ssr: false, loading: () => <LoadingFallback /> });
const SystemSettings = dynamic(() => import("@/components/system-settings"), { ssr: false, loading: () => <LoadingFallback /> });
const IssueManagement = dynamic(() => import("@/components/issue-management"), { ssr: false, loading: () => <LoadingFallback /> });
const KnowledgeCenter = dynamic(() => import("@/components/knowledge-center").then(m => ({ default: m.default })), { ssr: false, loading: () => <LoadingFallback /> });
const AboutPage = dynamic(() => import("@/components/about-page"), { ssr: false, loading: () => <LoadingFallback /> });
const TaskCenter = dynamic(() => import("@/components/task-center"), { ssr: false, loading: () => <LoadingFallback /> });
const CaseCenter = dynamic(() => import("@/components/case-center"), { ssr: false, loading: () => <LoadingFallback /> });
const ProjectDashboard = dynamic(() => import("@/components/project-dashboard").then(m => ({ default: m.ProjectDashboard })), { ssr: false, loading: () => <LoadingFallback /> });
const StageLayout = dynamic(() => import("@/components/project-detail-stage/StageLayout").then(m => ({ default: m.StageLayout })), { ssr: false, loading: () => <LoadingFallback /> });
const LayoutSelector = dynamic(() => import("@/components/project-detail-stage/LayoutSelector").then(m => ({ default: m.LayoutSelector })), { ssr: false });

import {
  FolderKanban,
  AlertCircle,
  BookOpen,
  Settings,
  Wrench,
  AlertTriangle,
  BriefcaseBusiness,
  Megaphone,
  Info,
  CheckSquare,
  LayoutDashboard,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Error Boundary: 隔离各模块渲染错误，防止单个模块崩溃导致整个页面无响应
class ContentErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <AlertCircle className="w-10 h-10 mb-3 text-red-400" />
          <p className="text-sm font-medium">模块加载异常</p>
          <p className="text-xs mt-1 max-w-md text-center">{this.state.error?.message}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => this.setState({ hasError: false, error: null })}>
            重试
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const mockProjects: Array<{
  id: string;
  project_name: string;
  project_code: string;
  project_type: string;
  project_stage: string;
  project_schema?: string;
  status?: string;
  created_at?: string;
  description?: string;
  customer_info?: unknown;
  channel_info?: unknown;
  procurement_modules?: string[];
}> = [];

const mockStandards = [
  {
    id: "1",
    table_code: "scope_wbs",
    table_name: "WBS分解表",
    module_type: ["scope"],
    description: "项目工作分解结构",
    columns_config: [
      { name: "任务名称", type: "text", required: true, description: "任务名称" },
      { name: "负责人", type: "select", required: true, description: "任务负责人" },
      { name: "开始日期", type: "date", required: true, description: "计划开始日期" },
      { name: "结束日期", type: "date", required: true, description: "计划结束日期" },
    ],
    apply_project_types: ["self_software"],
    apply_project_stages: ["implementation"],
    sort_order: 1,
    is_active: true,
  },
];

export default function HomePage() {
  const { user, isLoading, isAuthenticated, logout: authLogout } = useAuth();
  const [projectTypes, setProjectTypes] = useState<{ code: string; name: string }[]>([]);
  const [projectStages, setProjectStages] = useState<{ code: string; name: string; sort_order?: number }[]>([]);
  const [procurementModules, setProcurementModules] = useState<{ code: string; name: string }[]>([]);
  const [customerTypes, setCustomerTypes] = useState<{ code: string; name: string }[]>([]);
  const [activeItem, setActiveItem] = useState("projects");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"management" | "stage" | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("project_detail_layout_mode");
      if (saved === "management" || saved === "stage") return saved;
    }
    return null;
  });
  const [layoutSelectorOpen, setLayoutSelectorOpen] = useState(false);
  const [projects, setProjects] = useState(mockProjects);
  const [users, setUsers] = useState<{ id: string; username: string; name: string; phone?: string; email?: string; department?: string; position?: string; avatar?: string; role?: "super_admin" | "sub_admin" | "user"; is_active: boolean; created_at: string }[]>([]);
  const [standards, setStandards] = useState<TableDefinition[]>([]);
  const [badges, setBadges] = useState<{ issues: number; messages: number; tasks: number }>({ issues: 0, messages: 0, tasks: 0 });
  const userName = user?.name || "";
  const currentUser = user ? { id: user.id, name: user.name, department: user.department || "", phone: user.phone || "", role: user.role } : { id: "default_user", name: "", department: "", phone: "", role: "user" as const };
  const [viewingProject, setViewingProject] = useState<{
    id: string;
    project_name: string;
    project_code: string;
    project_type: string;
    project_stage: string;
    project_schema: string;
    status: string;
    created_at: string;
    project_status?: string | null;
    customer_info?: { company_name?: string; contact_person?: string; contact_phone?: string; contact_email?: string; contact_persons?: Array<{ name?: string; phone?: string }> } | null;
    customer_location?: { province?: string; city?: string; district?: string; town?: string; village?: string } | null;
    customer_type?: string[] | null;
    deployment_mode?: string | null;
    channel_info?: Array<{ company_name?: string; contact_person?: string; contact_phone?: string }> | null;
    role_sales?: string | null;
    role_presales?: string | null;
    role_market_product?: string | null;
    role_project_manager?: string | null;
    members?: Array<{ name?: string; role?: string; role_type?: string; phone?: string; email?: string }> | null;
    procurement_modules?: Array<string | { code?: string; module_code?: string; module_name?: string; name?: string; quantity?: number }>;
    description?: string;
  } | null>(null);

  const dockItems = [
    { id: "project-board", label: "项目看板", icon: <LayoutDashboard className="w-5 h-5" />, color: "bg-teal-500" },
    { id: "projects", label: "项目管理", icon: <FolderKanban className="w-5 h-5" />, color: "bg-blue-500" },
    { id: "tasks", label: "任务中心", icon: <CheckSquare className="w-5 h-5" />, color: "bg-orange-500", badge: badges.tasks },
    { id: "issues", label: "工单提交", icon: <AlertTriangle className="w-5 h-5" />, color: "bg-blue-500", badge: badges.issues },
    { id: "case-center", label: "案例中心", icon: <BriefcaseBusiness className="w-5 h-5" />, color: "bg-teal-500" },
    { id: "messages", label: "信息广场", icon: <Megaphone className="w-5 h-5" />, color: "bg-purple-500", badge: badges.messages },
    { id: "standards", label: "规范管理", icon: <Wrench className="w-5 h-5" />, color: "bg-violet-500" },
    { id: "settings", label: "设置", icon: <Settings className="w-5 h-5" />, color: "bg-gray-500" },
    { id: "about", label: "关于", icon: <Info className="w-5 h-5" />, color: "bg-indigo-500" },
    { id: "learning", label: "学习中心", icon: <BookOpen className="w-5 h-5" />, color: "bg-cyan-500" },
  ];


  // 监听从子组件发出的视图切换事件（如待办中心跳转到工单页面）
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.view) {
        setActiveItem(detail.view);
      }
    };
    window.addEventListener("navigate-to-view", handler);
    return () => window.removeEventListener("navigate-to-view", handler);
  }, []);

  // 获取角标数据
  useEffect(() => {
    if (!user?.id) return;
    const fetchBadges = async () => {
      try {
        const [badgesRes, tasksRes] = await Promise.all([
          fetch(`/api/badges?user_id=${user.id}`),
          fetch(`/api/tasks/stats?user_id=${user.id}`),
        ]);
        const badgesData = badgesRes.ok ? await badgesRes.json() : null;
        const tasksData = tasksRes.ok ? await tasksRes.json() : null;
        setBadges({
          issues: badgesData?.data?.issues || 0,
          messages: badgesData?.data?.messages || 0,
          tasks: tasksData?.data?.tasks || 0,
        });
      } catch {}
    };
    fetchBadges();
    // 每30秒刷新一次角标
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // 从 API 获取基础数据
  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        // 获取项目类型
        const typesRes = await fetch("/api/dicts?type=project_types");
        if (typesRes.ok) {
          const typesData = await typesRes.json();
          setProjectTypes((typesData.data || []).filter((item: any) => item.code));
        }

        // 获取项目阶段
        const stagesRes = await fetch("/api/dicts?type=project_stages");
        if (stagesRes.ok) {
          const stagesData = await stagesRes.json();
          setProjectStages(
            (stagesData.data || [])
              .filter((item: any) => item.code)
              .sort((a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
          );
        }

        // 获取采购模块（来源于产品模块数据）
        const modulesRes = await fetch("/api/dicts?type=product_module_types");
        if (modulesRes.ok) {
          const modulesData = await modulesRes.json();
          // 转换为 { code, name } 格式，只显示模块名称
          const modules = (modulesData.data || []).map((item: any) => ({
            code: item.code,
            name: item.module_name || item.product_name || item.code
          }));
          setProcurementModules(modules);
        }

        // 获取客户类型
        const ctRes = await fetch("/api/dicts?type=customer_types");
        if (ctRes.ok) {
          const ctData = await ctRes.json();
          setCustomerTypes(
            (ctData.data || []).map((item: any) => ({ code: item.code, name: item.name || item.code }))
          );
        }

        // 获取用户列表
        const usersRes = await fetch("/api/users");
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.data || []);
        }

        // 获取规范表定义（过滤掉任务表单自动生成的 task_ 临时表）
        const standardsRes = await fetch("/api/standards");
        if (standardsRes.ok) {
          const standardsData = await standardsRes.json();
          setStandards((standardsData.data || []).filter(
            (d: Record<string, unknown>) => !String(d.table_code || "").startsWith("task_")
          ));
        }

        // 获取项目列表
        const projectsRes = await fetch("/api/projects");
        if (projectsRes.ok) {
          const projectsData = await projectsRes.json();
          setProjects(projectsData.data || []);
        }
      } catch (error) {
        console.error("获取基础数据失败:", error);
      }
    };

    fetchBaseData();
  }, []);

  // 刷新基础数据的方法
  const refreshBaseData = async () => {
    try {
      const [typesRes, stagesRes, modulesRes, ctRes, projectsRes] = await Promise.all([
        fetch("/api/dicts?type=project_types"),
        fetch("/api/dicts?type=project_stages"),
        fetch("/api/dicts?type=product_module_types"),
        fetch("/api/dicts?type=customer_types"),
        fetch("/api/projects"),
      ]);

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setProjectTypes((typesData.data || []).filter((item: any) => item.code));
      }
      if (stagesRes.ok) {
        const stagesData = await stagesRes.json();
        setProjectStages(
          (stagesData.data || [])
            .filter((item: any) => item.code)
            .sort((a: any, b: any) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
        );
      }
      if (modulesRes.ok) {
        const modulesData = await modulesRes.json();
        // 转换为 { code, name } 格式，只显示模块名称
        const modules = (modulesData.data || []).map((item: any) => ({
          code: item.code,
          name: item.module_name || item.product_name || item.code
        }));
        setProcurementModules(modules);
      }
      if (ctRes.ok) {
        const ctData = await ctRes.json();
        setCustomerTypes((ctData.data || []).map((item: any) => ({ code: item.code, name: item.name || item.code })));
      }
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.data || []);
      }
    } catch (error) {
      console.error("刷新基础数据失败:", error);
    }
  };

  const handleItemClick = (id: string) => {
    setActiveItem(id);
    // 切换到项目管理页面时刷新基础数据
    if (id === "projects") {
      refreshBaseData();
    }
  };


  const handleProjectCreate = async (data: any) => {
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "创建失败");
      }

      const result = await response.json();
      
      // 更新本地状态
      setProjects((prev) => [result.data, ...prev]);
      toast.success("项目创建成功");
    } catch (error: any) {
      toast.error("创建失败: " + error.message);
    }
  };

  const handleProjectDelete = async (id: string) => {
    console.log("handleProjectDelete called with id:", id);
    try {
      // 调用后端 API 删除项目（包括成员、Schema 等）
      const response = await fetch(`/api/projects/${id}?id=${id}`, {
        method: "DELETE",
      });
      console.log("Delete response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "删除失败");
      }

      const result = await response.json();
      console.log("Delete result:", result);
      
      // 从前端状态中移除
      setProjects((prev) => prev.filter((p) => p.id !== id));
      
      const parts = ["项目删除成功"];
      if (result.deletedSchema) parts.push(`已清理 Schema: ${result.deletedSchema}`);
      if (result.uploadsCleaned) parts.push("已清理上传文件目录");
      toast.success(parts.join("，"));
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("删除失败: " + error.message);
    }
  };

  const handleViewProject = (project: {
    id: string;
    project_name: string;
    project_code: string;
    project_type: string;
    project_stage: string;
    project_schema?: string;
    status?: string;
    created_at?: string;
    customer_info?: {
      company_name?: string;
      contact_person?: string;
      contact_phone?: string;
      contact_email?: string;
    } | unknown;
    channel_info?: Array<{
      company_name: string;
      contact_person?: string;
      contact_phone?: string;
    }> | unknown;
    procurement_modules?: string[];
    description?: string;
  }) => {
    const typedProject = project as typeof viewingProject;
    setViewingProject(typedProject);
    // 如果用户从未选择过布局，弹出选择器
    if (layoutMode === null) {
      setLayoutSelectorOpen(true);
    }
  };

  const handleSetLayoutMode = (mode: "management" | "stage") => {
    setLayoutMode(mode);
    setLayoutSelectorOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("project_detail_layout_mode", mode);
    }
  };

  const handleUserCreate = async (data: any) => {
    try {
      // If data already has id (from API response), use it directly
      if (data.id) {
        setUsers((prev) => [data, ...prev]);
      } else {
        // Fallback: create locally
        const newUser = {
          id: String(Date.now()),
          ...data,
          created_at: new Date().toISOString(),
        };
        setUsers((prev) => [newUser, ...prev]);
      }
      toast.success("用户创建成功");
    } catch (error: any) {
      toast.error("创建失败: " + error.message);
    }
  };

  const handleUserUpdate = async (id: string, data: any) => {
    try {
      // Update via API
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "更新失败");
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...data } : u))
      );
      toast.success("用户更新成功");
    } catch (error: any) {
      toast.error("更新失败: " + error.message);
    }
  };

  const handleUserDelete = async (id: string) => {
    try {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      toast.success("用户删除成功");
    } catch (error: any) {
      toast.error("删除失败: " + error.message);
    }
  };

  const handleUserToggleActive = async (id: string, active: boolean) => {
    try {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_active: active } : u))
      );
      toast.success(active ? "用户已启用" : "用户已禁用");
    } catch (error: any) {
      toast.error("操作失败: " + error.message);
    }
  };

  const handleStandardCreate = async (data: any) => {
    try {
      const res = await fetch("/api/standards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const text = await res.text();
        let errMsg = text;
        try {
          const errorData = JSON.parse(text);
          errMsg = errorData.error || "创建失败";
        } catch {}
        throw new Error(errMsg);
      }

      const result = await res.json();
      setStandards((prev) => [...prev, result.data]);
      toast.success("数据表创建成功");
    } catch (error: any) {
      toast.error("创建失败: " + error.message);
    }
  };

  const handleStandardUpdate = async (id: string, data: any) => {
    try {
      const res = await fetch(`/api/standards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...data }),
      });

      if (!res.ok) {
        const text = await res.text();
        let errMsg = text;
        try {
          const errorData = JSON.parse(text);
          errMsg = errorData.error || "更新失败";
        } catch {}
        throw new Error(errMsg);
      }

      setStandards((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s))
      );
      toast.success("数据表更新成功");
    } catch (error: any) {
      toast.error("更新失败: " + error.message);
    }
  };

  const handleStandardDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/standards/${id}?id=${id}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "删除失败");
      }
      
      setStandards((prev) => prev.filter((s) => s.id !== id));
      toast.success("数据表删除成功");
    } catch (error: any) {
      toast.error("删除失败: " + error.message);
    }
  };

  const handleStandardDuplicate = async (def: any) => {
    try {
      const res = await fetch("/api/standards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...def, id: undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "复制失败");
      }
      toast.success(`已复制为 ${def.table_code}`);
      const refreshRes = await fetch("/api/standards");
      const refreshData = await refreshRes.json();
      setStandards((refreshData.data || []).filter((d: any) => !String(d.table_code).startsWith("task_")));
    } catch (error: any) {
      toast.error("复制失败: " + error.message);
    }
  };

  const handleStandardReorder = async (fromIndex: number, toIndex: number) => {
    try {
      if (fromIndex === toIndex) return;

      const newStandards = [...standards];
      const [moved] = newStandards.splice(fromIndex, 1);
      newStandards.splice(toIndex, 0, moved);

      // 更新 sort_order
      const updatedStandards = newStandards.map((s, i) => ({
        ...s,
        sort_order: i,
      }));
      setStandards(updatedStandards);

      // 保存排序到后端（并行更新所有变更项）
      const updates = updatedStandards
        .filter((s, i) => s.sort_order !== standards.find(os => os.id === s.id)?.sort_order)
        .map((s) =>
          fetch(`/api/standards/${s.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: s.id, sort_order: s.sort_order }),
          })
        );
      await Promise.allSettled(updates);
      toast.success("排序更新成功");
    } catch (error: any) {
      toast.error("排序失败: " + error.message);
    }
  };

  const handleLogout = async () => {
    await authLogout();
    toast.info("已退出登录");
  };

  const renderContent = () => {
    // 普通用户无权访问规范管理和设置页面
    if (user?.role === "user" && (activeItem === "standards" || activeItem === "settings")) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">访问受限</h2>
            <p className="text-muted-foreground">您没有权限访问此页面，请联系管理员。</p>
          </div>
        </div>
      );
    }

    switch (activeItem) {
      case "project-board":
        return (
          <ContentErrorBoundary>
            <ProjectDashboard
              isSuperAdmin={user?.role === "super_admin"}
              onViewProject={(projectId) => {
                const project = projects.find((p) => p.id === projectId);
                if (project) {
                  setViewingProject({
                    id: project.id,
                    project_name: project.project_name,
                    project_code: project.project_code,
                    project_type: project.project_type,
                    project_stage: project.project_stage,
                    project_schema: project.project_schema || `yuansu_${project.project_code.toLowerCase()}`,
                    status: project.status || "active",
                    created_at: project.created_at || "",
                    customer_info: project.customer_info as { company_name?: string; contact_person?: string; contact_phone?: string; contact_email?: string } | undefined,
                    channel_info: project.channel_info as Array<{ company_name: string; contact_person?: string; contact_phone?: string }> | undefined,
                    procurement_modules: project.procurement_modules as string[] | undefined,
                    description: project.description,
                  });
                  if (layoutMode === null) {
                    setLayoutSelectorOpen(true);
                  }
                  setActiveItem("projects");
                }
              }}
            />
          </ContentErrorBoundary>
        );
      case "projects":
        if (viewingProject) {
          if (layoutMode === "stage") {
            return (
              <ContentErrorBoundary>
                <StageLayout
                  project={viewingProject}
                  projectTypes={projectTypes}
                  projectStages={projectStages}
                  procurementModuleDict={procurementModules}
                  customerTypeDict={customerTypes}
                  onBack={() => { setViewingProject(null); }}
                  onSwitchLayout={handleSetLayoutMode}
                />
              </ContentErrorBoundary>
            );
          }
          // layoutMode === "management" or null (shows management behind selector)
          return (
            <ContentErrorBoundary>
              <ProjectDetail
                project={viewingProject as any}
                projectTypes={projectTypes}
                projectStages={projectStages}
                onBack={() => { setViewingProject(null); setLayoutSelectorOpen(false); }}
                onSwitchLayout={handleSetLayoutMode}
              />
            </ContentErrorBoundary>
          );
        }
        return (
          <ContentErrorBoundary>
            <ProjectManagement
              projects={projects}
              initialProjectTypes={projectTypes}
              initialProjectStages={projectStages}
              initialProcurementModules={procurementModules}
              users={users}
              onProjectDelete={handleProjectDelete}
              onViewProject={handleViewProject}
            />
          </ContentErrorBoundary>
        );
      case "tasks":
        return (
          <ContentErrorBoundary>
            <TaskCenter currentUser={currentUser} />
          </ContentErrorBoundary>
        );
      case "standards":
        return (
          <ContentErrorBoundary>
            <StandardManagement
              definitions={standards}
              projectTypes={projectTypes}
              projectStages={projectStages}
              onCreate={handleStandardCreate}
              onUpdate={handleStandardUpdate}
              onDelete={handleStandardDelete}
              onDuplicate={handleStandardDuplicate}
              onReorder={handleStandardReorder}
            />
          </ContentErrorBoundary>
        );
      case "settings":
        return (
          <ContentErrorBoundary>
            <SystemSettings
              users={users}
              projectTypes={projectTypes}
              projectStages={projectStages}
              onUserCreate={handleUserCreate}
              onUserUpdate={handleUserUpdate}
              onUserDelete={handleUserDelete}
              onUserToggleActive={handleUserToggleActive}
              onBaseDataChange={refreshBaseData}
            />
          </ContentErrorBoundary>
        );
      case "about":
        return (
          <ContentErrorBoundary>
            <AboutPage onNavigate={(viewId) => setActiveItem(viewId)} />
          </ContentErrorBoundary>
        );
      case "case-center":
        return (
          <ContentErrorBoundary>
            <CaseCenter currentUser={currentUser} />
          </ContentErrorBoundary>
        );
      case "issues":
        return (
          <ContentErrorBoundary>
            <IssueManagement currentUser={currentUser} />
          </ContentErrorBoundary>
        );
case "messages":
        return (
          <ContentErrorBoundary>
            <KnowledgeCenter currentUser={currentUser} />
          </ContentErrorBoundary>
        );
      default:
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <FolderKanban className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-semibold mb-2">
                {dockItems.find((item) => item.id === activeItem)?.label || "页面"}
              </h2>
              <p className="text-muted-foreground">功能开发中...</p>
            </div>
          </div>
        );
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-current" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <TopDock
        items={dockItems.filter((item) => {
          if (user?.role !== "user") return true;
          return item.id !== "standards" && item.id !== "settings";
        })}
        activeItem={activeItem}
        onItemClick={handleItemClick}
        userName={userName}
        onLogout={handleLogout}
        onChangePassword={() => setShowChangePassword(true)}
      />

      <main className="flex-1 overflow-y-auto">{renderContent()}</main>

      <ChangePasswordDialog
        open={showChangePassword}
        onOpenChange={setShowChangePassword}
      />

      <LayoutSelector
        open={layoutSelectorOpen}
        onSelect={handleSetLayoutMode}
      />
    </div>
  );
}
