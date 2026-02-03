"use client"

/**
 * New Customer Page
 * 新建客户页面
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/use-i18n"
import { ArrowLeft } from "lucide-react"
import { CustomerForm } from "@/components/customers/customer-form"
import { customerService, CustomerCreateInput } from "@/lib/pocketbase/services/customers"
import { useToast } from "@/hooks/use-toast"

export default function NewCustomerPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (data: CustomerCreateInput) => {
    setIsLoading(true)
    try {
      const customer = await customerService.createCustomer(data)
      toast({
        title: t("customers.createSuccess"),
        description: t("customers.createSuccessDesc"),
      })
      router.push(`/customers/${customer.id}`)
    } catch (error: any) {
      console.error("Create customer error:", error)
      toast({
        title: t("customers.createError"),
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("customers.newCustomer")}</h1>
            <p className="text-muted-foreground mt-1">{t("customers.newDescription")}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl">
        <CustomerForm
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
