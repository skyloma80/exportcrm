import { NextRequest, NextResponse } from 'next/server'
import { createStorage } from '@/lib/s3/storage'

/**
 * 列出 S3 存储目录内容
 * @description 根据前缀列出文件和文件夹，支持递归模式获取所有文件
 * @query {string} prefix - 目录前缀，用于指定要列出的路径
 * @query {boolean} [recursive=false] - 是否递归列出所有子目录文件
 * @response 200:object:返回 { folders: FolderInfoSchema[], files: FileInfoSchema[] } 格式的目录内容
 * @response 500:ErrorResponse:获取文件列表失败，检查S3配置
 */
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
