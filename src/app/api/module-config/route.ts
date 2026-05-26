import { NextResponse } from 'next/server';
import { createServerClient } from '@/storage/database/pg-client';

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.rpc('dp_select', { p_table: 'project_type_stage_modules' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();

    // 支持批量保存：接收 { items: [...] } 格式
    if (body.items && Array.isArray(body.items)) {
      // 先删除该类型+阶段的所有配置
      for (const item of body.items) {
        if (item._delete_all) {
          const { data: existing } = await supabase.rpc('dp_select', { p_table: 'project_type_stage_modules' });
          const toDelete = (existing || []).filter(
            (r: Record<string, unknown>) => r.project_type_code === item.project_type_code && r.project_stage_code === item.project_stage_code
          );
          for (const r of toDelete) {
            await supabase.rpc('dp_delete', { p_table: 'project_type_stage_modules', p_id: r.id });
          }
        }
      }

      // 插入新配置
      const results = [];
      for (const item of body.items) {
        if (item._delete_all) continue;
        const { data, error } = await supabase.rpc('dp_insert', {
          p_table: 'project_type_stage_modules',
          p_data: {
            project_type_code: item.project_type_code,
            project_stage_code: item.project_stage_code,
            module_code: item.module_code,
            is_enabled: item.is_enabled !== false,
            sort_order: item.sort_order || 0,
          },
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        results.push(data);
      }
      return NextResponse.json({ data: results }, { status: 201 });
    }

    // 单条插入
    const { data, error } = await supabase.rpc('dp_insert', {
      p_table: 'project_type_stage_modules',
      p_data: body,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    const { error } = await supabase.rpc('dp_delete', {
      p_table: 'project_type_stage_modules',
      p_id: id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createServerClient();
    const body = await request.json();

    // 批量保存：{ project_type_code, project_stage_code, modules: [{module_code, is_enabled, sort_order}] }
    if (body.modules && Array.isArray(body.modules)) {
      const { project_type_code, project_stage_code, modules } = body;

      // 删除该类型+阶段的旧配置
      const { data: existing } = await supabase.rpc('dp_select', { p_table: 'project_type_stage_modules' });
      const toDelete = (existing || []).filter(
        (r: Record<string, unknown>) => r.project_type_code === project_type_code && r.project_stage_code === project_stage_code
      );
      for (const r of toDelete) {
        await supabase.rpc('dp_delete', { p_table: 'project_type_stage_modules', p_id: r.id });
      }

      // 插入新配置
      const results = [];
      for (const mod of modules) {
        if (!mod.is_enabled) continue;
        const { data, error } = await supabase.rpc('dp_insert', {
          p_table: 'project_type_stage_modules',
          p_data: {
            project_type_code,
            project_stage_code,
            module_code: mod.module_code,
            is_enabled: true,
            sort_order: mod.sort_order || 0,
          },
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        results.push(data);
      }
      return NextResponse.json({ data: results });
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
