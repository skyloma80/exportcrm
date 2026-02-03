"use client"

/**
 * Product Document Manager Component
 * 产品文档管理组件
 * 
 * Provides document upload, preview, download, and management for products.
 * Integrates with S3 storage via the existing file management system.
 */

import React, { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useI18n } from "@/lib/i18n/use-i18n"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { ProductDocument, productDocumentService } from "@/lib/pocketbase/services/products"
import { formatFileSize } from "@/lib/utils"
import {
  FileText, FileImage, Upload, Download, Trash2, Eye, Plus,
  Loader2, FolderOpen, File, FileSpreadsheet, Archive
} from "lucide-react"

// Document type options
const DOCUMENT_TYPES = [
  'drawing',
  'photo', 
  'specification',
  'inspection',
  'certification',
  'sample_approval',
  'other'
] as const

type DocumentType = typeof DOCUMENT_TYPES[number]

// Get file icon based on extension
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (['xlsx', 'xls', 'csv'].includes(ext)) return { Icon: FileSpreadsheet, color: 'text-green-600' }
  if (['docx', 'doc'].includes(ext)) return { Icon: FileText, color: 'text-blue-600' }
  if (ext === 'pdf') return { Icon: FileText, color: 'text-red-600' }
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return { Icon: FileImage, color: 'text-purple-600' }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { Icon: Archive, color: 'text-yellow-600' }
  if (['dwg', 'dxf', 'step', 'stp', 'iges', 'igs'].includes(ext)) return { Icon: FileText, color: 'text-orange-600' }
  return { Icon: File, color: 'text-gray-400' }
}

// Check if file is previewable
const isPreviewable = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  return ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'pdf'].includes(ext)
}

interface ProductDocumentManagerProps {
  productId: string
  productCode: string
  productName: string
  documents: ProductDocument[]
  onDocumentsChange: () => void
  readOnly?: boolean
}

