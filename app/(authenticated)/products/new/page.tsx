"use client"

/**
 * New Product Page
 * 新建产品页面
 * 
 * 支持项目上下文：当从项目内创建产品时，自动关联到当前项目
 * Requirements: 1.5, 7.4
 */

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/use-i18n"
import { ArrowLeft } from "lucide-react"
import { ProductForm } from "@/components/products/product-form"
import { productService, ProductCreateInput } from "@/lib/pocketbase/services/products"
import { productProjectService } from "@/lib/pocketbase/services/projects"
import { useToast } from "@/hooks/use-toast"

export default function NewProductPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  // 获取项目上下文和返回目标
  const projectIdFromUrl = searchParams.get("project")
  const returnTo = searchParams.get("returnTo")

  const handleSubmit = async (data: ProductCreateInput) => {
    setIsLoading(true)
    try {
      const product = await productService.createProduct(data)
      
      // 如果有项目上下文，自动创建产品-项目关联 (Requirements: 1.5, 7.4)
      if (projectIdFromUrl) {
        try {
          await productProjectService.addProductToProject(product.id, projectIdFromUrl)
        } catch (err) {
          console.error("Error creating product-project association:", err)
          // 不阻止产品创建成功的提示，但记录错误
        }
      }
      
      toast({ title: t("products.createSuccess"), description: t("products.createSuccessDesc") })
      
      // 如果从项目内创建，返回项目详情页；否则跳转到产品详情页
      if (projectIdFromUrl) {
        // 如果有 returnTo=workflow，返回工作流页面
        if (returnTo === 'workflow') {
          router.push(`/projects/${projectIdFromUrl}/workflow`)
        } else {
          router.push(`/projects/${projectIdFromUrl}?tab=products`)
        }
      } else {
        router.push(`/products/${product.id}`)
      }
    } catch (error: any) {
      console.error("Create product error:", error)
      toast({ title: t("products.createError"), description: error.message, variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{t("products.newProduct")}</h1>
        </div>
      </div>
      <ProductForm onSubmit={handleSubmit} onCancel={() => router.back()} isLoading={isLoading} showProjectContext={false} />
    </div>
  )
}
