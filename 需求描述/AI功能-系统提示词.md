# AI 功能 — 系统提示词

> 本文档根据现有代码实现反向梳理，可作为在其他项目中复刻该功能的提示词。

---

# 角色
你是一个全栈开发专家，精通 Next.js + React + TypeScript + PostgreSQL 技术栈，同时具备 AI/LLM 应用集成经验。

# 任务
为项目管理系统实现全平台 AI 功能，包括：项目数据分析、语音/文件智能录入、大模型配置管理、AI 使用统计、AI Prompt 模板系统。

---

## 一、全局架构

### 1.1 设计原则

- 全平台共用一套 DeepSeek 大模型 Key，由管理员在系统设置配置，所有用户共享
- API Key 在数据库中使用 AES-256-GCM 加密存储，前端仅展示后 4 位
- 所有 AI 调用通过中间件统一记录日志，异步写入不阻塞主流程
- 发往大模型的数据自动过滤手机号/身份证等敏感字段，仅含列名/统计值/样本数据
- 所有 AI 调用 > 2s 展示 Loading 态，> 30s 展示超时重试

### 1.2 技术栈

- 大模型：DeepSeek API（deepseek-chat / deepseek-reasoner）
- 语音转文字：DeepSeek 语音服务（若提供），否则降级为浏览器 Web Speech API
- 浏览器录音：MediaRecorder API + WebM 格式

---

## 二、项目详情 AI 数据分析

### 2.1 功能位置

- Docker → 项目管理 → 项目列表 → 点击项目 → 项目详情页
- 对应组件：`src/components/project-detail.tsx`

### 2.2 触发入口

在项目详情页视图切换栏（表格/卡片/看板/树型/表单/甘特/分组 按钮组）最右侧追加「AI 分析」按钮：
- 图标：Sparkles + 文字，teal 主题色
- 不随视图切换隐藏，任意视图均可触发

点击 AI 分析按钮后，先弹出配置对话框（见第六章 Prompt 模板系统），用户可选择/编辑模板后再发起分析。

### 2.3 后端 API

**POST /api/ai/analyze-project**

接收参数：
- `projectSchema`：项目数据 Schema 名称
- `templateId`（可选）：使用指定 Prompt 模板
- `systemMessage`（可选）：覆盖模板的 system message
- `userPrompt`（可选）：覆盖模板的 user prompt

处理流程：
1. 查询 `information_schema.tables` 获取该 Schema 下所有表清单
2. 逐表 `SELECT *` 获取全量数据
3. 组装结构化 Prompt（含表名/列名/行数/前 N 条样本）
4. 从 `ai_settings` 读取全局 API Key
5. 调用 DeepSeek API，传入 system + user prompt
6. 返回分析结果（Markdown 格式）
7. 异步记录调用日志到 `ai_usage_logs`

### 2.4 AI 分析结果弹窗

- 标题："AI 数据分析 · {当前模块名}"
- 数据概览条："共扫描 X 张表 / Y 条数据"
- 内容区：Markdown 渲染（大模型返回的结构化分析：数据概况/异常发现/趋势分析/建议）
- 底部悬浮操作栏：「复制结果」「重新分析」
- **加载态**：居中大号 Sparkles 动画图标 + 逐条进度文字（"正在读取表 xxx… ✓"）
- **错误态**：Key 未配置 → "AI 功能尚未配置，请联系管理员" +「前往配置」按钮；超时 → 重试按钮

### 2.5 交互层级

视图切换栏「AI 分析」按钮 → 配置对话框（模板选择/编辑）→ 发送分析 → Loading 态 → 结果展示。弹窗打开期间表格正常可操作，视图可自由切换。

---

## 三、案例中心 AI 语音/文件录入

### 3.1 功能位置

- Docker → 案例中心 → 用户画像 Tab → 新建/编辑画像
- 对应组件：`src/components/case-center/customer-form.tsx`

### 3.2 触发入口