export function ProductDocumentManager({
  productId,
  productCode,
  productName,
  documents,
  onDocumentsChange,
  readOnly = false,
}: ProductDocumentManagerProps) {
  const { t } = useI18n()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // State
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<ProductDocument | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  
  // Upload form state
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadType, setUploadType] = useState<DocumentType>('specification')
  const [uploadRemarks, setUploadRemarks] = useState('')

  // Filter documents by type
  const filteredDocuments = filterType === 'all' 
    ? documents 
    : documents.filter(doc => doc.type === filterType)

  // Generate storage path for product documents
  const generateStoragePath = (fileName: string): string => {
    // Path format: Products/{productCode}/{documentType}/{fileName}
    return `Products/${productCode}/${uploadType}/${fileName}`
  }

  // Upload file to S3 using server proxy (避免 presigned URL 签名问题)
  const uploadFileToS3 = async (file: File, filePath: string): Promise<boolean> => {
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

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setUploadFiles(files)
      setShowUploadDialog(true)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Handle upload
  const handleUpload = async () => {
    if (uploadFiles.length === 0) return
    
    setIsUploading(true)
    setUploadProgress({ current: 0, total: uploadFiles.length })
    
    let successCount = 0
    const failedFiles: string[] = []
    
    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i]
        setUploadProgress({ current: i + 1, total: uploadFiles.length })
        
        const filePath = generateStoragePath(file.name)
        
        // Upload to S3
        const uploadSuccess = await uploadFileToS3(file, filePath)
        
        if (uploadSuccess) {
          // Create document record in PocketBase
          try {
            await productDocumentService.createDocument(productId, {
              type: uploadType,
              name: file.name,
              file_path: filePath,
              file_size: file.size,
              remarks: uploadRemarks || undefined,
            })
            successCount++
          } catch (err) {
            console.error('Failed to create document record:', err)
            failedFiles.push(file.name)
          }
        } else {
          failedFiles.push(file.name)
        }
      }
      
      if (failedFiles.length > 0) {
        toast({
          title: t("products.documents.uploadPartial"),
          description: `${successCount} ${t("common.success")}, ${failedFiles.length} ${t("common.error")}`,
          variant: "default"
        })
      } else {
        toast({
          title: t("products.documents.uploadSuccess"),
          description: `${successCount} ${t("products.documents.filesUploaded")}`,
        })
      }
      
      // Refresh documents list
      onDocumentsChange()
      
      // Reset form
      setShowUploadDialog(false)
      setUploadFiles([])
      setUploadRemarks('')
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: t("products.documents.uploadError"),
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Handle download
  const handleDownload = async (doc: ProductDocument) => {
    try {
      const response = await fetch(`/api/disk/download?path=${encodeURIComponent(doc.file_path)}`)
      
      if (response.ok) {
        // API returns binary file directly, create blob URL
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        
        const a = document.createElement('a')
        a.href = url
        a.download = doc.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        // Clean up blob URL
        URL.revokeObjectURL(url)
        
        toast({ title: t("products.documents.downloadSuccess") })
      } else {
        throw new Error('Download failed')
      }
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: t("products.documents.downloadError"),
        variant: "destructive"
      })
    }
  }

  // Handle preview - 直接在新标签页打开，与 disk 行为一致
  const handlePreview = (doc: ProductDocument) => {
    if (!isPreviewable(doc.name)) {
      // If not previewable, download instead
      handleDownload(doc)
      return
    }
    
    // 直接使用 /api/disk/file 代理获取文件内容，在新标签页打开
    const previewUrl = `/api/disk/file?path=${encodeURIComponent(doc.file_path)}`
    window.open(previewUrl, '_blank')
  }

  // Handle delete
  const handleDelete = async () => {
    if (!selectedDocument) return
    
    try {
      // Delete from S3
      await fetch('/api/disk/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedDocument.file_path })
      })
      
      // Delete from PocketBase
      const pb = getPocketBase()
      await pb.collection('product_documents').delete(selectedDocument.id)
      
      toast({ title: t("products.documents.deleteSuccess") })
      
      // Refresh documents list
      onDocumentsChange()
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: t("products.documents.deleteError"),
        variant: "destructive"
      })
    } finally {
      setShowDeleteDialog(false)
      setSelectedDocument(null)
    }
  }

  // Confirm delete
  const confirmDelete = (doc: ProductDocument) => {
    setSelectedDocument(doc)
    setShowDeleteDialog(true)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              {t("products.documents.title")}
            </CardTitle>
            <CardDescription>{t("products.documents.description")}</CardDescription>
          </div>
          {!readOnly && (
            <Button onClick={() => fileInputRef.current?.click()}>
              <Plus className="h-4 w-4 mr-2" />
              {t("products.documents.add")}
            </Button>
          )}
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </CardHeader>
      
      <CardContent>
        {/* Filter by type */}
        {documents.length > 0 && (
          <div className="mb-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t("products.documents.filterByType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("products.documents.allTypes")}</SelectItem>
                {DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {t(`products.docTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Document list */}
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("products.documents.empty")}</p>
            {!readOnly && (
              <p className="text-sm mt-2">{t("products.documents.uploadHint")}</p>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredDocuments.map((doc) => {
                const { Icon, color } = getFileIcon(doc.name)
                const canPreview = isPreviewable(doc.name)
                
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Icon className={`h-8 w-8 flex-shrink-0 ${color}`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{doc.name}</span>
                        <Badge variant="outline">
                          {t(`products.docTypes.${doc.type}`)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {doc.file_size && (
                          <span>{formatFileSize(doc.file_size)}</span>
                        )}
                        {doc.remarks && (
                          <span className="truncate">{doc.remarks}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {canPreview && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(doc)}
                          title={t("products.documents.preview")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(doc)}
                        title={t("products.documents.download")}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => confirmDelete(doc)}
                          title={t("common.delete")}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      
      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("products.documents.uploadTitle")}</DialogTitle>
            <DialogDescription>
              {t("products.documents.uploadDescription")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Selected files */}
            <div>
              <Label>{t("products.documents.selectedFiles")}</Label>
              <div className="mt-2 p-3 border rounded-lg bg-muted/50 max-h-[150px] overflow-y-auto">
                {uploadFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm py-1">
                    <File className="h-4 w-4" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-muted-foreground">
                      ({formatFileSize(file.size)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Document type */}
            <div>
              <Label>{t("products.documents.type")}</Label>
              <Select value={uploadType} onValueChange={(v) => setUploadType(v as DocumentType)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {t(`products.docTypes.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Remarks */}
            <div>
              <Label>{t("products.documents.remarks")}</Label>
              <Textarea
                className="mt-2"
                placeholder={t("products.documents.remarksPlaceholder")}
                value={uploadRemarks}
                onChange={(e) => setUploadRemarks(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadProgress.current}/{uploadProgress.total}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("products.documents.upload")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("products.documents.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("products.documents.deleteConfirmDescription", { name: selectedDocument?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

export default ProductDocumentManager
