"use client"

/**
 * Products List Page - Global Read-Only View
 * 产品列表页 - 全局只读视图
 * 
 * This page shows all products across all projects.
 * Products can only be created within a project context.
 * Clicking a product navigates to the project's product detail.
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
} from "@/components/data-table"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { useI18n } from "@/lib/i18n/use-i18n"
import { 
  FileSpreadsheet,
  Package,
  Layers,
  FolderKanban,
  Info
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Product, ProductCategory } from "@/lib/pocketbase/services/products"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ProductProject {
  id: string
  product: string
  project: string
  expand?: {
    project?: {
      id: string
      code: string
      name: string
      name_cn?: string
    }
  }
}

interface ProductWithProject extends Product {
  projectInfo?: {
    id: string
    code: string
    name: string
    name_cn?: string
  } | null
}

export default function ProductsPage() {
  const router = useRouter()
  const { t, locale } = useI18n()
  
  const [data, setData] = useState<ProductWithProject[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [exporting, setExporting] = useState(false)


  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const pb = getPocketBase()
      const [productsResult, categoriesResult, productProjectsResult] = await Promise.all([
        pb.collection("products").getList<Product>(1, 100, {
          sort: "-created",
          expand: "category",
        }),
        pb.collection("product_categories").getFullList<ProductCategory>({
          sort: "sort_order,name",
        }),
        pb.collection("products_projects").getFullList<ProductProject>({
          expand: "project",
        }),
      ])
      
      // Create a map of product ID to project info
      const productProjectMap = new Map<string, ProductProject['expand']>()
      productProjectsResult.forEach(pp => {
        if (pp.expand?.project) {
          productProjectMap.set(pp.product, pp.expand)
        }
      })
      
      // Merge product data with project info
      const productsWithProjects: ProductWithProject[] = (productsResult.items || []).map(product => ({
        ...product,
        projectInfo: productProjectMap.get(product.id)?.project || null,
      }))
      
      setData(productsWithProjects)
      setTotalCount(productsResult.totalItems || 0)
      setCategories(categoriesResult || [])
    } catch (err: any) {
      console.error("Error loading data:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayName = (product: Product) => {
    if (locale === 'zh' && product.name_cn) return product.name_cn
    return product.name
  }

  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return "-"
    const category = categories.find(c => c.id === categoryId)
    if (!category) return "-"
    if (locale === 'zh' && category.name_cn) return category.name_cn
    return category.name
  }

  const getDescription = (product: Product) => {
    if (locale === 'zh' && product.description_cn) return product.description_cn
    return product.description || "-"
  }

  const getProjectDisplayName = (projectInfo: ProductWithProject['projectInfo']) => {
    if (!projectInfo) return "-"
    if (locale === 'zh' && projectInfo.name_cn) return projectInfo.name_cn
    return projectInfo.name
  }

  const handleProductClick = (product: ProductWithProject) => {
    if (product.projectInfo) {
      // Navigate to project detail page with products tab active
      router.push(`/projects/${product.projectInfo.id}?tab=products`)
    } else {
      // Fallback to product detail page if no project association
      router.push(`/products/${product.id}`)
    }
  }

  const handleProjectClick = (e: React.MouseEvent, projectInfo: ProductWithProject['projectInfo']) => {
    e.stopPropagation()
    if (projectInfo) {
      router.push(`/projects/${projectInfo.id}`)
    }
  }

  const columns: ColumnDef<ProductWithProject>[] = useMemo(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t("common.selectAll")}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label={t("common.selectRow")}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.code")} />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("code")}</span>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.name")} />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{getDisplayName(row.original)}</span>
        </div>
      ),
    },
    {
      id: "project",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.project")} />,
      cell: ({ row }) => {
        const projectInfo = row.original.projectInfo
        if (!projectInfo) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <Button
            variant="link"
            className="p-0 h-auto font-normal text-primary hover:underline"
            onClick={(e) => handleProjectClick(e, projectInfo)}
          >
            <FolderKanban className="h-3 w-3 mr-1" />
            {getProjectDisplayName(projectInfo)}
          </Button>
        )
      },
    },
    {
      accessorKey: "part_number",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.partNumber")} />,
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("part_number") || "-"}</span>,
    },
    {
      accessorKey: "description",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.description")} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground max-w-[200px] truncate block" title={getDescription(row.original)}>
          {getDescription(row.original)}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.category")} />,
      cell: ({ row }) => (
        <Badge variant="outline">
          <Layers className="h-3 w-3 mr-1" />
          {getCategoryName(row.getValue("category"))}
        </Badge>
      ),
    },
    {
      accessorKey: "unit",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.unit")} />,
      cell: ({ row }) => <span>{row.getValue("unit")}</span>,
    },
    {
      accessorKey: "hs_code",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.hsCode")} />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("hs_code") || "-"}</span>,
    },
  ], [t, locale, router, categories])

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/products/export')
      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = downloadUrl
        a.download = `products_${new Date().toISOString().split('T')[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(downloadUrl)
        document.body.removeChild(a)
      } else {
        alert(t("products.exportError"))
      }
    } catch (error) {
      console.error('Export error:', error)
      alert(t("products.exportError"))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t("products.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("products.description")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || data.length === 0}>
              {exporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  {t("common.exporting")}
                </>
              ) : (
                <>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  {t("common.export")}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Info Alert - Products must be created within a project */}
      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          {locale === 'zh' 
            ? '产品必须在项目中创建。请先进入项目，然后在项目的"产品"标签页中添加产品。'
            : 'Products must be created within a project. Please navigate to a project and add products from the "Products" tab.'}
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("products.stats.total")}</CardDescription>
            <CardTitle className="text-3xl">{totalCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("products.stats.categories")}</CardDescription>
            <CardTitle className="text-3xl">{categories.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("products.stats.thisPage")}</CardDescription>
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
              <Button variant="outline" onClick={loadData} className="mt-4">{t("common.retry")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DataTable */}
      <Card>
        <CardHeader>
          <CardTitle>{t("products.listTitle")}</CardTitle>
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
              showSelection={true}
              filterableColumns={[
                ...(categories.length > 0 ? [{
                  id: "category",
                  title: t("products.columns.category"),
                  options: categories.map(cat => ({
                    label: locale === 'zh' && cat.name_cn ? cat.name_cn : cat.name,
                    value: cat.id,
                  })),
                }] : []),
              ]}
              onRowClick={(row) => handleProductClick(row)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
