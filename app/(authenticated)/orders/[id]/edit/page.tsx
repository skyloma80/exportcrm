"use client"

/**
 * Order Edit Page (V2)
 * 订单编辑页面
 * 
 * Requirements: 需求2.1-2.6, 需求7.3
 */

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { OrderForm } from "@/components/orders/order-form"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useProjectContext } from "@/hooks/use-project-context"
import type { Order, OrderCreateInput } from "@/lib/pocketbase/services/orders"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditOrderPageV2({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumbItems } = useBreadcrumb()

  // Get project context
  const projectIdFromUrl = searchParams.get("project")

  // Enforce project context: return 404 if no project parameter (Requirements: 需求7.3)
  if (!projectIdFromUrl) {
    notFound()
  }

  // Use project context hook to get return URL
  const {
    project: contextProject,
    customer: contextCustomer,
    returnUrl
  } = useProjectContext({
    documentType: 'order'
  })

  const [order, setOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Set breadcrumb (Requirements: 需求2.1, 需求7.7)
  useEffect(() => {
    if (order) {
      setBreadcrumbItems([
        { label: order.code, href: `/orders/${order.id}?project=${projectIdFromUrl}` },
        { label: t("common.edit") },
      ])
    }
    return () => setBreadcrumbItems([])
  }, [order, setBreadcrumbItems, t, projectIdFromUrl])

  useEffect(() => {
    loadOrder()
  }, [id])

  const loadOrder = async () => {
    setLoading(true)
    setError(null)
    try {
      const pb = getPocketBase()
      const result = await pb.collection("orders").getOne<Order>(id)

      console.log('Loaded order:', result)
      console.log('country_of_destination from DB:', result.country_of_destination)

      setOrder(result)

      // Load order items (Requirements: 需求2.2, 需求2.3)
      const items = await pb.collection("order_items").getFullList({
        filter: `order = "${id}"`,
        expand: "product",
        sort: "created",
      })
      setOrderItems(items)
    } catch (err: any) {
      console.error("Error loading order:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: OrderCreateInput, items: any[]) => {
    if (!order) return

    setIsSubmitting(true)
    try {
      const pb = getPocketBase()

      // Calculate total amount from items
      const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)

      // Prepare update data - include all PI-related fields
      const updateData: Record<string, any> = {
        incoterm: data.incoterm,
        port_of_loading: data.port_of_loading || null,
        port_of_destination: data.port_of_destination || null,
        payment_terms: data.payment_terms || null,
        currency: data.currency,
        exchange_rate: data.exchange_rate || null,
        expected_delivery_date: data.expected_delivery_date || null,
        country_of_origin: data.country_of_origin || null,
        country_of_destination: data.country_of_destination || null,
        mode_of_shipment: data.mode_of_shipment || null,
        bank_info: data.bank_info || null,
        shipping_marks: data.shipping_marks || null,
        estimated_shipping_date: data.estimated_shipping_date || null,
        remarks: data.remarks || null,
        customer_po: data.customer_po || null,
        vendor_code: data.vendor_code || null,
        total_amount: totalAmount > 0 ? totalAmount : 0.01,
      }

      console.log('Saving order data:', updateData)
      const result = await pb.collection("orders").update(order.id, updateData)

      // Update items: delete existing, create new
      const existingItems = await pb.collection("order_items").getFullList({ filter: `order = "${order.id}"` })
      for (const item of existingItems) {
        await pb.collection("order_items").delete(item.id)
      }
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

      console.log('Saved order result:', result)

      // Show success toast (Requirements: 需求2.5)
      toast({
        title: t("orders.edit.saveSuccess"),
        description: t("orders.edit.saveSuccessDesc"),
      })

      // Reload order data to show updated values
      await loadOrder()

      // Stay on edit page - do not redirect (Requirements: 需求2.6)
    } catch (err: any) {
      console.error("Update error:", err)
      const errorData = err.response?.data ? JSON.stringify(err.response.data) : null;
      toast({
        title: t("orders.edit.saveError"),
        description: errorData || err.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
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
              <Button
                variant="outline"
                onClick={() => router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=orders`)}
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
    <div className="p-6">
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t("common.edit")}</h1>
          <p className="text-muted-foreground mt-1">{order.code}</p>
        </div>
      </div>

      <OrderForm
        initialData={order}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        projectLocked={true}
        items={orderItems}
      />
    </div>
  )
}
