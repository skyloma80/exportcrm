import { NextResponse } from 'next/server'
import { createStorage } from '@/lib/s3/storage'

interface FolderTreeItem {
  name: string
  path: string
  children: FolderTreeItem[]
}

/**
 * 获取文件夹树结构
 * @description 一次性获取所有S3对象，在内存中构建树形文件夹结构，避免递归API调用
 * @response 200:object:返回 { folders: FolderTreeSchema[] } 格式的树形文件夹结构
 * @response 500:ErrorResponse:获取文件夹列表失败
 */
export async function GET() {
  try {
    const storage = createStorage()
    
    // 一次性获取所有对象（不使用 delimiter）
    const { data, error } = await storage.list({ prefix: '', delimiter: '' })
    
    if (error) {
      console.error('List error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // 从所有对象路径中提取文件夹结构
    const folderPaths = new Set<string>()
    
    if (data && Array.isArray(data)) {
      data.forEach((item: any) => {
        if (item.path) {
          // 从文件路径中提取所有父文件夹
          const parts = item.path.split('/')
          // 移除最后一个元素（文件名）
          parts.pop()
          
          // 添加所有父文件夹路径
          let currentPath = ''
          for (const part of parts) {
            if (part) {
              currentPath = currentPath ? `${currentPath}/${part}` : part
              folderPaths.add(currentPath)
            }
          }
        }
      })
    }
    
    // 在内存中构建树结构
    const buildTree = (paths: string[]): FolderTreeItem[] => {
      const root: FolderTreeItem[] = []
      const nodeMap = new Map<string, FolderTreeItem>()
      
      // 按路径长度排序，确保父文件夹先处理
      const sortedPaths = paths.sort((a, b) => {
        const depthA = a.split('/').length
        const depthB = b.split('/').length
        if (depthA !== depthB) return depthA - depthB
        return a.localeCompare(b)
      })
      
      for (const path of sortedPaths) {
        const parts = path.split('/')
        const name = parts[parts.length - 1]
        const parentPath = parts.slice(0, -1).join('/')
        
        const node: FolderTreeItem = {
          name,
          path,
          children: [],
        }
        
        nodeMap.set(path, node)
        
        if (parentPath && nodeMap.has(parentPath)) {
          nodeMap.get(parentPath)!.children.push(node)
        } else if (!parentPath) {
          root.push(node)
        }
      }
      
      // 对每个节点的 children 按名称排序
      const sortChildren = (nodes: FolderTreeItem[]) => {
        nodes.sort((a, b) => a.name.localeCompare(b.name))
        nodes.forEach(node => sortChildren(node.children))
      }
      sortChildren(root)
      
      return root
    }
    
    const folders = buildTree(Array.from(folderPaths))
    
    return NextResponse.json({ folders })
  } catch (error) {
    console.error('Get folders error:', error)
    return NextResponse.json(
      { error: '获取文件夹列表失败' },
      { status: 500 }
    )
  }
}
