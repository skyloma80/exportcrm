"use client"

/**
 * 行列表编辑器组件
 * 
 * 用于编辑字符串数组，每行一个元素
 * 适用于银行信息等多行文本场景
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"
import { useI18n } from "@/lib/i18n/use-i18n"

interface LineItem {
  id: string
  value: string
}

interface LinesEditorProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function LinesEditor({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
}: LinesEditorProps) {
  const { locale } = useI18n()
  const [lines, setLines] = useState<LineItem[]>([])

  const generateId = () => Math.random().toString(36).substring(2, 9)

  // Convert array to lines on mount or when value changes externally
  useEffect(() => {
    if (!value || value.length === 0) {
      setLines([{ id: generateId(), value: "" }])
    } else {
      setLines(value.map(v => ({
        id: generateId(),
        value: v,
      })))
    }
  }, [])

  const updateParent = (newLines: LineItem[]) => {
    const result = newLines
      .map(line => line.value.trim())
      .filter(v => v !== "")
    onChange(result)
  }

  const handleValueChange = (id: string, newValue: string) => {
    const newLines = lines.map(l => 
      l.id === id ? { ...l, value: newValue } : l
    )
    setLines(newLines)
    updateParent(newLines)
  }

  const handleAdd = () => {
    const newLines = [...lines, { id: generateId(), value: "" }]
    setLines(newLines)
  }

  const handleRemove = (id: string) => {
    if (lines.length <= 1) {
      // Keep at least one empty row
      const newLines = [{ id: generateId(), value: "" }]
      setLines(newLines)
      updateParent(newLines)
      return
    }
    const newLines = lines.filter(l => l.id !== id)
    setLines(newLines)
    updateParent(newLines)
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={line.id} className="flex items-start gap-2">
            <span className="w-6 text-sm text-muted-foreground text-right shrink-0 pt-2">
              {index + 1}.
            </span>
            <Textarea
              value={line.value}
              onChange={(e) => handleValueChange(line.id, e.target.value)}
              placeholder={placeholder || (locale === 'zh' ? '输入内容（支持多行）' : 'Enter content (supports multiple lines)')}
              className="flex-1 min-h-[60px]"
              disabled={disabled}
              rows={2}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(line.id)}
              disabled={disabled}
              className="shrink-0 mt-1"
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
        {locale === 'zh' ? '添加行' : 'Add Line'}
      </Button>
    </div>
  )
}
