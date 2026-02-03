/**
 * useEditableCell Hook
 * 
 * Manages edit mode state, save/cancel logic, and validation for editable cells.
 */

import { useState, useCallback, useRef, useEffect } from 'react'

export interface UseEditableCellOptions<T> {
  initialValue: T
  onSave: (value: T) => Promise<void>
  validation?: (value: T) => string | null
  onEditStart?: () => void
  onEditEnd?: () => void
}

export interface UseEditableCellReturn<T> {
  value: T
  setValue: (value: T) => void
  isEditing: boolean
  isLoading: boolean
  isSaved: boolean
  error: string | null
  startEdit: () => void
  cancelEdit: () => void
  save: () => Promise<boolean>
  handleKeyDown: (e: React.KeyboardEvent) => void
}

export function useEditableCell<T>({
  initialValue,
  onSave,
  validation,
  onEditStart,
  onEditEnd,
}: UseEditableCellOptions<T>): UseEditableCellReturn<T> {
  const [value, setValue] = useState<T>(initialValue)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const originalValueRef = useRef<T>(initialValue)
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update value when initialValue changes (e.g., data refresh)
  useEffect(() => {
    if (!isEditing) {
      setValue(initialValue)
      originalValueRef.current = initialValue
    }
  }, [initialValue, isEditing])

  // Cleanup saved indicator timeout
  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }
    }
  }, [])

  const startEdit = useCallback(() => {
    setIsEditing(true)
    setError(null)
    setIsSaved(false)
    onEditStart?.()
  }, [onEditStart])

  const cancelEdit = useCallback(() => {
    setValue(originalValueRef.current)
    setIsEditing(false)
    setError(null)
    onEditEnd?.()
  }, [onEditEnd])

  const save = useCallback(async (): Promise<boolean> => {
    // Skip if value hasn't changed
    if (value === originalValueRef.current) {
      setIsEditing(false)
      onEditEnd?.()
      return true
    }

    // Validate if validation function provided
    if (validation) {
      const validationError = validation(value)
      if (validationError) {
        setError(validationError)
        return false
      }
    }

    setIsLoading(true)
    setError(null)

    try {
      await onSave(value)
      originalValueRef.current = value
      setIsEditing(false)
      setIsSaved(true)
      
      // Clear saved indicator after 2 seconds
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current)
      }
      savedTimeoutRef.current = setTimeout(() => {
        setIsSaved(false)
      }, 2000)
      
      onEditEnd?.()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [value, validation, onSave, onEditEnd])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }, [save, cancelEdit])

  return {
    value,
    setValue,
    isEditing,
    isLoading,
    isSaved,
    error,
    startEdit,
    cancelEdit,
    save,
    handleKeyDown,
  }
}
