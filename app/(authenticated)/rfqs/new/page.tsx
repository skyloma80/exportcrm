"use client"

/**
 * New RFQ Page
 * 新建询价单页面
 * 
 * 强制项目上下文：必须通过 URL 参数 `project` 传递项目 ID，否则返回 404
 * Requirements: 1.1, 3.1, 4.1
 */

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { notFound } from "next/navigation"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Loader2 } from "lucide-react"
import { RFQForm, RFQFormData } from "@/components/rfqs/rfq-form"
import { rfqService, rfqItemService, rfqSupplierService } from "@/lib/pocketbase/services/rfqs"
import { projectService, ProjectWithRelations } from "@/lib/pocketbase/services/projects"
import { useToast } from "@/hooks/use-toast"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useProjectContext } from "@/hooks/use-project-context"

export default function NewRFQPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()
  const [isLoading, setIsLoading] = useState(false)
  const [initialProject, setInitialProject] = useState<ProjectWithRelations | null>(null)
  const [loadingProject, setLoadingProject] = useState(false)
  
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
    documentType: 'rfq',
    currentPageLabel: t("rfqs.newRfq")
  })

  // 设置面包屑 (Requirements: 2.1)
  // 注意：只设置当前页面标签，客户和项目信息由 layout 根据 URL 参数自动添加
  useEffect(() => {
    setBreadcrumb([
      { label: t("rfqs.newRfq") },
    ])
    return () => setBreadcrumb([])
  }, [setBreadcrumb, t])

  // Load project data if project ID is in URL
  useEffect(() => {
    if (projectIdFromUrl) {
      setLoadingProject(true)
      projectService.getWithRelations(projectIdFromUrl)
        .then((project) => {
          if (project) {
            setInitialProject(project)
          }
        })
        .catch((error) => {
          console.error("Error loading project:", error)
        })
        .finally(() => {
          setLoadingProject(false)
        })
    }
  }, [projectIdFromUrl])

  const handleSubmit = async (data: RFQFormData, sendEmail?: boolean) => {
    setIsLoading(true)
    try {
      // Create the RFQ
      const rfqData: any = {
        project: data.project,
        status: data.status,
      }
      
      // Only include optional fields if they have values
      if (data.deadline) {
        rfqData.deadline = data.deadline
      }
      if (data.remarks) {
        rfqData.remarks = data.remarks
      }
      
      const rfq = await rfqService.createRFQ(rfqData)

      // Create RFQ items
      if (data.items.length > 0) {
        await Promise.all(
          data.items.map((item) =>
            rfqItemService.createItem({
              rfq: rfq.id,
              product: item.product,
              quantity: item.quantity,
              target_price: item.target_price,
              remarks: item.remarks,
            })
          )
        )
      }

      // Add suppliers to RFQ
      if (data.suppliers.length > 0) {
        await Promise.all(
          data.suppliers.map((supplier) =>
            rfqSupplierService.addSupplier({
              rfq: rfq.id,
              supplier: supplier.id,
            })
          )
        )
      }

      // 如果需要发送邮件
      if (sendEmail && data.suppliers.length > 0) {
        try {
          const supplierIds = data.suppliers.map(s => s.id)
          const response = await fetch(`/api/rfqs/${rfq.id}/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supplierIds }),
          })
          
          if (response.ok) {
            toast({
              title: t("rfqs.sendSuccess"),
              description: t("rfqs.sendSuccessDesc"),
            })
          } else {
            const errorData = await response.json()
            toast({
              title: t("rfqs.sendError"),
              description: errorData.error || t("rfqs.sendErrorDesc"),
              variant: "destructive",
            })
          }
        } catch (emailError) {
          console.error("Send email error:", emailError)
          toast({
            title: t("rfqs.sendError"),
            description: t("rfqs.sendErrorDesc"),
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: t("rfqs.createSuccess"),
          description: t("rfqs.createSuccessDesc"),
        })
      }
      
      // 保存后返回项目详情页的询价标签页 (Requirements: 4.1)
      router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=rfqs`)
    } catch (error: any) {
      console.error("Create RFQ error:", error)
      console.error("Error details:", {
        status: error.status,
        response: error.response,
        data: error.data,
        message: error.message,
      })
      // Print data fields if available
      if (error.data) {
        console.error("Error data fields:", JSON.stringify(error.data, null, 2))
      }
      toast({
        title: t("rfqs.createError"),
        description: error.data?.message || error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Build initial data for form
  const getInitialData = () => {
    if (!initialProject) return undefined
    return {
      project: initialProject.id,
      projectData: {
        id: initialProject.id,
        code: initialProject.code,
        name: initialProject.name,
        name_cn: initialProject.name_cn,
        expand: initialProject.expand?.customer ? {
          customer: {
            id: initialProject.expand.customer.id,
            code: initialProject.expand.customer.code,
            name: initialProject.expand.customer.name,
            name_cn: initialProject.expand.customer.name_cn,
          }
        } : undefined
      }
    }
  }

  if (loadingProject || contextLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t("rfqs.newRfq")}</h1>
          <p className="text-muted-foreground mt-1">{t("rfqs.newDescription")}</p>
        </div>
      </div>

      {/* Form - 项目选择器已隐藏 (Requirements: 3.1) */}
      <RFQForm
        initialData={getInitialData()}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        projectLocked={true}
      />
    </div>
  )
}
