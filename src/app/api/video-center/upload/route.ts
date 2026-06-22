import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const VIDEO_DIR = path.join(process.cwd(), "data", "video-center", "videos");

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const ALLOWED_EXTS = [".mp4", ".webm", ".mov", ".avi"];
const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: "不支持的视频格式，仅支持 mp4/webm/mov/avi" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "文件大小超过2GB限制" }, { status: 400 });
    }

    if (!fs.existsSync(VIDEO_DIR)) {
      fs.mkdirSync(VIDEO_DIR, { recursive: true });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-一-鿿]/g, "_");
    const storedName = `${timestamp}_${safeName}`;
    const filePath = path.join(VIDEO_DIR, storedName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const url = `/api/video-center/download?file=${encodeURIComponent(storedName)}`;

    return NextResponse.json({
      data: {
        url,
        file_name: file.name,
        file_path: storedName,
        file_size: file.size,
      },
    });
  } catch (error) {
    console.error("视频上传失败:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}
