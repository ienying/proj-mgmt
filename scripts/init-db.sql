-- ============================================
-- PostgreSQL Init Script
-- Creates all tables needed by the app
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schemas
CREATE SCHEMA IF NOT EXISTS design_public;

-- ============================================
-- Users & Auth
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  department VARCHAR(100),
  position VARCHAR(100),
  avatar VARCHAR(500),
  role VARCHAR(50) DEFAULT 'user',
  password_hash TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);

CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_token_idx ON user_sessions(token);

-- ============================================
-- Projects
-- ============================================

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name VARCHAR(255) NOT NULL,
  project_code VARCHAR(100) NOT NULL UNIQUE,
  project_type VARCHAR(50) NOT NULL,
  project_stage VARCHAR(50) NOT NULL,
  project_schema VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  department VARCHAR(100),
  description TEXT,
  entry_date TIMESTAMP WITH TIME ZONE,
  initial_acceptance_date TIMESTAMP WITH TIME ZONE,
  final_acceptance_date TIMESTAMP WITH TIME ZONE,
  customer_info JSONB,
  customer_location VARCHAR(255),
  longitude VARCHAR(50),
  latitude VARCHAR(50),
  school_photos JSONB,
  customer_type TEXT,
  deployment_mode VARCHAR(100),
  channel_info JSONB,
  procurement_modules JSONB,
  procurement_amount NUMERIC,
  software_amount NUMERIC,
  hardware_amount NUMERIC,
  tenant_id VARCHAR(100),
  login_url VARCHAR(500),
  login_username VARCHAR(100),
  login_password VARCHAR(100),
  project_status VARCHAR(50),
  role_sales VARCHAR(100),
  role_presales VARCHAR(100),
  role_market_product VARCHAR(100),
  role_project_manager VARCHAR(100),
  integration_list JSONB DEFAULT '[]'::jsonb,
  custom_dev_info JSONB DEFAULT '[]'::jsonb,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS projects_project_code_idx ON projects(project_code);
CREATE INDEX IF NOT EXISTS projects_project_type_idx ON projects(project_type);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);