- 表单顶部主按钮：「AI 智能录入」（麦克风图标）
- 每个长文本域右侧：Sparkles 小图标按钮

### 3.3 AI 录入弹窗组件

新建 `src/components/case-center/ai-input-dialog.tsx`，弹窗结构（宽 760px，高 85vh）：

**上方 — 双卡片区（grid grid-cols-2 gap-4）**：

**左卡片：语音录入**
- 未录音态：居中大圆形麦克风按钮（64×64px，红底白图标）+ "点击开始录音"
- 录音中态：按钮红色脉冲动画 + 实时波形条 CSS 动画 + 计时器（00:32）+「停止录音」按钮
- 录音完成态：波形静止 + 时长标签 +「播放」「下载录音」「转文字」按钮横排
- 转文字中：Loading 旋转 + "正在识别语音…"
- 权限拒绝态：橙色 Alert "麦克风权限未授权" + 浏览器设置指引折叠面板
- 技术实现：调用 `navigator.mediaDevices.getUserMedia({ audio: true })`，MediaRecorder API 录制 WebM blob

**右卡片：文件上传**
- 拖拽区域（虚线边框，hover:border-teal-400）+ 支持格式标签（MP3/WAV/M4A/PDF/PPT/Excel）
- 已选文件列表（文件类型图标 + 文件名 + 大小 + 删除按钮），支持多文件
- 单文件 ≤ 50MB，超限 toast 提示
-「开始解析」按钮，逐条解析显示 ✓/⏳/✗ 状态

**下方 — 公用确认区**：
- 「AI 识别结果」标题 +「智能匹配字段」Toggle Switch
- 可编辑 Textarea（min-h-[180px]），预填 AI 返回文字
- 字段映射区（Switch 开启后展开）：表格形式，左侧 AI 提取关键句 → 右侧下拉选择目标画像字段（科室名称/业务描述/需求痛点/使用模块/备注等）
- 操作按钮：「放弃」(ghost) +「确认回填」(teal 主按钮)
- 回填后：弹窗关闭，表单字段自动填充，toast "已回填 X 个字段"

### 3.4 后端 API

**POST /api/ai/transcribe**
- 接收文件 → 判断类型 → 音频调 DeepSeek 语音转文字；文档先解析文本内容

**POST /api/ai/speech-to-text**
- 仅处理音频转文字

**POST /api/ai/match-fields**
- 分析文字内容语义 → 建议匹配到画像字段 → 返回映射建议

---

## 四、系统设置 — 大模型配置

### 4.1 功能位置

- Docker → 设置 → 系统设置 → 左侧菜单新增「大模型配置」(Cpu 图标)
- 对应组件：`src/components/ai-config-panel.tsx`

### 4.2 页面布局

单列居中（max-w-2xl），三个区域：

**区域一：API Key 配置**
- 标题「DeepSeek API Key」+ 描述"全平台共用一套密钥，配置后立即生效"
- 输入框（password 类型，右侧 👁 切换明文），placeholder「sk-xxxxxxxx」
- 「测试连接」按钮（outline），点击调用 `POST /api/ai/config/test`
- 连接状态：成功 → 绿底「✓ 连接成功，可用模型：deepseek-chat, deepseek-reasoner」；失败 → 红底错误信息

**区域二：模型选择**
- 下拉选择：deepseek-chat / deepseek-reasoner
- 描述文字说明各模型适用场景

**区域三：语音服务状态**
- Key 支持语音 → 绿色「✓ 语音服务已就绪」
- 不支持 → 黄色「⚠ 当前 Key 未开通语音服务，录音转文字功能将不可用」

**底部**：「保存配置」主按钮 +「重置」按钮

### 4.3 后端 API

**GET /api/ai/config** — 返回当前 Key（脱敏）+ 模型名称

**PUT /api/ai/config** — 保存 Key（AES 加密写入 `ai_settings`）

**POST /api/ai/config/test** — 用当前 Key 调用 DeepSeek `/v1/models`，返回连接状态 + 可用模型列表

