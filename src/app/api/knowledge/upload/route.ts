import { NextResponse } from "next/server";
import { saveFile } from "@/storage/local-filesystem";

const ALLOWED_EXTENSIONS = [
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".pdf",
  ".zip", ".rar", ".7z", ".tar", ".gz",
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".txt", ".csv", ".md",
  ".mp4", ".webm", ".mov", ".avi", ".mkv",
];

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const categoryType = (formData.get("category_type") as string) || "tech_doc";

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results = [];

    for (const file of files) {
      const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          { error: `不支持的文件类型: ${ext}` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `文件 ${file.name} 超过 50MB 限制` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await saveFile(buffer, file.name, categoryType);

      results.push({
        file_name: result.file_name,
        file_path: result.file_path,
        file_size: result.file_size,
        mime_type: result.mime_type,
        file_type: ext.replace(".", ""),
      });
    }

    return NextResponse.json({ data: results.length === 1 ? results[0] : results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
