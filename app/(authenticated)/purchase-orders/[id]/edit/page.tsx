"use client"

/**
 * Edit Purchase Order Page
 * 编辑采购订单页面
 * 
 * 强制项目上下文：必须通过 URL 参数 `project` 传递项目 ID，否则返回 404
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
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useProjectContext } from "@/hooks/use-project-context"

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
  
  // 获取项目上下文
  const projectIdFromUrl = searchParams.get("project")
  
  // 强制项目上下文：无项目参数返回 404 (Requirements: 1.4)
  if (!projectIdFromUrl) {
    notFound()
  }
  
  // 使用项目上下文 Hook 获取面包屑和返回 URL
  const { 
    project: contextProject, 
    customer: contextCustomer, 
    returnUrl 
  } = useProjectContext({
    documentType: 'purchase-order',
    currentPageLabel: t("common.edit")
  })

  // 设置面包屑 (Requirements: 2.1)
  // 注意：只设置当前页面标签，客户和项目信息由 layout 根据 URL 参数自动添加
  useEffect(() => {
    if (po) {
      setBreadcrumb([
        { label: po.code, href: `/purchase-orders/${po.id}?project=${projectIdFromUrl}` },
        { label: t("common.edit") },
      ])
    }
    return () => setBreadcrumb([])
  }, [po, setBreadcrumb, t, projectIdFromUrl])

  useEffect(() => {
    loadPurchaseOrder()
  }, [poId])

  const loadPurchaseOrder = async () => {
    setLoading(true)
    try {
      const data = await purchaseOrderService.getOne(poId)
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

  const handleSubmit = async (data: POCreateInput) => {
    setIsSubmitting(true)
    try {
      await purchaseOrderService.update(poId, data)
      toast({
        title: t("purchaseOrders.updateSuccess"),
        description: t("purchaseOrders.updateSuccessDesc"),
      })
      // 保存后返回项目详情页的采购单标签页 (Requirements: 4.2)
      router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=purchase-orders`)
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

  // 返回/取消按钮导航到项目详情页 (Requirements: 4.3)
  const handleBack = () => {
    router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=purchase-orders`)
  }

  if (loading) {
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

      {/* Form - 项目选择器已隐藏 (Requirements: 3.1) */}
      <PurchaseOrderForm
        initialData={po}
        onSubmit={handleSubmit}
        onCancel={handleBack}
        isLoading={isSubmitting}
        projectLocked={true}
      />
    </div>
  )
}
