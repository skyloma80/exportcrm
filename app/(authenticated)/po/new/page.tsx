"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { POForm } from "@/components/po/po-form"
import { poService, POCreateInput } from "@/lib/pocketbase/services/po"

export default function NewPOPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: POCreateInput) => {
    setIsSubmitting(true)
    try {
      const record = await poService.create(data as any)
      
      toast({
        title: "创建成功",
        description: `${data.code} 已创建。`,
      })
      router.push(`/po/${record.id}`)
    } catch (error: any) {
      console.error("Error creating PO:", error)
      toast({
        title: "创建失败",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">新建采购订单</h1>
        </div>
      </div>

      <POForm onSubmit={handleSubmit} isLoading={isSubmitting} />
    </div>
  )
}

