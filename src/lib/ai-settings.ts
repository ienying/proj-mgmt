import { createServerClient } from "@/storage/database/pg-client";

const CRYPTO_KEY = process.env.AI_ENCRYPTION_KEY || "change-me-32-bytes-secret-key!!";

async function deriveKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(CRYPTO_KEY).slice(0, 32),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("ai-settings-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encrypt(text: string): Promise<string> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return Buffer.from(combined).toString("base64");
}

async function decrypt(text: string): Promise<string> {
  const key = await deriveKey();
  const combined = Buffer.from(text, "base64");
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(decrypted);
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
    const apiKey = await decrypt(encryptedKey);
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

  const encryptedKey = await encrypt(params.apiKey);

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
