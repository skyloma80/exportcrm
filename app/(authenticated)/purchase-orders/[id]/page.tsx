"use client"

/**
 * Purchase Order Detail Page
 * 采购订单详情页
 * 
 * Requirements: 1.4, 2.1
 */

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { notFound } from "next/navigation"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useTabState } from "@/hooks/use-tab-state"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Edit,
  ShoppingBag,
  Package,
  Building2,
  Loader2,
  Calendar,
  CreditCard,
  Wrench,
  Plus,
  Eye,
  Send,
  FileDown,
} from "lucide-react"
import {
  purchaseOrderService,
  PurchaseOrderWithExpand,
  POStatus
} from "@/lib/pocketbase/services/purchase-orders"
import {
  usePurchaseOrderItems,
  usePurchaseOrderPayments
} from "@/hooks/collections/purchase-orders"
import { useToast } from "@/hooks/use-toast"
import {
  PaymentFormDialog,

  PurchaseOrderPdfButton,
  SendPOEmailDialog
} from "@/components/purchase-orders"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
// Payment type with voucher_file
interface PaymentWithFile {
  id: string
  purchase_order: string
  type: string
  amount: number
  currency: string
  payment_method?: string
  payment_date: string
  bank_reference?: string
  voucher_file?: string
}

export default function PurchaseOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()
  const poId = params.id as string
  const [activeTab, setActiveTab] = useTabState("info")

  // 简单的返回路径
  const returnUrl = `/purchase-orders`

  const [po, setPo] = useState<PurchaseOrderWithExpand | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)

  const { items, loading: itemsLoading } = usePurchaseOrderItems(poId)
  const { payments, loading: paymentsLoading, refetch: refetchPayments } = usePurchaseOrderPayments(poId)

  // 采购订单面包屑：采购单列表 > 采购单
  useEffect(() => {
    if (po) {
      const items: any[] = [
        {
          label: t("nav.purchaseOrders") || "Purchase Orders",
          href: "/purchase-orders",
        },
      ]

      // 如果有关联订单，添加订单面包屑
      if (po.expand?.order) {
        items.push({
          label: po.expand.order.code,
          href: `/orders/${po.expand.order.id}`,
        })
      }

      // 添加当前采购单
      items.push({
        label: po.po_number || po.code,
      })

      setBreadcrumb(items)
    }
    return () => setBreadcrumb([])
  }, [po, setBreadcrumb, t])

  useEffect(() => {
    loadPurchaseOrder()
  }, [poId])

  const loadPurchaseOrder = async () => {
    setLoading(true)
    try {
      const data = await purchaseOrderService.getWithDetails(poId)
      setPo(data)
    } catch (error) {
      console.error("Error loading purchase order:", error)
      toast({
        title: t("common.error"),
        description: String(error),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: POStatus) => {
    const colors: Record<POStatus, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      in_production: "bg-yellow-100 text-yellow-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-indigo-100 text-indigo-800",
      completed: "bg-emerald-100 text-emerald-800",
      cancelled: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const getDisplayName = (item?: { name?: string; name_cn?: string }) => {
    if (!item) return "-"
    if (locale === "zh" && item.name_cn) return item.name_cn
    return item.name || "-"
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getPaymentProgress = () => {
    if (!po?.total_amount) return 0
    return Math.round(((po.paid_amount || 0) / po.total_amount) * 100)
  }

  const getMoldTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      die_casting: locale === 'zh' ? '压铸模' : 'Die Casting',
      stamping: locale === 'zh' ? '冲压模' : 'Stamping',
      injection: locale === 'zh' ? '注塑模' : 'Injection',
      cnc_fixture: locale === 'zh' ? 'CNC夹具' : 'CNC Fixture',
      forging: locale === 'zh' ? '锻造模' : 'Forging',
      extrusion: locale === 'zh' ? '挤压模' : 'Extrusion',
    }
    return labels[type] || type
  }

  const getPaymentTypeLabel = (type: string) => {
    return t(`purchaseOrders.paymentType.${type}`) || type
  }

  const openReceiptFile = async (payment: PaymentWithFile) => {
    if (!payment.voucher_file) return

    // 打开文件
    const fullPath = `Customers/${payment.voucher_file}`
    const url = `/api/disk/image?path=${encodeURIComponent(fullPath)}`
    window.open(url, '_blank')
  }

  const handleGenerateExcel = async () => {
    if (!po) return

    setLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/${po.id}/export-po`)
      if (!response.ok) throw new Error('Failed to generate PO Excel')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `PO-${po.code}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: locale === 'zh' ? '生成成功' : 'Generated Successfully',
        description: locale === 'zh' ? '采购订单 Excel 已下载' : 'Purchase Order Excel has been downloaded',
      })
    } catch (error: any) {
      console.error('Generate PO error:', error)
      toast({
        title: locale === 'zh' ? '生成失败' : 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals
  const itemsSubtotal = items.reduce((sum, item) => sum + item.amount, 0)
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!po) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-semibold mb-2">{t("purchaseOrders.notFound")}</h2>
          <Button onClick={() => router.push(returnUrl)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Button>
        </div>
      </div>
    )
  }



  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold font-mono">{po.code}</h1>
                <Badge variant="outline" className={getStatusColor(po.status)}>
                  {t(`purchaseOrders.status.${po.status}`)}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1">
                {po.expand?.supplier ? getDisplayName(po.expand.supplier) : "-"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <PurchaseOrderPdfButton
              purchaseOrder={po}
              items={items}

            />
            <Button variant="outline" onClick={handleGenerateExcel} disabled={loading}>
              <FileDown className="mr-2 h-4 w-4" />
              {locale === 'zh' ? '导出 Excel' : 'Export Excel'}
            </Button>
            <Button variant="outline" onClick={() => setEmailDialogOpen(true)}>
              <Send className="mr-2 h-4 w-4" />
              {locale === 'zh' ? '发送邮件' : 'Send Email'}
            </Button>
            <Button variant="outline" onClick={() => router.push(`/purchase-orders/${po.id}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              {t("common.edit")}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("purchaseOrders.costs.totalAmount")}</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(po.total_amount, po.currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("purchaseOrders.costs.paidAmount")}</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {formatCurrency(po.paid_amount || 0, po.currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("purchaseOrders.costs.remainingAmount")}</CardDescription>
            <CardTitle className="text-2xl text-orange-600">
              {formatCurrency(po.total_amount - (po.paid_amount || 0), po.currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("purchaseOrders.costs.paymentProgress")}</CardDescription>
            <div className="space-y-2">
              <CardTitle className="text-2xl">{getPaymentProgress()}%</CardTitle>
              <Progress value={getPaymentProgress()} className="h-2" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">{t("purchaseOrders.tabs.info")}</TabsTrigger>
          <TabsTrigger value="items">{t("purchaseOrders.tabs.items")}</TabsTrigger>
          <TabsTrigger value="payments">{t("purchaseOrders.tabs.payments")}</TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  {t("purchaseOrders.info.basic")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("purchaseOrders.columns.code")}</p>
                    <p className="font-medium font-mono">{po.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("purchaseOrders.columns.status")}</p>
                    <Badge variant="outline" className={getStatusColor(po.status)}>
                      {t(`purchaseOrders.status.${po.status}`)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("purchaseOrders.columns.currency")}</p>
                    <p className="font-medium">{po.currency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("purchaseOrders.columns.expectedDelivery")}</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {po.expected_delivery_date
                        ? new Date(po.expected_delivery_date).toLocaleDateString()
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("common.created")}</p>
                    <p className="font-medium">{new Date(po.created).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("common.updated")}</p>
                    <p className="font-medium">{new Date(po.updated).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supplier & Project Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t("purchaseOrders.columns.supplier")} & {t("purchaseOrders.columns.project")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Supplier */}
                <div>
                  <p className="text-sm text-muted-foreground">{t("purchaseOrders.columns.supplier")}</p>
                  {po.expand?.supplier ? (
                    <div>
                      <p className="font-medium">{getDisplayName(po.expand.supplier)}</p>
                      <p className="text-sm text-muted-foreground">{po.expand.supplier.code}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">-</p>
                  )}
                </div>

                {/* Related Order */}
                {po.expand?.order && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t("purchaseOrders.columns.order")}</p>
                    <p className="font-medium font-mono">{po.expand.order.code}</p>
                  </div>
                )}

                {/* Related RFQ */}
                {po.expand?.rfq && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t("purchaseOrders.columns.rfq")}</p>
                    <p className="font-medium font-mono">{po.expand.rfq.code}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t("purchaseOrders.items.title")}
              </CardTitle>
              <CardDescription>{t("purchaseOrders.items.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>{t("purchaseOrders.items.empty")}</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("purchaseOrders.items.product")}</TableHead>
                        <TableHead className="text-right">{t("purchaseOrders.items.quantity")}</TableHead>
                        <TableHead className="text-right">{t("purchaseOrders.items.unitPrice")}</TableHead>
                        <TableHead className="text-right">{t("purchaseOrders.items.amount")}</TableHead>
                        <TableHead className="text-right">{t("purchaseOrders.items.received")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {item.product_name || (item as any).expand?.product?.name || "-"}
                              </p>
                              <p className="text-sm text-muted-foreground font-mono">
                                {item.product_code || (item as any).expand?.product?.code}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_price, po.currency)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.amount, po.currency)}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.received_quantity || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex justify-end">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{t("purchaseOrders.costs.itemsSubtotal")}</p>
                      <p className="text-xl font-bold">{formatCurrency(itemsSubtotal, po.currency)}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {t("purchaseOrders.payments.title")}
                  </CardTitle>
                  <CardDescription>{t("purchaseOrders.payments.description")}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPaymentDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("purchaseOrders.payments.add")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>{t("purchaseOrders.payments.empty")}</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("purchaseOrders.payments.date")}</TableHead>
                        <TableHead>{t("purchaseOrders.payments.type")}</TableHead>
                        <TableHead>{t("purchaseOrders.payments.method")}</TableHead>
                        <TableHead className="text-right">{t("purchaseOrders.payments.amount")}</TableHead>
                        <TableHead>{t("purchaseOrders.payments.reference")}</TableHead>
                        <TableHead>{locale === 'zh' ? '凭证' : 'Receipt'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getPaymentTypeLabel(payment.type)}
                            </Badge>
                          </TableCell>
                          <TableCell>{payment.payment_method || "-"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {payment.bank_reference || "-"}
                          </TableCell>
                          <TableCell>
                            {(payment as PaymentWithFile).voucher_file ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openReceiptFile(payment as PaymentWithFile)}
                                title={locale === 'zh' ? '查看凭证' : 'View receipt'}
                              >
                                <Eye className="h-4 w-4 text-blue-500" />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex justify-end">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{t("purchaseOrders.costs.totalPaid")}</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid, po.currency)}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <PaymentFormDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        purchaseOrderId={poId}
        defaultCurrency={po.currency}
        onSuccess={() => {
          refetchPayments()
          loadPurchaseOrder()
        }}
      />


      {/* Send Email Dialog */}
      <SendPOEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        purchaseOrder={po}
        items={items}

        onSuccess={() => loadPurchaseOrder()}
      />
    </div>
  )
}
