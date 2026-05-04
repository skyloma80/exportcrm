"use client"

/**
 * Order Management Page (Professional)
 * 销售订单详情页（专业版）
 * 
 * Requirements: 1.1-1.7, 3.1-3.7, 7.1-7.2
 */

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import {
  Edit,
  Mail,
  Loader2,
  FileDown,
  FolderOpen,
  Truck,
  ShoppingCart,
  DollarSign,
  RefreshCw,
  ChevronLeft,
  Package,
  Building2,
  Ship,
  Copy,
} from "lucide-react"
import { soService, type FlatSO, type SOStatus } from "@/lib/pocketbase/services/so"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useProjectContext } from "@/hooks/use-project-context"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function OrderDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumbItems } = useBreadcrumb()

  const [order, setOrder] = useState<FlatSO | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [generatingPI, setGeneratingPI] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [copying, setCopying] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  // Set breadcrumb
  useEffect(() => {
    if (order) {
      setBreadcrumbItems([
        { label: t("nav.orders"), href: "/orders" },
        {
          label: order.code || t("orders.detail"),
          href: `/orders/${order.id}`
        },
      ])
    }
    return () => setBreadcrumbItems([])
  }, [order, setBreadcrumbItems, t])

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await soService.getOne(id, {
        expand: "project_id,customer_id,created_by",
      })
      setOrder(result)
    } catch (err: any) {
      console.error("Error loading order:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status: SOStatus) => {
    switch (status) {
      case 'completed': return 'default'
      case 'cancelled': return 'destructive'
      case 'confirmed':
      case 'in_production': return 'secondary'
      case 'shipped':
      case 'delivered': return 'outline'
      default: return 'outline'
    }
  }

  const handleStatusChange = async (newStatus: SOStatus) => {
    if (!order || newStatus === order.status) return
    
    setStatusLoading(true)
    try {
      await soService.update(order.id, {
        status: newStatus,
      })

      toast({
        title: t('orders.statusUpdateSuccess'),
        description: t('orders.statusUpdateSuccessDesc'),
      })

      loadData()
    } catch (error: any) {
      console.error('Status update error:', error)
      toast({
        title: t('orders.statusUpdateError'),
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setStatusLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency?: string) => {
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: currency || order?.currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return '-'
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
      if (isNaN(date.getTime())) return '-'
      return format(date, 'yyyy-MM-dd')
    } catch {
      return '-'
    }
  }

  const handleCopy = async () => {
    if (!order) return
    setCopying(true)
    try {
      const response = await fetch(`/api/orders/${order.id}/copy`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to copy')
      }
      toast({
        title: t('common.success'),
        description: `Copied to ${data.order.code}`,
      })
      router.push(`/orders/${data.order.id}`)
    } catch (error: any) {
      console.error('Copy error:', error)
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setCopying(false)
    }
  }

  const handleGeneratePI = async () => {
    if (!order) return

    setGeneratingPI(true)
    try {
      const response = await fetch(`/api/so/${order.id}/export-pi`);

      if (!response.ok) {
        throw new Error('Failed to generate PI Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = format(new Date(), 'yyyy-MM-dd');
      a.download = `PI-${order.code}-${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t('orders.management.piGenerateSuccess'),
        description: locale === 'zh' ? 'PI Excel 已成功生成并下载' : 'PI Excel has been generated and downloaded',
      })
    } catch (error: any) {
      console.error('Generate PI error:', error)
      toast({
        title: t('orders.management.piGenerateError'),
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setGeneratingPI(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">{t("orders.notFound")}</h2>
              <Button variant="outline" onClick={() => router.push("/orders")} className="mt-4">
                {t("common.back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/orders")}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold">{order.code}</h1>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(order.status as SOStatus)}>
                {t(`orders.status.${order.status}`) || order.status}
              </Badge>
              <Select
                value={order.status}
                onValueChange={(value) => handleStatusChange(value as SOStatus)}
                disabled={statusLoading}
              >
                <SelectTrigger className="h-8 w-auto border-blue-500 hover:bg-blue-50">
                  <RefreshCw className={`h-4 w-4 mr-1 ${statusLoading ? 'animate-spin' : ''}`} />
                  <span className="text-xs">{t('orders.manualStatusUpdate')}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('orders.status.draft')}</SelectItem>
                  <SelectItem value="confirmed">{t('orders.status.confirmed')}</SelectItem>
                  <SelectItem value="in_production">{t('orders.status.in_production')}</SelectItem>
                  <SelectItem value="ready_to_ship">{t('orders.status.ready_to_ship')}</SelectItem>
                  <SelectItem value="shipped">{t('orders.status.shipped')}</SelectItem>
                  <SelectItem value="delivered">{t('orders.status.delivered')}</SelectItem>
                  <SelectItem value="completed">{t('orders.status.completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('orders.status.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('orders.columns.totalAmount')}</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(order.total_amount)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Ship className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('orders.columns.incoterm')}</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{order.incoterm || '-'}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Truck className="w-4 h-4 text-orange-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('orders.columns.expectedDelivery')}</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{formatDate(order.expected_delivery_date)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <RefreshCw className="w-4 h-4 text-purple-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider">{t('orders.columns.status')}</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{t(`orders.status.${order.status}`) || order.status}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                {t("orders.listTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] pl-6">{t("orders.columns.partNo")}</TableHead>
                    <TableHead>{t("orders.columns.description")}</TableHead>
                    <TableHead className="text-right w-[100px]">{t("orders.columns.quantity")}</TableHead>
                    <TableHead className="text-right w-[120px]">{t("orders.columns.unitPrice")}</TableHead>
                    <TableHead className="text-right pr-6 w-[120px]">{t("orders.columns.totalAmount")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="pl-6 font-mono text-xs">{item.part_number}</TableCell>
                      <TableCell>
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{item.description_en}</div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right pr-6 font-bold">{formatCurrency(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Remarks & Bank Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


          </div>
        </div>

        {/* Sidebar Actions & Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">{t('orders.management.actions')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <Button onClick={handleGeneratePI} disabled={generatingPI} className="w-full justify-start">
                {generatingPI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                {t('orders.management.generatePI')}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => router.push(`/orders/${order.id}/send-email`)}>
                <Mail className="mr-2 h-4 w-4" />
                {t('orders.management.sendEmail')}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => router.push(`/orders/${order.id}/documents`)}>
                <FolderOpen className="mr-2 h-4 w-4" />
                {t('orders.management.viewDocuments')}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => router.push(`/orders/${order.id}/payments`)}>
                <DollarSign className="mr-2 h-4 w-4" />
                {t('orders.management.viewPayments')}
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => router.push(`/orders/${order.id}/shipments`)}>
                <Truck className="mr-2 h-4 w-4" />
                {t('orders.management.viewShipments')}
              </Button>
              <div className="border-t pt-2 mt-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => router.push(`/orders/${order.id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t("common.edit")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleCopy}
                  disabled={copying}
                >
                  {copying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />}
                  {t('common.copy')}
                </Button>
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  onClick={() => setShowDeleteConfirmation(true)}
                  disabled={order.status !== 'draft'}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </CardContent>
          </Card>


        </div>
      </div>


      {/* Delete Confirmation */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 shadow-xl border">
            <h3 className="text-lg font-semibold mb-2">{locale === 'zh' ? '确定删除？' : 'Confirm Delete?'}</h3>
            <p className="text-sm text-gray-500 mb-6">{locale === 'zh' ? '删除后无法恢复。' : 'This action cannot be undone.'}</p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDeleteConfirmation(false)}>{t('common.cancel')}</Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    await soService.delete(order.id);
                    toast({ title: t('common.success') });
                    router.push("/orders");
                  } catch (e: any) {
                    toast({ title: t('common.error'), description: e.message, variant: 'destructive' });
                  }
                }}
              >
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
