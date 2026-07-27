import { NextResponse } from "next/server";
import { getAISettings, saveAISettings, ensureAITables } from "@/lib/ai-settings";

export async function GET() {
  try {
    await ensureAITables();
    const settings = await getAISettings();
    if (!settings) {
      return NextResponse.json({ data: { configured: false } });
    }
    return NextResponse.json({
      data: {
        configured: true,
        maskedKey: settings.maskedKey,
        model: settings.model,
        baseUrl: settings.baseUrl,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await ensureAITables();
    const body = await request.json();
    const { api_key, model, base_url } = body;

    if (!api_key || !api_key.startsWith("sk-")) {
      return NextResponse.json({ error: "API Key 格式不正确，应以 sk- 开头" }, { status: 400 });
    }

    await saveAISettings({
      apiKey: api_key,
      model: model || "deepseek-v4-pro",
      baseUrl: base_url || "https://api.deepseek.com",
    });

    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
