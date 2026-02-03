"use client"

/**
 * DateCell Component
 * 
 * Date picker cell component.
 */

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useEditableCell } from "@/lib/hooks/use-editable-cell"
import { EditableCell } from "./editable-cell"

export interface DateCellProps {
  value: Date | null
  onSave: (value: Date | null) => Promise<void>
  validation?: (value: Date | null) => string | null
  dateFormat?: string
  className?: string
}

export function DateCell({
  value: initialValue,
  onSave,
  validation,
  dateFormat = "PPP",
  className,
}: DateCellProps) {
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

  const handleSelect = async (date: Date | undefined) => {
    const newValue = date || null
    setValue(newValue)
    setOpen(false)
    
    // Auto-save on selection
    try {
      await onSave(newValue)
    } catch {
      // Error handled by hook
    }
  }

  const handleStartEdit = () => {
    startEdit()
    setOpen(true)
  }

  const displayValue = value ? format(value, dateFormat) : "-"

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
              className={cn(
                "h-8 justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
              disabled={isLoading}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value ? format(value, dateFormat) : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value || undefined}
              onSelect={handleSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      ) : (
        <span>{displayValue}</span>
      )}
    </EditableCell>
  )
}
