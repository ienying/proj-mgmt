import { createServerClient } from "@/storage/database/pg-client";

// ==================== 表结构确保 ====================
export async function ensureAITables() {
  const client = await createServerClient();

  // 尝试创建 ai_settings 表（dp_select 在 design_public 中查找）
  try {
    await client.rpc("execute_sql", {
      p_sql: `
        CREATE TABLE IF NOT EXISTS design_public.ai_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key_name TEXT,
          api_key TEXT,
          base_url TEXT DEFAULT 'https://api.deepseek.com',
          model TEXT DEFAULT 'deepseek-chat',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `,
    });
  } catch { /* 表可能已存在 */ }

  // 尝试创建 ai_usage_logs 表
  try {
    await client.rpc("execute_sql", {
      p_sql: `
        CREATE TABLE IF NOT EXISTS design_public.ai_usage_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT,
          user_name TEXT,
          feature TEXT,
          tokens_used INTEGER DEFAULT 0,
          model TEXT DEFAULT 'deepseek-chat',
          project_id TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `,
    });
  } catch { /* 表可能已存在 */ }

  // 尝试创建 ai_prompt_templates 表
  try {
    await client.rpc("execute_sql", {
      p_sql: `
        CREATE TABLE IF NOT EXISTS design_public.ai_prompt_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_schema TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL,
          prompt_type TEXT NOT NULL DEFAULT 'global',
          is_default BOOLEAN NOT NULL DEFAULT false,
          system_message TEXT NOT NULL DEFAULT '',
          user_prompt TEXT NOT NULL DEFAULT '',
          sort_order INTEGER DEFAULT 0,
          created_by TEXT DEFAULT 'system',
          created_by_name TEXT DEFAULT '系统',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `,
    });
  } catch { /* 表可能已存在 */ }

  // 写入种子数据（先删旧的默认模板，再插入最新版本）
  const defaults = [
    {
      project_schema: "",
      name: "默认全局分析",
      prompt_type: "global",
      is_default: true,
      sort_order: 1,
      system_message: "你是一个项目管理数据分析专家，擅长从结构化数据中提炼洞察。使用中文回复，报告要具体、可操作。始终使用人类可读的项目名称和表名，绝不输出数据库内部标识符。",
      user_prompt: `你是一个项目管理数据分析专家。请分析项目【\${projectName}】的数据库内容，给出专业的分析报告。

\${baseRules}
\${moduleHint}
数据表数量: \${tableCount} | 总数据行数: \${totalRows}

各表结构与样本数据：
\${tableSummaries}

请按以下结构输出分析报告（Markdown，适当使用 📊📈⚠️✅🔴🟡🟢 等图标增强可读性）：

1. **📊 数据概览**：整体数据量、表关联关系
   - 用 \`\`\`mermaid 输出一张饼图（pie），展示各表数据量占比
2. **🔍 关键发现**：数据中值得关注的模式、异常或亮点（至少5条）
   - 如有数值对比，用 \`\`\`mermaid 输出柱状图（bar 或 xychart-beta）
3. **📈 趋势与建议**：基于数据给出项目管理建议
4. **🛡️ 数据质量**：缺失值、不一致或异常值情况

Mermaid 图表示例格式：
\`\`\`mermaid
pie showData
    title 各表数据分布
    "进度表" : 23
    "成本表" : 5
    "风险表" : 8
\`\`\``,
    },
    {
      project_schema: "",
      name: "默认单表分析",
      prompt_type: "single_table",
      is_default: true,
      sort_order: 2,
      system_message: "你是一个项目管理数据分析专家，擅长从结构化数据中提炼洞察。使用中文回复，报告要具体、可操作。始终使用人类可读的项目名称和表名，绝不输出数据库内部标识符。",
      user_prompt: `你是一个项目管理数据分析专家。请对项目【\${projectName}】中的【\${tableName}】表进行深入分析。

\${baseRules}
\${moduleHint}

数据：
\${tableSummaries}

请按以下结构输出分析报告（Markdown，适当使用 📊📈⚠️✅🔴🟡🟢 等图标增强可读性）：

1. **📊 数据概览**：该表的数据规模、字段结构概要
2. **🔍 关键发现**：数据中值得关注的模式、异常或亮点（至少3条）
   - 如有数值对比，用 \`\`\`mermaid 输出柱状图
3. **📈 \${moduleHintPrefix}**：基于数据分析给出具体管理建议
4. **🛡️ 数据质量**：缺失值、不一致或异常值情况`,
    },
  ];

  try {
    const { data } = await client.rpc("dp_select", { p_table: "ai_prompt_templates" });
    const rows = (data as Record<string, unknown>[]) || [];

    for (const d of defaults) {
      const oldDefault = rows.find(
        (r) => r.is_default === true && r.prompt_type === d.prompt_type && String(r.project_schema || "") === ""
      );
      if (oldDefault) {
        // 已有默认模板，覆盖更新确保内容是最新版
        await client.rpc("dp_update", {
          p_table: "ai_prompt_templates",
          p_id: oldDefault.id as string,
          p_data: {
            name: d.name,
            system_message: d.system_message,
            user_prompt: d.user_prompt,
            updated_at: new Date().toISOString(),
          },
        });
      } else {
        await client.rpc("dp_insert", { p_table: "ai_prompt_templates", p_data: d as any });
      }
    }
  } catch { /* 种子数据维护失败，降级使用已有模板 */ }
}

