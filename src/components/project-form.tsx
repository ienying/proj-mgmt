"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  X,
  Plus,
  Building,
  Phone,
  Type,
  Layers,
  Users,
  ShoppingCart,
  ArrowLeft,
  Save,
  MapPin,
  Calendar,
  Camera,
  Link,
  AlertTriangle,
  Search,
  Download,
  Upload,
  Copy,
  ClipboardList,
  Hammer,
} from "lucide-react";
import { toast } from "sonner";

// 中国省级行政区（含港澳台）
const PROVINCES = [
  "北京市", "天津市", "上海市", "重庆市",
  "河北省", "山西省", "辽宁省", "吉林省", "黑龙江省",
  "江苏省", "浙江省", "安徽省", "福建省", "江西省", "山东省",
  "河南省", "湖北省", "湖南省", "广东省", "海南省",
  "四川省", "贵州省", "云南省", "陕西省", "甘肃省", "青海省",
  "内蒙古自治区", "广西壮族自治区", "西藏自治区", "宁夏回族自治区", "新疆维吾尔自治区",
  "香港特别行政区", "澳门特别行政区", "台湾省",
];

// 类型定义
interface ContactPerson {
  id: string;
  name: string;
  phone: string;
  email: string;
  position: string;
}

interface ChannelCompany {
  id: string;
  company_name: string;
  contact_person: string;
  contact_phone: string;
  remark: string;
}

interface ProjectMember {
  id: string;
  user_id: string;
  name: string;
  role_type: string;
  phone: string;
}

interface IntegrationDoc {
  id: string;
  name: string;
  type: "file" | "link";
  url?: string;
  data?: string;
}

interface IntegrationItem {
  id: string;
  vendor_name: string;
  product_module: string;
  integration_type: string;
  brief_description: string;
  in_contract: string;
  contract_note: string;
  our_req_contact: string;
  our_req_contact_phone: string;
  our_product_contact: string;
  our_product_contact_phone: string;
  our_dev_contact: string;
  our_dev_contact_phone: string;
  our_responsibility: string;
  their_req_contact: string;
  their_req_contact_phone: string;
  their_req_contact_position: string;
  their_req_contact_note: string;
  their_product_contact: string;
  their_product_contact_phone: string;
  their_product_contact_position: string;
  their_product_contact_note: string;
  their_dev_contact: string;
  their_dev_contact_phone: string;
  their_dev_contact_position: string;
  their_dev_contact_note: string;
  their_responsibility: string;
  integration_docs: IntegrationDoc[];
  remark: string;
}

interface CustomDevItem {
  id: string;
  product_module: string;
  custom_content: string;
  in_contract: string;
  contract_note: string;
  customer_req_contact: string;
  customer_req_contact_phone: string;
  customer_req_contact_position: string;
  customer_req_contact_note: string;
  internal_req_contact: string;
  internal_req_contact_phone: string;
  internal_product_contact: string;
  internal_product_contact_phone: string;
  req_docs: IntegrationDoc[];
  remark: string;
}

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  projectTypes: { code: string; name: string }[];
  projectStages: { code: string; name: string }[];
  memberRoles: string[];
  productModules: { module_code: string; module_name: string; product_name: string }[];
  users: { id: string; name: string; phone?: string; position?: string; email?: string }[];
  initialData?: Record<string, unknown> | null; // eslint-disable-line @typescript-eslint/no-explicit-any
}

// 全局样式：Section 内输入框聚焦高亮
const sectionFocusStyles = `
  .section-blue input:focus, .section-blue select:focus, .section-blue textarea:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(59,130,246,0.3);
    border-color: #3b82f6;
  }
  .section-purple input:focus, .section-purple select:focus, .section-purple textarea:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(139,92,246,0.3);
    border-color: #8b5cf6;
  }
  .section-indigo input:focus, .section-indigo select:focus, .section-indigo textarea:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(99,102,241,0.3);
    border-color: #6366f1;
  }
  .section-pink input:focus, .section-pink select:focus, .section-pink textarea:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(236,72,153,0.3);
    border-color: #ec4899;
  }
  .section-green input:focus, .section-green select:focus, .section-green textarea:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(34,197,94,0.3);
    border-color: #22c55e;
  }
  .section-cyan input:focus, .section-cyan select:focus, .section-cyan textarea:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(6,182,212,0.3);
    border-color: #06b6d4;
  }
  .section-amber input:focus, .section-amber select:focus, .section-amber textarea:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(245,158,11,0.3);
    border-color: #f59e0b;
  }
  .section-slate input:focus, .section-slate select:focus, .section-slate textarea:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(100,116,139,0.3);
    border-color: #64748b;
  }
  .section-orange input:focus, .section-orange select:focus, .section-orange textarea:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(249,115,22,0.3);
    border-color: #f97316;
  }
`;

