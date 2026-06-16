import { createServerClient } from "@/storage/database/pg-client";
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from "crypto";
import { logAIUsage } from "@/lib/ai-usage-logger";

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

// 确保 ai_settings / ai_usage_logs 表存在于 design_public schema
export async function ensureAITables() {
  const client = await createServerClient();

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
}

export async function getAISettings(): Promise<{
  apiKey: string;
  baseUrl: string;
  model: string;
  maskedKey: string;
} | null> {
  try {
    const client = await createServerClient();
    await ensureAITables();

    const { data } = await client.rpc("execute_sql", {
      p_sql: `SELECT * FROM design_public.ai_settings WHERE is_active = true ORDER BY created_at DESC LIMIT 1`,
    });
    const rows = (data as Record<string, unknown>[]) || [];
    const active = rows[0];
    if (!active) return null;

    const encryptedKey = String(active.api_key || "");
    let apiKey = "";
    try {
      apiKey = decrypt(encryptedKey);
    } catch {
      return null;
    }

    const raw = apiKey || "";
    const maskedKey = raw.length > 4 ? "****-****-" + raw.slice(-4) : "****";

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
  await ensureAITables();

  const encryptedKey = encrypt(params.apiKey);
  const baseUrl = params.baseUrl || "https://api.deepseek.com";
  const model = params.model || "deepseek-chat";

  // 查询已有记录
  const { data: existing } = await client.rpc("execute_sql", {
    p_sql: `SELECT id FROM design_public.ai_settings LIMIT 1`,
  });
  const rows = (existing as Record<string, unknown>[]) || [];

  if (rows.length > 0 && rows[0].id) {
    // 更新
    await client.rpc("execute_sql", {
      p_sql: `
        UPDATE design_public.ai_settings
        SET api_key = '${encryptedKey.replace(/'/g, "''")}',
            base_url = '${baseUrl.replace(/'/g, "''")}',
            model = '${model.replace(/'/g, "''")}',
            is_active = true,
            updated_at = NOW()
        WHERE id = '${String(rows[0].id).replace(/'/g, "''")}'
      `,
    });
  } else {
    // 插入
    await client.rpc("execute_sql", {
      p_sql: `
        INSERT INTO design_public.ai_settings (key_name, api_key, base_url, model, is_active)
        VALUES ('DeepSeek', '${encryptedKey.replace(/'/g, "''")}', '${baseUrl.replace(/'/g, "''")}', '${model.replace(/'/g, "''")}', true)
      `,
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

export { chatCompletion, logAIUsage };
