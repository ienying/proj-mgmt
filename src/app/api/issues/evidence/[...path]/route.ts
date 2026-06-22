import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

function getStorageDir() {
  const cwd = process.cwd();
  return path.join(cwd, "data", "uploads", "issue-evidence");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    if (pathSegments.length === 0) {
      return NextResponse.json({ error: "无效路径" }, { status: 400 });
    }

    const baseDir = getStorageDir();
    const filePath = path.join(baseDir, ...pathSegments);

    if (!filePath.startsWith(path.resolve(baseDir))) {
      return NextResponse.json({ error: "非法路径" }, { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = request.headers.get("range");
    const ext = path.extname(filePath).toLowerCase();

    const mimeMap: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };
    const contentType = mimeMap[ext] || "application/octet-stream";

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileHandle = fs.openSync(filePath, "r");
      const buffer = Buffer.alloc(chunkSize);
      fs.readSync(fileHandle, buffer, 0, chunkSize, start);
      fs.closeSync(fileHandle);

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": contentType,
        },
      });
    }

    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("证据文件读取失败:", error);
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }
}
