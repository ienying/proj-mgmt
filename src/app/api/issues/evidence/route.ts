import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

function getStorageDir() {
  const cwd = process.cwd();
  return path.join(cwd, "data", "uploads", "issue-evidence");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "未选择文件" }, { status: 400 });
    }

    const allowedTypes = [
      "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
      "image/jpeg", "image/png", "image/gif", "image/webp",
    ];
    const allowedExts = [".mp4", ".webm", ".mov", ".avi", ".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(file.name).toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: "不支持的文件格式，仅支持视频(mp4/webm/mov/avi)和图片(jpg/png/gif/webp)" },
        { status: 400 }
      );
    }

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "文件大小超过500MB限制" }, { status: 400 });
    }

    const uploadDir = getStorageDir();
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-一-鿿]/g, "_");
    const fileName = `${timestamp}_${safeName}`;
    const filePath = path.join(uploadDir, fileName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const isVideo = file.type.startsWith("video/");
    const url = `/api/issues/evidence/${fileName}`;

    return NextResponse.json({
      data: {
        url,
        name: file.name,
        size: file.size,
        type: isVideo ? "video" : "image",
      },
    });
  } catch (error) {
    console.error("证据文件上传失败:", error);
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "缺少文件路径" }, { status: 400 });
    }

    const match = filePath.match(/^\/api\/issues\/evidence\/(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "无效的文件路径" }, { status: 400 });
    }

    const fileName = match[1];
    const uploadDir = getStorageDir();
    const fullPath = path.join(uploadDir, fileName);

    if (!fullPath.startsWith(path.resolve(uploadDir))) {
      return NextResponse.json({ error: "非法路径" }, { status: 400 });
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("证据文件删除失败:", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
