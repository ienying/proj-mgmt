// ============================================================
// 阶段式布局 (Stage Layout) — 所有 TypeScript 类型定义
// ============================================================

// ── 布局模式 ──
export type LayoutMode = "management" | "stage";

// ── 面板导航 ──
export interface PanelItem {
  label: string;
  count: number;
  key?: string;
  active?: boolean;
  link?: string;
}

export interface PanelDataGroup {
  title: string;
  items: PanelItem[];
}

export type PanelKey =
  | "scope"
  | "demand"
  | "progress"
  | "quality"
  | "cost"
  | "communication"
  | "risk"
  | "docs";

export type PanelData = Record<PanelKey, PanelDataGroup>;

// ── 子内容（钻取详情表） ──
export interface SubContentRow {
  id: string;
  name: string;
  priority: "高" | "中" | "低";
  status: string; // "已确认" | "评审中" | "确认中" | "待评审"
  owner: string;
  date: string;
  desc: string;
}

export interface SubContentEntry {
  title: string;
  section: string;
  rows: SubContentRow[];
}

export type SubContentData = Record<string, SubContentEntry>;

// ── 阶段步骤条 ──
export type PhaseStatus = "done" | "active" | "pending";

export interface PhaseNode {
  index: number;
  key: string; // 阶段键名
  label: string; // 短标签
  title: string; // 完整标题
  dateRange: string;
  status: PhaseStatus;
}

export interface PhaseMetaItem {
  value: string;
  label: string;
  accent?: boolean;
}

export interface PhaseDetailData {
  statusLabel: string;
  statusClass: PhaseStatus;
  name: string;
  description: string;
  dateRange: string;
  metaItems: PhaseMetaItem[];
}

// ── 阶段任务 ──
export interface PhaseTask {
  key: string; // e.g. "p0t0"
  name: string;
  dotStatus: PhaseStatus;
}

// ── 任务步骤 ──
export interface TaskStep {
  desc: string;
  input: string;
  output: string;
  role: string;
  status: PhaseStatus;
  label: string; // "DONE" | "ACTIVE" | "待开始"
}

export interface TaskDataEntry {
  name: string;
  rows: TaskStep[];
}

export type TaskData = Record<string, TaskDataEntry>;

// ── 总览网格 ──
export interface OverviewItem {
  name: string;
  completed: number;
  total: number;
  progress: number; // 0-100
  status: PhaseStatus;
}

// ── 图表数据 ──
export interface DonutSegment {
  label: string;
  count: number;
  color: string;
  percentage: number;
}

export interface BarDataItem {
  label: string;
  value: number;
  progress: number; // 0-100
  color: string;
}

// ── StageLayout 入口 Props ──
export interface StageLayoutProps {
  project: {
    id: string;
    project_name: string;
    project_code: string;
    project_type: string;
    project_stage: string;
    project_schema: string;
    status: string;
    created_at: string;
    customer_info?: {
      company_name?: string;
      contact_person?: string;
      contact_phone?: string;
      contact_email?: string;
    };
    channel_info?: Array<{
      company_name: string;
      contact_person?: string;
      contact_phone?: string;
    }>;
    procurement_modules?: string[] | Array<{ code: string; quantity: number }>;
    description?: string;
  };
  projectTypes: { code: string; name: string }[];
  projectStages: { code: string; name: string }[];
  onBack: () => void;
  onSwitchLayout: (mode: LayoutMode) => void;
}
