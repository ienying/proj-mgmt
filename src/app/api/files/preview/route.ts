import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "缺少 key" }, { status: 400 });
    }

    // 本地文件处理
    if (key.startsWith("uploads/")) {
      const filePath = path.join(process.cwd(), "public", key);
      if (!existsSync(filePath)) {
        return NextResponse.json({ error: "文件不存在" }, { status: 404 });
      }

      const ext = path.extname(key).toLowerCase();
      const buffer = readFileSync(filePath);

      // Excel → HTML 表格
      if ([".xls", ".xlsx", ".csv"].includes(ext)) {
        try {
          const workbook = XLSX.read(buffer, { type: "buffer" });
          const firstSheet = workbook.SheetNames[0];
          const html = XLSX.utils.sheet_to_html(workbook.Sheets[firstSheet], { id: "xlsx-table" });
          return new NextResponse(
            `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;font-size:13px;padding:16px;background:#fff;color:#333}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px 10px;text-align:left}th{background:#f5f5f5;font-weight:600}</style></head><body>${html}</body></html>`,
            { headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        } catch {
          return serveFile(buffer, ext, key);
        }
      }

      // Markdown/TXT → 文本
      if ([".md", ".markdown", ".txt"].includes(ext)) {
        const text = buffer.toString("utf-8");
        const html = text
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/\n/g, "<br>");
        return new NextResponse(
          `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:monospace;font-size:13px;padding:16px;background:#fff;color:#333;line-height:1.6;white-space:pre-wrap}</style></head><body>${html}</body></html>`,
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }

      // 其他类型直接返回文件
      return serveFile(buffer, ext, key);
    }

    return NextResponse.json({ error: "仅支持本地文件预览" }, { status: 400 });
  } catch (error) {
    console.error("预览失败:", error);
    return NextResponse.json({ error: "预览失败" }, { status: 500 });
  }
}

function serveFile(buffer: Buffer, ext: string, _key: string) {
  const mimeMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".mp4": "video/mp4", ".webm": "video/webm",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": mimeMap[ext] || "application/octet-stream", "Content-Disposition": "inline" },
  });
}
