"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Check, ChevronsUpDown, Factory, Loader2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSuppliers()
  }, [category])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

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

  const filtered = useMemo(() => {
    if (!search) return suppliers
    const q = search.toLowerCase()
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.name_cn || "").toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.country || "").toLowerCase().includes(q)
    )
  }, [suppliers, search])

  const selectedSupplier = suppliers.find((s) => s.id === value)

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn("w-full justify-between font-normal", className)}
        disabled={disabled}
        onClick={() => { setOpen(!open); setSearch("") }}
        type="button"
      >
        {selectedSupplier ? (
          <span className="flex items-center gap-2 truncate">
            <Factory className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{getDisplayName(selectedSupplier)}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">
            {placeholder || (locale === 'zh' ? '选择供应商' : 'Select supplier')}
          </span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-0 shadow-md">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder={t("common.search") || "Search..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-auto p-1">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">{t("common.noData")}</p>
            ) : (
              filtered.map((supplier) => (
                <button
                  key={supplier.id}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm hover:bg-accent transition-colors",
                    value === supplier.id && "bg-accent"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange(supplier.id === value ? null : supplier)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === supplier.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{getDisplayName(supplier)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
