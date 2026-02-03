'use client'

/**
 * Cost Breakdown Section Component
 * 费用分解组件
 * **Property 6: Cost Breakdown Sum**
 * **Validates: Requirements 3.1, 3.2, 3.4**
 */

import { useMemo } from 'react'
import { useI18n } from '@/lib/i18n/use-i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DollarSign, Ship, Shield, FileText, Truck, Package } from 'lucide-react'
import { INCOTERMS, findCurrencyByCode } from '@/lib/constants/trade-constants'
import { calculateCostBreakdownTotal } from '@/lib/quotation/calculations'

// 各 Incoterm 对应的费用字段定义
const INCOTERM_COST_FIELDS: Record<string, string[]> = {
  EXW: [], // 工厂交货，无额外费用
  FCA: ['inland_freight'], // 内陆运费
  FAS: ['inland_freight'], // 内陆运费
  FOB: ['inland_freight', 'port_charges'], // 内陆运费、港口费
  CFR: ['inland_freight', 'port_charges', 'ocean_freight'], // 内陆运费、港口费、海运费
  CIF: ['inland_freight', 'port_charges', 'ocean_freight', 'insurance'], // 内陆运费、港口费、海运费、保险费
  CPT: ['inland_freight', 'freight'], // 内陆运费、运费
  CIP: ['inland_freight', 'freight', 'insurance'], // 内陆运费、运费、保险费
  DAP: ['inland_freight', 'freight', 'insurance', 'destination_charges'], // 内陆运费、运费、保险费、目的地费用
  DPU: ['inland_freight', 'freight', 'insurance', 'destination_charges', 'unloading'], // 加卸货费
  DDP: ['inland_freight', 'freight', 'insurance', 'destination_charges', 'customs_duty', 'import_tax'], // 加关税、进口税
}

// 费用字段配置
const COST_FIELD_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; labelKey: string; defaultLabel: string }> = {
  inland_freight: { icon: Truck, labelKey: 'quotations.costBreakdown.inlandFreight', defaultLabel: 'Inland Freight' },
  port_charges: { icon: Ship, labelKey: 'quotations.costBreakdown.portCharges', defaultLabel: 'Port Charges' },
  ocean_freight: { icon: Ship, labelKey: 'quotations.costBreakdown.oceanFreight', defaultLabel: 'Ocean Freight' },
  freight: { icon: Truck, labelKey: 'quotations.costBreakdown.freight', defaultLabel: 'Freight' },
  insurance: { icon: Shield, labelKey: 'quotations.costBreakdown.insurance', defaultLabel: 'Insurance' },
  destination_charges: { icon: Package, labelKey: 'quotations.costBreakdown.destinationCharges', defaultLabel: 'Destination Charges' },
  unloading: { icon: Package, labelKey: 'quotations.costBreakdown.unloading', defaultLabel: 'Unloading' },
  customs_duty: { icon: FileText, labelKey: 'quotations.costBreakdown.customsDuty', defaultLabel: 'Customs Duty' },
  import_tax: { icon: FileText, labelKey: 'quotations.costBreakdown.importTax', defaultLabel: 'Import Tax' },
}

export interface CostBreakdownSectionProps {
  incoterm: string
  currency: string
  costBreakdown: Record<string, number>
  onIncotermChange: (incoterm: string) => void
  onCostChange: (costs: Record<string, number>) => void
  disabled?: boolean
}

export function CostBreakdownSection({
  incoterm,
  currency,
  costBreakdown,
  onIncotermChange,
  onCostChange,
  disabled = false,
}: CostBreakdownSectionProps) {
  const { t, locale } = useI18n()

  const currencyInfo = findCurrencyByCode(currency)
  const currencySymbol = currencyInfo?.symbol || currency

  // 获取当前 Incoterm 对应的费用字段
  const costFields = useMemo(() => {
    return INCOTERM_COST_FIELDS[incoterm] || []
  }, [incoterm])

  // 计算费用总计
  const total = useMemo(() => {
    return calculateCostBreakdownTotal(costBreakdown)
  }, [costBreakdown])

  const handleCostChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0
    onCostChange({
      ...costBreakdown,
      [field]: numValue,
    })
  }

  const handleIncotermChange = (newIncoterm: string) => {
    onIncotermChange(newIncoterm)
    // 清除不再需要的费用字段
    const newFields = INCOTERM_COST_FIELDS[newIncoterm] || []
    const newCosts: Record<string, number> = {}
    newFields.forEach(field => {
      newCosts[field] = costBreakdown[field] || 0
    })
    onCostChange(newCosts)
  }

  const getIncotermDisplay = (code: string) => {
    const term = INCOTERMS.find(i => i.code === code)
    if (!term) return code
    return locale === 'zh' ? `${code} - ${term.name_cn}` : `${code} - ${term.name}`
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          <CardTitle className="text-base">
            {t('quotations.costBreakdown.title') || 'Cost Breakdown'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 费用字段 */}
        {costFields.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {costFields.map((field) => {
              const config = COST_FIELD_CONFIG[field]
              const Icon = config?.icon || DollarSign
              const label = t(config?.labelKey) || config?.defaultLabel || field

              return (
                <div key={field}>
                  <Label htmlFor={field} className="text-sm flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {label}
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      {currencySymbol}
                    </span>
                    <Input
                      id={field}
                      type="number"
                      min={0}
                      step={0.01}
                      value={costBreakdown[field] || ''}
                      onChange={(e) => handleCostChange(field, e.target.value)}
                      disabled={disabled}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-4 text-center bg-muted/50 rounded-md">
            {incoterm === 'EXW'
              ? t('quotations.costBreakdown.exwNote') || 'EXW: No additional costs - buyer arranges all transport'
              : t('quotations.costBreakdown.selectIncotermFirst') || 'Select an Incoterm to see cost fields'}
          </div>
        )}

        {/* 费用总计 */}
        {costFields.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-sm font-medium">
              {t('quotations.costBreakdown.total') || 'Additional Costs Total'}
            </span>
            <span className="text-lg font-bold">
              {currencySymbol} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CostBreakdownSection
