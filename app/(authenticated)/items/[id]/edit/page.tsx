"use client"

/**
 * Items 编辑页面
 * 
 * 编辑现有的 Item 记录
 */

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ItemForm, ItemFormData } from "@/components/items/item-form"
import { useItem, itemService } from "@/hooks/collections"
import { toast } from "@/hooks/use-toast"
import { Package, Loader2 } from "lucide-react"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useI18n } from "@/lib/i18n/use-i18n"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditItemPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: item, loading, error } = useItem(id)
  const { setItems } = useBreadcrumb()
  const { t } = useI18n()

  // Set breadcrumb when item loads
  useEffect(() => {
    if (item) {
      setItems([
        { label: t("nav.items"), href: "/items" },
        { label: item.name, href: `/items/${id}` },
        { label: t("items.edit.title") },
      ])
    }
    return () => setItems([])
  }, [item, setItems, t, id])

  const handleSubmit = async (data: ItemFormData) => {
    try {
      await itemService.update(id, data)
      toast({
        title: t("common.success"),
        description: t("items.updateSuccess") || "Item updated successfully",
      })
      router.push(`/items/${id}`)
    } catch (error: any) {
      console.error("Failed to update item:", error)
      toast({
        title: t("common.error"),
        description: error.message || "Failed to update item",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleCancel = () => {
    router.push(`/items/${id}`)
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    )
  }

  // Error or not found state
  if (error || !item) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <h2 className="mt-4 text-xl font-semibold">
                {t("items.detail.notFound")}
              </h2>
              <p className="mt-2 text-muted-foreground text-center">
                {t("items.detail.notFoundDescription")}
              </p>
              <Link href="/items">
                <Button className="mt-4">{t("items.detail.backToItems")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Package className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">{t("items.edit.title")}</h1>
            <p className="text-muted-foreground">{t("items.edit.description")}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <ItemForm
          initialData={item}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          title={item.name}
        />
      </div>
    </div>
  )
}
