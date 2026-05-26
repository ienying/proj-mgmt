# 项目管理系统 (Project Management System)

## 项目概览

这是一个企业级项目管理平台，采用 Next.js 16 + TypeScript + Supabase 技术栈构建。

### 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4
- **数据库**: Supabase (PostgreSQL)
- **数据访问**: 通过 RPC 函数访问 design_public Schema

## 目录结构

```
├── src/
│   ├── app/                      # 页面路由
│   │   ├── page.tsx             # 主页面
│   │   └── api/                 # API 路由
│   │       ├── projects/       # 项目管理 API
│   │       ├── users/          # 用户管理 API
│   │       ├── todos/          # 待办事项 API
│   │       ├── standards/      # 规范管理 API (含 sync 子路由: 同步到项目)
│   │       ├── issues/        # 问题上报 API (含 attachments/records/notifications/[id] 子路由)
│   │       ├── issue-dicts/   # 问题字典 API (categories/urgency/warranty)
│   │       ├── dicts/          # 字典管理 API (含 create 子路由)
│   │       ├── module-types/   # 模块定义 API
│   │       ├── module-config/  # 模块启用配置 API (类型×阶段→模块)
│   │       └── todo-center/   # 待办中心 API (items/cc/stats)
│   │       ├── todo-tasks/   # 待办任务 API (defs/instances/parse-excel/stats/generate-periodic)
│   │       ├── case-center/   # 案例中心 API (config/product-cases/product-stats/user-profiles)
│   │       ├── knowledge/    # 信息广场 API (categories/posts/upload/download/search)
│   │       └── auth/         # 认证 API (login/logout/me/change-password)
│   ├── components/              # 组件
│   │   ├── top-dock.tsx        # 顶部 Dock 栏导航
│   │   ├── todo-dialog.tsx     # 待办事项弹窗
│   │   ├── project-management.tsx  # 项目管理
│   │   ├── project-form.tsx    # 项目创建表单
│   │   ├── standard-management.tsx # 规范管理
│   │   ├── system-settings.tsx    # 系统设置
│   │   ├── base-data-management.tsx # 基础数据维护
│   │   ├── dashboard.tsx       # 数据看板
│   │   ├── issue-management.tsx # 问题上报
│   │   ├── module-management.tsx  # 模块管理
│   │   ├── todo-center.tsx     # 待办中心
│   │   ├── task-management.tsx # 待办任务 (发布任务/我的待办/我发起的/全部任务/统计看板)
│   │   ├── publish-task-dialog.tsx # 发布任务弹窗 (4步向导)
│   │   ├── case-center.tsx    # 案例中心
│   │   ├── case-center-settings.tsx # 案例中心设置
│   │   ├── knowledge-center.tsx  # 信息广场
│   │   ├── auth-context.tsx    # 认证上下文 (AuthProvider + useAuth)
│   │   ├── login-page.tsx      # 登录页面
│   │   ├── change-password-dialog.tsx # 修改密码弹窗
│   │   ├── use-permission.ts   # 权限Hook (useProjectPermission + useGlobalPermission)
│   │   └── ui/                 # shadcn/ui 组件库
│   └── storage/
│       └── database/           # Supabase 数据库
│           ├── supabase-client.ts
│           └── shared/
│               ├── schema.ts    # 数据表定义
│               └── relations.ts
└── .coze                       # 项目配置
```

## 数据库架构 (重要)

### Schema 设计

所有业务表均存储在 `design_public` Schema 中，`public` Schema 不存储任何业务表。

### RPC 函数访问方式

由于 Supabase PostgREST 默认只暴露 `public` Schema，我们通过 `SECURITY DEFINER` RPC 函数访问 `design_public` 中的数据：

