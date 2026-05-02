"use client"

/**
 * Order Payments Page
 * 订单收款管理页面
 */

import { use, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/use-i18n"
import { ArrowLeft, Loader2 } from "lucide-react"
import { soService, type FlatSO } from "@/lib/pocketbase/services/so"
import { PaymentManager } from "@/components/orders/payment-manager"
import { useBreadcrumb } from "@/lib/breadcrumb/context"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function OrderPaymentsPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { t } = useI18n()
  const { setItems: setBreadcrumbItems } = useBreadcrumb()
  
  const [order, setOrder] = useState<FlatSO | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadOrder()
  }, [id])
  
  const loadOrder = async () => {
    setLoading(true)
    try {
      const data = await soService.getOne(id)
      setOrder(data)
    } catch (error) {
      console.error("Error loading order:", error)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    if (order) {
      setBreadcrumbItems([
        { label: t("nav.orders"), href: "/orders" },
        { label: order.code, href: `/orders/${id}` },
        { label: t("orders.management.viewPayments") },
      ])
    }
    return () => setBreadcrumbItems([])
  }, [order, setBreadcrumbItems, t, id])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">{t("orders.notFound")}</p>
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/orders/${id}`)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("common.back")}
        </Button>
        
        <div>
          <h1 className="text-3xl font-bold">{t("orders.management.viewPayments")}</h1>
          <p className="text-muted-foreground mt-1">
            {order.code} • {t("orders.management.viewPaymentsDesc")}
          </p>
        </div>
      </div>

      {/* Payment Manager Component */}
      <PaymentManager
        orderId={id}
        orderCode={order.code}
        customerId={order.customer_id}
        projectId={order.project_id}
        totalAmount={order.total_amount}
        currency={order.currency}
        onPaymentAdded={loadOrder}
      />
    </div>
  )
}
