"use client"

/**
 * RFQ Quotation Import Dialog
 * 供应商报价 Excel 导入对话框
 */

import { useState, useRef } from "react"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Download } from "lucide-react"

interface ImportResult {
  total: number
  success: number
  failed: number
  quotationsCreated: number
  moldQuotationsCreated: number
  errors: Array<{ row: number; error: string }>
}

interface QuotationImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rfqId: string
  rfqCode: string
  onSuccess?: () => void
}

export function QuotationImportDialog({ 
  open, 
  onOpenChange, 
  rfqId,
  rfqCode,
  onSuccess 
}: QuotationImportDialogProps) {
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [file, setFile] = useState<File | null>(null)
  const [updateExisting, setUpdateExisting] = useState(true)
  const [importing, setImporting] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError(null)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("update_existing", updateExisting.toString())

      const response = await fetch(`/api/rfqs/${rfqId}/quotations/import`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Import failed")
      }

      setResult(data.results)
      
      if (data.results.success > 0 && data.results.failed === 0) {
        // 全部成功，自动关闭并刷新
        setTimeout(() => {
          onSuccess?.()
          handleClose()
        }, 1000)
      } else if (data.results.success > 0) {
        // 部分成功，刷新数据但保持对话框打开显示错误
        onSuccess?.()
      }
    } catch (err: any) {
      setError(err.message || "Import failed")
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setFile(null)
    setResult(null)
    setError(null)
    setUpdateExisting(true)
    onOpenChange(false)
  }

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      const response = await fetch(`/api/rfqs/${rfqId}/quotations/template`)
      
      if (!response.ok) {
        throw new Error('Failed to download template')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rfq_quotation_template_${rfqCode}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.message || 'Failed to download template')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{t("rfqs.quotations.importTitle")}</DialogTitle>
          <DialogDescription>
            {t("rfqs.quotations.importDescription", { code: rfqCode })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Download Template */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{t("rfqs.quotations.templateTitle")}</p>
              <p className="text-xs text-muted-foreground">
                {t("rfqs.quotations.templateDescription")}
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
            >
              {downloadingTemplate ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              {t("rfqs.quotations.downloadTemplate")}
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>{t("rfqs.quotations.selectFile")}</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-8 w-8 text-green-500" />
                  <span className="font-medium">{file.name}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t("rfqs.quotations.dropzone")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="updateExisting"
              checked={updateExisting}
              onCheckedChange={(checked) => setUpdateExisting(checked as boolean)}
            />
            <Label htmlFor="updateExisting" className="text-sm">
              {t("rfqs.quotations.updateExisting")}
            </Label>
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Result */}
          {result && (
            <Alert variant={result.failed > 0 ? "destructive" : "default"}>
              {result.failed > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-1">
                  <p>
                    {t("rfqs.quotations.importResult", {
                      total: String(result.total),
                      success: String(result.success),
                      failed: String(result.failed),
                    })}
                  </p>
                  {result.quotationsCreated > 0 && (
                    <p className="text-sm">
                      {t("rfqs.quotations.quotationsCreated", { count: String(result.quotationsCreated) })}
                    </p>
                  )}
                  {result.moldQuotationsCreated > 0 && (
                    <p className="text-sm">
                      {t("rfqs.quotations.moldQuotationsCreated", { count: String(result.moldQuotationsCreated) })}
                    </p>
                  )}
                  {result.errors.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto text-sm">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <p key={i} className="text-destructive">
                          Row {err.row}: {err.error}
                        </p>
                      ))}
                      {result.errors.length > 5 && (
                        <p className="text-muted-foreground">
                          ... and {result.errors.length - 5} more errors
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("rfqs.quotations.importing")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t("rfqs.quotations.importButton")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