---

## 五、系统设置 — AI 使用统计

### 5.1 功能位置

- Docker → 设置 → 系统设置 → 左侧菜单新增「AI 使用统计」(BarChart3 图标)
- 对应组件：`src/components/ai-stats-panel.tsx`

### 5.2 页面布局（全宽）

**顶部 KPI 卡片行**（4 张，彩色渐变背景）：
- 总调用次数 + 较上月变化百分比
- 总 Token 消耗 + 估算费用
- 活跃用户数（本周）
- 本月新增调用量

**中部趋势图**：
- 30 天折线图（Recharts LineChart），X 轴日期，Y 轴调用量
- 两条线：语音转文字 / 数据分析

**底部排行榜表格**（全宽 Table）：
| 排名 | 用户 | 部门 | 调用次数 | Token 消耗 | 功能分布 | 最近使用 |
- 排名前三使用 🥇🥈🥉 图标
- 点击用户行展开 30 天使用趋势迷你图
- 支持按调用次数/Token 消耗切换排序

**功能分布饼图**（表格右侧）：
- 环形图（Recharts PieChart）：项目数据分析/语音转文字/文件解析/字段匹配

### 5.3 后端 API

**GET /api/ai/stats**
- 查询 `ai_usage_logs` 表
- 返回：按用户汇总 + 按日期趋势（最近 30 天）+ 按功能类型分布

---

## 六、AI Prompt 模板系统

### 6.1 功能概述

点击 AI 分析按钮后，先弹出配置对话框，用户可选择/编辑 Prompt 模板后再发起分析。模板依据项目维度管理，所有有权限的人可以维护和删除自定义模板。

### 6.2 数据库表 `design_public.ai_prompt_templates`

```sql
CREATE TABLE IF NOT EXISTS design_public.ai_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_schema TEXT NOT NULL,          -- '' = 全局默认模板
  name TEXT NOT NULL,                    -- 模板名称
  prompt_type TEXT NOT NULL DEFAULT 'global',  -- 'global' | 'single_table'
  is_default BOOLEAN NOT NULL DEFAULT false,  -- 默认模板受保护，不可改/删
  system_message TEXT NOT NULL,          -- system role 提示词
  user_prompt TEXT NOT NULL,             -- user prompt，含变量占位符
  sort_order INTEGER DEFAULT 0,
  created_by TEXT DEFAULT 'system',
  created_by_name TEXT DEFAULT '系统',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.3 变量占位符

用户 prompt 中支持以下变量，服务端解析替换：

| 变量 | 含义 | 适用模式 |
|------|------|----------|
| `${projectName}` | 项目名称 | global + single_table |
| `${projectSchema}` | 内部 schema 标识 | global + single_table |
| `${tableName}` | 表显示名 | single_table |
| `${tableCode}` | 表代码 | single_table |
| `${moduleName}` | 当前模块 code | global |
| `${moduleHint}` | 模块分析提示词 | global + single_table |
| `${tableSummaries}` | 表结构+样本数据 JSON | global + single_table |
| `${totalRows}` | 总行数 | global |
| `${tableCount}` | 表数量 | global |
| `${baseRules}` | 基础规则（名称映射等） | global + single_table |

### 6.4 种子数据

2 条默认模板（is_default=true）：

| name | prompt_type | 说明 |
|------|-------------|------|
| 默认全局分析 | global | 全局项目数据 AI 分析 |
| 默认单表分析 | single_table | 单表数据 AI 分析 |

### 6.5 权限规则

| 操作 | 默认模板 | 自定义模板 |
|------|:---:|:---:|
| 查看 | ✅ 所有人 | ✅ 所有人 |
| 编辑 | ❌ | ✅ 任何有项目权限的人 |
| 删除 | ❌ | ✅ 任何有项目权限的人 |
| 新建 | — | ✅ 任何人 |

### 6.6 三道防线确保默认模板不可删除

| 层级 | 机制 |
|------|------|
| 前端 | `isDefaultSelected` 时删除按钮隐藏 |
| API | DELETE 检测 `is_default=true` 返回 403 |
| 数据库 | `deletePromptTemplate()` 抛异常 |

### 6.7 前端交互流程

```
点击 [AI 分析] 按钮
  → 打开配置对话框
  → 加载该项目 + 该模式下的模板列表
  → 默认选中"默认模板"（或上次使用的模板）
  → 显示：
      [模板下拉选择器]  [★ 设为默认]  [🗑 删除]  [💾 另存为]
      ┌─────────────────────────────┐
      │ System Message (可编辑)      │
      │ User Prompt (可编辑)         │
      │ 变量实时预览高亮              │
      │ [变量说明]                   │
      └─────────────────────────────┘
  → [发送分析]
