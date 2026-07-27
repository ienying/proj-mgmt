import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { createServerClient } from "@/storage/database/pg-client";

export const JWT_SECRET = process.env.JWT_SECRET || "project-management-secret-key-2026";

export interface JwtPayload {
  userId: string;
  role: string;
}

export interface AuthResult {
  userId: string;
  role: string;
  userName: string;
  isAuthenticated: true;
}

/**
 * 同步提取并验证 JWT payload（轻量，不查数据库）。
 * 返回 null 表示 token 缺失或无效，由调用方决定返回什么错误。
 */
export function extractJwtPayload(request: NextRequest): JwtPayload | null {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * 完整鉴权：验证 JWT + 查 users 表确认用户存在且活跃。
 * 成功返回 AuthResult；失败返回 NextResponse（401/403），调用方直接 return 即可。
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult | NextResponse> {
  const payload = extractJwtPayload(request);
  if (!payload) {
    return NextResponse.json({ error: "未提供Token或Token无效" }, { status: 401 });
  }

  try {
    const client = await createServerClient();
    const { data: user } = await client.rpc("dp_get_by_id", {
      p_table: "users",
      p_id: payload.userId,
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    const userRecord = user as Record<string, unknown>;

    if (!userRecord.is_active) {
      return NextResponse.json({ error: "账号已被禁用" }, { status: 403 });
    }

    return {
      userId: payload.userId,
      role: payload.role || String(userRecord.role || "user"),
      userName: String(userRecord.name || ""),
      isAuthenticated: true as const,
    };
  } catch {
    return NextResponse.json({ error: "鉴权失败" }, { status: 500 });
  }
}
