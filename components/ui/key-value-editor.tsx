"use client"

/**
 * 键值对编辑器组件
 * 
 * 用于编辑JSON对象，以友好的键值对形式展示
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, GripVertical } from "lucide-react"
import { useI18n } from "@/lib/i18n/use-i18n"

interface KeyValuePair {
  id: string
  key: string
  value: string
}

interface KeyValueEditorProps {
  value: Record<string, any>
  onChange: (value: Record<string, any>) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
  className?: string
  disabled?: boolean
}

export function KeyValueEditor({
  value,
  onChange,
  keyPlaceholder,
  valuePlaceholder,
  className,
  disabled = false,
}: KeyValueEditorProps) {
  const { locale } = useI18n()
  const [pairs, setPairs] = useState<KeyValuePair[]>([])

  // Convert object to pairs on mount or when value changes externally
  useEffect(() => {
    const entries = Object.entries(value || {})
    if (entries.length === 0) {
      setPairs([{ id: generateId(), key: "", value: "" }])
    } else {
      setPairs(entries.map(([k, v]) => ({
        id: generateId(),
        key: k,
        value: String(v),
      })))
    }
  }, [])

  const generateId = () => Math.random().toString(36).substring(2, 9)

  const updateParent = (newPairs: KeyValuePair[]) => {
    const result: Record<string, any> = {}
    newPairs.forEach(pair => {
      if (pair.key.trim()) {
        result[pair.key.trim()] = pair.value
      }
    })
    onChange(result)
  }

  const handleKeyChange = (id: string, newKey: string) => {
    const newPairs = pairs.map(p => 
      p.id === id ? { ...p, key: newKey } : p
    )
    setPairs(newPairs)
    updateParent(newPairs)
  }

  const handleValueChange = (id: string, newValue: string) => {
    const newPairs = pairs.map(p => 
      p.id === id ? { ...p, value: newValue } : p
    )
    setPairs(newPairs)
    updateParent(newPairs)
  }

  const handleAdd = () => {
    const newPairs = [...pairs, { id: generateId(), key: "", value: "" }]
    setPairs(newPairs)
  }

  const handleRemove = (id: string) => {
    if (pairs.length <= 1) {
      // Keep at least one empty row
      const newPairs = [{ id: generateId(), key: "", value: "" }]
      setPairs(newPairs)
      updateParent(newPairs)
      return
    }
    const newPairs = pairs.filter(p => p.id !== id)
    setPairs(newPairs)
    updateParent(newPairs)
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {pairs.map((pair, index) => (
          <div key={pair.id} className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
            <Input
              value={pair.key}
              onChange={(e) => handleKeyChange(pair.id, e.target.value)}
              placeholder={keyPlaceholder || (locale === 'zh' ? '参数名' : 'Key')}
              className="flex-1"
              disabled={disabled}
            />
            <Input
              value={pair.value}
              onChange={(e) => handleValueChange(pair.id, e.target.value)}
              placeholder={valuePlaceholder || (locale === 'zh' ? '参数值' : 'Value')}
              className="flex-1"
              disabled={disabled}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(pair.id)}
              disabled={disabled}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        disabled={disabled}
        className="mt-2"
      >
        <Plus className="h-4 w-4 mr-1" />
        {locale === 'zh' ? '添加参数' : 'Add Parameter'}
      </Button>
    </div>
  )
}
