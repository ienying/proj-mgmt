import { NextResponse } from "next/server";
import { getPromptTemplates, savePromptTemplate, deletePromptTemplate } from "@/lib/ai-settings";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectSchema = searchParams.get("projectSchema") || "";
    const promptType = searchParams.get("promptType") || undefined;

    const templates = await getPromptTemplates({ projectSchema, promptType });
    return NextResponse.json({ data: templates });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project_schema, name, prompt_type, system_message, user_prompt, created_by, created_by_name } = body;

    if (!name || !prompt_type || system_message === undefined || user_prompt === undefined) {
      return NextResponse.json({ error: "缺少必填字段: name, prompt_type, system_message, user_prompt" }, { status: 400 });
    }

    const result = await savePromptTemplate({
      project_schema: project_schema || "",
      name,
      prompt_type,
      system_message,
      user_prompt,
      created_by,
      created_by_name,
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

    const body = await request.json();
    const { name, system_message, user_prompt } = body;

    const result = await savePromptTemplate({ id, name, system_message, user_prompt, project_schema: "", prompt_type: "" });
    return NextResponse.json({ data: result });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("默认模板不可编辑")) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

    await deletePromptTemplate(id);
    return NextResponse.json({ data: { success: true } });
  } catch (err) {
    const msg = String(err);
    if (msg.includes("默认模板不可删除")) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
