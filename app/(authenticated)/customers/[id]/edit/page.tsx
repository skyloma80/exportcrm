"use client"

/**
 * Edit Customer Page
 * 编辑客户页面
 */

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/use-i18n"
import { ArrowLeft } from "lucide-react"
import { CustomerForm } from "@/components/customers/customer-form"
import { 
  customerService, 
  Customer, 
  CustomerCreateInput 
} from "@/lib/pocketbase/services/customers"
import { useToast } from "@/hooks/use-toast"

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const { t } = useI18n()
  const { toast } = useToast()
  const id = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    loadCustomer()
  }, [id])

  const loadCustomer = async () => {
    if (!id) return
    setLoading(true)
    try {
      const data = await customerService.getOne(id)
      setCustomer(data)
    } catch (err: any) {
      console.error("Load customer error:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: CustomerCreateInput) => {
    setIsSubmitting(true)
    try {
      await customerService.updateCustomer(id, data)
      toast({
        title: t("customers.updateSuccess"),
        description: t("customers.updateSuccessDesc"),
      })
      router.push(`/customers/${id}`)
    } catch (error: any) {
      console.error("Update customer error:", error)
      toast({
        title: t("customers.updateError"),
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

  if (error || !customer) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>{t("common.error")}: {error?.message || t("customers.detail.notFound")}</p>
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("customers.edit")}</h1>
            <p className="text-muted-foreground mt-1">{customer.name}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl">
        <CustomerForm
          initialData={customer}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={isSubmitting}
        />
      </div>
    </div>
  )
}
