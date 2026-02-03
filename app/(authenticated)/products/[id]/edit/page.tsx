"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { ArrowLeft } from "lucide-react"
import { ProductForm } from "@/components/products/product-form"
import { productService, Product, ProductCreateInput } from "@/lib/pocketbase/services/products"
import { useToast } from "@/hooks/use-toast"

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()
  const id = params.id as string
  
  // 获取项目上下文参数
  const projectIdFromUrl = searchParams.get("project")

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // 构建带项目上下文的 URL
  const buildUrl = (path: string) => {
    return projectIdFromUrl ? `${path}?project=${projectIdFromUrl}` : path
  }

  // 返回按钮处理
  const handleBack = () => {
    router.push(buildUrl(`/products/${id}`))
  }

  // Set breadcrumb when product loads
  // 注意：只设置当前页面标签，客户和项目信息由 layout 根据 URL 参数自动添加
  useEffect(() => {
    if (product) {
      const displayName = locale === 'zh' && product.name_cn ? product.name_cn : product.name
      // 如果有项目上下文，只显示产品信息；否则显示完整路径
      if (projectIdFromUrl) {
        setBreadcrumb([
          { label: `${product.code} - ${displayName}`, href: buildUrl(`/products/${product.id}`) },
          { label: t("common.edit") },
        ])
      } else {
        setBreadcrumb([
          { label: t("nav.products"), href: "/products" },
          { label: `${product.code} - ${displayName}`, href: `/products/${product.id}` },
          { label: t("common.edit") },
        ])
      }
    }
    return () => setBreadcrumb([])
  }, [product, setBreadcrumb, t, locale, projectIdFromUrl])

  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await productService.getOne(id)
      setProduct(data)
    } catch (err: any) {
      console.error("Load product error:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: ProductCreateInput) => {
    setIsSubmitting(true)
    try {
      await productService.updateProduct(id, data)
      toast({ title: t("products.updateSuccess"), description: t("products.updateSuccessDesc") })
      router.push(buildUrl(`/products/${id}`))
    } catch (error: any) {
      console.error("Update product error:", error)
      toast({ title: t("products.updateError"), description: error.message, variant: "destructive" })
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

  if (error || !product) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>{t("common.error")}: {error?.message || t("products.notFound")}</p>
              <Button variant="outline" onClick={handleBack} className="mt-4">{t("common.back")}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{t("products.edit")}</h1>
            <p className="text-sm text-muted-foreground">{product.name}</p>
          </div>
        </div>
      </div>
      <ProductForm initialData={product} onSubmit={handleSubmit} onCancel={handleBack} isLoading={isSubmitting} showProjectContext={false} />
    </div>
  )
}
