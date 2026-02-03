"use client"

/**
 * RFQ Send Email Dialog
 * 询价单发送邮件对话框
 * 
 * Allows users to select suppliers and attachments to send RFQ emails.
 */

import { useState, useEffect } from "react"
import { useI18n } from "@/lib/i18n/use-i18n"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  Mail, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Paperclip,
  Building2,
  FolderOpen,
  X
} from "lucide-react"
import type { RFQSupplierWithExpand, RFQAttachment } from "@/lib/pocketbase/services/rfqs"
import { FileSelectDialog } from "@/components/disk/file-select-dialog"
import type { SelectedFileInfo } from "@/components/disk/file-manager"

interface SendEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rfqId: string
  rfqCode: string
  suppliers: RFQSupplierWithExpand[]
  attachments?: RFQAttachment[]
  onSuccess?: () => void
}

interface SendResult {
  supplierId: string
  supplierName: string
  email: string
  success: boolean
  error?: string
}

export function SendEmailDialog({
  open,
  onOpenChange,
  rfqId,
  rfqCode,
  suppliers,
  attachments = [],
  onSuccess
}: SendEmailDialogProps) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([])
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([])
  const [diskAttachments, setDiskAttachments] = useState<SelectedFileInfo[]>([])
  const [isSending, setIsSending] = useState(false)
  const [results, setResults] = useState<SendResult[] | null>(null)
  const [fileSelectOpen, setFileSelectOpen] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      // Pre-select suppliers that haven't been sent yet
      const pendingSuppliers = suppliers
        .filter(s => s.status === 'pending')
        .map(s => s.supplier)
      setSelectedSuppliers(pendingSuppliers)
      
      // Pre-select all attachments
      setSelectedAttachments(attachments.map(a => a.path))
      
      // Clear disk attachments
      setDiskAttachments([])
      
      setResults(null)
    }
  }, [open]) // Only depend on 'open' to avoid infinite loops

  const handleSupplierToggle = (supplierId: string) => {
    setSelectedSuppliers(prev => 
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    )
  }

  const handleAttachmentToggle = (path: string) => {
    setSelectedAttachments(prev =>
      prev.includes(path)
        ? prev.filter(p => p !== path)
        : [...prev, path]
    )
  }

  const handleSelectAllSuppliers = () => {
    if (selectedSuppliers.length === suppliers.length) {
      setSelectedSuppliers([])
    } else {
      setSelectedSuppliers(suppliers.map(s => s.supplier))
    }
  }

  // Handle files selected from disk
  const handleDiskFilesSelect = (files: SelectedFileInfo[]) => {
    // Merge with existing disk attachments, avoid duplicates
    setDiskAttachments(prev => {
      const existingPaths = new Set(prev.map(f => f.path))
      const newFiles = files.filter(f => !existingPaths.has(f.path))
      return [...prev, ...newFiles]
    })
  }

  // Remove a disk attachment
  const handleRemoveDiskAttachment = (path: string) => {
    setDiskAttachments(prev => prev.filter(f => f.path !== path))
  }

  const handleSend = async () => {
    if (selectedSuppliers.length === 0) {
      toast({
        title: t("common.error"),
        description: t("rfqs.email.noSuppliersSelected"),
        variant: "destructive"
      })
      return
    }

    setIsSending(true)
    setResults(null)

    try {
      const selectedAttachmentData = attachments.filter(a => 
        selectedAttachments.includes(a.path)
      )

      // Combine RFQ attachments with disk attachments
      const allAttachments = [
        ...selectedAttachmentData,
        ...diskAttachments.map(f => ({
          name: f.name,
          path: f.path,
          size: f.size,
          fromDisk: true, // Mark as disk attachment
        }))
      ]

      const response = await fetch(`/api/rfqs/${rfqId}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplierIds: selectedSuppliers,
          attachments: allAttachments,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send emails')
      }

      setResults(data.results)

      if (data.success) {
        toast({
          title: t("common.success"),
          description: t("rfqs.email.sendSuccess", { 
            sent: String(data.totalSent), 
            total: String(data.results.length) 
          })
        })
        // Close dialog first, then call onSuccess to avoid re-render issues
        setTimeout(() => {
          onOpenChange(false)
          // Call onSuccess after dialog is closed to refresh data
          setTimeout(() => {
            onSuccess?.()
          }, 100)
        }, 1500)
      } else {
        toast({
          title: t("common.error"),
          description: t("rfqs.email.sendFailed"),
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error('Send email error:', error)
      toast({
        title: t("common.error"),
        description: error.message || t("rfqs.email.sendError"),
        variant: "destructive"
      })
    } finally {
      setIsSending(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">{t("rfqs.supplierStatus.pending")}</Badge>
      case 'sent':
        return <Badge variant="secondary">{t("rfqs.supplierStatus.sent")}</Badge>
      case 'received':
        return <Badge variant="default">{t("rfqs.supplierStatus.received")}</Badge>
      case 'selected':
        return <Badge className="bg-green-500">{t("rfqs.supplierStatus.selected")}</Badge>
      case 'rejected':
        return <Badge variant="destructive">{t("rfqs.supplierStatus.rejected")}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t("rfqs.email.title")}
          </DialogTitle>
          <DialogDescription>
            {t("rfqs.email.description", { code: rfqCode })}
          </DialogDescription>
        </DialogHeader>

        {results ? (
          // Show results
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{t("rfqs.email.resultSuccess", { count: String(results.filter(r => r.success).length) })}</span>
              {results.some(r => !r.success) && (
                <>
                  <XCircle className="h-4 w-4 text-red-500 ml-4" />
                  <span>{t("rfqs.email.resultFailed", { count: String(results.filter(r => !r.success).length) })}</span>
                </>
              )}
            </div>
            
            <ScrollArea className="h-[300px] border rounded-md p-4">
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-md ${
                      result.success ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium">{result.supplierName}</p>
                        <p className="text-sm text-muted-foreground">{result.email}</p>
                      </div>
                    </div>
                    {!result.success && result.error && (
                      <p className="text-sm text-red-600">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          // Show selection form
          <div className="space-y-6">
            {/* Suppliers Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {t("rfqs.email.selectSuppliers")}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllSuppliers}
                >
                  {selectedSuppliers.length === suppliers.length 
                    ? t("common.deselectAll") 
                    : t("common.selectAll")}
                </Button>
              </div>
              
              <ScrollArea className="h-[200px] border rounded-md p-4">
                {suppliers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("rfqs.suppliers.empty")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {suppliers.map((rfqSupplier) => (
                      <div 
                        key={rfqSupplier.id}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`supplier-${rfqSupplier.id}`}
                            checked={selectedSuppliers.includes(rfqSupplier.supplier)}
                            onCheckedChange={() => handleSupplierToggle(rfqSupplier.supplier)}
                          />
                          <Label 
                            htmlFor={`supplier-${rfqSupplier.id}`}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <span>{rfqSupplier.expand?.supplier?.name || rfqSupplier.supplier}</span>
                            {rfqSupplier.expand?.supplier?.name_cn && (
                              <span className="text-muted-foreground">
                                ({rfqSupplier.expand.supplier.name_cn})
                              </span>
                            )}
                          </Label>
                        </div>
                        {getStatusBadge(rfqSupplier.status)}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <Separator />

            {/* Attachments Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  {t("rfqs.email.selectAttachments")}
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFileSelectOpen(true)}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  {t("rfqs.email.selectFromDisk")}
                </Button>
              </div>
              
              {attachments.length === 0 && diskAttachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("rfqs.attachments.empty")}
                </p>
              ) : (
                <ScrollArea className="h-[150px] border rounded-md p-4">
                  <div className="space-y-2">
                    {/* RFQ Attachments */}
                    {attachments.map((attachment, index) => (
                      <div 
                        key={`rfq-${index}`}
                        className="flex items-center gap-3"
                      >
                        <Checkbox
                          id={`attachment-${index}`}
                          checked={selectedAttachments.includes(attachment.path)}
                          onCheckedChange={() => handleAttachmentToggle(attachment.path)}
                        />
                        <Label 
                          htmlFor={`attachment-${index}`}
                          className="flex items-center gap-2 cursor-pointer flex-1"
                        >
                          <Paperclip className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{attachment.name}</span>
                          {attachment.size && (
                            <span className="text-xs text-muted-foreground">
                              ({(attachment.size / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                    
                    {/* Disk Attachments */}
                    {diskAttachments.length > 0 && (
                      <>
                        {attachments.length > 0 && (
                          <div className="text-xs text-muted-foreground py-1">
                            {t("rfqs.email.diskAttachments")}
                          </div>
                        )}
                        {diskAttachments.map((file, index) => (
                          <div 
                            key={`disk-${index}`}
                            className="flex items-center gap-3 bg-muted/50 rounded px-2 py-1"
                          >
                            <FolderOpen className="h-4 w-4 text-blue-500" />
                            <span className="flex-1 truncate text-sm">{file.name}</span>
                            {file.size && (
                              <span className="text-xs text-muted-foreground">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleRemoveDiskAttachment(file.path)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Warning if no SMTP configured */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-md text-sm">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
              <p className="text-amber-700">
                {t("rfqs.email.smtpWarning")}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {results ? (
            <Button onClick={() => onOpenChange(false)}>
              {t("common.close")}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || selectedSuppliers.length === 0}
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("rfqs.email.sending")}
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    {t("rfqs.email.send")} ({selectedSuppliers.length})
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      {/* File Select Dialog */}
      <FileSelectDialog
        open={fileSelectOpen}
        onOpenChange={setFileSelectOpen}
        multiple={true}
        onSelect={handleDiskFilesSelect}
        title={t("rfqs.email.selectFromDisk")}
      />
    </Dialog>
  )
}

export default SendEmailDialog
