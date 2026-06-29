import { NextRequest, NextResponse } from "next/server";
import { S3Storage } from "coze-coding-dev-sdk";
import { existsSync } from "fs";
import path from "path";

const useS3 = !!process.env.COZE_BUCKET_NAME && !!process.env.COZE_BUCKET_ENDPOINT_URL;

const storage = useS3 ? new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
}) : null;

// 根据文件 key 生成下载 URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "缺少文件 key 参数" }, { status: 400 });
    }

    // 本地文件：直接返回访问 URL
    if (key.startsWith("uploads/")) {
      const filePath = path.join(process.cwd(), "public", key);
      if (!existsSync(filePath)) {
        return NextResponse.json({ error: "文件不存在" }, { status: 404 });
      }
      return NextResponse.json({ url: `/${key}` });
    }

    // S3 文件：生成签名 URL
    if (!useS3 || !storage) {
      return NextResponse.json(
        { error: "对象存储未配置，无法访问远程文件" },
        { status: 500 }
      );
    }

    const url = await storage.generatePresignedUrl({
      key,
      expireTime: 3600,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("生成下载 URL 失败:", error);
    return NextResponse.json(
      { error: "生成下载链接失败" },
      { status: 500 }
    );
  }
}

// 删除文件
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "缺少文件 key 参数" }, { status: 400 });
    }

    // 本地文件：直接删除
    if (key.startsWith("uploads/")) {
      const filePath = path.join(process.cwd(), "public", key);
      if (existsSync(filePath)) {
        const { unlinkSync } = require("fs");
        unlinkSync(filePath);
      }
      return NextResponse.json({ success: true });
    }

    // S3 文件
    if (!useS3 || !storage) {
      return NextResponse.json({ error: "对象存储未配置" }, { status: 500 });
    }

    await storage.deleteFile({ fileKey: key });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("文件删除失败:", error);
    return NextResponse.json(
      { error: "文件删除失败" },
      { status: 500 }
    );
  }
}
