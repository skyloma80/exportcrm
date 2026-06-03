import { NextRequest, NextResponse } from 'next/server'
import { createStorage } from '@/lib/s3/storage'

/**
 * 删除 S3 文件或文件夹
 * @description 支持删除单个文件或整个文件夹（含所有子文件）
 * @response 200:SuccessResponse:删除成功
 * @response 400:ErrorResponse:未指定路径
 * @response 500:ErrorResponse:删除失败
 */
export async function DELETE(request: NextRequest) {
  return handleDelete(request)
}

export async function POST(request: NextRequest) {
  return handleDelete(request)
}

async function handleDelete(request: NextRequest) {
  try {
    const body = await request.json()
    const { path, isFolder } = body
    
    console.log('Delete request:', { path, isFolder })
    
    if (!path) {
      return NextResponse.json({ error: '没有指定路径' }, { status: 400 })
    }
    
    const storage = createStorage()
    
    if (isFolder) {
      // 删除文件夹：先列出所有文件，然后逐个删除
      // 文件夹 path 可能是 "folder" 或 "folder/"，需要统一处理
      const folderPath = path.endsWith('/') ? path.slice(0, -1) : path
      const prefix = `${folderPath}/`
      
      console.log('Deleting folder with prefix:', prefix)
      
      // 使用 S3 SDK 直接列出所有文件（包括隐藏文件）
      const s3 = require('@aws-sdk/client-s3')
      const { getS3Client, DEFAULT_BUCKET } = require('@/lib/s3/client')
      const s3Client = getS3Client()
      
      const listCommand = new s3.ListObjectsV2Command({
        Bucket: DEFAULT_BUCKET,
        Prefix: prefix,
        MaxKeys: 1000,
      })
      
      const listResponse = await s3Client.send(listCommand)
      const allFiles = listResponse.Contents || []
      
      console.log('Files to delete (including .keep):', allFiles.map((f: any) => f.Key))
      
      // 删除所有文件（包括 .keep 和隐藏文件）
      if (allFiles.length > 0) {
        const paths = allFiles.map((f: any) => f.Key)
        const { error: removeError } = await storage.remove(paths)
        if (removeError) {
          console.error('Remove error:', removeError)
          return NextResponse.json({ error: removeError.message }, { status: 500 })
        }
        console.log(`Deleted ${allFiles.length} files from folder`)
      } else {
        console.log('No files found in folder, it is empty')
      }
    } else {
      // 删除单个文件
      const { error } = await storage.remove(path)
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: '删除失败' },
      { status: 500 }
    )
  }
}
