import { NextRequest, NextResponse } from 'next/server'
import { createStorage } from '@/lib/s3/storage'

/**
 * GET /api/disk/download - 代理下载文件
 * 通过 Next.js 服务端代理从 S3 下载文件，避免 presigned URL 签名问题
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json({ error: '未提供文件路径' }, { status: 400 })
    }

    const storage = createStorage()
    const { data: blob, error } = await storage.download(path)

    if (error || !blob) {
      return NextResponse.json(
        { error: error?.message || '文件不存在' },
        { status: 404 }
      )
    }

    const fileName = path.split('/').pop() || 'download'
    const buffer = await blob.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': blob.type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Content-Length': String(buffer.byteLength),
      },
    })
  } catch (error) {
    console.error('Download file error:', error)
    return NextResponse.json({ error: '下载文件失败' }, { status: 500 })
  }
}