| RPC 函数 | 功能 | 参数 |
|----------|------|------|
| `dp_select(p_table)` | 查询表所有数据 | 表名 |
| `dp_get_by_id(p_table, p_id)` | 根据 ID 查询单条 | 表名, UUID |
| `dp_insert(p_table, p_data)` | 插入数据 | 表名, JSONB |
| `dp_update(p_table, p_id, p_data)` | 更新数据 | 表名, UUID, JSONB |
| `dp_delete(p_table, p_id)` | 删除数据 | 表名, UUID |

### API 调用方式

```typescript
// 查询
const { data, error } = await supabase.rpc('dp_select', { p_table: 'users' });
// 返回: jsonb 数组

// 插入
const { data, error } = await supabase.rpc('dp_insert', { 
  p_table: 'users', 
  p_data: { name: "张三", email: "test@example.com" } 
});

// 更新
const { data, error } = await supabase.rpc('dp_update', { 
  p_table: 'users', 
  p_id: 'uuid-here', 
  p_data: { name: "李四" } 
});

// 删除
const { data, error } = await supabase.rpc('dp_delete', { 
  p_table: 'users', 
  p_id: 'uuid-here' 
});
```

### 数据表 (design_public)

| 表名 | 说明 | 特殊字段类型 |
|------|------|-------------|
| users | 用户表 | - |
| projects | 项目表 | customer_info(jsonb), channel_info(jsonb), procurement_modules(_text) |
| project_types | 项目类型字典 | - |
| project_stages | 项目阶段字典 | - |
| member_role_types | 成员角色类型字典 | - |
| product_module_types | 采购/产品模块类型 | module_name, product_name, category, vendor, scope |
| product_categories | 产品类别 | - |
| product_vendors | 产品厂商 | - |
| product_scopes | 产品范围 | - |
| project_members | 项目成员表 | - |
| data_table_definitions | 数据表定义表 | columns_config(jsonb), apply_project_types(jsonb), apply_project_stages(jsonb) |
| todo_items | 待办事项表 | due_date(date) |
| issue_mgmt_issues | 问题上报主表 | status(varchar), is_major(bool) |
| issue_mgmt_issue_attachments | 问题附件表 | file_size(bigint) |
| issue_mgmt_issue_processing_records | 问题处理流水表 | action_type(varchar) |
| issue_mgmt_issue_notifications | 问题知会抄送表 | is_read(bool) |
| issue_mgmt_issue_categories | 问题类别字典 | parent_id(uuid自关联) |
| issue_mgmt_issue_urgency | 紧急程度字典 | - |
| issue_mgmt_issue_warranty_status | 保修情况字典 | - |
| project_module_types | 项目模块定义表 | icon, color, sort_order |
| project_type_stage_modules | 类型×阶段→模块关联 | project_type_code, project_stage_code, module_code (唯一约束) |
| todo_center_items | 待办中心-统一待办 | source_type(7种), priority, status, due_date |
| todo_center_cc | 待办中心-抄送知会 | is_read, is_ignored |
| todo_center_overdue_logs | 待办中心-逾期预警 | overdue_days |
| todo_task_defs | 待办任务-定义表 | assignee_ids(jsonb), project_ids(jsonb), periodic_config(jsonb), deadline_config(jsonb) |
| todo_task_instances | 待办任务-实例表 | definition_id(uuid FK), status(varchar), period_label(varchar), is_late(bool) |
| knowledge_categories | 知识分类标签 | category_type(varchar), icon, sort_order |
| knowledge_posts | 知识帖子/公告/资料主表 | post_type(varchar), share_type(varchar), is_pinned(bool), tags(_text), view/like/comment_count(int4) |
| knowledge_attachments | 知识附件表 | file_name, file_url, file_size(bigint), file_type, media_type(varchar), duration(int4?) |
| knowledge_reads | 阅读记录表 | post_id+user_id UNIQUE |
| knowledge_likes | 点赞/收藏表 | action_type(varchar: like/favorite), post_id+user_id+action_type UNIQUE |
| knowledge_comments | 评论表 | parent_id(uuid自关联) |
| case_center_config | 案例中心配置 | type(varchar), table_code(varchar), modules(jsonb), overview_metrics(jsonb) |
| user_sessions | 用户会话表 | token(varchar), expires_at(timestamptz) |
| project_member_permissions | 项目成员权限表 | project_id(uuid), user_id(uuid), permission_key(varchar) UNIQUE(project_id+user_id+permission_key) |

