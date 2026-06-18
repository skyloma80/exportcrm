"use client"

/**
 * Project Products Page
 * 项目产品管理页面
 * 
 * 用于在工作流中管理项目产品，复用现有组件
 * Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3
 */

import { useState, useEffect, useMemo } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n/use-i18n"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { ArrowLeft, Package, Loader2, Plus, Upload, ChevronUp, X } from "lucide-react"
import { Project, productProjectService } from "@/lib/pocketbase/services/projects"
import { Product, productService, ProductCreateInput } from "@/lib/pocketbase/services/products"
import { ProductImportDialog } from "@/components/projects/product-import-dialog"
import { ProductForm } from "@/components/products/product-form"
import { useToast } from "@/hooks/use-toast"
import { DataTable, DataTableColumnHeader } from "@/components/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { useBreadcrumb } from "@/lib/breadcrumb/context"
import { Customer } from "@/lib/pocketbase/services/customers"
import { UNITS } from "@/lib/constants/trade-standards"

interface ProductProject {
  id: string
  product: string
  project: string
  usage_note?: string
  expand?: { product?: Product }
}

/**
 * Determines the back button configuration based on returnTo parameter
 * Property 5: Back button visibility based on returnTo parameter
 */
function getBackButtonConfig(returnTo: string | null, projectId: string) {
  if (returnTo === 'workflow') {
    return {
      label: 'backToWorkflow',
      href: `/projects/${projectId}/workflow`,
      showWorkflowButton: true
    }
  }
  return {
    label: 'backToProject',
    href: `/projects/${projectId}`,
    showWorkflowButton: false
  }
}

/**
 * Product creation result type for property testing
 * Property 3: Create adds product to project
 */
interface ProductCreationResult {
  success: boolean
  newProduct?: {
    id: string
    name: string
    unit: string
    code: string
  }
  association?: {
    productId: string
    projectId: string
  }
  updatedProductList: Array<{
    id: string
    productId: string
    code: string
    name: string
  }>
}

/**
 * Simulates product creation and project association for property testing
 * Property 3: Create adds product to project
 * 
 * This pure function models the behavior of handleCreateProduct:
 * 1. Creates a new product with the given input
 * 2. Associates the product with the project
 * 3. Returns the updated product list
 */
