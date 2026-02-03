"use client"

/**
 * Sourcing Summary Component
 * 采购汇总信息组件
 * 
 * Displays total cost, supplier count, and max lead time.
 * Used by both Cost Table and Sourcing Plans.
 */

import { useI18n } from "@/lib/i18n/use-i18n"
import { Card, CardContent } from "@/components/ui/card"
import { DollarSign, Building2, Clock, Package } from "lucide-react"
import { SourcingPlanSummary } from "@/lib/sourcing-plan/calculations"

// ============================================================================
// Types
// ============================================================================

export interface SourcingSummaryProps {
  summary: SourcingPlanSummary
  currency?: string
}

// ============================================================================
// Component
// ============================================================================

export function SourcingSummary({
  summary,
  currency = "CNY",
}: SourcingSummaryProps) {
  const { t } = useI18n()

  // Format currency
  const formatPrice = (price: number) => {
    const symbols: Record<string, string> = { CNY: "¥", USD: "$", EUR: "€" }
    return `${symbols[currency] || currency}${price.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const stats = [
    {
      label: t("sourcingPlans.totalCost"),
      value: formatPrice(summary.totalCost),
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      label: t("sourcingPlans.supplierCount"),
      value: summary.supplierCount.toString(),
      icon: Building2,
      color: "text-blue-600",
    },
    {
      label: t("sourcingPlans.maxLeadTime"),
      value: `${summary.maxLeadTimeDays} ${t("common.days")}`,
      icon: Clock,
      color: "text-orange-600",
    },
    {
      label: t("sourcingPlans.itemCount"),
      value: summary.itemCount.toString(),
      icon: Package,
      color: "text-purple-600",
    },
  ]

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-semibold">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default SourcingSummary
