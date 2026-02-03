"use client"

/**
 * Edit Supplier Page
 * 编辑供应商页面
 */

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/use-i18n"
import { SupplierForm } from "@/components/suppliers/supplier-form"
import { 
  supplierService, 
  Supplier, 
  SupplierCreateInput 
} from "@/lib/pocketbase/services/suppliers"
import { useToast } from "@/hooks/use-toast"

export default function EditSupplierPage() {
  const router = useRouter()
  const params = useParams()
  const { t } = useI18n()
  const { toast } = useToast()
  const id = params.id as string

  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    loadSupplier()
  }, [id])

  const loadSupplier = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await supplierService.getOne(id)
      setSupplier(data)
    } catch (err: any) {
      console.error("Load supplier error:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: SupplierCreateInput) => {
    setIsSubmitting(true)
    try {
      await supplierService.updateSupplier(id, data)
      toast({
        title: t("suppliers.updateSuccess"),
        description: t("suppliers.updateSuccessDesc"),
      })
      router.push(`/suppliers/${id}`)
    } catch (error: any) {
      console.error("Update supplier error:", error)
      toast({
        title: t("suppliers.updateError"),
        description: error.message,
        variant: "destructive",
      })
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

  if (error || !supplier) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>{t("common.error")}: {error?.message || t("suppliers.notFound")}</p>
              <Button variant="outline" onClick={() => router.back()} className="mt-4">
                {t("common.back")}
              </Button>
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
        <div>
          <h1 className="text-3xl font-bold">{t("suppliers.edit")}</h1>
          <p className="text-muted-foreground mt-1">{supplier.name}</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl">
        <SupplierForm
          initialData={supplier}
          onSubmit={handleSubmit}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  )
}
