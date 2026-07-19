import { NextResponse } from "next/server";
import { getFileStream, resolveFilePath, fileExists, getFileSize } from "@/storage/local-filesystem";
import { createServerClient } from "@/storage/database/pg-client";
import path from "path";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("file_path");
    const attachmentId = searchParams.get("attachment_id");
    const postId = searchParams.get("post_id");
    const userId = searchParams.get("user_id");
    const userName = searchParams.get("user_name");
    const preview = searchParams.get("preview") === "true";

    if (!filePath) {
      return NextResponse.json({ error: "No file_path provided" }, { status: 400 });
    }

    if (!fileExists(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const client = await createServerClient();

    // Log download
    if (attachmentId && postId && !preview) {
      try {
        await client.rpc("dp_insert", {
          p_table: "design_info_square.knowledge_downloads",
          p_data: {
            attachment_id: attachmentId,
            post_id: postId,
            user_id: userId || null,
            user_name: userName || null,
          },
        });
      } catch { /* non-critical */ }
    }

    const stream = getFileStream(filePath);
    if (!stream) {
      return NextResponse.json({ error: "File not readable" }, { status: 404 });
    }

    // 优先使用数据库中的原始文件名
    let fileName = path.basename(filePath);
    if (attachmentId) {
      try {
        const { data: attData } = await client.rpc("dp_get_by_id", {
          p_table: "design_info_square.knowledge_attachments",
          p_id: attachmentId,
        });
        const att = attData as Record<string, unknown> | null;
        if (att?.file_name) {
          const originalName = String(att.file_name);
          const ext = path.extname(fileName);
          fileName = originalName.includes(".") ? originalName : originalName + ext;
        }
      } catch { /* 降级使用 filePath */ }
    }
    const size = await getFileSize(filePath);

    const ext = path.extname(filePath).toLowerCase();
    const inlineTypes = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const disposition = preview && inlineTypes.includes(ext) ? "inline" : "attachment";

    const mimeMap: Record<string, string> = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".zip": "application/zip",
      ".rar": "application/vnd.rar",
      ".7z": "application/x-7z-compressed",
      ".tar": "application/x-tar",
      ".gz": "application/gzip",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };

    const contentType = mimeMap[ext] || "application/octet-stream";

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Content-Length": String(size),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
