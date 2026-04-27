"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, ArrowLeftRight, Loader2 } from "lucide-react"
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
import { orderService, OrderWithExpand } from "@/lib/pocketbase/services/orders"

interface OrderSelectProps {
  value: string
  onChange: (order: OrderWithExpand | null) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function OrderSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
}: OrderSelectProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [orders, setOrders] = useState<OrderWithExpand[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const result = await orderService.getListWithExpand(1, 100)
      setOrders(result.items)
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const selectedOrder = orders.find((o) => o.id === value)

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
          {selectedOrder ? (
            <span className="flex items-center gap-2 truncate">
              <ArrowLeftRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              {selectedOrder.code}
            </span>
          ) : (
            <span className="text-muted-foreground">
              {placeholder || "Select Sales Order"}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search order code..." />
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <CommandEmpty>No orders found.</CommandEmpty>
              <CommandGroup className="max-h-64 overflow-auto">
                {orders.map((order) => (
                  <CommandItem
                    key={order.id}
                    value={`${order.code} ${order.expand?.customer?.name || ""}`}
                    onSelect={() => {
                      onChange(order.id === value ? null : order)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === order.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{order.code}</span>
                        <span className="text-xs text-muted-foreground truncate">{order.expand?.customer?.name}</span>
                      </div>
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
