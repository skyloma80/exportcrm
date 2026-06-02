"use client"

/**
 * Order Form Component
 * 销售订单表单组件
 * 
 * 强制项目上下文：项目和客户信息已在面包屑中展示，表单中隐藏选择器
 * Requirements: 3.1, 3.2
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { PortSelect } from "@/components/ui/port-select"
import { PaymentTermsSelect } from "@/components/ui/payment-terms-select"
import { CountrySelect } from "@/components/ui/country-select"
import { RemittanceSelect } from "@/components/ui/remittance-select"
import { ProjectSelect } from "@/components/ui/project-select"
import { CustomerSelect } from "@/components/ui/customer-select"
import { Ship, Building2, Package, Save, FileText, ExternalLink, Plus, Trash2 } from "lucide-react"
import Link from "next/link"
import { ProductSelectDialog } from "./product-select-dialog"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { useProjectContext } from "@/hooks/use-project-context"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { INCOTERMS, QUANTITY_UNITS } from "@/lib/constants/trade-standards"
import { CURRENCIES, COMMON_CURRENCIES } from "@/lib/constants/currencies"
import { getRate } from "@/lib/services/exchange-rate"
import type { FlatSO, SOCreateInput, SOItem } from "@/lib/pocketbase/services/so"
import type { Product } from "@/lib/pocketbase/services/products"
import { productService } from "@/lib/pocketbase/services/products"
import { calculatePackaging, type ProductPackaging } from "@/lib/services/packaging-calculator"
import { RefreshCw, GripVertical } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface OrderFormProps {
  initialData?: Partial<FlatSO>
  onSubmit: (data: SOCreateInput) => Promise<void>
  isLoading?: boolean
  /** 是否锁定项目字段（从项目上下文进入时） */
  projectLocked?: boolean
  /** 是否为编辑模式（隐藏code生成按钮，code只读） */
  isEdit?: boolean
}

interface SortableRowProps {
  item: SOItem
  index: number
  currency: string
  QUANTITY_UNITS: any[]
  updateLocalItem: (index: number, field: keyof SOItem, value: any) => void
  removeLocalItem: (index: number) => void
}

