"use client"

/**
 * Supplier Quotation Entry Page
 * 供应商报价录入页面
 * 
 * 强制项目上下文：必须通过 URL 参数 `project` 传递项目 ID，否则返回 404
 * Requirements: 1.1, 2.1
 * 
 * Allows manual entry of supplier quotations for an RFQ.
 */

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { notFound } from "next/navigation"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useProjectContext } from "@/hooks/use-project-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Save, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { rfqService, RFQWithExpand } from "@/lib/pocketbase/services/rfqs"
import { useRFQItems, useRFQQuotations } from "@/hooks/collections/rfqs"
import { PaymentTermsSelect } from "@/components/ui/payment-terms-select"
import { QuotationFileUpload } from "@/components/rfqs/quotation-file-upload"

// Currency options - labels will be set dynamically based on locale
const CURRENCIES = [
  { value: "CNY", labelZh: "CNY - 人民币", labelEn: "CNY - Chinese Yuan", symbol: "¥" },
  { value: "USD", labelZh: "USD - 美元", labelEn: "USD - US Dollar", symbol: "$" },
  { value: "EUR", labelZh: "EUR - 欧元", labelEn: "EUR - Euro", symbol: "€" },
  { value: "GBP", labelZh: "GBP - 英镑", labelEn: "GBP - British Pound", symbol: "£" },
]

interface QuotationItemInput {
  rfqItemId: string
  productId: string
  productCode: string
  productName: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  moq?: number
  leadTimeDays?: number
  remarks?: string
}

interface QuotationFormData {
  currency: string
  leadTimeDays?: number
  validityDays?: number
  paymentTerms?: string
  shippingTerms?: string
  notes?: string
  items: QuotationItemInput[]
}

