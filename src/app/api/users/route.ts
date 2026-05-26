import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const client = await createServerClient();

    // 使用 RPC 查询 design_public.users
    const { data, error } = await client.rpc("dp_select", {
      p_table: "users",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Strip password_hash from response
    const sanitized = (data as Record<string, unknown>[])?.map((u: Record<string, unknown>) => {
      const { password_hash, ...rest } = u;
      return rest;
    }) || [];

    return NextResponse.json({ data: sanitized });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await createServerClient();
    const body = await request.json();

    const { name, username, email, phone, department, position, role = "user", password, is_active = true } = body;

    // 检查用户名是否已存在
    const { data: existingData } = await client.rpc("dp_select", {
      p_table: "users",
    });

    if (existingData && Array.isArray(existingData)) {
      const existing = existingData.find(
        (item: Record<string, unknown>) => item.username === (username || name) || item.name === name
      );
      if (existing) {
        return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
      }
    }

    // Hash password (default: yuansu0718)
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

    // Strip password_hash from response
    const result = data as Record<string, unknown>;
    if (result) {
      const { password_hash: _ph, ...rest } = result;
      return NextResponse.json({ data: rest }, { status: 201 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
