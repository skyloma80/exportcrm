"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { OrderForm } from "@/components/orders/order-form"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useProjectContext } from "@/hooks/use-project-context"
import { ArrowLeft } from "lucide-react"
import { soService, type SOCreateInput } from "@/lib/pocketbase/services/so"

export default function NewOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumbItems } = useBreadcrumb()

  const projectIdFromUrl = searchParams.get("project")

  // 项目上下文
  const { returnUrl } = useProjectContext({
    documentType: 'order',
    currentPageLabel: t("orders.new")
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Set breadcrumb
  useEffect(() => {
    setBreadcrumbItems([
      { label: t("orders.new") },
    ])
    return () => setBreadcrumbItems([])
  }, [setBreadcrumbItems, t])

  const handleSubmit = async (data: SOCreateInput) => {
    setIsSubmitting(true)
    try {
      // 使用新的 soService 创建扁平化订单
      const record = await soService.create(data)

      toast({
        title: t("orders.createSuccess"),
        description: t("orders.createSuccessDesc"),
      })

      // 导航到详情页
      router.push(`/orders/${record.id}`)
    } catch (err: any) {
      console.error("Create error:", err)
      toast({
        title: t("orders.createError"),
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.push(returnUrl || '/orders')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("orders.new")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("orders.newDescription") || (locale === 'zh' ? '创建新订单' : 'Create a new order')}
            </p>
          </div>
        </div>
      </div>

      <OrderForm
        initialData={{
          project: projectIdFromUrl || undefined,
        } as any}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </div>
  )
}