export default function SupplierQuotationEntryPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()

  const rfqId = params.id as string
  const supplierId = params.supplierId as string

  // 获取项目参数
  const projectIdFromUrl = searchParams.get("project")
  const returnTo = searchParams.get("returnTo")

  // 强制项目上下文：无项目参数返回 404 (Requirements: 1.1)
  if (!projectIdFromUrl) {
    notFound()
  }

  // 使用项目上下文 Hook
  const {
    project: contextProject,
    customer: contextCustomer,
    loading: contextLoading
  } = useProjectContext({
    documentType: 'rfq'
  })

  const [rfq, setRfq] = useState<RFQWithExpand | null>(null)
  const [supplierName, setSupplierName] = useState("")
  const [supplierCode, setSupplierCode] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState<QuotationFormData>({
    currency: "CNY",
    leadTimeDays: 30,
    validityDays: 30,
    items: [],
  })

  const { items: rfqItems, loading: itemsLoading } = useRFQItems(rfqId)
  const { quotations, loading: quotationsLoading } = useRFQQuotations(rfqId)

  // Get currency label based on locale
  const getCurrencyLabel = (curr: typeof CURRENCIES[0]) => {
    return locale === "zh" ? curr.labelZh : curr.labelEn
  }

  // Get currency symbol
  const getCurrencySymbol = (curr: string) => {
    return CURRENCIES.find(c => c.value === curr)?.symbol || curr
  }

  // Get display name based on locale
  const getDisplayName = (item: { name?: string; name_cn?: string }) => {
    if (locale === "zh" && item.name_cn) return item.name_cn
    return item.name || "-"
  }

  // Load RFQ and supplier data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const rfqData = await rfqService.getWithDetails(rfqId)
        if (!rfqData) {
          toast({
            title: t("common.error"),
            description: t("rfqs.notFound"),
            variant: "destructive",
          })
          router.push("/rfqs")
          return
        }
        setRfq(rfqData)

        // Find supplier in RFQ suppliers
        const rfqSupplier = rfqData.expand?.rfq_suppliers_via_rfq?.find(
          s => s.supplier === supplierId
        )
        if (!rfqSupplier) {
          toast({
            title: t("common.error"),
            description: t("rfqs.supplierQuotation.notFound"),
            variant: "destructive",
          })
          router.push(`/rfqs/${rfqId}`)
          return
        }
        setSupplierName(
          rfqSupplier.expand?.supplier
            ? getDisplayName(rfqSupplier.expand.supplier)
            : "-"
        )
        // Set supplier code for file upload path
        setSupplierCode(rfqSupplier.expand?.supplier?.code || "")
      } catch (error) {
        console.error("Error loading RFQ:", error)
        toast({
          title: t("common.error"),
          description: String(error),
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [rfqId, supplierId])

  // Initialize form items from RFQ items
  useEffect(() => {
    if (rfqItems.length > 0 && !quotationsLoading) {
      // Get existing quotations for this supplier
      const supplierQuotations = quotations.filter(q => q.supplier === supplierId)

      const initialItems: QuotationItemInput[] = rfqItems.map(item => {
        const product = item.expand?.product
        const existingQuote = supplierQuotations.find(q => q.rfq_item === item.id)

        return {
          rfqItemId: item.id,
          productId: item.product,
          productCode: product?.code || "",
          productName: product ? getDisplayName(product) : "-",
          quantity: item.quantity,
          unit: product?.unit || "PCS",
          unitPrice: existingQuote?.unit_price || 0,
          totalPrice: existingQuote ? existingQuote.unit_price * item.quantity : 0,
          moq: existingQuote?.moq,
          leadTimeDays: existingQuote?.lead_time_days,
          remarks: existingQuote?.remarks || "",
        }
      })

      setFormData(prev => ({ ...prev, items: initialItems }))
    }
  }, [rfqItems, quotations, quotationsLoading, supplierId])

  // Set breadcrumb (Requirements: 2.1)
  // 注意：只设置当前页面标签，客户和项目信息由 layout 根据 URL 参数自动添加
  useEffect(() => {
    if (rfq) {
      setBreadcrumb([
        { label: rfq.code, href: `/rfqs/${rfqId}?project=${projectIdFromUrl}` },
        { label: t("rfqs.supplierQuotation.enterQuotation") },
      ])
    }
    return () => setBreadcrumb([])
  }, [rfq, setBreadcrumb, t, rfqId, projectIdFromUrl])

  // Handle item price change
  const handleItemChange = (index: number, field: keyof QuotationItemInput, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items]
      newItems[index] = { ...newItems[index], [field]: value }

      // Recalculate total price
      if (field === "unitPrice") {
        newItems[index].totalPrice = Number(value) * newItems[index].quantity
      }

      return { ...prev, items: newItems }
    })
  }

  // Calculate total
  const totalPrice = formData.items.reduce((sum, item) => sum + item.totalPrice, 0)

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/rfqs/${rfqId}/quotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          currency: formData.currency,
          leadTimeDays: formData.leadTimeDays,
          validityDays: formData.validityDays,
          paymentTerms: formData.paymentTerms,
          shippingTerms: formData.shippingTerms,
          notes: formData.notes,
          items: formData.items.filter(item => item.unitPrice > 0).map(item => ({
            rfqItemId: item.rfqItemId,
            unitPrice: item.unitPrice,
            moq: item.moq,
            leadTimeDays: item.leadTimeDays,
            remarks: item.remarks,
          })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t("rfqs.supplierQuotation.saveError"))
      }

      toast({
        title: t("common.success"),
        description: t("rfqs.supplierQuotation.saveSuccess"),
      })
      // 保存成功后返回 RFQ 详情页，传递 returnTo 参数让用户可以继续返回工作流
      router.push(`/rfqs/${rfqId}?project=${projectIdFromUrl}${returnTo ? `&returnTo=${returnTo}` : ''}`)
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("rfqs.supplierQuotation.saveError"),
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading || itemsLoading || contextLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("rfqs.supplierQuotation.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("suppliers.title")}: {supplierName} | {t("rfqs.columns.code")}: {rfq?.code}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("rfqs.supplierQuotation.basicInfo")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="currency">{t("rfqs.supplierQuotation.currency")} *</Label>
                <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm flex items-center">
                  <span>CNY - {locale === 'zh' ? '人民币' : 'Chinese Yuan'}</span>
                </div>
              </div>
              <div>
                <Label htmlFor="leadTime">{t("rfqs.supplierQuotation.leadTime")}</Label>
                <Input
                  id="leadTime"
                  type="number"
                  value={formData.leadTimeDays ?? ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    leadTimeDays: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="validity">{t("quotations.validityDays")}</Label>
                <Input
                  id="validity"
                  type="number"
                  value={formData.validityDays ?? ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    validityDays: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentTerms">{t("rfqs.supplierQuotation.paymentTerms")}</Label>
                <PaymentTermsSelect
                  value={formData.paymentTerms || ""}
                  onChange={(value) => setFormData(prev => ({ ...prev, paymentTerms: value }))}
                  placeholder={t("common.selectOrInput")}
                  allowCustom={true}
                />
              </div>
              <div>
                <Label htmlFor="shippingTerms">{t("rfqs.supplierQuotation.shippingTerms")}</Label>
                <Input
                  id="shippingTerms"
                  value={formData.shippingTerms || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, shippingTerms: e.target.value }))}
                  placeholder={t("orders.placeholders.shippingTerms")}
                />
              </div>
            </div>

            {/* Supplier Quotation File Upload - Requirements: 1.1, 2.3 */}
            <div className="pt-4 border-t">
              <QuotationFileUpload
                customerName={rfq?.expand?.project?.expand?.customer?.name || ""}
                projectName={rfq?.expand?.project?.name || ""}
                rfqCode={rfq?.code || ""}
                supplierCode={supplierCode}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("rfqs.supplierQuotation.items")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("rfqs.supplierQuotation.product")}</TableHead>
                    <TableHead>{t("products.columns.code")}</TableHead>
                    <TableHead className="text-right">{t("rfqs.supplierQuotation.quantity")}</TableHead>
                    <TableHead className="text-center">{t("products.columns.unit")}</TableHead>
                    <TableHead className="text-center">{t("rfqs.supplierQuotation.unitPrice")} ({formData.currency})</TableHead>
                    <TableHead className="text-right">{t("rfqs.supplierQuotation.amount")}</TableHead>
                    <TableHead>{t("rfqs.supplierQuotation.remarks")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items.map((item, index) => (
                    <TableRow key={item.rfqItemId}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{item.productCode}</span>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-center">{item.unit}</TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <div className="relative w-28">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              {getCurrencySymbol(formData.currency)}
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice || ""}
                              onChange={(e) => handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)}
                              className="pl-5 text-right"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {getCurrencySymbol(formData.currency)}{item.totalPrice.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.remarks || ""}
                          onChange={(e) => handleItemChange(index, "remarks", e.target.value)}
                          className="w-32"
                          placeholder={t("rfqs.supplierQuotation.remarks")}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Total */}
            <div className="mt-6 flex justify-end">
              <div className="bg-primary/5 px-6 py-4 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">
                  {t("rfqs.supplierQuotation.totalAmount")} ({formData.currency})
                </div>
                <div className="text-2xl font-bold text-primary">
                  {getCurrencySymbol(formData.currency)}{totalPrice.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>{t("common.notes")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              placeholder={t("common.notesPlaceholder")}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? t("rfqs.supplierQuotation.saving") : t("rfqs.supplierQuotation.save")}
          </Button>
        </div>
      </form>
    </div>
  )
}
