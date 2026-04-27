"use client"

/**
 * New Order Page
 * 新建订单页面
 * 
 * 支持：
 * 1. 从项目直接创建空白订单
 * 2. 从报价单转换创建订单（带上报价单的产品和价格）
 */

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { OrderForm } from "@/components/orders/order-form"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useProjectContext } from "@/hooks/use-project-context"
import { ArrowLeft } from "lucide-react"
import { generateOrderCode } from "@/lib/services/code-generator"
import type { OrderCreateInput } from "@/lib/pocketbase/services/orders"

export default function NewOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumbItems } = useBreadcrumb()

  const projectIdFromUrl = searchParams.get("project")



  // 项目上下文
  const { returnUrl } = useProjectContext({
    documentType: 'order',
    currentPageLabel: t("orders.new")
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)

  // Set breadcrumb
  useEffect(() => {
    setBreadcrumbItems([
      { label: t("orders.new") },
    ])
    return () => setBreadcrumbItems([])
  }, [setBreadcrumbItems, t])

  const handleSubmit = async (data: OrderCreateInput, items: any[]) => {
    setIsSubmitting(true)
    try {
      const pb = getPocketBase()

      // Generate order code in compact format: A{YY}{XXXX}
      const orderCode = await generateOrderCode(pb)
      console.log('Generated order code:', orderCode, 'Type:', typeof orderCode)

      // Calculate total amount from items
      const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)
      console.log('Calculated total amount:', totalAmount)

      const currentUser = pb.authStore.model?.id

      // Prepare order data - 项目可选
      const orderData: any = {
        project: data.project || undefined,
        customer: data.customer,
        incoterm: data.incoterm,
        port_of_loading: data.port_of_loading,
        port_of_destination: data.port_of_destination,
        payment_terms: data.payment_terms,
        currency: data.currency,
        exchange_rate: data.exchange_rate,
        expected_delivery_date: data.expected_delivery_date,
        bank_info: data.bank_info,
        shipping_marks: data.shipping_marks,
        estimated_shipping_date: data.estimated_shipping_date,
        remarks: data.remarks,
        customer_po: data.customer_po,
        vendor_code: data.vendor_code,
      }

      console.log('Creating order with data:', orderData)

      // Create order using service which will handle created_by
      const { orderService } = await import('@/lib/pocketbase/services/orders')
      const order = await orderService.createOrder(orderData, currentUser, totalAmount > 0 ? totalAmount : undefined)

      // Create order items 
      if (items.length > 0) {
        for (const item of items) {
          await pb.collection("order_items").create({
            order: order.id,
            product: item.product || null,
            product_name: item.product_name || undefined,
            product_code: item.product_code || undefined,
            quantity: item.quantity,
            unit_price: item.unit_price,
            amount: item.amount,
          })
        }
      }



      toast({
        title: t("orders.createSuccess"),
        description: t("orders.createSuccessDesc"),
      })

      // Navigate to order detail page
      router.push(`/orders/${order.id}`)
    } catch (err: any) {
      console.error("Create error:", err)
      console.error("Error response:", err.response)
      console.error("Error data:", err.data)
      const errorData = err.response?.data ? JSON.stringify(err.response.data) : null;
      toast({
        title: t("orders.createError"),
        description: errorData || err.data?.message || err.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.push(returnUrl || '/orders')
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("orders.new")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("orders.newDescription") || (locale === 'zh' ? '创建新订单' : 'Create a new order')}
            </p>
          </div>
        </div>
      </div>

      <OrderForm
        initialData={{
          project: projectIdFromUrl || undefined,
        }}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </div>
  )
}
