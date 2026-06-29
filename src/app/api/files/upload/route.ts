import { NextRequest, NextResponse } from "next/server";
import { S3Storage } from "coze-coding-dev-sdk";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

const useS3 = !!process.env.COZE_BUCKET_NAME && !!process.env.COZE_BUCKET_ENDPOINT_URL;

const storage = useS3
  ? new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: "",
      secretKey: "",
      bucketName: process.env.COZE_BUCKET_NAME,
      region: "cn-beijing",
    })
  : null;

// 文件类型对应的 MIME 和扩展名
const FILE_TYPE_CONFIG: Record<string, { accept: string; extensions: string[] }> = {
  attachment: {
    accept: ".doc,.docx,.xls,.xlsx,.ppt,.pptx,.pdf,.md,.markdown,.txt,.jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.ico,.zip,.rar,.7z,.tar,.gz",
    extensions: [".doc",".docx",".xls",".xlsx",".ppt",".pptx",".pdf",".md",".markdown",".txt",".jpg",".jpeg",".png",".gif",".bmp",".webp",".svg",".ico",".zip",".rar",".7z",".tar",".gz"],
  },
  office: { accept: ".doc,.docx,.xls,.xlsx,.ppt,.pptx", extensions: [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"] },
  pdf: { accept: ".pdf", extensions: [".pdf"] },
  md: { accept: ".md,.markdown,.txt", extensions: [".md", ".markdown", ".txt"] },
  image: { accept: ".jpg,.jpeg,.png,.gif,.bmp,.webp,.svg,.ico", extensions: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".ico"] },
  archive: { accept: ".zip,.rar,.7z,.tar,.gz,.bz2,.xz,.tar.gz,.tgz", extensions: [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".tar.gz", ".tgz"] },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileType = (formData.get("fileType") as string) || "attachment";
    const projectCode = (formData.get("projectCode") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "未提供文件" }, { status: 400 });
    }

    // 校验文件类型
    const config = FILE_TYPE_CONFIG[fileType];
    if (config) {
      const fileName = file.name.toLowerCase();
      const ext = fileName.substring(fileName.lastIndexOf("."));
      if (!config.extensions.includes(ext)) {
        return NextResponse.json({ error: `不支持的文件类型，仅允许: ${config.extensions.join(", ")}` }, { status: 400 });
      }
    }

    // 限制文件大小 (50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "文件大小不能超过 50MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let key: string;
    let url: string;

    if (useS3 && storage) {
      const prefix = projectCode ? `${projectCode}/` : "project-files/";
      key = await storage.uploadFile({
        fileContent: buffer,
        fileName: `${prefix}${file.name}`,
        contentType: file.type || "application/octet-stream",
      });
      url = await storage.generatePresignedUrl({ key, expireTime: 86400 });
    } else {
      // 本地存储兜底，按项目编号分目录
      const uploadDir = projectCode
        ? path.join(process.cwd(), "public", "uploads", projectCode)
        : path.join(process.cwd(), "public", "uploads");
      if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
      const timestamp = Date.now();
      const safeName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const filePath = path.join(uploadDir, safeName);
      writeFileSync(filePath, buffer);
      key = projectCode ? `uploads/${projectCode}/${safeName}` : `uploads/${safeName}`;
      url = `/${key}`;
    }

    return NextResponse.json({ key, name: file.name, size: file.size, url });
  } catch (error) {
    console.error("文件上传失败:", error);
    return NextResponse.json(
      { error: "文件上传失败: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
