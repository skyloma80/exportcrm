"use client"

/**
 * Customers List Page
 * 客户列表页
 */

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  DataTable, 
  DataTableColumnHeader,
  DataTableRowActions,
} from "@/components/data-table"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { useI18n } from "@/lib/i18n/use-i18n"
import { 
  Plus, 
  Building2,
  Star
} from "lucide-react"
import { Customer } from "@/lib/pocketbase/services/customers"

// Customer type options for filtering
const TYPE_OPTIONS = [
  { label: "Direct", value: "direct" },
  { label: "Agent", value: "agent" },
  { label: "Distributor", value: "distributor" },
]

// Rating options for filtering
const RATING_OPTIONS = [
  { label: "⭐⭐⭐⭐⭐", value: "5" },
  { label: "⭐⭐⭐⭐", value: "4" },
  { label: "⭐⭐⭐", value: "3" },
  { label: "⭐⭐", value: "2" },
  { label: "⭐", value: "1" },
]

export default function CustomersPage() {
  const router = useRouter()
  const { t, locale } = useI18n()
  
  // State
  const [data, setData] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const pb = getPocketBase()
      const results = await pb.collection("customers").getList<Customer>(1, 100, {
        sort: "-created",
      })
      setData(results.items || [])
      setTotalCount(results.totalItems || 0)
    } catch (err: any) {
      console.error("Error loading data:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  // Get display name based on locale
  const getDisplayName = (customer: Customer) => {
    if (locale === 'zh' && customer.name_cn) {
      return customer.name_cn
    }
    return customer.name
  }

  // Type badge variant
  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'direct': return 'default'
      case 'agent': return 'secondary'
      case 'distributor': return 'outline'
      default: return 'secondary'
    }
  }

  // Render rating stars
  const renderRating = (rating?: number) => {
    if (!rating) return <span className="text-muted-foreground">-</span>
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-3.5 w-3.5 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
          />
        ))}
      </div>
    )
  }

  // Column definitions
  const columns: ColumnDef<Customer>[] = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("customers.columns.code")} />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue("code")}</span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("customers.columns.name")} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{getDisplayName(row.original)}</span>
        </div>
      ),
    },
    {
      accessorKey: "country",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("customers.columns.country")} />
      ),
      cell: ({ row }) => (
        <span>{row.getValue("country")}</span>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("customers.columns.type")} />
      ),
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        return (
          <Badge variant={getTypeVariant(type)}>
            {t(`customers.type.${type}`)}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "rating",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("customers.columns.rating")} />
      ),
      cell: ({ row }) => renderRating(row.getValue("rating")),
      filterFn: (row, id, value) => {
        const rating = row.getValue(id) as number
        return value.includes(String(rating))
      },
    },
    {
      accessorKey: "preferred_currency",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("customers.columns.currency")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.getValue("preferred_currency") || "-"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={(item) => router.push(`/customers/${item.id}`)}
          onEdit={(item) => router.push(`/customers/${item.id}/edit`)}
          onDelete={(item) => handleDelete(item)}
        />
      ),
    },
  ], [t, locale, router])

  // Handle delete
  const handleDelete = async (customer: Customer) => {
    if (!confirm(t("customers.deleteConfirm"))) return
    
    try {
      const pb = getPocketBase()
      await pb.collection("customers").delete(customer.id)
      loadData()
    } catch (err) {
      console.error("Delete error:", err)
      alert(t("customers.deleteError"))
    }
  }

  // Export handler
  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/customers/export')
      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `customers_${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        document.body.removeChild(a)
      } else {
        alert(t("customers.exportError"))
      }
    } catch (error) {
      console.error('Export error:', error)
      alert(t("customers.exportError"))
    } finally {
      setExporting(false)
    }
  }

  // Stats
  const directCount = data.filter(c => c.type === 'direct').length
  const agentCount = data.filter(c => c.type === 'agent').length
  const distributorCount = data.filter(c => c.type === 'distributor').length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("customers.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("customers.description")}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/customers/new")} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("customers.newCustomer")}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("customers.stats.total")}</CardDescription>
            <CardTitle className="text-3xl">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("customers.stats.direct")}</CardDescription>
            <CardTitle className="text-3xl">{directCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("customers.stats.agent")}</CardDescription>
            <CardTitle className="text-3xl">{agentCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("customers.stats.distributor")}</CardDescription>
            <CardTitle className="text-3xl">{distributorCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>{t("common.error")}: {error.message}</p>
              <Button variant="outline" onClick={loadData} className="mt-4">
                {t("common.retry")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DataTable */}
      <Card>
        <CardHeader>
          <CardTitle>{t("customers.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                  title: t("customers.columns.type"),
                  options: TYPE_OPTIONS.map(opt => ({
                    ...opt,
                    label: t(`customers.type.${opt.value}`),
                  })),
                },
                {
                  id: "rating",
                  title: t("customers.columns.rating"),
                  options: RATING_OPTIONS,
                },
              ]}
              onRowClick={(row) => router.push(`/customers/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
