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

// 常见国家列表 - 使用ISO 3166-1 alpha-2 国家代码
const countries = [
  { value: "CN", label: "China (中国)" },
  { value: "US", label: "United States (美国)" },
  { value: "GB", label: "United Kingdom (英国)" },
  { value: "DE", label: "Germany (德国)" },
  { value: "FR", label: "France (法国)" },
  { value: "JP", label: "Japan (日本)" },
  { value: "KR", label: "South Korea (韩国)" },
  { value: "IN", label: "India (印度)" },
  { value: "CA", label: "Canada (加拿大)" },
  { value: "AU", label: "Australia (澳大利亚)" },
  { value: "IT", label: "Italy (意大利)" },
  { value: "ES", label: "Spain (西班牙)" },
  { value: "BR", label: "Brazil (巴西)" },
  { value: "MX", label: "Mexico (墨西哥)" },
  { value: "ID", label: "Indonesia (印度尼西亚)" },
  { value: "NL", label: "Netherlands (荷兰)" },
  { value: "SA", label: "Saudi Arabia (沙特阿拉伯)" },
  { value: "TR", label: "Turkey (土耳其)" },
  { value: "CH", label: "Switzerland (瑞士)" },
  { value: "PL", label: "Poland (波兰)" },
  { value: "BE", label: "Belgium (比利时)" },
  { value: "SE", label: "Sweden (瑞典)" },
  { value: "IE", label: "Ireland (爱尔兰)" },
  { value: "AT", label: "Austria (奥地利)" },
  { value: "SG", label: "Singapore (新加坡)" },
  { value: "MY", label: "Malaysia (马来西亚)" },
  { value: "TH", label: "Thailand (泰国)" },
  { value: "VN", label: "Vietnam (越南)" },
  { value: "PH", label: "Philippines (菲律宾)" },
  { value: "PK", label: "Pakistan (巴基斯坦)" },
  { value: "BD", label: "Bangladesh (孟加拉国)" },
  { value: "NG", label: "Nigeria (尼日利亚)" },
  { value: "EG", label: "Egypt (埃及)" },
  { value: "ZA", label: "South Africa (南非)" },
  { value: "AR", label: "Argentina (阿根廷)" },
  { value: "CO", label: "Colombia (哥伦比亚)" },
  { value: "CL", label: "Chile (智利)" },
  { value: "PE", label: "Peru (秘鲁)" },
  { value: "NZ", label: "New Zealand (新西兰)" },
  { value: "AE", label: "United Arab Emirates (阿联酋)" },
]

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
            ? countries.find((country) => country.value === value)?.label
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
                value={country.value}
                onSelect={(currentValue) => {
                  onChange(currentValue === value ? "" : currentValue)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === country.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {country.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
