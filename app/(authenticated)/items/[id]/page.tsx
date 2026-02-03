"use client"

/**
 * Items 详情页面
 * 
 * 显示单个 Item 的完整信息，提供编辑和删除功能
 */

import { useState, use, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DeleteDialog } from "@/components/items/delete-dialog"
import { useItem, itemService } from "@/hooks/collections"
import { toast } from "@/hooks/use-toast"
import { Pencil, Trash2, Package, Loader2, Calendar, Hash } from "lucide-react"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { useI18n } from "@/lib/i18n/use-i18n"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ItemDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: item, loading, error } = useItem(id)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { setItems } = useBreadcrumb()
  const { t } = useI18n()

  // Set breadcrumb when item loads
  useEffect(() => {
    if (item) {
      setItems([
        { label: t("nav.items"), href: "/items" },
        { label: item.name },
      ])
    }
    return () => setItems([])
  }, [item, setItems, t])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await itemService.delete(id)
      toast({
        title: t("common.success"),
        description: t("items.deleteSuccess") || "Item deleted successfully",
      })
      router.push("/items")
    } catch (error: any) {
      console.error("Failed to delete item:", error)
      toast({
        title: t("common.error"),
        description: error.message || "Failed to delete item",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "inactive":
        return "secondary"
      case "pending":
        return "outline"
      default:
        return "secondary"
    }
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
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Package className="h-10 w-10 text-muted-foreground mt-1" />
            <div>
              <h1 className="text-2xl font-bold">{item.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getStatusVariant(item.status)}>
                  {t(`items.status.${item.status}`)}
                </Badge>
                <span className="text-sm text-muted-foreground font-mono">
                  #{item.id}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/items/${item.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-2" />
                {t("items.actions.edit")}
              </Button>
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("items.actions.delete")}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("items.detail.basicInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  {t("items.columns.name")}
                </div>
                <div className="text-foreground">{item.name}</div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  {t("items.columns.description")}
                </div>
                <div className="text-foreground whitespace-pre-wrap">
                  {item.description || (
                    <span className="text-muted-foreground italic">
                      {t("items.noDescription") || "No description"}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  {t("items.columns.status")}
                </div>
                <Badge variant={getStatusVariant(item.status)}>
                  {t(`items.status.${item.status}`)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Metadata */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("items.detail.metadata")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {t("items.detail.created")}
                  </div>
                  <div className="text-sm">
                    {item.created
                      ? new Date(item.created).toLocaleString()
                      : "-"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {t("items.detail.updated")}
                  </div>
                  <div className="text-sm">
                    {item.updated
                      ? new Date(item.updated).toLocaleString()
                      : "-"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    ID
                  </div>
                  <div className="text-sm font-mono">{item.id}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={item.name}
        onConfirm={handleDelete}
        isLoading={deleting}
      />
    </div>
  )
}
