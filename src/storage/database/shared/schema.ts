import { pgTable, varchar, text, timestamp, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ============================================
// 类型定义
// ============================================

// 列配置接口（支持只读字段）
export interface ColumnConfig {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'email' | 'phone' | 'column_reference';
  required?: boolean;
  description?: string;
  readonly?: boolean;           // 是否只读
  readonly_reason?: string;     // 只读原因说明
  default_value?: string;       // 默认值
  options?: string[];           // select 类型的选项
  validation?: {                // 验证规则
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// 引用关系配置接口
export interface ReferenceConfig {
  id: string;
  name: string;
  source_table_code: string;
  match_condition: {
    target_column: string;
    source_column: string;
  };
  column_mapping: Array<{
    target_column: string;
    source_column: string;
  }>;
  filter_condition?: Array<{
    column: string;
    operator: string;
    value: string;
  }>;
  bidirectional: boolean;
  entry_column: string;
}

// ============================================
// design_public Schema - 公共基础数据
// ============================================

// 项目基本信息表
export const projects = pgTable("projects", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  project_name: varchar("project_name", { length: 255 }).notNull(),
  project_code: varchar("project_code", { length: 50 }).notNull().unique(),
  project_type: varchar("project_type", { length: 50 }).notNull(),
  project_stage: varchar("project_stage", { length: 50 }).notNull(),
  project_schema: varchar("project_schema", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  start_date: timestamp("start_date", { withTimezone: true }),
  end_date: timestamp("end_date", { withTimezone: true }),
  description: text("description"),
  customer_info: jsonb("customer_info"),
  channel_info: jsonb("channel_info"),
  procurement_modules: jsonb("procurement_modules"),
  created_by: varchar("created_by", { length: 36 }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("projects_project_code_idx").on(table.project_code),
  index("projects_project_type_idx").on(table.project_type),
  index("projects_status_idx").on(table.status),
]);

export const project_module_types = pgTable("project_module_types", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  icon: varchar("icon", { length: 50 }).notNull(),
  color: varchar("color", { length: 50 }).notNull(),
  description: text("description"),
  is_enabled: boolean("is_enabled").default(true),
  sort_order: integer("sort_order").default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const project_type_stage_modules = pgTable("project_type_stage_modules", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  project_type_code: varchar("project_type_code", { length: 50 }).notNull(),
  project_stage_code: varchar("project_stage_code", { length: 50 }).notNull(),
  module_code: varchar("module_code", { length: 50 }).notNull(),
  is_enabled: boolean("is_enabled").default(true),
  sort_order: integer("sort_order").default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 部门表
export const departments = pgTable("departments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  sort_order: integer("sort_order").default(0).notNull(),
  is_enabled: boolean("is_enabled").default(true).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("departments_code_idx").on(table.code),
]);

// 项目类型表
export const project_types = pgTable("project_types", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  sort_order: integer("sort_order").default(0).notNull(),
  is_enabled: boolean("is_enabled").default(true).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("project_types_code_idx").on(table.code),
  index("project_types_sort_idx").on(table.sort_order),
]);

// 项目阶段表
export const project_stages = pgTable("project_stages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  sort_order: integer("sort_order").default(0).notNull(),
  is_enabled: boolean("is_enabled").default(true).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("project_stages_code_idx").on(table.code),
  index("project_stages_sort_idx").on(table.sort_order),
]);

// 采购模块类型表
export const product_module_types = pgTable("product_module_types", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  module_name: varchar("module_name", { length: 100 }).notNull(),
  product_name: varchar("product_name", { length: 200 }),
  category: varchar("category", { length: 100 }),
  vendor: varchar("vendor", { length: 100 }),
  scope: varchar("scope", { length: 100 }),
  tech_specs: text("tech_specs"),
  is_enabled: boolean("is_enabled").default(true).notNull(),
  sort_order: integer("sort_order").default(0).notNull(),
  description: text("description"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("product_module_types_code_idx").on(table.code),
]);

// 产品类别表
export const product_categories = pgTable("product_categories", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  is_enabled: boolean("is_enabled").default(true).notNull(),
  sort_order: integer("sort_order").default(0).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
});

// 产品厂商表
export const product_vendors = pgTable("product_vendors", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  is_enabled: boolean("is_enabled").default(true).notNull(),
  sort_order: integer("sort_order").default(0).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
});

// 产品范围表
export const product_scopes = pgTable("product_scopes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  is_enabled: boolean("is_enabled").default(true).notNull(),
  sort_order: integer("sort_order").default(0).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
});

// 项目成员角色类型表
export const member_role_types = pgTable("member_role_types", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  sort_order: integer("sort_order").default(0).notNull(),
  is_enabled: boolean("is_enabled").default(true).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("member_role_types_code_idx").on(table.code),
]);

// 项目成员表
export const project_members = pgTable("project_members", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  project_id: varchar("project_id", { length: 36 }).notNull(),
  user_id: varchar("user_id", { length: 36 }).notNull(),
  role_type: varchar("role_type", { length: 50 }).notNull(),
  name: varchar("name", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  department: varchar("department", { length: 100 }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("project_members_project_idx").on(table.project_id),
  index("project_members_user_idx").on(table.user_id),
]);

// ============================================
// 用户管理
// ============================================

// 用户表
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  department: varchar("department", { length: 100 }),
  position: varchar("position", { length: 100 }),
  avatar: varchar("avatar", { length: 500 }),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("users_username_idx").on(table.username),
]);

// ============================================
// 规范管理
// ============================================

// 数据表定义表
export const data_table_definitions = pgTable("data_table_definitions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  table_code: varchar("table_code", { length: 100 }).notNull().unique(),
  table_name: varchar("table_name", { length: 200 }).notNull(),
  module_type: jsonb("module_type").notNull().$type<string[]>(),
  description: text("description"),
  columns_config: jsonb("columns_config").notNull(),
  references_config: jsonb("references_config").$type<ReferenceConfig[]>(),
  apply_project_types: jsonb("apply_project_types").$type<string[]>(),
  apply_project_stages: jsonb("apply_project_stages").$type<string[]>(),
  sort_order: integer("sort_order").default(0).notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_by: varchar("created_by", { length: 36 }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("data_table_definitions_code_idx").on(table.table_code),
]);

export const project_schema_rules = pgTable("project_schema_rules", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  rule_name: varchar("rule_name", { length: 200 }).notNull(),
  rule_type: varchar("rule_type", { length: 20 }).default('type_stage').notNull(), // type_stage | module
  project_type: varchar("project_type", { length: 50 }),
  project_stage: varchar("project_stage", { length: 50 }),
  project_status: varchar("project_status", { length: 20 }), // nullable filter
  module_codes: jsonb("module_codes").notNull().$type<string[]>().default(sql`'[]'::jsonb`), // 模块代码列表
  table_definitions: jsonb("table_definitions").notNull().$type<string[]>().default(sql`'[]'::jsonb`),
  is_enabled: boolean("is_enabled").default(true).notNull(),
  sort_order: integer("sort_order").default(0).notNull(),
  description: text("description"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("project_schema_rules_type_idx").on(table.project_type),
  index("project_schema_rules_stage_idx").on(table.project_stage),
  index("project_schema_rules_status_idx").on(table.project_status),
]);
