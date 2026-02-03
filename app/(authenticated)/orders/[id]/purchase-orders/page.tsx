"use client"

/**
 * Order Purchase Orders Page
 * 订单采购订单页面
 */

import { use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/use-i18n"
import { PurchaseOrdersTab } from "@/components/orders/purchase-orders-tab"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useEffect, useState } from "react"
import { getPocketBase } from "@/lib/pocketbase/auth"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function OrderPurchaseOrdersPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const { setItems: setBreadcrumbItems } = useBreadcrumb()

  const projectId = searchParams.get("project")
  const [orderCode, setOrderCode] = useState<string>("")
  const [orderStatus, setOrderStatus] = useState<string>("draft")

  useEffect(() => {
    loadOrderInfo()
  }, [id])

  const loadOrderInfo = async () => {
    try {
      const pb = getPocketBase()
      const order = await pb.collection("orders").getOne(id)
      setOrderCode(order.code)
      setOrderStatus(order.status)
    } catch (error) {
      console.error("Error loading order:", error)
    }
  }

  useEffect(() => {
    if (orderCode) {
      setBreadcrumbItems([
        {
          label: orderCode,
          href: `/orders/${id}?project=${projectId}`
        },
        { label: t("orders.management.viewPurchaseOrders") },
      ])
    }
    return () => setBreadcrumbItems([])
  }, [orderCode, setBreadcrumbItems, t, id, projectId])

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

  return (
    <div className="p-6">
      <PurchaseOrdersTab
        orderId={id}
        projectId={projectId}
        orderStatus={orderStatus}
      />
    </div>
  )
}
