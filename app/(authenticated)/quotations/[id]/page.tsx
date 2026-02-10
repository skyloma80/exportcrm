"use client"

/**
 * Quotation Detail Page
 * 报价单详情页
 * 
 * 强制项目上下文：必须通过 URL 参数 `project` 传递项目 ID，否则返回 404
 * Requirements: 1.2, 2.1
 */

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { formatUnitPrice, formatAmount, formatCostPrice } from '@/lib/utils/currency-formatting';
import { useTabState } from "@/hooks/use-tab-state"
import { getPocketBase } from "@/lib/pocketbase/auth"
import {
  ArrowLeft,
  Edit,
  Send,
  CheckCircle,
  XCircle,
  Copy,
  FileText,
  Building2,
  FolderKanban,
  Calendar,
  Plus,
  Trash2,
} from "lucide-react"
import { SendQuotationDialog } from "@/components/quotations/send-quotation-dialog"
import { QuotationItemDialog } from "@/components/quotations/quotation-item-dialog"
import { StatusConfirmDialog } from "@/components/quotations/status-confirm-dialog"
import { GenerateQuoFileButton } from "@/components/quotations/generate-quo-file-button"
import type {
  QuotationWithExpand,
  QuotationStatus,
  QuotationItemWithExpand

} from "@/lib/pocketbase/services/quotations"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useProjectContext } from "@/hooks/use-project-context"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function QuotationDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumbItems } = useBreadcrumb()
  const [activeTab, setActiveTab] = useTabState("info")

  // 获取项目参数
  const projectIdFromUrl = searchParams.get("project")

  // 强制项目上下文：无项目参数返回 404 (Requirements: 1.2)
  if (!projectIdFromUrl) {
    notFound()
  }

  // 使用项目上下文 Hook 获取返回 URL
  const {
    project: contextProject,
    customer: contextCustomer,
    loading: contextLoading,
    returnUrl
  } = useProjectContext({
    documentType: 'quotation'
  })

  const [quotation, setQuotation] = useState<QuotationWithExpand | null>(null)
  const [items, setItems] = useState<QuotationItemWithExpand[]>([])
  const [existingOrder, setExistingOrder] = useState<{ id: string; code: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showAddItemDialog, setShowAddItemDialog] = useState(false)
  const [showStatusDialog, setShowStatusDialog] = useState<'accept' | 'reject' | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  // Set breadcrumb when quotation loads (Requirements: 2.1)
  // 注意：只设置当前页面标签，客户和项目信息由 layout 根据 URL 参数自动添加
  useEffect(() => {
    if (quotation) {
      setBreadcrumbItems([
        { label: quotation.code },
      ])
    }
    return () => setBreadcrumbItems([])
  }, [quotation, setBreadcrumbItems])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const pb = getPocketBase()
      const result = await pb.collection("quotations").getOne<QuotationWithExpand>(id, {
        expand: "project,customer,quotation_items_via_quotation,quotation_items_via_quotation.product,quotation_mold_items_via_quotation",
      })
      setQuotation(result)
      setItems(result.expand?.quotation_items_via_quotation || [])

      // Check if quotation has already been converted to an order
      const orders = await pb.collection("orders").getList<{ id: string; code: string }>(1, 1, {
        filter: `quotation = "${id}"`,
        fields: "id,code",
      })
      setExistingOrder(orders.items.length > 0 ? orders.items[0] : null)
    } catch (err: any) {
      console.error("Error loading quotation:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status: QuotationStatus) => {
    switch (status) {
      case 'accepted': return 'default'
      case 'rejected': return 'destructive'
      case 'expired': return 'secondary'
      case 'sent': return 'outline'
      case 'revised': return 'secondary'
      default: return 'outline'
    }
  }

  const getDisplayName = (item?: { name: string; name_cn?: string }) => {
    if (!item) return "-"
    return locale === 'zh' && item.name_cn ? item.name_cn : item.name
  }

  const formatCurrency = (amount: number, currency?: string) => {
    return formatAmount(amount, currency || quotation?.currency || 'USD');
  }

  const formatCostCurrency = (amount: number) => {
    return formatCostPrice(amount);
  }

  const handleStatusChange = async (newStatus: QuotationStatus, rejectionReason?: string) => {
    if (!quotation) return
    setStatusLoading(true)
    try {
      const pb = getPocketBase()
      const updates: Record<string, any> = { status: newStatus }
      if (newStatus === 'sent') {
        updates.sent_at = new Date().toISOString()
      }
      if (newStatus === 'rejected' && rejectionReason) {
        updates.rejection_reason = rejectionReason
      }
      await pb.collection("quotations").update(quotation.id, updates)

      toast({
        title: t("quotations.updateSuccess"),
        description: t("quotations.updateSuccessDesc"),
      })
      setShowStatusDialog(null)
      loadData()
    } catch (err) {
      console.error("Status update error:", err)
      toast({
        title: t("quotations.updateError"),
        variant: "destructive",
      })
    } finally {
      setStatusLoading(false)
    }
  }

  const handleRevise = async () => {
    if (!quotation) return
    try {
      const response = await fetch(`/api/quotations/${quotation.id}/revise`, {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create revision')
      }
      const result = await response.json()
      toast({
        title: t("quotations.reviseSuccess"),
        description: t("quotations.reviseSuccessDesc"),
      })
      router.push(`/quotations/${result.quotationId}?project=${projectIdFromUrl}`)
    } catch (err: any) {
      console.error("Revise error:", err)
      toast({
        title: t("quotations.reviseError"),
        description: err.message,
        variant: "destructive",
      })
    }
  }

  const handleAddItems = async (newItems: { product: string; quantity: number; cost_price: number; profit_margin: number; unit_price: number; amount: number }[]) => {
    if (!quotation) return
    try {
      const pb = getPocketBase()
      for (const item of newItems) {
        await pb.collection("quotation_items").create({
          quotation: quotation.id,
          product: item.product,
          quantity: item.quantity,
          cost_price: item.cost_price,
          profit_margin: item.profit_margin,
          unit_price: item.unit_price,
          amount: item.amount,
        })
      }
      // Recalculate total
      await updateQuotationTotal()
      toast({
        title: t("quotations.items.addSuccess"),
      })
      loadData()
    } catch (err) {
      console.error("Add items error:", err)
      toast({
        title: t("quotations.items.addError"),
        variant: "destructive",
      })
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!quotation) return
    try {
      const pb = getPocketBase()
      await pb.collection("quotation_items").delete(itemId)
      await updateQuotationTotal()
      toast({
        title: t("quotations.items.deleteSuccess"),
      })
      loadData()
    } catch (err) {
      console.error("Delete item error:", err)
      toast({
        title: t("quotations.items.deleteError"),
        variant: "destructive",
      })
    }
  }

  const updateQuotationTotal = async () => {
    if (!quotation) return
    const pb = getPocketBase()
    const allItems = await pb.collection("quotation_items").getFullList<{ amount: number }>({
      filter: `quotation = "${quotation.id}"`,
    })
    const allMolds = await pb.collection("quotation_mold_items").getFullList<{ cost: number; charge_method: string }>({
      filter: `quotation = "${quotation.id}"`,
    })
    const itemsTotal = allItems.reduce((sum, item) => sum + item.amount, 0)
    const moldsTotal = allMolds.reduce((sum, mold) => {
      if (mold.charge_method === 'first_order_free') return sum
      return sum + mold.cost
    }, 0)
    // 包含 cost_breakdown
    const costBreakdownTotal = quotation.cost_breakdown
      ? Object.values(quotation.cost_breakdown as Record<string, number>).reduce((sum, v) => sum + (v || 0), 0)
      : 0
    await pb.collection("quotations").update(quotation.id, {
      total_amount: itemsTotal + moldsTotal + costBreakdownTotal,
    })
  }

  if (loading || contextLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 返回按钮导航到项目详情页 (Requirements: 2.1)
  const handleBack = () => {
    router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=quotations`)
  }

  if (error || !quotation) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">{t("quotations.notFound")}</h2>
              <Button variant="outline" onClick={handleBack} className="mt-4">
                {t("common.back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calculate totals
  const itemsSubtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const moldTotal = 0  // Mold functionality removed
  const costBreakdownTotal = quotation?.cost_breakdown
    ? Object.values(quotation.cost_breakdown as Record<string, number>).reduce((sum, v) => sum + (v || 0), 0)
    : 0
  // 计算实际总计（而不是使用数据库中可能过时的值）
  const calculatedGrandTotal = itemsSubtotal + costBreakdownTotal

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{quotation.code}</h1>
                <Badge variant={getStatusVariant(quotation.status)}>
                  {t(`quotations.status.${quotation.status}`)}
                </Badge>
                <span className="text-muted-foreground">v{quotation.version}</span>
              </div>
              <p className="text-muted-foreground mt-1">
                {getDisplayName(quotation.expand?.project)} • {getDisplayName(quotation.expand?.customer)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* 顶部仅保留返回按钮功能，其他功能移至下方 Actions 卡片 */}
          </div>
        </div>
      </div>

      {/* Action Buttons Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('quotations.actionsTitle')}</CardTitle>
          <CardDescription>{t('quotations.actionsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* 编辑功能 */}
            {quotation.status === 'draft' && (
              <Button
                variant="outline"
                onClick={() => router.push(`/quotations/${id}/edit?project=${projectIdFromUrl}`)}
                className="h-auto py-4 flex flex-col items-start gap-2"
              >
                <div className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  <span className="font-semibold">{t("common.edit")}</span>
                </div>
                <span className="text-sm text-muted-foreground text-left">修改报价单基本信息和产品明细</span>
              </Button>
            )}

            {/* 发送/重发邮件 */}
            {(quotation.status === 'draft' || quotation.status === 'sent') && (
              <Button
                variant="outline"
                onClick={() => setShowSendDialog(true)}
                className="h-auto py-4 flex flex-col items-start gap-2"
              >
                <div className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  <span className="font-semibold">
                    {quotation.status === 'draft' ? t("quotations.actions.sendEmail") : t("quotations.actions.resend")}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground text-left">通过邮件将 PDF 报价单发送给客户</span>
              </Button>
            )}

            {/* 生成 PDF 文件 */}
            <GenerateQuoFileButton
              quotation={quotation}
              customer={quotation.expand?.customer}
              project={quotation.expand?.project}
              items={items}
              router={router}
            />

            {/* 状态管理 - 拒绝 */}
            {quotation.status === 'sent' && (
              <Button
                variant="outline"
                onClick={() => setShowStatusDialog('reject')}
                className="h-auto py-4 flex flex-col items-start gap-2 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-semibold">{t("quotations.actions.reject")}</span>
                </div>
                <span className="text-sm text-muted-foreground text-left">标记客户已拒绝此报价并记录原因</span>
              </Button>
            )}

            {/* 订单管理 */}
            {existingOrder ? (
              <Button
                variant="outline"
                onClick={() => router.push(`/orders/${existingOrder.id}?project=${projectIdFromUrl}`)}
                className="h-auto py-4 flex flex-col items-start gap-2"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  <span className="font-semibold">{t("quotations.actions.viewOrder")}</span>
                </div>
                <span className="text-sm text-muted-foreground text-left">此报价单已转为订单：{existingOrder.code}</span>
              </Button>
            ) : (
              (quotation.status === 'accepted' || quotation.status === 'sent') && (
                <Button
                  onClick={() => router.push(`/orders/new?project=${projectIdFromUrl}&fromQuotation=${quotation.id}`)}
                  className="h-auto py-4 flex flex-col items-start gap-2"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold">{t("quotations.actions.createOrder") || "转订单"}</span>
                  </div>
                  <span className="text-sm text-muted-foreground text-left">客户确认报价后，将其转为正式销售订单</span>
                </Button>
              )
            )}

            {/* 修订版本 */}
            <Button
              variant="outline"
              onClick={handleRevise}
              className="h-auto py-4 flex flex-col items-start gap-2"
            >
              <div className="flex items-center gap-2">
                <Copy className="h-5 w-5" />
                <span className="font-semibold">{t("quotations.actions.revise")}</span>
              </div>
              <span className="text-sm text-muted-foreground text-left">基于当前版本创建新的修订版（提升版本号）</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">{t("quotations.tabs.info")}</TabsTrigger>
          <TabsTrigger value="items">{t("quotations.tabs.items")}</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("quotations.info.basic")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("quotations.columns.project")}:</span>
                  <span>{getDisplayName(quotation.expand?.project)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("quotations.columns.customer")}:</span>
                  <span>{getDisplayName(quotation.expand?.customer)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("quotations.columns.version")}:</span>
                  <span>v{quotation.version}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("common.created")}:</span>
                  <span>{new Date(quotation.created).toLocaleDateString()}</span>
                </div>
                {quotation.sent_at && (
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("quotations.columns.sentAt")}:</span>
                    <span>{new Date(quotation.sent_at).toLocaleDateString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("quotations.info.terms")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-muted-foreground">{t("quotations.columns.incoterm")}:</span>
                  <span className="ml-2 font-mono">{quotation.incoterm}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("quotations.placeholders.portOfLoading")}:</span>
                  <span className="ml-2">{quotation.port_of_loading || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("quotations.placeholders.portOfDestination")}:</span>
                  <span className="ml-2">{quotation.port_of_destination || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("quotations.placeholders.paymentTerms")}:</span>
                  <span className="ml-2">{quotation.payment_terms || "-"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("quotations.columns.currency")}:</span>
                  <span className="ml-2 font-mono">{quotation.currency}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("quotations.columns.validityDays")}:</span>
                  <span className="ml-2">{quotation.validity_days} {locale === 'zh' ? '天' : 'days'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown Card */}
            {quotation.cost_breakdown && Object.keys(quotation.cost_breakdown).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("quotations.costBreakdown.title")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(quotation.cost_breakdown as Record<string, number>).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t(`quotations.costBreakdown.${key.replace(/_/g, '')}`) || key.replace(/_/g, ' ')}:
                      </span>
                      <span>{formatCurrency(value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t font-medium">
                    <span>{t("quotations.costBreakdown.total")}:</span>
                    <span>{formatCurrency(Object.values(quotation.cost_breakdown as Record<string, number>).reduce((sum, v) => sum + v, 0))}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("quotations.items.title")}</CardTitle>
                <CardDescription>{t("quotations.items.description")}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">{t("quotations.items.empty")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("quotations.items.product")}</TableHead>
                      <TableHead className="text-right">{t("quotations.items.quantity")}</TableHead>
                      <TableHead className="text-right">{t("quotations.items.costPrice")} (CNY)</TableHead>
                      <TableHead className="text-right">{t("quotations.items.profitMargin")} (%)</TableHead>
                      <TableHead className="text-right">{t("quotations.items.unitPrice")} ({quotation.currency})</TableHead>
                      <TableHead className="text-right">{t("quotations.items.amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{getDisplayName(item.expand?.product)}</div>
                            <div className="text-sm text-muted-foreground">{item.expand?.product?.code}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {item.cost_price ? formatCostCurrency(item.cost_price) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.profit_margin != null ? `${item.profit_margin.toFixed(1)}%` : '-'}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={5} className="text-right font-medium">
                        {t("quotations.costs.itemsSubtotal")}
                      </TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(itemsSubtotal)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Send Email Dialog */}
      <SendQuotationDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        quotation={quotation}
        items={items}

        onSuccess={loadData}
      />

      {/* Add Item Dialog */}
      <QuotationItemDialog
        open={showAddItemDialog}
        onOpenChange={setShowAddItemDialog}
        onAdd={handleAddItems}
        projectId={quotation.project}
        excludeProductIds={items.map(item => item.product)}
        defaultProfitMargin={quotation.global_profit_margin || 20}
      />

      {/* Status Confirm Dialog */}
      <StatusConfirmDialog
        open={showStatusDialog !== null}
        onOpenChange={(open) => !open && setShowStatusDialog(null)}
        type={showStatusDialog || 'accept'}
        onConfirm={(reason) => handleStatusChange(showStatusDialog === 'accept' ? 'accepted' : 'rejected', reason)}
        loading={statusLoading}
      />
    </div>
  )
}
