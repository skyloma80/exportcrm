"use client"

/**
 * EmailCell Component
 * 
 * Renders as mailto link in view mode, validates email format in edit mode.
 */

import * as React from "react"
import { Input } from "@/components/ui/input"
import { useEditableCell } from "@/lib/hooks/use-editable-cell"
import { EditableCell } from "./editable-cell"
import { Mail } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface EmailCellProps {
  value: string
  onSave: (value: string) => Promise<void>
  className?: string
}

export function EmailCell({
  value: initialValue,
  onSave,
  className,
}: EmailCellProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  
  const emailValidation = React.useCallback((val: string) => {
    if (!val) return null // Allow empty
    if (!EMAIL_REGEX.test(val)) {
      return "Invalid email format"
    }
    return null
  }, [])

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
    validation: emailValidation,
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

  const isValidEmail = EMAIL_REGEX.test(value)

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
          type="email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="h-8"
        />
      ) : value ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={isValidEmail ? `mailto:${value}` : undefined}
                className={
                  isValidEmail
                    ? "text-primary hover:underline flex items-center gap-1"
                    : "text-muted-foreground flex items-center gap-1"
                }
                onClick={(e) => {
                  if (!isValidEmail) {
                    e.preventDefault()
                    startEdit()
                  } else {
                    e.stopPropagation()
                  }
                }}
              >
                <Mail className="h-3 w-3" />
                <span className="truncate">{value}</span>
              </a>
            </TooltipTrigger>
            <TooltipContent>
              {isValidEmail ? `Send email to ${value}` : "Invalid email"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </EditableCell>
  )
}

// Export validation function for property tests
export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}