```

### 6.8 API 设计

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/ai/prompt-templates?projectSchema=&promptType=` | 列出模板 |
| POST | `/api/ai/prompt-templates` | 新建模板 |
| PUT | `/api/ai/prompt-templates?id=` | 更新模板（默认模板 403） |
| DELETE | `/api/ai/prompt-templates?id=` | 删除模板（默认模板 403） |

### 6.9 改动波及

| 文件 | 改动 |
|------|------|
| `src/lib/ai-settings.ts` | 新增 `ensureAITables` 建表 + CRUD 函数 |
| `src/app/api/ai/prompt-templates/route.ts` | 新增 API |
| `src/app/api/ai/analyze-project/route.ts` | 支持 templateId/systemMessage/userPrompt |
| `src/components/project-detail.tsx` | AI 按钮 → 先弹配置对话框再发请求 |
| `src/components/ai-prompt-dialog.tsx` | 新文件 — 模板选择 + 编辑对话框 |

---

## 七、AI 调用日志中间件

### 7.1 日志记录函数

`src/lib/ai-usage-logger.ts`：

```typescript
logAIUsage(userId: string, feature: string, tokens: number, model: string)
```

异步写入 `ai_usage_logs` 表，不阻塞主流程。

### 7.2 接入点

在所有 AI API（analyze-project / transcribe / speech-to-text / match-fields）中调用 `logAIUsage`。

---

## 八、数据库设计

### 8.1 ai_settings

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| key_name | text | 密钥标识 |
| api_key | text | AES-256-GCM 加密存储 |
| base_url | text | API 地址 |
| model | text | 默认模型 |
| is_active | boolean | 是否启用 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 8.2 ai_usage_logs

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid PK | |
| user_id | uuid | 用户 ID |
| user_name | text | 用户名 |
| feature | text | 功能标识：analyze-project / transcribe / speech-to-text / match-fields |
| tokens_used | integer | Token 消耗量 |
| model | text | 使用的模型 |
| project_id | uuid | 关联项目（可选） |
| created_at | timestamptz | |

### 8.3 ai_prompt_templates

见第六章 6.2。

---

## 九、UI 设计规范

### 9.1 整体布局

```
┌─────────────────────────────────────────────────────────┐
│  Dock 导航栏                                             │
│  项目管理 │ 任务中心 │ 案例中心 │ 系统设置 │ ...          │
├─────────────────────────────────────────────────────────┤
│  系统设置 左侧菜单        │  右侧内容区                    │
│  ┌──────────────────┐   │  ┌────────────────────────┐   │
│  │ 基础数据          │   │  │                        │   │
│  │ 用户管理          │   │  │   大模型配置 /          │   │
│  │ 项目类型/阶段     │   │  │   AI 使用统计           │   │
│  │ 大模型配置  🆕    │   │  │                        │   │
│  │ AI 使用统计 🆕    │   │  │                        │   │
│  │ 信息广场分类      │   │  │                        │   │
│  └──────────────────┘   │  └────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 9.2 色彩体系

| 用途 | 颜色 | 色值 |
|------|------|------|
| AI 主色 | teal | `#14b8a6` |
| AI hover | teal dark | `#0d9488` |
| AI 浅底 | teal light | `#ccfbf1` |
| 成功/连接正常 | green | `#10b981` |
| 警告/语音不可用 | amber | `#f59e0b` |
| 错误/连接失败 | red | `#ef4444` |
| 加载中 | slate | `#64748b` |
| 代码/公式 | mono bg | `#f1f5f9` |

