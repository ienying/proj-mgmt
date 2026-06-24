import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default-jwt-secret-change-in-production";

async function ensureTable() {
  const client = await createServerClient();
  try {
    await client.rpc("execute_sql", {
      p_sql: `
        CREATE TABLE IF NOT EXISTS design_public.dashboard_kpi_config (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          kpi_key TEXT UNIQUE NOT NULL,
          config_value JSONB NOT NULL DEFAULT '{}',
          updated_by TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `,
    });
  } catch { /* table may already exist */ }
}

async function getCallerRole(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    return decoded.role || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureTable();
    const client = await createServerClient();
    const { searchParams } = new URL(request.url);
    const kpiKey = searchParams.get("kpi_key") || "requirement_total";

    const { data } = await client.rpc("execute_sql", {
      p_sql: `SELECT config_value FROM design_public.dashboard_kpi_config WHERE kpi_key = '${kpiKey.replace(/'/g, "''")}'`,
    });

    const rows = data as Array<{ config_value: unknown }> | null;
    if (rows && rows.length > 0) {
      return NextResponse.json({ data: rows[0].config_value });
    }
    return NextResponse.json({ data: null });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const role = await getCallerRole(request);
    if (role !== "super_admin") {
      return NextResponse.json({ error: "仅超级管理员可修改 KPI 数据源配置" }, { status: 403 });
    }

    await ensureTable();
    const client = await createServerClient();
    const body = await request.json();
    const kpiKey = (body.kpi_key as string) || "requirement_total";
    const configValue = body.config_value ?? null;

    // Upsert: delete existing then insert
    await client.rpc("execute_sql", {
      p_sql: `DELETE FROM design_public.dashboard_kpi_config WHERE kpi_key = '${kpiKey.replace(/'/g, "''")}'`,
    });

    if (configValue !== null) {
      const escaped = JSON.stringify(configValue).replace(/'/g, "''");
      await client.rpc("execute_sql", {
        p_sql: `INSERT INTO design_public.dashboard_kpi_config (kpi_key, config_value, updated_at) VALUES ('${kpiKey.replace(/'/g, "''")}', '${escaped}'::jsonb, NOW())`,
      });
    }

    return NextResponse.json({ data: { success: true, config_value: configValue } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
