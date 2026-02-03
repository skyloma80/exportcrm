"use client"

/**
 * Purchase Orders Tab Component
 * 采购订单标签页组件
 * 
 * 在销售订单详情页显示和管理采购订单
 */

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { getPocketBase } from "@/lib/pocketbase/auth"
import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions
} from "@/components/data-table"
import {
  ShoppingCart,
  Loader2,
  Package,
  AlertCircle,
} from "lucide-react"
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

interface PurchaseOrder {
  id: string
  code: string
  type: string
  supplier: string
  status: string
  currency: string
  total_amount: number
  paid_amount?: number
  expected_delivery_date?: string
  created: string
  expand?: {
    supplier?: {
      id: string
      code: string
      name: string
      name_cn?: string
    }
  }
}

interface PurchaseOrdersTabProps {
  orderId: string
  projectId: string
  orderStatus: string
}

export function PurchaseOrdersTab({ orderId, projectId, orderStatus }: PurchaseOrdersTabProps) {
  const router = useRouter()
  const { t, locale } = useI18n()
  const { toast } = useToast()

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [hasCostTable, setHasCostTable] = useState(false)
  const [costTableConfirmed, setCostTableConfirmed] = useState(false)

  useEffect(() => {
    loadData()
  }, [orderId, projectId])

  const loadData = async () => {
    setLoading(true)
    try {
      const pb = getPocketBase()

      // Load purchase orders for this order
      const pos = await pb.collection("purchase_orders").getFullList<PurchaseOrder>({
        filter: `order = "${orderId}"`,
        expand: "supplier",
        sort: "-created",
      })
      setPurchaseOrders(pos)

      // Check if cost table exists and is confirmed
      const costTableResponse = await fetch(`/api/projects/${projectId}/cost-table`)
      if (costTableResponse.ok) {
        const data = await costTableResponse.json()
        setHasCostTable(!!data.costTable)
        setCostTableConfirmed(data.costTable?.status === "confirmed")
      }
    } catch (error) {
      console.error("Error loading purchase orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFromCostTable = async () => {
    setCreating(true)
    try {
      const response = await fetch(`/api/orders/${orderId}/purchase-orders`, {
        method: "POST",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create purchase orders")
      }

      const data = await response.json()

      toast({
        title: t("common.success"),
        description: locale === "zh"
          ? `已创建 ${data.supplierCount} 个采购订单`
          : `Created ${data.supplierCount} purchase orders`,
      })

      loadData()
    } catch (error: any) {
      console.error("Error creating purchase orders:", error)
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setCreating(false)
      setConfirmDialogOpen(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return "bg-emerald-100 text-emerald-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "confirmed":
      case "in_production":
        return "bg-green-100 text-green-800"
      case "sent":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getDisplayName = (item?: { name: string; name_cn?: string }) => {
    if (!item) return "-"
    return locale === "zh" && item.name_cn ? item.name_cn : item.name
  }

  const formatCurrency = (amount: number, currency: string = "CNY") => {
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")
  }

  const navigateToPO = (po: PurchaseOrder) => {
    router.push(`/purchase-orders/${po.id}?project=${projectId}`)
  }

  const columns: ColumnDef<PurchaseOrder>[] = useMemo(() => [
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
        const status = row.getValue("status") as string
        return (
          <Badge variant="outline" className={getStatusColor(status)}>
            {t(`purchaseOrders.status.${status}`) || status}
          </Badge>
        )
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
      accessorKey: "expected_delivery_date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("purchaseOrders.columns.expectedDelivery")} />
      ),
      cell: ({ row }) => formatDate(row.getValue("expected_delivery_date")),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={(item) => navigateToPO(item)}
          onEdit={(item) => router.push(`/purchase-orders/${item.id}/edit?project=${projectId}`)}
        />
      ),
    },
  ], [t, locale, projectId, router])

  // 只有订单状态为 confirmed 或之后才能创建采购订单
  const canCreatePO = ["draft", "confirmed", "in_production", "ready_to_ship", "shipped", "delivered"].includes(orderStatus)

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground mt-2">{t("common.loading")}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div />
          {canCreatePO && hasCostTable && costTableConfirmed && purchaseOrders.length === 0 && (
            <Button onClick={() => setConfirmDialogOpen(true)} disabled={creating}>
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShoppingCart className="mr-2 h-4 w-4" />
              )}
              {locale === "zh" ? "从成本表生成" : "Generate from Cost Table"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Warning if no cost table */}
          {!hasCostTable && canCreatePO && (
            <div className="flex items-start gap-3 p-4 mb-4 rounded-lg border border-orange-200 bg-orange-50">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">
                  {locale === "zh" ? "暂无成本表" : "No Cost Table"}
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  {locale === "zh"
                    ? "请先在项目中创建并确认成本表，然后才能生成采购订单"
                    : "Please create and confirm a cost table in the project first"}
                </p>
                <Button
                  variant="link"
                  className="p-0 h-auto text-orange-700 mt-2"
                  onClick={() => router.push(`/projects/${projectId}/cost-table`)}
                >
                  {locale === "zh" ? "前往成本表 →" : "Go to Cost Table →"}
                </Button>
              </div>
            </div>
          )}

          {/* Warning if cost table not confirmed */}
          {hasCostTable && !costTableConfirmed && canCreatePO && (
            <div className="flex items-start gap-3 p-4 mb-4 rounded-lg border border-orange-200 bg-orange-50">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">
                  {locale === "zh" ? "成本表未确认" : "Cost Table Not Confirmed"}
                </p>
                <p className="text-sm text-orange-700 mt-1">
                  {locale === "zh"
                    ? "请先确认成本表，然后才能生成采购订单"
                    : "Please confirm the cost table first before generating purchase orders"}
                </p>
                <Button
                  variant="link"
                  className="p-0 h-auto text-orange-700 mt-2"
                  onClick={() => router.push(`/projects/${projectId}/cost-table`)}
                >
                  {locale === "zh" ? "前往成本表 →" : "Go to Cost Table →"}
                </Button>
              </div>
            </div>
          )}

          {purchaseOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                {locale === "zh" ? "暂无采购订单" : "No purchase orders yet"}
              </p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={purchaseOrders}
              searchKey="code"
              onRowClick={navigateToPO}
            />
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {locale === "zh" ? "生成采购订单" : "Generate Purchase Orders"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {locale === "zh"
                ? "将根据项目成本表中的供应商选择，为每个供应商生成一个采购订单。确定要继续吗？"
                : "This will create a purchase order for each supplier based on the project cost table. Continue?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateFromCostTable} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {locale === "zh" ? "确定生成" : "Generate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