### 9.3 组件样式

**AI 分析按钮**：
```
┌──────────────┐
│ ✨ AI 分析   │  ← teal 色系, rounded-full, 与视图按钮同行
└──────────────┘
  bg-teal-50 hover:bg-teal-100 text-teal-600
  border border-teal-200
  h-8 px-4 text-sm font-medium
```

**AI 分析结果弹窗**：
```
┌────────────────────────────────────────────┐
│  AI 数据分析 · 范围管理          [✕]       │  ← header: border-b pb-3
│  共扫描 12 张表 / 3,421 条数据              │  ← 数据概览条: text-sm text-slate-500
├────────────────────────────────────────────┤
│                                            │
│  ## 数据概况                               │
│  ...Markdown 渲染...                       │  ← max-h-[60vh] overflow-y-auto
│                                            │
├────────────────────────────────────────────┤
│  [📋 复制结果]              [🔄 重新分析]   │  ← 底部操作栏: border-t pt-3
└────────────────────────────────────────────┘
  w-[720px] max-h-[85vh] rounded-xl
```

**Loading 态**：
```
┌────────────────────────────────────────────┐
│                                            │
│         ✨ (Sparkles 动画)                  │  ← 36px, teal-500, animate-bounce
│                                            │
│   正在读取表 yuansu_xxx_scope... ✓         │  ← text-sm text-slate-500
│   正在读取表 yuansu_xxx_schedule... ✓       │     逐条显示
│   正在调用 DeepSeek 分析... ⏳             │     已完成 ✓ 绿色
│                                            │     进行中 ⏳ 旋转动画
└────────────────────────────────────────────┘
```

**大模型配置页**：
```
┌──────────────────────────────────────────────────────┐
│  大模型配置                                           │
│                                                      │
│  ┌─ API Key 配置 ──────────────────────────────────┐ │
│  │ DeepSeek API Key                                 │ │
│  │ 全平台共用一套密钥，配置后立即生效                   │ │
│  │ ┌──────────────────────────────────┐ [测试连接]  │ │
│  │ │ sk-••••••••••                    │            │ │
│  │ └──────────────────────────────────┘            │ │
│  │ ✓ 连接成功，可用模型：deepseek-chat, ...         │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ 模型选择 ──────────────────────────────────────┐ │
│  │ [deepseek-chat ▾]                               │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ 语音服务状态 ──────────────────────────────────┐ │
│  │ ✓ 语音服务已就绪                                 │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [保存配置]  [重置]                                   │
└──────────────────────────────────────────────────────┘
```

