"use client"

/**
 * 供应商选择组件
 * 
 * 带搜索功能的下拉选择框，支持中英文显示
 */

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Factory, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useI18n } from "@/lib/i18n/use-i18n"
import { getPocketBase } from "@/lib/pocketbase/auth"

interface Supplier {
  id: string
  code: string
  name: string
  name_cn?: string
  country?: string
  contact_person?: string
  category?: string
}

interface SupplierSelectProps {
  value: string
  onChange: (supplier: Supplier | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  /** 按类别筛选供应商 */
  category?: string
}

export function SupplierSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  category,
}: SupplierSelectProps) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSuppliers()
  }, [category])

  const loadSuppliers = async () => {
    setLoading(true)
    try {
      const pb = getPocketBase()
      const filter = category ? `category = "${category}"` : ""
      const data = await pb.collection("suppliers").getFullList<Supplier>({
        sort: "name",
        filter,
      })
      setSuppliers(data)
    } catch (error) {
      console.error("Error loading suppliers:", error)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = (supplier: Supplier) => {
    if (locale === "zh" && supplier.name_cn) return supplier.name_cn
    return supplier.name
  }

  const selectedSupplier = suppliers.find((s) => s.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          {selectedSupplier ? (
            <span className="flex items-center gap-2 truncate">
              <Factory className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{selectedSupplier.code} - {getDisplayName(selectedSupplier)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {placeholder || (locale === 'zh' ? '选择供应商' : 'Select supplier')}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("common.search") || "Search..."} />
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <CommandEmpty>{t("common.noData")}</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {suppliers.map((supplier) => (
                  <CommandItem
                    key={supplier.id}
                    value={`${supplier.name} ${supplier.name_cn || ""} ${supplier.code} ${supplier.country || ""}`}
                    onSelect={() => {
                      onChange(supplier.id === value ? null : supplier)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === supplier.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{getDisplayName(supplier)}</span>
                        <span className="text-xs text-muted-foreground font-mono">{supplier.code}</span>
                      </div>
                      {(supplier.country || supplier.contact_person) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[supplier.country, supplier.contact_person].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
