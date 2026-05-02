"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { OrderForm } from "@/components/orders/order-form"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { ArrowLeft, Loader2 } from "lucide-react"
import { soService, type FlatSO, type SOCreateInput } from "@/lib/pocketbase/services/so"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditOrderPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { t } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumbItems } = useBreadcrumb()

  const [order, setOrder] = useState<FlatSO | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (order) {
      setBreadcrumbItems([
        { label: t("nav.orders"), href: "/orders" },
        { label: order.code, href: `/orders/${order.id}` },
        { label: t("common.edit") },
      ])
    }
    return () => setBreadcrumbItems([])
  }, [order, setBreadcrumbItems, t])

  useEffect(() => {
    loadOrder()
  }, [id])

  const loadOrder = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await soService.getOne(id)
      setOrder(result)
    } catch (err: any) {
      console.error("Error loading order:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: SOCreateInput) => {
    if (!order) return

    setIsSubmitting(true)
    try {
      await soService.update(order.id, data)

      toast({
        title: t("orders.edit.saveSuccess"),
        description: t("orders.edit.saveSuccessDesc"),
      })

      // 重新加载数据以显示更新后的值
      await loadOrder()
    } catch (err: any) {
      console.error("Update error:", err)
      toast({
        title: t("orders.edit.saveError"),
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <Button
                variant="outline"
                onClick={() => router.push('/orders')}
                className="mt-4"
              >
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
          <h1 className="text-3xl font-bold">{t("common.edit")}</h1>
          <p className="text-muted-foreground mt-1">
            {order.code}
          </p>
        </div>
      </div>

      <OrderForm
        initialData={order}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </div>
  )
}
