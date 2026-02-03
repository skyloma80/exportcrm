"use client"

/**
 * Order Item Dialog
 * 订单产品添加对话框
 */

import { useState, useEffect } from "react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { getPocketBase } from "@/lib/pocketbase/auth"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Search, Package } from "lucide-react"

interface Product {
  id: string
  code: string
  name: string
  name_cn?: string
  unit?: string
  base_price?: number
}

interface OrderItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (items: { product: string; quantity: number; unit_price: number; amount: number }[]) => Promise<void>
  projectId: string
  excludeProductIds?: string[]
}

export function OrderItemDialog({
  open,
  onOpenChange,
  onAdd,
  projectId,
  excludeProductIds = [],
}: OrderItemDialogProps) {
  const { t, locale } = useI18n()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<Map<string, { quantity: number; unitPrice: number }>>(new Map())

  useEffect(() => {
    if (open && projectId) {
      loadProducts()
    }
  }, [open, projectId])

  useEffect(() => {
    if (!open) {
      setSelectedProducts(new Map())
      setSearchQuery("")
    }
  }, [open])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const pb = getPocketBase()
      // 获取项目关联的产品
      const projectProducts = await pb.collection("products_projects").getFullList<{ product: string }>({
        filter: `project = "${projectId}"`,
      })
      const productIds = projectProducts.map(pp => pp.product)
      
      if (productIds.length === 0) {
        setProducts([])
        return
      }

      const filter = productIds.map(id => `id = "${id}"`).join(" || ")
      const result = await pb.collection("products").getFullList<Product>({
        filter,
        sort: "code",
      })
      setProducts(result)
    } catch (err) {
      console.error("Error loading products:", err)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = (product: Product) => {
    return locale === 'zh' && product.name_cn ? product.name_cn : product.name
  }

  const filteredProducts = products.filter(p => {
    if (excludeProductIds.includes(p.id)) return false
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      p.code.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query) ||
      (p.name_cn && p.name_cn.toLowerCase().includes(query))
    )
  })

  const handleToggleProduct = (product: Product, checked: boolean) => {
    const newSelected = new Map(selectedProducts)
    if (checked) {
      newSelected.set(product.id, {
        quantity: 1,
        unitPrice: product.base_price || 0,
      })
    } else {
      newSelected.delete(product.id)
    }
    setSelectedProducts(newSelected)
  }

  const handleQuantityChange = (productId: string, quantity: number) => {
    const newSelected = new Map(selectedProducts)
    const existing = newSelected.get(productId)
    if (existing) {
      newSelected.set(productId, { ...existing, quantity: Math.max(1, quantity) })
    }
    setSelectedProducts(newSelected)
  }

  const handleUnitPriceChange = (productId: string, unitPrice: number) => {
    const newSelected = new Map(selectedProducts)
    const existing = newSelected.get(productId)
    if (existing) {
      newSelected.set(productId, { ...existing, unitPrice: Math.max(0, unitPrice) })
    }
    setSelectedProducts(newSelected)
  }

  const handleSubmit = async () => {
    if (selectedProducts.size === 0) return

    setSubmitting(true)
    try {
      const items = Array.from(selectedProducts.entries()).map(([productId, data]) => ({
        product: productId,
        quantity: data.quantity,
        unit_price: data.unitPrice,
        amount: data.quantity * data.unitPrice,
      }))
      await onAdd(items)
      onOpenChange(false)
    } catch (err) {
      console.error("Error adding items:", err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("orders.items.add") || "Add Products"}</DialogTitle>
          <DialogDescription>
            {t("orders.items.addDescription") || "Select products to add to this order"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search") || "Search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Product List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t("orders.items.noProducts") || "No products available"}</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-4 space-y-3">
                {filteredProducts.map((product) => {
                  const isSelected = selectedProducts.has(product.id)
                  const selectedData = selectedProducts.get(product.id)

                  return (
                    <div
                      key={product.id}
                      className={`p-3 rounded-lg border ${isSelected ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleToggleProduct(product, !!checked)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getDisplayName(product)}</span>
                            <span className="text-xs text-muted-foreground font-mono">{product.code}</span>
                          </div>
                          {isSelected && (
                            <div className="mt-2 grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">{t("orders.items.quantity") || "Quantity"}</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={selectedData?.quantity || 1}
                                  onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                                  className="h-8 mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">{t("orders.items.unitPrice") || "Unit Price"}</Label>
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={selectedData?.unitPrice || 0}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                      handleUnitPriceChange(product.id, parseFloat(val) || 0)
                                    }
                                  }}
                                  className="h-8 mt-1"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}

          {/* Selected count */}
          {selectedProducts.size > 0 && (
            <p className="text-sm text-muted-foreground">
              {locale === 'zh' 
                ? `已选择 ${selectedProducts.size} 个产品`
                : `${selectedProducts.size} product(s) selected`}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || selectedProducts.size === 0}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.add") || "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
