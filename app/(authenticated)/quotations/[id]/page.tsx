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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Package,
  RefreshCw,
} from "lucide-react"
import { SendQuotationDialog } from "@/components/quotations/send-quotation-dialog"
import { QuotationItemDialog } from "@/components/quotations/quotation-item-dialog"
import { StatusConfirmDialog } from "@/components/quotations/status-confirm-dialog"
import { GenerateQuoFileButton } from "@/components/quotations/generate-quo-file-button"
import {
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
  const [convertingToOrder, setConvertingToOrder] = useState(false)

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
        expand: "project,customer",
      })
      setQuotation(result)
      // Get items from JSONB field
      setItems((result.items || []) as any)

      // Check if quotation has already been converted to an order
      const orders = await pb.collection("so").getList<{ id: string; code: string }>(1, 1, {
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

  // Quotation status options for manual update
  const statusOptions: { value: QuotationStatus; label: string }[] = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'revised', label: 'Revised' },
    { value: 'expired', label: 'Expired' },
  ]

  const pb = getPocketBase()

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

  // 报价转订单
  const handleConvertToOrder = async () => {
    if (!quotation) return
    setConvertingToOrder(true)
    try {
      const response = await fetch(`/api/quotations/${quotation.id}/convert-to-order`, {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to convert to order')
      }
      const result = await response.json()
      toast({
        title: t("quotations.convertToOrderSuccess"),
      })
      if (result.order) {
        router.push(`/orders/${result.order.id}?project=${projectIdFromUrl}`)
      }
    } catch (err: any) {
      console.error("Convert to order error:", err)
      toast({
        title: t("quotations.convertToOrderError"),
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setConvertingToOrder(false)
    }
  }

  const handleAddItems = async (newItems: any[]) => {
    if (!quotation) return
    try {
      const pb = getPocketBase()
      const currentItems = (quotation.items || []) as any[]

      // 计算unit_price和amount
      const newItemData = newItems.map((item, index) => {
        const unitPrice = item.unit_price || item.cost_price * (1 + (item.profit_margin || 20) / 100)
        const amount = item.amount || unitPrice * item.quantity
        return {
          id: `item-${Date.now()}-${index}`,
          product_id: item.product_id,
          product_name: item.product_name,
          part_number: undefined,
          quantity: item.quantity,
          unit: 'PCS',
          unit_price: unitPrice,
          amount: amount,
          cost_price: item.cost_price,
          profit_margin: item.profit_margin,
        }
      })

      await pb.collection("quotations").update(quotation.id, {
        items: [...currentItems, ...newItemData],
        total_amount: (quotation.total_amount || 0) + newItemData.reduce((sum, i) => sum + (i.amount || 0), 0),
      })
      toast({
        title: t("quotations.items.addSuccess"),
      })
      loadData()
    } catch (err: any) {
      console.error("Add items error:", err)
      const errorMessage = err?.data?.message || err?.message || t("quotations.items.addError")
      toast({
        title: t("quotations.items.addError"),
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!quotation) return
    try {
      const pb = getPocketBase()
      const currentItems = (quotation.items || []) as any[]
      const updatedItems = currentItems.filter(item => item.id !== itemId)
      await pb.collection("quotations").update(quotation.id, {
        items: updatedItems,
      })
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
    const currentQuotation = await pb.collection("quotations").getOne(quotation.id)
    const allItems = (currentQuotation.items || []) as any[]
    const allMolds = await pb.collection("quotation_mold_items").getFullList<{ cost: number; charge_method: string }>({
      filter: `quotation = "${quotation.id}"`,
    })
    const itemsTotal = allItems.reduce((sum, item) => sum + (item.amount || 0), 0)
    const moldsTotal = allMolds.reduce((sum, mold) => {
      if (mold.charge_method === 'first_order_free') return sum
      return sum + mold.cost
    }, 0)
    // 包含 cost_breakdown
    const costBreakdownTotal = currentQuotation.cost_breakdown
      ? Object.values(currentQuotation.cost_breakdown as Record<string, number>).reduce((sum, v) => sum + (v || 0), 0)
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
<div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{quotation.code}</h1>
              <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(quotation.status)}>
                    {t(`quotations.status.${quotation.status}`)}
                  </Badge>
                  <Select
                    value={quotation.status}
                    onValueChange={async (value) => {
                      const newStatus = value as QuotationStatus
                      if (newStatus === quotation.status) return
                      
                      setStatusLoading(true)
                      try {
                        await pb.collection("quotations").update(quotation.id, {
                          status: newStatus,
                        })
                        toast({
                          title: t("quotations.statusUpdateSuccess"),
                          description: t("quotations.statusUpdateSuccessDesc"),
                        })
                        loadData()
                      } catch (error: any) {
                        console.error('Status update error:', error)
                        toast({
                          title: t("quotations.statusUpdateError"),
                          description: error.message,
                          variant: 'destructive',
                        })
                      } finally {
                        setStatusLoading(false)
                      }
                    }}
                    disabled={statusLoading}
                  >
                    <SelectTrigger className="h-8 w-auto border-blue-500 hover:bg-blue-50">
                      <RefreshCw className={`h-4 w-4 mr-1 ${statusLoading ? 'animate-spin' : ''}`} />
                      <span className="text-xs">{t('quotations.manualStatusUpdate')}</span>
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {t(`quotations.status.${option.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-muted-foreground">v{quotation.version}</span>
              </div>
            <p className="text-muted-foreground mt-1">
              {getDisplayName(quotation.expand?.project)} • {getDisplayName(quotation.expand?.customer)}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Amount</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(calculatedGrandTotal)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Items</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{items.length}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Incoterm</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{quotation.incoterm || '-'}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">Status</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{t(`quotations.status.${quotation.status}`)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Items Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                {t("quotations.items.title") || "Product Items"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] pl-6">Part No</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-[100px]">Qty</TableHead>
                    <TableHead className="text-right w-[100px]">Unit</TableHead>
                    <TableHead className="text-right w-[120px]">Unit Price</TableHead>
                    <TableHead className="text-right pr-6 w-[120px]">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(items || []).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-6 font-mono text-xs">{item.part_number || item.product_code || '-'}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.product_name || '-'}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{item.description_en || ''}</div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.unit || 'PCS'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right pr-6 font-bold">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {t("quotations.items.empty") || "No items"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">{t('quotations.actionsTitle') || 'Actions'}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {/* 编辑功能 */}
              {quotation.status === 'draft' && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/quotations/${id}/edit?project=${projectIdFromUrl}`)}
                  className="w-full justify-start"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {t("common.edit")}
                </Button>
              )}

              {/* 发送/重发邮件 */}
              {(quotation.status === 'draft' || quotation.status === 'sent') && (
                <Button
                  variant="outline"
                  onClick={() => setShowSendDialog(true)}
                  className="w-full justify-start"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {quotation.status === 'draft' ? t("quotations.actions.sendEmail") : t("quotations.actions.resend")}
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
                  className="w-full justify-start border-red-200 hover:bg-red-50 hover:text-red-700"
                >
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  {t("quotations.actions.reject")}
                </Button>
              )}

              {/* 订单管理 */}
              {existingOrder ? (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/orders/${existingOrder.id}?project=${projectIdFromUrl}`)}
                  className="w-full justify-start"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {t("quotations.actions.viewOrder")} ({existingOrder.code})
                </Button>
              ) : (
                (quotation.status === 'accepted' || quotation.status === 'sent') && (
                  <Button
                    variant="outline"
                    onClick={handleConvertToOrder}
                    disabled={convertingToOrder}
                    className="w-full justify-start"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {t("quotations.actions.createOrder") || "转订单"}
                  </Button>
                )
              )}

              {/* 修订版本 */}
              <Button
                variant="outline"
                onClick={handleRevise}
                className="w-full justify-start"
              >
                <Copy className="mr-2 h-4 w-4" />
                {t("quotations.actions.revise")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>



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
        excludeProductIds={items.map(item => (item as any).product_id || item.product)}
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
