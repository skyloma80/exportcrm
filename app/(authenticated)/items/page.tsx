"use client"

/**
 * Items 列表页
 * 
 * 使用 DataTable 组件和 i18n 支持
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
  Package, 
  Upload,
  FileSpreadsheet
} from "lucide-react"
import { ExcelImportDialog } from "@/components/items/excel-import-dialog"

// Item type
interface Item {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'pending'
  created: string
  updated: string
}

// Status options for filtering
const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Pending", value: "pending" },
]

export default function ItemsPage() {
  const router = useRouter()
  const { t } = useI18n()
  
  // State
  const [data, setData] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const pb = getPocketBase()
      if (!pb) {
        throw new Error("Missing collection context.")
      }
      const results = await pb.collection("items").getList<Item>(1, 100, {
        sort: "-id",
      })
      setData(results.items || [])
      setTotalCount(results.totalItems || 0)
    } catch (err: any) {
      console.error("Error loading data:", err)
      // Check if it's a collection not found error
      if (err.status === 404 || err.message?.includes("collection")) {
        setError(new Error("Items collection not found. Please ensure the 'items' collection exists in PocketBase."))
      } else {
        setError(err)
      }
    } finally {
      setLoading(false)
    }
  }

  // Status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'inactive': return 'secondary'
      case 'pending': return 'outline'
      default: return 'secondary'
    }
  }

  // Column definitions
  const columns: ColumnDef<Item>[] = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("items.columns.name")} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("items.columns.description")} />
      ),
      cell: ({ row }) => (
        <div className="max-w-xs truncate text-muted-foreground">
          {row.getValue("description") || "-"}
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("items.columns.status")} />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={getStatusVariant(status)}>
            {t(`items.status.${status}`)}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="ID" />
      ),
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground font-mono">
          {row.getValue("id")}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          onView={(item) => router.push(`/items/${item.id}`)}
          onEdit={(item) => router.push(`/items/${item.id}/edit`)}
          onDelete={(item) => handleDelete(item)}
        />
      ),
    },
  ], [t, router])

  // Handle delete
  const handleDelete = async (item: Item) => {
    if (!confirm(t("items.deleteConfirm"))) return
    
    try {
      const pb = getPocketBase()
      await pb.collection("items").delete(item.id)
      loadData()
    } catch (err) {
      console.error("Delete error:", err)
      alert(t("items.deleteError"))
    }
  }

  // Export handler
  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/items/export')
      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `items_${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        document.body.removeChild(a)
      } else {
        alert(t("items.exportError"))
      }
    } catch (error) {
      console.error('Export error:', error)
      alert(t("items.exportError"))
    } finally {
      setExporting(false)
    }
  }

  // Stats
  const activeCount = data.filter(item => item.status === 'active').length
  const pendingCount = data.filter(item => item.status === 'pending').length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("items.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("items.description")}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t("items.import")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting || data.length === 0}
            >
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  {t("items.exporting")}
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {t("items.export")}
                </>
              )}
            </Button>
            <Button onClick={() => router.push("/items/new")} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("items.newItem")}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("items.stats.total")}</CardDescription>
            <CardTitle className="text-3xl">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("items.stats.active")}</CardDescription>
            <CardTitle className="text-3xl">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("items.stats.pending")}</CardDescription>
            <CardTitle className="text-3xl">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("items.stats.thisPage")}</CardDescription>
            <CardTitle className="text-3xl">{data.length}</CardTitle>
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
          <CardTitle>{t("items.listTitle")}</CardTitle>
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
                  id: "status",
                  title: t("items.columns.status"),
                  options: STATUS_OPTIONS.map(opt => ({
                    ...opt,
                    label: t(`items.status.${opt.value}`),
                  })),
                },
              ]}
              onRowClick={(row) => router.push(`/items/${row.id}`)}
            />
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <ExcelImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={loadData}
      />
    </div>
  )
}
