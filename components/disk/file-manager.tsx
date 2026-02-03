"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import {
  Folder, FolderOpen, FileIcon, ChevronRight, ChevronDown, Home,
  Upload, FolderPlus, Download, Trash2, RefreshCw, Grid, List,
  FileText, FileSpreadsheet, FileImage, FileVideo, FileAudio,
  Archive, Code, Loader2, FolderUp, Search
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger
} from "@/components/ui/context-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { formatFileSize } from "@/lib/utils"

// File icon configuration
const getFileIcon = (fileName: string, isFolder: boolean) => {
  if (isFolder) return { Icon: Folder, color: 'text-amber-500' }

  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (['xlsx', 'xls', 'csv'].includes(ext)) return { Icon: FileSpreadsheet, color: 'text-green-600' }
  if (['docx', 'doc'].includes(ext)) return { Icon: FileText, color: 'text-blue-600' }
  if (ext === 'pdf') return { Icon: FileText, color: 'text-red-600' }
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return { Icon: FileImage, color: 'text-purple-600' }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { Icon: Archive, color: 'text-yellow-600' }
  if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) return { Icon: FileVideo, color: 'text-pink-600' }
  if (['mp3', 'wav', 'flac'].includes(ext)) return { Icon: FileAudio, color: 'text-indigo-600' }
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'cpp', 'json', 'html', 'css'].includes(ext)) return { Icon: Code, color: 'text-gray-600' }
  if (['txt', 'md', 'log'].includes(ext)) return { Icon: FileText, color: 'text-gray-500' }
  return { Icon: FileIcon, color: 'text-gray-400' }
}

interface FileItem {
  id: string
  name: string
  path: string
  isFolder: boolean
  size?: number
  updatedAt?: string
}

interface FolderTreeItem {
  name: string
  path: string
  children: FolderTreeItem[]
  expanded?: boolean
}

// 选中文件的详细信息（用于 select 模式回调）
export interface SelectedFileInfo {
  id: string
  name: string
  path: string
  size?: number
  type?: string
}

interface FileManagerProps {
  /** 初始路径 */
  initialPath?: string
  /** 模式：browse（浏览）或 select（选择文件） */
  mode?: 'browse' | 'select'
  /** 是否允许多选（仅 select 模式有效） */
  multiple?: boolean
  /** 限制可选文件类型，如 ['pdf', 'docx']（仅 select 模式有效） */
  acceptTypes?: string[]
  /** 选择确认回调（仅 select 模式有效） */
  onSelect?: (files: SelectedFileInfo[]) => void
  /** 取消选择回调（仅 select 模式有效） */
  onCancel?: () => void
}

