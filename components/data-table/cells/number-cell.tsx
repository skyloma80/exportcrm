"use client"

/**
 * NumberCell Component
 * 
 * Number input cell with validation.
 */

import * as React from "react"
import { Input } from "@/components/ui/input"
import { useEditableCell } from "@/lib/hooks/use-editable-cell"
import { EditableCell } from "./editable-cell"

export interface NumberCellProps {
  value: number
  onSave: (value: number) => Promise<void>
  validation?: (value: number) => string | null
  min?: number
  max?: number
  step?: number
  format?: (value: number) => string
  className?: string
}

export function NumberCell({
  value: initialValue,
  onSave,
  validation,
  min,
  max,
  step = 1,
  format,
  className,
}: NumberCellProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  
  const numberValidation = React.useCallback((val: number) => {
    if (min !== undefined && val < min) {
      return `Value must be at least ${min}`
    }
    if (max !== undefined && val > max) {
      return `Value must be at most ${max}`
    }
    if (validation) {
      return validation(val)
    }
    return null
  }, [min, max, validation])

  const {
    value,
    setValue,
    isEditing,
    isLoading,
    isSaved,
    error,
    startEdit,
    save,
    handleKeyDown,
  } = useEditableCell({
    initialValue,
    onSave,
    validation: numberValidation,
  })

  // Focus input when entering edit mode
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleBlur = () => {
    save()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (!isNaN(newValue)) {
      setValue(newValue)
    }
  }

  const displayValue = format ? format(value) : String(value)

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
        <Input
          ref={inputRef}
          type="number"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          min={min}
          max={max}
          step={step}
          className="h-8"
        />
      ) : (
        <span className="tabular-nums">{displayValue}</span>
      )}
    </EditableCell>
  )
}
