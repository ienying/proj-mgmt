# AI 功能迭代 — 开发需求清单 & 交互设计说明


> 全局规则：全平台共用一套 DeepSeek 大模型 Key，由管理员在系统设置配置，所有用户共享。

---

## 一、项目详情表格 — AI 数据分析

### 页面路径
- Docker → 项目管理 → 项目列表 → 点击项目 → 项目详情页
- 对应组件：[project-detail.tsx](src/components/project-detail.tsx)

### 功能说明
在项目详情页各模块数据表（表格、卡片、看板、树型、表单、甘特、分组）栏中新增「AI 分析」按钮，点击后自动读取当前项目数据库 Schema 下全部数据表结构和数据，发送给全局配置的大模型，分析结果在弹窗中展示。原有表格编辑、表单新增、视图切换功能完全保留。

### 开发清单

| # | 任务 | 位置 | 说明 |
|---|------|------|------|
| 1.1 | 新增「AI 分析」按钮 | `project-detail.tsx` 视图切换栏（renderViewModeSwitcher） | 在按钮组最右侧追加「AI 分析」按钮（Sparkles 图标 + 文字），teal 主题色。该栏在 表格 / 卡片 / 看板 / 树形 / 表单 / 甘特 / 分组 七种视图下均存在，确保用户在任意视图都可一键触发 AI 分析 |
| 1.2 | 后端 API：`POST /api/ai/analyze-project` | `src/app/api/ai/analyze-project/route.ts` | 接收 `projectSchema`，查询该 Schema 下所有表名、列定义、行数据（JSON），拼装 Prompt 调用全局大模型，返回分析结果 |
| 1.3 | 数据收集逻辑 | API 内 | 遍历 `information_schema.tables` 获取表清单 → 逐表 `SELECT *` → 组装为结构化 Prompt（含表名/列名/行数/前 N 条样本） |
| 1.4 | AI 分析结果弹窗 | `project-detail.tsx` 新增 Dialog | 弹窗标题"AI 数据分析"，内容区 Markdown 渲染，底部显示数据概览（表数/总行数/分析耗时），支持复制结果 |
| 1.5 | Loading 态 | 弹窗内 | 分析中显示骨架屏 + "正在读取 X 张表，共 Y 条数据，AI 分析中..." 进度文字 |
| 1.6 | 错误处理 | 弹窗内 | Key 未配置 → 提示"请先在系统设置配置 DeepSeek API Key"；超时 → 重试按钮；大模型返回异常 → 显示原始错误 |

### 交互流程（原型提示词）

> **按钮位置**：每个模块数据表顶部视图切换栏（`[表格] [卡片] [看板] [树形] [表单] [甘特] [分组]` 按钮组）最右侧，固定显示一个「AI 分析」按钮（Sparkles 图标 + 文字，teal 主题色），与视图按钮同一行。不随视图切换隐藏——用户在任意视图中均可触发。
>
> **弹窗顶部**：标题「AI 数据分析 · {当前模块名}」+ 数据概览条（"共扫描 12 张表 / 3,421 条数据"）。
>
> **弹窗中部（加载态）**：居中大号 Sparkles 动画图标，下方逐条显示「正在读取表 xxx_scope… ✓」「正在读取表 xxx_schedule… ✓」「正在调用 DeepSeek 分析… ⏳」。
>
> **弹窗中部（结果态）**：Markdown 渲染区域，展示大模型返回的结构化分析（数据概况 / 异常发现 / 趋势分析 / 建议）。底部悬浮操作栏含「复制结果」「重新分析」按钮。
>
> **错误态**：若全局 Key 未配置，显示空状态插图 +「AI 功能尚未配置，请联系管理员在 系统设置 > 大模型配置 中设置 DeepSeek API Key」+「前往配置」按钮跳转系统设置。
>
> 所有表读取在服务端完成，前端仅传 `projectSchema`，不暴露数据库结构。数据脱敏——仅发送列名、数据类型、非敏感统计值。
>
> **交互层级**：视图切换栏「AI 分析」按钮 → 全屏弹窗（z-50）→ 分析内 Loading → 结果展示。弹窗打开期间表格正常可操作，视图可自由切换。

---

## 二、案例中心用户画像 — AI 语音/文件录入

### 页面路径
- Docker → 案例中心 → 用户画像 Tab → 新建画像 / 编辑画像
- 对应组件：[customer-form.tsx](src/components/case-center/customer-form.tsx)

### 功能说明
在用户画像编辑区新增「AI 录入」入口，点击弹出 AI 录入弹窗。支持两种输入方式：
1. **浏览器录音**：启停控制 → 录音文件自动上传 → 大模型转文字 → 用户确认回填
2. **文件上传**：上传音频/PDF/PPT/Excel → 大模型解析转文字 → 用户确认回填

