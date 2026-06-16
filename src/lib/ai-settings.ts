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