function simulateProductCreation(
  projectId: string,
  productInput: { name: string; unit: string;[key: string]: any },
  existingProducts: Array<{ id: string; productId: string; code: string; name: string }>
): ProductCreationResult {
  // Simulate product creation - generate a new product ID and code
  const newProductId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const newProductCode = `P-${Date.now()}`

  const newProduct = {
    id: newProductId,
    name: productInput.name,
    unit: productInput.unit,
    code: newProductCode
  }

  // Simulate association creation
  const association = {
    productId: newProductId,
    projectId: projectId
  }

  // Simulate the new product-project entry
  const newProductProjectEntry = {
    id: `pp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    productId: newProductId,
    code: newProductCode,
    name: productInput.name
  }

  // Return updated list with new product added
  const updatedProductList = [...existingProducts, newProductProjectEntry]

  return {
    success: true,
    newProduct,
    association,
    updatedProductList
  }
}

export default function ProjectProductsPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()

  const id = params.id as string
  const returnTo = searchParams.get('returnTo')

  const [project, setProject] = useState<Project | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [products, setProducts] = useState<ProductProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)

  // Get back button configuration based on returnTo parameter
  const backConfig = getBackButtonConfig(returnTo, id)

  // Set breadcrumb when project loads
  useEffect(() => {
    if (project) {
      const projectDisplayName = locale === 'zh' && project.name_cn ? project.name_cn : project.name

      if (customer) {
        const customerDisplayName = locale === 'zh' && customer.name_cn ? customer.name_cn : customer.name
        setBreadcrumb([
          { label: customerDisplayName, href: `/customers/${customer.id}` },
          { label: projectDisplayName, href: `/projects/${id}` },
          { label: t('projectProducts.title') },
        ])
      } else {
        setBreadcrumb([
          { label: projectDisplayName, href: `/projects/${id}` },
          { label: t('projectProducts.title') },
        ])
      }
    }
    return () => setBreadcrumb([])
  }, [project, customer, setBreadcrumb, locale, id, t])

  // Product table columns - reused from project detail page
  const productColumns: ColumnDef<{
    id: string
    productId: string
    code: string
    part_number: string
    name: string
    name_cn: string
    description: string
    description_cn: string
    category: string
    unit: string
    hs_code: string
  }>[] = useMemo(() => [
    {
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.code")} />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("code")}</span>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.name")} />,
      cell: ({ row }) => {
        const name = locale === 'zh' && row.original.name_cn ? row.original.name_cn : row.original.name
        return (
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{name}</span>
          </div>
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
      cell: ({ row }) => {
        const desc = locale === 'zh' && row.original.description_cn ? row.original.description_cn : row.original.description
        return (
          <span className="text-muted-foreground max-w-[200px] truncate block" title={desc || "-"}>
            {desc || "-"}
          </span>
        )
      },
    },
    {
      accessorKey: "unit",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.unit")} />,
      cell: ({ row }) => <span>{UNITS[row.getValue("unit") as string]?.name_cn || row.getValue("unit")}</span>,
    },
    {
      accessorKey: "hs_code",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("products.columns.hsCode")} />,
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("hs_code") || "-"}</span>,
    },
  ], [t, locale, router, id])

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const pb = getPocketBase()
      const [projectData, productsData] = await Promise.all([
        pb.collection("projects").getOne<Project>(id, { expand: "customer" }),
        pb.collection("products_projects").getFullList<ProductProject>({ filter: `project = "${id}"`, expand: "product" }),
      ])
      setProject(projectData)
      setCustomer((projectData as any).expand?.customer || null)
      setProducts(productsData)
    } catch (err: any) {
      console.error("Error loading project:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveProduct = async (ppId: string) => {
    try {
      await productProjectService.delete(ppId)
      toast({
        title: t('projectProducts.removeSuccess'),
        description: t('projectProducts.removeSuccessDesc'),
      })
      loadData()
    } catch (error) {
      console.error('Error removing product:', error)
      toast({
        title: t('projectProducts.removeError'),
        variant: 'destructive',
      })
    }
  }

  const handleImportProducts = async (productIds: string[]) => {
    try {
      for (const productId of productIds) {
        await productProjectService.addProductToProject(productId, id)
      }
      toast({
        title: t('projectProducts.importSuccess'),
        description: t('projectProducts.importSuccessDesc', { count: String(productIds.length) }),
      })
      setImportDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Error importing products:', error)
      toast({
        title: t('projectProducts.importError'),
        variant: 'destructive',
      })
      throw error
    }
  }

  const handleCreateProduct = async (data: ProductCreateInput) => {
    setCreating(true)
    try {
      // Create the product
      const newProduct = await productService.createProduct(data)
      // Add to project
      await productProjectService.addProductToProject(newProduct.id, id)
      toast({
        title: t('projectProducts.createSuccess'),
        description: t('projectProducts.createSuccessDesc'),
      })
      setShowCreateForm(false)
      loadData()
    } catch (error) {
      console.error('Error creating product:', error)
      toast({
        title: t('projectProducts.createError'),
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const getDisplayName = () => {
    if (!project) return ""
    return locale === 'zh' && project.name_cn ? project.name_cn : project.name
  }

  const handleBack = () => {
    router.push(backConfig.href)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>{t("common.error")}: {error?.message || t("projects.notFound")}</p>
              <Button variant="outline" onClick={() => router.back()} className="mt-4">{t("common.back")}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const productTableData = products.map(pp => ({
    id: pp.id,
    productId: pp.expand?.product?.id || pp.product,
    code: pp.expand?.product?.code || '',
    part_number: pp.expand?.product?.part_number || '',
    name: pp.expand?.product?.name || '',
    name_cn: pp.expand?.product?.name_cn || '',
    description: pp.expand?.product?.description || '',
    description_cn: pp.expand?.product?.description_cn || '',
    category: pp.expand?.product?.category || '',
    unit: pp.expand?.product?.unit || '',
    hs_code: pp.expand?.product?.hs_code || '',
  }))

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold">{t('projectProducts.title')}</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              {getDisplayName()} - {project.code}
            </p>
          </div>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            {t('projectProducts.importFromLibrary')}
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? (
              <>
                <ChevronUp className="mr-2 h-4 w-4" />
                {t('projectProducts.hideForm')}
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                {t('projectProducts.createNew')}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Create Product Form (Collapsible) */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {t('projectProducts.createNewProduct')}
                </CardTitle>
                <CardDescription>{t('projectProducts.createNewProductDesc')}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ProductForm
              onSubmit={handleCreateProduct}
              onCancel={() => setShowCreateForm(false)}
              isLoading={creating}
              showProjectContext={false}
            />
          </CardContent>
        </Card>
      )}

      {/* Product List */}
      {products.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg bg-muted/20">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t('projectProducts.emptyTitle')}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {t('projectProducts.emptyDescription')}
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" size="lg" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              {t('projectProducts.importFromLibrary')}
            </Button>
            <Button size="lg" onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('projectProducts.createNew')}
            </Button>
          </div>
        </div>
      ) : (
        <DataTable
          columns={productColumns}
          data={productTableData}
          searchKey="name"
        />
      )}

      {/* Product Import Dialog */}
      <ProductImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImportProducts}
        excludeProductIds={products.map(pp => pp.product)}
      />
    </div>
  )
}
