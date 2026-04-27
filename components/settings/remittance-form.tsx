"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2 } from "lucide-react"
import { useI18n } from "@/lib/i18n/use-i18n"
import type { Remittance, RemittanceCreateInput } from "@/lib/pocketbase/services/remittance"

interface RemittanceFormProps {
  initialData?: Remittance
  onSubmit: (data: RemittanceCreateInput) => Promise<void>
  isLoading?: boolean
}

export function RemittanceForm({ initialData, onSubmit, isLoading }: RemittanceFormProps) {
  const { locale } = useI18n()
  
  const [name, setName] = useState(initialData?.name || "")
  const [items, setItems] = useState<string[]>(
    initialData?.items || [""]
  )
  const [isDefault, setIsDefault] = useState(initialData?.is_default || false)

  const handleAddItem = () => {
    setItems([...items, ""])
  }

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
  }

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = value
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validItems = items.filter(item => item.trim() !== "")
    await onSubmit({ name, items: validItems, is_default: isDefault })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{locale === 'zh' ? '模板名称' : 'Template Name'} <span className="text-destructive">*</span></Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={locale === 'zh' ? '如：美元账户、欧元账户' : 'e.g., USD Account, EUR Account'}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>{locale === 'zh' ? '汇款信息项' : 'Remittance Items'}</Label>
        <div className="space-y-2 bg-slate-50 p-3 rounded-lg">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500 w-8">{index + 1}.</span>
              <Input
                value={item}
                onChange={(e) => handleItemChange(index, e.target.value)}
                placeholder={locale === 'zh' ? '例如：BENEFICIARY NAME: CHONGQING ALUSTARS' : 'e.g., BENEFICIARY NAME: CHONGQING ALUSTARS'}
                className="flex-1"
              />
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-destructive"
                  onClick={() => handleRemoveItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={handleAddItem}
          >
            <Plus className="h-4 w-4 mr-1" />
            {locale === 'zh' ? '添加行' : 'Add Line'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {locale === 'zh' 
            ? '每行一个汇款信息项，保存时自动过滤空行' 
            : 'Enter one item per line. Empty lines will be filtered on save.'}
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
          {locale === 'zh' ? '设为默认模板' : 'Set as default'}
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