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
import { BankAccountSelect } from "@/components/ui/bank-account-select"
import { Ship, Building2, Package, Save, FileText, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useProjectContext } from "@/hooks/use-project-context"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { INCOTERMS } from "@/lib/constants/trade-standards"
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

interface Quotation {
  id: string
  code: string
  version: number
  project: string
  customer: string
  incoterm: string
  port_of_loading?: string
  port_of_destination?: string
  payment_terms?: string
  currency: string
  exchange_rate?: number
}

export interface OrderFormProps {
  initialData?: Partial<Order>
  onSubmit: (data: OrderCreateInput) => Promise<void>
  isLoading?: boolean
  /** 是否锁定项目字段（从项目上下文进入时） */
  projectLocked?: boolean
  /** 订单明细项（用于生成包装信息） */
  items?: OrderItemWithExpand[]
}

export function OrderForm({ initialData, onSubmit, isLoading, items }: OrderFormProps) {
  const { t, locale } = useI18n()

  // 使用项目上下文 Hook (Requirements: 3.1, 3.2)
  const { project: contextProject, customer: contextCustomer, isWithinProject, projectId } = useProjectContext()

  const [quotations, setQuotations] = useState<Quotation[]>([])

  // 格式化日期为 YYYY-MM-DD（HTML date input 需要的格式）
  const formatDateForInput = (dateStr?: string): string => {
    if (!dateStr) return ""
    return dateStr.split(" ")[0].split("T")[0]
  }

  const [formData, setFormData] = useState<{
    project: string
    customer: string
    quotation: string
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
    quotation: initialData?.quotation || "",
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
    bank_info: typeof initialData?.bank_info === 'string'
      ? initialData.bank_info
      : (initialData?.bank_info ? JSON.stringify(initialData.bank_info, null, 2) : ""),
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
      const packagingItems: ProductPackaging[] = items.map(item => {
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
      // 加载该项目的报价单
      loadQuotations(contextProject.id)
    } else if (initialData?.project) {
      // 编辑模式：加载该项目的报价单
      loadQuotations(initialData.project)
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

  const loadQuotations = async (projectIdToLoad: string) => {
    try {
      const pb = getPocketBase()
      const quotationsRes = await pb.collection("quotations").getFullList<Quotation>({
        filter: `project = "${projectIdToLoad}" && status = "accepted"`,
        sort: "-created",
      })
      setQuotations(quotationsRes)

      // 编辑模式：如果订单有关联报价单，且不在列表中，单独加载它
      if (initialData?.quotation && !quotationsRes.find(q => q.id === initialData.quotation)) {
        try {
          const linkedQuotation = await pb.collection("quotations").getOne<Quotation>(initialData.quotation)
          setQuotations(prev => [linkedQuotation, ...prev])
        } catch (err) {
          console.error("Error loading linked quotation:", err)
        }
      }
    } catch (err) {
      console.error("Error loading quotations:", err)
      setQuotations([])
    }
  }

  const handleQuotationChange = (quotationId: string) => {
    const quotation = quotations.find(q => q.id === quotationId)
    if (quotation) {
      setFormData(prev => ({
        ...prev,
        quotation: quotationId,
        incoterm: quotation.incoterm,
        port_of_loading: quotation.port_of_loading || prev.port_of_loading,
        port_of_destination: quotation.port_of_destination || prev.port_of_destination,
        payment_terms: quotation.payment_terms || prev.payment_terms,
        currency: quotation.currency,
        exchange_rate: (quotation.exchange_rate && quotation.exchange_rate > 0)
          ? quotation.exchange_rate
          : prev.exchange_rate,
      }))
    } else {
      setFormData(prev => ({ ...prev, quotation: quotationId }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    // 项目和客户从上下文获取，不需要验证选择器 (Requirements: 3.1, 3.2)
    if (!formData.project && !projectId) newErrors.project = t("validation.required")
    if (!formData.incoterm) newErrors.incoterm = t("validation.required")
    if (!formData.currency) newErrors.currency = t("validation.required")
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    // 使用上下文中的项目和客户 ID (Requirements: 3.1, 3.2)
    const projectIdToUse = formData.project || projectId || ""
    const customerIdToUse = formData.customer || contextProject?.customer || ""

    await onSubmit({
      project: projectIdToUse,
      customer: customerIdToUse,
      quotation: formData.quotation || undefined,
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
      bank_info: formData.bank_info,
      shipping_marks: formData.shipping_marks || undefined,
      estimated_shipping_date: formData.estimated_shipping_date || undefined,
      remarks: formData.remarks || undefined,
      customer_po: formData.customer_po || undefined,
      vendor_code: formData.vendor_code || undefined,
    })
  }

  // 获取当前关联的报价单信息
  const linkedQuotation = quotations.find(q => q.id === formData.quotation)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ========== 0. 关联报价单信息（编辑模式显示） ========== */}
      {initialData && linkedQuotation && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">
                    {locale === 'zh' ? '关联报价单' : 'Linked Quotation'}
                  </p>
                  <p className="text-sm text-blue-700">
                    {linkedQuotation.code} (v{linkedQuotation.version})
                  </p>
                </div>
              </div>
              <Link
                href={`/quotations/${linkedQuotation.id}?project=${formData.project}`}
                target="_blank"
              >
                <Button type="button" variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-3 w-3" />
                  {locale === 'zh' ? '查看报价单' : 'View Quotation'}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== 1. 产品项列表（只读显示） ========== */}
      {items && items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{locale === 'zh' ? '产品明细' : 'Product Items'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === 'zh' ? '产品名称' : 'Product Name'}</TableHead>
                  <TableHead className="text-right">{locale === 'zh' ? '数量' : 'Quantity'}</TableHead>
                  <TableHead className="text-right">{locale === 'zh' ? '单价' : 'Unit Price'}</TableHead>
                  <TableHead className="text-right">{locale === 'zh' ? '小计' : 'Subtotal'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const product = item.expand?.product
                  const productName = locale === 'zh' && product?.name_cn ? product.name_cn : (product?.name || 'Unknown')
                  const subtotal = item.quantity * item.unit_price

                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{productName}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formData.currency} {item.unit_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formData.currency} {subtotal.toFixed(2)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ========== 2. 报价单关联提示（新建模式显示） ========== */}
      {!initialData && quotations.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{locale === 'zh' ? '有可关联的报价单' : 'Quotations Available'}</p>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'zh' ? '选择已接受的报价单可自动填充贸易条款、港口等信息' : 'Select an accepted quotation to auto-fill trade terms, ports, etc.'}
                  </p>
                </div>
              </div>
              <Select value={formData.quotation || "_none_"} onValueChange={(v) => handleQuotationChange(v === "_none_" ? "" : v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("orders.placeholders.quotation")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">{locale === 'zh' ? '不关联报价单' : 'No quotation'}</SelectItem>
                  {quotations.map(quotation => (
                    <SelectItem key={quotation.id} value={quotation.id}>
                      {quotation.code} (v{quotation.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

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
              <Label>{locale === 'zh' ? '供应商代码 (Vendor Code)' : 'Vendor Code'}</Label>
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
          {/* 银行账户快速选择 */}
          <div className="space-y-2">
            <Label>{locale === 'zh' ? '预设账户' : 'Preset Account'}</Label>
            <BankAccountSelect
              value={selectedBankAccountId}
              autoSelectDefault={!formData.bank_info}
              matchContent={formData.bank_info}
              onChange={(account) => {
                if (account) {
                  setSelectedBankAccountId(account.id)
                  setFormData(prev => ({
                    ...prev,
                    bank_info: account.content
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
              <pre className="text-sm bg-muted p-3 rounded whitespace-pre-wrap font-mono">
                {formData.bank_info}
              </pre>
            ) : (
              <p className="text-muted-foreground italic text-sm">
                {locale === 'zh' ? '选择预设账户后自动填充' : 'Auto-filled after selecting a preset account'}
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
                {items && items.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePackaging}
                    disabled={generatingPackaging}
                  >
                    {generatingPackaging ? (
                      <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                      <Package className="mr-2 h-3 w-3" />
                    )}
                    {locale === 'zh' ? '生成包装信息' : 'Generate Packaging'}
                  </Button>
                )}
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
