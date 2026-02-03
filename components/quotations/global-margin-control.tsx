'use client'

/**
 * Global Margin Control Component
 * 全局利润率控制组件
 * **Property 5: Global Profit Margin Application**
 * **Validates: Requirements 2.3**
 */

import { useState, useMemo } from 'react'
import { useI18n } from '@/lib/i18n/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Percent, Calculator, TrendingUp, AlertCircle } from 'lucide-react'
import { QuotationItemData, calculateMarginPreview } from '@/lib/quotation/calculations'
import { findCurrencyByCode } from '@/lib/constants/trade-constants'

export interface GlobalMarginControlProps {
  items: QuotationItemData[]
  currency: string
  currentMargin: number
  onApplyMargin: (margin: number) => void
  disabled?: boolean
}

export function GlobalMarginControl({
  items,
  currency,
  currentMargin,
  onApplyMargin,
  disabled = false,
}: GlobalMarginControlProps) {
  const { t, locale } = useI18n()
  const [inputMargin, setInputMargin] = useState<string>(currentMargin.toString())

  const currencyInfo = findCurrencyByCode(currency)
  const currencySymbol = currencyInfo?.symbol || currency

  const marginValue = parseFloat(inputMargin) || 0

  // 计算预览数据
  const preview = useMemo(() => {
    return calculateMarginPreview(items, marginValue)
  }, [items, marginValue])

  const handleApply = () => {
    const margin = parseFloat(inputMargin)
    if (!isNaN(margin) && margin >= 0) {
      onApplyMargin(margin)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // 允许空值和有效数字
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setInputMargin(value)
    }
  }

  const formatCurrency = (value: number) => {
    return `${currencySymbol} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          <CardTitle className="text-base">
            {t('quotations.globalMargin.title') || 'Global Profit Margin'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 利润率输入 */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label htmlFor="global-margin" className="text-sm">
              {t('quotations.globalMargin.margin') || 'Profit Margin'}
            </Label>
            <div className="relative mt-1">
              <Input
                id="global-margin"
                type="text"
                value={inputMargin}
                onChange={handleInputChange}
                disabled={disabled}
                className="pr-8"
                placeholder="20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </div>
          <Button
            onClick={handleApply}
            disabled={disabled || preview.itemsWithCost === 0}
            size="default"
          >
            <Calculator className="mr-2 h-4 w-4" />
            {t('quotations.globalMargin.apply') || 'Apply to All'}
          </Button>
        </div>

        {/* 产品统计 */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Badge variant="default" className="h-5">
              {preview.itemsWithCost}
            </Badge>
            <span className="text-muted-foreground">
              {t('quotations.globalMargin.withCost') || 'with cost price'}
            </span>
          </div>
          {preview.itemsWithoutCost > 0 && (
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="h-5">
                {preview.itemsWithoutCost}
              </Badge>
              <span className="text-muted-foreground">
                {t('quotations.globalMargin.withoutCost') || 'without cost price'}
              </span>
            </div>
          )}
        </div>

        {/* 预览统计 */}
        {preview.itemsWithCost > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">
                {t('quotations.globalMargin.totalCost') || 'Total Cost'}
              </p>
              <p className="text-sm font-medium">{formatCurrency(preview.totalCost)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t('quotations.globalMargin.totalRevenue') || 'Est. Revenue'}
              </p>
              <p className="text-sm font-medium">{formatCurrency(preview.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t('quotations.globalMargin.totalProfit') || 'Est. Profit'}
              </p>
              <p className="text-sm font-medium text-green-600">
                {formatCurrency(preview.totalProfit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t('quotations.globalMargin.profitRate') || 'Profit Rate'}
              </p>
              <p className="text-sm font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-600" />
                {preview.profitPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* 无成本价产品提示 */}
        {preview.itemsWithCost === 0 && items.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              {t('quotations.globalMargin.noCostWarning') ||
                'No products with cost price. Please set cost prices first.'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default GlobalMarginControl
