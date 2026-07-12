"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  MoreHorizontal,
  Building2,
  Calendar,
  Loader2,
  RefreshCw
} from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  DataTable, 
  DataTableColumnHeader,
  DataTableRowActions,
} from "@/components/data-table"
import { useI18n } from "@/lib/i18n/use-i18n"
import { soService, type FlatSO } from "@/lib/pocketbase/services/so"
import { useToast } from "@/hooks/use-toast"

export default function OrdersPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { toast } = useToast()
  
  const [data, setData] = useState<FlatSO[]>([])
  const [loading, setLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const result = await soService.getList({ page: 1, perPage: 100, sort: '-code' })
      setData(result.items)
      setTotalItems(result.totalItems)
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default'
      case 'cancelled': return 'destructive'
      case 'confirmed':
      case 'in_production': return 'secondary'
      case 'ready_to_ship': return 'outline'
      case 'shipped':
case 'delivered': return 'outline'
      default: return 'outline'
    }
  }

  const columns: ColumnDef<FlatSO>[] = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("orders.columns.code")} />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-blue-600">
          {row.getValue("code")}
        </span>
      ),
    },
    {
      accessorKey: "customer_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("orders.columns.customer")} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
                {row.original.customer_name || "-"}
            </span>
        </div>
      ),
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("orders.columns.totalAmount")} />
      ),
      cell: ({ row }) => (
        <span className="font-bold">
          {row.original.currency} {row.original.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("orders.columns.status")} />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={getStatusVariant(status)}>
            {t(`orders.status.${status}`) || status}
          </Badge>
        )
      },
    },
    {
        accessorKey: "created",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("orders.columns.date")} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {row.original.created ? format(new Date(row.original.created), 'yyyy-MM-dd') : "-"}
          </span>
        ),
    }
  ], [t, locale, router])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t("orders.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("orders.description")}</p>
        </div>
        <Button onClick={() => router.push("/so/new")}>
          <Plus className="mr-2 h-4 w-4" />
          {t("orders.newOrder")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid griSd-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("orders.stats.total")}</CardDescription>
            <CardTitle className="text-3xl font-bold">{totalItems}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("orders.stats.draft")}</CardDescription>
            <CardTitle className="text-3xl font-bold">{data.filter(o => o.status === 'draft').length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("orders.status.completed")}</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600">{data.filter(o => o.status === 'completed').length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main List */}



          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground mt-2">{t("common.loading")}</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={data}
              searchKey="code"
              onRowClick={(row) => router.push(`/so/${row.id}`)}
            />
          )}


    </div>
  )
}
