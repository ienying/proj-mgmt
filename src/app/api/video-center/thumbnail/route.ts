import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const THUMB_DIR = path.join(process.cwd(), "data", "video-center", "thumbnails");

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file") || "";
  if (!file || file.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const filePath = path.join(THUMB_DIR, path.basename(file));
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const buf = fs.readFileSync(filePath);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
