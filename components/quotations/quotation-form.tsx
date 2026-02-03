"use client"

/**
 * Quotation Form Component
 * 报价单表单组件
 * 
 * 与订单表单布局保持一致，确保用户体验统一
 * 支持项目上下文：当从项目内创建报价时，项目和客户字段预填充
 * Requirements: 1.3
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PortSelect } from "@/components/ui/port-select"
import { PaymentTermsSelect } from "@/components/ui/payment-terms-select"
import { useI18n } from "@/lib/i18n/use-i18n"
import { useProjectContext } from "@/hooks/use-project-context"
import { getPocketBase } from "@/lib/pocketbase/auth"
import { INCOTERMS } from "@/lib/constants/trade-standards"
import { CURRENCIES, COMMON_CURRENCIES } from "@/lib/constants/currencies"
import { getRate } from "@/lib/services/exchange-rate"
import type { Quotation, QuotationCreateInput, QuotationItemWithExpand } from "@/lib/pocketbase/services/quotations"
import type { Product } from "@/lib/pocketbase/services/products"
import { calculatePackaging, type ProductPackaging } from "@/lib/services/packaging-calculator"
import { Package, RefreshCw } from "lucide-react"

interface Project {
  id: string
  code: string
  name: string
  name_cn?: string
  customer: string
}

interface Customer {
  id: string
  code: string
  name: string
  name_cn?: string
  preferred_currency?: string
}

export interface QuotationFormProps {
  initialData?: Partial<Quotation>
  onSubmit: (data: QuotationCreateInput) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  /** 是否锁定项目字段（从项目上下文进入时） */
  projectLocked?: boolean
  /** 报价单明细项（用于生成包装信息） */
  items?: QuotationItemWithExpand[]
}

