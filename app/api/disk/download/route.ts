import { NextRequest, NextResponse } from 'next/server'
import { createStorage } from '@/lib/s3/storage'

/**
 * 代理下载 S3 文件
 * @description 通过 Next.js 服务端代理从 S3 下载文件，避免 presigned URL 签名问题。返回文件流供客户端下载。
 * @query {string} path - 文件路径
 * @response 200:FileInfoSchema:返回文件二进制流，含 Content-Disposition 下载头
 * @response 400:ErrorResponse:未提供文件路径
 * @response 404:ErrorResponse:文件不存在
 * @response 500:ErrorResponse:下载失败
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
