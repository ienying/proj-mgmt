import { NextResponse } from "next/server";
import { saveFile } from "@/storage/local-filesystem";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = (body.url as string) || "";

    if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

    // Only allow http/https URLs
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return NextResponse.json({ error: "Invalid url scheme" }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; InfoSquare/1.0)",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) return NextResponse.json({ error: "Download failed: " + res.status }, { status: 502 });

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image: " + contentType }, { status: 400 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const ext = contentType.split("/")[1] || "png";
    const fileName = "proxy-" + Date.now() + "." + ext;

    const result = await saveFile(buffer, fileName, "tech_doc");

    return NextResponse.json({
      data: {
        file_name: result.file_name,
        file_path: result.file_path,
        file_size: result.file_size,
        mime_type: result.mime_type,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
