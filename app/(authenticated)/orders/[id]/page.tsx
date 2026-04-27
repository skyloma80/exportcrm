"use client"

/**
 * Order Management Page (V2) - Function Entry Point
 * 订单管理页面（功能入口）
 * 
 * Requirements: 需求1.1-1.7, 需求3.1-3.7, 需求7.1-7.2
 */

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { getPocketBase } from "@/lib/pocketbase/auth"
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
} from "lucide-react"
import type { OrderWithExpand, OrderStatus } from "@/lib/pocketbase/services/orders"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useProjectContext } from "@/hooks/use-project-context"
import { usePdfGenerator } from "@/hooks/use-pdf-generator"
import { InvoicePDF, type InvoicePDFData } from "@/lib/pdf/invoice-template"
import { ensureFolderExists, navigateToDisk } from "@/lib/disk/ensure-folder"
import { brandingService } from "@/lib/services/branding-service"
import { format } from "date-fns"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function OrderManagementPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumbItems } = useBreadcrumb()
  const { uploadPdfToDisk } = usePdfGenerator()

  // Get project context
  const projectIdFromUrl = searchParams.get("project")

  // Project context is optional for independent orders
  // if (!projectIdFromUrl) {
  //   notFound()
  // }

  // Use project context hook to get return URL
  const { returnUrl } = useProjectContext({
    documentType: 'order'
  })

  const [order, setOrder] = useState<OrderWithExpand | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [generatingPI, setGeneratingPI] = useState(false)
  const [showManualStatusDialog, setShowManualStatusDialog] = useState(false)
  const [newStatus, setNewStatus] = useState<OrderStatus>('draft')
  const [statusChangeReason, setStatusChangeReason] = useState('')
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  // Set breadcrumb
  useEffect(() => {
    if (order) {
      setBreadcrumbItems([
        {
          label: order.code,
          href: `/orders/${order.id}?project=${projectIdFromUrl}`
        },
      ])
    }
    return () => setBreadcrumbItems([])
  }, [order, setBreadcrumbItems])

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const pb = getPocketBase()
      const result = await pb.collection("orders").getOne<OrderWithExpand>(id, {
        expand: "project,customer,created_by,order_items_via_order,order_items_via_order.product,shipments_via_order,order_purchase_orders_via_order,order_payments_via_order",
      })
      setOrder(result)
    } catch (err: any) {
      console.error("Error loading order:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status: OrderStatus) => {
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

  const getDisplayName = (item?: { name: string; name_cn?: string }) => {
    if (!item) return "-"
    return locale === 'zh' && item.name_cn ? item.name_cn : item.name
  }

  const handleManualStatusUpdate = async () => {
    if (!order) return;

    try {
      const { orderService } = await import('@/lib/pocketbase/services/orders');

      // Update status directly using the service
      const updatedOrder = await orderService.update(order.id, {
        status: newStatus,
        // Optionally, we could add a field to track manual status changes
        // This would require adding a field to the schema
      });

      // Reload the order to reflect changes with all related data
      const pb = getPocketBase();
      const updatedOrderWithExpand = await pb.collection("orders").getOne<OrderWithExpand>(order.id, {
        expand: "project,customer,created_by,order_items_via_order,order_items_via_order.product,shipments_via_order,order_purchase_orders_via_order,order_payments_via_order",
      });
      setOrder(updatedOrderWithExpand);

      toast({
        title: t('orders.statusUpdateSuccess'),
        description: t('orders.statusUpdateSuccessDesc'),
      });

      setShowManualStatusDialog(false);
      setNewStatus(order.status); // Reset to current status
      setStatusChangeReason(''); // Clear reason
    } catch (error: any) {
      console.error('Manual status update error:', error);
      toast({
        title: t('orders.statusUpdateError'),
        description: error.message || t('orders.statusUpdateErrorDesc'),
        variant: 'destructive',
      });
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

  const canDeleteOrder = (): boolean => {
    if (!order) return false; // If order hasn't loaded yet, don't show button
    if (order.status !== 'draft') {
      console.log('Order status is not draft:', order.status);
      return false;
    }
    if (!order.expand?.created_by) {
      console.log('Order has no created_by info');
      return false;
    }

    // Check if current user is the creator
    const pb = getPocketBase();
    const isCreator = pb.authStore.model?.id === order.expand.created_by.id;
    if (!isCreator) {
      console.log('Current user is not the creator');
      return false;
    }

    // Check if order has any related records that would prevent deletion
    // Check for shipments associated with this order
    const hasShipments = order.expand?.shipments_via_order && Array.isArray(order.expand.shipments_via_order) && order.expand.shipments_via_order.length > 0;
    if (hasShipments) {
      console.log('Order has shipments, cannot delete');
      return false;
    }

    // Check for purchase orders associated with this order
    const hasPurchaseOrders = order.expand?.order_purchase_orders_via_order && Array.isArray(order.expand.order_purchase_orders_via_order) && order.expand.order_purchase_orders_via_order.length > 0;
    if (hasPurchaseOrders) {
      console.log('Order has purchase orders, cannot delete');
      return false;
    }

    // Check for payments associated with this order
    const hasPayments = order.expand?.order_payments_via_order && Array.isArray(order.expand.order_payments_via_order) && order.expand.order_payments_via_order.length > 0;
    if (hasPayments) {
      console.log('Order has payments, cannot delete');
      return false;
    }

    console.log('All conditions met, can delete order');
    return true;
  }

  const handleGeneratePI = async () => {
    if (!order) return

    setGeneratingPI(true)
    try {
      // Direct download from API
      const response = await fetch(`/api/orders/${order.id}/export-pi`);
      
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
              <Button variant="outline" onClick={() => router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=orders`)} className="mt-4">
                {t("common.back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{order.code}</h1>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(order.status)}>
                  {t(`orders.status.${order.status}`)}
                </Badge>
                {/* Manual status update button for admin/creator - placed next to status badge */}
                {(() => {
                  const pb = getPocketBase();
                  return (pb.authStore.model?.role === 'admin' || pb.authStore.model?.id === order.expand?.created_by?.id) ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowManualStatusDialog(true)}
                      className="border border-blue-500 hover:bg-blue-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      {t('orders.manualStatusUpdate')}
                    </Button>
                  ) : null;
                })()}
              </div>
            </div>
            <p className="text-muted-foreground mt-1">
              {getDisplayName(order.expand?.project)} • {getDisplayName(order.expand?.customer)}
            </p>
            {order.expand?.created_by && (
              <p className="text-sm text-muted-foreground">
                {t('orders.createdBy')} {order.expand.created_by.name || order.expand.created_by.email}
              </p>
            )}
          </div>
          {/* Delete button for draft orders by creator */}
          {canDeleteOrder() && (
            <Button
              variant="destructive"
              onClick={() => {
                setShowDeleteConfirmation(true);
              }}
            >
              {t('common.delete')}
            </Button>
          )}


          {/* Delete Confirmation Dialog */}
          {showDeleteConfirmation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-96">
                <h3 className="text-lg font-semibold mb-2">{t('orders.deleteConfirmTitle')}</h3>
                <p className="text-gray-600 mb-6">{t('orders.deleteConfirmMessage')}</p>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirmation(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      try {
                        const { orderService } = await import('@/lib/pocketbase/services/orders');
                        await orderService.deleteOrder(order.id);
                        toast({
                          title: t('orders.deleteSuccess') || t('orders.createSuccess'),
                          description: t('orders.deleteSuccessDesc') || t('orders.createSuccessDesc'),
                        });
                        router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=orders`);
                      } catch (error: any) {
                        toast({
                          title: t('orders.deleteError'),
                          description: error.message || t('orders.deleteError'),
                          variant: 'destructive',
                        });
                      } finally {
                        setShowDeleteConfirmation(false);
                      }
                    }}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Manual Status Update Dialog */}
          {showManualStatusDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg w-96">
                <h3 className="text-lg font-semibold mb-4">{t('orders.manualStatusUpdate')}</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    {t('orders.currentStatus')}
                  </label>
                  <p className="p-2 bg-gray-100 rounded">{t(`orders.status.${order.status}`)}</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    {t('orders.newStatus')}
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="draft">{t('orders.status.draft')}</option>
                    <option value="confirmed">{t('orders.status.confirmed')}</option>
                    <option value="in_production">{t('orders.status.in_production')}</option>
                    <option value="ready_to_ship">{t('orders.status.ready_to_ship')}</option>
                    <option value="shipped">{t('orders.status.shipped')}</option>
                    <option value="delivered">{t('orders.status.delivered')}</option>
                    <option value="completed">{t('orders.status.completed')}</option>
                    <option value="cancelled">{t('orders.status.cancelled')}</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    {t('orders.reasonForChange')}
                  </label>
                  <input
                    type="text"
                    value={statusChangeReason}
                    onChange={(e) => setStatusChangeReason(e.target.value)}
                    className="w-full p-2 border rounded"
                    placeholder={t('orders.reasonPlaceholder')}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowManualStatusDialog(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={handleManualStatusUpdate}
                  >
                    {t('common.update')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('orders.management.orderSummary')}</CardTitle>
          <CardDescription>{t('orders.management.orderSummaryDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('orders.columns.totalAmount')}</p>
              <p className="text-lg font-semibold">{formatCurrency(order.total_amount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('orders.columns.currency')}</p>
              <p className="text-lg font-semibold">{order.currency}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('orders.columns.incoterm')}</p>
              <p className="text-lg font-semibold">{order.incoterm || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('orders.columns.expectedDelivery')}</p>
              <p className="text-lg font-semibold">{formatDate(order.estimated_shipping_date)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>{t('orders.management.actions')}</CardTitle>
          <CardDescription>{t('orders.management.actionsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Upload Customer PO */}
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={async () => {
                // Create hidden file input
                const fileInput = document.createElement('input')
                fileInput.type = 'file'
                fileInput.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png'
                fileInput.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (!file) return

                  try {
                    const customer = order.expand?.customer
                    const project = order.expand?.project
                    if (!customer || !project) {
                      toast({
                        title: t('common.error'),
                        description: 'Missing customer or project information',
                        variant: 'destructive',
                      })
                      return
                    }

                    // Build folder path: Customers/{客户名}/{项目名}/orders/{订单号}/CustomerPO/
                    const folderPath = `Customers/${customer.name}/${project.name}/orders/${order.code}/CustomerPO`
                    
                    // Create form data
                    const formData = new FormData()
                    formData.append('file', file)
                    formData.append('path', `${folderPath}/${file.name}`)

                    // Upload file
                    const response = await fetch('/api/disk/upload', {
                      method: 'POST',
                      body: formData,
                    })

                    if (!response.ok) {
                      const error = await response.json()
                      throw new Error(error.error || 'Upload failed')
                    }

                    toast({
                      title: t('orders.management.customerPOUploadSuccess'),
                      description: t('orders.management.customerPOUploadSuccessDesc'),
                    })

                    // Navigate to the CustomerPO directory
                    await navigateToDisk(folderPath, router)
                  } catch (error: any) {
                    console.error('Upload customer PO error:', error)
                    toast({
                      title: t('orders.management.customerPOUploadError'),
                      description: error.message,
                      variant: 'destructive',
                    })
                  }
                }
                fileInput.click()
              }}
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                <span className="font-semibold">{t('orders.management.uploadCustomerPO')}</span>
              </div>
              <span className="text-sm text-muted-foreground text-left">
                {t('orders.management.uploadCustomerPODesc')}
              </span>
            </Button>

            {/* Edit Order */}
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={() => router.push(`/orders/${id}/edit?project=${projectIdFromUrl}`)}
            >
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                <span className="font-semibold">{t('orders.management.editOrder')}</span>
              </div>
              <span className="text-sm text-muted-foreground text-left">
                {t('orders.management.editOrderDesc')}
              </span>
            </Button>

            {/* Generate PI */}
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={handleGeneratePI}
              disabled={generatingPI}
            >
              <div className="flex items-center gap-2">
                {generatingPI ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileDown className="h-5 w-5" />
                )}
                <span className="font-semibold">{t('orders.management.generatePI')}</span>
              </div>
              <span className="text-sm text-muted-foreground text-left">
                {t('orders.management.generatePIDesc')}
              </span>
            </Button>

            {/* Send Email */}
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={() => router.push(`/orders/${id}/send-email?project=${projectIdFromUrl}`)}
            >
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <span className="font-semibold">{t('orders.management.sendEmail')}</span>
              </div>
              <span className="text-sm text-muted-foreground text-left">
                {t('orders.management.sendEmailDesc')}
              </span>
            </Button>

            {/* Payment Management */}
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={() => router.push(`/orders/${id}/payments?project=${projectIdFromUrl}`)}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                <span className="font-semibold">{t('orders.management.viewPayments')}</span>
              </div>
              <span className="text-sm text-muted-foreground text-left">
                {t('orders.management.viewPaymentsDesc')}
              </span>
            </Button>

            {/* View Purchase Orders */}
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={() => router.push(`/orders/${id}/purchase-orders?project=${projectIdFromUrl}`)}
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span className="font-semibold">{t('orders.management.viewPurchaseOrders')}</span>
              </div>
              <span className="text-sm text-muted-foreground text-left">
                {t('orders.management.viewPurchaseOrdersDesc')}
              </span>
            </Button>

            {/* View Shipments */}
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={() => router.push(`/orders/${id}/shipments?project=${projectIdFromUrl}`)}
            >
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                <span className="font-semibold">{t('orders.management.viewShipments')}</span>
              </div>
              <span className="text-sm text-muted-foreground text-left">
                {t('orders.management.viewShipmentsDesc')}
              </span>
            </Button>

            {/* View Documents */}
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start gap-2"
              onClick={async () => {
                const customer = order.expand?.customer
                const project = order.expand?.project
                if (customer && project) {
                  const path = `Customers/${customer.name}/${project.name}/orders/${order.code}`
                  await navigateToDisk(path, router)
                }
              }}
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                <span className="font-semibold">{t('orders.management.viewDocuments')}</span>
              </div>
              <span className="text-sm text-muted-foreground text-left">
                {t('orders.management.viewDocumentsDesc')}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
