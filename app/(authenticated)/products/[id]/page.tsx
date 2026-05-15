"use client"

/**
 * Product Detail Page
 * 产品详情页
 * 
 * 支持项目上下文：通过 URL 参数 `project` 传递项目 ID，面包屑会显示客户和项目信息
 */

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useTabState } from "@/hooks/use-tab-state"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { 
  ArrowLeft, Edit, Package, Layers, FileText
} from "lucide-react"
import { ViewDiskButton } from "@/components/disk/view-disk-button"
import { 
  Product, ProductCategory, ProductDocument 
} from "@/lib/pocketbase/services/products"
import { ProductDocumentManager } from "@/components/products/product-document-manager"

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { setItems: setBreadcrumb } = useBreadcrumb()
  const id = params.id as string
  const [activeTab, setActiveTab] = useTabState("info")
  
  // 获取项目上下文参数
  const projectIdFromUrl = searchParams.get("project")

  const [product, setProduct] = useState<Product | null>(null)
  const [category, setCategory] = useState<ProductCategory | null>(null)
  const [documents, setDocuments] = useState<ProductDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Set breadcrumb when product loads
  // 注意：只设置当前页面标签，客户和项目信息由 layout 根据 URL 参数自动添加
  useEffect(() => {
    if (product) {
      const displayName = locale === 'zh' && product.name_cn ? product.name_cn : product.name
      // 如果有项目上下文，只显示产品信息；否则显示完整路径
      if (projectIdFromUrl) {
        setBreadcrumb([
          { label: `${product.code} - ${displayName}` },
        ])
      } else {
        setBreadcrumb([
          { label: t("nav.products"), href: "/products" },
          { label: `${product.code} - ${displayName}` },
        ])
      }
    }
    return () => setBreadcrumb([])
  }, [product, setBreadcrumb, t, locale, projectIdFromUrl])

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const pb = getPocketBase()
      const [productData, docsData] = await Promise.all([
        pb.collection("products").getOne<Product>(id, { expand: "category" }),
        pb.collection("product_documents").getFullList<ProductDocument>({ filter: `product = "${id}"`, sort: "-created" }),
      ])
      setProduct(productData)
      setCategory((productData as any).expand?.category || null)
      setDocuments(docsData)
    } catch (err: any) {
      console.error("Error loading product:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Reload documents when they change
  const handleDocumentsChange = useCallback(async () => {
    if (!id) return
    try {
      const pb = getPocketBase()
      const docsData = await pb.collection("product_documents").getFullList<ProductDocument>({ 
        filter: `product = "${id}"`, 
        sort: "-created" 
      })
      setDocuments(docsData)
    } catch (err) {
      console.error("Error reloading documents:", err)
    }
  }, [id])

  const getDisplayName = () => {
    if (!product) return ""
    return locale === 'zh' && product.name_cn ? product.name_cn : product.name
  }

  // 构建带项目上下文的 URL
  const buildUrl = (path: string) => {
    return projectIdFromUrl ? `${path}?project=${projectIdFromUrl}` : path
  }

  // 返回按钮处理
  const handleBack = () => {
    if (projectIdFromUrl) {
      router.push(`/projects/${projectIdFromUrl}?tab=products`)
    } else {
      router.back()
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-3xl font-bold">{getDisplayName()}</h1>
              {category && (
                <Badge variant="outline">
                  <Layers className="h-3 w-3 mr-1" />
                  {locale === 'zh'   ? category.name_cn : category.name}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1 font-mono">{product.code}</p>
          </div>
          <ViewDiskButton
            type="product"
            name={product.code}
            label={locale === 'zh' ? '文件' : 'Files'}
          />
          <Button onClick={() => router.push(buildUrl(`/products/${id}/edit`))}>
            <Edit className="mr-2 h-4 w-4" />
            {t("common.edit")}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">{t("products.tabs.info")}</TabsTrigger>
          <TabsTrigger value="documents">{t("products.tabs.documents")}</TabsTrigger>
        </TabsList>


        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t("products.info.basic")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("products.columns.name")}</p>
                    <p className="font-medium">{
                         (locale === 'zh') ? product.name_cn : product.name
                       }</p>
                  </div>

                  {product.part_number && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t("products.columns.partNumber")}</p>
                      <p className="font-medium font-mono">{product.part_number}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">{t("products.columns.unit")}</p>
                    <p className="font-medium">{product.unit}</p>
                  </div>
                  {product.hs_code && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t("products.columns.hsCode")}</p>
                      <p className="font-medium font-mono">{product.hs_code}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("products.info.description")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="whitespace-pre-wrap">{ locale =='zh'? product.description_cn : product.description }</p>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("products.info.specifications")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-sm text-muted-foreground">{key}</p>
                      <p className="font-medium">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <ProductDocumentManager
            productId={id}
            productCode={product.code}
            productName={getDisplayName()}
            documents={documents}
            onDocumentsChange={handleDocumentsChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
