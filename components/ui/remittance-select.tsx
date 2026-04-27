"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2 } from "lucide-react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { remittanceService, type Remittance } from "@/lib/pocketbase/services/remittance"

interface RemittanceSelectProps {
  value?: string
  onChange: (remittance: Remittance | null) => void
  placeholder?: string
  /** 是否在加载后自动选择默认账户 */
  autoSelectDefault?: boolean
  /** 用于反向匹配的文本内容 */
  matchContent?: string
}

export function RemittanceSelect({ value, onChange, placeholder, autoSelectDefault = true, matchContent }: RemittanceSelectProps) {
  const { locale } = useI18n()
  const [remittances, setRemittances] = useState<Remittance[]>([])
  const [loading, setLoading] = useState(true)

  // Helper to format content
  const getFormattedContent = (items: string[]) => {
    return items.join('\n')
  }

  useEffect(() => {
    const loadRemittances = async () => {
      try {
        const data = await remittanceService.getAll()
        setRemittances(data)

        // Try to match content first if provided and no value selected
        if (!value && matchContent && data.length > 0) {
          // Normalize matchContent (trim to handle slight diffs)
          const target = matchContent.trim()
          const matched = data.find(r => getFormattedContent(r.items).trim() === target)

          if (matched) {
            onChange({ ...matched })
            return
          }
        }

        // Auto-select default remittance if enabled, no value, and remittances exist
        if (autoSelectDefault && !value && data.length > 0) {
          const defaultRemittance = data.find(r => r.is_default) || data[0]
          onChange({ ...defaultRemittance })
        }
      } catch (err) {
        console.error("Error loading remittances:", err)
      } finally {
        setLoading(false)
      }
    }
    loadRemittances()
  }, [])

  const handleChange = (id: string) => {
    const remittance = remittances.find(r => r.id === id)
    if (remittance) {
      onChange({ ...remittance })
    } else {
      onChange(null)
    }
  }

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder={locale === 'zh' ? '加载中...' : 'Loading...'} />
        </SelectTrigger>
      </Select>
    )
  }

  if (remittances.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder={locale === 'zh' ? '暂无汇款信息，请联系管理员配置' : 'No remittances, contact admin'} />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder || (locale === 'zh' ? '选择汇款信息' : 'Select remittance')} />
      </SelectTrigger>
      <SelectContent>
        {remittances.map((remittance) => (
          <SelectItem key={remittance.id} value={remittance.id}>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{remittance.name}</span>
              {remittance.is_default && (
                <span className="text-xs text-primary">★</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
