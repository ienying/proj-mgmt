import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectCode = formData.get('projectCode') as string | null;

    if (!file) {
      return NextResponse.json({ error: '未选择文件' }, { status: 400 });
    }

    if (!projectCode) {
      return NextResponse.json({ error: '缺少项目编号' }, { status: 400 });
    }

    // 校验格式
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    const allowedExts = ['.mp4', '.webm', '.mov', '.avi'];
    const ext = path.extname(file.name).toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      return NextResponse.json({ error: '不支持的视频格式，仅支持 mp4/webm/mov/avi' }, { status: 400 });
    }

    // 校验大小（1GB）
    const maxSize = 1 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: '文件大小超过1GB限制' }, { status: 400 });
    }

    // 确定存储目录
    const isProd = process.env.COZE_PROJECT_ENV === 'PROD';
    const baseDir = isProd
      ? '/data/uploads/videos'
      : path.join(process.env.COZE_WORKSPACE_PATH || '/workspace/projects', 'public/uploads/videos');

    const uploadDir = path.join(baseDir, projectCode);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // 生成唯一文件名避免冲突
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-\u4e00-\u9fff]/g, '_');
    const fileName = `${timestamp}_${safeName}`;
    const filePath = path.join(uploadDir, fileName);

    // 写入文件
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    // 返回访问路径
    const url = `/api/files/videos/${projectCode}/${fileName}`;

    return NextResponse.json({
      data: {
        url,
        name: file.name,
        size: file.size,
        type: 'video',
      }
    });
  } catch (error) {
    console.error('视频上传失败:', error);
    return NextResponse.json({ error: '上传失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: '缺少文件路径' }, { status: 400 });
    }

    // 从 URL 路径解析出实际文件路径
    // path format: /api/files/videos/{projectCode}/{fileName}
    const match = filePath.match(/^\/api\/files\/videos\/([^/]+)\/(.+)$/);
    if (!match) {
      return NextResponse.json({ error: '无效的文件路径' }, { status: 400 });
    }

    const projectCode = match[1];
    const fileName = match[2];

    const isProd = process.env.COZE_PROJECT_ENV === 'PROD';
    const baseDir = isProd
      ? '/data/uploads/videos'
      : path.join(process.env.COZE_WORKSPACE_PATH || '/workspace/projects', 'public/uploads/videos');

    const fullPath = path.join(baseDir, projectCode, fileName);

    // 安全检查：确保路径在允许的目录内
    if (!fullPath.startsWith(path.resolve(baseDir))) {
      return NextResponse.json({ error: '非法路径' }, { status: 400 });
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('视频删除失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
