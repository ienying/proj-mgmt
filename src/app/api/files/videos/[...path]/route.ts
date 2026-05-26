import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    // pathSegments: [projectCode, fileName] or [projectCode, ...subDirs, fileName]
    if (pathSegments.length < 2) {
      return NextResponse.json({ error: '无效路径' }, { status: 400 });
    }

    const isProd = process.env.COZE_PROJECT_ENV === 'PROD';
    const baseDir = isProd
      ? '/data/uploads/videos'
      : path.join(process.env.COZE_WORKSPACE_PATH || '/workspace/projects', 'public/uploads/videos');

    const filePath = path.join(baseDir, ...pathSegments);

    // 安全检查：确保路径在允许的目录内
    if (!filePath.startsWith(path.resolve(baseDir))) {
      return NextResponse.json({ error: '非法路径' }, { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    // 获取 Range 头（视频拖拽进度条需要）
    const range = request.headers.get('range');

    // 根据 MIME 类型
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
    };
    const contentType = mimeMap[ext] || 'application/octet-stream';

    if (range) {
      // Range 请求：支持视频拖拽
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileHandle = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(chunkSize);
      fs.readSync(fileHandle, buffer, 0, chunkSize, start);
      fs.closeSync(fileHandle);

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
        },
      });
    }

    // 非 Range 请求：返回完整文件
    const buffer = fs.readFileSync(filePath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Length': fileSize.toString(),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('视频文件读取失败:', error);
    return NextResponse.json({ error: '读取失败' }, { status: 500 });
  }
}
