"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, type UserInfo } from "@/components/auth-context";

/** Project-level permission keys */
export type ProjectPermission =
  | "project_edit"
  | "member_manage"
  | "module_manage"
  | "task_manage"
  | "issue_handle"
  | "issue_report"
  | "data_view"
  | "data_export";

/** All available project permissions with labels */
export const PROJECT_PERMISSIONS: { key: ProjectPermission; label: string; description: string }[] = [
  { key: "project_edit", label: "编辑项目", description: "修改项目基本信息、客户信息等" },
  { key: "member_manage", label: "成员管理", description: "添加/移除项目成员、分配权限" },
  { key: "module_manage", label: "模块管理", description: "管理项目模块配置和数据" },
  { key: "task_manage", label: "任务管理", description: "创建/分配/管理项目任务" },
  { key: "issue_handle", label: "问题处理", description: "处理和回复工单问题" },
  { key: "issue_report", label: "问题上报", description: "提交问题工单" },
  { key: "data_view", label: "数据查看", description: "查看项目数据和报表" },
  { key: "data_export", label: "数据导出", description: "导出项目数据和文件" },
];

/** Hook to check project-level permissions */
export function useProjectPermission(projectId: string | null) {
  const { user, token } = useAuth();
  const [permissions, setPermissions] = useState<ProjectPermission[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (!user || !projectId || !token) {
      setPermissions([]);
      return;
    }

    // Admins have all permissions
    if (["super_admin", "sub_admin"].includes(user.role)) {
      setPermissions(PROJECT_PERMISSIONS.map((p) => p.key));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/members/${user.id}/permissions`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setPermissions((data.data?.effectivePermissions || []) as ProjectPermission[]);
      }
    } catch {
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user, projectId, token]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (key: ProjectPermission): boolean => {
      if (!user) return false;
      if (["super_admin", "sub_admin"].includes(user.role)) return true;
      return permissions.includes(key);
    },
    [user, permissions]
  );

  const hasAnyPermission = useCallback(
    (...keys: ProjectPermission[]): boolean => {
      if (!user) return false;
      if (["super_admin", "sub_admin"].includes(user.role)) return true;
      return keys.some((key) => permissions.includes(key));
    },
    [user, permissions]
  );

  return { permissions, loading, hasPermission, hasAnyPermission, refresh: fetchPermissions };
}

/** Check global role-based access */
export function useGlobalPermission() {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";
  const isSubAdmin = user?.role === "sub_admin";
  const isAdmin = isSuperAdmin || isSubAdmin;

  const canManageUsers = isSuperAdmin; // Only super admin can manage user roles
  const canManageRoles = isSuperAdmin; // Only super admin can assign sub_admin
  const canCreateProject = true; // Everyone can create projects
  const canAccessSystemSettings = isAdmin;

  return {
    isSuperAdmin,
    isSubAdmin,
    isAdmin,
    canManageUsers,
    canManageRoles,
    canCreateProject,
    canAccessSystemSettings,
    user,
  };
}
