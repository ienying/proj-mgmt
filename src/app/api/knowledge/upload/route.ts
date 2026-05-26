import { NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'];

function getMediaType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (DOCUMENT_EXTENSIONS.includes(ext)) return 'document';
  return 'other';
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const mediaType = getMediaType(file.name);
    const contentType = mediaType === 'video' ? file.type || 'video/mp4' : file.type || 'application/octet-stream';

    const fileKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: `knowledge/${file.name}`,
      contentType,
    });

    return NextResponse.json({
      data: {
        file_name: file.name,
        file_url: fileKey,
        file_size: file.size,
        file_type: file.name.split('.').pop()?.toLowerCase() || '',
        media_type: mediaType,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
