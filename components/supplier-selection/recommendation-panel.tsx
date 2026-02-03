"use client"

/**
 * Recommendation Panel Component
 * 智能推荐面板组件
 * 
 * Displays AI-generated supplier selection recommendations with reasons.
 * Used by both Cost Table and Sourcing Plans.
 */

import { useMemo } from "react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, TrendingDown, Clock, Building2, Check } from "lucide-react"
import { RecommendationResult, RecommendationReason } from "@/lib/sourcing-plan/recommendation"
import { groupBySupplier } from "@/lib/sourcing-plan/calculations"

// ============================================================================
// Types
// ============================================================================

export interface RecommendationPanelProps {
  recommendation: RecommendationResult | null
  supplierNames: Map<string, string>
  productNames: Map<string, string>
  currency?: string
  onApply: () => void
  isApplied?: boolean
  loading?: boolean
}

// ============================================================================
// Component
// ============================================================================

export function RecommendationPanel({
  recommendation,
  supplierNames,
  productNames,
  currency = "CNY",
  onApply,
  isApplied = false,
  loading = false,
}: RecommendationPanelProps) {
  const { t } = useI18n()

  // Format currency
  const formatPrice = (price: number) => {
    const symbols: Record<string, string> = { CNY: "¥", USD: "$", EUR: "€" }
    return `${symbols[currency] || currency}${price.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Group recommendations by supplier
  const supplierGroups = useMemo(() => {
    if (!recommendation) return []
    return groupBySupplier(recommendation.selections, supplierNames)
  }, [recommendation, supplierNames])

  // Get reason icon
  const getReasonIcon = (type: RecommendationReason["type"]) => {
    switch (type) {
      case "lowest_price":
        return <TrendingDown className="h-4 w-4 text-green-600" />
      case "shortest_lead_time":
        return <Clock className="h-4 w-4 text-blue-600" />
      case "supplier_consolidation":
        return <Building2 className="h-4 w-4 text-purple-600" />
      default:
        return <Lightbulb className="h-4 w-4" />
    }
  }

  if (!recommendation || recommendation.selections.length === 0) {
    return null
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            {t("sourcingPlans.recommendation.title")}
          </CardTitle>
          <Button 
            onClick={onApply} 
            disabled={isApplied || loading}
            size="sm"
          >
            {isApplied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t("sourcingPlans.recommendation.applied")}
              </>
            ) : (
              t("sourcingPlans.recommendation.apply")
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t("sourcingPlans.totalCost")}:</span>
            <span className="font-semibold text-green-600">
              {formatPrice(recommendation.totalCost)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t("sourcingPlans.supplierCount")}:</span>
            <span className="font-semibold">{recommendation.supplierCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t("sourcingPlans.maxLeadTime")}:</span>
            <span className="font-semibold">{recommendation.maxLeadTimeDays} {t("common.days")}</span>
          </div>
        </div>

        {/* Supplier Groups */}
        <div className="space-y-2">
          {supplierGroups.map((group) => (
            <div 
              key={group.supplierId} 
              className="rounded-md bg-background p-3 text-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  {group.supplierName || group.supplierId}
                </span>
                <span className="text-muted-foreground">
                  {formatPrice(group.subtotal)}
                </span>
              </div>
              <div className="text-muted-foreground text-xs">
                {group.items.map((item, idx) => (
                  <span key={item.productId}>
                    {productNames.get(item.productId) || item.productId}
                    {idx < group.items.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Reasons */}
        {recommendation.reasons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recommendation.reasons.map((reason, idx) => (
              <Badge 
                key={idx} 
                variant="secondary" 
                className="flex items-center gap-1"
              >
                {getReasonIcon(reason.type)}
                <span>{reason.description}</span>
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RecommendationPanel
