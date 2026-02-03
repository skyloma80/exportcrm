"use client"

/**
 * Quotation Item Dialog
 * 报价单产品添加对话框
 */

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Package, Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { findCurrencyByCode } from "@/lib/constants/trade-constants"

interface Product {
  id: string
  code: string
  name: string
  name_cn?: string
  description?: string
  description_cn?: string
  part_number?: string
  unit: string
  cost_price?: number
  // 包装信息
  pcs_per_carton?: number
  carton_dimensions?: { length: number; width: number; height: number }
  carton_gross_weight?: number
}

interface QuotationItemInput {
  product: string
  productCode: string
  productName: string
  productNameCn?: string
  description?: string
  descriptionCn?: string
  unit: string
  partNumber?: string
  quantity: number
  cost_price: number
  profit_margin: number
  unit_price: number
  amount: number
  // 包装信息
  pcsPerCarton?: number
  cartonDimensions?: string
  cartonGrossWeight?: number
}

interface QuotationItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (items: QuotationItemInput[]) => Promise<void>
  projectId?: string
  excludeProductIds?: string[]
  defaultProfitMargin?: number
  exchangeRate?: number
}

export function QuotationItemDialog({
  open,
  onOpenChange,
  onAdd,
  projectId,
  excludeProductIds = [],
  defaultProfitMargin = 20,
  exchangeRate = 1,
}: QuotationItemDialogProps) {
  const { t, locale } = useI18n()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Map<string, { quantity: number; cost_price: number; profit_margin: number }>>(new Map())
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      loadProducts()
      setSelectedProducts(new Map())
      setSearchTerm("")
    }
  }, [open, projectId])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const pb = getPocketBase()
      let productList: Product[] = []

      if (projectId) {
        // Load products associated with the project
        const projectProducts = await pb.collection("products_projects").getFullList<{ product: string }>({
          filter: `project = "${projectId}"`,
        })
        const productIds = projectProducts.map(pp => pp.product)

        if (productIds.length > 0) {
          const filter = productIds.map(id => `id = "${id}"`).join(" || ")
          productList = await pb.collection("products").getFullList<Product>({ filter })
        }
      } else {
        productList = await pb.collection("products").getFullList<Product>()
      }

      setProducts(productList)
    } catch (error) {
      console.error("Error loading products:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter((product) => {
    if (excludeProductIds.includes(product.id)) return false

    const searchLower = searchTerm.toLowerCase()
    return (
      product.name.toLowerCase().includes(searchLower) ||
      (product.name_cn && product.name_cn.toLowerCase().includes(searchLower)) ||
      product.code.toLowerCase().includes(searchLower)
    )
  })

  const handleToggleProduct = (product: Product) => {
    const newSelected = new Map(selectedProducts)
    if (newSelected.has(product.id)) {
      newSelected.delete(product.id)
    } else {
      newSelected.set(product.id, {
        quantity: 1,
        cost_price: product.cost_price || 0,
        profit_margin: defaultProfitMargin,
      })
    }
    setSelectedProducts(newSelected)
  }

  const handleUpdateItem = (productId: string, field: string, value: number) => {
    const newSelected = new Map(selectedProducts)
    const item = newSelected.get(productId)
    if (item) {
      newSelected.set(productId, { ...item, [field]: value })
      setSelectedProducts(newSelected)
    }
  }

  const calculateUnitPrice = (costPrice: number, profitMargin: number) => {
    // 成本价是人民币，先转换为目标货币，再加利润
    const costInTargetCurrency = costPrice / exchangeRate
    return costInTargetCurrency * (1 + profitMargin / 100)
  }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      const items: QuotationItemInput[] = []
      selectedProducts.forEach((data, productId) => {
        const product = products.find(p => p.id === productId)
        if (!product) return

        const unitPrice = calculateUnitPrice(data.cost_price, data.profit_margin)

        // 格式化纸箱尺寸
        let cartonDimensions: string | undefined
        if (product.carton_dimensions) {
          const d = product.carton_dimensions
          cartonDimensions = `${d.length}×${d.width}×${d.height} mm`
        }

        items.push({
          product: productId,
          productCode: product.code,
          productName: product.name,
          productNameCn: product.name_cn,
          description: product.description,
          descriptionCn: product.description_cn,
          unit: product.unit,
          partNumber: product.part_number,
          quantity: data.quantity,
          cost_price: data.cost_price,
          profit_margin: data.profit_margin,
          unit_price: unitPrice,
          amount: unitPrice * data.quantity,
          // 包装信息
          pcsPerCarton: product.pcs_per_carton,
          cartonDimensions,
          cartonGrossWeight: product.carton_gross_weight,
        })
      })

      await onAdd(items)
      setSelectedProducts(new Map())
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const getDisplayName = (product: Product) => {
    if (locale === "zh" && product.name_cn) return product.name_cn
    return product.name
  }

  const formatCurrency = (value: number, currencyCode: string = "CNY") => {
    const info = findCurrencyByCode(currencyCode)
    const symbol = info?.symbol || currencyCode
    return `${symbol}${value.toFixed(2)}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("quotations.items.add")}
          </DialogTitle>
          <DialogDescription>
            {t("quotations.items.addDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search") || "Search..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="flex-1 min-h-[200px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium mb-1">
                  {searchTerm ? t("common.noData") : t("quotations.items.empty")}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProducts.has(product.id)
                  const itemData = selectedProducts.get(product.id)

                  return (
                    <div key={product.id} className="p-4 hover:bg-muted/50">
                      <div
                        className="flex items-start gap-3 cursor-pointer"
                        onClick={() => handleToggleProduct(product)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleProduct(product)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{getDisplayName(product)}</h4>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{product.code}</span>
                            <span>{product.unit}</span>
                            {product.cost_price && <span>{formatCurrency(product.cost_price)}</span>}
                          </div>
                        </div>
                      </div>

                      {isSelected && itemData && (
                        <div className="mt-3 ml-7 grid grid-cols-4 gap-3">
                          <div>
                            <Label className="text-xs">{t("quotations.items.quantity")}</Label>
                            <Input
                              type="number"
                              min={1}
                              value={itemData.quantity}
                              onChange={(e) => handleUpdateItem(product.id, "quantity", parseInt(e.target.value) || 1)}
                              className="h-8 mt-1"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t("quotations.items.costPrice")}</Label>
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={itemData.cost_price}
                              onChange={(e) => handleUpdateItem(product.id, "cost_price", parseFloat(e.target.value) || 0)}
                              className="h-8 mt-1"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t("quotations.items.profitMargin")} (%)</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={itemData.profit_margin}
                              onChange={(e) => handleUpdateItem(product.id, "profit_margin", parseFloat(e.target.value) || 0)}
                              className="h-8 mt-1"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t("quotations.items.unitPrice")}</Label>
                            <Input
                              value={calculateUnitPrice(itemData.cost_price, itemData.profit_margin).toFixed(2)}
                              disabled
                              className="h-8 mt-1 bg-muted"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={selectedProducts.size === 0 || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.add")} {selectedProducts.size > 0 && `(${selectedProducts.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
