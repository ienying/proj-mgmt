# 项目管理系统

全栈项目协同管理平台，支持多项目全生命周期管理、任务协同、问题跟踪、知识沉淀与流程审批。

## 技术栈

- **框架**: Next.js 16 (App Router) + React 19
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS v4
- **数据库**: PostgreSQL + Drizzle ORM
- **认证**: Supabase Auth + JWT
- **存储**: AWS S3
- **包管理**: pnpm 9+
- **语言**: TypeScript 5

## 快速开始

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入数据库、Supabase、S3 等配置

# 启动开发服务器
pnpm dev
```

浏览器打开 [http://localhost:5000](http://localhost:5000)。

## 功能模块

### 项目管理
- 创建/编辑项目，配置项目成员与权限
- 自定义数据表（支持文本/数字/日期/下拉/文件等列类型）
- 项目记录增删改查，支持导入导出

### 任务管理
- **普通表单任务**: 自定义表单字段，指派人员填写提交
- **项目任务**: 关联项目拉取记录，添加补充列作为任务行
- **流程型任务**: 表单 + 项目数据 + 多级审批流转
- 支持一次性任务和周期性任务

### 任务看板
- 可视化看板构建器，拖拽式配置
- 支持按项目、模块筛选数据行

### 工作流设计器
- 多节点审批流程配置
- 支持转发、退回等流转操作

### 问题管理
- Issue 追踪，支持状态流转与指派

### 案例中心 & 知识库
- 案例沉淀与检索
- 文档/知识条目管理

### 标准管理
- 数据字典维护
- Schema 规则配置

## 项目结构

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API 路由
│   │   ├── auth/             # 认证
│   │   ├── projects/         # 项目 CRUD
│   │   ├── issues/           # 问题管理
│   │   ├── task-board/       # 任务看板
│   │   ├── workflow/         # 工作流
│   │   ├── knowledge/        # 知识库
│   │   ├── case-center/      # 案例中心
│   │   ├── standards/        # 标准管理
│   │   ├── dicts/            # 数据字典
│   │   └── files/            # 文件上传
│   └── (pages)/              # 页面路由
├── components/               # 业务组件
│   └── ui/                   # shadcn/ui 基础组件
├── lib/                      # 工具函数、数据库配置
└── hooks/                    # 自定义 Hooks
```

## 开发规范

1. 使用 **pnpm** 管理依赖
2. 优先使用 `src/components/ui/` 中的 shadcn 组件
3. 使用 `@/` 路径别名导入模块
4. 服务端/客户端组件遵循 Next.js App Router 规范
