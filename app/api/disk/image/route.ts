import { NextRequest, NextResponse } from 'next/server'
import { createStorage } from '@/lib/s3/storage'

/**
 * GET /api/disk/image - 代理图片文件
 * 通过 Next.js 服务端代理从 S3 获取图片，避免 CORS 问题
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
