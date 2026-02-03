"use client"

/**
 * Supplier Excel Import Dialog
 * 供应商 Excel 导入对话框
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
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

interface ImportResult {
  total: number
  success: number
  failed: number
  created: number
  updated: number
  errors: Array<{ row: number; error: string }>
}

interface ExcelImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ExcelImportDialog({ open, onOpenChange, onSuccess }: ExcelImportDialogProps) {
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [file, setFile] = useState<File | null>(null)
  const [updateExisting, setUpdateExisting] = useState(false)
  const [importing, setImporting] = useState(false)
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

      const response = await fetch("/api/suppliers/import", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Import failed")
      }

      setResult(data.results)
      
      if (data.results.success > 0) {
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
    setUpdateExisting(false)
    onOpenChange(false)
  }

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Code": "",
        "Name (EN)": "Example Supplier",
        "Name (CN)": "示例供应商",
        "Country": "CN",
        "Type": "manufacturer",
        "Rating": "5",
        "Address (EN)": "123 Factory Road, Shenzhen",
        "Address (CN)": "深圳市工厂路123号",
        "Capabilities": "injection molding, CNC machining",
        "Certifications": "ISO9001, ISO14001",
        "Remarks": "",
      },
    ]

    import("xlsx").then((XLSX) => {
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(templateData)
      
      worksheet["!cols"] = [
        { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 10 },
        { wch: 15 }, { wch: 8 }, { wch: 40 }, { wch: 40 },
        { wch: 40 }, { wch: 40 }, { wch: 40 },
      ]
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers")
      XLSX.writeFile(workbook, "suppliers_template.xlsx")
    })
  }


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("suppliers.importData.title")}</DialogTitle>
          <DialogDescription>
            {t("suppliers.importData.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>{t("suppliers.importData.selectFile")}</Label>
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
                    {t("suppliers.importData.dropzone")}
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
              {t("suppliers.importData.updateExisting")}
            </Label>
          </div>

          {/* Download Template */}
          <Button variant="link" className="p-0 h-auto" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            {t("suppliers.importData.downloadTemplate")}
          </Button>

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
                    {t("suppliers.importData.result", {
                      total: String(result.total),
                      success: String(result.success),
                      failed: String(result.failed),
                    })}
                  </p>
                  {result.created > 0 && (
                    <p className="text-sm">{t("suppliers.importData.created", { count: String(result.created) })}</p>
                  )}
                  {result.updated > 0 && (
                    <p className="text-sm">{t("suppliers.importData.updated", { count: String(result.updated) })}</p>
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
                {t("suppliers.importData.importing")}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t("suppliers.importData.import")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
