import { NextRequest, NextResponse } from 'next/server'
import { createStorage } from '@/lib/s3/storage'

// GET /api/disk/list - 列出 S3 目录内容
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawPrefix = searchParams.get('prefix') || ''
    const recursive = searchParams.get('recursive') === 'true'

    // Normalize prefix: remove leading slash; keep trailing slash semantics if provided
    const prefix = rawPrefix.replace(/^\/+/, '')

    const storage = createStorage()
    
    // recursive=true 时不使用 delimiter，获取所有文件
    const { data, error } = await storage.list({ 
      prefix, 
      delimiter: recursive ? '' : '/' 
    })
    
    if (error) {
      console.error('Disk list error details:', {
        prefix,
        recursive,
        bucket: process.env.S3_BUCKET,
        endpoint: process.env.S3_ENDPOINT,
        message: error.message,
      })
      return NextResponse.json(
        {
          error: error.message,
          hint: 'Check S3/MinIO configuration (S3_ENDPOINT/S3_ACCESS_KEY/S3_SECRET_KEY/S3_BUCKET) and that the bucket exists.',
        },
        { status: 500 }
      )
    }
    
    // 分离文件夹和文件
    const folders = data.filter(item => item.isFolder).map(item => ({
      name: item.name,
      path: item.path.replace(/\/$/, ''),
    }))
    
    // 过滤掉 .keep 文件
    const files = data
      .filter(item => !item.isFolder && item.name !== '.keep')
      .map(item => ({
        name: item.name,
        path: item.path,
        size: item.size,
        lastModified: item.lastModified,
        contentType: item.contentType,
      }))
    
    return NextResponse.json({ folders, files })
  } catch (error) {
    console.error('List files error:', error)
    return NextResponse.json(
      { error: '获取文件列表失败' },
      { status: 500 }
    )
  }
}
