"use client"

/**
 * New Purchase Order Page
 * 新建采购订单页面
 * 
 * 强制项目上下文：必须通过 URL 参数 `project` 传递项目 ID，否则返回 404
 * Requirements: 1.4, 3.1, 4.1
 */

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { notFound } from "next/navigation"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { PurchaseOrderForm } from "@/components/purchase-orders"
import { purchaseOrderService, POCreateInput } from "@/lib/pocketbase/services/purchase-orders"
import { useToast } from "@/hooks/use-toast"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useProjectContext } from "@/hooks/use-project-context"

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()
  const [isLoading, setIsLoading] = useState(false)
  
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
    loading: contextLoading,
    returnUrl 
  } = useProjectContext({
    documentType: 'purchase-order',
    currentPageLabel: t("purchaseOrders.new")
  })

  // 设置面包屑 (Requirements: 2.1)
  // 注意：只设置当前页面标签，客户和项目信息由 layout 根据 URL 参数自动添加
  useEffect(() => {
    setBreadcrumb([
      { label: t("purchaseOrders.new") },
    ])
    return () => setBreadcrumb([])
  }, [setBreadcrumb, t])

  const handleSubmit = async (data: POCreateInput) => {
    setIsLoading(true)
    try {
      await purchaseOrderService.createPO(data)
      toast({
        title: t("purchaseOrders.createSuccess"),
        description: t("purchaseOrders.createSuccessDesc"),
      })
      
      // 保存后返回项目详情页的采购单标签页 (Requirements: 4.1)
      router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=purchase-orders`)
    } catch (error: any) {
      console.error("Error creating purchase order:", error)
      toast({
        title: t("purchaseOrders.createError"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 返回按钮导航到项目详情页 (Requirements: 4.1)
  const handleBack = () => {
    router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=purchase-orders`)
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
            <h1 className="text-3xl font-bold">{t("purchaseOrders.new")}</h1>
            <p className="text-muted-foreground mt-1">{t("purchaseOrders.newDescription")}</p>
          </div>
        </div>
      </div>

      {/* Form - 项目选择器已隐藏 (Requirements: 3.1) */}
      <PurchaseOrderForm
        onSubmit={handleSubmit}
        onCancel={handleBack}
        isLoading={isLoading}
        projectLocked={true}
      />
    </div>
  )
}
