import { NextRequest, NextResponse } from 'next/server'
import { createStorage } from '@/lib/s3/storage'

/**
 * 代理获取 S3 图片文件
 * @description 通过 Next.js 服务端代理从 S3 获取图片，避免 CORS 问题。支持长期缓存。
 * @query {string} path - 图片文件路径
 * @response 200:FileInfoSchema:返回图片二进制内容，含图片 Content-Type
 * @response 400:ErrorResponse:未提供路径
 * @response 404:ErrorResponse:图片文件不存在
 * @response 500:ErrorResponse:获取图片失败
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 })
    }

    const storage = createStorage()
    const { data: blob, error } = await storage.download(path)

    if (error || !blob) {
      return NextResponse.json(
        { error: error?.message || 'File not found' },
        { status: 404 }
      )
    }

    const buffer = await blob.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': blob.type || 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Image proxy error:', error)
    return NextResponse.json({ error: 'Failed to load image' }, { status: 500 })
  }
}