export function QuotationForm({ initialData, onSubmit, onCancel, isLoading, projectLocked, items }: QuotationFormProps) {
  const { t, locale } = useI18n()
  
  // 使用项目上下文 Hook (Requirements: 1.3)
  const { project: contextProject, customer: contextCustomer, isWithinProject } = useProjectContext()
  
  // 确定是否锁定项目字段：显式传入 projectLocked 或从项目上下文中进入
  const isProjectLocked = projectLocked || isWithinProject
  
  const [projects, setProjects] = useState<Project[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  
  const [formData, setFormData] = useState({
    project: initialData?.project || "",
    customer: initialData?.customer || "",
    incoterm: initialData?.incoterm || "FOB",
    port_of_loading: initialData?.port_of_loading || "",
    port_of_destination: initialData?.port_of_destination || "",
    payment_terms: initialData?.payment_terms || "",
    validity_days: initialData?.validity_days || 30,
    global_profit_margin: initialData?.global_profit_margin || 20,
    currency: initialData?.currency || "USD",
    exchange_rate: initialData?.exchange_rate || undefined,
     // 包装信息 (Requirements: 1.1)
    delivery_time: initialData?.delivery_time || "",          // 交付时间 (Requirements: 1.2)
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [currentRate, setCurrentRate] = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(false)
  const [generatingPackaging, setGeneratingPackaging] = useState(false)

  // 生成包装信息 (Requirements: 3.5)
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
      
      // 构建包装计算输入
      const packagingItems: ProductPackaging[] = items.map(item => {
        const product = products.find(p => p.id === item.product)
        return {
          product_id: item.product,
          product_name: locale === 'zh' && product?.name_cn ? product.name_cn : (product?.name || item.expand?.product?.name || 'Unknown'),
          quantity: item.quantity,
          pcs_per_carton: product?.pcs_per_carton,
          carton_dimensions: product?.carton_dimensions,
          carton_gross_weight: product?.carton_gross_weight,
          carton_net_weight: product?.carton_net_weight,
        }
      })
      
      // 计算包装信息
      const summary = calculatePackaging(packagingItems)
      
      console.log('Packaging calculation result:', {
        packagingItems,
        summary,
        totals: summary.totals
      })
      
      // 更新表单 - 包括总重量和总体积
      setFormData(prev => ({ 
        ...prev, 
      
        total_weight: summary.totals.total_gross_weight,
        total_volume: summary.totals.total_volume,
      }))
    } catch (err) {
      console.error("Error generating packaging:", err)
    } finally {
      setGeneratingPackaging(false)
    }
  }

  // Load projects and customers
  useEffect(() => {
    const loadData = async () => {
      try {
        const pb = getPocketBase()
        const [projectsRes, customersRes] = await Promise.all([
          pb.collection("projects").getFullList<Project>({ sort: "-created" }),
          pb.collection("customers").getFullList<Customer>({ sort: "name" }),
        ])
        setProjects(projectsRes)
        setCustomers(customersRes)

        // Set initial selections if editing
        if (initialData?.project) {
          const project = projectsRes.find(p => p.id === initialData.project)
          if (project) {
            const customer = customersRes.find(c => c.id === project.customer)
            if (customer) {
              setSelectedCustomer(customer)
              setFormData(prev => ({
                ...prev,
                customer: customer.id,
                currency: customer.preferred_currency || prev.currency,
              }))
            }
          }
        }
      } catch (err) {
        console.error("Error loading data:", err)
      }
    }
    loadData()
  }, [initialData])

  // 当项目上下文加载完成时，更新表单数据 (Requirements: 1.3)
  useEffect(() => {
    if (isWithinProject && contextProject && !initialData?.project) {
      setSelectedCustomer(contextCustomer)
      setFormData(prev => ({
        ...prev,
        project: contextProject.id,
        customer: contextProject.customer,
        currency: contextCustomer?.preferred_currency || prev.currency,
      }))
    }
  }, [isWithinProject, contextProject, contextCustomer, initialData?.project])

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

  // When project changes, auto-select customer
  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    
    if (project) {
      const customer = customers.find(c => c.id === project.customer)
      setSelectedCustomer(customer || null)
      setFormData(prev => ({
        ...prev,
        project: projectId,
        customer: project.customer,
        currency: customer?.preferred_currency || prev.currency,
      }))
    } else {
      setSelectedCustomer(null)
      setFormData(prev => ({
        ...prev,
        project: projectId,
        customer: "",
      }))
    }
  }

  const getDisplayName = (item: { name: string; name_cn?: string }) => {
    return locale === 'zh' && item.name_cn ? item.name_cn : item.name
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.project) newErrors.project = t("validation.required")
    if (!formData.customer) newErrors.customer = t("validation.required")
    if (!formData.incoterm) newErrors.incoterm = t("validation.required")
    if (!formData.currency) newErrors.currency = t("validation.required")
    if (formData.validity_days < 1) newErrors.validity_days = t("validation.required")
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    
    await onSubmit({
      project: formData.project,
      customer: formData.customer,
      incoterm: formData.incoterm,
      port_of_loading: formData.port_of_loading || undefined,
      port_of_destination: formData.port_of_destination || undefined,
      payment_terms: formData.payment_terms || undefined,
      validity_days: formData.validity_days,
      global_profit_margin: formData.global_profit_margin,
      currency: formData.currency,
      exchange_rate: formData.exchange_rate,
       
      delivery_time: formData.delivery_time || undefined,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData?.id ? t("quotations.edit") : t("quotations.new")}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Project & Customer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project">{t("quotations.columns.project")} <span className="text-destructive">*</span></Label>
              {isProjectLocked ? (
                <Input
                  value={contextProject ? getDisplayName(contextProject) : formData.project}
                  disabled
                  placeholder={t("quotations.placeholders.project")}
                />
              ) : (
                <Select value={formData.project} onValueChange={handleProjectChange}>
                  <SelectTrigger className={errors.project ? "border-destructive" : ""}>
                    <SelectValue placeholder={t("quotations.placeholders.project")} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.code} - {getDisplayName(project)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.project && <p className="text-sm text-destructive">{errors.project}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer">{t("quotations.columns.customer")} <span className="text-destructive">*</span></Label>
              <Input
                id="customer"
                value={selectedCustomer ? getDisplayName(selectedCustomer) : ""}
                disabled
                placeholder={t("quotations.placeholders.customer")}
                className={errors.customer ? "border-destructive" : ""}
              />
              {errors.customer && <p className="text-sm text-destructive">{errors.customer}</p>}
              <p className="text-xs text-muted-foreground">
                {locale === 'zh' ? '客户从项目自动继承' : 'Customer is inherited from project'}
              </p>
            </div>
          </div>

          {/* Trade Terms - 与订单表单一致的3列布局 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="incoterm">{t("quotations.columns.incoterm")} <span className="text-destructive">*</span></Label>
              <Select 
                value={formData.incoterm} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, incoterm: v }))}
              >
                <SelectTrigger className={errors.incoterm ? "border-destructive" : ""}>
                  <SelectValue placeholder={t("quotations.placeholders.incoterm")} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INCOTERMS).map(([code, info]) => (
                    <SelectItem key={code} value={code}>
                      {code} - {locale === 'zh' ? info.name_cn : info.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.incoterm && <p className="text-sm text-destructive">{errors.incoterm}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="port_of_loading">{t("quotations.portOfLoading")}</Label>
              <PortSelect
                value={formData.port_of_loading}
                onChange={(v) => setFormData(prev => ({ ...prev, port_of_loading: v }))}
                placeholder={t("quotations.portOfLoading")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="port_of_destination">{t("quotations.portOfDestination")}</Label>
              <PortSelect
                value={formData.port_of_destination}
                onChange={(v) => setFormData(prev => ({ ...prev, port_of_destination: v }))}
                placeholder={t("quotations.portOfDestination")}
                type="destination"
              />
            </div>
          </div>

          {/* Currency & Validity - 与订单表单一致的3列布局 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency">{t("quotations.columns.currency")} <span className="text-destructive">*</span></Label>
              <Select 
                value={formData.currency} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, currency: v }))}
              >
                <SelectTrigger className={errors.currency ? "border-destructive" : ""}>
                  <SelectValue placeholder={t("quotations.placeholders.currency")} />
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
              {errors.currency && <p className="text-sm text-destructive">{errors.currency}</p>}
            </div>

            <div className="space-y-2">
              <Label>{t("quotations.exchangeRate")}</Label>
              <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm flex items-center">
                {rateLoading ? (
                  <span className="text-muted-foreground">{locale === 'zh' ? '加载中...' : 'Loading...'}</span>
                ) : currentRate ? (
                  <span>1 {formData.currency} = {currentRate.toFixed(4)} CNY</span>
                ) : (
                  <span className="text-muted-foreground">{locale === 'zh' ? '暂无汇率' : 'No rate available'}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {locale === 'zh' ? '汇率自动从系统获取' : 'Rate fetched automatically'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="validity_days">{t("quotations.validityDays")} <span className="text-destructive">*</span></Label>
              <Input
                id="validity_days"
                type="number"
                min={1}
                value={formData.validity_days}
                onChange={(e) => setFormData(prev => ({ ...prev, validity_days: parseInt(e.target.value) || 30 }))}
                className={errors.validity_days ? "border-destructive" : ""}
              />
              {errors.validity_days && <p className="text-sm text-destructive">{errors.validity_days}</p>}
            </div>
          </div>

          {/* Payment Terms & Profit Margin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_terms">{t("quotations.paymentTerms")}</Label>
              <PaymentTermsSelect
                value={formData.payment_terms}
                onChange={(v) => setFormData(prev => ({ ...prev, payment_terms: v }))}
                placeholder={t("quotations.paymentTerms")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="global_profit_margin">{t("quotations.globalMargin.title")} (%)</Label>
              <Input
                id="global_profit_margin"
                type="number"
                min={0}
                max={100}
                value={formData.global_profit_margin}
                onChange={(e) => setFormData(prev => ({ ...prev, global_profit_margin: parseFloat(e.target.value) || 0 }))}
              />
              <p className="text-xs text-muted-foreground">
                {locale === 'zh' ? '默认利润率，可在产品明细中单独调整' : 'Default margin, can be adjusted per item'}
              </p>
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
            {isLoading ? t("common.loading") : t("common.save")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export default QuotationForm
