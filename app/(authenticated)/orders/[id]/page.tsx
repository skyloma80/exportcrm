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

  // Enforce project context: return 404 if no project parameter
  if (!projectIdFromUrl) {
    notFound()
  }

  // Use project context hook to get return URL
  const { returnUrl } = useProjectContext({
    documentType: 'order'
  })

  const [order, setOrder] = useState<OrderWithExpand | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [generatingPI, setGeneratingPI] = useState(false)

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
        expand: "project,customer,order_items_via_order,order_items_via_order.product",
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

  const handleGeneratePI = async () => {
    if (!order) return

    setGeneratingPI(true)
    try {
      const customer = order.expand?.customer
      const project = order.expand?.project
      const orderItems = order.expand?.order_items_via_order || []

      // Load branding
      const branding = await brandingService.getDocumentBranding('customer')

      // Load primary contact
      const pb = getPocketBase()
      let primaryContact = null
      if (customer?.id) {
        const contactResult = await pb.collection('customer_contacts').getList(1, 1, {
          filter: `customer = "${customer.id}" && is_primary = true`,
        })
        if (contactResult.items.length > 0) {
          primaryContact = contactResult.items[0]
        }
      }

      // Load bank account - get default or first available
      let bankInfo = ''
      if (order.bank_info && typeof order.bank_info === 'string') {
        bankInfo = order.bank_info
      } else {
        // Query default bank account from database
        try {
          const defaultBank = await pb.collection('bank_accounts').getFirstListItem('is_default = true')
          bankInfo = defaultBank.content || ''
        } catch (e: any) {
          // If no default, get first available
          try {
            const firstBank = await pb.collection('bank_accounts').getList(1, 1)
            if (firstBank.items.length > 0) {
              bankInfo = firstBank.items[0].content || ''
            }
          } catch (err) {
            console.error('Failed to load bank account:', err)
          }
        }
      }

      // Prepare PDF data
      const itemsTotal = orderItems.reduce((sum, item) => {
        return sum + (item.amount || (item.quantity * item.unit_price) || 0)
      }, 0)

      const costBreakdown = order.cost_breakdown as Record<string, number> | undefined
      const costTotal = costBreakdown
        ? Object.values(costBreakdown).reduce((sum, val) => sum + (val || 0), 0)
        : 0

      const calculatedTotal = itemsTotal + costTotal

      // Convert order code to compact format A{YY}{XXXX}
      const convertToCompactCode = (code: string): string => {
        if (!code) return ''
        const match = code.match(/^(?:O|ORD)-(\d{4})-(\d+)$/)
        if (match) {
          const year = match[1].slice(-2)
          const seq = parseInt(match[2], 10).toString().padStart(4, '0')
          return `A${year}${seq}`
        }
        return code
      }

      const displayCode = order.code ? convertToCompactCode(order.code) : ''

      const pdfData: InvoicePDFData = {
        code: displayCode,
        issue_date: order.created,
        currency: order.currency || 'USD',
        total_amount: calculatedTotal,
        remarks: order.remarks,
        bank_info: bankInfo,
        order: {
          code: order.code,
          incoterm: order.incoterm,
          port_of_loading: order.port_of_loading,
          port_of_destination: order.port_of_destination,
          payment_terms: order.payment_terms,
          estimated_shipping_date: order.estimated_shipping_date,
          customer_po: order.customer_po,
          vendor_code: order.vendor_code,
        },
        customer: customer ? {
          name: customer.name,
          address: (customer as any).address,
          tax_id: (customer as any).tax_id,
          contact_person: primaryContact?.name || '',
          phone: primaryContact?.phone || (customer as any).phone,
          email: primaryContact?.email || (customer as any).email,
          country: (customer as any).country,
        } : undefined,
        project: project ? {
          name: project.name,
          code: project.code,
        } : undefined,
        items: orderItems.map(item => {
          const product = item.expand?.product as any
          const packagingLines: string[] = []
          if (product?.pcs_per_carton) {
            packagingLines.push(`${product.pcs_per_carton} pcs/ctn`)
          }
          if (product?.carton_dimensions) {
            const d = product.carton_dimensions
            packagingLines.push(`${d.length}×${d.width}×${d.height} mm`)
          }
          if (product?.carton_gross_weight) {
            packagingLines.push(`G.W: ${product.carton_gross_weight} kg/ctn`)
          }
          const packaging = packagingLines.length > 0 ? packagingLines.join('\n') : undefined
          const description = product?.description || product?.name || '-'

          return {
            part_number: product?.part_number || '-',
            product_code: product?.code || item.product_code,
            product_name: description,
            packaging,
            quantity: item.quantity,
            unit: item.unit || 'PCS',
            unit_price: item.unit_price,
            amount: item.amount || (item.quantity * item.unit_price),
          }
        }),
        terms: {
          payment: order.payment_terms,
          price_term: order.incoterm,
          country_of_origin: order.country_of_origin,
          country_of_destination: order.country_of_destination,
          port_of_discharge: order.port_of_destination,
          mode_of_shipment: order.mode_of_shipment,
          port_of_loading: order.port_of_loading,
          time_of_delivery: order.estimated_shipping_date,
        },
        branding: branding || undefined,
      }

      // Generate filename with timestamp: PI-{订单号}-YYYY-MM-DD-HHMMSS.pdf
      const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss')
      const filename = `PI-${order.code}-${timestamp}.pdf`

      // Build folder path: Customers/{客户名}/{项目名}/orders/{订单号}/PI/
      const customerName = customer?.name || 'Unknown'
      const projectName = project?.name || 'Unknown'
      const folder = `Customers/${customerName}/${projectName}/orders/${order.code}/PI`

      await ensureFolderExists(folder)

      // Upload PDF to S3
      const result = await uploadPdfToDisk(<InvoicePDF data={pdfData} />, filename, folder)

      if (result.success) {
        toast({
          title: t('orders.management.piGenerateSuccess'),
          description: t('orders.management.piGenerateSuccessDesc'),
        })

        // Navigate to disk directory
        await navigateToDisk(folder, router)
      } else {
        toast({
          title: t('orders.management.piGenerateError'),
          description: result.error,
          variant: 'destructive',
        })
      }
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
              <Badge variant={getStatusVariant(order.status)}>
                {t(`orders.status.${order.status}`)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {getDisplayName(order.expand?.project)} • {getDisplayName(order.expand?.customer)}
            </p>
          </div>
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
