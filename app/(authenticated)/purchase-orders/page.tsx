"use client"

/**
 * Purchase Orders List Page
 * 采购订单列表页 - 全局只读视图
 */

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
} from "@/components/data-table"
import { ShoppingBag, Loader2 } from "lucide-react"
import { purchaseOrderService, PurchaseOrderWithExpand, POStatus } from "@/lib/pocketbase/services/purchase-orders"
import { useToast } from "@/hooks/use-toast"
import { getPocketBase } from "@/lib/pocketbase/auth"

const STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Confirmed", value: "confirmed" },
  { label: "In Production", value: "in_production" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
]

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithExpand[]>([])
  const [loading, setLoading] = useState(true)
  const [selectProjectDialogOpen, setSelectProjectDialogOpen] = useState(false)

  useEffect(() => {
    loadPurchaseOrders()
  }, [])

  const loadPurchaseOrders = async () => {
    setLoading(true)
    try {
      const pb = getPocketBase()
      const data = await pb.collection("purchase_orders").getFullList<PurchaseOrderWithExpand>({
        sort: "-created",
        expand: "project,supplier,order,rfq",
      })
      setPurchaseOrders(data)
    } catch (error) {
      console.error("Error loading purchase orders:", error)
      toast({
        title: t("common.error"),
        description: String(error),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: POStatus) => {
    const colors: Record<POStatus, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      in_production: "bg-yellow-100 text-yellow-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-indigo-100 text-indigo-800",
      completed: "bg-emerald-100 text-emerald-800",
      cancelled: "bg-red-100 text-red-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const getDisplayName = (item?: { name?: string; name_cn?: string }) => {
    if (!item) return "-"
    if (locale === "zh" && item.name_cn) return item.name_cn
    return item.name || "-"
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Navigate to purchase order with project parameter
  const navigateToPurchaseOrder = (po: PurchaseOrderWithExpand, path: string = "") => {
    const projectId = po.project
    const url = `/purchase-orders/${po.id}${path}?project=${projectId}`
    router.push(url)
  }

  const handleDelete = async (po: PurchaseOrderWithExpand) => {
    if (!confirm(t("purchaseOrders.deleteConfirm"))) return
    
    try {
      await purchaseOrderService.delete(po.id)
      toast({
        title: t("common.success"),
        description: t("purchaseOrders.deleteSuccess") || "Purchase order deleted successfully",
      })
      loadPurchaseOrders()
    } catch (error: any) {
      toast({
        title: t("purchaseOrders.deleteError"),
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const columns: ColumnDef<PurchaseOrderWithExpand>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("purchaseOrders.columns.code")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.getValue("code")}</span>
        ),
      },
      {
        id: "project",
        accessorFn: (row) => row.expand?.project?.name || "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("purchaseOrders.columns.project")} />
        ),
        cell: ({ row }) => {
          const project = row.original.expand?.project
          return project ? getDisplayName(project) : "-"
        },
      },
      {
        id: "supplier",
        accessorFn: (row) => row.expand?.supplier?.name || "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("purchaseOrders.columns.supplier")} />
        ),
        cell: ({ row }) => {
          const supplier = row.original.expand?.supplier
          return supplier ? getDisplayName(supplier) : "-"
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("purchaseOrders.columns.status")} />
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as POStatus
          return (
            <Badge variant="outline" className={getStatusColor(status)}>
              {t(`purchaseOrders.status.${status}`)}
            </Badge>
          )
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
      },
      {
        accessorKey: "total_amount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("purchaseOrders.columns.totalAmount")} />
        ),
        cell: ({ row }) => {
          const amount = row.getValue("total_amount") as number
          const currency = row.original.currency
          return (
            <span className="font-medium">
              {formatCurrency(amount, currency)}
            </span>
          )
        },
      },
      {
        id: "payment_progress",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("purchaseOrders.columns.paidAmount")} />
        ),
        cell: ({ row }) => {
          const total = row.original.total_amount || 0
          const paid = row.original.paid_amount || 0
          const progress = total > 0 ? Math.round((paid / total) * 100) : 0
          return (
            <div className="flex items-center gap-2 min-w-[120px]">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground w-10">{progress}%</span>
            </div>
          )
        },
      },
      {
        accessorKey: "created",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("common.created")} />
        ),
        cell: ({ row }) => new Date(row.getValue("created")).toLocaleDateString(),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <DataTableRowActions
            row={row}
            onView={(item) => navigateToPurchaseOrder(item)}
            onEdit={(item) => navigateToPurchaseOrder(item, "/edit")}
            onDelete={(item) => handleDelete(item)}
          />
        ),
      },
    ],
    [t, locale, router]
  )

  // Stats
  const stats = useMemo(() => ({
    total: purchaseOrders.length,
    draft: purchaseOrders.filter(po => po.status === "draft").length,
    confirmed: purchaseOrders.filter(po => po.status === "confirmed").length,
    pendingPayment: purchaseOrders
      .filter(po => po.status !== "cancelled" && po.status !== "completed")
      .reduce((sum, po) => sum + (po.total_amount - (po.paid_amount || 0)), 0),
  }), [purchaseOrders])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t("purchaseOrders.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("purchaseOrders.description")}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("purchaseOrders.stats.total")}</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("purchaseOrders.stats.draft")}</CardDescription>
            <CardTitle className="text-3xl">{stats.draft}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("purchaseOrders.stats.confirmed")}</CardDescription>
            <CardTitle className="text-3xl">{stats.confirmed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("purchaseOrders.stats.pendingPayment")}</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(stats.pendingPayment, 'USD')}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* DataTable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {t("purchaseOrders.listTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground mt-2">{t("common.loading")}</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={purchaseOrders}
              searchKey="code"
              filterableColumns={[
                {
                  id: "status",
                  title: t("purchaseOrders.columns.status"),
                  options: STATUS_OPTIONS.map((opt) => ({
                    ...opt,
                    label: t(`purchaseOrders.status.${opt.value}`),
                  })),
                },
              ]}
              onRowClick={(row) => navigateToPurchaseOrder(row)}
            />
          )}
        </CardContent>
      </Card>

      {/* Select Project First Dialog */}
      <AlertDialog open={selectProjectDialogOpen} onOpenChange={setSelectProjectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.selectProjectFirst")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("purchaseOrders.selectProjectDescription") || "请先从项目详情页创建采购单，以便系统自动关联项目信息。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/projects")}>
              {t("projects.title")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
