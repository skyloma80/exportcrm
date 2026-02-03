"use client"

/**
 * New Supplier Page
 * 新建供应商页面
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useI18n } from "@/lib/i18n/use-i18n"
import { SupplierForm } from "@/components/suppliers/supplier-form"
import { supplierService, SupplierCreateInput } from "@/lib/pocketbase/services/suppliers"
import { useToast } from "@/hooks/use-toast"

export default function NewSupplierPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: SupplierCreateInput) => {
    setIsLoading(true)
    try {
      const supplier = await supplierService.createSupplier(data)
      toast({
        title: t("suppliers.createSuccess"),
        description: t("suppliers.createSuccessDesc"),
      })
      router.push(`/suppliers/${supplier.id}`)
    } catch (error: any) {
      console.error("Create supplier error:", error)
      toast({
        title: t("suppliers.createError"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t("suppliers.newSupplier")}</h1>
          <p className="text-muted-foreground mt-1">{t("suppliers.newDescription")}</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl">
        <SupplierForm
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
