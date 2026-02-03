"use client"

/**
 * Product Select Dialog for RFQ
 * 产品选择对话框
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
import { productProjectService } from "@/lib/pocketbase/services/projects"

export interface RFQItemInput {
  product: string
  productName: string
  productNameCn?: string
  productCode: string
  unit: string
  quantity: number
  target_price?: number
  remarks?: string
}

interface ProductSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (items: RFQItemInput[]) => void
  projectId?: string
  excludeProductIds?: string[]
}

export function ProductSelectDialog({
  open,
  onOpenChange,
  onSelect,
  projectId,
  excludeProductIds = [],
}: ProductSelectDialogProps) {
  const { t, locale } = useI18n()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadProducts()
      setSelectedProducts(new Set())
      setSearchTerm("")
    }
  }, [open, projectId])

  const loadProducts = async () => {
    setLoading(true)
    try {
      let productList: Product[] = []
      
      if (projectId) {
        // Load products associated with the project
        const projectProducts = await productProjectService.getByProject(projectId)
        const productIds = projectProducts.map(pp => pp.product)
        
        if (productIds.length > 0) {
          const filter = productIds.map(id => `id = "${id}"`).join(" || ")
          productList = await productService.getFullList({ filter })
        }
      } else {
        // Load all products
        productList = await productService.getFullList()
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
    // Exclude already selected products
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

  const handleConfirm = () => {
    const selectedItems: RFQItemInput[] = products
      .filter((p) => selectedProducts.has(p.id))
      .map((p) => ({
        product: p.id,
        productName: p.name,
        productNameCn: p.name_cn,
        productCode: p.code,
        unit: p.unit,
        quantity: 1,
        target_price: undefined,
        remarks: "",
      }))

    onSelect(selectedItems)
    setSelectedProducts(new Set())
    onOpenChange(false)
  }

  const getDisplayName = (product: Product) => {
    if (locale === "zh" && product.name_cn) return product.name_cn
    return product.name
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("rfqs.items.add")}
          </DialogTitle>
          <DialogDescription>
            {t("rfqs.items.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden">
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("common.search") || "Search..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="flex-1 min-h-0 border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium mb-1">
                  {searchTerm ? t("common.noData") : t("rfqs.items.empty")}
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
          <Button onClick={handleConfirm} disabled={selectedProducts.size === 0}>
            {t("common.add") || "Add"} {selectedProducts.size > 0 && `(${selectedProducts.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
