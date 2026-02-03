"use client"

/**
 * Payment Terms Select Component
 * 
 * Dropdown select with search functionality for payment terms
 */

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
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
import { PAYMENT_TERMS } from "@/lib/constants/trade-constants"

interface PaymentTermsSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function PaymentTermsSelect({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
}: PaymentTermsSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedTerm = PAYMENT_TERMS.find(t => t.code === value)

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
          {selectedTerm ? (
            <span className="truncate">{selectedTerm.name}</span>
          ) : (
            <span className="text-muted-foreground">
              {placeholder || 'Select payment terms'}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search payment terms..." />
          <CommandEmpty>
            <div className="py-2 text-center text-sm text-muted-foreground">
              No payment terms found
            </div>
          </CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {PAYMENT_TERMS.map((term) => (
              <CommandItem
                key={term.code}
                value={`${term.name} ${term.code}`}
                onSelect={() => {
                  onChange(term.code === value ? "" : term.code)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === term.code ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{term.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {term.code}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
