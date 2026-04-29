"use client"

/**
 * Edit Purchase Order Page
 * 编辑采购订单页面
 * 
 * Requirements: 1.4, 2.1, 4.2, 4.3
 */

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { notFound } from "next/navigation"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { PurchaseOrderForm } from "@/components/purchase-orders"
import { 
  purchaseOrderService, 
  PurchaseOrder, 
  POCreateInput 
} from "@/lib/pocketbase/services/purchase-orders"
import { useToast } from "@/hooks/use-toast"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { usePurchaseOrderItems } from "@/hooks/collections/purchase-orders"

export default function EditPurchaseOrderPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()
  const poId = params.id as string

  const [po, setPo] = useState<PurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { items, loading: itemsLoading } = usePurchaseOrderItems(poId)
  const returnUrl = `/purchase-orders/${poId}`

  // 设置面包屑 (Requirements: 2.1)
  // 注意：只设置当前页面标签，客户和项目信息由 layout 根据 URL 参数自动添加
  useEffect(() => {
    if (po) {
      setBreadcrumb([
        { label: po.code, href: `/purchase-orders/${po.id}` },
        { label: t("common.edit") },
      ])
    }
    return () => setBreadcrumb([])
  }, [po, setBreadcrumb, t])

  useEffect(() => {
    loadPurchaseOrder()
  }, [poId])

  const loadPurchaseOrder = async () => {
    setLoading(true)
    try {
      const data = await purchaseOrderService.getWithDetails(poId)
      setPo(data)
    } catch (error) {
      console.error("Error loading purchase order:", error)
      toast({
        title: t("common.error"),
        description: String(error),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: POCreateInput, items: any[]) => {
    setIsSubmitting(true)
    try {
      const pb = getPocketBase()
      
      // Calculate total
      const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0)
      
      // Update PO
      await purchaseOrderService.update(poId, {
        ...data,
        total_amount: totalAmount,
      })

      // Update items: delete existing and create new (simplest for now)
      const existingItems = await pb.collection("purchase_order_items").getFullList({
        filter: `purchase_order = "${poId}"`
      })
      
      for (const item of existingItems) {
        await pb.collection("purchase_order_items").delete(item.id)
      }

      for (const item of items) {
        await pb.collection("purchase_order_items").create({
          purchase_order: poId,
          product: item.product || null,
          product_name: item.product_name || undefined,
          product_code: item.product_code || undefined,
          unit: item.unit || undefined,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
        })
      }

      toast({
        title: t("purchaseOrders.updateSuccess"),
        description: t("purchaseOrders.updateSuccessDesc"),
      })
      router.push(returnUrl || `/purchase-orders/${poId}`)
    } catch (error: any) {
      console.error("Error updating purchase order:", error)
      toast({
        title: t("purchaseOrders.updateError"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.push(returnUrl)
  }

  if (loading || itemsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!po) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">{t("purchaseOrders.notFound")}</h2>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back")}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("purchaseOrders.edit")}</h1>
            <p className="text-muted-foreground mt-1 font-mono">{po.code}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <PurchaseOrderForm
        initialData={po}
        items={items}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </div>
  )
}
