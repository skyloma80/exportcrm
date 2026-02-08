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
import { COUNTRIES } from "@/lib/constants/countries"

// Re-export for backward compatibility
export { COUNTRIES }

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
      <span className="flex items-center gap-2">
        <span>{selectedCountry.label}</span>
        <span className="text-xs opacity-70">[{selectedCountry.value}]</span>
        <span className="text-xs opacity-70">({selectedCountry.labelZh})</span>
      </span>
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
                  <span>{selectedCountry.label}</span>
                  <span className="text-xs opacity-70">[{selectedCountry.value}]</span>
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
                      value={`${country.label} ${country.labelZh} ${country.value}`}
                      onSelect={() => {
                        // 从完整值中提取国家代码
                        const selectedCountry = countries.find(c => 
                          `${c.label} ${c.labelZh} ${c.value}` === `${country.label} ${country.labelZh} ${country.value}`
                        );
                        const selectedValue = selectedCountry ? selectedCountry.value : country.value;
                        handleSelect(selectedValue);
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
  countries: readonly { value: string; label: string; labelZh: string }[],
  searchTerm: string
): readonly { value: string; label: string; labelZh: string }[] {
  if (!searchTerm.trim()) return countries
  
  const term = searchTerm.toLowerCase()
  return countries.filter(
    (c) =>
      c.label.toLowerCase().includes(term) ||
      c.labelZh.toLowerCase().includes(term) ||
      c.value.toLowerCase().includes(term)
  )
}
