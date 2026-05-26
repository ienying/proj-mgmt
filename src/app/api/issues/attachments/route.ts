import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { S3Storage } from "coze-coding-dev-sdk";

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

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

    // Generate presigned URLs for attachments
    const enriched = await Promise.all(
      attachments.map(async (a) => {
        const fileKey = a.file_url as string;
        if (fileKey && !fileKey.startsWith("http")) {
          try {
            const url = await storage.generatePresignedUrl({
              key: fileKey,
              expireTime: 86400,
            });
            return { ...a, file_url_signed: url };
          } catch {
            return { ...a, file_url_signed: "" };
          }
        }
        return { ...a, file_url_signed: fileKey };
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

    // Upload to object storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
    const fileName = `issue-attachments/${Date.now()}_${safeName}`;

    const fileKey = await storage.uploadFile({
      fileContent: buffer,
      fileName,
      contentType: file.type || "application/octet-stream",
    });

    // Insert attachment record
    const { data, error } = await client.rpc("dp_insert", {
      p_table: "issue_mgmt_issue_attachments",
      p_data: {
        issue_id: issueId,
        file_type: fileType,
        file_url: fileKey, // Store key, not URL
        file_name: file.name,
        file_size: file.size,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate signed URL for immediate access
    const signedUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 86400,
    });

    return NextResponse.json({
      data: { ...(typeof data === "object" && data !== null ? data : {}), file_url_signed: signedUrl },
      success: true,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
