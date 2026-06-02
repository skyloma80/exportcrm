"use client"

/**
 * Project Cost Table Page
 * 项目采购成本表页面
 *
 * 从项目的所有 RFQ 中汇总供应商报价，选择最优供应商
 * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 4.1, 5.1, 5.3
 */

import { useState, useEffect, useMemo, useCallback } from "react"
import { useParams } from "next/navigation"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, Save, Package, Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { UNITS } from "@/lib/constants/trade-standards"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  AggregatedQuotationData,
  CostTableSelection,
  CompletionCheckResult,
  CostTableWithExpand,
} from "@/lib/pocketbase/services/project-cost-table"
import { SourcingSummary } from "@/components/supplier-selection/sourcing-summary"
import { RecommendationPanel } from "@/components/supplier-selection/recommendation-panel"
import { calculateSummaryFromSelections } from "@/lib/sourcing-plan/calculations"
import { generateRecommendation, type QuotationData, type RecommendationResult } from "@/lib/sourcing-plan/recommendation"
import type { SupplierSelection } from "@/lib/types/supplier-selection"

// ============================================================================
// Types
// ============================================================================

interface CostTableApiResponse {
  aggregated: AggregatedQuotationData
  costTable: CostTableWithExpand | null
  selections: CostTableSelection[]
  completion: CompletionCheckResult
}

// ============================================================================
// Component
// ============================================================================

