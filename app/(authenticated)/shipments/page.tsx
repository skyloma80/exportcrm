"use client"

/**
 * Shipments List Page
 * 发货管理列表页
 */

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useShipments } from "@/hooks/collections/shipments"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
} from "@/components/data-table"
import { Plus, Loader2, Ship, Plane, Truck, Package } from "lucide-react"
import type { ShipmentWithExpand, ShipmentStatus } from "@/lib/pocketbase/services/shipments"

const STATUS_OPTIONS = [
  { label: "Preparing", value: "preparing" },
  { label: "Booking", value: "booking" },
  { label: "Customs Clearance", value: "customs_clearance" },
  { label: "Loaded", value: "loaded" },
  { label: "Handed Over", value: "handed_over" },
  { label: "Shipped", value: "shipped" },
  { label: "In Transit", value: "in_transit" },
  { label: "Arrived", value: "arrived" },
  { label: "Delivered", value: "delivered" },
]

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  preparing: "bg-gray-100 text-gray-800",
  booking: "bg-orange-100 text-orange-800",
  customs_clearance: "bg-yellow-100 text-yellow-800",
  loaded: "bg-blue-100 text-blue-800",
  handed_over: "bg-cyan-100 text-cyan-800",
  shipped: "bg-indigo-100 text-indigo-800",
  in_transit: "bg-purple-100 text-purple-800",
  arrived: "bg-green-100 text-green-800",
  delivered: "bg-emerald-100 text-emerald-800",
}

export default function ShipmentsPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const { shipments, isLoading } = useShipments()

  const getDisplayName = (item?: { name?: string; name_cn?: string }) => {
    if (!item) return "-"
    if (locale === "zh" && item.name_cn) return item.name_cn
    return item.name || "-"
  }

  const stats = useMemo(() => {
    const preparing = shipments.filter((s) => s.status === "preparing").length
    const inTransit = shipments.filter((s) => s.status === "in_transit").length
    const delivered = shipments.filter((s) => s.status === "delivered").length
    return { total: shipments.length, preparing, inTransit, delivered }
  }, [shipments])

  const columns: ColumnDef<ShipmentWithExpand>[] = useMemo(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("shipments.columns.code")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium">{row.getValue("code")}</span>
        ),
      },
      {
        id: "order",
        accessorFn: (row) => row.expand?.order?.code || "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("shipments.columns.order")} />
        ),
        cell: ({ row }) => row.original.expand?.order?.code || "-",
      },
      {
        id: "customer",
        accessorFn: (row) => row.expand?.order?.customer_name || "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("shipments.columns.customer")} />
        ),
        cell: ({ row }) => row.original.expand?.order?.customer_name || "-",
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("shipments.columns.status")} />
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as ShipmentStatus
          return (
            <Badge variant="outline" className={STATUS_COLORS[status]}>
              {t(`shipments.status.${status}`)}
            </Badge>
          )
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id))
        },
      },
      {
        accessorKey: "shipping_method",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("shipments.columns.shippingMethod")} />
        ),
        cell: ({ row }) => {
          const method = row.original.shipping_method
          const Icon = method === "sea" ? Ship : method === "air" ? Plane : Truck
          return (
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {t(`shipments.shippingMethods.${method}`) || method}
            </div>
          )
        },
      },
      {
        accessorKey: "container_number",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("shipments.columns.containerNumber")} />
        ),
        cell: ({ row }) => row.original.container_number || "-",
      },
      {
        accessorKey: "etd",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("shipments.columns.etd")} />
        ),
        cell: ({ row }) => {
          const etd = row.original.etd
          return etd ? etd.split('T')[0].split(' ')[0] : "-"
        },
      },
      {
        accessorKey: "eta",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("shipments.columns.eta")} />
        ),
        cell: ({ row }) => {
          const eta = row.original.eta
          return eta ? eta.split('T')[0].split(' ')[0] : "-"
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const order = row.original.expand?.order;
          const projectId = order?.project_id;
          const orderId = order?.id;
          const baseUrl = `/shipments/${row.original.id}`;
          const params = projectId && orderId ? `?order=${orderId}&project=${projectId}` : '';
          return (
            <DataTableRowActions
              row={row}
              onView={(item) => router.push(`${baseUrl}${params}`)}
              onEdit={(item) => router.push(`${baseUrl}/edit${params}`)}
            />
          );
        },
      },
    ],
    [t, locale, router]
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("shipments.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("shipments.description")}</p>
          </div>
          <Button onClick={() => router.push("/shipments/new")}>
            <Plus className="mr-2 h-4 w-4" />
            {t("shipments.new")}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("shipments.stats.total")}</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("shipments.stats.preparing")}</CardDescription>
            <CardTitle className="text-3xl">{stats.preparing}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("shipments.stats.inTransit")}</CardDescription>
            <CardTitle className="text-3xl">{stats.inTransit}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("shipments.stats.delivered")}</CardDescription>
            <CardTitle className="text-3xl">{stats.delivered}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* DataTable */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("shipments.listTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground mt-2">{t("common.loading")}</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={shipments}
              searchKey="code"
              filterableColumns={[
                {
                  id: "status",
                  title: t("shipments.columns.status"),
                  options: STATUS_OPTIONS.map((opt) => ({
                    ...opt,
                    label: t(`shipments.status.${opt.value}`),
                  })),
                },
              ]}
              onRowClick={(row) => {
                const order = row.expand?.order;
                const projectId = order?.project_id;
                const orderId = order?.id;
                const params = projectId && orderId ? `?order=${orderId}&project=${projectId}` : '';
                router.push(`/shipments/${row.id}${params}`);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
