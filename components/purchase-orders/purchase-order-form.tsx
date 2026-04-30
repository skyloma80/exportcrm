"use client"

/**
 * Purchase Order Form Component
 * 采购订单表单组件
 * 
 * 按照销售订单同样的模式，不强制关联项目
 * Requirements: 3.1
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
import { SupplierSelect } from "@/components/ui/supplier-select"
import { Ship, Building2, Package, Save, Plus, Trash2, RefreshCw } from "lucide-react"
import { ProductSelectDialog } from "@/components/orders/product-select-dialog"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useToast } from "@/hooks/use-toast"
import { useProjectContext } from "@/hooks/use-project-context"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { INCOTERMS, QUANTITY_UNITS } from "@/lib/constants/trade-standards"
import { CURRENCIES, COMMON_CURRENCIES } from "@/lib/constants/currencies"
import { getRate } from "@/lib/services/exchange-rate"
import type { PurchaseOrder, POCreateInput, PurchaseOrderItem } from "@/lib/pocketbase/services/purchase-orders"
import type { Product } from "@/lib/pocketbase/services/products"
import { calculatePackaging, type ProductPackaging } from "@/lib/services/packaging-calculator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface PurchaseOrderFormProps {
  initialData?: Partial<PurchaseOrder>
  onSubmit: (data: POCreateInput, items: any[]) => Promise<void>
  isLoading?: boolean
  items?: PurchaseOrderItem[]
}

export function PurchaseOrderForm({ initialData, onSubmit, isLoading, items }: PurchaseOrderFormProps) {
  const { t, locale } = useI18n()
  const { toast } = useToast()

  const { project: contextProject, isWithinProject, projectId } = useProjectContext()

  const [localItems, setLocalItems] = useState<any[]>(items || [])
  const [showProductSearch, setShowProductSearch] = useState(false)

  useEffect(() => {
    if (items) {
      setLocalItems(items)
    }
  }, [items])

  const handleAddProduct = (products: any[]) => {
    setLocalItems(prev => [
      ...prev,
      ...products.map(product => ({
        id: undefined,
        product: product.id,
        product_code: product.code || '',
        product_name: product.name || '',
        part_number: product.part_number || product.code || '',
        description_en: product.description || product.name || '',
        description_cn: product.description_cn || product.name_cn || '',
        quantity: 1,
        unit: product.unit || 'PCS',
        unit_price: product.unit_price || 0,
        amount: product.unit_price || 0,
        expand: { product }
      }))
    ])
    setShowProductSearch(false)
  }

  const updateLocalItem = (index: number, field: string, value: number) => {
    setLocalItems(prev => {
      const newItems = [...prev]
      const cur = { ...newItems[index] }
      cur[field] = value
      cur.amount = (field === 'quantity' ? value : cur.quantity) * (field === 'unit_price' ? value : cur.unit_price)
      newItems[index] = cur
      return newItems
    })
  }

  const updateLocalItemString = (index: number, field: string, value: string) => {
    setLocalItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }
      return newItems
    })
  }

  const removeLocalItem = (index: number) => {
    setLocalItems(prev => prev.filter((_, i) => i !== index))
  }

  const formatDateForInput = (dateStr?: string): string => {
    if (!dateStr) return ""
    return dateStr.split(" ")[0].split("T")[0]
  }

  const [formData, setFormData] = useState({
    project: initialData?.project || "",
    supplier: initialData?.supplier || "",
    order: (initialData as any)?.order || "",
    rfq: (initialData as any)?.rfq || "",
    status: initialData?.status || "draft",
    currency: initialData?.currency || "CNY",
    expected_delivery_date: formatDateForInput(initialData?.expected_delivery_date),
    remarks: initialData?.remarks || "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentRate, setCurrentRate] = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(false)
  const [generatingPackaging, setGeneratingPackaging] = useState(false)
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | undefined>(undefined)

  useEffect(() => {
    const loadExchangeRate = async () => {
      if (formData.currency === 'CNY') {
        setCurrentRate(1)
        setFormData(prev => ({ ...prev, exchange_rate: 1 }))
        return
      }

      setRateLoading(true)
      try {
        const rate = await getRate(formData.currency, 'CNY')
        setCurrentRate(rate)
        setFormData(prev => ({ ...prev, exchange_rate: rate }))
      } catch (err) {
        console.error("Error loading exchange rate:", err)
        setCurrentRate(null)
      } finally {
        setRateLoading(false)
      }
    }
    loadExchangeRate()
  }, [formData.currency])

  useEffect(() => {
    if (isWithinProject && contextProject && !initialData?.project) {
      setFormData(prev => ({
        ...prev,
        project: contextProject.id,
      }))
    }
  }, [isWithinProject, contextProject, initialData?.project])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.supplier) newErrors.supplier = t("validation.required")
    if (!formData.currency) newErrors.currency = t("validation.required")
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

    const projectIdToUse = formData.project || projectId || null
    const supplierIdToUse = formData.supplier || null

    try {
      await onSubmit({
        ...formData,
        project: projectIdToUse as any,
        supplier: supplierIdToUse as any,
        order: formData.order || null,
        rfq: formData.rfq || null,
        total_amount: localItems.reduce((sum, item) => sum + item.amount, 0),
      } as any, localItems)
    } catch (err: any) {
      console.error("Form submission error:", err)
      if (err.response?.data) {
        console.error("Validation errors:", JSON.stringify(err.response.data, null, 2))
      }
      throw err
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{locale === 'zh' ? '基本信息' : 'Basic Info'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '供应商' : 'Supplier'} *</Label>
              <SupplierSelect
                value={formData.supplier}
                onChange={(s) => setFormData(prev => ({ ...prev, supplier: s?.id || "" }))}
                placeholder={locale === 'zh' ? '选择供应商' : 'Select supplier'}
              />
              {errors.supplier && <p className="text-sm text-destructive">{errors.supplier}</p>}
            </div>
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '关联项目（可选）' : 'Project (Optional)'}</Label>
              <ProjectSelect
                value={formData.project || projectId || ""}
                onChange={(p) => setFormData(prev => ({ ...prev, project: p?.id || "" }))}
                placeholder={locale === 'zh' ? '选择项目' : 'Select project'}
              />
            </div>
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '币种' : 'Currency'} *</Label>
              <Select value={formData.currency} onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMMON_CURRENCIES.map(code => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">{locale === 'zh' ? '产品明细' : 'Product Items'}</CardTitle>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => {
              setLocalItems(prev => [
                ...prev,
                {
                  id: undefined,
                  product: '',
                  product_name: '',
                  product_code: '',
                  part_number: '',
                  description_en: '',
                  description_cn: '',
                  quantity: 1,
                  unit: 'PCS',
                  unit_price: 0,
                  amount: 0,
                }
              ])
            }}>
              <Plus className="mr-2 h-4 w-4" />
              {locale === 'zh' ? '添加自定义产品' : 'Add Custom'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowProductSearch(true)}>
              <Package className="mr-2 h-4 w-4" />
              {locale === 'zh' ? '从库中添加' : 'Add from Library'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">{locale === 'zh' ? '零件号' : 'Part No.'}</TableHead>
                <TableHead>{locale === 'zh' ? '描述(英文)' : 'Description(EN)'}</TableHead>
                <TableHead>{locale === 'zh' ? '描述(中文)' : 'Description(CN)'}</TableHead>
                <TableHead className="w-[80px]">{locale === 'zh' ? '数量' : 'Qty'}</TableHead>
                <TableHead className="w-[80px]">{locale === 'zh' ? '单位' : 'Unit'}</TableHead>
                <TableHead className="w-[120px]">{locale === 'zh' ? '单价' : 'Unit Price'}</TableHead>
                <TableHead className="text-right w-[100px]">{locale === 'zh' ? '小计' : 'Subtotal'}</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={item.part_number || ''}
                      onChange={(e) => updateLocalItemString(index, 'part_number', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={item.description_en || ''}
                      onChange={(e) => updateLocalItemString(index, 'description_en', e.target.value)}
                      className="min-h-[2rem] h-8 text-sm resize-y"
                      rows={1}
                    />
                  </TableCell>
                  <TableCell>
                    <Textarea
                      value={item.description_cn || ''}
                      onChange={(e) => updateLocalItemString(index, 'description_cn', e.target.value)}
                      className="min-h-[2rem] h-8 text-sm resize-y"
                      rows={1}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLocalItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.unit || ''}
                      onChange={(e) => updateLocalItemString(index, 'unit', e.target.value)}
                      placeholder="PCS"
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateLocalItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {(item.quantity * item.unit_price).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLocalItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{locale === 'zh' ? '交货与备注' : 'Delivery & Remarks'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '交货日期' : 'Delivery Date'}</Label>
              <Input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{locale === 'zh' ? '备注' : 'Remarks'}</Label>
            <Textarea
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t("common.loading") : t("common.save")}
        </Button>
      </div>

      <ProductSelectDialog
        open={showProductSearch}
        onOpenChange={setShowProductSearch}
        onSelect={handleAddProduct}
      />
    </form>
  )
}
