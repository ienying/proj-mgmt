import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

const VIDEO_DIR = path.join(process.cwd(), "data", "video-center", "videos");
const THUMB_DIR = path.join(process.cwd(), "data", "video-center", "thumbnails");

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const ALLOWED_EXTS = [".mp4", ".webm", ".mov", ".avi"];
const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const captureSecond = parseFloat(formData.get("capture_second") as string) || 2;

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

    // 生成缩略图：跳过开头 2 秒后取第一帧，避免黑屏
    let thumbnailPath = "";
    try {
      if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true });
      const thumbFile = storedName.replace(/\.[^.]+$/, ".jpg");
      const thumbFullPath = path.join(THUMB_DIR, thumbFile);
      execSync(`ffmpeg -ss ${captureSecond} -i "${filePath}" -vframes 1 -update 1 -q:v 5 "${thumbFullPath}" -y 2>/dev/null`, { timeout: 30000 });
      if (fs.existsSync(thumbFullPath)) thumbnailPath = thumbFile;
    } catch (e) {
      console.error("视频缩略图生成失败:", e instanceof Error ? e.message : e);
    }

    const url = `/api/video-center/download?file=${encodeURIComponent(storedName)}`;

    return NextResponse.json({
      data: {
        url,
        file_name: file.name,
        file_path: storedName,
        file_size: file.size,
        thumbnail: thumbnailPath || null,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("视频上传失败:", msg);
    return NextResponse.json({ error: `上传失败: ${msg}` }, { status: 500 });
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
