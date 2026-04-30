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
import type { Order, OrderCreateInput, OrderItemWithExpand } from "@/lib/pocketbase/services/orders"
import type { Product } from "@/lib/pocketbase/services/products"
import { calculatePackaging, type ProductPackaging } from "@/lib/services/packaging-calculator"
import { RefreshCw } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"



export interface OrderFormProps {
  initialData?: Partial<Order>
  onSubmit: (data: OrderCreateInput, items: any[]) => Promise<void>
  isLoading?: boolean
  /** 是否锁定项目字段（从项目上下文进入时） */
  projectLocked?: boolean
  /** 订单明细项（用于生成包装信息） */
  items?: OrderItemWithExpand[]
}

export function OrderForm({ initialData, onSubmit, isLoading, items }: OrderFormProps) {
  const { t, locale } = useI18n()
  const { toast } = useToast()

  // 使用项目上下文 Hook (Requirements: 3.1, 3.2)
  const { project: contextProject, customer: contextCustomer, isWithinProject, projectId } = useProjectContext()

  const [localItems, setLocalItems] = useState<any[]>(items || [])
  const [showProductSearch, setShowProductSearch] = useState(false)

  // 同步外部传入的items到内部状态（如果是只读状态或初次加载）
  useEffect(() => {
    if (items) {
      setLocalItems(items)
    }
  }, [items])

  const handleAddProduct = (products: any[]) => {
    setLocalItems(prev => [
      ...prev,
      ...products.map(product => ({
        id: undefined, // new item
        product: product.id,
        product_code: product.part_number || product.code || '',
        product_name: locale === 'zh' && product.name_cn ? product.name_cn : (product.name || ''),
        quantity: 1,
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

  // 格式化日期为 YYYY-MM-DD（HTML date input 需要的格式）
  const formatDateForInput = (dateStr?: string): string => {
    if (!dateStr) return ""
    return dateStr.split(" ")[0].split("T")[0]
  }

  const [formData, setFormData] = useState<{
    project: string
    customer: string
    incoterm: string
    port_of_loading: string
    port_of_destination: string
    payment_terms: string
    currency: string
    exchange_rate: number | undefined
    expected_delivery_date: string
    country_of_origin: string
    country_of_destination: string
    mode_of_shipment: string
    bank_info: string  // 改为纯文本
    shipping_marks: string
    estimated_shipping_date: string
    remarks: string
    customer_po: string
    vendor_code: string
  }>({
    project: initialData?.project || "",
    customer: initialData?.customer || "",
    incoterm: initialData?.incoterm || "FOB",
    port_of_loading: initialData?.port_of_loading || "",
    port_of_destination: initialData?.port_of_destination || "",
    payment_terms: initialData?.payment_terms || "",
    currency: initialData?.currency || "USD",
    exchange_rate: initialData?.exchange_rate || undefined,
    expected_delivery_date: formatDateForInput(initialData?.expected_delivery_date),
    country_of_origin: initialData?.country_of_origin || "CN",
    country_of_destination: initialData?.country_of_destination || "",
    mode_of_shipment: initialData?.mode_of_shipment || "",
    bank_info: (() => {
      const raw = initialData?.bank_info;
      if (!raw) return '';
      // 现在存的是 JSON 字符串，需要解析为数组再转回换行符分隔的字符串
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.join('\n');
          }
        } catch (e) {
          // 解析失败，可能是旧格式的直接换行字符串
          return raw;
        }
      }
      // 如果是数组（旧数据格式）
      if (Array.isArray(raw)) {
        return raw.join('\n');
      }
      return '';
    })(),
    shipping_marks: initialData?.shipping_marks || "",
    estimated_shipping_date: formatDateForInput(initialData?.estimated_shipping_date),
    remarks: initialData?.remarks || "",
    customer_po: initialData?.customer_po || "",
    vendor_code: initialData?.vendor_code || "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentRate, setCurrentRate] = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(false)
  const [generatingPackaging, setGeneratingPackaging] = useState(false)
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | undefined>(undefined)

  // 生成包装信息到备注字段
  const handleGeneratePackaging = async () => {
    if (!items || items.length === 0) {
      return
    }

    setGeneratingPackaging(true)
    try {
      const pb = getPocketBase()

      // 获取所有产品的包装规格
      const productIds = items.map(item => item.product)
      const products = await pb.collection("products").getFullList<Product>({
        filter: productIds.map(id => `id = "${id}"`).join(" || "),
      })

      // 构建包装计算输入 - 强制使用英文名（用于 PI 文档）
      const packagingItems: ProductPackaging[] = localItems.map(item => {
        const product = products.find(p => p.id === item.product)
        return {
          product_id: item.product,
          product_name: product?.name || item.expand?.product?.name || 'Unknown',
          quantity: item.quantity,
          pcs_per_carton: product?.pcs_per_carton,
          carton_dimensions: product?.carton_dimensions,
          carton_gross_weight: product?.carton_gross_weight,
          carton_net_weight: product?.carton_net_weight,
        }
      })

      // 计算包装信息
      const summary = calculatePackaging(packagingItems)

      // 更新备注字段
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

  // 当项目上下文加载完成时，更新表单数据 (Requirements: 3.1, 3.2)
  useEffect(() => {
    if (isWithinProject && contextProject && !initialData?.project) {
      setFormData(prev => ({
        ...prev,
        project: contextProject.id,
        customer: contextProject.customer,
        currency: contextCustomer?.preferred_currency || prev.currency,
        country_of_destination: contextCustomer?.country || prev.country_of_destination,
      }))
      // 项目上下文加载完成时，仅设置基础字段
    }
  }, [isWithinProject, contextProject, contextCustomer, initialData?.project])

  // 自动计算运输方式：仅在用户未选择时，有港口则为海运，否则为空
  useEffect(() => {
    // 只有当用户尚未选择运输方式时才自动设置
    if (!formData.mode_of_shipment) {
      const autoMode: 'Sea' | '' = (formData.port_of_loading || formData.port_of_destination) ? "Sea" : ""
      if (autoMode) {
        setFormData(prev => ({ ...prev, mode_of_shipment: autoMode }))
      }
    }
  }, [formData.port_of_loading, formData.port_of_destination, formData.mode_of_shipment])



  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    // 项目和客户改为可选字段
    if (!formData.incoterm) newErrors.incoterm = t("validation.required")
    if (!formData.currency) newErrors.currency = t("validation.required")
    // 至少需要有一个产品
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

    // 项目和客户都改为可选，允许为空
    const projectIdToUse = formData.project || projectId || undefined
    const customerIdToUse = formData.customer || contextProject?.customer || undefined

    await onSubmit({
      project: projectIdToUse,
      customer: customerIdToUse || '',
      incoterm: formData.incoterm,
      port_of_loading: formData.port_of_loading || undefined,
      port_of_destination: formData.port_of_destination || undefined,
      payment_terms: formData.payment_terms || undefined,
      currency: formData.currency,
      exchange_rate: formData.exchange_rate,
      expected_delivery_date: formData.expected_delivery_date || undefined,
      country_of_origin: formData.country_of_origin || undefined,
      country_of_destination: formData.country_of_destination || undefined,
      mode_of_shipment: formData.mode_of_shipment || undefined,
      // 存为 JSON 字符串，PocketBase text 字段可以正确存储
      bank_info: formData.bank_info ? JSON.stringify(formData.bank_info.split('\n').filter(l => l.trim())) : undefined,
      shipping_marks: formData.shipping_marks || undefined,
      estimated_shipping_date: formData.estimated_shipping_date || undefined,
      remarks: formData.remarks || undefined,
      customer_po: formData.customer_po || undefined,
      vendor_code: formData.vendor_code || undefined,
    }, localItems)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ========== 0. 项目与客户（可选） ========== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{locale === 'zh' ? '项目与客户' : 'Project & Customer'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '项目（可选）' : 'Project (Optional)'}</Label>
              <ProjectSelect
                value={formData.project || projectId || ""}
                onChange={(p) => setFormData(prev => ({ ...prev, project: p?.id || "", customer: p?.customer || prev.customer }))}
                placeholder={locale === 'zh' ? '选择项目（可选）' : 'Select project (optional)'}
              />
            </div>
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '客户（可选）' : 'Customer (Optional)'}</Label>
              <CustomerSelect
                value={formData.customer || contextProject?.customer || ""}
                onChange={(c) => setFormData(prev => ({ ...prev, customer: c?.id || "" }))}
                placeholder={locale === 'zh' ? '选择客户（可选）' : 'Select customer (optional)'}
              />
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
                  id: undefined,
                  product: '',
                  product_name: '',
                  quantity: 1,
                  unit_price: 0,
                  amount: 0,
                }
              ])
            }}>
              <Plus className="mr-2 h-4 w-4" />
              {locale === 'zh' ? '添加自由产品' : 'Add Custom'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowProductSearch(true)}>
              <Package className="mr-2 h-4 w-4" />
              {locale === 'zh' ? '从库中添加' : 'Add from Library'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">{locale === 'zh' ? '零件号 (Part No.)' : 'Part Number'}</TableHead>
                  <TableHead className="min-w-[200px]">{locale === 'zh' ? '描述 (Description)' : 'Description'}</TableHead>
                  <TableHead className="w-[100px]">{locale === 'zh' ? '数量' : 'Quantity'}</TableHead>
                  <TableHead className="w-[100px]">{locale === 'zh' ? '单位' : 'Unit'}</TableHead>
                  <TableHead className="w-[150px]">{locale === 'zh' ? '单价' : 'Unit Price'}</TableHead>
                  <TableHead className="text-right w-[150px]">{locale === 'zh' ? '小计' : 'Subtotal'}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {locale === 'zh' ? '暂无产品，请点击右上角添加' : 'No products added yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  localItems.map((item, index) => {
                    const subtotal = (item.quantity || 0) * (item.unit_price || 0)

                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={item.product_code || ''}
                            onChange={(e) => updateLocalItemString(index, 'product_code', e.target.value)}
                            placeholder="Part No."
                            className="h-8 font-mono text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={item.product_name || ''}
                            onChange={(e) => updateLocalItemString(index, 'product_name', e.target.value)}
                            placeholder="Description"
                            className="min-h-[3rem] h-12 text-sm resize-y"
                            rows={2}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            min="0" 
                            step="any"
                            className="h-8"
                            value={item.quantity || ''} 
                            onChange={(e) => updateLocalItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={item.unit || ''} 
                            onValueChange={(value) => updateLocalItemString(index, 'unit', value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
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
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">{formData.currency}</span>
                            <Input 
                              type="number" 
                              min="0" 
                              step="any"
                              className="h-8"
                              value={item.unit_price || ''} 
                              onChange={(e) => updateLocalItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formData.currency} {subtotal.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLocalItem(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
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
          {/* 第0行：PO Number & Vendor Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '客户订单号 (PO Number)' : 'Customer PO Number'}</Label>
              <Input
                value={formData.customer_po}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_po: e.target.value }))}
                placeholder="e.g. COMP/20.260.001"
              />
            </div>
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '供应商代码 ' : 'Supplier ID'}</Label>
              <Input
                value={formData.vendor_code}
                onChange={(e) => setFormData(prev => ({ ...prev, vendor_code: e.target.value }))}
                placeholder="e.g. 40000594"
              />
            </div>
          </div>

          {/* 第一行：币种、汇率 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              />
              <div className="flex flex-wrap gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, mode_of_shipment: 'Sea' }))}
                >
                  Sea
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, mode_of_shipment: 'Air (FedEx)' }))}
                >
                  Air (FedEx)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, mode_of_shipment: 'Air (DHL)' }))}
                >
                  Air (DHL)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, mode_of_shipment: 'Land' }))}
                >
                  Land
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, mode_of_shipment: 'Express (UPS)' }))}
                >
                  Express (UPS)
                </Button>
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
