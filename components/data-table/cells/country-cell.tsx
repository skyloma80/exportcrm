"use client"

/**
 * CountryCell Component
 * 
 * Searchable country dropdown with autocomplete filtering.
 */

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useEditableCell } from "@/lib/hooks/use-editable-cell"
import { EditableCell } from "./editable-cell"

// Common countries list
export const COUNTRIES = [
  { value: "CN", label: "China", flag: "🇨🇳" },
  { value: "US", label: "United States", flag: "🇺🇸" },
  { value: "GB", label: "United Kingdom", flag: "🇬🇧" },
  { value: "DE", label: "Germany", flag: "🇩🇪" },
  { value: "FR", label: "France", flag: "🇫🇷" },
  { value: "JP", label: "Japan", flag: "🇯🇵" },
  { value: "KR", label: "South Korea", flag: "🇰🇷" },
  { value: "AU", label: "Australia", flag: "🇦🇺" },
  { value: "CA", label: "Canada", flag: "🇨🇦" },
  { value: "IT", label: "Italy", flag: "🇮🇹" },
  { value: "ES", label: "Spain", flag: "🇪🇸" },
  { value: "BR", label: "Brazil", flag: "🇧🇷" },
  { value: "IN", label: "India", flag: "🇮🇳" },
  { value: "RU", label: "Russia", flag: "🇷🇺" },
  { value: "MX", label: "Mexico", flag: "🇲🇽" },
  { value: "NL", label: "Netherlands", flag: "🇳🇱" },
  { value: "SG", label: "Singapore", flag: "🇸🇬" },
  { value: "HK", label: "Hong Kong", flag: "🇭🇰" },
  { value: "TW", label: "Taiwan", flag: "🇹🇼" },
  { value: "TH", label: "Thailand", flag: "🇹🇭" },
  { value: "VN", label: "Vietnam", flag: "🇻🇳" },
  { value: "MY", label: "Malaysia", flag: "🇲🇾" },
  { value: "ID", label: "Indonesia", flag: "🇮🇩" },
  { value: "PH", label: "Philippines", flag: "🇵🇭" },
  { value: "AE", label: "UAE", flag: "🇦🇪" },
  { value: "SA", label: "Saudi Arabia", flag: "🇸🇦" },
  { value: "ZA", label: "South Africa", flag: "🇿🇦" },
  { value: "NZ", label: "New Zealand", flag: "🇳🇿" },
  { value: "SE", label: "Sweden", flag: "🇸🇪" },
  { value: "CH", label: "Switzerland", flag: "🇨🇭" },
]

export interface CountryCellProps {
  value: string
  onSave: (value: string) => Promise<void>
  validation?: (value: string) => string | null
  countries?: typeof COUNTRIES
  className?: string
}

export function CountryCell({
  value: initialValue,
  onSave,
  validation,
  countries = COUNTRIES,
  className,
}: CountryCellProps) {
  const [open, setOpen] = React.useState(false)
  
  const {
    value,
    setValue,
    isEditing,
    isLoading,
    isSaved,
    error,
    startEdit,
  } = useEditableCell({
    initialValue,
    onSave,
    validation,
  })

  const selectedCountry = countries.find((c) => c.value === value)

  const handleSelect = async (countryValue: string) => {
    setValue(countryValue)
    setOpen(false)
    
    // Auto-save on selection
    try {
      await onSave(countryValue)
    } catch {
      // Error handled by hook
    }
  }

  const handleStartEdit = () => {
    startEdit()
    setOpen(true)
  }

  const displayValue = selectedCountry ? (
    <span className="flex items-center gap-2">
      <span>{selectedCountry.flag}</span>
      <span>{selectedCountry.label}</span>
    </span>
  ) : value ? (
    <span>{value}</span>
  ) : (
    <span className="text-muted-foreground">-</span>
  )

  return (
    <EditableCell
      isEditing={isEditing}
      isLoading={isLoading}
      isSaved={isSaved}
      error={error}
      onStartEdit={handleStartEdit}
      className={className}
    >
      {isEditing ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-8 justify-between"
              disabled={isLoading}
            >
              {selectedCountry ? (
                <span className="flex items-center gap-2">
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.label}</span>
                </span>
              ) : (
                "Select country..."
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search country..." />
              <CommandList>
                <CommandEmpty>No country found.</CommandEmpty>
                <CommandGroup>
                  {countries.map((country) => (
                    <CommandItem
                      key={country.value}
                      value={`${country.label} ${country.value}`}
                      onSelect={() => handleSelect(country.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === country.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="mr-2">{country.flag}</span>
                      {country.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        displayValue
      )}
    </EditableCell>
  )
}

/**
 * Filter countries by search term
 */
export function filterCountries(
  countries: typeof COUNTRIES,
  searchTerm: string
): typeof COUNTRIES {
  if (!searchTerm.trim()) return countries
  
  const term = searchTerm.toLowerCase()
  return countries.filter(
    (c) =>
      c.label.toLowerCase().includes(term) ||
      c.value.toLowerCase().includes(term)
  )
}
