import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const VIDEO_DIR = path.join(process.cwd(), "data", "video-center", "videos");
const ATTACHMENT_DIR = path.join(process.cwd(), "data", "video-center", "attachments");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file");   // video file name
    const att = searchParams.get("att");      // attachment file name
    const id = searchParams.get("id");        // video ID (to increment download count)

    let filePath: string;
    let baseDir: string;
    let fileName: string;

    if (file) {
      fileName = file;
      filePath = path.join(VIDEO_DIR, file);
      baseDir = VIDEO_DIR;
    } else if (att) {
      fileName = att;
      filePath = path.join(ATTACHMENT_DIR, att);
      baseDir = ATTACHMENT_DIR;
    } else {
      return NextResponse.json({ error: "缺少文件参数" }, { status: 400 });
    }

    // Security check
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(baseDir))) {
      return NextResponse.json({ error: "非法路径" }, { status: 403 });
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    // Increment download count if video ID provided
    if (id) {
      const { createServerClient } = await import("@/storage/database/pg-client");
      const client = await createServerClient();
      const { data: videoData } = await client.rpc("dp_get_by_id", {
        p_table: "video_center.videos",
        p_id: id,
      });
      if (videoData) {
        const v = videoData as Record<string, unknown>;
        await client.rpc("dp_update", {
          p_table: "video_center.videos",
          p_id: id,
          p_data: { download_count: ((v.download_count as number) || 0) + 1 },
        });
      }
    }

    const stat = fs.statSync(resolvedPath);
    const ext = path.extname(fileName).toLowerCase();

    const mimeMap: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".zip": "application/zip",
      ".rar": "application/vnd.rar",
      ".7z": "application/x-7z-compressed",
      ".tar": "application/x-tar",
      ".gz": "application/gzip",
      ".md": "text/markdown",
      ".txt": "text/plain",
      ".csv": "text/csv",
    };

    const contentType = mimeMap[ext] || "application/octet-stream";
    const isVideo = [".mp4", ".webm", ".mov", ".avi"].includes(ext);

    // Range support for video streaming
    const range = request.headers.get("range");

    if (range && isVideo) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      const buf = Buffer.alloc(chunkSize);
      const fd = fs.openSync(resolvedPath, "r");
      fs.readSync(fd, buf, 0, chunkSize, start);
      fs.closeSync(fd);

      return new NextResponse(buf, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
      });
    }

    const buffer = fs.readFileSync(resolvedPath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Length": String(stat.size),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Content-Disposition": isVideo
          ? `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`
          : `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    console.error("文件下载失败:", error);
    return NextResponse.json({ error: "下载失败" }, { status: 500 });
  }
}
