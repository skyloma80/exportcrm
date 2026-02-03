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

  // Get URL parameters
  const projectIdFromUrl = searchParams.get("project")
  const fromQuotationId = searchParams.get("fromQuotation")

  // Enforce project context
  if (!projectIdFromUrl) {
    notFound()
  }

  // Use project context hook
  const { returnUrl } = useProjectContext({
    documentType: 'order',
    currentPageLabel: t("orders.new")
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quotationData, setQuotationData] = useState<any>(null)
  const [quotationItems, setQuotationItems] = useState<any[]>([])
  const [loading, setLoading] = useState(!!fromQuotationId)

  // Set breadcrumb
  useEffect(() => {
    setBreadcrumbItems([
      { label: t("orders.new") },
    ])
    return () => setBreadcrumbItems([])
  }, [setBreadcrumbItems, t])

  // Load quotation data if converting from quotation
  useEffect(() => {
    if (fromQuotationId) {
      loadQuotationData()
    }
  }, [fromQuotationId])

  const loadQuotationData = async () => {
    if (!fromQuotationId) return

    setLoading(true)
    try {
      const pb = getPocketBase()

      // Load quotation
      const quotation = await pb.collection("quotations").getOne(fromQuotationId, {
        expand: "project,customer"
      })
      setQuotationData(quotation)

      // Load quotation items
      const items = await pb.collection("quotation_items").getFullList({
        filter: `quotation = "${fromQuotationId}"`,
        expand: "product",
        sort: "created",
      })
      setQuotationItems(items)

      toast({
        title: locale === 'zh' ? '已导入报价单数据' : 'Quotation data imported',
        description: locale === 'zh'
          ? `从报价单 ${quotation.code} 导入了 ${items.length} 个产品`
          : `Imported ${items.length} items from quotation ${quotation.code}`,
      })
    } catch (err: any) {
      console.error("Error loading quotation:", err)
      toast({
        title: locale === 'zh' ? '加载报价单失败' : 'Failed to load quotation',
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: OrderCreateInput) => {
    setIsSubmitting(true)
    try {
      const pb = getPocketBase()

      // Generate order code in compact format: A{YY}{XXXX}
      const orderCode = await generateOrderCode(pb)
      console.log('Generated order code:', orderCode, 'Type:', typeof orderCode)

      // Calculate total amount from quotation items
      const totalAmount = quotationItems.reduce((sum, item) => sum + (item.amount || 0), 0)
      console.log('Calculated total amount:', totalAmount)

      // Prepare order data
      const orderData = {
        code: orderCode,
        project: projectIdFromUrl,
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
        status: 'draft',
        total_amount: totalAmount > 0 ? totalAmount : 0.01, // Use calculated total or minimum value
        paid_amount: 0,
        quotation: fromQuotationId || undefined,
      }

      console.log('Creating order with data:', orderData)

      // Create order
      const order = await pb.collection("orders").create(orderData)

      // Create order items if converting from quotation
      if (quotationItems.length > 0) {
        for (const item of quotationItems) {
          await pb.collection("order_items").create({
            order: order.id,
            product: item.product,
            product_code: item.product_code,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            amount: item.amount,
          })
        }
      }

      // Update quotation status to accepted if converting from quotation
      if (fromQuotationId) {
        await pb.collection("quotations").update(fromQuotationId, {
          status: 'accepted',
        })
      }

      toast({
        title: t("orders.createSuccess"),
        description: t("orders.createSuccessDesc"),
      })

      // Navigate to order detail page
      router.push(`/orders/${order.id}?project=${projectIdFromUrl}`)
    } catch (err: any) {
      console.error("Create error:", err)
      console.error("Error response:", err.response)
      console.error("Error data:", err.data)
      toast({
        title: t("orders.createError"),
        description: err.data?.message || err.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=orders`)
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
              {fromQuotationId && quotationData
                ? `${locale === 'zh' ? '从报价单转换' : 'Convert from quotation'}: ${quotationData.code}`
                : t("orders.newDescription") || (locale === 'zh' ? '创建新订单' : 'Create a new order')}
            </p>
          </div>
        </div>
      </div>

      <OrderForm
        initialData={quotationData ? {
          project: projectIdFromUrl,
          customer: quotationData.customer,
          incoterm: quotationData.incoterm,
          port_of_loading: quotationData.port_of_loading,
          port_of_destination: quotationData.port_of_destination,
          payment_terms: quotationData.payment_terms,
          currency: quotationData.currency,
          exchange_rate: quotationData.exchange_rate,

          remarks: quotationData.remarks,
        } : {
          project: projectIdFromUrl,
        }}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        projectLocked={true}
        items={quotationItems}
      />
    </div>
  )
}
