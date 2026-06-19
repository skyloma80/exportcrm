"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
} from "@/components/data-table"
import { useI18n } from "@/lib/i18n/use-i18n"
import {
  Plus,
  Ship,
  FileCheck,
  Truck,
  Warehouse,
  Shield,
  Loader2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { serviceProviderService, ServiceProvider, ServiceProviderType } from "@/lib/pocketbase/services/service-providers"
import { useToast } from "@/hooks/use-toast"

const TYPE_ICONS: Record<ServiceProviderType, LucideIcon> = {
  freight_forwarder: Ship,
  customs_broker: FileCheck,
  shipping_line: Ship,
  trucking: Truck,
  warehouse: Warehouse,
  inspection: Shield,
  insurance: Shield,
  other: Shield,
}

const TYPE_OPTIONS = [
  { label: "Freight Forwarder", value: "freight_forwarder" },
  { label: "Customs Broker", value: "customs_broker" },
  { label: "Shipping Line", value: "shipping_line" },
  { label: "Trucking", value: "trucking" },
  { label: "Warehouse", value: "warehouse" },
  { label: "Inspection", value: "inspection" },
  { label: "Insurance", value: "insurance" },
  { label: "Other", value: "other" },
]

export default function ServiceProvidersPage() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const { toast } = useToast()

  const [data, setData] = useState<ServiceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [totalItems, setTotalItems] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await serviceProviderService.getList({ page: 1, perPage: 100, sort: '-code' })
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

  const handleDelete = async (provider: ServiceProvider) => {
    if (!confirm(t("serviceProviders.deleteConfirm"))) return
    try {
      await serviceProviderService.delete(provider.id)
      toast({
        title: t("common.success"),
        description: t("serviceProviders.deleteSuccess"),
      })
      loadData()
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getDisplayName = (provider: ServiceProvider) => {
    if (locale === 'zh' && provider.name_cn) return provider.name_cn
    return provider.name
  }

  const stats = {
    total: totalItems,
    freight: data.filter((p) => p.type === 'freight_forwarder').length,
    customs: data.filter((p) => p.type === 'customs_broker').length,
    active: data.filter((p) => p.is_active).length,
  }

  const columns: ColumnDef<ServiceProvider>[] = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("serviceProviders.columns.code")} />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-blue-600">
          {row.getValue("code")}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("serviceProviders.columns.name")} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {(() => {
            const type = row.original.type as ServiceProviderType
            const Icon = TYPE_ICONS[type] || Shield
            return <Icon className="h-4 w-4 text-muted-foreground" />
          })()}
          <span className="font-medium">{getDisplayName(row.original)}</span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("serviceProviders.columns.type")} />
      ),
      cell: ({ row }) => {
        const type = row.getValue("type") as ServiceProviderType
        const Icon = TYPE_ICONS[type] || Shield
        return (
          <Badge variant="secondary">
            <Icon className="h-3 w-3 mr-1" />
            {t(`serviceProviders.type.${type}`)}
          </Badge>
        )
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      accessorKey: "contact_name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("serviceProviders.columns.contact")} />
      ),
      cell: ({ row }) => (
        <span>{row.getValue("contact_name") || "-"}</span>
      ),
    },
    {
      accessorKey: "contact_phone",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("serviceProviders.columns.phone")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.getValue("contact_phone") || "-"}</span>
      ),
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("serviceProviders.columns.status")} />
      ),
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? t("common.active") : t("common.inactive")}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={(item) => router.push(`/service-providers/${item.id}`)}
          onEdit={(item) => router.push(`/service-providers/${item.id}/edit`)}
          onDelete={(item) => handleDelete(item)}
        />
      ),
    },
  ], [t, locale, router])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("serviceProviders.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("serviceProviders.description")}</p>
        </div>
        <Button onClick={() => router.push("/service-providers/new")}>
          <Plus className="mr-2 h-4 w-4" />
          {t("serviceProviders.newProvider")}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("serviceProviders.stats.total")}</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("serviceProviders.stats.freight")}</CardDescription>
            <CardTitle className="text-3xl">{stats.freight}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("serviceProviders.stats.customs")}</CardDescription>
            <CardTitle className="text-3xl">{stats.customs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("serviceProviders.stats.active")}</CardDescription>
            <CardTitle className="text-3xl">{stats.active}</CardTitle>
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
          searchKey="name"
          filterableColumns={[
            {
              id: "type",
              title: t("serviceProviders.columns.type"),
              options: TYPE_OPTIONS.map(opt => ({
                ...opt,
                label: t(`serviceProviders.type.${opt.value}`),
              })),
            },
          ]}
          onRowClick={(row) => router.push(`/service-providers/${row.id}`)}
        />
      )}
    </div>
  )
}
