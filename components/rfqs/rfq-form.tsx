"use client"

/**
 * RFQ Form Component
 * 询价单表单组件
 * 
 * 强制项目上下文：项目选择器和客户显示字段已移除
 * 项目信息通过 URL 参数传递，在面包屑中展示
 * Requirements: 3.1, 3.2
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useProjectContext } from "@/hooks/use-project-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/lib/i18n/use-i18n"
import { Loader2, Plus, Trash2, Package, Building2, Settings } from "lucide-react"
import { ProjectSelectDialog } from "./project-select-dialog"
import { ProductSelectDialog, RFQItemInput } from "./product-select-dialog"
import { SupplierSelectDialog, SupplierSelectItem } from "./supplier-select-dialog"
import { ProjectWithRelations } from "@/lib/pocketbase/services/projects"
import { RFQ, RFQStatus } from "@/lib/pocketbase/services/rfqs"

interface ValidationErrors {
  project?: string
  items?: string
  suppliers?: string
}

export interface RFQFormData {
  project: string
  projectName?: string
  customerName?: string
  status: RFQStatus
  deadline?: string
  remarks?: string
  items: RFQItemInput[]
  suppliers: SupplierSelectItem[]
}

// Simplified project data for the form
interface ProjectDataForForm {
  id: string
  code: string
  name: string
  name_cn?: string
  expand?: {
    customer?: {
      id: string
      code: string
      name: string
      name_cn?: string
    }
  }
}

export interface RFQFormProps {
  initialData?: Partial<RFQ> & {
    items?: RFQItemInput[]
    suppliers?: SupplierSelectItem[]
    projectData?: ProjectDataForForm
  }
  onSubmit: (data: RFQFormData, sendEmail?: boolean) => Promise<void>
  isLoading?: boolean
  projectLocked?: boolean
}

export function RFQForm({ initialData, onSubmit, isLoading, projectLocked }: RFQFormProps) {
  const { t, locale } = useI18n()
  
  // 使用项目上下文 Hook (Requirements: 1.2)
  const { project: contextProject, customer: contextCustomer, isWithinProject } = useProjectContext()
  
  const [formData, setFormData] = useState<RFQFormData>({
    project: initialData?.project || "",
    projectName: initialData?.projectData?.name || "",
    customerName: initialData?.projectData?.expand?.customer?.name || "",
    status: initialData?.status || "draft",
    deadline: initialData?.deadline || "",
    remarks: initialData?.remarks || "",
    items: initialData?.items || [],
    suppliers: initialData?.suppliers || [],
  })
  
  // 当项目上下文加载完成时，更新表单数据
  useEffect(() => {
    if (isWithinProject && contextProject && !initialData?.project) {
      const projectName = locale === "zh" && contextProject.name_cn 
        ? contextProject.name_cn 
        : contextProject.name
      const customerName = contextCustomer
        ? (locale === "zh" && contextCustomer.name_cn ? contextCustomer.name_cn : contextCustomer.name)
        : ""
      
      setFormData(prev => ({
        ...prev,
        project: contextProject.id,
        projectName,
        customerName,
      }))
    }
  }, [isWithinProject, contextProject, contextCustomer, locale, initialData?.project])
  
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {}
    
    if (!formData.project) {
      newErrors.project = t("validation.required")
    }
    if (formData.items.length === 0) {
      newErrors.items = t("validation.required")
    }
    if (formData.suppliers.length === 0) {
      newErrors.suppliers = t("validation.required")
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(formData, false)
  }

  const handleSubmitAndSend = async () => {
    if (!validate()) return
    await onSubmit(formData, true)
  }

  const handleProjectSelect = (project: ProjectWithRelations) => {
    const customerName = project.expand?.customer
      ? (locale === "zh" && project.expand.customer.name_cn
          ? project.expand.customer.name_cn
          : project.expand.customer.name)
      : ""
    
    setFormData(prev => ({
      ...prev,
      project: project.id,
      projectName: locale === "zh" && project.name_cn ? project.name_cn : project.name,
      customerName,
    }))
    
    if (errors.project) {
      setErrors(prev => ({ ...prev, project: undefined }))
    }
  }

  const handleProductsSelect = (items: RFQItemInput[]) => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, ...items],
    }))
    
    if (errors.items) {
      setErrors(prev => ({ ...prev, items: undefined }))
    }
  }

  const handleSuppliersSelect = (suppliers: SupplierSelectItem[]) => {
    // Merge with existing suppliers, avoiding duplicates
    const existingIds = new Set(formData.suppliers.map(s => s.id))
    const newSuppliers = suppliers.filter(s => !existingIds.has(s.id))
    
    setFormData(prev => ({
      ...prev,
      suppliers: [...prev.suppliers, ...newSuppliers],
    }))
    
    if (errors.suppliers) {
      setErrors(prev => ({ ...prev, suppliers: undefined }))
    }
  }

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const handleRemoveSupplier = (supplierId: string) => {
    setFormData(prev => ({
      ...prev,
      suppliers: prev.suppliers.filter(s => s.id !== supplierId),
    }))
  }

  const handleItemChange = (index: number, field: keyof RFQItemInput, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const getDisplayName = (item: { name?: string; name_cn?: string; productName?: string; productNameCn?: string }) => {
    const name = item.productName || item.name || ""
    const nameCn = item.productNameCn || item.name_cn || ""
    if (locale === "zh" && nameCn) return nameCn
    return name
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Products */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t("rfqs.items.title")}
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setProductDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("rfqs.items.add")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {errors.items && <p className="text-sm text-destructive mb-4">{errors.items}</p>}
            
            {formData.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>{t("rfqs.items.empty")}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("rfqs.items.product")}</TableHead>
                    <TableHead className="w-[120px]">{t("rfqs.items.quantity")}</TableHead>
                    <TableHead className="w-[120px]">{t("rfqs.items.targetPrice")}</TableHead>
                    <TableHead className="w-[200px]">{t("rfqs.items.remarks")}</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getDisplayName(item)}</p>
                          <p className="text-sm text-muted-foreground">{item.productCode}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">{item.unit}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.target_price || ""}
                          onChange={(e) => handleItemChange(index, "target_price", parseFloat(e.target.value) || undefined)}
                          placeholder="0.00"
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.remarks || ""}
                          onChange={(e) => handleItemChange(index, "remarks", e.target.value)}
                          placeholder={t("rfqs.items.remarks")}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Suppliers */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t("rfqs.suppliers.title")}
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSupplierDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("rfqs.suppliers.add")}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {errors.suppliers && <p className="text-sm text-destructive mb-4">{errors.suppliers}</p>}
            
            {formData.suppliers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>{t("rfqs.suppliers.empty")}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("suppliers.columns.code")}</TableHead>
                    <TableHead>{t("suppliers.columns.name")}</TableHead>
                    <TableHead>{t("suppliers.columns.country")}</TableHead>
                    <TableHead>{t("suppliers.columns.type")}</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formData.suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-mono text-sm">{supplier.code}</TableCell>
                      <TableCell className="font-medium">{getDisplayName(supplier)}</TableCell>
                      <TableCell>{supplier.country || "-"}</TableCell>
                      <TableCell>
                        {supplier.type ? (
                          <Badge variant="outline">{t(`suppliers.type.${supplier.type}`)}</Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSupplier(supplier.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* RFQ Settings - 合并截止日期和备注 (Requirements: 1.1, 1.2) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t("rfqs.settings.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline">
                  {t("rfqs.info.deadline")}
                </Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">{t("rfqs.columns.remarks")}</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder={t("rfqs.placeholders.remarks")}
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={handleSubmitAndSend} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("common.send")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Dialogs */}
      <ProjectSelectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSelect={handleProjectSelect}
        selectedProjectId={formData.project}
      />

      <ProductSelectDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        onSelect={handleProductsSelect}
        projectId={formData.project}
        excludeProductIds={formData.items.map(item => item.product)}
      />

      <SupplierSelectDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onSelect={handleSuppliersSelect}
        selectedSupplierIds={formData.suppliers.map(s => s.id)}
      />
    </>
  )
}
