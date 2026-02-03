import { NextRequest, NextResponse } from 'next/server'
import { createStorage } from '@/lib/s3/storage'

// POST /api/disk/ensure-folder - 确保文件夹存在（创建 .keep 占位文件）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { path } = body
    
    if (!path) {
      return NextResponse.json(
        { error: '未提供文件夹路径' },
        { status: 400 }
      )
    }
    
    const storage = createStorage()
    
    // 规范化路径
    const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path
    
    // 使用 createFolder 方法创建文件夹（会创建 .keep 文件）
    const { data, error } = await storage.createFolder(normalizedPath)
    
    if (error) {
      // 如果文件夹已存在，返回成功
      if (error.message === 'Folder already exists') {
        return NextResponse.json({
          success: true,
          path: normalizedPath,
          message: '文件夹已存在',
          created: false,
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      path: data?.path || normalizedPath,
      message: '文件夹已创建',
      created: true,
    })
  } catch (error) {
    console.error('Ensure folder error:', error)
    return NextResponse.json(
      { error: '创建文件夹失败' },
      { status: 500 }
    )
  }
}
