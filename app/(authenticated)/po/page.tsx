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
import { poService, type FlatPO } from "@/lib/pocketbase/services/po"
import { useToast } from "@/hooks/use-toast"

export default function POListPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { toast } = useToast()
  
  const [data, setData] = useState<FlatPO[]>([])
  const [loading, setLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const result = await poService.getList({ page: 1, perPage: 100, sort: '-code' })
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
      case 'shipped':
      case 'delivered': return 'outline'
      default: return 'outline'
    }
  }

  const columns: ColumnDef<FlatPO>[] = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="订单号" />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-blue-600">
          {row.getValue("code")}
        </span>
      ),
    },
    {
      accessorKey: "supplier_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="供应商" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
                {row.original.supplier_name || "-"}
            </span>
        </div>
      ),
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="总金额" />
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
        <DataTableColumnHeader column={column} title="状态" />
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
      accessorKey: "expected_delivery_date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="交货期" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {row.original.expected_delivery_date ? format(new Date(row.original.expected_delivery_date), 'yyyy-MM-dd') : "-"}
        </span>
      ),
    },
    {
      accessorKey: "created",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="创建日期" />
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
          <h1 className="text-3xl font-bold">{t("nav.purchaseOrders")}</h1>
          <p className="text-muted-foreground mt-1">管理所有采购订单</p>
        </div>
        <Button onClick={() => router.push("/po/new")}>
          <Plus className="mr-2 h-4 w-4" />
          新建订单
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>采购订单总数</CardDescription>
            <CardTitle className="text-3xl font-bold">{totalItems}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>草稿</CardDescription>
            <CardTitle className="text-3xl font-bold">{data.filter(o => o.status === 'draft').length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>已完成</CardDescription>
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
          onRowClick={(row) => router.push(`/po/${row.id}`)}
        />
      )}
    </div>
  )
}