### RPC 函数类型自动处理

`dp_insert` 和 `dp_update` 会根据列的实际类型自动转换：
- `jsonb` → 直接传递
- `_text` (数组) → 从 JSON 数组自动转换
- `bool` → 自动布尔转换
- `int4` → 自动整数转换
- `uuid` → 自动 UUID 转换
- `date` → 自动日期转换
- 其他 → 文本处理

## 功能模块

### 1. 顶部 Dock 栏导航
- Mac 风格自动隐藏 Dock 栏
- 鼠标移动到顶部显示
- 图钉按钮可固定显示
- 元素科技品牌 Logo
- 包含用户信息显示和退出按钮

### 2. 待办事项
- 系统启动时弹出待办事项确认
- 支持新增、编辑、完成待办事项

### 3. 项目管理
- **模块**: 范围管理、进度管理、质量管理、成本管理、协同管理、沟通管理、风险管理、采购管理、资源管理、资料管理
- **功能**:
  - 新建项目（项目名称、编号、类型、阶段）
  - 项目成员管理（从系统设置-用户管理中选择）
  - 客户信息管理（公司名称、联系人、联系方式等）
  - 渠道信息管理
  - 采购模块配置（来源于基础数据-产品模块）
  - 项目类型/阶段/采购从基础数据实时获取
  - **项目详情页**：
    - 布局：顶部Tab模块切换 + 左侧统计 + 中间数据 + 右侧概览
    - 10个模块独立主题色（范围=蓝、进度=绿、质量=紫、成本=橙、协同=青、沟通=粉、风险=红、采购=琥珀、资源=靛蓝、资料=石板灰）
    - 8种数据视图：卡片/表格/网格/看板/树形/表单/甘特图/分组
    - 3种脉络追踪视图：色标脉络/进度条/瀑布图
      - 核心逻辑：按分组字段分组 → 按分支字段分出并行线 → 串联字段形成节点流 → 以最慢线算整体完成
      - 共享配置：分组字段(必选)、分支字段(必选)、主行字段(1-3个)、串联字段(可排序)
    - 视图配置（按表独立持久化到 localStorage）：
      - 看板：可选看板分组字段（select/radio/multiselect类型）
      - 分组：可选分组依据字段（select/radio/multiselect类型）
      - 甘特图：可选开始日期和结束日期字段（date类型）
      - 表格：可设置冻结列数和冻结行数
      - 树形：可选4级节点字段（一级根节点、二/三/四级子节点）
    - localStorage key: `project_detail_view_mode`, `project_detail_view_settings`, `project_detail_col_widths`

### 4. 规范管理
- 创建数据表定义
- 支持字段配置（名称、类型、必填、描述、选项、展示方式）
- 字段类型支持：文本、数字、日期、单选（下拉/单选框）、多选、多行文本、采购模块选择（数据来源：项目采购模块/系统产品模块，选择方式：单选/多选）
- 支持按项目类型和阶段应用
- 支持排序功能
- **同步到项目**：规范表定义或数据变更后，可将列结构和数据同步到已包含该表的项目 Schema
  - 同步模式：仅结构（添加新列）、仅数据（覆盖）、结构+数据
  - 支持全选和指定项目
  - API: `GET /api/standards/sync?tableCode=xxx` 获取项目列表，`POST /api/standards/sync` 执行同步

