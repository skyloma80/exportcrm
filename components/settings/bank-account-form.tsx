"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/lib/i18n/use-i18n"
import type { BankAccount, BankAccountCreateInput } from "@/lib/pocketbase/services/bank-accounts"

interface BankAccountFormProps {
  initialData?: BankAccount
  onSubmit: (data: BankAccountCreateInput) => Promise<void>
  isLoading?: boolean
}

export function BankAccountForm({ initialData, onSubmit, isLoading }: BankAccountFormProps) {
  const { locale } = useI18n()
  
  const [name, setName] = useState(initialData?.name || "")
  const [content, setContent] = useState(() => {
    if (!initialData?.content) return ""
    try {
      const parsed = JSON.parse(initialData.content)
      if (Array.isArray(parsed)) {
        return parsed.join('\n')
      }
      return initialData.content
    } catch (e) {
      return initialData.content
    }
  })
  const [isDefault, setIsDefault] = useState(initialData?.is_default || false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({ name, content, is_default: isDefault })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{locale === 'zh' ? '账户名称' : 'Account Name'} <span className="text-destructive">*</span></Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={locale === 'zh' ? '如：美元账户、人民币账户' : 'e.g., USD Account, CNY Account'}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>{locale === 'zh' ? '银行信息内容' : 'Bank Information'} <span className="text-destructive">*</span></Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={locale === 'zh' 
            ? '1. BENEFICIARY NAME: XXX\n2. ACCOUNT NUMBER: XXX\n3. BENEFICIARY BANK: XXX\n4. SWIFT CODE: XXX' 
            : '1. BENEFICIARY NAME: XXX\n2. ACCOUNT NUMBER: XXX\n3. BENEFICIARY BANK: XXX\n4. SWIFT CODE: XXX'}
          rows={8}
          className="font-mono text-sm"
          required
        />
        <p className="text-xs text-muted-foreground">
          {locale === 'zh' 
            ? '直接输入银行信息，支持多行，将原样显示在 PI 中' 
            : 'Enter bank info directly, supports multiple lines, displayed as-is in PI'}
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_default"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="rounded border-gray-300"
        />
        <Label htmlFor="is_default" className="cursor-pointer">
          {locale === 'zh' ? '设为默认账户' : 'Set as default'}
        </Label>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (locale === 'zh' ? '保存中...' : 'Saving...') : (locale === 'zh' ? '保存' : 'Save')}
        </Button>
      </div>
    </form>
  )
}
