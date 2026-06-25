import { NextResponse } from "next/server";
import { deleteFile } from "@/storage/local-filesystem";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const paths = (body.file_paths as string[]) || [];

    const results = await Promise.allSettled(
      paths.map((fp) => deleteFile(fp).catch(() => {}))
    );

    return NextResponse.json({
      data: { deleted: results.filter((r) => r.status === "fulfilled").length, total: paths.length },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
