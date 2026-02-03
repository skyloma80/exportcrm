import { NextRequest, NextResponse } from 'next/server'
import { createStorage } from '@/lib/s3/storage'

// Configure body size limit for this route (App Router)
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds timeout

// POST /api/disk/upload - 上传文件到 S3
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const folder = formData.get('folder') as string || ''
    const customPath = formData.get('path') as string || ''  // 支持直接指定完整路径

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // 验证文件大小 (100MB)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB.' },
        { status: 400 }
      )
    }

    const storage = createStorage()
    
    // 构建文件路径
    let path: string
    if (customPath) {
      // 使用前端指定的完整路径（用于文件管理器等场景）
      path = customPath.replace(/^\/|\/$/g, '')
    } else {
      // 使用 folder + 时间戳 + 文件名（用于简单上传场景）
      const timestamp = Date.now()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      path = folder 
        ? `${folder.replace(/^\/|\/$/g, '')}/${timestamp}_${safeName}`
        : `uploads/${timestamp}_${safeName}`
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 上传到 S3
    const { error } = await storage.upload(path, buffer, {
      contentType: file.type,
    })

    if (error) {
      console.error('Disk upload error details:', {
        path,
        bucket: process.env.S3_BUCKET,
        endpoint: process.env.S3_ENDPOINT,
        message: error.message,
      })
      return NextResponse.json(
        {
          error: error.message || 'Upload failed',
          hint: 'Check S3/MinIO configuration and that the target bucket exists.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      path,
      name: file.name,
      size: file.size,
      contentType: file.type,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
