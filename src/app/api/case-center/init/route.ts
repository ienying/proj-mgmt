import { NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

export async function POST() {
  try {
    const client = await createServerClient();

    const sql = `
      CREATE SCHEMA IF NOT EXISTS design_case_center;

      CREATE TABLE IF NOT EXISTS design_case_center.customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_name TEXT NOT NULL,
        school_type TEXT NOT NULL,
        location TEXT DEFAULT '',
        description TEXT,
        hardware_info JSONB DEFAULT '{}'::jsonb,
        network_info JSONB DEFAULT '{}'::jsonb,
        created_by TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS design_case_center.customer_departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES design_case_center.customers(id) ON DELETE CASCADE,
        department_code TEXT NOT NULL,
        department_name TEXT NOT NULL,
        personnel JSONB DEFAULT '[]'::jsonb,
        daily_work TEXT DEFAULT '',
        workflow TEXT DEFAULT '',
        pain_points TEXT DEFAULT '',
        tools TEXT DEFAULT '',
        expectations TEXT DEFAULT '',
        department_summary TEXT DEFAULT '',
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(customer_id, department_code)
      );

      CREATE TABLE IF NOT EXISTS design_case_center.customer_modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_department_id UUID NOT NULL REFERENCES design_case_center.customer_departments(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES design_case_center.customers(id) ON DELETE CASCADE,
        module_code TEXT NOT NULL,
        module_name TEXT NOT NULL,
        status TEXT DEFAULT '未购' CHECK (status IN ('已落地', '未落地', '未购')),
        usage_rate NUMERIC DEFAULT 0,
        active_users INT DEFAULT 0,
        effect TEXT DEFAULT '',
        issues TEXT DEFAULT '',
        current_practice TEXT DEFAULT '',
        collaborating_departments JSONB DEFAULT '[]'::jsonb,
        materials JSONB DEFAULT '[]'::jsonb,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(customer_department_id, module_code)
      );

      CREATE TABLE IF NOT EXISTS design_case_center.profile_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES design_case_center.customers(id) ON DELETE CASCADE,
        version_number INT NOT NULL,
        changed_fields JSONB DEFAULT '[]'::jsonb,
        change_summary TEXT DEFAULT '',
        snapshot JSONB DEFAULT '{}'::jsonb,
        operator TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS design_case_center.weekly_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES design_case_center.customers(id) ON DELETE CASCADE,
        report_week TEXT NOT NULL,
        content JSONB DEFAULT '{}'::jsonb,
        created_by TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(customer_id, report_week, created_by)
      );

      CREATE INDEX IF NOT EXISTS idx_customers_school_type ON design_case_center.customers(school_type);
      CREATE INDEX IF NOT EXISTS idx_customer_modules_customer ON design_case_center.customer_modules(customer_id);
      CREATE INDEX IF NOT EXISTS idx_customer_modules_status ON design_case_center.customer_modules(status);
      CREATE INDEX IF NOT EXISTS idx_customer_modules_module ON design_case_center.customer_modules(module_code);
    `;

    const { error } = await client.rpc("execute_sql", { p_sql: sql });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "案例中心数据库初始化成功" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
