import { NextResponse } from "next/server";
import { getAISettings, ensureAITables } from "@/lib/ai-settings";
import { logAIUsage } from "@/lib/ai-usage-logger";

export async function POST(request: Request) {
  try {
    await ensureAITables();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("user_id") as string;
    const userName = formData.get("user_name") as string;

    if (!file) {
      return NextResponse.json({ error: "缺少音频文件" }, { status: 400 });
    }

    const settings = await getAISettings();
    if (!settings) {
      return NextResponse.json({ error: "API Key 未配置", code: "NO_KEY" }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await file.arrayBuffer());

    // 尝试调用 DeepSeek 语音转文字（如果 API 支持）
    // DeepSeek 官方目前主要通过 chat API 处理，语音转文字可尝试使用其文件上传接口
    // 降级方案：使用通用 whisper-like 接口或返回提示
    try {
      const formData2 = new FormData();
      formData2.append("file", new Blob([audioBuffer]), file.name || "audio.webm");
      formData2.append("model", "whisper-1");

      // 尝试 OpenAI 兼容的语音转文字端点
      const res = await fetch(`${settings.baseUrl}/v1/audio/transcriptions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: formData2,
        signal: AbortSignal.timeout(30000),
      });

      if (res.ok) {
        const json = await res.json();
        const text = json.text || "";

        if (userId) {
          logAIUsage({ userId, userName, feature: "speech-to-text", tokensUsed: Math.ceil(text.length / 4) });
        }

        return NextResponse.json({ data: { text } });
      }
    } catch {
      // 降级处理
    }

    // 降级：将音频转为 base64 传给大模型（仅支持短音频）
    const base64Audio = audioBuffer.toString("base64");
    const dataUrl = `data:${file.type || "audio/webm"};base64,${base64Audio}`;

    // 对于大多数大模型，直接传音频效果有限，提供明确提示
    return NextResponse.json({
      data: {
        text: "",
        warning: "当前 DeepSeek 服务暂不支持直接语音转文字。建议使用支持语音转文字的模型服务，或将录音下载后通过第三方工具转文字再粘贴到文本框中。",
      },
    });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("API Key 未配置")) {
      return NextResponse.json({ error: "API Key 未配置", code: "NO_KEY" }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
