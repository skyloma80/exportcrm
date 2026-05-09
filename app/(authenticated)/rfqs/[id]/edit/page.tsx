"use client"

/**
 * Edit RFQ Page
 * 编辑询价单页面
 * 
 * 强制项目上下文：必须通过 URL 参数 `project` 传递项目 ID，否则返回 404
 * Requirements: 1.1, 4.2, 4.3
 */

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { notFound } from "next/navigation"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Loader2 } from "lucide-react"
import { RFQForm, RFQFormData } from "@/components/rfqs/rfq-form"
import { ProductSelectItem } from "@/lib/pocketbase/services/products"
import { SupplierSelectItem } from "@/components/rfqs/supplier-select-dialog"
import { 
  rfqService, 
  rfqItemService, 
  rfqSupplierService,
  RFQWithExpand 
} from "@/lib/pocketbase/services/rfqs"
import { useToast } from "@/hooks/use-toast"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useProjectContext } from "@/hooks/use-project-context"

export default function EditRFQPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()
  const rfqId = params.id as string
  
  // 获取项目参数
  const projectIdFromUrl = searchParams.get("project")
  
  // 强制项目上下文：无项目参数返回 404 (Requirements: 1.1)
  if (!projectIdFromUrl) {
    notFound()
  }
  
  // 使用项目上下文 Hook 获取返回 URL
  const { 
    loading: contextLoading,
    returnUrl 
  } = useProjectContext({
    documentType: 'rfq'
  })

  const [rfq, setRfq] = useState<RFQWithExpand | null>(null)
  const [items, setItems] = useState<ProductSelectItem[]>([])
  const [suppliers, setSuppliers] = useState<SupplierSelectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 设置面包屑 (Requirements: 2.1)
  // 注意：只设置当前页面标签，客户和项目信息由 layout 根据 URL 参数自动添加
  useEffect(() => {
    if (rfq) {
      setBreadcrumb([
        { label: rfq.code, href: `/rfqs/${rfqId}?project=${projectIdFromUrl}` },
        { label: t("common.edit") },
      ])
    }
    return () => setBreadcrumb([])
  }, [rfq, setBreadcrumb, t, rfqId, projectIdFromUrl])

  useEffect(() => {
    loadRFQData()
  }, [rfqId])

  const loadRFQData = async () => {
    setLoading(true)
    try {
      // Load RFQ with details
      const rfqData = await rfqService.getWithDetails(rfqId)
      if (!rfqData) {
        toast({
          title: t("common.error"),
          description: t("rfqs.notFound"),
          variant: "destructive",
        })
        router.push("/rfqs")
        return
      }
      setRfq(rfqData)

      // Transform items
      const rfqItems = rfqData.expand?.rfq_items_via_rfq || []
      const transformedItems: ProductSelectItem[] = rfqItems.map(item => ({
        product: item.product,
        productName: item.expand?.product?.name || "",
        productNameCn: item.expand?.product?.name_cn,
        productCode: item.expand?.product?.code || "",
        unit: item.expand?.product?.unit || "",
        quantity: item.quantity,
        target_price: item.target_price,
        remarks: item.remarks,
      }))
      setItems(transformedItems)

      // Transform suppliers
      const rfqSuppliers = rfqData.expand?.rfq_suppliers_via_rfq || []
      const transformedSuppliers: SupplierSelectItem[] = rfqSuppliers.map(s => ({
        id: s.supplier,
        name: s.expand?.supplier?.name || "",
        name_cn: s.expand?.supplier?.name_cn,
        code: s.expand?.supplier?.code || "",
        country: "",
        type: "",
      }))
      setSuppliers(transformedSuppliers)
    } catch (error) {
      console.error("Error loading RFQ:", error)
      toast({
        title: t("common.error"),
        description: String(error),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: RFQFormData) => {
    setIsSubmitting(true)
    try {
      // Update RFQ basic info
      await rfqService.update(rfqId, {
        deadline: data.deadline || undefined,
        remarks: data.remarks || undefined,
      })

      // Get existing items and suppliers
      const existingItems = await rfqItemService.getByRFQ(rfqId)
      const existingSuppliers = await rfqSupplierService.getByRFQ(rfqId)

      // Delete removed items
      const newProductIds = new Set(data.items.map(i => i.product))
      for (const item of existingItems) {
        if (!newProductIds.has(item.product)) {
          await rfqItemService.delete(item.id)
        }
      }

      // Add new items or update existing
      const existingProductIds = new Set(existingItems.map(i => i.product))
      for (const item of data.items) {
        if (existingProductIds.has(item.product)) {
          // Update existing item
          const existingItem = existingItems.find(i => i.product === item.product)
          if (existingItem) {
            await rfqItemService.update(existingItem.id, {
              quantity: item.quantity,
              target_price: item.target_price,
              remarks: item.remarks,
            })
          }
        } else {
          // Create new item
          await rfqItemService.createItem({
            rfq: rfqId,
            product: item.product,
            quantity: item.quantity,
            target_price: item.target_price,
            remarks: item.remarks,
          })
        }
      }

      // Delete removed suppliers
      const newSupplierIds = new Set(data.suppliers.map(s => s.id))
      for (const supplier of existingSuppliers) {
        if (!newSupplierIds.has(supplier.supplier)) {
          await rfqSupplierService.delete(supplier.id)
        }
      }

      // Add new suppliers
      const existingSupplierIds = new Set(existingSuppliers.map(s => s.supplier))
      for (const supplier of data.suppliers) {
        if (!existingSupplierIds.has(supplier.id)) {
          await rfqSupplierService.addSupplier({
            rfq: rfqId,
            supplier: supplier.id,
          })
        }
      }

      toast({
        title: t("rfqs.updateSuccess"),
        description: t("rfqs.updateSuccessDesc"),
      })
      
      // 保存后返回项目详情页 (Requirements: 4.2)
      router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=rfqs`)
    } catch (error: any) {
      console.error("Update RFQ error:", error)
      toast({
        title: t("rfqs.updateError"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || contextLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!rfq) {
    return null
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t("rfqs.edit")}</h1>
          <p className="text-muted-foreground mt-1">{rfq.code}</p>
        </div>
      </div>

      {/* Form - 编辑时项目字段锁定，不允许修改 */}
      <RFQForm
        initialData={{
          ...rfq,
          items,
          suppliers,
          projectData: rfq.expand?.project ? {
            id: rfq.expand.project.id,
            code: rfq.expand.project.code,
            name: rfq.expand.project.name,
            name_cn: rfq.expand.project.name_cn,
            expand: rfq.expand.project.expand,
          } : undefined,
        }}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        projectLocked={true}
      />
    </div>
  )
}
