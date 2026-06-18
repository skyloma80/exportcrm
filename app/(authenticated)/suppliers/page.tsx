"use client"

/**
 * Suppliers List Page
 * 供应商列表页
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
  Upload,
  FileSpreadsheet,
  Factory,
  Star
} from "lucide-react"
import { Supplier } from "@/lib/pocketbase/services/suppliers"
import { ExcelImportDialog } from "@/components/suppliers/excel-import-dialog"

// Supplier type options for filtering
const TYPE_OPTIONS = [
  { label: "Manufacturer", value: "manufacturer" },
  { label: "Trader", value: "trader" },
  { label: "Agent", value: "agent" },
]

// Rating options for filtering
const RATING_OPTIONS = [
  { label: "⭐⭐⭐⭐⭐", value: "5" },
  { label: "⭐⭐⭐⭐", value: "4" },
  { label: "⭐⭐⭐", value: "3" },
  { label: "⭐⭐", value: "2" },
  { label: "⭐", value: "1" },
]

export default function SuppliersPage() {
  const router = useRouter()
  const { t, locale } = useI18n()
  
  // State
  const [data, setData] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [importDialogOpen, setImportDialogOpen] = useState(false)


  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const pb = getPocketBase()
      const results = await pb.collection("suppliers").getList<Supplier>(1, 100, {
        sort: "-id",
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
  const getDisplayName = (supplier: Supplier) => {
    if (locale === 'zh' && supplier.name_cn) {
      return supplier.name_cn
    }
    return supplier.name
  }

  // Type badge variant
  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'manufacturer': return 'default'
      case 'trader': return 'secondary'
      case 'agent': return 'outline'
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
  const columns: ColumnDef<Supplier>[] = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("suppliers.columns.code")} />
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue("code")}</span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("suppliers.columns.name")} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Factory className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{getDisplayName(row.original)}</span>
        </div>
      ),
    },
    {
      accessorKey: "country",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("suppliers.columns.country")} />
      ),
      cell: ({ row }) => (
        <span>{row.getValue("country")}</span>
      ),
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("suppliers.columns.type")} />
      ),
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        return (
          <Badge variant={getTypeVariant(type)}>
            {t(`suppliers.type.${type}`)}
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
        <DataTableColumnHeader column={column} title={t("suppliers.columns.rating")} />
      ),
      cell: ({ row }) => renderRating(row.getValue("rating")),
      filterFn: (row, id, value) => {
        const rating = row.getValue(id) as number
        return value.includes(String(rating))
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={(item) => router.push(`/suppliers/${item.id}`)}
          onEdit={(item) => router.push(`/suppliers/${item.id}/edit`)}
          onDelete={(item) => handleDelete(item)}
        />
      ),
    },
  ], [t, locale, router])


  // Handle delete
  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(t("suppliers.deleteConfirm"))) return
    
    try {
      const pb = getPocketBase()
      await pb.collection("suppliers").delete(supplier.id)
      loadData()
    } catch (err) {
      console.error("Delete error:", err)
      alert(t("suppliers.deleteError"))
    }
  }

  // Stats
  const manufacturerCount = data.filter(s => s.type === 'manufacturer').length
  const traderCount = data.filter(s => s.type === 'trader').length
  const agentCount = data.filter(s => s.type === 'agent').length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("suppliers.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("suppliers.description")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} size="sm">
              <Upload className="mr-2 h-4 w-4" />
              {t("suppliers.import")}
            </Button>
            <Button onClick={() => router.push("/suppliers/new")} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("suppliers.newSupplier")}
            </Button>
          </div>
        </div>
      </div>


      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("suppliers.stats.total")}</CardDescription>
            <CardTitle className="text-3xl">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("suppliers.stats.manufacturer")}</CardDescription>
            <CardTitle className="text-3xl">{manufacturerCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("suppliers.stats.trader")}</CardDescription>
            <CardTitle className="text-3xl">{traderCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("suppliers.stats.agent")}</CardDescription>
            <CardTitle className="text-3xl">{agentCount}</CardTitle>
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
                  title: t("suppliers.columns.type"),
                  options: TYPE_OPTIONS.map(opt => ({
                    ...opt,
                    label: t(`suppliers.type.${opt.value}`),
                  })),
                },
                {
                  id: "rating",
                  title: t("suppliers.columns.rating"),
                  options: RATING_OPTIONS,
                },
              ]}
              onRowClick={(row) => router.push(`/suppliers/${row.id}`)}
          />
      )}

      {/* Import Dialog */}
      <ExcelImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={loadData}
      />
    </div>
  )
}
