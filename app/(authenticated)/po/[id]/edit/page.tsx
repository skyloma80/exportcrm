"use client"

import React, { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { POForm } from "@/components/po/po-form"
import { poService, POCreateInput, FlatPO } from "@/lib/pocketbase/services/po"

export default function EditPOPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  
  const unwrappedParams = use(params)
  const poId = unwrappedParams.id
  const [po, setPo] = useState<FlatPO | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      console.log("Loading PO details for Edit, ID:", poId)
      try {
        const data = await poService.getOne(poId)
        console.log("Loaded PO data for Edit:", data)
        setPo(data as FlatPO)
      } catch (err: any) {
        console.error("Failed to load PO for Edit:", err)
        toast({
          title: "加载失败",
          description: String(err),
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    if (poId) {
      loadData()
    }
  }, [poId, toast])

  const handleSubmit = async (data: POCreateInput) => {
    setIsSubmitting(true)
    try {
      await poService.update(poId, data as any)
      
      toast({
        title: "更新成功",
      })
      router.push(`/po/${poId}`)
    } catch (error: any) {
      console.error("Error updating PO:", error)
      let errMsg = error.message;
      if (error.response?.data) {
        errMsg += "\n" + JSON.stringify(error.response.data, null, 2);
        alert(`保存失败:\n${errMsg}`);
      }
      toast({
        title: "更新失败",
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

  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>
  }

  if (!po) {
    return <div className="flex justify-center items-center h-64">找不到采购订单</div>
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">编辑采购订单</h1>
          <p className="text-muted-foreground mt-1 font-mono">{po.code}</p>
        </div>
      </div>

      <POForm initialData={po} onSubmit={handleSubmit} isLoading={isSubmitting} />
    </div>
  )
}

