-- 性能优化：项目列表查询索引
-- 适用于筛选和排序的常用列

-- 项目类型筛选
CREATE INDEX IF NOT EXISTS idx_projects_type ON public.projects(project_type);

-- 项目状态筛选
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(project_status);

-- 进场时间排序（降序，最近在上）
CREATE INDEX IF NOT EXISTS idx_projects_entry_date ON public.projects(entry_date DESC);

-- 创建时间
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- 部门筛选
CREATE INDEX IF NOT EXISTS idx_projects_department ON public.projects(department);

-- 成员表：按项目查成员
CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members(project_id);

-- 成员表：按用户查项目
CREATE INDEX IF NOT EXISTS idx_project_members_user ON public.project_members(user_id);
