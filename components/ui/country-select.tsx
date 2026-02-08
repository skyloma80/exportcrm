"use client"

/**
 * 国家选择组件
 * 
 * 带搜索功能的下拉选择框，支持中英文显示
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
import { COUNTRIES, type CountryCode } from "@/lib/constants/countries"

// 使用共享的国家列表
const countries = COUNTRIES;

interface CountrySelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select country...",
  className,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value
            ? (() => {
                const selectedCountry = countries.find((country) => country.value === value);
                return selectedCountry ? (
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-2">
                      <span>{selectedCountry.label}</span>
                      <span className="text-xs opacity-70">[{selectedCountry.value}]</span>
                      <span className="text-xs opacity-70">({selectedCountry.labelZh})</span>
                    </span>
                  </span>
                ) : placeholder;
              })()
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandEmpty>No country found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {countries.map((country) => (
              <CommandItem
                key={country.value}
                value={`${country.label} ${country.labelZh} ${country.value}`}
                onSelect={() => {
                  onChange(country.value === value ? "" : country.value)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === country.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex items-center gap-2">
                  <span>{country.label}</span>
                  <span className="text-xs opacity-70">[{country.value}]</span>
                  <span className="text-xs opacity-70">({country.labelZh})</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