确认后的文字根据内容语义自动匹配到画像对应字段（科室业务描述、需求分析等）。

### 开发清单

| # | 任务 | 位置 | 说明 |
|---|------|------|------|
| 2.1 | 新增「AI 录入」按钮 | `customer-form.tsx` 各文本域旁 | 在需要大量文字输入的字段旁增加 Sparkles 图标按钮，点击打开 AI 录入弹窗；同时在表单顶部增加总入口按钮「AI 智能录入」 |
| 2.2 | AI 录入弹窗组件 | 新建 `src/components/case-center/ai-input-dialog.tsx` | 弹窗采用双卡片布局（语音录入卡 + 文件上传卡），下方公用确认文本区 + 字段映射选择 |
| 2.3 | 浏览器录音功能 | `ai-input-dialog.tsx` | 调用 `navigator.mediaDevices.getUserMedia({ audio: true })`，使用 MediaRecorder API 录制 → 停止后生成 WebM blob → 预览播放 + 上传 |
| 2.4 | 麦克风权限处理 | `ai-input-dialog.tsx` | 首次使用时浏览器弹出权限请求；拒绝后显示提示"请在浏览器设置中允许麦克风访问" + 指引链接 |
| 2.5 | 录音文件下载/上传 | `ai-input-dialog.tsx` | 录音完成后显示播放器 +「下载」按钮（`URL.createObjectURL`）+「上传转文字」按钮；也支持拖拽上传本地录音文件 |
| 2.6 | 文件上传（PDF/PPT/Excel/音频） | `ai-input-dialog.tsx` | 拖拽区域 + 文件选择，支持 .mp3/.wav/.webm/.m4a/.pdf/.ppt/.pptx/.xls/.xlsx，单文件 ≤ 50MB |
| 2.7 | 后端 API：`POST /api/ai/transcribe` | `src/app/api/ai/transcribe/route.ts` | 接收文件 → 判断类型 → 音频直接调 DeepSeek 语音转文字；文档先解析文本内容 → 若需总结则调大模型 |
| 2.8 | 后端 API：`POST /api/ai/speech-to-text` | `src/app/api/ai/speech-to-text/route.ts` | 仅处理音频转文字，调用 DeepSeek 语音服务 |
| 2.9 | 文字确认区 | `ai-input-dialog.tsx` | 大模型返回文字后展示在可编辑 Textarea 中，用户可手动修改、裁剪，点击「确认回填」按钮 |
| 2.10 | 智能字段匹配回填 | `ai-input-dialog.tsx` + 后端 | 确认文字后调用 `POST /api/ai/match-fields`，分析文字内容语义 → 建议匹配到画像字段（科室业务/需求描述/痛点等）→ 用户确认或手动调整映射 → 回填到表单 |
| 2.11 | 错误处理 | `ai-input-dialog.tsx` | 录音权限拒绝 / 文件格式不支持 / 文件过大 / 转文字失败 / Key 未配置 → 各态均有对应提示 |

### 交互流程（原型提示词）

