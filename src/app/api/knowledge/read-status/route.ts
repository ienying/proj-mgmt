import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

/**
 * 批量查询用户对帖子的已读状态
 * POST /api/knowledge/read-status
 * body: { user_id: string, post_ids: string[] }
 * 返回: { read_ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.user_id as string;
    const postIds = body.post_ids as string[];

    if (!userId || !postIds?.length) {
      return NextResponse.json({ data: { read_ids: [] } });
    }

    const client = await createServerClient();
    const escIds = postIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
    const { data: rows } = await client.rpc("execute_sql", {
      p_sql: `SELECT post_id FROM design_info_square.knowledge_reads WHERE user_id = '${userId.replace(/'/g, "''")}' AND post_id IN (${escIds})`,
    });

    const readIds = ((rows || []) as Array<{ post_id: string }>).map((r) => r.post_id);
    return NextResponse.json({ data: { read_ids: readIds } });
  } catch {
    return NextResponse.json({ data: { read_ids: [] } });
  }
}