CREATE TABLE IF NOT EXISTS project_members (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  role_type VARCHAR(50) NOT NULL,
  name VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  department VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS project_members_project_idx ON project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_idx ON project_members(user_id);

CREATE TABLE IF NOT EXISTS project_member_permissions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS project_member_perms_user_idx ON project_member_permissions(user_id);
CREATE INDEX IF NOT EXISTS project_member_perms_project_idx ON project_member_permissions(project_id);

CREATE TABLE IF NOT EXISTS integration_info (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(36) NOT NULL,
  name VARCHAR(200),
  url VARCHAR(500),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS integration_info_project_idx ON integration_info(project_id);

-- ============================================
-- Reference Data: Project Types & Stages
-- ============================================

-- ============================================
-- Reference Data: Departments
-- ============================================

CREATE TABLE IF NOT EXISTS departments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS departments_code_idx ON departments(code);

-- 施工单位表
CREATE TABLE IF NOT EXISTS construction_units (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(50),
  cooperation_level VARCHAR(50),
  quality_rating VARCHAR(50),
  description TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS construction_units_code_idx ON construction_units(code);

-- ============================================
-- Reference Data: Project Types & Stages
-- ============================================

CREATE TABLE IF NOT EXISTS project_types (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS project_types_code_idx ON project_types(code);

CREATE TABLE IF NOT EXISTS project_stages (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS project_stages_code_idx ON project_stages(code);

CREATE TABLE IF NOT EXISTS member_role_types (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 开发对接类型表
CREATE TABLE IF NOT EXISTS dev_integration_types (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS dev_integration_types_code_idx ON dev_integration_types(code);

-- 定制开发类型表
CREATE TABLE IF NOT EXISTS custom_dev_types (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS custom_dev_types_code_idx ON custom_dev_types(code);

CREATE TABLE IF NOT EXISTS project_module_types (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  color VARCHAR(50) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_type_stage_modules (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type_code VARCHAR(50) NOT NULL,
  project_stage_code VARCHAR(50) NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Reference Data: Products
-- ============================================

CREATE TABLE IF NOT EXISTS product_module_types (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  module_name VARCHAR(100) NOT NULL,
  product_name VARCHAR(200),
  product_category VARCHAR(100),
  category VARCHAR(100),
  vendor VARCHAR(100),
  scope VARCHAR(100),
  tech_specs TEXT,
  bidding_instructions TEXT,
  software_name VARCHAR(200),
  remarks TEXT,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS product_module_types_code_idx ON product_module_types(code);

CREATE TABLE IF NOT EXISTS product_categories (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS product_vendors (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  contact_person VARCHAR(100),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  address TEXT,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS product_scopes (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- Reference Data: Other Dicts
-- ============================================

CREATE TABLE IF NOT EXISTS customer_types (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS deployment_modes (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS project_statuses (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20),
  description TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS todo_statuses (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20),
  description TEXT,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- Schema Rules & Table Definitions
-- ============================================

CREATE TABLE IF NOT EXISTS data_table_definitions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  table_code VARCHAR(100) NOT NULL UNIQUE,
  table_name VARCHAR(200) NOT NULL,
  module_type JSONB NOT NULL DEFAULT '[]'::jsonb,
  description TEXT,
  columns_config JSONB NOT NULL DEFAULT '[]'::jsonb,
  references_config JSONB DEFAULT '[]'::jsonb,
  apply_project_types JSONB DEFAULT '[]'::jsonb,
  apply_project_stages JSONB DEFAULT '[]'::jsonb,
  stage_desc_column VARCHAR(100),
  stage_display_mode VARCHAR(20) DEFAULT 'both',
  stage_progress_column VARCHAR(100),
  stage_progress_target VARCHAR(200),
  stage_summary_fields TEXT,
  stage_plan_start_col VARCHAR(100),
  stage_plan_end_col VARCHAR(100),
  stage_actual_start_col VARCHAR(100),
  stage_actual_end_col VARCHAR(100),
  sort_order INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  allow_add BOOLEAN DEFAULT true,
  created_by VARCHAR(36),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS data_table_definitions_code_idx ON data_table_definitions(table_code);

CREATE TABLE IF NOT EXISTS project_schema_rules (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(200) NOT NULL,
  rule_type VARCHAR(20) DEFAULT 'type_stage' NOT NULL,
  project_type VARCHAR(50),
  project_stage VARCHAR(50),
  project_status VARCHAR(20),
  module_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  table_definitions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  sort_order INTEGER DEFAULT 0 NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS project_schema_rules_type_idx ON project_schema_rules(project_type);
CREATE INDEX IF NOT EXISTS project_schema_rules_stage_idx ON project_schema_rules(project_stage);
CREATE INDEX IF NOT EXISTS project_schema_rules_status_idx ON project_schema_rules(project_status);

-- ============================================
-- To-do System
-- ============================================

CREATE TABLE IF NOT EXISTS todo_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  priority VARCHAR(20) DEFAULT 'normal',
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS todo_items_user_idx ON todo_items(user_id);
CREATE INDEX IF NOT EXISTS todo_items_status_idx ON todo_items(status);

CREATE TABLE IF NOT EXISTS todo_task_defs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) DEFAULT 'one_time',
  period_config JSONB DEFAULT '{}'::jsonb,
  project_id VARCHAR(36),
  assignee_id VARCHAR(36),
  assignee_name VARCHAR(100),
  due_date VARCHAR(20),
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'active',
  created_by VARCHAR(36),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS todo_task_instances (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  def_id VARCHAR(36),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  project_id VARCHAR(36),
  project_name VARCHAR(200),
  assignee_id VARCHAR(36),
  assignee_name VARCHAR(100),
  creator_id VARCHAR(36),
  creator_name VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  due_date VARCHAR(20),
  period_label VARCHAR(100),
  is_read BOOLEAN DEFAULT false,
  form_record_id VARCHAR(36),
  current_node_id VARCHAR(36),
  current_node_index INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS todo_task_instances_assignee_idx ON todo_task_instances(assignee_id);
CREATE INDEX IF NOT EXISTS todo_task_instances_status_idx ON todo_task_instances(status);

-- 工作流模板表
CREATE TABLE IF NOT EXISTS workflow_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  task_def_id VARCHAR(36) NOT NULL,
  allow_forward BOOLEAN DEFAULT true,
  allow_return BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 工作流节点表
CREATE TABLE IF NOT EXISTS workflow_nodes (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  order_index INTEGER DEFAULT 0,
  handler_ids TEXT[] DEFAULT '{}',
  handler_mode VARCHAR(20) DEFAULT 'any_one',
  deadline_days INTEGER DEFAULT 2,
  reminder_hours INTEGER DEFAULT 24,
  fillable_fields TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS workflow_nodes_template_idx ON workflow_nodes(template_id);

-- 工作流节点完成记录（用于 all 模式追踪各处理人完成状态）
CREATE TABLE IF NOT EXISTS workflow_node_completions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id VARCHAR(36) NOT NULL,
  node_id VARCHAR(36) NOT NULL,
  handler_id VARCHAR(36) NOT NULL,
  handler_name VARCHAR(100),
  action VARCHAR(20) DEFAULT 'complete',
  comment TEXT,
  form_record_id VARCHAR(36),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS wnc_instance_idx ON workflow_node_completions(instance_id);
CREATE INDEX IF NOT EXISTS wnc_node_idx ON workflow_node_completions(node_id);

-- 任务看板额外列定义
CREATE TABLE IF NOT EXISTS task_extra_columns (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  task_def_id VARCHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) DEFAULT 'text',
  options TEXT[] DEFAULT '{}',
  writeback_column VARCHAR(100),
  fillable_by TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS tec_task_def_idx ON task_extra_columns(task_def_id);

-- 任务看板记录
CREATE TABLE IF NOT EXISTS task_board_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  task_instance_id VARCHAR(36),
  sort_order INTEGER DEFAULT 0,
  source_project_schema VARCHAR(100),
  source_table_code VARCHAR(100),
  source_record_id VARCHAR(36),
  source_label TEXT,
  source_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS tbr_instance_idx ON task_board_records(task_instance_id);

-- 任务看板额外数据
CREATE TABLE IF NOT EXISTS task_extra_data (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  board_record_id VARCHAR(36) NOT NULL,
  column_id VARCHAR(36) NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS ted_record_idx ON task_extra_data(board_record_id);

CREATE TABLE IF NOT EXISTS todo_center_items (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  source_type VARCHAR(20) NOT NULL,
  source_id VARCHAR(36),
  source_data JSONB DEFAULT '{}'::jsonb,
  assignee_id VARCHAR(36),
  assignee_name VARCHAR(100),
  creator_id VARCHAR(36),
  creator_name VARCHAR(100),
  project_id VARCHAR(36),
  project_name VARCHAR(200),
  priority VARCHAR(10) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'pending',
  due_date VARCHAR(20),
  is_read BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS todo_center_items_assignee_idx ON todo_center_items(assignee_id);
CREATE INDEX IF NOT EXISTS todo_center_items_status_idx ON todo_center_items(status);
CREATE INDEX IF NOT EXISTS todo_center_items_source_idx ON todo_center_items(source_type);

CREATE TABLE IF NOT EXISTS todo_center_cc (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id VARCHAR(36),
  source_type VARCHAR(20) NOT NULL,
  source_id VARCHAR(36),
  title TEXT NOT NULL,
  summary TEXT,
  from_user_name VARCHAR(100),
  user_id VARCHAR(36) NOT NULL,
  user_name VARCHAR(100),
  is_read BOOLEAN DEFAULT false,
  is_ignored BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS todo_center_cc_user_idx ON todo_center_cc(user_id);


-- ============================================
-- Knowledge Center
-- ============================================

-- ============================================
-- Knowledge Center (信息广场) — design_info_square schema
-- ============================================

CREATE SCHEMA IF NOT EXISTS design_info_square;

CREATE TABLE IF NOT EXISTS design_info_square.knowledge_categories (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT 'BookOpen',
  color VARCHAR(50) DEFAULT '#6366f1',
  category_type VARCHAR(50) DEFAULT 'material',
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS design_info_square.knowledge_posts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  category_id VARCHAR(36),
  is_pinned BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  like_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  favorite_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  tags TEXT,
  status VARCHAR(20) DEFAULT 'published',
  created_by VARCHAR(36),
  created_by_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS knowledge_posts_category_idx ON design_info_square.knowledge_posts(category_id);

CREATE TABLE IF NOT EXISTS design_info_square.knowledge_attachments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR(36),
  file_name VARCHAR(255),
  file_url TEXT,
  file_size INTEGER,
  file_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS knowledge_attachments_post_idx ON design_info_square.knowledge_attachments(post_id);

CREATE TABLE IF NOT EXISTS design_info_square.knowledge_comments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  user_id VARCHAR(36),
  user_name VARCHAR(100),
  user_avatar VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS knowledge_comments_post_idx ON design_info_square.knowledge_comments(post_id);

CREATE TABLE IF NOT EXISTS design_info_square.knowledge_likes (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS knowledge_likes_post_idx ON design_info_square.knowledge_likes(post_id);
CREATE INDEX IF NOT EXISTS knowledge_likes_user_idx ON design_info_square.knowledge_likes(user_id);

CREATE TABLE IF NOT EXISTS design_info_square.knowledge_reads (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS knowledge_reads_post_idx ON design_info_square.knowledge_reads(post_id);

-- ============================================
-- Issue Management
-- ============================================

CREATE TABLE IF NOT EXISTS issue_mgmt_issues (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  project_id VARCHAR(36),
  project_name VARCHAR(200),
  category VARCHAR(50),
  urgency VARCHAR(20),
  warranty_status VARCHAR(50),
  status VARCHAR(20) DEFAULT 'open',
  reporter_id VARCHAR(36),
  reporter_name VARCHAR(100),
  assignee_id VARCHAR(36),
  assignee_name VARCHAR(100),
  due_date VARCHAR(20),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS issue_mgmt_issue_attachments (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id VARCHAR(36) NOT NULL,
  file_name VARCHAR(255),
  file_url TEXT,
  file_size INTEGER,
  file_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS issue_mgmt_issue_processing_records (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id VARCHAR(36) NOT NULL,
  content TEXT,
  operator_id VARCHAR(36),
  operator_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS issue_mgmt_issue_notifications (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id VARCHAR(36),
  user_id VARCHAR(36) NOT NULL,
  user_name VARCHAR(100),
  content TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS issue_mgmt_issue_categories (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS issue_mgmt_issue_urgency (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS issue_mgmt_issue_warranty_status (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- Case Center
-- ============================================


