import { NextResponse } from "next/server";
import { testAIConnection, ensureAITables } from "@/lib/ai-settings";

export async function POST(request: Request) {
  try {
    await ensureAITables();
    const body = await request.json();
    const { api_key, base_url } = body;

    if (!api_key) {
      return NextResponse.json({ error: "缺少 API Key" }, { status: 400 });
    }

    const result = await testAIConnection(
      api_key,
      base_url || "https://api.deepseek.com"
    );

    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
