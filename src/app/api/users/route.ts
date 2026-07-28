import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import { verifyAuth } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  return local.slice(0, 2) + "***@" + domain;
}

/** 脱敏用户记录 */
function sanitizeUser(u: Record<string, unknown>, isAdmin: boolean): Record<string, unknown> {
  const { password_hash, ...rest } = u;
  if (isAdmin) return rest;
  return {
    ...rest,
    phone: maskPhone(String(rest.phone || "")),
    email: maskEmail(String(rest.email || "")),
    username: maskPhone(String(rest.username || "")),
  };
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const isAdmin = ["super_admin", "sub_admin"].includes(authResult.role);
    const client = await createServerClient();
    const { data, error } = await client.rpc("dp_select", { p_table: "users" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data as Record<string, unknown>[]) || [];

    if (isAdmin) {
      // 管理员看到全部用户
      return NextResponse.json({
        data: rows.map((u) => sanitizeUser(u, true)),
      });
    }

    // 普通用户只看到自己
    const self = rows.find((u) => u.id === authResult.userId);
    return NextResponse.json({
      data: self ? [sanitizeUser(self, false)] : [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 仅管理员可创建用户
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    if (!["super_admin", "sub_admin"].includes(authResult.role)) {
      return NextResponse.json({ error: "仅管理员可创建用户" }, { status: 403 });
    }

    const client = await createServerClient();
    const body = await request.json();
    const { name, username, email, phone, department, position, role = "user", password, is_active = true } = body;

    // 检查用户名是否已存在
    const { data: existingData } = await client.rpc("dp_select", { p_table: "users" });
    if (existingData && Array.isArray(existingData)) {
      const existing = (existingData as Record<string, unknown>[]).find(
        (item) => item.username === (username || name) || item.name === name
      );
      if (existing) {
        return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(password || "yuansu0718", 10);

    const insertData = {
      name,
      username: username || name,
      email,
      phone,
      department,
      position,
      role,
      password_hash: passwordHash,
      is_active,
    };

    const { data, error } = await client.rpc("dp_insert", {
      p_table: "users",
      p_data: insertData,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = data as Record<string, unknown>;
    if (result) {
      const { password_hash: _ph, ...rest } = result;
      return NextResponse.json({ data: rest }, { status: 201 });
    }
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
