import { NextRequest, NextResponse } from "next/server";
import { S3Storage } from "coze-coding-dev-sdk";

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

// 根据文件 key 生成签名下载 URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "缺少文件 key 参数" }, { status: 400 });
    }

    const url = await storage.generatePresignedUrl({
      key,
      expireTime: 3600, // 1 小时
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
