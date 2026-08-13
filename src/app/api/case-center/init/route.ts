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
        customer_types JSONB DEFAULT '[]'::jsonb,
        location JSONB DEFAULT '{}'::jsonb,
        description TEXT,
        hardware_info JSONB DEFAULT '{}'::jsonb,
        network_info JSONB DEFAULT '{}'::jsonb,
        campus_mode TEXT DEFAULT 'single' CHECK (campus_mode IN ('single', 'multi_independent', 'multi_cross')),
        campuses JSONB DEFAULT '[]'::jsonb,
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
        metrics JSONB DEFAULT '[]'::jsonb,
        dept_scope TEXT DEFAULT 'school_wide' CHECK (dept_scope IN ('school_wide', 'campus_specific')),
        campus_id TEXT DEFAULT '',
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
        status TEXT DEFAULT '未购' CHECK (status IN ('已采购-已使用', '已采购-未使用', '未购')),
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

      -- 迁移：确保 customer_types 列存在（兼容旧表无此列的情况）
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'design_case_center' AND table_name = 'customers' AND column_name = 'customer_types'
        ) THEN
          ALTER TABLE design_case_center.customers ADD COLUMN customer_types JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'design_case_center' AND table_name = 'customers' AND column_name = 'school_type'
        ) THEN
          UPDATE design_case_center.customers
            SET customer_types = to_jsonb(ARRAY[school_type])
            WHERE customer_types IS NULL OR customer_types = '[]'::jsonb;
          ALTER TABLE design_case_center.customers DROP COLUMN IF EXISTS school_type;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'design_case_center' AND table_name = 'customers' AND column_name = 'location'
        ) THEN
          ALTER TABLE design_case_center.customers ADD COLUMN location JSONB DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'design_case_center' AND table_name = 'customers' AND column_name = 'hardware_info'
        ) THEN
          ALTER TABLE design_case_center.customers ADD COLUMN hardware_info JSONB DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'design_case_center' AND table_name = 'customers' AND column_name = 'network_info'
        ) THEN
          ALTER TABLE design_case_center.customers ADD COLUMN network_info JSONB DEFAULT '{}'::jsonb;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'design_case_center' AND table_name = 'customer_departments' AND column_name = 'metrics'
        ) THEN
          ALTER TABLE design_case_center.customer_departments ADD COLUMN metrics JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'design_case_center' AND table_name = 'customers' AND column_name = 'campus_mode'
        ) THEN
          ALTER TABLE design_case_center.customers ADD COLUMN campus_mode TEXT DEFAULT 'single';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'design_case_center' AND table_name = 'customers' AND column_name = 'campuses'
        ) THEN
          ALTER TABLE design_case_center.customers ADD COLUMN campuses JSONB DEFAULT '[]'::jsonb;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'design_case_center' AND table_name = 'customer_departments' AND column_name = 'dept_scope'
        ) THEN
          ALTER TABLE design_case_center.customer_departments ADD COLUMN dept_scope TEXT DEFAULT 'school_wide';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'design_case_center' AND table_name = 'customer_departments' AND column_name = 'campus_id'
        ) THEN
          ALTER TABLE design_case_center.customer_departments ADD COLUMN campus_id TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'design_case_center' AND table_name = 'customer_departments' AND column_name = 'group_names'
        ) THEN
          ALTER TABLE design_case_center.customer_departments ADD COLUMN group_names TEXT DEFAULT '';
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'design_case_center' AND table_name = 'customer_modules' AND column_name = 'usage_description'
        ) THEN
          ALTER TABLE design_case_center.customer_modules ADD COLUMN usage_description TEXT DEFAULT '';
        END IF;

        -- 迁移状态值：已落地→已采购-已使用，未落地→已采购-未使用
        UPDATE design_case_center.customer_modules SET status = '已采购-已使用' WHERE status = '已落地';
        UPDATE design_case_center.customer_modules SET status = '已采购-未使用' WHERE status = '未落地';

        -- 更新 CHECK 约束（如果存在旧约束则替换）
        DO $inner$
        DECLARE
          old_constraint_name TEXT;
        BEGIN
          SELECT con.conname INTO old_constraint_name
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid = con.conrelid
          JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
          WHERE nsp.nspname = 'design_case_center'
            AND rel.relname = 'customer_modules'
            AND con.contype = 'c'
            AND pg_get_constraintdef(con.oid) LIKE '%status%';
          IF old_constraint_name IS NOT NULL THEN
            EXECUTE format('ALTER TABLE design_case_center.customer_modules DROP CONSTRAINT %I', old_constraint_name);
          END IF;
        END $inner$;
        ALTER TABLE design_case_center.customer_modules ADD CONSTRAINT customer_modules_status_check CHECK (status IN ('已采购-已使用', '已采购-未使用', '未购'));
      END $$;
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