// ==================== 提示词模板 CRUD ====================
export async function getPromptTemplates(params: { projectSchema: string; promptType?: string }) {
  const client = await createServerClient();
  await ensureAITables();
  const { data } = await client.rpc("dp_select", { p_table: "ai_prompt_templates" });
  const rows = (data as Record<string, unknown>[]) || [];
  const matched = rows.filter((r) => {
    const ps = String(r.project_schema || "");
    return ps === params.projectSchema || ps === "";
  });
  if (params.promptType) {
    return matched.filter((r) => String(r.prompt_type) === params.promptType);
  }
  return matched;
}

export async function savePromptTemplate(params: {
  id?: string;
  project_schema: string;
  name: string;
  prompt_type: string;
  system_message: string;
  user_prompt: string;
  created_by?: string;
  created_by_name?: string;
}) {
  const client = await createServerClient();
  await ensureAITables();

  if (params.id) {
    const { data: existing } = await client.rpc("dp_select", { p_table: "ai_prompt_templates" });
    const rows = (existing as Record<string, unknown>[]) || [];
    const found = rows.find((r) => r.id === params.id);
    if (!found) throw new Error("模板不存在");
    if (found.is_default === true) throw new Error("默认模板不可编辑");

    await client.rpc("dp_update", {
      p_table: "ai_prompt_templates",
      p_id: params.id,
      p_data: {
        name: params.name,
        system_message: params.system_message,
        user_prompt: params.user_prompt,
        updated_at: new Date().toISOString(),
      },
    });
    return { id: params.id };
  }

  const result = await client.rpc("dp_insert", {
    p_table: "ai_prompt_templates",
    p_data: {
      project_schema: params.project_schema,
      name: params.name,
      prompt_type: params.prompt_type,
      is_default: false,
      system_message: params.system_message,
      user_prompt: params.user_prompt,
      sort_order: 10,
      created_by: params.created_by || "user",
      created_by_name: params.created_by_name || "当前用户",
    } as any,
  });
  const raw: any = result;
  const inserted = Array.isArray(raw?.data) ? raw.data[0] : raw?.data;
  const id = (inserted as any)?.id as string;
  return { id };
}

export async function deletePromptTemplate(id: string) {
  const client = await createServerClient();
  const { data: existing } = await client.rpc("dp_select", { p_table: "ai_prompt_templates" });
  const rows = (existing as Record<string, unknown>[]) || [];
  const found = rows.find((r) => r.id === id);
  if (!found) throw new Error("模板不存在");
  if (found.is_default === true) throw new Error("默认模板不可删除");

  await client.rpc("dp_delete", { p_table: "ai_prompt_templates", p_id: id });
}

// ==================== 配置读写 ====================
export async function getAISettings(): Promise<{
  apiKey: string;
  baseUrl: string;
  model: string;
  maskedKey: string;
} | null> {
  try {
    const client = await createServerClient();
    const { data } = await client.rpc("dp_select", {
      p_table: "ai_settings",
    });
    const rows = (data as Record<string, unknown>[]) || [];
    const active = rows.find((r) => r.is_active === true);
    if (!active) return null;

    const raw = String(active.api_key || "");
    const maskedKey =
      raw.length > 4 ? "****-****-" + raw.slice(-4) : "****";

    return {
      apiKey: raw,
      baseUrl: String(active.base_url || "https://api.deepseek.com"),
      model: String(active.model || "deepseek-chat"),
      maskedKey,
    };
  } catch {
    return null;
  }
}

export async function saveAISettings(params: {
  apiKey: string;
  baseUrl?: string;
  model?: string;
}) {
  const client = await createServerClient();

  // 先删后插，确保干净
  const { data: existing } = await client.rpc("dp_select", {
    p_table: "ai_settings",
  });
  const rows = (existing as Record<string, unknown>[]) || [];
  for (const row of rows) {
    await client.rpc("dp_delete", {
      p_table: "ai_settings",
      p_id: row.id as string,
    });
  }

  await client.rpc("dp_insert", {
    p_table: "ai_settings",
    p_data: {
      key_name: "DeepSeek",
      api_key: params.apiKey,
      base_url: params.baseUrl || "https://api.deepseek.com",
      model: params.model || "deepseek-chat",
      is_active: true,
    },
  });
}

// ==================== 连接测试 ====================
export async function testAIConnection(
  apiKey: string,
  baseUrl: string
): Promise<{ ok: boolean; models: string[]; error: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, models: [], error: `HTTP ${res.status}: ${err.slice(0, 300)}` };
    }
    const json = await res.json();
    const models = (json.data || []).map((m: { id: string }) => m.id);
    return { ok: true, models, error: "" };
  } catch (e) {
    return { ok: false, models: [], error: String(e) };
  }
}

// ==================== 大模型调用 ====================
export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: { model?: string; maxTokens?: number }
) {
  const settings = await getAISettings();
  if (!settings) throw new Error("API Key 未配置");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  const res = await fetch(`${settings.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: options?.model || settings.model,
      messages,
      max_tokens: options?.maxTokens || 4096,
      temperature: 0.3,
    }),
    signal: controller.signal,
  });
  clearTimeout(timer);

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error: ${res.status} ${err.slice(0, 300)}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || "";
  const tokens = json.usage?.total_tokens || 0;
  return { content, tokens };
}
