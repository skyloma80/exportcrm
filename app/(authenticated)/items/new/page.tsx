"use client"

/**
 * Items 新建页面
 * 
 * 创建新的 Item 记录
 */

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ItemForm, ItemFormData } from "@/components/items/item-form"
import { itemService } from "@/hooks/collections"
import { toast } from "@/hooks/use-toast"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Package } from "lucide-react"

export default function NewItemPage() {
  const router = useRouter()
  const { setItems } = useBreadcrumb()
  const { t } = useI18n()

  // Set breadcrumb
  useEffect(() => {
    setItems([
      { label: t("nav.items"), href: "/items" },
      { label: t("items.create.title") },
    ])
    return () => setItems([])
  }, [setItems, t])

  const handleSubmit = async (data: ItemFormData) => {
    try {
      const newItem = await itemService.create(data)
      toast({
        title: t("common.success"),
        description: t("items.createSuccess") || "Item created successfully",
      })
      router.push(`/items/${newItem.id}`)
    } catch (error: any) {
      console.error("Failed to create item:", error)
      toast({
        title: t("common.error"),
        description: error.message || "Failed to create item",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleCancel = () => {
    router.push("/items")
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Package className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">{t("items.create.title")}</h1>
            <p className="text-muted-foreground">{t("items.create.description")}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <ItemForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          title={t("items.create.title")}
        />
      </div>
    </div>
  )
}