> **触发入口**：画像编辑表单每个长文本域右侧有 Sparkles 小图标按钮，表单顶部有主按钮「AI 智能录入」（带麦克风图标）。
>
> **弹窗结构（z-50 Dialog，宽 760px，高 85vh，overflow-y-auto）**：
>
> 弹窗内部采用**上下分区**布局，不使用 Tab。上方为两张并排卡片（语音录入 / 文件上传），下方为公用确认区。
>
> ---
>
> **上方 — 双卡片区（grid grid-cols-2 gap-4）**：
>
> **左卡片：🎤 语音录入**（圆角 border，bg-slate-50，p-5）：
> - 卡片标题行："🎤 语音录入" + 状态 Badge（未开始/录音中/已完成）
> - **未录音态**：居中大圆形麦克风按钮（64×64px，红底白图标，hover 加深），下方文字"点击开始录音"，底部小字提示"首次使用需授权麦克风权限"
> - **录音中态**：按钮变为红色脉冲动画（`animate-pulse` ring-red-400）+ 实时波形条 CSS 动画 + 计时器（`00:32`），下方「停止录音」按钮（outline 红色边框）
> - **录音完成态**：波形静止 + 时长标签，下方三个按钮横排：
>   -「▶ 播放」（outline，点击播放/暂停切换）
>   -「⬇ 下载录音」（ghost，`URL.createObjectURL` 触发下载 webm）
>   -「🚀 转文字」（主按钮，teal 色，点击触发 ASR）
> - **转文字中**：卡片内 Loading 旋转 + "正在识别语音..." 进度提示
> - **权限拒绝态**：卡片内橙色 Alert "麦克风权限未授权，请在浏览器设置中允许本网站使用麦克风" + 常见浏览器设置指引折叠面板
>
> **右卡片：📄 文件上传**（圆角 border，bg-slate-50，p-5）：
> - 卡片标题行："📄 文件上传" + 已选文件数 Badge
> - 拖拽区域（虚线边框，h-40，hover:border-teal-400 过渡）：
>   - 居中 Upload 图标 + "拖拽文件到此处"
>   - 副文字："或点击选择文件"
>   - 格式标签行：`MP3` `WAV` `M4A` `PDF` `PPT` `Excel`（小圆角 Badge）
> - 已选文件列表（拖拽区域下方，max-h-28 overflow-y-auto）：
>   - 每行：文件类型彩色图标 + 文件名（truncate）+ 文件大小 + ✕ 删除按钮
>   - 支持多文件
> - 「开始解析」按钮（文件列表下方，主按钮），点击后所有文件逐条解析
> - 解析中：每行文件 → 逐条显示 ✓/⏳/✗ 状态
> - 单文件 ≤ 50MB，超限 toast 提示
>
> ---
>
> **下方 — 公用确认区（border-t pt-4 mt-4）**：
>
> - 标题行："AI 识别结果" +「智能匹配字段」Toggle Switch
> - **文字确认区**：可编辑 Textarea（min-h-[180px]，border-slate-200），预填 AI 返回文字，用户可手动修改、裁剪
> - **字段映射区**（Switch 开启后展开，animate 下滑）：
>   - 表格形式，每行：左侧 AI 提取的关键句（text-sm text-slate-600 bg-slate-50 rounded px-2 py-1） → 箭头 → 右侧下拉选择目标画像字段
>   - 字段选项：科室名称、业务描述、需求痛点、使用模块、备注等
>   - 支持逐条 ✕ 忽略不需要的映射
> - **操作按钮行**（flex justify-end gap-2）：
>   -「放弃」按钮（ghost）
>   -「确认回填」按钮（主按钮，teal 色）
>
> ---
>
> **回填后**：弹窗关闭，表单对应字段自动填充，光标定位到第一个填充字段，右上角 toast "已回填 X 个字段"
>
> **权限提示**：若用户拒绝麦克风权限，左卡片内容替换为橙色警告 Alert，右卡片仍可正常使用文件上传功能——两种录入方式互不阻塞。

---

## 三、系统设置 — 大模型配置 & AI 使用排行榜

### 页面路径
- Docker → 设置 → 系统设置
- 对应组件：[system-settings.tsx](src/components/system-settings.tsx)

### 功能说明
在系统设置侧边菜单新增两项：
1. **大模型配置**：管理员输入 DeepSeek API Key，全局生效；同时可测试连接
2. **AI 使用统计**：全平台 AI 调用排行榜，按用户/功能/时间统计

### 开发清单

| # | 任务 | 位置 | 说明 |
|---|------|------|------|
| 3.1 | 新增菜单项「大模型配置」「AI 使用统计」 | `system-settings.tsx` menuItems 数组 | `{ id: "ai-config", label: "大模型配置", icon: Cpu }` 和 `{ id: "ai-stats", label: "AI 使用统计", icon: BarChart3 }` |
| 3.2 | 后端 API：`GET/PUT /api/ai/config` | `src/app/api/ai/config/route.ts` | GET 返回当前 Key（脱敏显示后 4 位）+ 模型名称；PUT 保存 Key → 写入 `ai_settings` 表 |
| 3.3 | 后端 API：`POST /api/ai/config/test` | `src/app/api/ai/config/test/route.ts` | 用当前 Key 调用 DeepSeek `/v1/models` 接口，返回连接状态 + 可用模型列表 |
| 3.4 | 大模型配置面板组件 | 新建 `src/components/ai-config-panel.tsx` | DeepSeek Key 输入框（password 类型，可切换明文） + 模型选择下拉 + 「测试连接」按钮 + 保存按钮 + 连接状态指示器 |
| 3.5 | Key 校验交互 | `ai-config-panel.tsx` | 输入失焦校验格式（sk- 开头）；测试连接成功 → 绿色「✓ 连接成功」+ 可用模型列表；失败 → 红色提示 + 错误信息 |
| 3.6 | 后端 API：`GET /api/ai/stats` | `src/app/api/ai/stats/route.ts` | 查询 `ai_usage_logs` 表，返回：按用户汇总（调用次数/Token数/功能分布）、按日期趋势（最近 30 天）、按功能类型分布 |
| 3.7 | AI 使用排行榜组件 | 新建 `src/components/ai-stats-panel.tsx` | 头部总览 KPI 卡片（总调用次数/总 Token/活跃用户数/本月调用），下方排行榜表格 + 趋势折线图 |
| 3.8 | 排行榜数据展示 | `ai-stats-panel.tsx` | 表格列：排名、用户名、所属部门、调用次数、总 Token、最近使用时间；默认按调用次数降序，支持按 Token 排序 |
| 3.9 | AI 调用日志中间件 | `src/lib/ai-usage-logger.ts` | 封装 `logAIUsage(userId, feature, tokens, model)` → 写入 `ai_usage_logs` 表，含 user_id/feature/tokens/model/created_at |
| 3.10 | 调用日志接入 | 各处 AI API | 在 transcribe、analyze-project、speech-to-text 等 API 中调用 logAIUsage |
| 3.11 | 数据库表 `ai_settings` | DDL | id, key_name, api_key(加密存储), base_url, model, is_active, created_at, updated_at |
| 3.12 | 数据库表 `ai_usage_logs` | DDL | id, user_id, user_name, feature, tokens_used, model, project_id(可选), created_at |

