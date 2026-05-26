import { NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (!key) return NextResponse.json({ error: 'No key provided' }, { status: 400 });

    const url = await storage.generatePresignedUrl({ key, expireTime: 86400 });
    return NextResponse.json({ data: { url } });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
