import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getS3Client, DEFAULT_BUCKET } from '@/lib/s3/client'

/**
 * 获取 S3 文件内容
 * @description 直接从S3获取文件内容并返回，主要用于图片显示等场景。支持缓存控制。
 * @query {string} path - 文件路径
 * @response 200:FileInfoSchema:返回文件二进制内容，含适当的 Content-Type
 * @response 400:ErrorResponse:未指定文件路径
 * @response 404:ErrorResponse:文件不存在
 * @response 500:ErrorResponse:获取文件失败
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json({ error: '没有指定文件路径' }, { status: 400 })
    }

    const s3 = getS3Client()

    const command = new GetObjectCommand({
      Bucket: DEFAULT_BUCKET,
      Key: path,
    })

    const response = await s3.send(command)

    if (!response.Body) {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 })
    }

    // 将 stream 转换为 buffer
    const chunks: Uint8Array[] = []
    const reader = response.Body.transformToWebStream().getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const buffer = Buffer.concat(chunks)

    // 根据文件扩展名设置 Content-Type
    const contentType = response.ContentType || getContentType(path)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'public, max-age=31536000', // 缓存 1 年
      },
    })
  } catch (error: any) {
    console.error('Get file error:', error)

    if (error.name === 'NoSuchKey') {
      return NextResponse.json({ error: '文件不存在' }, { status: 404 })
    }

    return NextResponse.json(
      { error: '获取文件失败' },
      { status: 500 }
    )
  }
}

/**
 * 根据文件扩展名获取 Content-Type
 */
function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()

  const mimeTypes: Record<string, string> = {
    // 图片
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    // 文档
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // 其他
    json: 'application/json',
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
  }

  return mimeTypes[ext || ''] || 'application/octet-stream'
}
