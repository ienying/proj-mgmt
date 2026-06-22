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

// DELETE: cleanup orphaned files (e.g. video uploaded but DB record creation failed)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("file");

    if (!fileName) {
      return NextResponse.json({ error: "缺少文件名" }, { status: 400 });
    }

    const fullPath = path.join(VIDEO_DIR, path.basename(fileName));
    if (!fullPath.startsWith(path.resolve(VIDEO_DIR))) {
      return NextResponse.json({ error: "非法路径" }, { status: 403 });
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("清理文件失败:", error);
    return NextResponse.json({ error: "清理失败" }, { status: 500 });
  }
}
