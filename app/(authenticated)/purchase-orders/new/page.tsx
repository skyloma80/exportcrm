"use client"

/**
 * New Purchase Order Page
 * 新建采购订单页面
 * 
 * 按照销售订单同样的模式，不强制关联项目
 * Requirements: 1.4, 3.1
 */

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useProjectContext } from "@/hooks/use-project-context"
import { ArrowLeft } from "lucide-react"
import type { POCreateInput } from "@/lib/pocketbase/services/purchase-orders"
import { purchaseOrderService } from "@/lib/pocketbase/services/purchase-orders"

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumbItems } = useBreadcrumb()

  const projectIdFromUrl = searchParams.get("project")

  // 项目上下文
  const { returnUrl } = useProjectContext({
    documentType: 'purchase-order',
    currentPageLabel: locale === 'zh' ? '新建采购订单' : 'New Purchase Order'
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Set breadcrumb
  useEffect(() => {
    setBreadcrumbItems([
      { label: locale === 'zh' ? '新建采购订单' : 'New Purchase Order' },
    ])
    return () => setBreadcrumbItems([])
  }, [setBreadcrumbItems, locale])

  const handleSubmit = async (data: POCreateInput, items: any[]) => {
    setIsSubmitting(true)
    try {
      const pb = getPocketBase()

      // Calculate total amount from items
      const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)

      // Create PO
      const po = await purchaseOrderService.createPO(data, totalAmount)

      // Create PO items
      if (items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          try {
            await pb.collection("purchase_order_items").create({
              purchase_order: po.id,
              product: item.product || null,
              product_name: item.product_name || undefined,
              product_code: item.product_code || undefined,
              unit: item.unit || undefined,
              quantity: item.quantity,
              unit_price: item.unit_price,
              amount: item.amount,
            })
          } catch (itemErr: any) {
            console.error(`Error creating item ${i}:`, itemErr)
            if (itemErr.response?.data) {
              console.error(`Item ${i} validation error:`, JSON.stringify(itemErr.response.data, null, 2))
            }
            throw itemErr
          }
        }
      }

      toast({
        title: locale === 'zh' ? '创建成功' : 'Purchase Order Created',
        description: locale === 'zh' ? '采购订单已成功创建' : 'The purchase order has been created successfully.',
      })

      // Navigate to detail page
      router.push(`/purchase-orders/${po.id}`)
    } catch (err: any) {
      console.error("Create error:", err)
      if (err.response?.data) {
        console.error("PocketBase validation error:", JSON.stringify(err.response.data, null, 2))
      }
      toast({
        title: locale === 'zh' ? '创建失败' : 'Failed to create',
        description: err.response?.data ? JSON.stringify(err.response.data) : err.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.push(returnUrl || '/purchase-orders')
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{locale === 'zh' ? '新建采购订单' : 'New Purchase Order'}</h1>
            <p className="text-muted-foreground mt-1">
              {locale === 'zh' ? '创建新的采购订单，支持自定义产品和贸易条款' : 'Create a new purchase order with custom products and trade terms'}
            </p>
          </div>
        </div>
      </div>

      <PurchaseOrderForm
        initialData={{
          project: projectIdFromUrl || undefined,
        }}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </div>
  )
}
