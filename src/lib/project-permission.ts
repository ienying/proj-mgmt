import { createServerClient } from "@/storage/database/pg-client";

export interface EditCheckResult {
  allowed: boolean;
  reason?: string;
  projectId?: string;
}

/**
 * 判断当前用户是否可以编辑指定项目。
 *
 * 满足以下任一条件即可：
 *   a) 超级管理员（role === "super_admin"）
 *   b) 用户姓名与项目的 role_project_manager 匹配
 *   c) 用户在 project_members 表中有该项目的记录
 */
export async function canEditProject(
  projectId: string,
  userId: string,
  role: string,
  userName: string,
): Promise<EditCheckResult> {
  // 1. 超级管理员直接放行
  if (role === "super_admin") {
    return { allowed: true, projectId };
  }

  const client = await createServerClient();

  // 2. 查项目信息（获取 role_project_manager）
  const { data: project } = await client.rpc("dp_get_by_id", {
    p_table: "projects",
    p_id: projectId,
  });

  if (!project) {
    return { allowed: false, reason: "项目不存在", projectId };
  }

  const proj = project as Record<string, unknown>;

  // 3. 项目经理姓名匹配
  const pmName = String(proj.role_project_manager || "").trim();
  if (pmName && pmName === userName.trim()) {
    return { allowed: true, projectId };
  }

  // 4. 检查是否是项目成员（project_members 表）
  const { data: members } = await client.rpc("dp_select", {
    p_table: "project_members",
  });

  if (members) {
    const isMember = (members as Record<string, unknown>[]).some(
      (m) => m.project_id === projectId && m.user_id === userId,
    );
    if (isMember) {
      return { allowed: true, projectId };
    }
  }

  return { allowed: false, reason: "无权限编辑该项目", projectId };
}

/**
 * 通过 projectSchema 查找项目并判断权限。
 * 供 /api/project-data 等使用 projectSchema 而非 projectId 的路由使用。
 */
export async function canEditProjectBySchema(
  projectSchema: string,
  userId: string,
  role: string,
  userName: string,
): Promise<EditCheckResult> {
  // 超级管理员直接放行（不需要 projectId）
  if (role === "super_admin") {
    return { allowed: true };
  }

  const client = await createServerClient();

  // 根据 project_schema 查找项目 ID
  const { data: projects } = await client.rpc("dp_select", {
    p_table: "projects",
  });

  if (!projects || !Array.isArray(projects)) {
    return { allowed: false, reason: "无法查询项目信息" };
  }

  const project = (projects as Record<string, unknown>[]).find(
    (p) => String(p.project_schema || "") === projectSchema,
  );

  if (!project) {
    return { allowed: false, reason: "项目不存在" };
  }

  const projectId = String(project.id || "");

  // 项目经理姓名匹配
  const pmName = String(project.role_project_manager || "").trim();
  if (pmName && pmName === userName.trim()) {
    return { allowed: true, projectId };
  }

  // 检查是否是项目成员
  const { data: members } = await client.rpc("dp_select", {
    p_table: "project_members",
  });

  if (members) {
    const isMember = (members as Record<string, unknown>[]).some(
      (m) => m.project_id === projectId && m.user_id === userId,
    );
    if (isMember) {
      return { allowed: true, projectId };
    }
  }

  return { allowed: false, reason: "无权限编辑该项目", projectId };
}