export function FileManager({
  initialPath = "",
  mode = 'browse',
  multiple = true,
  acceptTypes,
  onSelect,
  onCancel,
}: FileManagerProps) {
  const isSelectMode = mode === 'select'
  const [files, setFiles] = useState<FileItem[]>([])
  const [folders, setFolders] = useState<FolderTreeItem[]>([])
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']))
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null)
  const [newFolderDialog, setNewFolderDialog] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<FileItem[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const dragCounter = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [allFilesCache, setAllFilesCache] = useState<FileItem[]>([])
  const { toast } = useToast()

  // Load current directory files from S3 via API
  const loadCurrentFiles = useCallback(async () => {
    try {
      const prefix = currentPath ? `${currentPath}/` : ''
      const response = await fetch(`/api/disk/list?prefix=${encodeURIComponent(prefix)}`)

      if (!response.ok) {
        throw new Error('Failed to load files')
      }

      const data = await response.json()
      const items: FileItem[] = []

      // Add folders
      if (data.folders) {
        data.folders.forEach((folder: { name: string; path: string }) => {
          items.push({
            id: `folder-${folder.name}`,
            name: folder.name,
            path: folder.path,
            isFolder: true,
          })
        })
      }

      // Add files (exclude .keep placeholder files)
      if (data.files) {
        data.files.forEach((file: { name: string; path: string; size?: number; lastModified?: string }) => {
          if (file.name === '.keep') return
          items.push({
            id: file.path,
            name: file.name,
            path: file.path,
            isFolder: false,
            size: file.size,
            updatedAt: file.lastModified,
          })
        })
      }

      // Sort: folders first, then by name
      items.sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      setFiles(items)
    } catch (error) {
      console.error('Load files error:', error)
      toast({ title: "Load failed", variant: "destructive" })
    }
  }, [currentPath, toast])

  // Load folder tree from S3 via API
  const loadFolderTree = useCallback(async () => {
    try {
      const response = await fetch('/api/disk/folders')

      if (!response.ok) {
        throw new Error('Failed to load folders')
      }

      const data = await response.json()
      setFolders(data.folders || [])
    } catch (error) {
      console.error('Load folder tree error:', error)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadCurrentFiles(), loadFolderTree()])
      setLoading(false)
    }
    load()
  }, [loadCurrentFiles, loadFolderTree])

  // 当 currentPath 变化时，确保展开所有父文件夹
  useEffect(() => {
    if (currentPath) {
      const parts = currentPath.split('/')
      const pathsToExpand: string[] = ['']
      let currentPathPart = ''
      for (const part of parts) {
        currentPathPart = currentPathPart ? `${currentPathPart}/${part}` : part
        pathsToExpand.push(currentPathPart)
      }
      setExpandedFolders(prev => {
        const newSet = new Set([...prev, ...pathsToExpand])
        return newSet.size !== prev.size ? newSet : prev
      })
    }
  }, [currentPath])

  // Refresh
  const handleRefresh = async () => {
    setLoading(true)
    await Promise.all([loadCurrentFiles(), loadFolderTree()])
    setLoading(false)
  }

  // 加载所有文件用于搜索
  const loadAllFilesForSearch = useCallback(async () => {
    if (allFilesCache.length > 0) return allFilesCache

    try {
      const response = await fetch(`/api/disk/list?prefix=&recursive=true`)
      if (!response.ok) throw new Error('Failed to load files')

      const data = await response.json()
      const allFiles = (data.files || []).map((file: any) => ({
        id: file.path,
        name: file.name,
        path: file.path,
        isFolder: false,
        size: file.size,
        updatedAt: file.lastModified,
      }))

      setAllFilesCache(allFiles)
      return allFiles
    } catch (error) {
      console.error('Load files error:', error)
      return []
    }
  }, [allFilesCache])

  // 打开搜索时加载文件
  useEffect(() => {
    if (showSearch) {
      loadAllFilesForSearch()
    }
  }, [showSearch, loadAllFilesForSearch])

  // 实时搜索过滤
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const queryLower = searchQuery.toLowerCase()
    const results = allFilesCache.filter(
      file => file.name.toLowerCase().includes(queryLower) ||
        file.path.toLowerCase().includes(queryLower)
    ).slice(0, 50) // 限制结果数量

    setSearchResults(results)
  }, [searchQuery, allFilesCache])

  // 键盘快捷键 Ctrl+K 打开搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 清除搜索
  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setShowSearch(false)
  }

  // 跳转到文件所在目录
  const goToFile = (item: FileItem) => {
    const pathParts = item.path.split('/')
    pathParts.pop() // 移除文件名
    const folderPath = pathParts.join('/')
    setCurrentPath(folderPath)
    clearSearch()
    // 刷新文件缓存
    setAllFilesCache([])
    // 选中该文件
    setTimeout(() => {
      setSelectedFiles(new Set([item.path]))
    }, 100)
  }

  // Enter folder - 同时展开路径上的所有父文件夹
  const enterFolder = (path: string) => {
    setCurrentPath(path)
    setSelectedFiles(new Set())

    // 展开路径上的所有父文件夹
    if (path) {
      const parts = path.split('/')
      const pathsToExpand: string[] = ['']  // 根目录
      let currentPathPart = ''
      for (const part of parts) {
        currentPathPart = currentPathPart ? `${currentPathPart}/${part}` : part
        pathsToExpand.push(currentPathPart)
      }
      setExpandedFolders(prev => new Set([...prev, ...pathsToExpand]))
    }
  }

  // Toggle folder expand
  const toggleFolderExpand = async (path: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedFolders(newExpanded)
  }

  // Select file
  const toggleSelect = (path: string, e?: React.MouseEvent) => {
    const newSelected = new Set(selectedFiles)

    // 在 select 模式下，检查是否允许多选
    if (isSelectMode && !multiple) {
      // 单选模式
      newSelected.clear()
      newSelected.add(path)
    } else if (e?.ctrlKey || e?.metaKey || isSelectMode) {
      // 多选模式（按住 Ctrl/Cmd 或在 select 模式下）
      if (newSelected.has(path)) newSelected.delete(path)
      else newSelected.add(path)
    } else {
      newSelected.clear()
      newSelected.add(path)
    }
    setSelectedFiles(newSelected)
  }

  // 检查文件类型是否被接受（用于 select 模式）
  const isFileAccepted = (fileName: string): boolean => {
    if (!acceptTypes || acceptTypes.length === 0) return true
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    return acceptTypes.includes(ext)
  }

  // 确认选择（select 模式）
  const handleConfirmSelection = () => {
    if (!onSelect) return

    const selectedItems: SelectedFileInfo[] = files
      .filter(f => selectedFiles.has(f.path) && !f.isFolder)
      .map(f => ({
        id: f.id,
        name: f.name,
        path: f.path,
        size: f.size,
      }))

    onSelect(selectedItems)
  }

  // 取消选择（select 模式）
  const handleCancelSelection = () => {
    setSelectedFiles(new Set())
    onCancel?.()
  }

  // 检查文件是否可预览（图片、PDF）
  const isPreviewable = (fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    const previewableTypes = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf', 'bmp', 'ico']
    return previewableTypes.includes(ext)
  }

  // 预览文件（使用服务端代理，避免签名问题）
  const handlePreview = async (item: FileItem) => {
    // 直接使用 /api/disk/file 代理获取文件内容
    const previewUrl = `/api/disk/file?path=${encodeURIComponent(item.path)}`
    window.open(previewUrl, '_blank')
  }

  // Double click to open
  const handleDoubleClick = (item: FileItem) => {
    if (item.isFolder) {
      enterFolder(item.path)
    } else if (isSelectMode) {
      // select 模式下双击直接确认选择该文件
      if (isFileAccepted(item.name)) {
        setSelectedFiles(new Set([item.path]))
        setTimeout(() => handleConfirmSelection(), 100)
      }
    } else if (isPreviewable(item.name)) {
      // 可预览文件直接在新标签页打开
      handlePreview(item)
    } else {
      // 其他文件下载
      handleDownload([item])
    }
  }

  // Download files from S3 (使用服务端代理下载)
  const handleDownload = async (items: FileItem[]) => {
    try {
      for (const item of items) {
        if (item.isFolder) continue

        // 使用代理下载 API
        const downloadUrl = `/api/disk/download?path=${encodeURIComponent(item.path)}`
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = item.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
      toast({ title: '下载成功' })
    } catch (error) {
      console.error('Download error:', error)
      toast({ title: '下载失败', variant: 'destructive' })
    }
  }

  // 下载文件夹（打包成 zip）
  const handleDownloadFolder = async (item: FileItem) => {
    if (!item.isFolder) return

    try {
      setIsUploading(true) // 复用上传进度显示
      setUploadProgress({ current: 0, total: 0 })

      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      // 获取文件夹下所有文件（递归）
      const prefix = item.path.endsWith('/') ? item.path : `${item.path}/`
      const response = await fetch(`/api/disk/list?prefix=${encodeURIComponent(prefix)}&recursive=true`)

      if (!response.ok) {
        throw new Error('Failed to list folder contents')
      }

      const data = await response.json()
      const allFiles = data.files || []

      if (allFiles.length === 0) {
        toast({ title: "文件夹为空", variant: "destructive" })
        return
      }

      setUploadProgress({ current: 0, total: allFiles.length })

      // 下载每个文件并添加到 zip（使用服务端代理）
      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i]
        setUploadProgress({ current: i + 1, total: allFiles.length })

        try {
          // 使用 /api/disk/file 代理获取文件内容
          const fileResponse = await fetch(`/api/disk/file?path=${encodeURIComponent(file.path)}`)
          if (fileResponse.ok) {
            const blob = await fileResponse.blob()

            // 计算相对路径
            let zipPath = file.path
            if (file.path.startsWith(item.path + '/')) {
              zipPath = file.path.substring(item.path.length + 1)
            } else if (file.path.startsWith(item.path)) {
              zipPath = file.path.substring(item.path.length)
            }

            zip.file(zipPath, blob)
          }
        } catch (err) {
          console.error(`Failed to download ${file.name}:`, err)
        }
      }

      // 生成并下载 zip
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${item.name}-${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({ title: `下载成功 (${allFiles.length} 个文件)` })
    } catch (error) {
      console.error('Download folder error:', error)
      toast({ title: "下载失败", variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  // Delete file from S3
  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      const response = await fetch(`/api/disk/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: deleteTarget.path,
          isFolder: deleteTarget.isFolder
        })
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      //toast({ title: "Delete successful" })
      setDeleteTarget(null)
      handleRefresh()
    } catch (error) {
      console.error('Delete error:', error)
      toast({ title: "Delete failed", variant: "destructive" })
    }
  }

  // 使用服务端代理上传文件（避免 presigned URL 签名问题）
  const uploadFileWithProxy = async (file: File, filePath: string): Promise<boolean> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', filePath)

      const response = await fetch('/api/disk/upload', {
        method: 'POST',
        body: formData
      })

      return response.ok
    } catch (error) {
      console.error('Upload error:', error)
      return false
    }
  }

  // Upload files to S3 (supports folder structure via webkitRelativePath)
  const handleUpload = async (fileList: FileList | File[]) => {
    const uploadFiles = Array.from(fileList)
    if (uploadFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress({ current: 0, total: uploadFiles.length })

    let successCount = 0
    let failedFiles: string[] = []

    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i]
        setUploadProgress({ current: i + 1, total: uploadFiles.length })

        // 支持文件夹上传：使用 webkitRelativePath 保留目录结构
        let filePath: string
        const relativePath = (file as any).webkitRelativePath

        if (relativePath) {
          // 文件夹上传：保留相对路径
          filePath = currentPath ? `${currentPath}/${relativePath}` : relativePath
        } else {
          // 普通文件上传
          filePath = currentPath ? `${currentPath}/${file.name}` : file.name
        }

        try {
          // 使用服务端代理上传（避免 presigned URL 签名问题）
          const success = await uploadFileWithProxy(file, filePath)

          if (success) {
            successCount++
          } else {
            failedFiles.push(file.name)
          }
        } catch (err) {
          console.error(`Upload error for ${file.name}:`, err)
          failedFiles.push(file.name)
        }
      }

      if (failedFiles.length > 0) {
        toast({
          title: `上传完成: ${successCount} 成功, ${failedFiles.length} 失败`,
          description: failedFiles.length <= 3 ? failedFiles.join(', ') : `${failedFiles.slice(0, 3).join(', ')} 等`,
          variant: failedFiles.length === uploadFiles.length ? "destructive" : "default"
        })
      } else {
        toast({ title: `上传成功 (${successCount} 个文件)` })
      }
      handleRefresh()
    } catch (error) {
      console.error('Upload error:', error)
      toast({ title: "上传失败", variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  // 触发文件选择
  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  // 触发文件夹选择
  const triggerFolderInput = () => {
    folderInputRef.current?.click()
  }

  // Create folder in S3 (by creating a .keep file)
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      const folderPath = currentPath
        ? `${currentPath}/${newFolderName.trim()}`
        : newFolderName.trim()

      const response = await fetch('/api/disk/ensure-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath })
      })

      if (!response.ok) {
        throw new Error('Create folder failed')
      }

      toast({ title: "Folder created" })
      setNewFolderDialog(false)
      setNewFolderName("")
      handleRefresh()
    } catch (error) {
      console.error('Create folder error:', error)
      toast({ title: "Create failed", variant: "destructive" })
    }
  }

  // Drag and drop handling
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)

    const items = e.dataTransfer.items
    const files: File[] = []

    if (items) {
      // 使用 DataTransferItem API 处理文件夹
      const promises: Promise<void>[] = []

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.kind === 'file') {
          const entry = (item as any).webkitGetAsEntry?.()
          if (entry) {
            promises.push(traverseFileTree(entry, '', files))
          } else {
            // 降级处理
            const file = item.getAsFile()
            if (file) files.push(file)
          }
        }
      }

      await Promise.all(promises)
    } else if (e.dataTransfer.files) {
      files.push(...Array.from(e.dataTransfer.files))
    }

    if (files.length > 0) {
      await handleUpload(files)
    }
  }

  // 递归遍历文件树（支持文件夹拖拽）
  const traverseFileTree = async (item: any, path: string, files: File[]): Promise<void> => {
    if (item.isFile) {
      return new Promise<void>((resolve) => {
        item.file((file: File) => {
          // 为文件添加相对路径
          Object.defineProperty(file, 'webkitRelativePath', {
            value: path + file.name,
            writable: false
          })
          files.push(file)
          resolve()
        })
      })
    } else if (item.isDirectory) {
      const dirReader = item.createReader()

      const readAllEntries = async (): Promise<any[]> => {
        const allEntries: any[] = []

        const readBatch = (): Promise<any[]> => {
          return new Promise((resolve) => {
            dirReader.readEntries((entries: any[]) => {
              resolve(entries)
            })
          })
        }

        let entries = await readBatch()
        while (entries.length > 0) {
          allEntries.push(...entries)
          entries = await readBatch()
        }

        return allEntries
      }

      const entries = await readAllEntries()
      for (const entry of entries) {
        await traverseFileTree(entry, path + item.name + '/', files)
      }
    }
  }

  // Breadcrumb navigation
  const breadcrumbs = currentPath ? currentPath.split('/') : []

  // Render folder tree
  const renderFolderTree = (items: FolderTreeItem[], level = 0) => {
    return items.map(item => (
      <div key={item.path}>
        <div
          className={cn(
            "flex items-center gap-1 py-1 px-2 rounded cursor-pointer hover:bg-muted",
            currentPath === item.path && "bg-primary/10 text-primary"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => enterFolder(item.path)}
        >
          {item.children.length > 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleFolderExpand(item.path) }}
              className="p-0.5"
            >
              {expandedFolders.has(item.path) ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}
          {expandedFolders.has(item.path) ? (
            <FolderOpen className="h-4 w-4 text-amber-500" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500" />
          )}
          <span className="text-sm truncate">{item.name}</span>
        </div>
        {expandedFolders.has(item.path) && item.children.length > 0 && (
          renderFolderTree(item.children, level + 1)
        )}
      </div>
    ))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Select mode header */}
      {isSelectMode && (
        <div className="px-4 py-3 border-b bg-muted/50 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-medium">选择文件</span>
            {acceptTypes && acceptTypes.length > 0 && (
              <span className="text-muted-foreground ml-2">
                (仅限 {acceptTypes.join(', ')} 格式)
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {selectedFiles.size > 0 ? `已选择 ${selectedFiles.size} 个文件` : '点击选择文件'}
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - folder tree */}
        <div className="w-64 border-r flex flex-col">
          <div className="p-3 border-b font-medium text-sm">Folders</div>
          <ScrollArea className="flex-1">
            <div className="p-2">
              <div
                className={cn(
                  "flex items-center gap-2 py-1 px-2 rounded cursor-pointer hover:bg-muted",
                  currentPath === "" && "bg-primary/10 text-primary"
                )}
                onClick={() => { setCurrentPath(""); setSelectedFiles(new Set()) }}
              >
                <Home className="h-4 w-4" />
                <span className="text-sm">Root</span>
              </div>
              {renderFolderTree(folders)}
            </div>
          </ScrollArea>
        </div>

        {/* Right side - file list */}
        <div
          className="flex-1 flex flex-col"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Toolbar */}
          <div className="p-3 border-b flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 text-sm min-w-0 flex-shrink">
                <button
                  onClick={() => { setCurrentPath(""); setSelectedFiles(new Set()) }}
                  className="hover:text-primary flex-shrink-0"
                >
                  <Home className="h-4 w-4" />
                </button>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <button
                      onClick={() => {
                        const path = breadcrumbs.slice(0, index + 1).join('/')
                        setCurrentPath(path)
                        setSelectedFiles(new Set())
                      }}
                      className="hover:text-primary truncate max-w-[100px]"
                      title={crumb}
                    >
                      {crumb}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 搜索按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSearch(true)}
                title="搜索文件"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setNewFolderDialog(true)}>
                <FolderPlus className="h-4 w-4" />
              </Button>
              {/* 上传文件按钮 */}
              <Button variant="outline" size="sm" onClick={triggerFileInput} title="上传文件">
                <Upload className="h-4 w-4" />
              </Button>
              {/* 上传文件夹按钮 */}
              <Button variant="outline" size="sm" onClick={triggerFolderInput} title="上传文件夹">
                <FolderUp className="h-4 w-4" />
              </Button>
              {/* 隐藏的文件输入 */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleUpload(e.target.files)
                    e.target.value = '' // 重置以允许重复选择同一文件
                  }
                }}
              />
              {/* 隐藏的文件夹输入 - 使用 webkitdirectory 属性 */}
              <input
                ref={folderInputRef}
                type="file"
                multiple
                className="hidden"
                // @ts-ignore - webkitdirectory 是非标准属性
                webkitdirectory=""
                // @ts-ignore
                directory=""
                onChange={(e) => {
                  if (e.target.files) {
                    handleUpload(e.target.files)
                    e.target.value = '' // 重置以允许重复选择同一文件夹
                  }
                }}
              />
              <div className="flex border rounded">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* File list */}
          <ScrollArea className="flex-1 relative">
            {/* Drag overlay */}
            {isDragging && (
              <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary z-10 flex items-center justify-center">
                <div className="text-center">
                  <Upload className="h-12 w-12 mx-auto text-primary mb-2" />
                  <p className="text-lg font-medium">Drop files here to upload</p>
                </div>
              </div>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div className="absolute inset-0 bg-background/80 z-20 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Uploading ({uploadProgress.current}/{uploadProgress.total})</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Folder className="h-16 w-16 mb-4" />
                <p>This folder is empty</p>
                <p className="text-sm">Drop files or click upload button</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {files.map(item => {
                  const { Icon, color } = getFileIcon(item.name, item.isFolder)
                  const isSelected = selectedFiles.has(item.path)
                  const isDisabled = isSelectMode && !item.isFolder && !isFileAccepted(item.name)

                  return (
                    <ContextMenu key={item.path}>
                      <ContextMenuTrigger disabled={isDisabled}>
                        <div
                          className={cn(
                            "flex flex-col items-center p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors",
                            isSelected && "bg-primary/10 ring-2 ring-primary",
                            isDisabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
                          )}
                          onClick={(e) => !isDisabled && toggleSelect(item.path, e)}
                          onDoubleClick={() => !isDisabled && handleDoubleClick(item)}
                        >
                          <Icon className={cn("h-12 w-12 mb-2", color)} />
                          <span className="text-sm text-center truncate w-full">{item.name}</span>
                          {!item.isFolder && item.size && (
                            <span className="text-xs text-muted-foreground">{formatFileSize(item.size)}</span>
                          )}
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        {!item.isFolder && isPreviewable(item.name) && (
                          <ContextMenuItem onClick={() => handlePreview(item)}>
                            <FileImage className="h-4 w-4 mr-2" /> 预览
                          </ContextMenuItem>
                        )}
                        {!item.isFolder ? (
                          <ContextMenuItem onClick={() => handleDownload([item])}>
                            <Download className="h-4 w-4 mr-2" /> 下载
                          </ContextMenuItem>
                        ) : (
                          <ContextMenuItem onClick={() => handleDownloadFolder(item)}>
                            <Download className="h-4 w-4 mr-2" /> 下载为 ZIP
                          </ContextMenuItem>
                        )}
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => setDeleteTarget(item)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> 删除
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  )
                })}
              </div>
            ) : (
              <div className="p-2">
                {files.map(item => {
                  const { Icon, color } = getFileIcon(item.name, item.isFolder)
                  const isSelected = selectedFiles.has(item.path)
                  const isDisabled = isSelectMode && !item.isFolder && !isFileAccepted(item.name)

                  return (
                    <ContextMenu key={item.path}>
                      <ContextMenuTrigger disabled={isDisabled}>
                        <div
                          className={cn(
                            "flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-muted",
                            isSelected && "bg-primary/10",
                            isDisabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
                          )}
                          onClick={(e) => !isDisabled && toggleSelect(item.path, e)}
                          onDoubleClick={() => !isDisabled && handleDoubleClick(item)}
                        >
                          <Icon className={cn("h-5 w-5", color)} />
                          <span className="flex-1 truncate">{item.name}</span>
                          {!item.isFolder && item.size && (
                            <span className="text-sm text-muted-foreground">{formatFileSize(item.size)}</span>
                          )}
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        {!item.isFolder && isPreviewable(item.name) && (
                          <ContextMenuItem onClick={() => handlePreview(item)}>
                            <FileImage className="h-4 w-4 mr-2" /> 预览
                          </ContextMenuItem>
                        )}
                        {!item.isFolder ? (
                          <ContextMenuItem onClick={() => handleDownload([item])}>
                            <Download className="h-4 w-4 mr-2" /> 下载
                          </ContextMenuItem>
                        ) : (
                          <ContextMenuItem onClick={() => handleDownloadFolder(item)}>
                            <Download className="h-4 w-4 mr-2" /> 下载为 ZIP
                          </ContextMenuItem>
                        )}
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => setDeleteTarget(item)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> 删除
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Select mode footer */}
      {isSelectMode && (
        <div className="px-4 py-3 border-t bg-background flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {multiple ? '可多选文件，双击快速选择单个文件' : '单选模式，点击选择文件'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancelSelection}>
              取消
            </Button>
            <Button
              onClick={handleConfirmSelection}
              disabled={selectedFiles.size === 0}
            >
              确认选择 ({selectedFiles.size})
            </Button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?{deleteTarget?.isFolder && " All files in this folder will also be deleted."} This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New folder dialog */}
      <Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Search dialog - Command Palette 风格 */}
      <CommandDialog open={showSearch} onOpenChange={(open) => { setShowSearch(open); if (!open) { setSearchQuery(""); setSearchResults([]) } }}>
        <CommandInput
          placeholder="搜索文件... (Ctrl+K)"
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList className="max-h-[400px]">
          <CommandEmpty>
            {allFilesCache.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                加载中...
              </div>
            ) : (
              "未找到匹配的文件"
            )}
          </CommandEmpty>
          {searchResults.length > 0 && (
            <CommandGroup heading={`找到 ${searchResults.length} 个文件`}>
              {searchResults.map(item => {
                const { Icon, color } = getFileIcon(item.name, item.isFolder)

                return (
                  <CommandItem
                    key={item.path}
                    value={item.path}
                    onSelect={() => goToFile(item)}
                    className="cursor-pointer"
                  >
                    <Icon className={cn("h-4 w-4 mr-2 flex-shrink-0", color)} />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="truncate font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.path}</div>
                    </div>
                    {item.size && (
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {formatFileSize(item.size)}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </div>
  )
}