### 5. 系统设置
- **用户管理** - 用户维护、启用/禁用
- **角色权限** - 成员角色管理
- **基础数据维护**
  - 产品模块管理（支持 Excel 导入/导出、筛选、范围/类别/厂商维护）
  - 项目类型管理
  - 项目阶段管理
  - 成员角色管理
  - 模块管理（模块定义CRUD + 类型×阶段→模块启用矩阵配置）
  - 支持排序、启用/禁用
- **工单配置** - 问题类别/紧急程度/保修情况 CRUD
- **系统配置**

### 6. 待办中心
- 5大板块：今日待办/待办分类/抄送知会/已办办结/逾期预警
- 7种来源类型：任务(task)/工单(ticket)/审批(approval)/需求(requirement)/问题(issue)/公告(announcement)/知识(knowledge)
- 统一注册表(todo_center_items) + 抄送知会表(todo_center_cc) + 逾期预警日志(todo_center_overdue_logs)
- 与问题上报对接：创建问题时自动写入待办+抄送

### 6.1 待办任务
- 4大Tab：我的待办/我发起的/全部任务(上帝视角)/统计看板
- 发布任务4步向导：基本信息→选择表单→指派人员→截止提醒
- 两种任务类型：周期任务(自动生成实例)/普通任务(一次性)
- 表单来源4选1：关联规范表/项目里建表/导入Excel建表/不使用表单
- 指派方式：按项目指派(每项目一个实例)/指定人员
- 周期任务自动生成：按日/周/月/年自动创建新实例
- Excel导入建表：上传.xlsx/.xls，自动解析表头+推断类型，确认后创建规范表定义
- 统计看板：按人员/任务/项目的完成率排名
- 逾期提醒+允许补交
- 与待办中心衔接：任务实例写入 todo_center_items (source_type=task)
- API 路由：
  - `/api/todo-tasks/defs` (GET/POST) - 任务定义
  - `/api/todo-tasks/defs/[id]` (PUT/DELETE) - 更新/删除定义
  - `/api/todo-tasks/instances` (GET) - 任务实例列表
  - `/api/todo-tasks/instances/[id]` (PUT) - 更新实例状态
  - `/api/todo-tasks/parse-excel` (POST) - Excel解析
  - `/api/todo-tasks/stats` (GET) - 统计数据
  - `/api/todo-tasks/generate-periodic` (POST) - 触发周期实例生成
### 6. 数据看板
- 项目概览统计
- 任务进度追踪
- 预算使用情况

### 6.5 案例中心
- **首页**：产品案例 / 用户画像 两大卡片入口
- **产品案例**：跨 Schema 查询所有项目关联规范表数据，按映射字段渲染卡片网格
  - 卡片布局：封面图(上) + 标题 + 副标题 + 描述(截断) + 标签
  - 数据统计看板：总案例数/覆盖项目数 + 字段值分布图(柱状图/饼图) + 点击下钻筛选
  - 搜索/筛选功能
- **用户画像**：10大模块全方位展示学校全貌
  - 首页：以学校（项目）为卡片，展示所有项目
  - 详情页：左侧10模块导航 + 右侧自适应内容 + 顶部概览指标
  - 10大预设模块：学校基础信息/组织架构与科室/核心业务全景/信息化现状/我司产品使用情况/需求与痛点/关键联系人/二次销售线索/服务与巡检记录/项目推进计划
  - 每个模块：选择关联规范表 + 字段映射（列→显示名→渲染方式）+ 展示方式（卡片/表格/时间线/标签云）
  - 概览指标配置：总数/条件计数/百分比
  - 数据来源：项目自身 schema 中的规范表
- **系统设置 - 案例中心设置**：
  - 产品案例 Tab：选择关联规范表 + 字段映射 + 统计字段配置
  - 用户画像 Tab：概览指标配置 + 模块配置（添加/删除/排序/字段映射/展示方式）
  - 启用/禁用、排序
