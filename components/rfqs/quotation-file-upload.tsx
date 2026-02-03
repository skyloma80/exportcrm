"use client"

/**
 * Quotation File Upload Component
 * 供应商报价文件上传组件
 * 
 * Allows uploading supplier quotation files to S3 storage.
 * Files are stored at: Customers/{customerName}/{projectName}/rfqs/{rfqCode}/quotations/{supplierCode}/
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n/use-i18n"
import { generateSupplierQuotationPath } from "@/lib/services/storage-path"
import {
  Upload,
  FileIcon,
  Trash2,
  ExternalLink,
  Loader2,
  FileText,
  FileSpreadsheet,
  FileImage,
  RefreshCw,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

interface FileInfo {
  name: string
  path: string
  size?: number
  lastModified?: string
}

interface QuotationFileUploadProps {
  /** Customer name for path generation */
  customerName: string
  /** Project name for path generation */
  projectName: string
  /** RFQ code (e.g., RFQ-2026-00001) */
  rfqCode: string
  /** Supplier code (e.g., SUP-001) */
  supplierCode: string
  /** Disable upload functionality */
  disabled?: boolean
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

// Format file size
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Format date
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString()
  } catch {
    return '-'
  }
}

export function QuotationFileUpload({
  customerName,
  projectName,
  rfqCode,
  supplierCode,
  disabled = false,
}: QuotationFileUploadProps) {
  const { t } = useI18n()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [files, setFiles] = useState<FileInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FileInfo | null>(null)
  const [deleting, setDeleting] = useState(false)

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
        throw new Error('Failed to load files')
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
      // Don't show error toast for empty folders
    } finally {
      setLoading(false)
    }
  }, [folderPath, customerName, projectName, rfqCode, supplierCode])

  // Load files on mount and when path changes
  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  // Handle file selection
  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  // Handle file upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles || selectedFiles.length === 0) return

    setUploading(true)

    try {
      for (const file of Array.from(selectedFiles)) {
        // Validate file size (100MB max)
        if (file.size > 100 * 1024 * 1024) {
          toast({
            title: t("common.error"),
            description: t("rfqs.supplierQuotation.fileTooLarge"),
            variant: "destructive",
          })
          continue
        }

        // Generate full path with filename
        const fullPath = generateSupplierQuotationPath(
          customerName,
          projectName,
          rfqCode,
          supplierCode,
          file.name
        )

        // Upload file
        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', fullPath)

        const response = await fetch('/api/disk/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }
      }

      toast({
        title: t("common.success"),
        description: t("rfqs.supplierQuotation.uploadSuccess"),
      })

      // Refresh file list
      await loadFiles()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast({
        title: t("common.error"),
        description: error.message || t("rfqs.supplierQuotation.uploadError"),
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Handle file view (open in new tab)
  const handleView = (file: FileInfo) => {
    // Use the proxy API to view the file
    const viewUrl = `/api/disk/file?path=${encodeURIComponent(file.path)}`
    window.open(viewUrl, '_blank')
  }

  // Handle file delete
  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)

    try {
      const response = await fetch('/api/disk/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: deleteTarget.path,
          isFolder: false,
        }),
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      toast({
        title: t("common.success"),
        description: t("rfqs.supplierQuotation.deleteSuccess"),
      })

      // Refresh file list
      await loadFiles()
    } catch (error: any) {
      console.error('Delete error:', error)
      toast({
        title: t("common.error"),
        description: error.message || t("rfqs.supplierQuotation.deleteError"),
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  // Check if context is valid
  const isContextValid = customerName && projectName && rfqCode && supplierCode

  return (
    <div className="space-y-3">
      {/* Header with upload button */}
      <div className="flex items-center gap-3">
        <h4 className="text-sm font-medium">{t("rfqs.supplierQuotation.originalFiles")}</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={loadFiles}
          disabled={loading || !isContextValid}
          className="h-7 w-7 p-0"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleFileSelect}
          disabled={disabled || uploading || !isContextValid}
          className="h-7"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5 mr-1" />
          )}
          {uploading ? t("rfqs.supplierQuotation.uploading") : t("rfqs.supplierQuotation.uploadFile")}
        </Button>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {/* Context warning */}
      {!isContextValid && (
        <p className="text-sm text-muted-foreground">
          {t("rfqs.supplierQuotation.missingContext")}
        </p>
      )}

      {/* File list */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : files.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {t("rfqs.supplierQuotation.noFiles")}
        </p>
      ) : (
        <div className="space-y-2 max-w-md">
          {files.map((file) => {
            const { Icon, color } = getFileIcon(file.name)
            return (
              <div
                key={file.path}
                className="flex items-center justify-between p-2 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Icon className={cn("h-5 w-5 flex-shrink-0", color)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {formatDate(file.lastModified)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(file)}
                    title={t("common.view")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(file)}
                    disabled={disabled}
                    title={t("common.delete")}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rfqs.supplierQuotation.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("rfqs.supplierQuotation.deleteConfirm", { name: deleteTarget?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
