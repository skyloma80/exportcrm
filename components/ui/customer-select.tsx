"use client"

/**
 * 客户选择组件
 * 
 * 带搜索功能的下拉选择框，支持中英文显示
 */

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Building2, Loader2 } from "lucide-react"
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

interface Customer {
  id: string
  code: string
  name: string
  name_cn?: string
  country?: string
  contact_person?: string
}

interface CustomerSelectProps {
  value: string
  onChange: (customer: Customer | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CustomerSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
}: CustomerSelectProps) {
  const { t, locale } = useI18n()
  const [open, setOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const pb = getPocketBase()
      const data = await pb.collection("customers").getFullList<Customer>({
        sort: "name",
      })
      setCustomers(data)
    } catch (error) {
      console.error("Error loading customers:", error)
    } finally {
      setLoading(false)
    }
  }

  // 独立请求逻辑：如果传入了 value 但列表中没有，则单独加载该客户
  useEffect(() => {
    const fetchSingleCustomer = async () => {
      if (value && customers.length > 0 && !customers.find(c => c.id === value)) {
        try {
          console.log("[CustomerSelect] Value not in list, fetching specifically:", value);
          const pb = getPocketBase();
          const c = await pb.collection("customers").getOne<Customer>(value);
          if (c) {
            setCustomers(prev => [...prev, c]);
          }
        } catch (error) {
          console.error("[CustomerSelect] Error fetching single customer:", error);
        }
      }
    };
    fetchSingleCustomer();
  }, [value, customers.length]);

  const getDisplayName = (customer: Customer) => {
    if (locale === "zh" && customer.name_cn) return customer.name_cn
    return customer.name
  }

  const selectedCustomer = customers.find((c) => c.id === value)

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
          {selectedCustomer ? (
            <span className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{selectedCustomer.code} - {getDisplayName(selectedCustomer)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {placeholder || (locale === 'zh' ? '选择客户' : 'Select customer')}
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
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={`${customer.name} ${customer.name_cn || ""} ${customer.code} ${customer.country || ""}`}
                    onSelect={() => {
                      onChange(customer.id === value ? null : customer)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === customer.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{getDisplayName(customer)}</span>
                        <span className="text-xs text-muted-foreground font-mono">{customer.code}</span>
                      </div>
                      {(customer.country || customer.contact_person) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[customer.country, customer.contact_person].filter(Boolean).join(' · ')}
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
