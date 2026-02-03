"use client"

/**
 * TextCell Component
 * 
 * Simple text input cell with auto-save on blur/Enter.
 */

import * as React from "react"
import { Input } from "@/components/ui/input"
import { useEditableCell } from "@/lib/hooks/use-editable-cell"
import { EditableCell } from "./editable-cell"

export interface TextCellProps {
  value: string
  onSave: (value: string) => Promise<void>
  validation?: (value: string) => string | null
  className?: string
}

export function TextCell({
  value: initialValue,
  onSave,
  validation,
  className,
}: TextCellProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  
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
    validation,
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
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="h-8"
        />
      ) : (
        <span className="truncate">{value || "-"}</span>
      )}
    </EditableCell>
  )
}
