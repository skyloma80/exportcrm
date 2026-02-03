"use client"

/**
 * AI Analysis Dialog
 * AI报价分析对话框
 * 
 * Displays AI-powered analysis of supplier quotations
 * with recommendations for procurement strategy.
 */

import { useState } from "react"
import { useI18n } from "@/lib/i18n/use-i18n"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Loader2,
  Sparkles,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Building2,
  Package,
  DollarSign,
  Info,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AIAnalysisResult {
  summary: string
  recommendation: 'single' | 'mixed'
  recommended_supplier_id?: string
  recommended_supplier_name?: string
  item_recommendations: Array<{
    rfq_item_id: string
    product_name: string
    best_supplier_id: string
    best_supplier_name: string
    unit_price: number
    reason: string
  }>
  cost_analysis: {
    single_supplier_total?: number
    mixed_supplier_total: number
    potential_savings?: number
    savings_percentage?: number
  }
  risk_assessment: string
  additional_notes: string
}

interface AIAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rfqId: string
  rfqCode: string
  onApplyRecommendation?: (analysis: AIAnalysisResult) => void
}

export function AIAnalysisDialog({
  open,
  onOpenChange,
  rfqId,
  rfqCode,
  onApplyRecommendation,
}: AIAnalysisDialogProps) {
  const { t } = useI18n()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runAnalysis = async () => {
    setLoading(true)
    setError(null)
    setAnalysis(null)

    try {
      const response = await fetch(`/api/rfqs/${rfqId}/ai-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed')
      }

      setAnalysis(data.analysis)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze quotations')
      toast({
        title: t("common.error"),
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (analysis && onApplyRecommendation) {
      onApplyRecommendation(analysis)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {t("rfqs.aiAnalysis.title")}
          </DialogTitle>
          <DialogDescription>
            {t("rfqs.aiAnalysis.description", { code: rfqCode })}
          </DialogDescription>
        </DialogHeader>

        {!analysis && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Sparkles className="h-16 w-16 text-purple-500/50" />
            <p className="text-muted-foreground text-center max-w-md">
              {t("rfqs.aiAnalysis.intro")}
            </p>
            <Button onClick={runAnalysis} className="mt-4">
              <Sparkles className="mr-2 h-4 w-4" />
              {t("rfqs.aiAnalysis.startAnalysis")}
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
            <p className="text-muted-foreground">{t("rfqs.aiAnalysis.analyzing")}</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={runAnalysis}>
              {t("common.retry")}
            </Button>
          </div>
        )}

        {analysis && (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-purple-600" />
                  {t("rfqs.aiAnalysis.summary")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{analysis.summary}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t("rfqs.aiAnalysis.recommendedStrategy")}:
                  </span>
                  <Badge 
                    variant="outline" 
                    className={analysis.recommendation === 'single' 
                      ? 'bg-blue-100 text-blue-800 border-blue-200' 
                      : 'bg-green-100 text-green-800 border-green-200'
                    }
                  >
                    {analysis.recommendation === 'single' 
                      ? t("rfqs.generatePO.singleSupplier")
                      : t("rfqs.generatePO.mixedSupplier")
                    }
                  </Badge>
                  {analysis.recommended_supplier_name && (
                    <Badge variant="secondary">
                      <Building2 className="mr-1 h-3 w-3" />
                      {analysis.recommended_supplier_name}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cost Analysis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {t("rfqs.aiAnalysis.costAnalysis")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {analysis.cost_analysis.single_supplier_total && (
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">
                        {t("rfqs.aiAnalysis.singleSupplierTotal")}
                      </p>
                      <p className="text-lg font-semibold">
                        ${analysis.cost_analysis.single_supplier_total.toFixed(2)}
                      </p>
                    </div>
                  )}
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      {t("rfqs.aiAnalysis.mixedSupplierTotal")}
                    </p>
                    <p className="text-lg font-semibold text-green-600">
                      ${analysis.cost_analysis.mixed_supplier_total.toFixed(2)}
                    </p>
                  </div>
                  {analysis.cost_analysis.potential_savings && analysis.cost_analysis.potential_savings > 0 && (
                    <>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          {t("rfqs.aiAnalysis.potentialSavings")}
                        </p>
                        <p className="text-lg font-semibold text-green-600 flex items-center justify-center gap-1">
                          <TrendingDown className="h-4 w-4" />
                          ${analysis.cost_analysis.potential_savings.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">
                          {t("rfqs.aiAnalysis.savingsPercentage")}
                        </p>
                        <p className="text-lg font-semibold text-green-600">
                          {analysis.cost_analysis.savings_percentage?.toFixed(1)}%
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Item Recommendations */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t("rfqs.aiAnalysis.itemRecommendations")}
                </CardTitle>
                <CardDescription>
                  {t("rfqs.aiAnalysis.itemRecommendationsDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("rfqs.items.product")}</TableHead>
                      <TableHead>{t("rfqs.aiAnalysis.bestSupplier")}</TableHead>
                      <TableHead className="text-right">{t("rfqs.quotations.unitPrice")}</TableHead>
                      <TableHead>{t("rfqs.aiAnalysis.reason")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.item_recommendations.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.product_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            <Building2 className="mr-1 h-3 w-3" />
                            {item.best_supplier_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          ${item.unit_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Risk Assessment & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    {t("rfqs.aiAnalysis.riskAssessment")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{analysis.risk_assessment}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    {t("rfqs.aiAnalysis.additionalNotes")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{analysis.additional_notes}</p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={runAnalysis}>
                <Sparkles className="mr-2 h-4 w-4" />
                {t("rfqs.aiAnalysis.reanalyze")}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t("common.close")}
                </Button>
                {onApplyRecommendation && (
                  <Button onClick={handleApply}>
                    {t("rfqs.aiAnalysis.applyRecommendation")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
