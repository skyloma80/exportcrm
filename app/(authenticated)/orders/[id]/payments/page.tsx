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
import { getPocketBase } from "@/lib/pocketbase/auth"
import { PaymentManager } from "@/components/orders/payment-manager"
import { useBreadcrumb } from "@/lib/breadcrumb/context"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function OrderPaymentsPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const { setItems: setBreadcrumbItems } = useBreadcrumb()
  
  const projectId = searchParams.get("project")
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadOrder()
  }, [id])
  
  const loadOrder = async () => {
    setLoading(true)
    try {
      const pb = getPocketBase()
      const data = await pb.collection("orders").getOne(id)
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
        { label: order.code },
        { label: t("orders.management.viewPayments") },
      ])
    }
    return () => setBreadcrumbItems([])
  }, [order, setBreadcrumbItems, t])

  if (!projectId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">{t("common.error")}: Missing project parameter</p>
              <Button variant="outline" onClick={() => router.back()} className="mt-4">
                {t("common.back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

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
              <Button variant="outline" onClick={() => router.back()} className="mt-4">
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
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/orders/${id}?project=${projectId}`)}
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
        totalAmount={order.total_amount}
        currency={order.currency}
        onPaymentAdded={loadOrder}
      />
    </div>
  )
}
