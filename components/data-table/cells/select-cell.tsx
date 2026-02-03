"use client"

/**
 * SelectCell Component
 * 
 * Dropdown select cell with predefined options.
 */

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEditableCell } from "@/lib/hooks/use-editable-cell"
import { EditableCell } from "./editable-cell"
import { Badge } from "@/components/ui/badge"

export interface SelectOption {
  label: string
  value: string
  variant?: "default" | "secondary" | "destructive" | "outline"
}

export interface SelectCellProps {
  value: string
  options: SelectOption[]
  onSave: (value: string) => Promise<void>
  validation?: (value: string) => string | null
  showBadge?: boolean
  className?: string
}

export function SelectCell({
  value: initialValue,
  options,
  onSave,
  validation,
  showBadge = true,
  className,
}: SelectCellProps) {
  const {
    value,
    setValue,
    isEditing,
    isLoading,
    isSaved,
    error,
    startEdit,
    save,
  } = useEditableCell({
    initialValue,
    onSave,
    validation,
  })

  const selectedOption = options.find((opt) => opt.value === value)

  const handleValueChange = async (newValue: string) => {
    setValue(newValue)
    // Auto-save on selection
    try {
      await onSave(newValue)
    } catch {
      // Error handled by hook
    }
  }

  const displayValue = () => {
    if (!selectedOption) return value || "-"
    
    if (showBadge) {
      return (
        <Badge variant={selectedOption.variant || "secondary"}>
          {selectedOption.label}
        </Badge>
      )
    }
    
    return selectedOption.label
  }

  return (
    <EditableCell
      isEditing={isEditing}
      isLoading={isLoading}
      isSaved={isSaved}
      error={error}
      onStartEdit={startEdit}
      className={className}
    >
      {isEditing ? (
        <Select
          value={value}
          onValueChange={handleValueChange}
          disabled={isLoading}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        displayValue()
      )}
    </EditableCell>
  )
}
