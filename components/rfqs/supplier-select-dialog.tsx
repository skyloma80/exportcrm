"use client"

/**
 * Supplier Select Dialog for RFQ
 * 供应商选择对话框
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
import { Badge } from "@/components/ui/badge"
import { Search, Building2, Loader2, Check } from "lucide-react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { supplierService, Supplier } from "@/lib/pocketbase/services/suppliers"
import { cn } from "@/lib/utils"

export interface SupplierSelectItem {
  id: string
  name: string
  name_cn?: string
  code: string
  country: string
  type: string
  rating?: number
}

interface SupplierSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (suppliers: SupplierSelectItem[]) => void
  selectedSupplierIds?: string[]
  multiSelect?: boolean
}

export function SupplierSelectDialog({
  open,
  onOpenChange,
  onSelect,
  selectedSupplierIds = [],
  multiSelect = true,
}: SupplierSelectDialogProps) {
  const { t, locale } = useI18n()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set(selectedSupplierIds))
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadSuppliers()
      setSelectedSuppliers(new Set(selectedSupplierIds))
      setSearchTerm("")
    }
  }, [open, selectedSupplierIds])

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const data = await supplierService.getFullList()
      setSuppliers(data)
    } catch (error) {
      console.error("Error loading suppliers:", error)
      setSuppliers([])
    } finally {
      setLoading(false)
    }
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      supplier.name.toLowerCase().includes(searchLower) ||
      (supplier.name_cn && supplier.name_cn.toLowerCase().includes(searchLower)) ||
      supplier.code.toLowerCase().includes(searchLower)
    )
  })

  const handleToggleSupplier = (supplierId: string) => {
    if (multiSelect) {
      const newSelected = new Set(selectedSuppliers)
      if (newSelected.has(supplierId)) {
        newSelected.delete(supplierId)
      } else {
        newSelected.add(supplierId)
      }
      setSelectedSuppliers(newSelected)
    } else {
      setSelectedSuppliers(new Set([supplierId]))
    }
  }

  const handleConfirm = () => {
    const selectedItems: SupplierSelectItem[] = suppliers
      .filter((s) => selectedSuppliers.has(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name,
        name_cn: s.name_cn,
        code: s.code,
        country: s.country,
        type: s.type,
        rating: s.rating,
      }))

    onSelect(selectedItems)
    onOpenChange(false)
  }

  const getDisplayName = (supplier: Supplier) => {
    if (locale === "zh" && supplier.name_cn) return supplier.name_cn
    return supplier.name
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      manufacturer: "bg-green-100 text-green-800",
      trader: "bg-blue-100 text-blue-800",
      agent: "bg-purple-100 text-purple-800",
    }
    return colors[type] || "bg-gray-100 text-gray-800"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t("rfqs.suppliers.add")}
          </DialogTitle>
          <DialogDescription>
            {t("rfqs.suppliers.description")}
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

          <div className="flex items-center justify-between text-sm text-muted-foreground flex-shrink-0">
            <span>{selectedSuppliers.size} {t("common.selected") || "selected"}</span>
            <span>{filteredSuppliers.length} / {suppliers.length}</span>
          </div>

          <ScrollArea className="flex-1 min-h-0 border rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium mb-1">
                  {searchTerm ? t("common.noData") : t("rfqs.suppliers.empty")}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredSuppliers.map((supplier) => {
                  const isSelected = selectedSuppliers.has(supplier.id)
                  return (
                    <div
                      key={supplier.id}
                      className={cn(
                        "flex items-center p-4 hover:bg-muted cursor-pointer",
                        isSelected && "bg-muted/50"
                      )}
                      onClick={() => handleToggleSupplier(supplier.id)}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center h-5 w-5 rounded-sm border mr-3",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{getDisplayName(supplier)}</h4>
                          <Badge variant="outline" className={getTypeColor(supplier.type)}>
                            {t(`suppliers.type.${supplier.type}`)}
                          </Badge>
                          {supplier.rating && (
                            <span className="text-xs text-muted-foreground">
                              {"⭐".repeat(supplier.rating)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{supplier.code}</span>
                          <span>{supplier.country}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={selectedSuppliers.size === 0}>
            {t("common.confirm")} {selectedSuppliers.size > 0 && `(${selectedSuppliers.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
