import { createServerClient } from "@/storage/database/pg-client";

export async function logAIUsage(params: {
  userId: string;
  userName?: string;
  feature: string;
  tokensUsed?: number;
  model?: string;
  projectId?: string;
}) {
  try {
    const client = await createServerClient();
    await client.rpc("dp_insert", {
      p_table: "design_public.ai_usage_logs",
      p_data: {
        user_id: params.userId,
        user_name: params.userName || null,
        feature: params.feature,
        tokens_used: params.tokensUsed || 0,
        model: params.model || "deepseek-chat",
        project_id: params.projectId || null,
      },
    });
  } catch {
    // 异步记录，不阻塞主流程
  }
}