export default function ProjectCostTablePage() {
  const params = useParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()

  const projectId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [customerName, setCustomerName] = useState("")

  // Data state
  const [aggregated, setAggregated] = useState<AggregatedQuotationData | null>(null)
  const [costTable, setCostTable] = useState<CostTableWithExpand | null>(null)
  const [selections, setSelections] = useState<CostTableSelection[]>([])
  const [completion, setCompletion] = useState<CompletionCheckResult | null>(null)
  const [recommendationApplied, setRecommendationApplied] = useState(false)

  // Set breadcrumb
  useEffect(() => {
    if (projectName) {
      const items = customerName
        ? [
            { label: customerName, href: `/customers` },
            { label: projectName, href: `/projects/${projectId}` },
            { label: t("projectCostTable.title") },
          ]
        : [
            { label: projectName, href: `/projects/${projectId}` },
            { label: t("projectCostTable.title") },
          ]
      setBreadcrumb(items)
    }
    return () => setBreadcrumb([])
  }, [projectName, customerName, projectId, setBreadcrumb, t])

  // Load data
  const loadData = useCallback(async () => {
    if (!projectId) return

    setLoading(true)
    try {
      // Load project info
      const pb = getPocketBase()
      const project = await pb.collection("projects").getOne(projectId, {
        expand: "customer",
      })
      setProjectName(
        locale === "zh" && project.name_cn ? project.name_cn : project.name
      )
      const customer = (project as any).expand?.customer
      if (customer) {
        setCustomerName(
          locale === "zh" && customer.name_cn ? customer.name_cn : customer.name
        )
      }

      // Load cost table data from API
      const response = await fetch(`/api/projects/${projectId}/cost-table`)
      if (!response.ok) {
        throw new Error("Failed to load cost table data")
      }
      const data: CostTableApiResponse = await response.json()

      setAggregated(data.aggregated)
      setCostTable(data.costTable)
      setSelections(data.selections)
      setCompletion(data.completion)
    } catch (error) {
      console.error("Error loading cost table:", error)
      toast({
        title: t("common.error"),
        description: String(error),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, locale, t, toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Get display name based on locale
  const getDisplayName = (item: { name?: string; nameCn?: string }) => {
    if (locale === "zh" && item.nameCn) return item.nameCn
    return item.name || "-"
  }

  // Build supplier name map
  const supplierNames = useMemo(() => {
    const map = new Map<string, string>()
    if (aggregated) {
      for (const s of aggregated.suppliers) {
        map.set(s.id, getDisplayName(s))
      }
    }
    return map
  }, [aggregated, locale])

  // Build product name map
  const productNames = useMemo(() => {
    const map = new Map<string, string>()
    if (aggregated) {
      for (const p of aggregated.products) {
        map.set(p.id, getDisplayName(p))
      }
    }
    return map
  }, [aggregated, locale])

  // Build quotation lookup: productId -> supplierId -> quotation (keep lowest price)
  const quotationMap = useMemo(() => {
    type QuotationType = AggregatedQuotationData["quotations"][0]
    const map = new Map<string, Map<string, QuotationType>>()
    if (aggregated) {
      for (const q of aggregated.quotations) {
        if (!map.has(q.productId)) {
          map.set(q.productId, new Map())
        }
        const productMap = map.get(q.productId)!
        const existing = productMap.get(q.supplierId)
        // Keep the quotation with lowest price for each product-supplier pair
        if (!existing || q.unitPrice < existing.unitPrice) {
          productMap.set(q.supplierId, q)
        }
      }
    }
    return map
  }, [aggregated])

  // Find lowest price for each product
  const lowestPrices = useMemo(() => {
    const lowest = new Map<string, { price: number; supplierId: string }>()
    if (aggregated) {
      for (const q of aggregated.quotations) {
        const current = lowest.get(q.productId)
        if (!current || q.unitPrice < current.price) {
          lowest.set(q.productId, { price: q.unitPrice, supplierId: q.supplierId })
        }
      }
    }
    return lowest
  }, [aggregated])

  // Generate recommendation
  const recommendation: RecommendationResult | null = useMemo(() => {
    if (!aggregated || aggregated.quotations.length === 0) return null

    // Convert to QuotationData format
    const quotationData: QuotationData[] = aggregated.quotations.map((q) => {
      const product = aggregated.products.find((p) => p.id === q.productId)
      return {
        rfqQuotationId: q.id,
        rfqItemId: "",
        productId: q.productId,
        supplierId: q.supplierId,
        supplierName: supplierNames.get(q.supplierId) || q.supplierId,
        unitPrice: q.unitPrice,
        quantity: product?.quantity || 0,
        leadTimeDays: q.leadTimeDays || 0,
      }
    })

    return generateRecommendation(quotationData)
  }, [aggregated, supplierNames])

  // Apply recommendation
  const handleApplyRecommendation = useCallback(() => {
    if (!recommendation || !aggregated) return

    const newSelections: CostTableSelection[] = recommendation.selections.map((s) => ({
      productId: s.productId,
      supplierId: s.supplierId,
      rfqQuotationId: s.rfqQuotationId,
      quantity: s.quantity,
      unitPrice: s.unitPrice,
      leadTimeDays: s.leadTimeDays || null,
    }))

    setSelections(newSelections)
    setRecommendationApplied(true)
  }, [recommendation, aggregated])


  // Handle supplier selection for a product
  const handleSupplierSelect = (productId: string, supplierId: string) => {
    const quotation = quotationMap.get(productId)?.get(supplierId)
    if (!quotation || !aggregated) return

    const product = aggregated.products.find((p) => p.id === productId)
    if (!product) return

    const newSelection: CostTableSelection = {
      productId,
      supplierId,
      rfqQuotationId: quotation.id,
      quantity: product.quantity,
      unitPrice: quotation.unitPrice,
      leadTimeDays: quotation.leadTimeDays || null,
    }

    // Update or add selection
    const existingIndex = selections.findIndex((s) => s.productId === productId)
    const newSelections = [...selections]

    if (existingIndex >= 0) {
      newSelections[existingIndex] = newSelection
    } else {
      newSelections.push(newSelection)
    }

    setSelections(newSelections)
  }

  // Get current selection for a product
  const getSelection = (productId: string): CostTableSelection | undefined => {
    return selections.find((s) => s.productId === productId)
  }

  // Convert to SupplierSelection for summary calculation
  const supplierSelections: SupplierSelection[] = useMemo(() => {
    return selections
      .filter((s) => s.supplierId)
      .map((s) => ({
        productId: s.productId,
        supplierId: s.supplierId!,
        rfqQuotationId: s.rfqQuotationId || "",
        rfqItemId: "",
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        leadTimeDays: s.leadTimeDays || 0,
      }))
  }, [selections])

  // Calculate summary
  const summary = useMemo(() => {
    return calculateSummaryFromSelections(supplierSelections)
  }, [supplierSelections])

  // Save selections
  const handleSave = async () => {
    if (!projectId || selections.length === 0) return

    setSaving(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/cost-table`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections, currency: "CNY" }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save")
      }

      const data = await response.json()
      setCostTable(data.costTable)
      setCompletion(data.completion)

      toast({
        title: t("common.success"),
        description: t("projectCostTable.saved"),
      })
    } catch (error) {
      console.error("Error saving cost table:", error)
      toast({
        title: t("common.error"),
        description: String(error),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Format currency
  const formatPrice = (price: number, currency: string = "CNY") => {
    const symbols: Record<string, string> = { CNY: "¥", USD: "$", EUR: "€" }
    return `${symbols[currency] || currency}${price.toFixed(2)}`
  }

  const hasQuotations = aggregated && aggregated.quotations.length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }


  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("projectCostTable.title")}</h1>
            <p className="text-muted-foreground mt-1">{projectName}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving || selections.length === 0}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t("common.save")}
            </Button>
          </div>
        </div>
      </div>

      {!hasQuotations ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-semibold mb-2">
              {t("projectCostTable.noQuotations")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("projectCostTable.noQuotationsDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Recommendation Panel */}
          {recommendation && recommendation.selections.length > 0 && (
            <RecommendationPanel
              recommendation={recommendation}
              supplierNames={supplierNames}
              productNames={productNames}
              currency="CNY"
              onApply={handleApplyRecommendation}
              isApplied={recommendationApplied}
            />
          )}

          {/* Completion Status */}
          {completion && !completion.complete && completion.missingProducts.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-800">
                      {t("projectCostTable.incompleteWarning", {
                        count: String(completion.missingProducts.length),
                      })}
                    </p>
                    <p className="text-sm text-orange-700 mt-1">
                      {completion.missingProducts
                        .map((p) => (locale === "zh" && p.nameCn ? p.nameCn : p.name))
                        .join(", ")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t("projectCostTable.costDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">
                        {t("projectCostTable.product")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        {t("projectCostTable.quantity")}
                      </th>
                      <th className="text-left py-3 px-4 font-medium">
                        {t("projectCostTable.selectSupplier")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        {t("projectCostTable.unitPrice")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        {t("projectCostTable.leadTime")}
                      </th>
                      <th className="text-right py-3 px-4 font-medium">
                        {t("projectCostTable.amount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregated?.products.map((product) => {
                      const selection = getSelection(product.id)
                      const productQuotations = quotationMap.get(product.id)
                      const availableSuppliers = aggregated.suppliers.filter(
                        (s) => productQuotations?.has(s.id)
                      )
                      const lowest = lowestPrices.get(product.id)

                      return (
                        <tr key={product.id} className="border-b">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{getDisplayName(product)}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.code}
                              </p>
                            </div>
                          </td>
                          <td className="text-right py-3 px-4">
                            {product.quantity} {UNITS[product.unit]?.name_cn || product.unit}
                          </td>
                          <td className="py-3 px-4">
                            <Select
                              value={selection?.supplierId || ""}
                              onValueChange={(value) =>
                                handleSupplierSelect(product.id, value)
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue
                                  placeholder={t("projectCostTable.selectSupplierPlaceholder")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {availableSuppliers.map((supplier) => {
                                  const quote = productQuotations?.get(supplier.id)
                                  const isLowest = lowest?.supplierId === supplier.id
                                  return (
                                    <SelectItem key={supplier.id} value={supplier.id}>
                                      <div className="flex items-center gap-2">
                                        <span>{getDisplayName(supplier)}</span>
                                        <span className="text-muted-foreground">
                                          ({formatPrice(quote?.unitPrice || 0)})
                                        </span>
                                        {isLowest && (
                                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                        )}
                                      </div>
                                    </SelectItem>
                                  )
                                })}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="text-right py-3 px-4">
                            {selection ? (
                              <span
                                className={
                                  lowest?.supplierId === selection.supplierId
                                    ? "text-green-600 font-semibold"
                                    : ""
                                }
                              >
                                {formatPrice(selection.unitPrice)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="text-right py-3 px-4">
                            {selection?.leadTimeDays ? (
                              <span>
                                {selection.leadTimeDays} {t("common.days")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="text-right py-3 px-4 font-medium">
                            {selection ? (
                              formatPrice(selection.quantity * selection.unitPrice)
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {supplierSelections.length > 0 && (
            <SourcingSummary summary={summary} currency="CNY" />
          )}
        </div>
      )}
    </div>
  )
}
