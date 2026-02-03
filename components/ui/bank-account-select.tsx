"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2 } from "lucide-react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { bankAccountService, type BankAccount } from "@/lib/pocketbase/services/bank-accounts"

interface BankAccountSelectProps {
  value?: string
  onChange: (account: BankAccount | null) => void
  placeholder?: string
  /** 是否在加载后自动选择默认账户 */
  autoSelectDefault?: boolean
  /** 用于反向匹配的文本内容 */
  matchContent?: string
}

export function BankAccountSelect({ value, onChange, placeholder, autoSelectDefault = true, matchContent }: BankAccountSelectProps) {
  const { locale } = useI18n()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)

  // Helper to format content
  const getFormattedContent = (rawContent: string) => {
    try {
      const parsed = JSON.parse(rawContent)
      if (Array.isArray(parsed)) {
        return parsed.join('\n')
      }
    } catch (e) {
      // Content is already plain text
    }
    return rawContent
  }

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const data = await bankAccountService.getAll()
        setAccounts(data)

        // Try to match content first if provided and no value selected
        if (!value && matchContent && data.length > 0) {
          // Normalize matchContent (trim to handle slight diffs)
          const target = matchContent.trim()
          const matched = data.find(a => getFormattedContent(a.content).trim() === target)

          if (matched) {
            onChange({ ...matched, content: getFormattedContent(matched.content) })
            return
          }
        }

        // Auto-select default account if enabled, no value, and accounts exist
        if (autoSelectDefault && !value && data.length > 0) {
          const defaultAccount = data.find(a => a.is_default) || data[0]
          const content = getFormattedContent(defaultAccount.content)
          onChange({ ...defaultAccount, content })
        }
      } catch (err) {
        console.error("Error loading bank accounts:", err)
      } finally {
        setLoading(false)
      }
    }
    loadAccounts()
  }, [])

  const handleChange = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    if (account) {
      // Check if content is a JSON array string, if so format it as plain text
      let content = account.content
      try {
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed)) {
          content = parsed.join('\n')
        }
      } catch (e) {
        // Content is already plain text, use as is
      }
      onChange({ ...account, content })
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

  if (accounts.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder={locale === 'zh' ? '暂无银行账户，请联系管理员配置' : 'No bank accounts, contact admin'} />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder || (locale === 'zh' ? '选择银行账户' : 'Select bank account')} />
      </SelectTrigger>
      <SelectContent>
        {accounts.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{account.name}</span>
              {account.is_default && (
                <span className="text-xs text-primary">★</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
