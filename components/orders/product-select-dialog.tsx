"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Package, Search, Loader2, X, Plus, Filter, CheckCircle2, ExternalLink } from "lucide-react"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Product, productService, productCategoryService, ProductCategory } from "@/lib/pocketbase/services/products"
import { projectService, productProjectService, Project } from "@/lib/pocketbase/services/projects"
import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ProductWithProjects extends Product {
  projectIds: string[]
}

interface ProductSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (productIds: string[]) => void
  projectId?: string
}

export function ProductSelectDialog({
  open,
  onOpenChange,
  onSelect,
  projectId: initialProjectId,
}: ProductSelectDialogProps) {
  const router = useRouter()
  const { t, locale } = useI18n()
  const [loading, setLoading] = useState(false)
  const [products, setProducts] = useState<ProductWithProjects[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [projects, setProjects] = useState<Project[]>([])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open) {
      loadData()
      setSelectedIds(new Set())
    }
  }, [open, initialProjectId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [allProducts, allCategories, allProjects, allProjectProducts] = await Promise.all([
        productService.getFullList(),
        productCategoryService.getFullList(),
        projectService.getFullList(),
        productProjectService.getFullList(), // Get all project-product mappings for filtering
      ])

      // Map project IDs to products
      const productMap: Record<string, string[]> = {}
      allProjectProducts.forEach(pp => {
        if (!productMap[pp.product]) productMap[pp.product] = []
        productMap[pp.product].push(pp.project)
      })

      const productsWithProjects = allProducts.map(p => ({
        ...p,
        projectIds: productMap[p.id] || []
      }))

      setProducts(productsWithProjects)
      setCategories(allCategories)
      setProjects(allProjects)

    } catch (error) {
      console.error("Error loading dialog data:", error)
    } finally {
      setLoading(false)
    }
  }

  const columns: ColumnDef<ProductWithProjects>[] = useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getRowModel().rows.length > 0 && table.getRowModel().rows.every(row => selectedIds.has(row.original.id)))}
          onCheckedChange={(value) => {
            const newIds = new Set(selectedIds)
            const rows = table.getRowModel().rows
            if (value) {
              rows.forEach(row => newIds.add(row.original.id))
            } else {
              rows.forEach(row => newIds.delete(row.original.id))
            }
            setSelectedIds(newIds)
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedIds.has(row.original.id)}
          onCheckedChange={(value) => {
            const newIds = new Set(selectedIds)
            if (value) newIds.add(row.original.id)
            else newIds.delete(row.original.id)
            setSelectedIds(newIds)
          }}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.code")} />,
      cell: ({ row }) => <span className="font-mono text-[11px] text-slate-500">{row.getValue("code")}</span>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.name")} />,
      cell: ({ row }) => {
        const name = locale === 'zh' && row.original.name_cn ? row.original.name_cn : row.original.name
        return (
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-slate-100 rounded-md">
              <Package className="h-3.5 w-3.5 text-slate-600" />
            </div>
            <span 
              className="font-semibold text-[12px] text-slate-900 truncate max-w-[200px] cursor-pointer hover:text-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                window.open(`${window.location.origin}/products/${row.original.id}`, '_blank')
              }}
            >
              {name}
            </span>


          </div>
        )
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.category")} />,
      cell: ({ row }) => {
        const cat = categories.find(c => c.id === row.original.category)
        return <span className="text-slate-500 text-[11px]">{cat ? (locale === 'zh' ? cat.name_cn : cat.name) : "-"}</span>
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      id: "project",
      accessorKey: "projectIds",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("projects.title")} />,
      cell: ({ row }) => {
        const pIds = row.original.projectIds
        if (pIds.length === 0) return <span className="text-slate-400 text-[10px]">-</span>
        const names = pIds.map(id => {
          const p = projects.find(pr => pr.id === id)
          return p ? (locale === 'zh' && p.name_cn ? p.name_cn : p.name) : id
        })
        const display = names.length <= 2 ? names.join(", ") : `${names.length} ${t("projects.title")}`
        return <span className="text-slate-500 text-[11px] truncate max-w-[150px] block" title={names.join(", ")}>{display}</span>
      },
      filterFn: (row, id, value) => {
        const pIds = row.getValue(id) as string[]
        return value.some((v: string) => pIds.includes(v))
      },
    },
    {
      accessorKey: "part_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.partNumber")} />,
      cell: ({ row }) => <span className="text-slate-500 text-[11px] font-medium">{row.getValue("part_number") || "-"}</span>,
    },
    {
      accessorKey: "unit",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.unit")} />,
      cell: ({ row }) => (
        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
          {row.getValue("unit")}
        </div>
      ),
    }
  ], [t, locale, selectedIds, categories, projects])

  const handleConfirm = () => {
    const selectedIdsArray = Array.from(selectedIds)
    onSelect(selectedIdsArray)
    onOpenChange(false)
  }

  const filterableColumns = useMemo(() => [
    {
      id: "project",
      title: "Project",
      options: projects.map(p => ({
        label: locale === 'zh' && p.name_cn ? p.name_cn : p.name,
        value: p.id,
      }))
    },
    {
      id: "category",
      title: "Category",
      options: categories.map(c => ({
        label: locale === 'zh' && c.name_cn ? c.name_cn : c.name,
        value: c.id,
      }))
    }
  ], [projects, categories, locale])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-3xl bg-white gap-0">
        {/* Header Section */}
        <div className="px-6 py-4 flex-shrink-0 flex items-start justify-between border-b">
          <div className="flex gap-3 items-center">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                {t('productSelect.title') || 'Product Catalog'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t('productSelect.description') || 'Browse and select products to add to your document'}
              </DialogDescription>
            </div>
          </div>

        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 flex flex-col relative bg-white">
          <div className="flex-1 overflow-auto p-8 custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Package className="h-5 w-5 text-blue-200" />
                  </div>
                </div>
                <span className="text-sm text-muted-foreground animate-pulse">{t('common.loading') || 'Loading...'} {t('productSelect.syncing') || ''}</span>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <DataTable
                  columns={columns}
                  data={products}
                  searchKey="name"
                  filterableColumns={filterableColumns}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer Section - Fixed at bottom */}
        <div className="px-8 py-6 border-t border-slate-100 bg-white flex items-center justify-between flex-shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted text-muted-foreground rounded-md border">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{selectedIds.size} {t('productSelect.itemsSelected') || 'items selected'}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
            >
              {t('productSelect.confirm') || 'Confirm Selection'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
