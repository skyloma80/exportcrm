"use client"

/**
 * EditableCell Wrapper Component
 * 
 * Handles click to edit activation, loading indicator, and success feedback.
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, Loader2 } from "lucide-react"

export interface EditableCellProps {
  children: React.ReactNode
  isEditing: boolean
  isLoading: boolean
  isSaved: boolean
  error: string | null
  onStartEdit: () => void
  className?: string
}

export function EditableCell({
  children,
  isEditing,
  isLoading,
  isSaved,
  error,
  onStartEdit,
  className,
}: EditableCellProps) {
  return (
    <div className={cn("relative group", className)}>
      {isEditing ? (
        <div className="relative">
          {children}
          {isLoading && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "cursor-pointer rounded px-2 py-1 -mx-2 -my-1",
            "hover:bg-muted/50 transition-colors",
            "flex items-center gap-2"
          )}
          onClick={onStartEdit}
        >
          <span className="flex-1">{children}</span>
          {isSaved && (
            <Check className="h-4 w-4 text-green-500 animate-in fade-in duration-200" />
          )}
        </div>
      )}
      {error && (
        <div className="absolute left-0 top-full mt-1 text-xs text-destructive z-10 bg-background border rounded px-2 py-1 shadow-sm">
          {error}
        </div>
      )}
    </div>
  )
}
