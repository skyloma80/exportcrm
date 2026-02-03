"use client"

/**
 * Merge to Quotation Dialog
 * 合并转报价对话框
 * 
 * Allows merging multiple RFQs into a single customer quotation.
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MergeToQuotationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rfqIds: string[]
  onSuccess: (quotationId: string) => void
}

interface RFQInfo {
  id: string
  code: string
  project: string
  projectName: string
  itemCount: number
}

interface ProductQuotation {
  productId: string
  productCode: string
  productName: string
  quantity: number
  unit: string
  suppliers: Array<{
    supplierId: string
    supplierName: string
    unitPrice: number
    rfqId: string
  }>
  selectedSupplierId?: string
}

export function MergeToQuotationDialog({
  open,
  onOpenChange,
  rfqIds,
  onSuccess,
}: MergeToQuotationDialogProps) {
  const { t, locale } = useI18n()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [converting, setConverting] = useState(false)
  const [rfqInfos, setRfqInfos] = useState<RFQInfo[]>([])
  const [products, setProducts] = useState<ProductQuotation[]>([])
  const [projectInfo, setProjectInfo] = useState<{ id: string; name: string; customer: string } | null>(null)

  // Get display name based on locale
  const getDisplayName = (item: { name?: string; name_cn?: string }) => {
    if (locale === "zh" && item.name_cn) return item.name_cn
    return item.name || "-"
  }

  // Load RFQ data when dialog opens
  useEffect(() => {
    if (open && rfqIds.length > 0) {
      loadRFQData()
    }
  }, [open, rfqIds])

  const loadRFQData = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/rfqs/merge-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfqIds }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "加载数据失败")
      }

      const data = await response.json()
      setRfqInfos(data.rfqs)
      setProducts(data.products.map((p: ProductQuotation) => ({
        ...p,
        // Auto-select lowest price supplier
        selectedSupplierId: p.suppliers.length > 0
          ? p.suppliers.reduce((min, s) => s.unitPrice < min.unitPrice ? s : min).supplierId
          : undefined,
      })))
      setProjectInfo(data.project)
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      })
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  // Handle supplier selection for a product
  const handleSupplierSelect = (productId: string, supplierId: string) => {
    setProducts(prev => prev.map(p =>
      p.productId === productId ? { ...p, selectedSupplierId: supplierId } : p
    ))
  }

  // Handle convert
  const handleConvert = async () => {
    // Validate all products have selected suppliers
    const missingSelections = products.filter(p => p.suppliers.length > 0 && !p.selectedSupplierId)
    if (missingSelections.length > 0) {
      toast({
        title: "请选择供应商",
        description: `${missingSelections.length} 个产品尚未选择供应商报价`,
        variant: "destructive",
      })
      return
    }

    setConverting(true)
    try {
      const response = await fetch("/api/rfqs/merge-to-quotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfqIds,
          productSupplierMapping: Object.fromEntries(
            products
              .filter(p => p.selectedSupplierId)
              .map(p => [p.productId, p.selectedSupplierId])
          ),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "转换失败")
      }

      const result = await response.json()
      toast({
        title: t("common.success"),
        description: `已创建报价单 ${result.quotationCode}`,
      })
      onSuccess(result.quotationId)
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setConverting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>合并转换为报价</DialogTitle>
          <DialogDescription>
            将以下 {rfqIds.length} 个询价单合并转换为一个报价单
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* RFQ List */}
            <div>
              <Label className="text-sm font-medium">选中的询价单</Label>
              <ul className="mt-2 space-y-1">
                {rfqInfos.map(rfq => (
                  <li key={rfq.id} className="text-sm text-muted-foreground">
                    • {rfq.code} ({rfq.itemCount} 个产品)
                  </li>
                ))}
              </ul>
            </div>

            {/* Project Info */}
            {projectInfo && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">项目</Label>
                  <p className="text-sm text-muted-foreground">{projectInfo.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">客户</Label>
                  <p className="text-sm text-muted-foreground">{projectInfo.customer}</p>
                </div>
              </div>
            )}

            {/* Product Quotation Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">产品报价选择</Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>产品</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead>选择供应商报价</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(product => (
                      <TableRow key={product.productId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.productName}</p>
                            <p className="text-sm text-muted-foreground">{product.productCode}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {product.quantity} {product.unit}
                        </TableCell>
                        <TableCell>
                          {product.suppliers.length > 0 ? (
                            <Select
                              value={product.selectedSupplierId}
                              onValueChange={(value) => handleSupplierSelect(product.productId, value)}
                            >
                              <SelectTrigger className="w-[250px]">
                                <SelectValue placeholder="选择供应商" />
                              </SelectTrigger>
                              <SelectContent>
                                {product.suppliers.map(supplier => (
                                  <SelectItem key={supplier.supplierId} value={supplier.supplierId}>
                                    {supplier.supplierName} - ¥{supplier.unitPrice.toFixed(2)}/件
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-muted-foreground text-sm">暂无报价</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Warning */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                转换后将创建新的报价单，原询价单状态将更新为"已完成"
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={converting}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConvert} disabled={loading || converting}>
            {converting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            确认转换
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
