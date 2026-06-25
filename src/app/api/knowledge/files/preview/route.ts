import { NextResponse } from "next/server";
import { getFileStream, resolveFilePath, fileExists } from "@/storage/local-filesystem";
import path from "path";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("file_path");
    if (!filePath) return NextResponse.json({ error: "No file_path" }, { status: 400 });

    if (!fileExists(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stream = getFileStream(filePath);
    if (!stream) return NextResponse.json({ error: "File not readable" }, { status: 404 });

    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".txt": "text/plain; charset=utf-8",
      ".md": "text/markdown; charset=utf-8",
    };

    const contentType = mimeMap[ext] || "application/octet-stream";
    const inline = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".txt", ".md"].includes(ext)
      ? "inline"
      : "attachment";

    const fullPath = resolveFilePath(filePath);
    const { stat } = await import("fs/promises");
    const fileStat = await stat(fullPath);

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${inline}; filename="${path.basename(filePath)}"`,
        "Content-Length": String(fileStat.size),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
