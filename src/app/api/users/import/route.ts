import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";

const VALID_ROLES = ["super_admin", "sub_admin", "user"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "请上传 Excel 文件" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

    if (rows.length < 2) {
      return NextResponse.json({ error: "Excel 文件为空或无数据行" }, { status: 400 });
    }

    const headerRow = rows[0] as string[];
    const colMap: Record<string, number> = {};
    for (let i = 0; i < headerRow.length; i++) {
      const h = headerRow[i]?.toString().trim();
      if (h.includes("用户名")) colMap.username = i;
      else if (h.includes("姓名") || h === "name") colMap.name = i;
      else if (h.includes("邮箱")) colMap.email = i;
      else if (h.includes("电话")) colMap.phone = i;
      else if (h.includes("部门")) colMap.department = i;
      else if (h.includes("职位")) colMap.position = i;
      else if (h.includes("角色")) colMap.role = i;
      else if (h.includes("密码")) colMap.password = i;
    }

    if (colMap.name === undefined) {
      return NextResponse.json({ error: "缺少「姓名」列" }, { status: 400 });
    }

    const client = await createServerClient();

    // Get existing users for duplicate check
    const { data: existingData } = await client.rpc("dp_select", { p_table: "users" });
    const existingUsers = (existingData as Record<string, unknown>[]) || [];
    const existingNames = new Set(existingUsers.map((u) => u.name as string));
    const existingUsernames = new Set(existingUsers.map((u) => u.username as string));

    const results: { row: number; name: string; status: string; error?: string }[] = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as string[];
      const name = (row[colMap.name] || "").toString().trim();
      if (!name) continue;

      const username = (colMap.username !== undefined ? row[colMap.username] : "")?.toString().trim() || name;
      const email = (colMap.email !== undefined ? row[colMap.email] : "")?.toString().trim() || null;
      const phone = (colMap.phone !== undefined ? row[colMap.phone] : "")?.toString().trim() || null;
      const department = (colMap.department !== undefined ? row[colMap.department] : "")?.toString().trim() || null;
      const position = (colMap.position !== undefined ? row[colMap.position] : "")?.toString().trim() || null;
      const roleRaw = (colMap.role !== undefined ? row[colMap.role] : "")?.toString().trim() || "user";
      const password = (colMap.password !== undefined ? row[colMap.password] : "")?.toString().trim() || "yuansu0718";

      const role = VALID_ROLES.includes(roleRaw) ? roleRaw : "user";

      if (existingNames.has(name) || existingUsernames.has(username)) {
        skipped++;
        results.push({ row: i + 1, name, status: "跳过", error: "用户名或姓名已存在" });
        continue;
      }

      try {
        const passwordHash = await bcrypt.hash(password, 10);
        const { error } = await client.rpc("dp_insert", {
          p_table: "users",
          p_data: {
            name,
            username,
            email,
            phone,
            department,
            position,
            role,
            password_hash: passwordHash,
            is_active: true,
          },
        });

        if (error) {
          failed++;
          results.push({ row: i + 1, name, status: "失败", error: error.message });
        } else {
          created++;
          results.push({ row: i + 1, name, status: "成功" });
          existingNames.add(name);
          existingUsernames.add(username);
        }
      } catch (err) {
        failed++;
        results.push({ row: i + 1, name, status: "失败", error: String(err) });
      }
    }

    return NextResponse.json({
      data: { created, skipped, failed, total: created + skipped + failed, results },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}