**AI 使用统计页**：
```
┌──────────────────────────────────────────────────────┐
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│  │ 总调用次数 │ │ Token 消耗│ │ 活跃用户  │ │ 本月新增 ││
│  │  12,847   │ │   8.4M   │ │    47     │ │  +156   ││
│  │  ↑23%     │ │ ≈¥42.00  │ │   本周    │ │  调用量  ││
│  └──────────┘ └──────────┘ └──────────┘ └─────────┘│
│                                                      │
│  ┌─ 30天趋势图 ───────────────────────────────────┐ │
│  │  📈 Recharts LineChart                         │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─ 排行榜表格 ───────────────────────────────────┐ │
│  │  🥇 | 张三 | 项目部 | 1,234 | 890K | 数据分析  │ │
│  │  🥈 | 李四 | 技术部 | 890  | 560K | 语音转文字 │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**AI Prompt 模板对话框**：
```
┌──────────────────────────────────────────────────────┐
│  AI 分析配置                              [✕]       │
│  ┌────────────────────────────────────────────────┐ │
│  │ [默认全局分析 ▾]  [★] [🗑] [💾 另存为]         │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  System Message                                     │
│  ┌────────────────────────────────────────────────┐ │
│  │ 你是一个数据分析专家...                          │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  User Prompt                                        │
│  ┌────────────────────────────────────────────────┐ │
│  │ ${projectName} 项目包含 ${tableCount} 张表...   │ │
│  │ ${tableSummaries}                               │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  变量说明: ${projectName}=项目名称 ...               │
│                                                      │
│  [取消]                          [发送分析]          │
└──────────────────────────────────────────────────────┘
```

**AI 语音/文件录入弹窗**：
```
┌──────────────────────────────────────────────────────┐
│  AI 智能录入                              [✕]       │
│                                                      │
│  ┌─── 🎤 语音录入 ───┐  ┌─── 📄 文件上传 ───┐      │
│  │                   │  │                    │      │
│  │    (●) 大圆形     │  │  ┌──────────────┐ │      │
│  │    麦克风按钮      │  │  │  拖拽文件到   │ │      │
│  │    64×64px       │  │  │  此处上传     │ │      │
│  │   红底白图标      │  │  └──────────────┘ │      │
│  │                   │  │                    │      │
│  │  点击开始录音      │  │  MP3 WAV PDF PPT  │      │
│  └───────────────────┘  └────────────────────┘      │
│                                                      │
│  ┌─ AI 识别结果 ──────────────────────────────────┐ │
│  │ ┌────────────────────────────────────────────┐ │ │
│  │ │ (可编辑 Textarea)                           │ │ │
│  │ └────────────────────────────────────────────┘ │ │
│  │ [智能匹配字段 🔘]                               │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  [放弃]                              [确认回填]       │
└──────────────────────────────────────────────────────┘
  w-[760px] h-[85vh] overflow-y-auto
```

### 9.4 交互动效

| 元素 | 动效 | 时长 |
|------|------|------|
| AI 按钮 | hover: bg 加深 + scale 1.02 | 200ms |
| 麦克风录音中 | `animate-pulse` ring-red-400 | 循环 |
| 弹窗打开 | scale(0.95→1) + opacity(0→1) | 200ms |
| 加载进度 | 逐条文字滑入 (stagger 300ms) | 逐条 |
| 结果展示 | fadeIn 从下往上 | 300ms |
| 字段映射展开 | animate 下滑 + height auto | 300ms |
| 测试连接成功 | 绿色从无到有 fadeIn | 300ms |
| KPI 数字 | countUp 数字滚动动画 | 1.5s |

### 9.5 图标映射

| 功能 | Lucide 图标 | 颜色 |
|------|------------|------|
| AI 分析 | `Sparkles` | teal-500 |
| AI 语音 | `Mic` | red-500 |
| AI 录入 | `Wand2` | teal-500 |
| 大模型配置 | `Cpu` | slate-600 |
| AI 统计 | `BarChart3` | slate-600 |
| 测试连接 | `Zap` | amber-500 |
| 重新分析 | `RotateCw` | slate-500 |
| 复制结果 | `Copy` | slate-500 |

### 9.6 响应式

| 宽度 | 变化 |
|------|------|
| ≥1024px | AI 弹窗 720px 宽 |
| 640-1024px | AI 弹窗 90vw 宽，双卡片区变单列 |
| <640px | AI 弹窗全屏，录音按钮缩小至 48px |

### 9.7 通用规则

- AI 相关按钮统一使用 teal 色系（#14b8a6 附近）
- Sparkles 图标（Lucide `Sparkles`）作为 AI 功能通用标识
- 所有 AI 调用弹窗 z-50 层级
- Loading 态：骨架屏 + 逐条进度文字，超过 30s 展示重试
- 错误态：根据错误类型展示对应提示和操作按钮
- Markdown 渲染使用 `react-markdown` 或类似库
