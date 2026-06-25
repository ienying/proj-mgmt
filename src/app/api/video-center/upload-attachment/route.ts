import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { createServerClient } from "@/storage/database/pg-client";

const ATTACHMENT_DIR = path.join(process.cwd(), "data", "video-center", "attachments");

const ALLOWED_EXTS = [
  ".ppt", ".pptx", ".doc", ".docx", ".pdf", ".md",
  ".zip", ".rar", ".7z", ".tar", ".gz",
  ".xls", ".xlsx", ".txt", ".csv",
];
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const videoId = formData.get("video_id") as string | null;

    if (files.length === 0) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    if (!videoId) {
      return NextResponse.json({ error: "缺少视频ID" }, { status: 400 });
    }

    if (!fs.existsSync(ATTACHMENT_DIR)) {
      fs.mkdirSync(ATTACHMENT_DIR, { recursive: true });
    }

    const client = await createServerClient();
    const results = [];

    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        return NextResponse.json(
          { error: `不支持的文件类型: ${ext}` },
          { status: 400 }
        );
      }

      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `文件 ${file.name} 超过100MB限制` },
          { status: 400 }
        );
      }

      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._\-一-鿿]/g, "_");
      const storedName = `${timestamp}_${safeName}`;
      const filePath = path.join(ATTACHMENT_DIR, storedName);

      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      // Insert attachment record into DB
      const { data, error } = await client.rpc("dp_insert", {
        p_table: "video_center.attachments",
        p_data: {
          video_id: videoId,
          file_name: file.name,
          file_path: storedName,
          file_size: file.size,
          file_type: ext.replace(".", ""),
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      results.push(data);
    }

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error("附件上传失败:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