### 交互流程（原型提示词）

#### 3A. 大模型配置页

> **页面位置**：系统设置 → 左侧菜单新增「大模型配置」（Cpu 图标），点击进入。
>
> **页面布局**（单列居中，max-w-2xl）：
>
> **区域一：API Key 配置**
> - 标题「DeepSeek API Key」，描述文字"全平台共用一套密钥，配置后立即生效"
> - 输入框（password 类型，右侧 👁 切换明文），placeholder「sk-xxxxxxxx」
> - 输入框右侧「测试连接」按钮（outline 样式）
> - 连接状态：测试中显示「⏳ 检测中...」；成功显示绿底「✓ 连接成功，可用模型：deepseek-chat, deepseek-reasoner」；失败显示红底「✗ 连接失败：Invalid API Key」
>
> **区域二：模型选择**
> - 下拉选择当前使用的模型（deepseek-chat / deepseek-reasoner）
> - 描述文字说明各模型适用场景
>
> **区域三：语音服务状态**
> - 若 Key 支持语音服务，显示绿色「✓ 语音服务已就绪」
> - 若不支持，显示黄色「⚠ 当前 Key 未开通语音服务，录音转文字功能将不可用」
>
> **底部**：「保存配置」主按钮 + 「重置」按钮
> - 保存成功 toast "配置已保存"
>
> **安全设计**：Key 在数据库中使用 AES 加密存储，前端仅展示后 4 位（如 `****-****-xxxx`），接口返回脱敏 Key。

#### 3B. AI 使用排行榜

> **页面位置**：系统设置 → 左侧菜单新增「AI 使用统计」（BarChart3 图标），点击进入。
>
> **页面布局**（全宽）：
>
> **顶部 KPI 卡片行**（4 张卡片，各配图标和彩色渐变背景）：
> - 总调用次数：`12,847` + 副标题"较上月 ↑23%"
> - 总 Token 消耗：`8.4M` + 副标题"≈ ¥42.00"
> - 活跃用户数：`47` + 副标题"本周"
> - 本月新增：`+156` + 副标题"调用量"
>
> **中部趋势图**：
> - 30 天折线图（Recharts LineChart），X 轴日期，Y 轴调用量，两条线：语音转文字 / 数据分析
>
> **底部排行榜表格**（全宽 Table）：
> | 排名 | 用户 | 部门 | 调用次数 | Token 消耗 | 功能分布 | 最近使用 |
> |------|------|------|----------|-----------|----------|----------|
> | 🥇 1 | 张三 | 项目部 | 1,234 | 890K | 数据分析 60% / 语音 40% | 5 分钟前 |
>
> - 排名前三用 🥇🥈🥉 图标，其余数字
> - 点击用户行可展开查看该用户 30 天使用趋势迷你图
> - 表格支持按调用次数/Token 消耗切换排序
>
> **功能分布饼图**（表格右侧或下方）：
> - 环形图（Recharts PieChart）：项目数据分析 / 语音转文字 / 文件解析 / 字段匹配 四项占比
>
> **交互层级**：系统设置 → 左侧菜单（导航）→ 右侧内容（平滑切换，懒加载）。两个新面板均使用 `visitedMenus` 机制防止重复挂载。

---

## 四、全局架构约束

| 约束 | 说明 |
|------|------|
| API Key 存储 | `ai_settings` 表，AES-256-GCM 加密，仅管理员可读写 |
| Key 使用模式 | 全平台单 Key，所有 AI API 从 `ai_settings` 读取 |
| 语音服务 | DeepSeek 语音转文字 API（若提供），否则降级为通用 ASR |
| 调用日志 | 中间件统一记录，异步写入不阻塞主流程 |
| Token 计费 | 按 DeepSeek 官方定价估算，仅作展示参考 |
| 数据安全 | 发往大模型的数据仅含列名/统计值/样本数据，自动过滤手机号/身份证等敏感字段 |
| 前端 Loading | 所有 AI 调用统一 > 2s 展示 Loading 态，> 30s 展示超时重试 |
