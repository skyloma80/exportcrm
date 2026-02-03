"use client"

/**
 * Supplier Quotation Files Display Component
 * 供应商报价文件显示组件
 * 
 * Displays uploaded quotation files for a supplier in the RFQ detail page.
 * Requirements: 2.1
 */

import { useState, useEffect, useCallback } from "react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { generateSupplierQuotationPath } from "@/lib/services/storage-path"
import {
  FileIcon,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  FileImage,
  Loader2,
  FolderOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FileInfo {
  name: string
  path: string
  size?: number
  lastModified?: string
}

interface SupplierQuotationFilesProps {
  /** Customer name for path generation */
  customerName: string
  /** Project name for path generation */
  projectName: string
  /** RFQ code (e.g., RFQ-2026-00001) */
  rfqCode: string
  /** Supplier code (e.g., SUP-001) */
  supplierCode: string
  /** Supplier name for display */
  supplierName?: string
  /** Show header with title and info */
  showHeader?: boolean
}

// File icon configuration based on extension
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (['xlsx', 'xls', 'csv'].includes(ext)) return { Icon: FileSpreadsheet, color: 'text-green-600' }
  if (['docx', 'doc'].includes(ext)) return { Icon: FileText, color: 'text-blue-600' }
  if (ext === 'pdf') return { Icon: FileText, color: 'text-red-600' }
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return { Icon: FileImage, color: 'text-purple-600' }
  return { Icon: FileIcon, color: 'text-gray-400' }
}

export function SupplierQuotationFiles({
  customerName,
  projectName,
  rfqCode,
  supplierCode,
  supplierName,
  showHeader = false,
}: SupplierQuotationFilesProps) {
  const { t } = useI18n()
  const [files, setFiles] = useState<FileInfo[]>([])
  const [loading, setLoading] = useState(true)

  // Generate folder path for this supplier's quotation files
  const folderPath = generateSupplierQuotationPath(
    customerName,
    projectName,
    rfqCode,
    supplierCode
  )

  // Load file list from S3
  const loadFiles = useCallback(async () => {
    if (!customerName || !projectName || !rfqCode || !supplierCode) {
      setFiles([])
      setLoading(false)
      return
    }

    try {
      const prefix = `${folderPath}/`
      const response = await fetch(`/api/disk/list?prefix=${encodeURIComponent(prefix)}`)
      
      if (!response.ok) {
        setFiles([])
        return
      }
      
      const data = await response.json()
      const fileList: FileInfo[] = (data.files || [])
        .filter((f: any) => f.name !== '.keep')
        .map((f: any) => ({
          name: f.name,
          path: f.path,
          size: f.size,
          lastModified: f.lastModified,
        }))
      
      setFiles(fileList)
    } catch (error) {
      console.error('Load files error:', error)
      setFiles([])
    } finally {
      setLoading(false)
    }
  }, [folderPath, customerName, projectName, rfqCode, supplierCode])

  // Load files on mount
  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Handle file view (open in new tab)
  const handleView = (file: FileInfo, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click
    const viewUrl = `/api/disk/file?path=${encodeURIComponent(file.path)}`
    window.open(viewUrl, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    )
  }

  if (files.length === 0) {
    return null
  }

  // Compact inline display (for table cells)
  if (!showHeader) {
    return (
      <div className="flex flex-wrap gap-1">
        {files.map((file) => {
          const { Icon, color } = getFileIcon(file.name)
          return (
            <button
              key={file.path}
              onClick={(e) => handleView(file, e)}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-muted/50 hover:bg-muted transition-colors"
              title={file.name}
            >
              <Icon className={cn("h-3 w-3", color)} />
              <span className="max-w-[80px] truncate">{file.name}</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </button>
          )
        })}
      </div>
    )
  }

  // Full display with header (for detail pages)
  return (
    <div className="space-y-3">
      {/* Header with title and basic info */}
      <div className="flex items-center gap-2 pb-2 border-b">
        <FolderOpen className="h-4 w-4 text-primary" />
        <div className="flex-1">
          <h4 className="text-sm font-medium">
            {t("rfqs.supplierQuotation.uploadedFiles")}
            {supplierName && (
              <span className="ml-2 text-muted-foreground font-normal">
                - {supplierName}
              </span>
            )}
          </h4>
          <p className="text-xs text-muted-foreground">
            {files.length} {t("common.files")}
            {supplierCode && (
              <span className="ml-2">({supplierCode})</span>
            )}
          </p>
        </div>
      </div>

      {/* File list */}
      <div className="flex flex-wrap gap-2">
        {files.map((file) => {
          const { Icon, color } = getFileIcon(file.name)
          return (
            <button
              key={file.path}
              onClick={(e) => handleView(file, e)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm bg-muted/50 hover:bg-muted transition-colors border"
              title={file.name}
            >
              <Icon className={cn("h-4 w-4", color)} />
              <span className="max-w-[150px] truncate">{file.name}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
