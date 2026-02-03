"use client"

/**
 * Import from Cost Table Dialog
 * 从成本表导入对话框
 * 
 * Allows importing products with cost prices from project cost table
 */

import { useState, useEffect } from "react"
import { useI18n } from "@/lib/i18n/use-i18n"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, Package, AlertCircle } from "lucide-react"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { findCurrencyByCode } from "@/lib/constants/trade-constants"

// ============================================================================
// Types
// ============================================================================

export interface ImportedCostItem {
  productId: string
  productCode: string
  productName: string
  productNameCn?: string
  description?: string
  descriptionCn?: string
  partNumber?: string
  unit: string
  quantity: number
  costPrice: number
  // Packaging info
  pcsPerCarton?: number
  cartonDimensions?: { length?: number; width?: number; height?: number }
  cartonGrossWeight?: number
  currency: string
}

interface ImportFromCostTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onImport: (items: ImportedCostItem[]) => void
}

// ============================================================================
// Component
// ============================================================================

export function ImportFromCostTableDialog({
  open,
  onOpenChange,
  projectId,
  onImport,
}: ImportFromCostTableDialogProps) {
  const { t, locale } = useI18n()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<ImportedCostItem[]>([])
  const [error, setError] = useState<string | null>(null)

  // Load cost table items when dialog opens
  useEffect(() => {
    if (open && projectId) {
      loadCostTableItems()
    }
  }, [open, projectId])

  const loadCostTableItems = async () => {
    setLoading(true)
    setError(null)

    try {
      const pb = getPocketBase()

      // Get cost table for project
      const costTables = await pb.collection('project_cost_tables').getFullList({
        filter: `project = "${projectId}"`,
        expand: 'project',
      })

      if (costTables.length === 0) {
        setError(t('quotations.import.noCostTable'))
        setItems([])
        setLoading(false)
        return
      }

      const costTable = costTables[0]

      // Get cost table items with product details
      const costTableItems = await pb.collection('project_cost_table_items').getFullList({
        filter: `cost_table = "${costTable.id}"`,
        expand: 'product',
      })

      if (costTableItems.length === 0) {
        setError(t('quotations.import.noCostTableItems'))
        setItems([])
        setLoading(false)
        return
      }

      // Transform to ImportedCostItem format
      const importedItems: ImportedCostItem[] = costTableItems.map((item: any) => {
        const product = item.expand?.product
        return {
          productId: item.product,
          productCode: product?.code || '',
          productName: product?.name || '',
          productNameCn: product?.name_cn,
          description: product?.description,
          descriptionCn: product?.description_cn,
          partNumber: product?.part_number,
          unit: product?.unit || '',
          quantity: item.quantity,
          costPrice: item.unit_price,
          currency: costTable.currency || "CNY",
          pcsPerCarton: product?.pcs_per_carton,
          cartonDimensions: product?.carton_dimensions,
          cartonGrossWeight: product?.carton_gross_weight,
        }
      })

      setItems(importedItems)
    } catch (err: any) {
      console.error('Error loading cost table:', err)
      setError(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleImport = () => {
    if (items.length > 0) {
      onImport(items)
      onOpenChange(false)
    }
  }

  const getDisplayName = (item: ImportedCostItem) => {
    if (locale === 'zh' && item.productNameCn) {
      return item.productNameCn
    }
    return item.productName
  }

  const formatCurrency = (value: number, currencyCode: string) => {
    const info = findCurrencyByCode(currencyCode)
    const symbol = info?.symbol || currencyCode
    return `${symbol}${value.toFixed(2)}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('quotations.import.title')}</DialogTitle>
          <DialogDescription>
            {t('quotations.import.description')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-destructive">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('quotations.import.noItems')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {t('quotations.import.itemCount', { count: String(items.length) })}
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left py-2 px-3 text-sm font-medium">
                      {t('products.columns.code')}
                    </th>
                    <th className="text-left py-2 px-3 text-sm font-medium">
                      {t('products.columns.name')}
                    </th>
                    <th className="text-right py-2 px-3 text-sm font-medium">
                      {t('quotations.items.quantity')}
                    </th>
                    <th className="text-right py-2 px-3 text-sm font-medium">
                      {t('quotations.import.costPrice')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId} className="border-t">
                      <td className="py-2 px-3 text-sm font-mono">{item.productCode}</td>
                      <td className="py-2 px-3 text-sm">{getDisplayName(item)}</td>
                      <td className="py-2 px-3 text-sm text-right">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-2 px-3 text-sm text-right font-medium">
                        {formatCurrency(item.costPrice, item.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleImport}>
                {t('quotations.import.importButton')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ImportFromCostTableDialog
