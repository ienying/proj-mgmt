import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json().catch(() => ({}));
    const userId = body.user_id || "anonymous";

    await client.rpc("execute_sql", {
      p_sql: `INSERT INTO design_info_square.user_last_visit (user_id, last_visit_at)
              VALUES ('${userId.replace(/'/g, "''")}', NOW())
              ON CONFLICT (user_id) DO UPDATE SET last_visit_at = NOW()`,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
