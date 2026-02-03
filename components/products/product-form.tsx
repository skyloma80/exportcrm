"use client"

/**
 * Product Form Component
 * 产品表单组件
 * 
 * 支持项目上下文：当从项目内创建产品时，自动关联到当前项目
 * Requirements: 1.5, 7.4
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useProjectContext } from "@/hooks/use-project-context"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { Product, ProductCategory, ProductCreateInput, CartonDimensions } from "@/lib/pocketbase/services/products"
import { QUANTITY_UNITS } from "@/lib/constants/trade-standards"
import { Loader2, Plus, ExternalLink, FolderKanban, Package } from "lucide-react"
import { KeyValueEditor } from "@/components/ui/key-value-editor"

interface ValidationErrors {
  name?: string
  unit?: string
}

export interface ProductFormProps {
  initialData?: Partial<Product>
  onSubmit: (data: ProductCreateInput) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  /** 创建产品后的回调，用于创建项目关联 (Requirements: 1.5, 7.4) */
  onProductCreated?: (productId: string) => Promise<void>
  /** 是否显示项目上下文指示器，默认为 true */
  showProjectContext?: boolean
}

export function ProductForm({ initialData, onSubmit, onCancel, isLoading, onProductCreated, showProjectContext = true }: ProductFormProps) {
  const { t, locale } = useI18n()
  
  // 使用项目上下文 Hook (Requirements: 1.5, 7.4)
  const { projectId, project, isWithinProject, loading: contextLoading } = useProjectContext()
  
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryNameCn, setNewCategoryNameCn] = useState("")
  const [addingCategory, setAddingCategory] = useState(false)
  
  const [formData, setFormData] = useState<ProductCreateInput>({
    part_number: initialData?.part_number || "",
    name: initialData?.name || "",
    name_cn: initialData?.name_cn || "",
    description: initialData?.description || "",
    description_cn: initialData?.description_cn || "",
    category: initialData?.category || "",
    unit: initialData?.unit || "pcs",
    hs_code: initialData?.hs_code || "",
    specifications: initialData?.specifications || {},
    // 包装规格字段
    pcs_per_carton: initialData?.pcs_per_carton,
    carton_dimensions: initialData?.carton_dimensions,
    carton_gross_weight: initialData?.carton_gross_weight,
    carton_net_weight: initialData?.carton_net_weight,
  })
  
  const [errors, setErrors] = useState<ValidationErrors>({})

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const pb = getPocketBase()
      const result = await pb.collection("product_categories").getFullList<ProductCategory>({
        sort: "sort_order,name",
      })
      setCategories(result)
    } catch (err) {
      console.error("Error loading categories:", err)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    setAddingCategory(true)
    try {
      const pb = getPocketBase()
      const newCategory = await pb.collection("product_categories").create<ProductCategory>({
        name: newCategoryName.trim(),
        name_cn: newCategoryNameCn.trim() || undefined,
        sort_order: categories.length,
      })
      setCategories(prev => [...prev, newCategory])
      handleChange("category", newCategory.id)
      setShowAddCategory(false)
      setNewCategoryName("")
      setNewCategoryNameCn("")
    } catch (err) {
      console.error("Error adding category:", err)
    } finally {
      setAddingCategory(false)
    }
  }


  const validate = (): boolean => {
    const newErrors: ValidationErrors = {}
    if (!formData.name.trim()) newErrors.name = t("validation.required")
    if (!formData.unit.trim()) newErrors.unit = t("validation.required")
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(formData)
  }

  const handleChange = (field: keyof ProductCreateInput, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-4 space-y-4">
          {/* 项目上下文指示器 (Requirements: 1.5, 5.3) */}
          {showProjectContext && isWithinProject && project && (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
              <FolderKanban className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {locale === 'zh' ? '将添加到项目' : 'Will be added to project'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {project.code} - {locale === 'zh' && project.name_cn ? project.name_cn : project.name}
                </p>
              </div>
            </div>
          )}
          
          {/* ===== 基本信息 ===== */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              {locale === 'zh' ? '基本信息' : 'Basic Information'}
            </h3>
            
            {/* Row 1: Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name">{t("products.columns.name")} <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder={t("products.placeholders.name")}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="name_cn">{t("products.columns.nameCn")}</Label>
                <Input
                  id="name_cn"
                  value={formData.name_cn}
                  onChange={(e) => handleChange("name_cn", e.target.value)}
                  placeholder={t("products.placeholders.nameCn")}
                />
              </div>
            </div>

            {/* Row 2: Part Number, Category, Unit, HS Code */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label htmlFor="part_number">{t("products.columns.partNumber")}</Label>
                <Input
                  id="part_number"
                  value={formData.part_number}
                  onChange={(e) => handleChange("part_number", e.target.value)}
                  placeholder={t("products.placeholders.partNumber")}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("products.columns.category")}</Label>
                <div className="flex gap-2">
                  <Select value={formData.category || "_none_"} onValueChange={(value) => handleChange("category", value === "_none_" ? undefined : value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t("products.placeholders.category")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">-</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {locale === 'zh' && cat.name_cn ? cat.name_cn : cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowAddCategory(true)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>{t("products.columns.unit")} <span className="text-destructive">*</span></Label>
                <Select value={formData.unit} onValueChange={(value) => handleChange("unit", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUANTITY_UNITS.map((unit) => (
                      <SelectItem key={unit.code} value={unit.code}>
                        {unit.code} - {locale === 'zh' ? unit.name_cn : unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unit && <p className="text-sm text-destructive">{errors.unit}</p>}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="hs_code">{t("products.columns.hsCode")}</Label>
                  {(formData.name_cn || formData.name) && (
                    <a
                      href={`https://www.hsbianma.com/search?keywords=${encodeURIComponent(formData.name_cn || formData.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                      title={`${locale === 'zh' ? '查询' : 'Search'}: ${formData.name_cn || formData.name}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <Input
                  id="hs_code"
                  value={formData.hs_code}
                  onChange={(e) => handleChange("hs_code", e.target.value)}
                  placeholder={t("products.placeholders.hsCode")}
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          {/* ===== 描述信息 ===== */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              {locale === 'zh' ? '描述信息' : 'Description'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="description">{t("products.columns.description")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder={t("products.placeholders.description")}
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description_cn">{t("products.columns.descriptionCn")}</Label>
                <Textarea
                  id="description_cn"
                  value={formData.description_cn}
                  onChange={(e) => handleChange("description_cn", e.target.value)}
                  placeholder={t("products.placeholders.descriptionCn")}
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* ===== 规格与包装 ===== */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              {locale === 'zh' ? '规格与包装' : 'Specifications & Packaging'}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Specifications */}
              <div className="space-y-1">
                <Label>{t("products.info.specifications")}</Label>
                <KeyValueEditor
                  value={formData.specifications || {}}
                  onChange={(specs) => handleChange("specifications", specs)}
                  keyPlaceholder={locale === 'zh' ? '参数名称' : 'Parameter'}
                  valuePlaceholder={locale === 'zh' ? '参数值' : 'Value'}
                />
              </div>

              {/* Packaging Specifications - Requirements: 1.1, 1.2, 1.3, 1.4 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">
                    {locale === 'zh' ? '包装规格' : 'Packaging'}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    ({locale === 'zh' ? '可选' : 'Optional'})
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="pcs_per_carton" className="text-xs">
                      {locale === 'zh' ? '每箱数量' : 'Pcs/Carton'}
                    </Label>
                    <Input
                      id="pcs_per_carton"
                      type="number"
                      min="1"
                      value={formData.pcs_per_carton || ""}
                      onChange={(e) => handleChange("pcs_per_carton", e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="carton_gross_weight" className="text-xs">
                      {locale === 'zh' ? '毛重/箱 (kg)' : 'G.W./Ctn (kg)'}
                    </Label>
                    <Input
                      id="carton_gross_weight"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.carton_gross_weight || ""}
                      onChange={(e) => handleChange("carton_gross_weight", e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="25"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="carton_net_weight" className="text-xs">
                      {locale === 'zh' ? '净重/箱 (kg)' : 'N.W./Ctn (kg)'}
                    </Label>
                    <Input
                      id="carton_net_weight"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.carton_net_weight || ""}
                      onChange={(e) => handleChange("carton_net_weight", e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="23"
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">
                    {locale === 'zh' ? '纸箱尺寸 L×W×H (mm)' : 'Carton L×W×H (mm)'}
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.carton_dimensions?.length || ""}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : undefined;
                        handleChange("carton_dimensions", value || formData.carton_dimensions?.width || formData.carton_dimensions?.height ? {
                          length: value || 0,
                          width: formData.carton_dimensions?.width || 0,
                          height: formData.carton_dimensions?.height || 0,
                        } : undefined);
                      }}
                      placeholder="L"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.carton_dimensions?.width || ""}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : undefined;
                        handleChange("carton_dimensions", value || formData.carton_dimensions?.length || formData.carton_dimensions?.height ? {
                          length: formData.carton_dimensions?.length || 0,
                          width: value || 0,
                          height: formData.carton_dimensions?.height || 0,
                        } : undefined);
                      }}
                      placeholder="W"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.carton_dimensions?.height || ""}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : undefined;
                        handleChange("carton_dimensions", value || formData.carton_dimensions?.length || formData.carton_dimensions?.width ? {
                          length: formData.carton_dimensions?.length || 0,
                          width: formData.carton_dimensions?.width || 0,
                          height: value || 0,
                        } : undefined);
                      }}
                      placeholder="H"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("common.save")}
          </Button>
        </CardFooter>
      </form>

      {/* Add Category Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{locale === 'zh' ? '添加分类' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category_name">{locale === 'zh' ? '分类名称 (英文)' : 'Category Name'} *</Label>
              <Input
                id="category_name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={locale === 'zh' ? '输入分类名称' : 'Enter category name'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category_name_cn">{locale === 'zh' ? '分类名称 (中文)' : 'Category Name (Chinese)'}</Label>
              <Input
                id="category_name_cn"
                value={newCategoryNameCn}
                onChange={(e) => setNewCategoryNameCn(e.target.value)}
                placeholder={locale === 'zh' ? '输入中文名称' : 'Enter Chinese name'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowAddCategory(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddCategory} disabled={addingCategory || !newCategoryName.trim()}>
              {addingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
