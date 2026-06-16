import { NextResponse } from "next/server";
import { testAIConnection, getAISettings, ensureAITables } from "@/lib/ai-settings";

export async function POST(request: Request) {
  try {
    await ensureAITables();
    const body = await request.json();
    const { api_key, base_url } = body;

    // 如果前端没传 key（已保存过），从数据库读取
    let key = api_key;
    if (!key) {
      const saved = await getAISettings();
      if (!saved) {
        return NextResponse.json({ error: "缺少 API Key，请先在输入框中填写" }, { status: 400 });
      }
      key = saved.apiKey;
    }

    const result = await testAIConnection(
      key,
      base_url || "https://api.deepseek.com"
    );

    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