- **API 路由**：
  - `/api/case-center/config` (GET/POST) - 配置读取和保存(upsert by type, modules+overview_metrics)
  - `/api/case-center/product-cases` (GET) - 跨 Schema 产品案例卡片查询
  - `/api/case-center/product-stats` (GET) - 跨 Schema 聚合统计
  - `/api/case-center/user-profiles` (GET) - 用户画像学校列表（遍历所有项目+schema）
  - `/api/case-center/user-profile-detail` (POST) - 单项目用户画像全量数据（并行查各表+计算指标）

### 8. 信息广场
- **三大板块**：公告通知 / 共享资料 / 经验分享
- **公告通知**：管理员发布，支持置顶/已读追踪/评论，类型：通知公告/制度规范/版本更新/培训通知
- **共享资料**：分类标签(扁平) + 资料类型筛选(文档/视频/其他)，支持上传文件和视频在线播放
- **经验分享**：人人可发，支持点赞/收藏/评论，分享类型：实施经验/问题解决/最佳实践/工具推荐
- **视频支持**：mp4/avi/mov等格式，内嵌HTML5播放器
- **附件存储**：通过对象存储(S3)上传，下载使用预签名URL
- **与待办中心衔接**：发布重要公告自动写入 todo_center_items (source_type=knowledge)
- **API 路由**：
  - `/api/knowledge/categories` (GET/POST) - 分类列表/创建
  - `/api/knowledge/categories/[id]` (PUT/DELETE) - 更新/删除分类
  - `/api/knowledge/posts` (GET/POST) - 帖子列表/创建(支持post_type/category_id/author_id/keyword筛选)
  - `/api/knowledge/posts/[id]` (GET/PUT/DELETE) - 帖子详情(含附件+阅读数+评论)/更新/删除
  - `/api/knowledge/posts/[id]/read` (POST) - 标记已读
  - `/api/knowledge/posts/[id]/like` (POST) - 点赞/取消点赞
  - `/api/knowledge/posts/[id]/favorite` (POST) - 收藏/取消收藏
  - `/api/knowledge/posts/[id]/comments` (GET/POST) - 评论列表/发表评论
  - `/api/knowledge/search` (GET) - 搜索(keyword+post_type+category_id)
  - `/api/knowledge/upload` (POST) - 上传附件(多文件FormData)
  - `/api/knowledge/download` (GET) - 下载附件(预签名URL)

### 7. 问题上报
- **5个Tab页**：我的上报、问题管理、待办中心、知会抄送、数据统计
- **发起问题**：标题/项目/报修人(自动带出电话部门)/处理人/告知对象(多选)/类别(父子层级)/产品模块/紧急程度/保修情况/重大问题/描述/附件/初次报修/同类历史/备注/期望处理时间
- **问题管理**：全部/待受理/处理中/已完结/已驳回/已关闭，按部门/类别/紧急程度/时间/处理人筛选
- **待办中心**：待办/已办/转交/撤回，基于 handler_id 和 processing_records 查询
- **知会抄送**：仅查看抄送给自己的工单，标记已读
- **数据统计**：总工单/待受理/处理中/已完结概览，状态分布条形图，类别统计，重大问题列表
- **状态流转**：pending→accepted→processing→completed/rejected→closed，支持转交/撤回/重新打开
- **API 路由**：
  - `/api/issues` (GET/POST) - 问题列表和创建
  - `/api/issues/[id]` (PUT/DELETE) - 更新和删除
  - `/api/issues/attachments` (GET/POST) - 附件
  - `/api/issues/records` (GET) - 处理流水
  - `/api/issues/notifications` (GET/PUT) - 知会抄送
  - `/api/issue-dicts/categories` (GET) - 问题类别
  - `/api/issue-dicts/urgency` (GET) - 紧急程度
  - `/api/issue-dicts/warranty` (GET) - 保修情况