// 可搜索的人员选择器（Popover + Command）
function SearchableUserSelect({
  value,
  onChange,
  onSelectFull,
  users,
  placeholder,
}: {
  value: string;
  onChange: (name: string) => void;
  onSelectFull?: (user: { id: string; name: string; phone?: string; position?: string; email?: string }) => void;
  users: { id: string; name: string; phone?: string; position?: string; email?: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = search
    ? users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
    : users;

  const selectedUser = users.find((u) => u.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between text-sm font-normal"
        >
          {selectedUser?.name || (
            <span className="text-muted-foreground">{placeholder || "搜索选择人员..."}</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="搜索人员..."
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList className="max-h-[200px]">
            <CommandEmpty className="py-2 text-center text-sm">未找到匹配人员</CommandEmpty>
            <CommandGroup>
              {filtered.map((u) => (
                <CommandItem
                  key={u.id}
                  value={u.id}
                  onSelect={() => {
                    onChange(u.name);
                    onSelectFull?.(u);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="text-sm"
                >
                  {u.name}
                  {u.phone && <span className="ml-2 text-xs text-slate-400">{u.phone}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Section 颜色配置
const SECTION_COLORS: Record<string, { title: string; focus: string; bg: string }> = {
  blue:   { title: "text-blue-600",   focus: "focus:ring-blue-500 focus:border-blue-500",   bg: "bg-blue-50/50" },
  purple: { title: "text-violet-600", focus: "focus:ring-violet-500 focus:border-violet-500", bg: "bg-violet-50/50" },
  green:  { title: "text-emerald-600",focus: "focus:ring-emerald-500 focus:border-emerald-500", bg: "bg-emerald-50/50" },
  indigo: { title: "text-indigo-600", focus: "focus:ring-indigo-500 focus:border-indigo-500", bg: "bg-indigo-50/50" },
  pink:   { title: "text-pink-600",   focus: "focus:ring-pink-500 focus:border-pink-500",   bg: "bg-pink-50/50" },
  cyan:   { title: "text-cyan-600",   focus: "focus:ring-cyan-500 focus:border-cyan-500",   bg: "bg-cyan-50/50" },
  amber:  { title: "text-amber-600",  focus: "focus:ring-amber-500 focus:border-amber-500",  bg: "bg-amber-50/50" },
  slate:  { title: "text-slate-600",  focus: "focus:ring-slate-500 focus:border-slate-500",  bg: "bg-slate-50/70" },
  orange: { title: "text-orange-600", focus: "focus:ring-orange-500 focus:border-orange-500", bg: "bg-orange-50/50" },
};

// 折叠面板组件
function Section({
  title,
  icon,
  count,
  defaultOpen = false,
  color = "blue",
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
  color?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const c = SECTION_COLORS[color] || SECTION_COLORS.blue;
  return (
    <div className={`border rounded-lg overflow-hidden section-color-${color} ${c.bg}`}>
      <div className="min-w-0">
        <button
          type="button"
          className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:brightness-95`}
          onClick={() => setOpen(!open)}
        >
          <div className="flex items-center gap-2.5">
            {icon}
            <span className={`font-semibold text-sm ${c.title}`}>{title}</span>
            {count !== undefined && count > 0 && (
              <Badge variant="secondary" className="text-xs h-5">
                {count}
              </Badge>
            )}
          </div>
          <svg
            className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && <div className="px-5 pb-5 pt-1 space-y-4">{children}</div>}
      </div>
    </div>
  );
}
function Required() {
  return <span className="text-red-500 ml-0.5">*</span>;
}

// 带颜色的输入框
function ColorInput({ color = "blue", ...props }: React.ComponentProps<typeof Input> & { color?: string }) {
  const c = SECTION_COLORS[color] || SECTION_COLORS.blue;
  return <Input className={`${c.focus}`} {...props} />;
}

// 带颜色的文本域
function ColorTextarea({ color = "blue", ...props }: React.HTMLAttributes<HTMLTextAreaElement> & { color?: string }) {
  const c = SECTION_COLORS[color] || SECTION_COLORS.blue;
  return <textarea className={`w-full min-h-[80px] p-3 border rounded-md resize-none text-sm focus:outline-none focus:ring-2 ${c.focus}`} {...props} />;
}

export function ProjectForm({
  open,
  onOpenChange,
  onSuccess,
  projectTypes,
  projectStages,
  memberRoles,
  productModules,
  users,
  initialData,
}: ProjectFormProps) {
  const isEditMode = !!initialData?.id;
  // 注入聚焦样式
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = sectionFocusStyles;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
  // 基本信息
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [projectType, setProjectType] = useState("");
  const [projectStage, setProjectStage] = useState("");
  const [projectStatus, setProjectStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [roleSales, setRoleSales] = useState("");
  const [rolePresales, setRolePresales] = useState("");
  const [roleMarketProduct, setRoleMarketProduct] = useState("");
  const [roleProjectManager, setRoleProjectManager] = useState("");

  const [description, setDescription] = useState("");

  // 时间信息
  const [entryDate, setEntryDate] = useState("");
  const [initialAcceptanceDate, setInitialAcceptanceDate] = useState("");
  const [finalAcceptanceDate, setFinalAcceptanceDate] = useState("");

  // 客户信息
  const [companyName, setCompanyName] = useState("");
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([
    { id: "1", name: "", phone: "", email: "", position: "" },
  ]);

  // 客户位置
  const [province, setProvince] = useState("");
  const [provinceOpen, setProvinceOpen] = useState(false);
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [town, setTown] = useState("");
  const [village, setVillage] = useState("");
  const [longitude, setLongitude] = useState("");
  const [latitude, setLatitude] = useState("");

  // 学校照片
  const [schoolPhotos, setSchoolPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 客户类型和部署模式
  const [selectedCustomerTypes, setSelectedCustomerTypes] = useState<string[]>([]);
  const [deploymentMode, setDeploymentMode] = useState("");
  const [customerTypes, setCustomerTypes] = useState<{ code: string; name: string }[]>([]);
  const [deploymentModes, setDeploymentModes] = useState<{ code: string; name: string }[]>([]);
  const [projectStatuses, setProjectStatuses] = useState<{ code: string; name: string }[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<{ code: string; name: string }[]>([]);

  // 渠道信息
  const [channelCompanies, setChannelCompanies] = useState<ChannelCompany[]>([]);

  // 项目成员
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  // 采购模块
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // 采购金额
  const [procurementAmount, setProcurementAmount] = useState("");
  const [softwareAmount, setSoftwareAmount] = useState("");
  const [hardwareAmount, setHardwareAmount] = useState("");
  const [procurementSearch, setProcurementSearch] = useState("");

  // 采购模块 Excel 导入文件引用
  const procurementFileRef = useRef<HTMLInputElement>(null);

  // 不匹配模块弹窗
  const [showUnmatchedDialog, setShowUnmatchedDialog] = useState(false);
  const [unmatchedNames, setUnmatchedNames] = useState<string[]>([]);

  // 项目信息 Excel 导入文件引用
  const projectImportFileRef = useRef<HTMLInputElement>(null);

  // 下载项目导入模板
  const handleDownloadProjectTemplate = async () => {
    try {
      const ExcelJS = await import("exceljs");
      const Excel = (ExcelJS as any).default || ExcelJS;
      const wb = new Excel.Workbook();

      // Sheet 1: 项目信息（字段名 + 值）
      const fields: { label: string; options?: string[] }[] = [
        { label: "项目名称" },
        { label: "项目编号" },
        { label: "项目类型", options: projectTypes.map((t) => t.name) },
        { label: "项目阶段", options: projectStages.map((s) => s.name) },
        { label: "项目状态", options: projectStatuses.map((s) => s.name) },
        { label: "部门" },
        { label: "销售负责人" },
        { label: "售前负责人" },
        { label: "市场产品负责人" },
        { label: "项目经理" },
        { label: "客户类型", options: customerTypes.map((t) => t.name) },
        { label: "部署模式", options: deploymentModes.map((m) => m.name) },
        { label: "项目描述" },
        { label: "进场日期(YYYY-MM-DD)" },
        { label: "初验日期(YYYY-MM-DD)" },
        { label: "终验日期(YYYY-MM-DD)" },
        { label: "客户公司名称" },
        { label: "联系人姓名(多个用、分隔)" },
        { label: "联系人电话(多个用、分隔)" },
        { label: "联系人职务(多个用、分隔)" },
        { label: "省" },
        { label: "市" },
        { label: "区/县" },
        { label: "镇/街道" },
        { label: "村/社区" },
        { label: "经度" },
        { label: "纬度" },
        { label: "渠道公司名称(多个用、分隔)" },
        { label: "渠道联系人(多个用、分隔)" },
        { label: "渠道电话(多个用、分隔)" },
        { label: "项目成员姓名(多个用、分隔)" },
        { label: "项目成员角色(多个用、分隔)" },
        { label: "采购总金额(元)" },
        { label: "软件金额(元)" },
        { label: "硬件金额(元)" },
      ];

      const ws1 = wb.addWorksheet("项目信息");
      ws1.columns = [
        { header: "字段", key: "label", width: 22 },
        { header: "值", key: "value", width: 42 },
      ];
      // Style header
      ws1.getRow(1).font = { bold: true };
      ws1.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };

      const dateFields = new Set(["进场日期(YYYY-MM-DD)", "初验日期(YYYY-MM-DD)", "终验日期(YYYY-MM-DD)"]);

      fields.forEach((f, i) => {
        const row = i + 2;
        ws1.getCell(row, 1).value = f.label;
        ws1.getCell(row, 2).value = "";
        if (f.options && f.options.length > 0) {
          ws1.getCell(row, 2).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [`"${f.options.join(",")}"`],
          };
          ws1.getCell(row, 2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F8FF" } };
          ws1.getCell(row, 2).note = { texts: [{ text: "点击选择" }] };
        }
        if (dateFields.has(f.label)) {
          ws1.getCell(row, 2).numFmt = "yyyy-mm-dd";
        }
      });

      // Sheet 2: 选项说明
      const optionFields = fields.filter((f) => f.options && f.options.length > 0);
      if (optionFields.length > 0) {
        const ws2 = wb.addWorksheet("选项说明");
        ws2.columns = [
          { header: "字段", key: "label", width: 18 },
          { header: "可选值（用 / 分隔）", key: "options", width: 60 },
        ];
        ws2.getRow(1).font = { bold: true };
        ws2.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3E0" } };
        optionFields.forEach((f, i) => {
          const row = i + 2;
          ws2.getCell(row, 1).value = f.label;
          ws2.getCell(row, 2).value = f.options!.join(" / ");
        });
      }

      // Sheet 3: 采购模块
      const ws3 = wb.addWorksheet("采购模块");
      ws3.columns = [
        { header: "模块名称", key: "module", width: 30 },
      ];
      ws3.getRow(1).font = { bold: true };
      ws3.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "项目导入模板.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("模板下载成功");
    } catch (e) {
      toast.error("下载模板失败: " + String(e));
    }
  };

  // 从 Excel 导入项目信息
  const handleImportProjectExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const XLSX_dyn = await import("xlsx");
      const xlsxLib = (XLSX_dyn as any).default || XLSX_dyn;
      const data = await file.arrayBuffer();
      const wb = xlsxLib.read(data, { type: "array" });

      // 读取项目信息 sheet
      const sheet1 = wb.Sheets["项目信息"] || wb.Sheets[wb.SheetNames[0]];
      const rows = xlsxLib.utils.sheet_to_json(sheet1, { header: 1, defval: "", raw: false }) as string[][];

      // 建立字段映射：label → value
      const map = new Map<string, string>();
      for (const row of rows) {
        if (row[0]) map.set(String(row[0]).trim(), String(row[1] || "").trim());
      }

      const get = (label: string) => map.get(label) || "";

      // 解析并填充表单
      setProjectName(get("项目名称"));
      setProjectCode(get("项目编号").replace(/[^a-z0-9_]/g, ""));

      // 按名称查找 code
      const typeMatch = projectTypes.find(t => t.name === get("项目类型"));
      if (typeMatch) setProjectType(typeMatch.code);
      const stageMatch = projectStages.find(s => s.name === get("项目阶段"));
      if (stageMatch) setProjectStage(stageMatch.code);
      const statusMatch = projectStatuses.find(s => s.name === get("项目状态"));
      if (statusMatch) setProjectStatus(statusMatch.code);

      setDepartment(get("部门"));
      setRoleSales(get("销售负责人"));
      setRolePresales(get("售前负责人"));
      setRoleMarketProduct(get("市场产品负责人"));
      setRoleProjectManager(get("项目经理"));

      // 客户类型（多选，用、分隔）
      const ctStr = get("客户类型");
      if (ctStr) {
        const ctNames = ctStr.split(/[、,，]/).map(s => s.trim()).filter(Boolean);
        const ctCodes = ctNames.map(n => customerTypes.find(t => t.name === n)?.code).filter(Boolean) as string[];
        if (ctCodes.length > 0) setSelectedCustomerTypes(ctCodes);
      }

      const dmMatch = deploymentModes.find(m => m.name === get("部署模式"));
      if (dmMatch) setDeploymentMode(dmMatch.code);
      setDescription(get("项目描述"));

      // 日期标准化：将 Excel 可能的各种日期格式转为 YYYY-MM-DD
      const normalizeDate = (val: string): string => {
        if (!val) return "";
        // 已经是 YYYY-MM-DD 格式
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        // 尝试解析各种格式：M/D/YY, MM/DD/YYYY, YYYY/MM/DD 等
        const cleaned = val.replace(/\//g, "-").replace(/\s+/g, "");
        const d = new Date(cleaned);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${dd}`;
        }
        return val; // 无法解析则原样返回
      };
      setEntryDate(normalizeDate(get("进场日期(YYYY-MM-DD)")));
      setInitialAcceptanceDate(normalizeDate(get("初验日期(YYYY-MM-DD)")));
      setFinalAcceptanceDate(normalizeDate(get("终验日期(YYYY-MM-DD)")));

      setCompanyName(get("客户公司名称"));
      const cpNames = get("联系人姓名(多个用、分隔)").split(/[、,，]/).map(s => s.trim()).filter(Boolean);
      const cpPhones = get("联系人电话(多个用、分隔)").split(/[、,，]/).map(s => s.trim()).filter(Boolean);
      const cpPositions = get("联系人职务(多个用、分隔)").split(/[、,，]/).map(s => s.trim()).filter(Boolean);
      if (cpNames.length > 0) {
        const contacts = cpNames.map((name, i) => ({
          id: String(Date.now()) + i,
          name,
          phone: cpPhones[i] || "",
          position: cpPositions[i] || "",
          email: "",
        }));
        setContactPersons(contacts);
      }

      setProvince(get("省"));
      setCity(get("市"));
      setDistrict(get("区/县"));
      setTown(get("镇/街道"));
      setVillage(get("村/社区"));
      setLongitude(get("经度"));
      setLatitude(get("纬度"));

      const chNames = get("渠道公司名称(多个用、分隔)").split(/[、,，]/).map(s => s.trim()).filter(Boolean);
      const chContacts = get("渠道联系人(多个用、分隔)").split(/[、,，]/).map(s => s.trim()).filter(Boolean);
      const chPhones = get("渠道电话(多个用、分隔)").split(/[、,，]/).map(s => s.trim()).filter(Boolean);
      if (chNames.length > 0) {
        const channels = chNames.map((name, i) => ({
          id: String(Date.now()) + i,
          company_name: name,
          contact_person: chContacts[i] || "",
          contact_phone: chPhones[i] || "",
          remark: "",
        }));
        setChannelCompanies(channels);
      }

      const mNames = get("项目成员姓名(多个用、分隔)").split(/[、,，]/).map(s => s.trim()).filter(Boolean);
      const mRoles = get("项目成员角色(多个用、分隔)").split(/[、,，]/).map(s => s.trim()).filter(Boolean);
      if (mNames.length > 0) {
        const members = mNames.map((name, i) => ({
          id: String(Date.now()) + i,
          name,
          role_type: mRoles[i] || "",
          user_id: "",
          phone: "",
        }));
        setProjectMembers(members);
      }

      const procAmt = get("采购总金额(元)");
      if (procAmt) setProcurementAmount(procAmt);
      const swAmt = get("软件金额(元)");
      if (swAmt) setSoftwareAmount(swAmt);
      const hwAmt = get("硬件金额(元)");
      if (hwAmt) setHardwareAmount(hwAmt);

      // 读取采购模块 sheet
      if (wb.SheetNames.length > 1) {
        const sheet2 = wb.Sheets["采购模块"] || wb.Sheets[wb.SheetNames[1]];
        const modRows = xlsxLib.utils.sheet_to_json(sheet2, { defval: "", raw: false }) as Record<string, string>[];
        const matchedCodes: string[] = [];
        const unmatchedList: string[] = [];
        for (const row of modRows) {
          const name = (row["模块名称"] || "").toString().trim();
          if (!name) continue;
          const matched = productModules.find((m) => m.module_name === name);
          if (matched) {
            matchedCodes.push(matched.module_code);
          } else {
            unmatchedList.push(name);
          }
        }
        if (matchedCodes.length > 0) {
          setSelectedModules(matchedCodes);
        }
        if (unmatchedList.length > 0) {
          setUnmatchedNames(unmatchedList);
          setShowUnmatchedDialog(true);
        }
      }

      toast.success("项目信息导入完成");
    } catch (err) {
      toast.error("导入失败: " + String(err));
    }
    if (projectImportFileRef.current) {
      projectImportFileRef.current.value = "";
    }
  };

  // 对接信息
  const [integrationList, setIntegrationList] = useState<IntegrationItem[]>([]);
  const [hasIntegration, setHasIntegration] = useState(false);
  const [devIntegrationTypes, setDevIntegrationTypes] = useState<{ code: string; name: string }[]>([]);

  // 定制开发
  const [hasCustomDev, setHasCustomDev] = useState(false);
  const [customDevItems, setCustomDevItems] = useState<CustomDevItem[]>([]);

  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTypeStageConfirm, setShowTypeStageConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<Record<string, unknown> | null>(null);
  const [typeStageChangeInfo, setTypeStageChangeInfo] = useState<{ oldType: string; oldStage: string; newType: string; newStage: string; oldTypeName: string; newTypeName: string; oldStageName: string; newStageName: string } | null>(null);

  // 编辑模式：填充表单数据
  useEffect(() => {
    if (open && initialData) {
      const d = initialData as Record<string, unknown>;
      setProjectName((d.project_name as string) || "");
      setProjectCode((d.project_code as string) || "");
      setProjectType((d.project_type as string) || "");
      setProjectStage((d.project_stage as string) || "");
      setProjectStatus((d.project_status as string) || (d.status as string) || "");
      setDepartment((d.department as string) || "");
      setRoleSales((d.role_sales as string) || "");
      setRolePresales((d.role_presales as string) || "");
      setRoleMarketProduct((d.role_market_product as string) || "");
      setRoleProjectManager((d.role_project_manager as string) || "");
      setDescription((d.description as string) || "");
      setEntryDate((d.entry_date as string) || "");
      setInitialAcceptanceDate((d.initial_acceptance_date as string) || "");
      setFinalAcceptanceDate((d.final_acceptance_date as string) || "");

      // 客户信息
      const ci = d.customer_info as Record<string, unknown> | null;
      if (ci) {
        setCompanyName((ci.company_name as string) || "");
        const cps = ci.contact_persons as Array<Record<string, string>> | null;
        if (cps && cps.length > 0) {
          setContactPersons(cps.map(cp => ({ id: cp.id || "", name: cp.name || "", phone: cp.phone || "", position: cp.position || "", email: cp.email || "" })));
        }
      }

      // 客户位置
      const cl = d.customer_location as Record<string, string> | null;
      if (cl) {
        setProvince(cl.province || "");
        setCity(cl.city || "");
        setDistrict(cl.district || "");
        setTown(cl.town || "");
        setVillage(cl.village || "");
      }
      setLongitude((d.longitude as string) || "");
      setLatitude((d.latitude as string) || "");

      // 采购模块
      const pm = d.procurement_modules;
      if (Array.isArray(pm)) {
        setSelectedModules(pm as string[]);
      }

      // 采购金额
      setProcurementAmount(d.procurement_amount != null ? String(d.procurement_amount) : "");
      setSoftwareAmount(d.software_amount != null ? String(d.software_amount) : "");
      setHardwareAmount(d.hardware_amount != null ? String(d.hardware_amount) : "");

      // 客户类型 & 部署模式
      const ct = d.customer_type;
      if (Array.isArray(ct)) {
        setSelectedCustomerTypes(ct as string[]);
      } else if (typeof ct === "string" && ct) {
        // 尝试 JSON 数组格式 ["junior","senior"]，兼容旧逗号分隔格式
        try {
          const parsed = JSON.parse(ct);
          if (Array.isArray(parsed)) {
            setSelectedCustomerTypes(parsed as string[]);
          } else {
            setSelectedCustomerTypes(ct.split(",").map((s: string) => s.trim()).filter(Boolean));
          }
        } catch {
          setSelectedCustomerTypes(ct.split(",").map((s: string) => s.trim()).filter(Boolean));
        }
      }
      setDeploymentMode((d.deployment_mode as string) || "");

      // 渠道信息
      const ch = d.channel_info as Array<Record<string, string>> | null;
      if (ch && ch.length > 0) {
        setChannelCompanies(ch.map(c => ({ id: c.id || "", company_name: c.company_name || "", contact_person: c.contact_person || "", contact_phone: c.contact_phone || "", remark: c.remark || "" })));
      }

      // 学校照片
      const sp = d.school_photos;
      if (Array.isArray(sp)) {
        setSchoolPhotos(sp as string[]);
      }

      // 对接信息
      const il = d.integration_list as Array<Record<string, unknown>> | null;
      if (il && il.length > 0) {
        setHasIntegration(true);
        setIntegrationList(il.map((item) => ({
          id: (item.id as string) || "",
          vendor_name: (item.vendor_name as string) || "",
          product_module: (item.product_module as string) || "",
          integration_type: (item.integration_type as string) || (item.category as string) || "",
          brief_description: (item.brief_description as string) || (item.description as string) || "",
          in_contract: (item.in_contract as string) || "是",
          contract_note: (item.contract_note as string) || "",
          our_req_contact: (item.our_req_contact as string) || (item.dev_leader as string) || "",
          our_req_contact_phone: (item.our_req_contact_phone as string) || (item.dev_contact as string) || "",
          our_product_contact: (item.our_product_contact as string) || "",
          our_product_contact_phone: (item.our_product_contact_phone as string) || "",
          our_dev_contact: (item.our_dev_contact as string) || "",
          our_dev_contact_phone: (item.our_dev_contact_phone as string) || "",
          our_responsibility: (item.our_responsibility as string) || "",
          their_req_contact: (item.their_req_contact as string) || (item.coop_leader as string) || "",
          their_req_contact_phone: (item.their_req_contact_phone as string) || (item.coop_contact as string) || "",
          their_req_contact_position: (item.their_req_contact_position as string) || (item.coop_position as string) || "",
          their_req_contact_note: (item.their_req_contact_note as string) || "",
          their_product_contact: (item.their_product_contact as string) || "",
          their_product_contact_phone: (item.their_product_contact_phone as string) || "",
          their_product_contact_position: (item.their_product_contact_position as string) || "",
          their_product_contact_note: (item.their_product_contact_note as string) || "",
          their_dev_contact: (item.their_dev_contact as string) || "",
          their_dev_contact_phone: (item.their_dev_contact_phone as string) || "",
          their_dev_contact_position: (item.their_dev_contact_position as string) || "",
          their_dev_contact_note: (item.their_dev_contact_note as string) || "",
          their_responsibility: (item.their_responsibility as string) || "",
          integration_docs: (item.integration_docs as IntegrationDoc[]) || [],
          remark: (item.remark as string) || "",
        })));
      }

      // 定制开发信息
      const cd = d.custom_dev_info as Array<Record<string, unknown>> | null;
      if (cd && cd.length > 0) {
        setHasCustomDev(true);
        setCustomDevItems(cd.map((item) => ({
          id: (item.id as string) || "",
          product_module: (item.product_module as string) || "",
          custom_content: (item.custom_content as string) || "",
          in_contract: (item.in_contract as string) || "是",
          contract_note: (item.contract_note as string) || "",
          customer_req_contact: (item.customer_req_contact as string) || "",
          customer_req_contact_phone: (item.customer_req_contact_phone as string) || "",
          customer_req_contact_position: (item.customer_req_contact_position as string) || "",
          customer_req_contact_note: (item.customer_req_contact_note as string) || "",
          internal_req_contact: (item.internal_req_contact as string) || "",
          internal_req_contact_phone: (item.internal_req_contact_phone as string) || "",
          internal_product_contact: (item.internal_product_contact as string) || "",
          internal_product_contact_phone: (item.internal_product_contact_phone as string) || "",
          req_docs: (item.req_docs as IntegrationDoc[]) || [],
          remark: (item.remark as string) || "",
        })));
      }
    } else if (open && !initialData) {
      // 新建模式：重置表单
      setProjectName(""); setProjectCode(""); setProjectType(""); setProjectStage("");
      setProjectStatus(""); setDepartment(""); setRoleSales(""); setRolePresales("");
      setRoleMarketProduct(""); setRoleProjectManager(""); setDescription("");
      setEntryDate(""); setInitialAcceptanceDate(""); setFinalAcceptanceDate("");
      setCompanyName(""); setContactPersons([{ id: "", name: "", phone: "", position: "", email: "" }]);
      setProvince(""); setCity(""); setDistrict(""); setTown(""); setVillage("");
      setLongitude(""); setLatitude(""); setSchoolPhotos([]);
      setSelectedCustomerTypes([]); setDeploymentMode("");
      setChannelCompanies([{ id: "", company_name: "", contact_person: "", contact_phone: "", remark: "" }]);
      setSelectedModules([]); setProcurementAmount(""); setSoftwareAmount(""); setHardwareAmount("");
      setHasIntegration(false); setIntegrationList([]);
    setHasCustomDev(false); setCustomDevItems([]);
    }
  }, [open, initialData]);

  // 加载客户类型和部署模式
  useEffect(() => {
    if (open) {
      fetch("/api/dicts?type=customer_types")
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setCustomerTypes(data.data.filter((item: { is_enabled: boolean; code: string }) => item.is_enabled !== false && item.code).map((item: { code: string; name: string }) => ({ code: item.code, name: item.name })));
          }
        })
        .catch(() => {});

      fetch("/api/dicts?type=deployment_modes")
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setDeploymentModes(data.data.filter((item: { is_enabled: boolean; code: string }) => item.is_enabled !== false && item.code).map((item: { code: string; name: string }) => ({ code: item.code, name: item.name })));
          }
        })
        .catch(() => {});

      fetch("/api/dicts?type=project_statuses")
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setProjectStatuses(data.data.filter((item: { is_enabled: boolean; code: string }) => item.is_enabled !== false && item.code).map((item: { code: string; name: string }) => ({ code: item.code, name: item.name })));
          }
        })
        .catch(() => {});

      fetch("/api/dicts?type=departments")
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setDepartmentOptions(data.data.filter((item: { is_enabled: boolean; name: string }) => item.is_enabled !== false && item.name).map((item: { code: string; name: string }) => ({ code: item.code, name: item.name })));
          }
        })
        .catch(() => {});

      fetch("/api/dicts?type=dev_integration_types")
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setDevIntegrationTypes(
              data.data
                .filter((item: { is_enabled: boolean; code: string }) => item.is_enabled !== false && item.code)
                .map((item: { code: string; name: string }) => ({ code: item.code, name: item.name }))
            );
          }
        })
        .catch(() => {});
    }
  }, [open]);

  // 重置表单
  const resetForm = () => {
    setProjectName("");
    setProjectCode("");
    setProjectType("");
    setProjectStage("");
    setProjectStatus("");
    setDepartment("");
    setRoleSales("");
    setRolePresales("");
    setRoleMarketProduct("");
    setRoleProjectManager("");
    setDescription("");
    setEntryDate("");
    setInitialAcceptanceDate("");
    setFinalAcceptanceDate("");
    setCompanyName("");
    setContactPersons([{ id: "1", name: "", phone: "", email: "", position: "" }]);
    setProvince("");
    setCity("");
    setDistrict("");
    setTown("");
    setVillage("");
    setLongitude("");
    setLatitude("");
    setSchoolPhotos([]);
    setSelectedCustomerTypes([]);
    setDeploymentMode("");
    setChannelCompanies([]);
    setProjectMembers([]);
    setSelectedModules([]);
  };

  // 关闭时重置
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // 照片上传处理
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === "string") {
          setSchoolPhotos((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setSchoolPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // 添加联系人
  const addContactPerson = () => {
    setContactPersons([
      ...contactPersons,
      { id: Date.now().toString(), name: "", phone: "", email: "", position: "" },
    ]);
  };

  // 更新联系人
  const updateContactPerson = (id: string, field: keyof ContactPerson, value: string) => {
    setContactPersons(contactPersons.map((cp) => (cp.id === id ? { ...cp, [field]: value } : cp)));
  };

  // 删除联系人
  const removeContactPerson = (id: string) => {
    if (contactPersons.length > 1) {
      setContactPersons(contactPersons.filter((cp) => cp.id !== id));
    }
  };

  // 添加渠道公司
  const addChannelCompany = () => {
    setChannelCompanies([
      ...channelCompanies,
      {
        id: Date.now().toString(),
        company_name: "",
        contact_person: "",
        contact_phone: "",
        remark: "",
      },
    ]);
  };

  // 更新渠道公司
  const updateChannelCompany = (id: string, field: keyof ChannelCompany, value: string) => {
    setChannelCompanies(channelCompanies.map((cc) => (cc.id === id ? { ...cc, [field]: value } : cc)));
  };

  // 删除渠道公司
  const removeChannelCompany = (id: string) => {
    setChannelCompanies(channelCompanies.filter((cc) => cc.id !== id));
  };

  // 添加项目成员
  const addProjectMember = () => {
    setProjectMembers([
      ...projectMembers,
      { id: Date.now().toString(), user_id: "", name: "", role_type: "", phone: "" },
    ]);
  };

  // 更新项目成员
  const updateProjectMember = (id: string, field: keyof ProjectMember, value: string) => {
    setProjectMembers(projectMembers.map((pm) => (pm.id === id ? { ...pm, [field]: value } : pm)));
  };

  // 删除项目成员
  const removeProjectMember = (id: string) => {
    setProjectMembers(projectMembers.filter((pm) => pm.id !== id));
  };

  // 切换采购模块选择
  const toggleModule = (moduleCode: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleCode) ? prev.filter((m) => m !== moduleCode) : [...prev, moduleCode]
    );
  };

  // 验证项目编号格式（仅小写英文+数字）
  const validateProjectCode = (code: string): boolean => {
    return /^[a-z0-9_]+$/.test(code);
  };

  // 添加对接信息
  const addIntegration = () => {
    setIntegrationList([
      ...integrationList,
      {
        id: Date.now().toString(),
        vendor_name: "",
        product_module: "",
        integration_type: "",
        brief_description: "",
        in_contract: "是",
        contract_note: "",
        our_req_contact: "",
        our_req_contact_phone: "",
        our_product_contact: "",
        our_product_contact_phone: "",
        our_dev_contact: "",
        our_dev_contact_phone: "",
        our_responsibility: "",
        their_req_contact: "",
        their_req_contact_phone: "",
        their_req_contact_position: "",
        their_req_contact_note: "",
        their_product_contact: "",
        their_product_contact_phone: "",
        their_product_contact_position: "",
        their_product_contact_note: "",
        their_dev_contact: "",
        their_dev_contact_phone: "",
        their_dev_contact_position: "",
        their_dev_contact_note: "",
        their_responsibility: "",
        integration_docs: [],
        remark: "",
      },
    ]);
  };

  const removeIntegration = (id: string) => {
    setIntegrationList(integrationList.filter((item) => item.id !== id));
  };

  const updateIntegration = (id: string, field: keyof IntegrationItem, value: string | IntegrationDoc[]) => {
    setIntegrationList(
      integrationList.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // 添加上传文件到对接信息
  const addIntegrationDoc = (itemId: string, file: File | null, linkUrl?: string) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === "string") {
          const doc: IntegrationDoc = { id: Date.now().toString(), name: file.name, type: "file", data: result };
          setIntegrationList((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, integration_docs: [...item.integration_docs, doc] } : item
            )
          );
        }
      };
      reader.readAsDataURL(file);
    } else if (linkUrl) {
      const doc: IntegrationDoc = { id: Date.now().toString(), name: linkUrl, type: "link", url: linkUrl };
      setIntegrationList((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, integration_docs: [...item.integration_docs, doc] } : item
        )
      );
    }
  };

  const removeIntegrationDoc = (itemId: string, docId: string) => {
    setIntegrationList((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, integration_docs: item.integration_docs.filter((d) => d.id !== docId) }
          : item
      )
    );
  };

  // 定制开发 CRUD
  const addCustomDev = () => {
    setCustomDevItems([
      ...customDevItems,
      {
        id: Date.now().toString(),
        product_module: "",
        custom_content: "",
        in_contract: "是",
        contract_note: "",
        customer_req_contact: "",
        customer_req_contact_phone: "",
        customer_req_contact_position: "",
        customer_req_contact_note: "",
        internal_req_contact: "",
        internal_req_contact_phone: "",
        internal_product_contact: "",
        internal_product_contact_phone: "",
        req_docs: [],
        remark: "",
      },
    ]);
  };

  const removeCustomDev = (id: string) => {
    setCustomDevItems(customDevItems.filter((item) => item.id !== id));
  };

  const updateCustomDev = (id: string, field: keyof CustomDevItem, value: string | IntegrationDoc[]) => {
    setCustomDevItems(
      customDevItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addCustomDevDoc = (itemId: string, file: File | null, linkUrl?: string) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === "string") {
          const doc: IntegrationDoc = { id: Date.now().toString(), name: file.name, type: "file", data: result };
          setCustomDevItems((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, req_docs: [...item.req_docs, doc] } : item
            )
          );
        }
      };
      reader.readAsDataURL(file);
    } else if (linkUrl) {
      const doc: IntegrationDoc = { id: Date.now().toString(), name: linkUrl, type: "link", url: linkUrl };
      setCustomDevItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, req_docs: [...item.req_docs, doc] } : item
        )
      );
    }
  };

  const removeCustomDevDoc = (itemId: string, docId: string) => {
    setCustomDevItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, req_docs: item.req_docs.filter((d) => d.id !== docId) }
          : item
      )
    );
  };

  // 获取完整地址
  const getFullAddress = () => {
    return [province, city, district, town, village].filter(Boolean).join(" / ") || "-";
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!projectName.trim()) {
      toast.error("请输入项目名称");
      return;
    }
    if (!projectCode.trim()) {
      toast.error("请输入项目编号");
      return;
    }
    if (!validateProjectCode(projectCode)) {
      toast.error("项目编号只能包含小写英文、数字和下划线");
      return;
    }
    if (!projectType) {
      toast.error("请选择项目类型");
      return;
    }
    if (!projectStage) {
      toast.error("请选择项目阶段");
      return;
    }
    if (!projectStatus) {
      toast.error("请选择项目状态");
      return;
    }
    if (selectedModules.length === 0) {
      toast.error("请至少选择一个采购模块");
      return;
    }

    const requestBody = {
      project_name: projectName,
      project_code: projectCode,
      project_type: projectType,
      project_stage: projectStage,
      project_status: projectStatus || null,
      department,
      role_sales: roleSales,
      role_presales: rolePresales,
      role_market_product: roleMarketProduct,
      role_project_manager: roleProjectManager,
      description,
      entry_date: entryDate || null,
      initial_acceptance_date: initialAcceptanceDate || null,
      final_acceptance_date: finalAcceptanceDate || null,
      customer_info: {
        company_name: companyName,
        contact_persons: contactPersons.filter((cp) => cp.name || cp.phone),
      },
      customer_location: {
        province,
        city,
        district,
        town,
        village,
      },
      longitude: longitude || null,
      latitude: latitude || null,
      school_photos: schoolPhotos.length > 0 ? schoolPhotos : null,
      customer_type: selectedCustomerTypes.length > 0 ? selectedCustomerTypes : null,
      deployment_mode: deploymentMode || null,
      channel_info: channelCompanies.filter((cc) => cc.company_name),
      members: projectMembers.filter((pm) => pm.name),
      procurement_modules: selectedModules,
      procurement_amount: procurementAmount ? parseFloat(procurementAmount) : null,
      software_amount: softwareAmount ? parseFloat(softwareAmount) : null,
      hardware_amount: hardwareAmount ? parseFloat(hardwareAmount) : null,
      integration_list: hasIntegration ? integrationList.filter((i) => i.vendor_name) : [],
      custom_dev_info: hasCustomDev ? customDevItems.filter((c) => c.product_module) : [],
    };

    // 编辑模式下检测类型/阶段/状态是否变更
    const isEdit = !!initialData;
    if (isEdit) {
      const oldType = (initialData as Record<string, unknown>).project_type as string;
      const oldStage = (initialData as Record<string, unknown>).project_stage as string;
      const oldStatus = (initialData as Record<string, unknown>).project_status as string;
      const typeChanged = oldType !== projectType;
      const stageChanged = oldStage !== projectStage;
      const statusChanged = oldStatus !== (projectStatus || null);

      if (typeChanged || stageChanged) {
        setPendingSubmitData(requestBody);
        const oldTypeName = projectTypes.find(t => t.code === oldType)?.name || oldType;
        const newTypeName = projectTypes.find(t => t.code === projectType)?.name || projectType;
        const oldStageName = projectStages.find(s => s.code === oldStage)?.name || oldStage;
        const newStageName = projectStages.find(s => s.code === projectStage)?.name || projectStage;
        setTypeStageChangeInfo({ oldType, oldStage, newType: projectType, newStage: projectStage, oldTypeName, newTypeName, oldStageName, newStageName });
        setShowTypeStageConfirm(true);
        return;
      }

      // 仅状态变更：静默同步 schema（无需确认弹窗）
      if (statusChanged) {
        await doSubmit(requestBody, true);
        return;
      }
    }

    await doSubmit(requestBody);
  };

  // 实际提交
  const confirmTypeStageChange = () => {
    if (pendingSubmitData) {
      const body = { ...pendingSubmitData, _sync_schema: true };
      doSubmit(body, true);
    }
    setShowTypeStageConfirm(false);
  };

  const doSubmit = async (requestBody: Record<string, unknown>, syncSchema = false) => {
    setIsSubmitting(true);
    try {
      const isEdit = !!initialData;
      const url = isEdit ? `/api/projects/${(initialData as Record<string, unknown>).id}` : "/api/projects";
      const method = isEdit ? "PUT" : "POST";
      if (isEdit && initialData) {
        requestBody.id = (initialData as Record<string, unknown>).id;
      }
      if (syncSchema) {
        requestBody._sync_schema = true;
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        toast.success(isEdit ? "项目更新成功" : "项目创建成功");
        if (result.warning) {
          toast.warning(result.warning, { duration: 8000 });
        }
        onOpenChange(false);
        onSuccess?.();
      } else {
        const errMsg = result.error || (isEdit ? "更新失败" : "创建失败");
        if (errMsg.includes("duplicate key") || errMsg.includes("unique constraint")) {
          toast.error("项目编号已存在，请更换项目编号");
        } else {
          toast.error(errMsg);
        }
      }
    } catch (error) {
      console.error(initialData ? "更新项目失败:" : "创建项目失败:", error);
      toast.error(initialData ? "更新项目失败，请稍后重试" : "创建项目失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 有效数据统计
  const validContacts = contactPersons.filter((cp) => cp.name || cp.phone);
  const validChannels = channelCompanies.filter((cc) => cc.company_name);
  const validMembers = projectMembers.filter((pm) => pm.name);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* 顶部导航栏 */}
      <div className="h-14 border-b flex items-center justify-between px-6 shrink-0 bg-white">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回项目列表
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <h1 className="text-base font-semibold flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-600" />
            {initialData ? "编辑项目" : "新建项目"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {!initialData && (
            <>
              <button
                type="button"
                onClick={handleDownloadProjectTemplate}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200"
              >
                <Download className="h-3.5 w-3.5" />下载模板
              </button>
              <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200 cursor-pointer">
                <Upload className="h-3.5 w-3.5" />导入Excel
                <input
                  ref={projectImportFileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleImportProjectExcel}
                />
              </label>
            </>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-1.5">
            <Save className="h-4 w-4" />
            {isSubmitting ? (initialData ? "保存中..." : "创建中...") : (initialData ? "保存修改" : "创建项目")}
          </Button>
        </div>
      </div>

      {/* 主体内容 - 左侧表单 + 右侧预览 */}
      <div className="flex flex-1 min-h-0">
        {/* 左侧表单区 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[900px] mx-auto p-8 space-y-5">
            {/* 基本信息 */}
            <Section
              title="基本信息"
              icon={<Type className="h-4 w-4" />}
              color="blue"
              defaultOpen={true}
            >
              <div className="grid grid-cols-4 gap-5">
                <div className="col-span-2 space-y-1.5">
                  <Label>
                    项目名称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="请输入项目名称"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>
                    项目编号 <span className="text-red-500">*</span>
                  </Label>
                  {isEditMode ? (
                    <Input
                      value={projectCode}
                      disabled
                      className="bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  ) : (
                    <Input
                      value={projectCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-z0-9_]/g, "");
                        setProjectCode(val);
                      }}
                      placeholder="小写英文+下划线+数字"
                    />
                  )}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>客户名称</Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="请输入客户名称"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    项目类型 <span className="text-red-500">*</span>
                  </Label>
                  <Select value={projectType} onValueChange={setProjectType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="请选择项目类型" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.filter(t => t.code).map((type) => (
                        <SelectItem key={type.code} value={type.code}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    项目阶段 <span className="text-red-500">*</span>
                  </Label>
                  <Select value={projectStage} onValueChange={setProjectStage}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="请选择项目阶段" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectStages.filter(s => s.code).map((stage) => (
                        <SelectItem key={stage.code} value={stage.code}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    项目状态 <span className="text-red-500">*</span>
                  </Label>
                  <Select value={projectStatus} onValueChange={setProjectStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="请选择项目状态" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectStatuses.filter(s => s.code).map((status) => (
                        <SelectItem key={status.code} value={status.code}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>部门</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="请选择部门" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentOptions.filter(d => d.name).map((dept) => (
                        <SelectItem key={dept.code} value={dept.name}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { l: "销售", v: roleSales, s: setRoleSales },
                  { l: "售前", v: rolePresales, s: setRolePresales },
                  { l: "市场产品", v: roleMarketProduct, s: setRoleMarketProduct },
                  { l: "项目经理", v: roleProjectManager, s: setRoleProjectManager },
                ].map((r) => (
                  <div key={r.l} className="space-y-1.5">
                    <Label>{r.l}</Label>
                    <SearchableUserSelect
                      value={r.v}
                      onChange={r.s}
                      users={users.filter((u) => u.name)}
                      placeholder="选择人员"
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label>客户类型</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full flex items-center justify-between min-h-[2.25rem] rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground">
                        {selectedCustomerTypes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {selectedCustomerTypes.map((code) => (
                              <Badge key={code} variant="secondary" className="text-xs">
                                {customerTypes.find(t => t.code === code)?.name || code}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">请选择客户类型</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-2" align="start">
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {customerTypes.filter(t => t.code).map((type) => {
                          const checked = selectedCustomerTypes.includes(type.code);
                          return (
                            <label
                              key={type.code}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm hover:bg-accent ${checked ? "bg-accent" : ""}`}
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => {
                                  setSelectedCustomerTypes(prev =>
                                    prev.includes(type.code)
                                      ? prev.filter(c => c !== type.code)
                                      : [...prev, type.code]
                                  );
                                }}
                              />
                              {type.name}
                            </label>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label>部署模式</Label>
                  <Select value={deploymentMode} onValueChange={setDeploymentMode}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="请选择部署模式" />
                    </SelectTrigger>
                    <SelectContent>
                      {deploymentModes.filter(m => m.code).map((mode) => (
                        <SelectItem key={mode.code} value={mode.code}>
                          {mode.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>项目描述</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="请输入项目描述"
                  className="w-full min-h-[80px] p-3 border rounded-md resize-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </Section>

            {/* 时间信息 */}
            <Section
              title="时间信息"
              icon={<Calendar className="h-4 w-4 text-cyan-600" />}
              defaultOpen={true}
              color="cyan"
            >
              <div className="grid grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <Label>项目进场时间</Label>
                  <Input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>初验时间</Label>
                  <Input
                    type="date"
                    value={initialAcceptanceDate}
                    onChange={(e) => setInitialAcceptanceDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>终验时间</Label>
                  <Input
                    type="date"
                    value={finalAcceptanceDate}
                    onChange={(e) => setFinalAcceptanceDate(e.target.value)}
                  />
                </div>
              </div>
            </Section>

            {/* 客户信息 */}
            <Section
              title="客户信息"
              icon={<Building className="h-4 w-4 text-green-600" />}
              count={validContacts.length}
              defaultOpen={true}
            >
              {/* 客户位置 */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  客户位置
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="relative">
                    <Input
                      value={province}
                      onChange={(e) => {
                        setProvince(e.target.value);
                        setProvinceOpen(true);
                      }}
                      onFocus={() => setProvinceOpen(true)}
                      placeholder="省/自治区/直辖市"
                      className="pr-6"
                    />
                    {province && (
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        onClick={() => { setProvince(""); setProvinceOpen(false); }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {provinceOpen && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        {PROVINCES.filter(p => !province || p.includes(province) || p.replace(/[省市自治区特别行政区壮族回族维吾尔]/g, "").includes(province)).map((p) => (
                          <button
                            key={p}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            onClick={() => { setProvince(p); setProvinceOpen(false); }}
                          >
                            {p}
                          </button>
                        ))}
                        {PROVINCES.filter(p => !province || p.includes(province) || p.replace(/[省市自治区特别行政区壮族回族维吾尔]/g, "").includes(province)).length === 0 && (
                          <div className="px-3 py-2 text-sm text-slate-400">无匹配结果</div>
                        )}
                      </div>
                    )}
                  </div>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="市"
                  />
                  <Input
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="区/县"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    value={town}
                    onChange={(e) => setTown(e.target.value)}
                    placeholder="镇/乡"
                  />
                  <Input
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="村"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      placeholder="经度"
                    />
                    <Input
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      placeholder="纬度"
                    />
                  </div>
                </div>
              </div>

              {/* 学校照片 */}
              <div className="space-y-3">
                <Label className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-slate-400" />
                  学校照片
                </Label>
                <div className="flex flex-wrap gap-3">
                  {schoolPhotos.map((photo, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-lg border overflow-hidden group">
                      <img src={photo} alt={`照片 ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="text-xs">上传</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              {/* 联系人 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>联系人</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addContactPerson}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> 添加
                  </Button>
                </div>
                {contactPersons.map((cp, index) => (
                  <div key={cp.id} className="p-4 border rounded-lg space-y-3 relative">
                    {contactPersons.length > 1 && (
                      <button
                        type="button"
                        className="absolute right-3 top-3 text-slate-400 hover:text-red-500 transition-colors"
                        onClick={() => removeContactPerson(cp.id)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <div className="text-xs font-medium text-slate-500">联系人 {index + 1}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value={cp.name}
                        onChange={(e) => updateContactPerson(cp.id, "name", e.target.value)}
                        placeholder="姓名"
                      />
                      <Input
                        value={cp.phone}
                        onChange={(e) => updateContactPerson(cp.id, "phone", e.target.value)}
                        placeholder="电话"
                      />
                      <Input
                        value={cp.email}
                        onChange={(e) => updateContactPerson(cp.id, "email", e.target.value)}
                        placeholder="邮箱"
                      />
                      <Input
                        value={cp.position}
                        onChange={(e) => updateContactPerson(cp.id, "position", e.target.value)}
                        placeholder="职位"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* 渠道信息 */}
            <Section
              title="渠道信息"
              icon={<Phone className="h-4 w-4 text-orange-600" />}
              count={validChannels.length}
            >
              <Button type="button" variant="outline" size="sm" onClick={addChannelCompany}>
                <Plus className="h-3.5 w-3.5 mr-1" /> 添加渠道公司
              </Button>
              {channelCompanies.map((cc, index) => (
                <div key={cc.id} className="p-3 border rounded-lg relative group">
                  <button
                    type="button"
                    className="absolute right-2 top-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    onClick={() => removeChannelCompany(cc.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="grid grid-cols-4 gap-3 items-center">
                    <Input
                      value={cc.company_name}
                      onChange={(e) => updateChannelCompany(cc.id, "company_name", e.target.value)}
                      placeholder="公司名称"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={cc.contact_person}
                      onChange={(e) => updateChannelCompany(cc.id, "contact_person", e.target.value)}
                      placeholder="联系人"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={cc.contact_phone}
                      onChange={(e) => updateChannelCompany(cc.id, "contact_phone", e.target.value)}
                      placeholder="联系电话"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={cc.remark}
                      onChange={(e) => updateChannelCompany(cc.id, "remark", e.target.value)}
                      placeholder="备注"
                    />
                  </div>
                </div>
              ))}
              {channelCompanies.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">暂无渠道公司，点击上方按钮添加</div>
              )}
            </Section>

            {/* 项目成员 */}
            <Section
              title="项目成员"
              icon={<Users className="h-4 w-4 text-purple-600" />}
              count={validMembers.length}
            >
              <Button type="button" variant="outline" size="sm" onClick={addProjectMember}>
                <Plus className="h-3.5 w-3.5 mr-1" /> 添加成员
              </Button>
              {projectMembers.map((pm, index) => (
                <div key={pm.id} className="p-4 border rounded-lg space-y-3 relative">
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-slate-400 hover:text-red-500 transition-colors"
                    onClick={() => removeProjectMember(pm.id)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="text-xs font-medium text-slate-500">成员 {index + 1}</div>
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      value={pm.name}
                      onChange={(e) => updateProjectMember(pm.id, "name", e.target.value)}
                      placeholder="姓名"
                    />
                    <Select
                      value={pm.role_type}
                      onValueChange={(v) => updateProjectMember(pm.id, "role_type", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="选择角色" />
                      </SelectTrigger>
                      <SelectContent>
                        {memberRoles.filter(r => r).map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={pm.phone}
                      onChange={(e) => updateProjectMember(pm.id, "phone", e.target.value)}
                      placeholder="联系电话"
                    />
                  </div>
                </div>
              ))}
              {projectMembers.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">暂无项目成员，点击上方按钮添加</div>
              )}
            </Section>

            {/* 采购信息 */}
            <Section
              title="采购信息"
              icon={<ShoppingCart className="h-4 w-4 text-cyan-600" />}
              count={selectedModules.length}
            >
              {/* 采购金额 */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1.5 block">采购总金额（元）</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={procurementAmount}
                    onChange={(e) => setProcurementAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1.5 block">软件金额（元）</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={softwareAmount}
                    onChange={(e) => setSoftwareAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1.5 block">硬件金额（元）</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={hardwareAmount}
                    onChange={(e) => setHardwareAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-600">
                    采购模块 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const XLSX = await import("xlsx");
                          const xlsxLib = (XLSX as any).default || XLSX;
                          const ws = xlsxLib.utils.aoa_to_sheet([["模块名称"]]);
                          ws["!cols"] = [{ wch: 30 }];
                          const wb = xlsxLib.utils.book_new();
                          xlsxLib.utils.book_append_sheet(wb, ws, "采购模块");
                          xlsxLib.writeFile(wb, "采购模块导入模板.xlsx");
                          toast.success("模板下载成功");
                        } catch (e) {
                          toast.error("下载失败: " + String(e));
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 transition-colors border border-cyan-200"
                    >
                      <Download className="h-3.5 w-3.5" />下载模板
                    </button>
                    <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium text-cyan-700 bg-cyan-50 hover:bg-cyan-100 transition-colors border border-cyan-200 cursor-pointer">
                      <Upload className="h-3.5 w-3.5" />导入Excel
                      <input
                        ref={procurementFileRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const XLSX_dyn = await import("xlsx");
                            const xlsxLib = (XLSX_dyn as any).default || XLSX_dyn;
                            const data = await file.arrayBuffer();
                            const wb = xlsxLib.read(data, { type: "array" });
                            const sheetName = wb.SheetNames[0];
                            const ws = wb.Sheets[sheetName];
                            const rows = xlsxLib.utils.sheet_to_json(ws, { defval: "" }) as Record<string, string>[];

                            if (rows.length === 0) {
                              toast.error("Excel 文件中没有数据");
                              return;
                            }

                            const matchedCodes: string[] = [];
                            const unmatchedList: string[] = [];

                            for (const row of rows) {
                              const name = (row["模块名称"] || "").toString().trim();
                              if (!name) continue;
                              const matched = productModules.find(
                                (m) => m.module_name === name
                              );
                              if (matched) {
                                matchedCodes.push(matched.module_code);
                              } else {
                                unmatchedList.push(name);
                              }
                            }

                            if (matchedCodes.length > 0) {
                              setSelectedModules((prev) => {
                                const existing = new Set(prev);
                                matchedCodes.forEach((c) => existing.add(c));
                                return Array.from(existing);
                              });
                            }

                            if (unmatchedList.length > 0) {
                              setUnmatchedNames(unmatchedList);
                              setShowUnmatchedDialog(true);
                            }

                            toast.success(
                              `导入完成：匹配 ${matchedCodes.length} 个模块${unmatchedList.length > 0 ? `，${unmatchedList.length} 个未匹配` : ""}`
                            );
                          } catch (err) {
                            toast.error("导入失败: " + String(err));
                          }
                          if (procurementFileRef.current) {
                            procurementFileRef.current.value = "";
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="mb-3">
                  <Input
                    placeholder="搜索模块名称或产品名称..."
                    value={procurementSearch}
                    onChange={(e) => setProcurementSearch(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                {(() => {
                  const filtered = procurementSearch
                    ? productModules.filter(
                        (m) =>
                          m.module_name.toLowerCase().includes(procurementSearch.toLowerCase()) ||
                          m.product_name.toLowerCase().includes(procurementSearch.toLowerCase())
                      )
                    : productModules;
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-6 text-slate-400 text-sm">
                        {procurementSearch ? "未找到匹配模块" : "暂无可选模块"}
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      {filtered.map((module) => (
                        <label
                          key={module.module_code}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedModules.includes(module.module_code)
                              ? "border-blue-500 bg-blue-50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <Checkbox
                            checked={selectedModules.includes(module.module_code)}
                            onCheckedChange={() => toggleModule(module.module_code)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{module.module_name}</div>
                            <div className="text-xs text-slate-400 truncate">{module.product_name}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </Section>

            {/* 对接信息 */}
            <Section
              title="对接信息"
              icon={<Link className="h-4 w-4 text-indigo-600" />}
              defaultOpen={true}
              count={hasIntegration ? integrationList.filter((i) => i.vendor_name).length : 0}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-slate-700">是否有对接</label>
                  <Select value={hasIntegration ? 'yes' : 'no'} onValueChange={(v) => setHasIntegration(v === 'yes')}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">否</SelectItem>
                      <SelectItem value="yes">是</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {hasIntegration && (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={addIntegration}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> 添加对接信息
                    </Button>
                {integrationList.map((item, index) => (
                  <div key={item.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-b">
                      <span className="text-sm font-medium text-slate-700">
                        对接信息 {index + 1}
                        {item.vendor_name && ` - ${item.vendor_name}`}
                      </span>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        onClick={() => removeIntegration(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-4 space-y-3">
                      {/* 第一行：对接厂商 / 产品模块 / 对接类型 / 对接信息简述 */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">对接厂商 *</label>
                          <Input
                            value={item.vendor_name}
                            onChange={(e) => updateIntegration(item.id, "vendor_name", e.target.value)}
                            placeholder="厂商名称"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">产品模块</label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" role="combobox" className="w-full justify-between text-sm font-normal h-8">
                                {item.product_module || <span className="text-muted-foreground">选择模块...</span>}
                                <Search className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="搜索产品模块..." className="h-9" />
                                <CommandList className="max-h-[200px]">
                                  <CommandEmpty className="py-2 text-center text-sm">未找到</CommandEmpty>
                                  <CommandGroup>
                                    {productModules.map((mod) => (
                                      <CommandItem
                                        key={mod.module_code}
                                        value={mod.module_code}
                                        onSelect={() => updateIntegration(item.id, "product_module", mod.module_name)}
                                        className="text-sm"
                                      >
                                        {mod.module_name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">对接类型</label>
                          <Select value={item.integration_type} onValueChange={(v) => updateIntegration(item.id, "integration_type", v)}>
                            <SelectTrigger className="w-full h-8 text-sm">
                              <SelectValue placeholder="选择类型" />
                            </SelectTrigger>
                            <SelectContent>
                              {devIntegrationTypes.map((t) => (
                                <SelectItem key={t.code} value={t.name}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">对接信息简述</label>
                          <Input
                            value={item.brief_description}
                            onChange={(e) => updateIntegration(item.id, "brief_description", e.target.value)}
                            placeholder="简述"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>

                      {/* 是否在合同内 */}
                      <div className="flex items-center gap-4">
                        <label className="text-xs text-slate-500">是否在合同内</label>
                        <Select value={item.in_contract} onValueChange={(v) => updateIntegration(item.id, "in_contract", v)}>
                          <SelectTrigger className="w-[100px] h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="是">是</SelectItem>
                            <SelectItem value="否">否</SelectItem>
                          </SelectContent>
                        </Select>
                        {item.in_contract === "否" && (
                          <Input
                            value={item.contract_note}
                            onChange={(e) => updateIntegration(item.id, "contract_note", e.target.value)}
                            placeholder="说明不在合同内的原因"
                            className="h-8 text-sm flex-1"
                          />
                        )}
                      </div>

                      {/* 我方信息 */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-slate-600 border-b pb-1">我方信息</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500">我方需求对接人</label>
                            <SearchableUserSelect
                              value={item.our_req_contact}
                              onChange={(name) => updateIntegration(item.id, "our_req_contact", name)}
                              onSelectFull={(u) => updateIntegration(item.id, "our_req_contact_phone", u.phone || "")}
                              users={users.filter(u => u.name)}
                              placeholder="选择人员"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500">联系方式</label>
                            <Input value={item.our_req_contact_phone} onChange={(e) => updateIntegration(item.id, "our_req_contact_phone", e.target.value)} placeholder="自动带出" className="h-8 text-sm bg-slate-50" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500">我方产品负责人</label>
                            <SearchableUserSelect
                              value={item.our_product_contact}
                              onChange={(name) => updateIntegration(item.id, "our_product_contact", name)}
                              onSelectFull={(u) => updateIntegration(item.id, "our_product_contact_phone", u.phone || "")}
                              users={users.filter(u => u.name)}
                              placeholder="选择人员"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500">联系方式</label>
                            <Input value={item.our_product_contact_phone} onChange={(e) => updateIntegration(item.id, "our_product_contact_phone", e.target.value)} placeholder="自动带出" className="h-8 text-sm bg-slate-50" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500">我方开发负责人</label>
                            <SearchableUserSelect
                              value={item.our_dev_contact}
                              onChange={(name) => updateIntegration(item.id, "our_dev_contact", name)}
                              onSelectFull={(u) => updateIntegration(item.id, "our_dev_contact_phone", u.phone || "")}
                              users={users.filter(u => u.name)}
                              placeholder="选择人员"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500">联系方式</label>
                            <Input value={item.our_dev_contact_phone} onChange={(e) => updateIntegration(item.id, "our_dev_contact_phone", e.target.value)} placeholder="自动带出" className="h-8 text-sm bg-slate-50" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">我方负责内容简述</label>
                          <textarea
                            value={item.our_responsibility}
                            onChange={(e) => updateIntegration(item.id, "our_responsibility", e.target.value)}
                            placeholder="描述我方负责的内容"
                            className="w-full min-h-[60px] p-2 border rounded-md resize-none text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* 对方信息 */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-slate-600 border-b pb-1">对方信息</div>
                        {([
                          ["their_req_contact", "对方需求对接人"],
                          ["their_product_contact", "对方产品负责人"],
                          ["their_dev_contact", "对方开发负责人"],
                        ] as const).map(([field, label]) => (
                          <div key={field} className="grid grid-cols-4 gap-2">
                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">{label}</label>
                              <Input
                                value={(item as unknown as Record<string, string>)[field] || ""}
                                onChange={(e) => updateIntegration(item.id, field as keyof IntegrationItem, e.target.value)}
                                placeholder="姓名"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">联系方式</label>
                              <Input
                                value={(item as unknown as Record<string, string>)[field + "_phone"] || ""}
                                onChange={(e) => updateIntegration(item.id, (field + "_phone") as keyof IntegrationItem, e.target.value)}
                                placeholder="电话"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">职位</label>
                              <Input
                                value={(item as unknown as Record<string, string>)[field + "_position"] || ""}
                                onChange={(e) => updateIntegration(item.id, (field + "_position") as keyof IntegrationItem, e.target.value)}
                                placeholder="职位"
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">备注</label>
                              <Input
                                value={(item as unknown as Record<string, string>)[field + "_note"] || ""}
                                onChange={(e) => updateIntegration(item.id, (field + "_note") as keyof IntegrationItem, e.target.value)}
                                placeholder="备注"
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        ))}
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">对方负责内容简述</label>
                          <textarea
                            value={item.their_responsibility}
                            onChange={(e) => updateIntegration(item.id, "their_responsibility", e.target.value)}
                            placeholder="描述对方负责的内容"
                            className="w-full min-h-[60px] p-2 border rounded-md resize-none text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* 对接文档附件 */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-slate-600">对接文档附件</label>
                        <div className="flex flex-wrap gap-2">
                          {item.integration_docs.map((doc) => (
                            <div key={doc.id} className="relative group border rounded px-2 py-1 text-xs bg-slate-50 flex items-center gap-1.5">
                              {doc.type === "link" ? (
                                <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 underline max-w-[150px] truncate">{doc.name}</a>
                              ) : (
                                <span className="max-w-[150px] truncate">{doc.name}</span>
                              )}
                              <button type="button" className="text-slate-400 hover:text-red-500" onClick={() => removeIntegrationDoc(item.id, doc.id)}>
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          <label className="border border-dashed rounded px-2 py-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer flex items-center gap-1">
                            <Plus className="h-3 w-3" />文件
                            <input type="file" accept=".doc,.docx,.xls,.xlsx,.md,.zip,.rar,.7z" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addIntegrationDoc(item.id, f); e.target.value = ""; }} />
                          </label>
                          <button type="button" className="border border-dashed rounded px-2 py-1 text-xs text-slate-400 hover:text-slate-600" onClick={() => { const url = prompt("输入链接URL:"); if (url) addIntegrationDoc(item.id, null, url); }}>
                            <Plus className="h-3 w-3 mr-0.5" />链接
                          </button>
                        </div>
                      </div>

                      {/* 备注 */}
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500">备注</label>
                        <textarea
                          value={item.remark}
                          onChange={(e) => updateIntegration(item.id, "remark", e.target.value)}
                          placeholder="备注信息"
                          className="w-full min-h-[60px] p-2 border rounded-md resize-none text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                    </div>
                  </div>
                ))}
                {hasIntegration && integrationList.length === 0 && (
                  <div className="text-sm text-slate-400 text-center py-4">
                    暂无对接信息，点击上方按钮添加
                  </div>
                )}
                {!hasIntegration && (
                  <div className="text-sm text-slate-400 text-center py-4">
                    选择"是"后可添加对接信息
                  </div>
                )}
                  </>
                )}
              </div>
            </Section>

            {/* 含定制开发 */}
            <Section
              title="含定制开发"
              icon={<Hammer className="h-4 w-4 text-amber-600" />}
              defaultOpen={false}
              count={hasCustomDev ? customDevItems.length : 0}
              color="amber"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-slate-700">是否含定制开发</label>
                  <Select value={hasCustomDev ? 'yes' : 'no'} onValueChange={(v) => { setHasCustomDev(v === 'yes'); if (v === 'no') setCustomDevItems([]); }}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">否</SelectItem>
                      <SelectItem value="yes">是</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {hasCustomDev && (
                  <>
                    <Button type="button" variant="outline" size="sm" onClick={addCustomDev}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> 添加定制开发
                    </Button>
                    {customDevItems.map((cd, index) => (
                      <div key={cd.id} className="border rounded-lg overflow-hidden">
                        <div className="bg-amber-50 px-4 py-2 flex items-center justify-between border-b">
                          <span className="text-sm font-medium text-amber-800">
                            定制开发 {index + 1}
                            {cd.product_module && ` - ${cd.product_module}`}
                          </span>
                          <button type="button" className="text-slate-400 hover:text-red-500 transition-colors" onClick={() => removeCustomDev(cd.id)}>
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">产品模块</label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" className="w-full justify-between text-sm font-normal h-8">
                                    {cd.product_module || <span className="text-muted-foreground">选择模块...</span>}
                                    <Search className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="搜索产品模块..." className="h-9" />
                                    <CommandList className="max-h-[200px]">
                                      <CommandEmpty className="py-2 text-center text-sm">未找到</CommandEmpty>
                                      <CommandGroup>
                                        {productModules.map((mod) => (
                                          <CommandItem key={mod.module_code} value={mod.module_code} onSelect={() => updateCustomDev(cd.id, "product_module", mod.module_name)} className="text-sm">
                                            {mod.module_name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">定制内容简述</label>
                              <Input value={cd.custom_content} onChange={(e) => updateCustomDev(cd.id, "custom_content", e.target.value)} placeholder="简述定制内容" className="h-8 text-sm" />
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="text-xs text-slate-500">是否在合同内</label>
                            <Select value={cd.in_contract} onValueChange={(v) => updateCustomDev(cd.id, "in_contract", v)}>
                              <SelectTrigger className="w-[100px] h-8 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="是">是</SelectItem>
                                <SelectItem value="否">否</SelectItem>
                              </SelectContent>
                            </Select>
                            {cd.in_contract === "否" && (
                              <Input value={cd.contract_note} onChange={(e) => updateCustomDev(cd.id, "contract_note", e.target.value)} placeholder="说明原因" className="h-8 text-sm flex-1" />
                            )}
                          </div>
                          {/* 客户需求提出人 */}
                          <div className="grid grid-cols-4 gap-2">
                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">客户需求提出人</label>
                              <Input value={cd.customer_req_contact} onChange={(e) => updateCustomDev(cd.id, "customer_req_contact", e.target.value)} placeholder="姓名" className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">联系方式</label>
                              <Input value={cd.customer_req_contact_phone} onChange={(e) => updateCustomDev(cd.id, "customer_req_contact_phone", e.target.value)} placeholder="电话" className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">职位</label>
                              <Input value={cd.customer_req_contact_position} onChange={(e) => updateCustomDev(cd.id, "customer_req_contact_position", e.target.value)} placeholder="职位" className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">备注</label>
                              <Input value={cd.customer_req_contact_note} onChange={(e) => updateCustomDev(cd.id, "customer_req_contact_note", e.target.value)} placeholder="备注" className="h-8 text-sm" />
                            </div>
                          </div>
                          {/* 内部对接人 */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">内部需求对接人</label>
                              <SearchableUserSelect value={cd.internal_req_contact} onChange={(name) => updateCustomDev(cd.id, "internal_req_contact", name)} onSelectFull={(u) => updateCustomDev(cd.id, "internal_req_contact_phone", u.phone || "")} users={users.filter(u => u.name)} placeholder="选择人员" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">联系方式</label>
                              <Input value={cd.internal_req_contact_phone} onChange={(e) => updateCustomDev(cd.id, "internal_req_contact_phone", e.target.value)} placeholder="自动带出" className="h-8 text-sm bg-slate-50" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">内部产品负责人</label>
                              <SearchableUserSelect value={cd.internal_product_contact} onChange={(name) => updateCustomDev(cd.id, "internal_product_contact", name)} onSelectFull={(u) => updateCustomDev(cd.id, "internal_product_contact_phone", u.phone || "")} users={users.filter(u => u.name)} placeholder="选择人员" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-slate-500">联系方式</label>
                              <Input value={cd.internal_product_contact_phone} onChange={(e) => updateCustomDev(cd.id, "internal_product_contact_phone", e.target.value)} placeholder="自动带出" className="h-8 text-sm bg-slate-50" />
                            </div>
                          </div>
                          {/* 需求文档附件 */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-600">需求文档附件</label>
                            <div className="flex flex-wrap gap-2">
                              {cd.req_docs.map((doc) => (
                                <div key={doc.id} className="relative group border rounded px-2 py-1 text-xs bg-slate-50 flex items-center gap-1.5">
                                  {doc.type === "link" ? (
                                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-blue-600 underline max-w-[150px] truncate">{doc.name}</a>
                                  ) : (
                                    <span className="max-w-[150px] truncate">{doc.name}</span>
                                  )}
                                  <button type="button" className="text-slate-400 hover:text-red-500" onClick={() => removeCustomDevDoc(cd.id, doc.id)}><X className="h-3 w-3" /></button>
                                </div>
                              ))}
                              <label className="border border-dashed rounded px-2 py-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer flex items-center gap-1">
                                <Plus className="h-3 w-3" />文件
                                <input type="file" accept=".doc,.docx,.xls,.xlsx,.md,.zip,.rar,.7z" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addCustomDevDoc(cd.id, f); e.target.value = ""; }} />
                              </label>
                              <button type="button" className="border border-dashed rounded px-2 py-1 text-xs text-slate-400 hover:text-slate-600" onClick={() => { const url = prompt("输入链接URL:"); if (url) addCustomDevDoc(cd.id, null, url); }}>
                                <Plus className="h-3 w-3 mr-0.5" />链接
                              </button>
                            </div>
                          </div>
                          {/* 备注 */}
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500">备注</label>
                            <textarea value={cd.remark} onChange={(e) => updateCustomDev(cd.id, "remark", e.target.value)} placeholder="定制开发备注" className="w-full min-h-[50px] p-2 border rounded-md resize-none text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                          </div>
                        </div>
                      </div>
                    ))}
                    {customDevItems.length === 0 && (
                      <div className="text-sm text-slate-400 text-center py-4">暂无定制开发，点击上方按钮添加</div>
                    )}
                  </>
                )}
                {!hasCustomDev && (
                  <div className="text-sm text-slate-400 text-center py-4">选择"是"后可添加定制开发信息</div>
                )}
              </div>
            </Section>
          </div>
        </div>

        {/* 右侧预览面板 */}
        <div className="w-[440px] shrink-0 border-l bg-slate-50 overflow-y-auto">
          <div className="p-5">
            <h3 className="font-semibold text-sm mb-5 pb-3 border-b flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-500" />
              项目预览
            </h3>

            <div className="space-y-5">
              {/* 基本信息 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">基本信息</div>
                <div className="bg-white rounded-lg p-3.5 space-y-2.5 border">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">名称</span>
                    <span className="font-medium truncate ml-2 max-w-[280px]">
                      {projectName || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">编号</span>
                    <span className="font-mono text-sm">{projectCode || "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">类型</span>
                    <span className="font-medium">{projectTypes.find(t => t.code === projectType)?.name || projectType || "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">阶段</span>
                    <span className="font-medium">{projectStages.find(s => s.code === projectStage)?.name || projectStage || "-"}</span>
                  </div>
                  {department && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">部门</span>
                      <span className="font-medium">{department}</span>
                    </div>
                  )}
                  {[{l:"销售",v:roleSales},{l:"售前",v:rolePresales},{l:"市场产品",v:roleMarketProduct},{l:"项目经理",v:roleProjectManager}].filter(r => r.v).map(r => (
                    <div key={r.l} className="flex justify-between text-sm">
                      <span className="text-slate-500">{r.l}</span>
                      <span>{r.v}</span>
                    </div>
                  ))}
                  {selectedCustomerTypes.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">客户类型</span>
                      <span className="font-medium">
                        {selectedCustomerTypes.map(c => customerTypes.find(t => t.code === c)?.name || c).join("、")}
                      </span>
                    </div>
                  )}
                  {deploymentMode && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">部署模式</span>
                      <span className="font-medium">{deploymentModes.find(m => m.code === deploymentMode)?.name || deploymentMode || "-"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 时间信息 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">时间信息</div>
                <div className="bg-white rounded-lg p-3.5 space-y-2.5 border">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">进场时间</span>
                    <span className="font-medium">{entryDate || "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">初验时间</span>
                    <span className="font-medium">{initialAcceptanceDate || "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">终验时间</span>
                    <span className="font-medium">{finalAcceptanceDate || "-"}</span>
                  </div>
                </div>
              </div>

              {/* 客户信息 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">客户信息</div>
                <div className="bg-white rounded-lg p-3.5 border">
                  <div className="text-sm font-medium">{companyName || "暂未填写"}</div>
                  {(province || city || district) && (
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {getFullAddress()}
                    </div>
                  )}
                  {(longitude && latitude) && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      {longitude}, {latitude}
                    </div>
                  )}
                  {schoolPhotos.length > 0 && (
                    <div className="text-xs text-slate-400 mt-1">
                      {schoolPhotos.length} 张照片
                    </div>
                  )}
                  {validContacts.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {validContacts.map((cp, i) => (
                        <div key={i} className="text-xs text-slate-500">
                          {cp.name}
                          {cp.phone && ` · ${cp.phone}`}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 mt-1">暂无联系人</div>
                  )}
                </div>
              </div>

              {/* 渠道信息 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">渠道信息</div>
                <div className="bg-white rounded-lg p-3.5 border">
                  {validChannels.length > 0 ? (
                    <div className="space-y-2">
                      {validChannels.map((cc, i) => (
                        <div key={i} className="text-sm">
                          <div className="font-medium">{cc.company_name}</div>
                          {cc.contact_person && (
                            <div className="text-xs text-slate-500">{cc.contact_person}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">暂未填写</div>
                  )}
                </div>
              </div>

              {/* 项目成员 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">项目成员</div>
                <div className="bg-white rounded-lg p-3.5 border">
                  {validMembers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {validMembers.map((pm, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {pm.name}
                          {pm.role_type && ` · ${pm.role_type}`}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">暂未添加</div>
                  )}
                </div>
              </div>

              {/* 采购信息 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">采购信息</div>
                <div className="bg-white rounded-lg p-3.5 border space-y-3">
                  {(procurementAmount || softwareAmount || hardwareAmount) ? (
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      {procurementAmount && (
                        <div>
                          <span className="text-slate-400">总金额</span>
                          <div className="font-medium text-slate-700">¥{parseFloat(procurementAmount).toLocaleString()}</div>
                        </div>
                      )}
                      {softwareAmount && (
                        <div>
                          <span className="text-slate-400">软件</span>
                          <div className="font-medium text-slate-700">¥{parseFloat(softwareAmount).toLocaleString()}</div>
                        </div>
                      )}
                      {hardwareAmount && (
                        <div>
                          <span className="text-slate-400">硬件</span>
                          <div className="font-medium text-slate-700">¥{parseFloat(hardwareAmount).toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  ) : null}
                  {selectedModules.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedModules.map((code, i) => {
                        const mod = productModules.find((m) => m.module_code === code);
                        return (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {mod?.module_name || code}
                          </Badge>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">暂未选择</div>
                  )}
                </div>
              </div>

              {/* 对接信息 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">对接信息</div>
                {!hasIntegration ? (
                  <div className="text-xs text-slate-400">无对接</div>
                ) : integrationList.filter((i) => i.vendor_name).length > 0 ? (
                  <div className="space-y-1.5">
                    {integrationList.filter((i) => i.vendor_name).map((item, i) => (
                      <div key={i} className="bg-white rounded-lg p-2.5 border text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.vendor_name}</span>
                          <span className="text-xs text-slate-400">{item.integration_type}</span>
                        </div>
                        {item.product_module && (
                          <div className="text-xs text-slate-500 mt-0.5">模块: {item.product_module}</div>
                        )}
                        {item.brief_description && (
                          <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.brief_description}</div>
                        )}
                        {(item.our_req_contact || item.our_dev_contact) && (
                          <div className="text-xs text-slate-500 mt-1">
                            我方: {[item.our_req_contact, item.our_product_contact, item.our_dev_contact].filter(Boolean).join(" / ") || "-"}
                          </div>
                        )}
                        {item.integration_docs.length > 0 && (
                          <div className="text-xs text-slate-400 mt-0.5">{item.integration_docs.length} 个附件</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">选择"是"后添加对接信息</div>
                )}
              </div>

              {/* 含定制开发 */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">含定制开发</div>
                {!hasCustomDev ? (
                  <div className="text-xs text-slate-400">无定制开发</div>
                ) : customDevItems.length > 0 ? (
                  <div className="space-y-1.5">
                    {customDevItems.map((cd, i) => (
                      <div key={i} className="bg-white rounded-lg p-2.5 border text-sm">
                        <span className="font-medium">{cd.product_module || "未指定模块"}</span>
                        {cd.custom_content && <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{cd.custom_content}</div>}
                        {cd.in_contract === "否" && <span className="text-xs text-red-400 ml-1">(合同外)</span>}
                        {cd.req_docs.length > 0 && <div className="text-xs text-slate-400 mt-0.5">{cd.req_docs.length} 个文档</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">选择"是"后添加定制开发信息</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 采购模块导入不匹配弹窗 */}
      {showUnmatchedDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-6 w-6 text-white" />
                <h3 className="text-lg font-semibold text-white">
                  {unmatchedNames.length} 个模块未匹配
                </h3>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-slate-500 mb-3">
                以下模块名称在系统中未找到，无法自动匹配。可复制后去「基础数据 → 产品模块」中添加。
              </p>
              <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto mb-4">
                <div className="space-y-1 font-mono text-xs">
                  {unmatchedNames.map((name, i) => (
                    <div key={i} className="text-slate-700">
                      {i + 1}. {name}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const text = unmatchedNames.join("\n");
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(text).then(() => {
                        toast.success("已复制 " + unmatchedNames.length + " 个模块名称到剪贴板");
                      }).catch(() => {
                        toast.error("复制失败，请手动复制");
                      });
                    } else {
                      // fallback for non-HTTPS environments
                      const ta = document.createElement("textarea");
                      ta.value = text;
                      ta.style.position = "fixed";
                      ta.style.left = "-9999px";
                      document.body.appendChild(ta);
                      ta.select();
                      try {
                        document.execCommand("copy");
                        toast.success("已复制 " + unmatchedNames.length + " 个模块名称到剪贴板");
                      } catch {
                        toast.error("复制失败，请手动复制");
                      }
                      document.body.removeChild(ta);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-cyan-600 text-white hover:bg-cyan-700 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  复制全部名称
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnmatchedDialog(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 类型/阶段变更确认对话框 */}
      {showTypeStageConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-white" />
                <h3 className="text-lg font-semibold text-white">项目类型/阶段变更确认</h3>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="text-sm text-slate-700">
                <span className="font-medium">变更：</span>
                <span className="text-slate-500">{typeStageChangeInfo?.oldTypeName} / {typeStageChangeInfo?.oldStageName}</span>
                <span className="mx-2 text-amber-600">→</span>
                <span className="font-medium text-slate-900">{typeStageChangeInfo?.newTypeName} / {typeStageChangeInfo?.newStageName}</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium text-amber-800">影响分析：</div>
                <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                  <li>模块Tab将根据新配置刷新</li>
                  <li>匹配新类型/阶段的规范表将自动创建到项目Schema</li>
                  <li>已有数据表和数据不会被删除（数据安全）</li>
                  <li>不再启用的模块Tab将隐藏，但数据保留</li>
                </ul>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowTypeStageConfirm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmTypeStageChange}
                className="px-4 py-2 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
              >
                确认变更
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
