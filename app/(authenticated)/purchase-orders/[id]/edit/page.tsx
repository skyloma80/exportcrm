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

  // 等待PO和items都加载完成
  const isDataLoading = loading || itemsLoading || !po

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
      
      // Update PO - Explicitly pick fields and convert empty values to empty strings for PB compatibility
      await purchaseOrderService.update(poId, {
        supplier: data.supplier || "",
        project: data.project || "",
        order: (data as any).order || "",
        rfq: (data as any).rfq || "",
        status: data.status,
        currency: data.currency,
        expected_delivery_date: data.expected_delivery_date ? new Date(data.expected_delivery_date).toISOString() : "",
        remarks: data.remarks,
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
          product: item.product || "",
          product_name: item.product_name || undefined,
          product_code: item.product_code || undefined,
          part_number: item.part_number || undefined,
          description_en: item.description_en || undefined,
          description_cn: item.description_cn || undefined,
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
      // Log detailed validation errors if available
      let errorMsg = error.message;
      if (error.response?.data) {
        const details = JSON.stringify(error.response.data, null, 2);
        console.error("Validation details:", details);
        errorMsg += "\n\n" + details;
        // Prompt the user with the exact error details
        alert("保存失败，详细错误信息：\n" + details);
      }
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

  if (isDataLoading) {
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
