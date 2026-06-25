import { NextResponse } from "next/server";
import { ensureAITables, chatCompletion } from "@/lib/ai-settings";
import { logAIUsage } from "@/lib/ai-usage-logger";

export async function POST(request: Request) {
  try {
    await ensureAITables();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("user_id") as string;
    const userName = formData.get("user_name") as string;

    if (!file) {
      return NextResponse.json({ error: "缺少文件" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = "";

    // 判断文件类型
    if (fileName.endsWith(".pdf")) {
      extractedText = await extractPDFText(buffer);
    } else if (fileName.endsWith(".ppt") || fileName.endsWith(".pptx")) {
      // PPT: 尝试提取文本，降级为提示
      extractedText = `[PPT 文件: ${file.name}]\n该文件类型暂不支持直接文本提取，已将文件内容以二进制形式读取。请通过语音或手动输入补充内容。`;
    } else if (fileName.endsWith(".xls") || fileName.endsWith(".xlsx")) {
      extractedText = `[Excel 文件: ${file.name}]\n该文件类型暂不支持直接文本提取，请将关键数据粘贴到文本框中，或使用语音输入补充。`;
    } else {
      // 音频文件或纯文本文件
      // 对于纯音频/文本文件，尝试作为文本读取
      try {
        extractedText = buffer.toString("utf-8");
        if (extractedText.length === 0 || /[\x00-\x08\x0E-\x1F]/.test(extractedText.slice(0, 50))) {
          extractedText = `[二进制/音频文件: ${file.name}]\n文件大小: ${(buffer.length / 1024).toFixed(1)}KB\n请使用语音转文字功能处理音频文件。`;
        }
      } catch {
        extractedText = `[文件: ${file.name}]\n无法直接提取文本内容。`;
      }
    }

    // 如果提取到了有效文本，用大模型整理
    if (extractedText.length > 50 && !extractedText.startsWith("[")) {
      const { content, tokens } = await chatCompletion([
        {
          role: "system",
          content: "你是一个文档整理助手。请将以下文档内容整理为清晰、连贯的文字，去除格式噪音，保留核心信息。",
        },
        { role: "user", content: `请整理以下文档内容：\n\n${extractedText.slice(0, 15000)}` },
      ]);

      logAIUsage({ userId: userId || "default", userName: userName || "当前用户", feature: "file-transcribe", tokensUsed: tokens });

      return NextResponse.json({ data: { text: content, tokens } });
    }

    // 文本太短或无法提取，直接返回
    logAIUsage({ userId: userId || "default", userName: userName || "当前用户", feature: "file-transcribe", tokensUsed: 0 });

    return NextResponse.json({ data: { text: extractedText, tokens: 0 } });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("API Key 未配置")) {
      return NextResponse.json({ error: "API Key 未配置", code: "NO_KEY" }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function extractPDFText(_buffer: Buffer): Promise<string> {
  // PDF 文本提取需要 pdf-parse 等库，此处提供降级方案
  return "[PDF 文件]\nPDF 文本提取需要额外的解析库支持。当前版本支持上传 PDF 文件，文本将以文件名方式标记。建议将关键文字内容粘贴到下方文本框。";
}
