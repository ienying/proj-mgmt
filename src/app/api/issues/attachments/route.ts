import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { S3Storage } from "coze-coding-dev-sdk";
import fs from "fs";
import path from "path";

const useS3 = !!(process.env.COZE_BUCKET_NAME && process.env.COZE_BUCKET_ENDPOINT_URL);

const storage = useS3 ? new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
}) : null;

function getLocalDir() {
  const dir = path.join(process.cwd(), "public", "uploads", "issue-attachments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// GET /api/issues/attachments?issue_id=xxx
export async function GET(request: NextRequest) {
  try {
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get("issue_id");

    const { data, error } = await client.rpc("dp_select", {
      p_table: "issue_mgmt_issue_attachments",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let attachments = (data || []) as Record<string, unknown>[];
    if (issueId) {
      attachments = attachments.filter((a) => String(a.issue_id) === issueId);
    }

    // Generate presigned URLs for S3 files, or local URLs
    const enriched = await Promise.all(
      attachments.map(async (a) => {
        const fileKey = a.file_url as string;
        if (!fileKey) return { ...a, file_url_signed: "" };
        if (fileKey.startsWith("http") || fileKey.startsWith("/")) {
          return { ...a, file_url_signed: fileKey };
        }
        // S3 file (key without leading slash)
        if (useS3 && storage) {
          try {
            const url = await storage.generatePresignedUrl({ key: fileKey, expireTime: 86400 });
            return { ...a, file_url_signed: url };
          } catch {
            return { ...a, file_url_signed: "" };
          }
        }
        // Local file
        return { ...a, file_url_signed: `/uploads/issue-attachments/${encodeURIComponent(fileKey)}` };
      })
    );

    return NextResponse.json({ data: enriched });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/issues/attachments - 上传附件（FormData）
export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const issueId = formData.get("issue_id") as string;
    const fileType = (formData.get("file_type") as string) || "image";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = file.name.replace(/[^a-zA-Z0-9._一-鿿-]/g, "_") || "file";
    const timestamp = Date.now();
    let fileKey = "";
    let signedUrl = "";

    if (useS3 && storage) {
      // S3 upload
      const fileName = `issue-attachments/${timestamp}_${safeName}`;
      fileKey = await storage.uploadFile({
        fileContent: buffer,
        fileName,
        contentType: file.type || "application/octet-stream",
      });
      signedUrl = await storage.generatePresignedUrl({ key: fileKey, expireTime: 86400 });
    } else {
      // Local disk fallback
      const localDir = getLocalDir();
      const fileName = `${timestamp}_${safeName}`;
      const filePath = path.join(localDir, fileName);
      fs.writeFileSync(filePath, buffer);
      fileKey = fileName;
      signedUrl = `/uploads/issue-attachments/${encodeURIComponent(fileName)}`;
    }

    // Insert attachment record
    const { data, error } = await client.rpc("dp_insert", {
      p_table: "issue_mgmt_issue_attachments",
      p_data: {
        issue_id: issueId,
        file_type: fileType,
        file_url: fileKey,
        file_name: file.name,
        file_size: file.size,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: { ...(typeof data === "object" && data !== null ? data : {}), file_url_signed: signedUrl },
      success: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
