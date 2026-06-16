import { createServerClient } from "@/storage/database/pg-client";
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from "crypto";

const CRYPTO_PASSWORD = process.env.AI_ENCRYPTION_KEY || "change-me-32-bytes-secret-key!!";
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  return pbkdf2Sync(CRYPTO_PASSWORD, "ai-settings-salt", 100000, 32, "sha256");
}

function encrypt(text: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

function decrypt(text: string): string {
  const key = getKey();
  const combined = Buffer.from(text, "base64");
  const iv = combined.subarray(0, 12);
  const tag = combined.subarray(12, 28);
  const encrypted = combined.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

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

    const encryptedKey = String(active.api_key || "");
    let apiKey = "";
    try {
      apiKey = decrypt(encryptedKey);
    } catch {
      // 解密失败，可能 key 损坏或加密方式变更，返回空
      return null;
    }
    const raw = apiKey || "";
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

  const encryptedKey = encrypt(params.apiKey);

  // 先查是否有已有记录
  const { data: existing } = await client.rpc("dp_select", {
    p_table: "ai_settings",
  });
  const rows = (existing as Record<string, unknown>[]) || [];

  if (rows.length > 0) {
    await client.rpc("dp_update", {
      p_table: "ai_settings",
      p_id: rows[0].id,
      p_data: {
        api_key: encryptedKey,
        base_url: params.baseUrl || "https://api.deepseek.com",
        model: params.model || "deepseek-chat",
        is_active: true,
      },
    });
  } else {
    await client.rpc("dp_insert", {
      p_table: "ai_settings",
      p_data: {
        key_name: "DeepSeek",
        api_key: encryptedKey,
        base_url: params.baseUrl || "https://api.deepseek.com",
        model: params.model || "deepseek-chat",
        is_active: true,
      },
    });
  }
}

export async function testAIConnection(apiKey: string, baseUrl: string): Promise<{ ok: boolean; models: string[]; error: string }> {
  try {
    const res = await fetch(`${baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, models: [], error: `HTTP ${res.status}: ${err.slice(0, 200)}` };
    }
    const json = await res.json();
    const models = (json.data || []).map((m: { id: string }) => m.id);
    return { ok: true, models, error: "" };
  } catch (e) {
    return { ok: false, models: [], error: String(e) };
  }
}

export async function ensureAITables() {
  const client = await createServerClient();

  // 获取 search_path 中的默认 schema
  const { data: schemaResult } = await client.rpc("execute_sql", {
    p_sql: `SELECT current_schema() AS schema_name`,
  });
  const schemaName =
    ((schemaResult as Array<{ schema_name: string }>)?.[0]?.schema_name) ||
    "design_public";

  await client.rpc("execute_sql", {
    p_sql: `
      CREATE TABLE IF NOT EXISTS ${schemaName}.ai_settings (
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

  await client.rpc("execute_sql", {
    p_sql: `
      CREATE TABLE IF NOT EXISTS ${schemaName}.ai_usage_logs (
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
}

async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  options?: { model?: string; maxTokens?: number }
) {
  const settings = await getAISettings();
  if (!settings) throw new Error("API Key 未配置");

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
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`DeepSeek API error: ${res.status} ${err.slice(0, 300)}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content || "";
  const tokens = json.usage?.total_tokens || 0;
  return { content, tokens };
}

export { chatCompletion };
