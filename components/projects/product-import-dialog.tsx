"use client"

/**
 * Product Import Dialog for Project
 * 从产品库导入产品到项目
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
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Package, Loader2 } from "lucide-react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { productService, Product } from "@/lib/pocketbase/services/products"

interface ProductImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (productIds: string[]) => Promise<void>
  excludeProductIds?: string[]
}

export function ProductImportDialog({
  open,
  onOpenChange,
  onImport,
  excludeProductIds = [],
}: ProductImportDialogProps) {
  const { t, locale } = useI18n()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (open) {
      loadProducts()
      setSelectedProducts(new Set())
      setSearchTerm("")
    }
  }, [open])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const productList = await productService.getFullList()
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

  const handleToggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const handleImport = async () => {
    if (selectedProducts.size === 0) return
    setImporting(true)
    try {
      await onImport(Array.from(selectedProducts))
      setSelectedProducts(new Set())
      onOpenChange(false)
    } catch (error) {
      console.error("Error importing products:", error)
    } finally {
      setImporting(false)
    }
  }

  const getDisplayName = (product: Product) => {
    if (locale === "zh" && product.name_cn) return product.name_cn
    return product.name
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {locale === 'zh' ? '从产品库导入' : 'Import from Product Library'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'zh' ? '选择要添加到项目的产品' : 'Select products to add to this project'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search") || "Search..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[400px] border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium mb-1">
                  {searchTerm 
                    ? (locale === 'zh' ? '未找到匹配的产品' : 'No matching products')
                    : (locale === 'zh' ? '暂无可导入的产品' : 'No products available')}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-start gap-3 p-4 hover:bg-muted cursor-pointer"
                    onClick={() => handleToggleProduct(product.id)}
                  >
                    <Checkbox
                      checked={selectedProducts.has(product.id)}
                      onCheckedChange={() => handleToggleProduct(product.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{getDisplayName(product)}</h4>
                          {product.name_cn && locale !== "zh" && (
                            <p className="text-xs text-muted-foreground">{product.name_cn}</p>
                          )}
                          {product.name && locale === "zh" && product.name_cn && (
                            <p className="text-xs text-muted-foreground">{product.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{t("products.columns.code")}: {product.code}</span>
                        <span>{t("products.columns.unit")}: {product.unit}</span>
                        {product.hs_code && <span>HS: {product.hs_code}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 bg-background relative z-10">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleImport} disabled={selectedProducts.size === 0 || importing}>
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {locale === 'zh' ? '导入' : 'Import'} {selectedProducts.size > 0 && `(${selectedProducts.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
