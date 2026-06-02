import { NextRequest, NextResponse } from 'next/server'
import { createStorage } from '@/lib/s3/storage'
import { createServerPocketBase } from '@/lib/pocketbase/server'
import { getOrderDocumentPath, extractOrderPathInfo } from '@/lib/services/shipment-document-path'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * 获取PI文档列表
 * @description 获取指定订单的Proforma Invoice（PI）PDF文档列表
 * @param id {string} 订单ID
 * @response 200:DocumentSchema:PI文档列表
 * @response 400 缺少客户或项目信息
 * @response 401 未授权
 * @response 500 服务器错误
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const pb = await createServerPocketBase()
    
    // Check authentication
    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Load order with expand
    const order = await pb.collection('so').getOne(id, {
      expand: 'customer,project'
    }) as any
    
    // Extract path info
    const pathInfo = extractOrderPathInfo(order)
    if (!pathInfo) {
      return NextResponse.json({ error: 'Missing customer or project information' }, { status: 400 })
    }
    
    // Build PI directory path
    const piDirectory = getOrderDocumentPath(pathInfo, 'PI')
    
    // Load files from S3
    const storage = createStorage()
    const { data: files, error } = await storage.list({ prefix: piDirectory, delimiter: '' })
    
    if (error) {
      console.error('S3 list error:', error)
      return NextResponse.json({ error: 'Failed to load PI documents' }, { status: 500 })
    }
    
    // Filter for PDF files only and exclude hidden files
    const piFiles = files
      .filter(f => !f.name.startsWith('.') && !f.isFolder && f.name.toLowerCase().endsWith('.pdf'))
      .map(f => ({
        name: f.name,
        path: f.path,
        size: f.size,
        lastModified: f.lastModified?.toISOString() || new Date().toISOString()
      }))
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
    
    return NextResponse.json({ files: piFiles })
  } catch (error: any) {
    console.error('Load PI documents error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to load PI documents' },
      { status: 500 }
    )
  }
}