function SortableRow({
  item,
  index,
  currency,
  QUANTITY_UNITS,
  updateLocalItem,
  removeLocalItem
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  const subtotal = (item.quantity || 0) * (item.unit_price || 0)
  const currencySymbol = CURRENCIES[currency]?.symbol || currency;

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-[40px]">
        <div {...attributes} {...listeners} className="flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-muted rounded p-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell className="text-center font-medium text-muted-foreground">
        {index + 1}
      </TableCell>
      <TableCell>
        <Input
          value={item.part_number || ''}
          onChange={(e) => updateLocalItem(index, 'part_number', e.target.value)}
          placeholder="Part No."
          className="h-8 px-2 font-mono text-sm"
        />
      </TableCell>
      <TableCell>
        <Textarea
          value={item.description_en || ''}
          onChange={(e) => updateLocalItem(index, 'description_en', e.target.value)}
          placeholder="Description"
          className="min-h-[3rem] h-12 px-2 py-1 text-sm resize-y"
          rows={2}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          step="any"
          className="h-8 px-2"
          value={item.quantity || ''}
          onChange={(e) => updateLocalItem(index, 'quantity', parseFloat(e.target.value) || 0)}
        />
      </TableCell>
      <TableCell>
        <Select
          value={item.unit || 'PCS'}
          onValueChange={(value) => updateLocalItem(index, 'unit', value)}
        >
          <SelectTrigger className="h-8 px-2 text-sm">
            <SelectValue placeholder="PCS" />
          </SelectTrigger>
          <SelectContent>
            {QUANTITY_UNITS.map((unit) => (
              <SelectItem key={unit.code} value={unit.code}>
                {unit.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="0"
          step="any"
          className="h-8 px-2"
          value={item.unit_price || ''}
          onChange={(e) => updateLocalItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
        />
      </TableCell>
      <TableCell className="text-right whitespace-nowrap">{currencySymbol}{subtotal.toFixed(2)}</TableCell>
      <TableCell>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLocalItem(index)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

export function OrderForm({ initialData, onSubmit, isLoading, isEdit }: OrderFormProps) {
  const { t, locale } = useI18n()
  const { toast } = useToast()

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 使用项目上下文 Hook (Requirements: 3.1, 3.2)
  const { project: contextProject, customer: contextCustomer, isWithinProject, projectId } = useProjectContext()

  const [localItems, setLocalItems] = useState<SOItem[]>(
    (initialData?.items || []).map(item => ({
      ...item,
      id: item.id || Math.random().toString(36).substr(2, 9)
    }))
  )

  // 辅助函数：确保获取的是 ID 字符串 (增强版)
  const ensureId = (val: any): string => {
    if (!val) return ""
    if (Array.isArray(val)) return val[0] || "" // 兼容数组格式
    if (typeof val === 'string') return val
    if (typeof val === 'object' && (val as any).id) return (val as any).id
    return String(val)
  }

  // 探测 initialData 中的项目字段
  const getProjectIdFromData = (data: any) => {
    if (!data) return ""
    return ensureId(data.project_id || data.project || data.projectId)
  }

  const getCustomerIdFromData = (data: any) => {
    if (!data) return ""
    return ensureId(data.customer_id || data.customer || data.customerId)
  }
  const [showProductSearch, setShowProductSearch] = useState(false)

  const handleAddProduct = async (productIds: string[]) => {
    const products = await productService.getByIds(productIds)
    setLocalItems(prev => [
      ...prev,
      ...products.map(product => ({
        id: Math.random().toString(36).substr(2, 9),
        part_number: product.part_number || product.code || '',
        product_name: locale === 'zh' && product.name_cn ? product.name_cn : (product.name || ''),
        description_en: product.description || '',
        description_cn: product.description_cn || '',
        quantity: 1,
        unit: product.unit || 'PCS',
        unit_price: product.unit_price || 0,
        amount: product.unit_price || 0,
      }))
    ])
    setShowProductSearch(false)
  }

  const updateLocalItem = (index: number, field: keyof SOItem, value: any) => {
    setLocalItems(prev => {
      const newItems = [...prev]
      const cur = { ...newItems[index], [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        cur.amount = (Number(cur.quantity) || 0) * (Number(cur.unit_price) || 0)
      }
      newItems[index] = cur
      return newItems
    })
  }

  const removeLocalItem = (index: number) => {
    setLocalItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setLocalItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  // 格式化日期为 YYYY-MM-DD（HTML date input 需要的格式）
  const formatDateForInput = (dateStr?: string): string => {
    if (!dateStr) return ""
    return dateStr.split(" ")[0].split("T")[0]
  }

  const [formData, setFormData] = useState({
    code: initialData?.code || "",
    project_id: getProjectIdFromData(initialData) || projectId || "",
    customer_id: getCustomerIdFromData(initialData) || contextProject?.customer || "",
    customer_name: initialData?.customer_name || "",
    customer_address: initialData?.customer_address || "",
    customer_tax_id: initialData?.customer_tax_id || "",
    incoterm: initialData?.incoterm || "FOB",
    port_of_loading: initialData?.port_of_loading || "",
    port_of_destination: initialData?.port_of_destination || "",
    payment_terms: initialData?.payment_terms || "",
    currency: initialData?.currency || "USD",
    expected_delivery_date: formatDateForInput(initialData?.expected_delivery_date),
    country_of_origin: initialData?.country_of_origin || "China",
    country_of_destination: initialData?.country_of_destination || "",
    mode_of_shipment: initialData?.mode_of_shipment || "",
    bank_info: initialData?.bank_info || "",
    shipping_marks: initialData?.shipping_marks || "",
    estimated_shipping_date: formatDateForInput(initialData?.estimated_shipping_date),
    remarks: initialData?.remarks || "",
    customer_po: initialData?.customer_po || "",
    vendor_code: initialData?.vendor_code || "",
    status: initialData?.status || "draft",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentRate, setCurrentRate] = useState<number | null>(1)
  const [rateLoading, setRateLoading] = useState(false)
  const [generatingPackaging, setGeneratingPackaging] = useState(false)
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | undefined>(undefined)

  // 生成包装信息到备注字段
  const handleGeneratePackaging = async () => {
    if (localItems.length === 0) return

    setGeneratingPackaging(true)
    try {
      // 构建包装计算输入
      const packagingItems: ProductPackaging[] = localItems.map(item => ({
        product_id: item.id,
        product_name: item.product_name,
        quantity: item.quantity,
        // 如果有更多规格信息可以从库中读取，这里简化处理
      }))

      const summary = calculatePackaging(packagingItems)
      setFormData(prev => ({ ...prev, remarks: summary.text }))
    } catch (err) {
      console.error("Error generating packaging:", err)
    } finally {
      setGeneratingPackaging(false)
    }
  }

  // Load exchange rate when currency changes
  useEffect(() => {
    const loadExchangeRate = async () => {
      if (formData.currency === 'CNY') {
        setCurrentRate(1)
        return
      }

      setRateLoading(true)
      try {
        const rate = await getRate(formData.currency, 'CNY')
        setCurrentRate(rate)
      } catch (err) {
        console.error("Error loading exchange rate:", err)
        setCurrentRate(null)
      } finally {
        setRateLoading(false)
      }
    }
    loadExchangeRate()
  }, [formData.currency])

  // 当项目上下文加载完成时，或者初始数据变化时，更新表单数据
  useEffect(() => {
    if (initialData) {
      const extractedProjectId = getProjectIdFromData(initialData);
      const extractedCustomerId = getCustomerIdFromData(initialData);

      console.log("[OrderForm] initialData fields:", Object.keys(initialData));
      console.log("[OrderForm] Extracted IDs - Project:", extractedProjectId, "Customer:", extractedCustomerId);

      setFormData(prev => ({
        ...prev,
        project_id: extractedProjectId || prev.project_id,
        customer_id: extractedCustomerId || prev.customer_id,
      }))
    }
  }, [initialData])

  useEffect(() => {
    console.log("[OrderForm] Current formData.project_id:", formData.project_id);
  }, [formData.project_id])

  useEffect(() => {
    if (isWithinProject && contextProject) {
      setFormData(prev => {
        // 如果当前没有项目 ID，或者正在创建新订单，则使用上下文的项目 ID
        if (!prev.project_id || !initialData?.code) {
          return {
            ...prev,
            project_id: contextProject.id,
            customer_id: contextProject.customer,
            customer_name: contextCustomer?.name || prev.customer_name,
            currency: contextCustomer?.preferred_currency || prev.currency,
            country_of_destination: contextCustomer?.country || prev.country_of_destination,
          }
        }
        return prev
      })
    }
  }, [isWithinProject, contextProject, contextCustomer, initialData?.code])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.customer_name) newErrors.customer_name = t("validation.required")

    if (localItems.length === 0) {
      toast({
        title: t("validation.error"),
        description: locale === 'zh' ? '请至少添加一个产品' : 'Please add at least one product',
        variant: "destructive",
      })
      return false
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const totalAmount = localItems.reduce((sum, item) => sum + (item.amount || 0), 0)

    await onSubmit({
      ...formData,
      total_amount: totalAmount,
      items: localItems,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ========== 0. 基本信息与客户 ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            {locale === 'zh' ? '基本信息' : 'Basic Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t("orders.columns.code")}</Label>
              <Input
                value={formData.code || (locale === 'zh' ? '保存时自动生成' : 'Auto-generated on save')}
                placeholder="A2604-001"
                className="flex-1"
                readOnly
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>{t("orders.columns.status")}</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["draft", "confirmed", "in_production", "ready_to_ship", "shipped", "delivered", "completed", "cancelled"].map(s => (
                    <SelectItem key={s} value={s}>{t(`orders.status.${s}`) || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '客户名称' : 'Customer Name'} <span className="text-destructive">*</span></Label>
              <CustomerSelect
                value={formData.customer_id}
                onChange={(c) => {
                  if (c) {
                    setFormData(prev => ({
                      ...prev,
                      customer_id: c.id,
                      customer_name: c.name || "",
                      customer_address: (c as any).address || "",
                      customer_tax_id: (c as any).tax_id || "",
                      vendor_code: (c as any).supplier_id || prev.vendor_code
                    }))
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '所属项目' : 'Related Project'}</Label>
              <ProjectSelect
                value={formData.project_id}
                onChange={(p) => setFormData(prev => ({
                  ...prev,
                  project_id: p?.id || "",
                  customer_id: p?.customer || prev.customer_id
                }))}
                placeholder={locale === 'zh' ? '选择项目（可选）' : 'Select project (optional)'}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '客户订单号' : 'Customer PO Number'}</Label>
              <Input
                value={formData.customer_po}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_po: e.target.value }))}
                placeholder="e.g. COMP/20.260.001"
              />
            </div>
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '供应商代码' : 'Supplier ID'}</Label>
              <Input
                value={formData.vendor_code}
                onChange={(e) => setFormData(prev => ({ ...prev, vendor_code: e.target.value }))}
                placeholder="e.g. 40000594"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("orders.columns.currency")} <span className="text-destructive">*</span></Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}>
                <SelectTrigger className={errors.currency ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CURRENCIES.map(code => {
                    const currency = CURRENCIES[code]
                    return (
                      <SelectItem key={code} value={code}>
                        {code} - {locale === 'zh' ? currency.name_cn : currency.name}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("orders.columns.exchangeRate")}</Label>
              <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm flex items-center">
                {rateLoading ? (
                  <span className="text-muted-foreground">{t("common.loading")}...</span>
                ) : currentRate ? (
                  <span>1 {formData.currency} = {currentRate.toFixed(4)} CNY</span>
                ) : (
                  <span className="text-muted-foreground">{locale === 'zh' ? '暂无汇率' : 'No rate'}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== 1. 产品项列表（可编辑） ========== */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">{locale === 'zh' ? '产品明细' : 'Product Items'}</CardTitle>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => {
              setLocalItems(prev => [
                ...prev,
                {
                  id: Math.random().toString(36).substr(2, 9),
                  part_number: '',
                  product_name: '',
                  quantity: 1,
                  unit_price: 0,
                  amount: 0,
                  unit: 'PCS'
                }
              ])
            }}>
              <Plus className="mr-2 h-4 w-4" />
              {locale === 'zh' ? '添加产品' : 'Add Custom'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowProductSearch(true)}>
              <Package className="mr-2 h-4 w-4" />
              {locale === 'zh' ? '从库中添加' : 'Add from Library'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[60px] text-center">{t("orders.columns.seq")}</TableHead>
                    <TableHead className="w-[150px]">{t("orders.columns.partNo")}</TableHead>
                    <TableHead className="min-w-[200px]">{t("orders.columns.description")}</TableHead>
                    <TableHead className="w-[100px]">{t("orders.columns.quantity")}</TableHead>
                    <TableHead className="w-[100px]">{t("orders.columns.unit")}</TableHead>
                    <TableHead className="w-[150px]">{t("orders.columns.unitPrice")}</TableHead>
                    <TableHead className="text-right w-[150px]">{t("orders.columns.subtotal")}</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        {locale === 'zh' ? '暂无产品，请点击右上角添加' : 'No products added yet'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    <SortableContext
                      items={localItems.map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {localItems.map((item, index) => (
                        <SortableRow
                          key={item.id}
                          item={item}
                          index={index}
                          currency={formData.currency}
                          QUANTITY_UNITS={QUANTITY_UNITS}
                          updateLocalItem={updateLocalItem}
                          removeLocalItem={removeLocalItem}
                        />
                      ))}
                    </SortableContext>
                  )}
                </TableBody>
              </Table>
            </DndContext>
          </div>
        </CardContent>
      </Card>

      <ProductSelectDialog
        open={showProductSearch}
        onOpenChange={setShowProductSearch}
        onSelect={handleAddProduct}
      />



      {/* ========== 3. 贸易条款与物流（合并币种、汇率、物流信息） ========== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            <CardTitle className="text-base">{locale === 'zh' ? '贸易条款与物流' : 'Trade Terms & Shipping'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">


          {/* 第二行：Incoterm、付款条款 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("orders.columns.incoterm")} <span className="text-destructive">*</span></Label>
              <Select value={formData.incoterm} onValueChange={(v) => setFormData(prev => ({ ...prev, incoterm: v }))}>
                <SelectTrigger className={errors.incoterm ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INCOTERMS).map(([code, info]) => (
                    <SelectItem key={code} value={code}>
                      {code} - {locale === 'zh' ? info.name_cn : info.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{locale === 'zh' ? '付款条款' : 'Payment Terms'}</Label>
              <PaymentTermsSelect
                value={formData.payment_terms}
                onChange={(v) => setFormData(prev => ({ ...prev, payment_terms: v }))}
                placeholder={locale === 'zh' ? '选择付款条款' : 'Select terms'}
              />
            </div>
          </div>

          {/* 第三行：原产国、目的国 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '原产国' : 'Country of Origin'}</Label>
              <CountrySelect
                value={formData.country_of_origin}
                onChange={(v) => setFormData(prev => ({ ...prev, country_of_origin: v }))}
                placeholder={locale === 'zh' ? '选择国家' : 'Select country'}
              />
            </div>

            <div className="space-y-2">
              <Label>{locale === 'zh' ? '目的国' : 'Country of Destination'}</Label>
              <CountrySelect
                value={formData.country_of_destination}
                onChange={(v) => setFormData(prev => ({ ...prev, country_of_destination: v }))}
                placeholder={locale === 'zh' ? '选择国家' : 'Select country'}
              />
            </div>
          </div>

          {/* 第四行：装运港、目的港 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '装运港' : 'Port of Loading'}</Label>
              <PortSelect
                value={formData.port_of_loading}
                onChange={(v) => setFormData(prev => ({ ...prev, port_of_loading: v }))}
                placeholder={locale === 'zh' ? '选择港口' : 'Select port'}
              />
            </div>

            <div className="space-y-2">
              <Label>{locale === 'zh' ? '目的港' : 'Port of Destination'}</Label>
              <PortSelect
                value={formData.port_of_destination}
                onChange={(v) => setFormData(prev => ({ ...prev, port_of_destination: v }))}
                placeholder={locale === 'zh' ? '选择港口' : 'Select port'}
                type="destination"
              />
            </div>
          </div>

          {/* 第五行：交付日期 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("orders.columns.expectedDelivery")}</Label>
              <Input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
              />
            </div>

            {/* 预计装运日期 */}
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '预计装运日期' : 'Est. Shipping Date'}</Label>
              <Input
                type="date"
                value={formData.estimated_shipping_date}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_shipping_date: e.target.value }))}
              />
            </div>
          </div>

          {/* 第六行：运输方式 - 放在最后 */}
          <div className="space-y-2">
            <Label>{locale === 'zh' ? '运输方式' : 'Mode of Shipment'}</Label>
            <div className="space-y-2">
              <Input
                value={formData.mode_of_shipment}
                onChange={(e) => setFormData(prev => ({ ...prev, mode_of_shipment: e.target.value }))}
                placeholder={locale === 'zh' ? '输入或选择运输方式' : 'Enter or select mode'}
              />
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  'By Air',
                  'By Sea',
                  'By Courier (Fedex)',
                  'By Courier (UPS)',
                  'By Courier (DHL)',
                  'By Courier',
                  'By Train'
                ].map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, mode_of_shipment: mode }))}
                    className={formData.mode_of_shipment === mode ? "bg-primary/10 border-primary" : ""}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>



      {/* ========== 5. 银行信息（只读显示） ========== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            <CardTitle className="text-base">{locale === 'zh' ? '汇款信息' : 'Remittance Instructions'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 汇款信息快速选择 */}
          <div className="space-y-2">
            <Label>{locale === 'zh' ? '预设模板' : 'Preset Template'}</Label>
            <RemittanceSelect
              value={selectedBankAccountId}
              autoSelectDefault={!formData.bank_info}
              matchContent={formData.bank_info}
              onChange={(remittance) => {
                if (remittance) {
                  setSelectedBankAccountId(remittance.id)
                  setFormData(prev => ({
                    ...prev,
                    bank_info: remittance.items ? remittance.items.join('\n') : ""
                  }))
                } else {
                  setSelectedBankAccountId(undefined)
                }
              }}
            />
          </div>

          {/* 只读显示银行信息 */}
          <div className="space-y-2">
            <Label>{locale === 'zh' ? '账户信息' : 'Account Information'}</Label>
            {formData.bank_info ? (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableBody>
                    {formData.bank_info.split('\n').filter(line => line.trim() !== '').map((line, idx) => {
                      const separatorIdx = line.indexOf(':');
                      const hasSeparator = separatorIdx !== -1;
                      const label = hasSeparator ? line.substring(0, separatorIdx).trim() : '';
                      const value = hasSeparator ? line.substring(separatorIdx + 1).trim() : line.trim();
                      return (
                        <TableRow key={idx}>
                          {hasSeparator ? (
                            <>
                              <TableCell className="font-semibold w-1/3 bg-muted/50 border-r">{label}</TableCell>
                              <TableCell>{value}</TableCell>
                            </>
                          ) : (
                            <TableCell colSpan={2}>{value}</TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground italic text-sm">
                {locale === 'zh' ? '选择预设模板后自动填充' : 'Auto-filled after selecting a preset template'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ========== 6. 备注与唛头 ========== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle className="text-base">{locale === 'zh' ? '备注与唛头' : 'Remarks & Shipping Marks'}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between h-9">
                <Label>{locale === 'zh' ? '备注（包装信息等）' : 'Remarks (Packaging, etc.)'}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePackaging}
                  disabled={generatingPackaging || localItems.length === 0}
                >
                  {generatingPackaging ? (
                    <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Package className="mr-2 h-3 w-3" />
                  )}
                  {locale === 'zh' ? '生成包装信息' : 'Generate Packaging'}
                </Button>
              </div>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder={locale === 'zh' ? '包装信息、特殊条款、质量标准等' : 'Packaging info, special terms, quality standards, etc.'}
                rows={8}
              />
              <p className="text-xs text-muted-foreground">
                {locale === 'zh' ? '可根据产品包装规格自动生成，也可手动编辑' : 'Auto-generate from product specs or edit manually'}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between h-9">
                <Label>{locale === 'zh' ? '唛头要求' : 'Shipping Marks'}</Label>
              </div>
              <Textarea
                value={formData.shipping_marks}
                onChange={(e) => setFormData(prev => ({ ...prev, shipping_marks: e.target.value }))}
                placeholder={locale === 'zh' ? '唛头/标记要求' : 'Shipping marks requirements'}
                rows={8}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========== 7. 操作按钮 ========== */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading} size="lg" className="min-w-[200px]">
          <Save className="mr-2 h-5 w-5" />
          {isLoading ? t("common.loading") : t("common.save")}
        </Button>
      </div>
    </form>
  )
}

export default OrderForm