### 9. 登录与权限
- **登录页面**：深色渐变背景 + 玻璃拟态卡片，支持用户名/密码登录，记住我(7天)
- **认证流程**：JWT Token + 数据库 Session 双重验证，Token存储在localStorage
- **全局角色**：super_admin(超级管理员) / sub_admin(子管理员) / user(普通用户)
- **项目级权限**：8项权限(project_edit/member_manage/module_manage/task_manage/issue_handle/issue_report/data_view/data_export)
- **修改密码**：TopDock用户菜单中可修改密码，支持首次登录强制修改
- **用户管理增强**：创建用户时设置密码和角色，管理员可重置密码(默认yuansu0718)
- **角色权限面板**：系统设置中按角色分组展示用户，支持角色变更
- **默认管理员**：super_admin/yuansu0718 (super_admin角色)
- **API 路由**：
  - `/api/auth/login` (POST) - 登录
  - `/api/auth/logout` (POST) - 退出登录
  - `/api/auth/me` (GET) - 获取当前用户
  - `/api/auth/change-password` (POST) - 修改密码
  - `/api/users` (GET/POST) - 用户列表/创建（创建时自动hash密码）
  - `/api/users/[id]` (GET/PUT/DELETE) - 用户详情/更新/删除
  - `/api/users/[id]/role` (PUT) - 修改用户角色（仅超级管理员）
  - `/api/users/[id]/reset-password` (POST) - 重置密码（仅管理员）
  - `/api/projects/[id]/members/[userId]/permissions` (GET/PUT) - 项目成员权限

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 代码检查
pnpm lint

# 类型检查
pnpm ts-check

# 构建
pnpm build
```

## 环境变量

| 变量名 | 说明 |
|--------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 项目 URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 匿名密钥 |
| SUPABASE_SERVICE_ROLE_KEY | Supabase 服务角色密钥 |
| JWT_SECRET | JWT 签名密钥（默认: project-management-secret-key-2026） |

## 认证与权限系统

### 全局角色

| 角色 | 说明 |
|------|------|
| super_admin | 超级管理员，拥有所有权限，可管理用户角色 |
| sub_admin | 子管理员，由超级管理员授权，可管理用户和基础数据 |
| user | 普通用户，可创建项目，项目内权限由管理员分配 |

### 项目级权限（8项）

| 权限键 | 说明 |
|--------|------|
| project_edit | 编辑项目基本信息 |
| member_manage | 成员管理 |
| module_manage | 模块管理 |
| task_manage | 任务管理 |
| issue_handle | 问题处理 |
| issue_report | 问题上报 |
| data_view | 数据查看 |
| data_export | 数据导出 |

### 认证流程

1. 用户登录 → POST /api/auth/login → 返回 JWT Token + 用户信息
2. 前端存储 Token 到 localStorage，每次请求通过 Authorization Header 携带
3. 服务端验证 Token 有效性 + 检查 user_sessions 表
4. 退出登录 → POST /api/auth/logout → 删除 session 记录

### 认证 API

- `/api/auth/login` (POST) - 登录（参数: username, password, remember）
- `/api/auth/logout` (POST) - 退出登录
- `/api/auth/me` (GET) - 获取当前用户信息
- `/api/auth/change-password` (POST) - 修改密码
- `/api/users/[id]/role` (PUT) - 修改用户角色（仅超级管理员）
- `/api/users/[id]/reset-password` (POST) - 重置用户密码（仅管理员）

### 默认账号

- 超级管理员: super_admin / yuansu0718
- 新建用户默认密码: yuansu0718

## 注意事项

1. 所有 API routes 通过 `supabase.rpc()` 调用 RPC 函数访问 design_public Schema
2. 组件使用 shadcn/ui 风格，前端通过 fetch API 调用后端路由
3. 类型严格模式已启用，禁止使用隐式 any 类型
4. 新增表只需在 design_public 中创建，无需修改 RPC 函数
5. RPC 函数会自动校验表名存在性，防止 SQL 注入
6. public Schema 中不存储任何业务表
