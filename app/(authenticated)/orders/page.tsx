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
  ArrowLeftRight,
  FolderKanban,
  Building2,
  Calendar,
  DollarSign,
  Loader2
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
import { ProjectSelect } from "@/components/ui/project-select"
import { useI18n } from "@/lib/i18n/use-i18n"
import { orderService, OrderWithExpand } from "@/lib/pocketbase/services/orders"
import { useToast } from "@/hooks/use-toast"

export default function OrdersPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { toast } = useToast()
  
  const [data, setData] = useState<OrderWithExpand[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [totalItems, setTotalItems] = useState(0)

  useEffect(() => {
    loadOrders()
  }, [selectedProject])

  const loadOrders = async () => {
    setLoading(true)
    try {
      let filter = ""
      if (selectedProject) {
        filter = `project = "${selectedProject}"`
      }
      
      const result = await orderService.getListWithExpand(1, 100, filter)
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
    const variants: Record<string, any> = {
      draft: "secondary",
      confirmed: "default",
      in_production: "warning",
      ready_to_ship: "info",
      shipped: "success",
      delivered: "success",
      completed: "success",
      cancelled: "destructive",
    }
    return variants[status] || "secondary"
  }

  const columns: ColumnDef<OrderWithExpand>[] = useMemo(() => [
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
      accessorKey: "customer",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("orders.columns.customer")} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
                {locale === 'zh' && row.original.expand?.customer?.name_cn 
                    ? row.original.expand.customer.name_cn 
                    : row.original.expand?.customer?.name || t("common.independent") || "Independent"}
            </span>
        </div>
      ),
    },
    {
      accessorKey: "project",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("orders.columns.project")} />
      ),
      cell: ({ row }) => (
        row.original.expand?.project ? (
            <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                    {locale === 'zh' && row.original.expand.project.name_cn 
                        ? row.original.expand.project.name_cn 
                        : row.original.expand.project.name}
                </span>
            </div>
        ) : (
            <span className="text-muted-foreground italic text-xs">-</span>
        )
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
            {t(`orders.status.${status}`)}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={(item) => router.push(`/orders/${item.id}`)}
          onEdit={(item) => router.push(`/orders/${item.id}/edit`)}
          extraActions={[
            {
                label: "Export PI (Excel)",
                icon: Download,
                onClick: (item) => window.open(`/api/orders/${item.id}/export-pi`, '_blank'),
                className: "text-blue-600"
            }
          ]}
        />
      ),
    },
  ], [t, locale, router])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t("orders.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("orders.description")}</p>
        </div>
        <Button onClick={() => router.push("/orders/new")}>
          <Plus className="mr-2 h-4 w-4" />
          {t("orders.newOrder")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("orders.listTitle")}</CardTitle>
            <div className="flex gap-2">
                <div className="w-64">
                    <ProjectSelect 
                        value={selectedProject}
                        onChange={(p) => setSelectedProject(p?.id || "")}
                        placeholder={t("orders.placeholders.project") || "Filter by Project"}
                    />
                </div>
                <Button variant="outline" onClick={loadOrders} size="icon">
                    <Filter className="h-4 w-4" />
                </Button>
            </div>
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
              data={data}
              searchKey="code"
              onRowClick={(row) => router.push(`/orders/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
