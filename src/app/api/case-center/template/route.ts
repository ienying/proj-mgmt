import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import {
  CUSTOMER_TYPE_DEPARTMENTS,
  ALL_DEPARTMENTS,
} from "@/lib/case-center-constants";

// GET /api/case-center/template — 下载画像录入 Excel 模板
export async function GET() {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: 基础信息与位置 ──
  const basicHeaders = [
    "学校名称", "客户类型（多个用逗号分隔，如：中职,高中）", "描述",
    "省/自治区/直辖市", "市", "区/县", "镇/乡", "村", "经度", "纬度",
  ];
  const basicExample = [
    "示例：北京电子信息学校", "中职", "这是一所国家级重点中等职业学校",
    "北京市", "北京市", "朝阳区", "", "", "116.4551", "39.9532",
  ];
  const basicSheet = XLSX.utils.aoa_to_sheet([basicHeaders, basicExample]);
  basicSheet["!cols"] = basicHeaders.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(wb, basicSheet, "基础信息与位置");

  // ── Sheet 2: 硬件与网络信息 ──
  const hwHeaders = [
    "学校总人数", "教师人数", "学生人数", "班级数量", "教室数量",
    "功能教室数量", "学校总面积(m²)", "宿舍楼栋数", "校区数量",
    "校门数量", "食堂数量", "二级学院/学部数",
    "学校网络带宽", "服务器总量(台)", "虚拟化平台", "存储品牌及容量",
    "公网IP及带宽", "内网IP段", "无线覆盖（全覆盖/部分覆盖/无）",
  ];
  const hwExample = [
    3000, 200, 2800, 60, 50, 15, 50000, 4, 1, 3, 2, 5,
    "1000M", 10, "VMware", "华为 50TB", "1.2.3.4 100M", "192.168.1.0/24", "全覆盖",
  ];
  const hwSheet = XLSX.utils.aoa_to_sheet([hwHeaders, hwExample]);
  hwSheet["!cols"] = hwHeaders.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, hwSheet, "硬件与网络信息");

  // ── Sheet 3: 科室业务 ──
  const deptHeaders = [
    "科室名称", "日常核心工作", "业务流程（怎么做的）", "当前痛点",
    "在用工具/系统", "信息化期望", "科室总结",
    "人员1姓名", "人员1职务", "人员1电话",
    "人员2姓名", "人员2职务", "人员2电话",
  ];
  // 以中职为例预填科室行
  const defaultDeptNames = CUSTOMER_TYPE_DEPARTMENTS["中职"] || [];
  const deptRows = defaultDeptNames.map((name) => {
    const deptDef = ALL_DEPARTMENTS.find((d) => d.name === name);
    const code = deptDef?.code || name;
    return [
      name, // 科室名称
      "", "", "", "", "", "", // 6 text fields
      "", "", "", // personnel 1: name, role, phone
      "", "", "", // personnel 2: name, role, phone
    ];
  });
  const deptSheet = XLSX.utils.aoa_to_sheet([deptHeaders, ...deptRows]);
  deptSheet["!cols"] = deptHeaders.map((_, i) => ({ wch: i === 0 ? 18 : 24 }));
  XLSX.utils.book_append_sheet(wb, deptSheet, "科室业务");

  // ── Sheet 4: 模块状态（模块名称来源于系统设置-基础数据-产品目录） ──
  const modHeaders = [
    "科室名称", "模块名称（来自产品目录库）", "状态（已落地/未落地/未购）",
    "使用率(%)", "活跃用户数", "落地效果/未落地原因", "问题", "当前替代做法",
  ];
  const modExample = ["校领导", "示例：数据大屏", "未购", "0", "0", "", "", ""];
  const modSheet = XLSX.utils.aoa_to_sheet([modHeaders, modExample]);
  modSheet["!cols"] = modHeaders.map((_, i) => ({ wch: i <= 1 ? 20 : 28 }));
  XLSX.utils.book_append_sheet(wb, modSheet, "模块状态");

  // 生成 buffer 并返回
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("画像录入模板.xlsx")}`,
    },
  });
}
