import { NextResponse } from "next/server";
import { getFeaturePermissions, setFeaturePermission, ensureConvTables } from "@/lib/ai-settings";

export async function GET() {
  try {
    await ensureConvTables();
    const permissions = await getFeaturePermissions();
    return NextResponse.json({ data: permissions });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await ensureConvTables();
    const body = await request.json();
    const { role, feature_key, enabled } = body;

    if (!role || !feature_key || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "缺少必要参数：role, feature_key, enabled" }, { status: 400 });
    }

    const validRoles = ["super_admin", "sub_admin", "user"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `无效的角色: ${role}` }, { status: 400 });
    }

    await setFeaturePermission(role, feature_key, enabled);
    return NextResponse.json({ data: { role, feature_key, enabled } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
