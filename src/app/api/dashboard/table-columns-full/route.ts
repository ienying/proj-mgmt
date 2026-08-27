import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/storage/database/pg-client";

// 返回数据表的完整列定义（含类型），用于趋势图等需要按列类型选择的场景
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableCode = searchParams.get("table_code");
    if (!tableCode) {
      return NextResponse.json({ error: "缺少 table_code 参数" }, { status: 400 });
    }

    const client = await createServerClient();

    const { data } = await client.rpc("execute_sql", {
      p_sql: `SELECT columns_config FROM data_table_definitions WHERE table_code = '${tableCode.replace(/'/g, "''")}'`,
    });

    const rows = data as Array<{ columns_config: unknown }> | null;
    if (!rows || rows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const columnsConfig = rows[0].columns_config as Array<Record<string, unknown>> | null;
    if (!columnsConfig) {
      return NextResponse.json({ data: [] });
    }

    const columns = columnsConfig
      .filter((col) => {
        const type = String(col.type || "");
        // 排除系统字段与附件类
        return !["attachment"].includes(type) && String(col.name || "");
      })
      .map((col) => ({
        name: String(col.name || ""),
        label: String(col.label || col.name || ""),
        type: String(col.type || ""),
        options: Array.isArray(col.options)
          ? (col.options as Array<string | { value: string; label: string }>).map((o) =>
              typeof o === "string" ? o : o.value
            )
          : [],
      }));

    return NextResponse.json({ data: columns });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
