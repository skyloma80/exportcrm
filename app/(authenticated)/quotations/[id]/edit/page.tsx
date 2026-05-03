'use client'

/**
 * Edit Quotation Page - 一站式报价单编辑
 * 
 * 强制项目上下文：必须通过 URL 参数 `project` 传递项目 ID，否则返回 404
 * Requirements: 1.2, 4.2, 4.3
 * 
 * 与新建页面布局一致，支持编辑所有字段包括产品明细、费用分解、模具费用
 */

import { useState, useEffect, useMemo, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { notFound } from 'next/navigation'
import { useI18n } from '@/lib/i18n/use-i18n'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, Ship, Coins } from 'lucide-react'

import { PortSelect } from '@/components/ui/port-select'
import { PaymentTermsSelect } from '@/components/ui/payment-terms-select'
import { QuotationItemsTable } from '@/components/quotations/quotation-items-table'
import { ProductSelectDialog } from '@/components/orders/product-select-dialog'

import {
  QuotationItemData,
  calculateSubtotal,
  applyGlobalProfitMargin,
  recalculateItemsWithExchangeRate,
} from '@/lib/quotation/calculations'
import { validateQuotationForm } from '@/lib/quotation/validation'
import { getPocketBase } from '@/lib/pocketbase/auth'
import { CURRENCIES, COMMON_CURRENCIES } from '@/lib/constants/currencies'
import { getRate } from '@/lib/services/exchange-rate'
import { findCurrencyByCode, INCOTERMS } from '@/lib/constants/trade-constants'
import type { Quotation } from '@/lib/pocketbase/services/quotations'
import type { Product } from '@/lib/pocketbase/services/products'
import { useBreadcrumb } from '@/lib/breadcrumb/context'
import { useProjectContext } from '@/hooks/use-project-context'

interface Project {
  id: string
  code: string
  name: string
  name_cn?: string
  customer: string
  expand?: {
    customer?: Customer
  }
}

interface Customer {
  id: string
  code: string
  name: string
  name_cn?: string
  preferred_currency?: string
}

interface PageProps {
  params: Promise<{ id: string }>
}

interface QuotationEditPageState {
  projectId: string
  customerId: string
  customerName: string
  incoterm: string
  portOfLoading: string
  portOfDestination: string
  currency: string
  exchangeRate: number
  validityDays: number
  paymentTerms: string
  items: QuotationItemData[]
  costBreakdown: Record<string, number>
  totalWeight: number | null
  totalVolume: number | null
  globalProfitMargin: number
  deliveryTime: string
  remarks: string
  loading: boolean
  errors: Record<string, string>
  costCurrency: string
}

export default function EditQuotationPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()
  const { toast } = useToast()
  const { setItems: setBreadcrumb } = useBreadcrumb()

  // 获取项目参数
  const projectIdFromUrl = searchParams.get("project")

  // 强制项目上下文：无项目参数返回 404 (Requirements: 1.2)
  if (!projectIdFromUrl) {
    notFound()
  }

  // 使用项目上下文 Hook 获取返回 URL
  const {
    project: contextProject,
    customer: contextCustomer,
    loading: contextLoading,
    returnUrl
  } = useProjectContext({
    documentType: 'quotation'
  })

  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [rateLoading, setRateLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [productDialogOpen, setProductDialogOpen] = useState(false)

  const [state, setState] = useState<QuotationEditPageState>({
    projectId: '',
    customerId: '',
    customerName: '',
    incoterm: 'FOB',
    portOfLoading: '',
    portOfDestination: '',
    currency: 'USD',
    exchangeRate: 1,
    validityDays: 30,
    paymentTerms: '',
    items: [],
    costBreakdown: {},
    totalWeight: null,
    totalVolume: null,
    globalProfitMargin: 20,
    deliveryTime: '',
    remarks: '',
    loading: false,
    errors: {},
    costCurrency: 'CNY',
  })

  // 设置面包屑 (Requirements: 2.1)
  // 注意：只设置当前页面标签，客户和项目信息由 layout 根据 URL 参数自动添加
  useEffect(() => {
    if (quotation) {
      setBreadcrumb([
        { label: quotation.code, href: `/quotations/${quotation.id}?project=${projectIdFromUrl}` },
        { label: t("common.edit") },
      ])
    }
    return () => setBreadcrumb([])
  }, [quotation, setBreadcrumb, t, projectIdFromUrl])

  // 加载报价单和项目数据
  useEffect(() => {
    const loadData = async () => {
      try {
        const pb = getPocketBase()

        // 加载报价单及其项目列表
        const [quotationRes, projectsRes] = await Promise.all([
          pb.collection('quotations').getOne<Quotation>(id, {
            expand: 'project,customer',
          }),
          pb.collection('projects').getFullList<Project>({
            sort: '-id',
            expand: 'customer',
          }),
        ])

        // 加载项目成本表（用于获取成本币种）
        const costTable = await pb.collection('project_cost_tables')
          .getFirstListItem(`project = "${quotationRes.project}"`)
          .catch(() => null) as any

        setQuotation(quotationRes)
        setProjects(projectsRes)

        // 从JSONB字段读取产品明细
        const jsonItems = (quotationRes as any).items || []
        
        // 设置客户信息
        const project = projectsRes.find(p => p.id === quotationRes.project)
        const customer = project?.expand?.customer
        setSelectedCustomer(customer || null)

        // 转换产品明细数据
        const items: QuotationItemData[] = jsonItems.map((item: any) => {
          return {
            id: item.id || `item-${Date.now()}-${Math.random()}`,
            productId: item.product_id || '',
            productCode: item.product_code || '',
            productName: item.product_name || '',
            productNameCn: item.product_name_cn,
            description: item.description_en || item.description || '',
            descriptionCn: item.description_cn || '',
            partNumber: item.part_number || '',
            unit: item.unit || 'PCS',
            quantity: item.quantity || 1,
            costPrice: item.cost_price || 0,
            profitMargin: item.profit_margin || state.globalProfitMargin,
            unitPrice: item.unit_price || 0,
            amount: item.amount || 0,
          }
        })

        // 设置表单状态
        setState({
          projectId: quotationRes.project,
          customerId: quotationRes.customer,
          customerName: customer ? (locale === 'zh' && customer.name_cn ? customer.name_cn : customer.name) : '',
          incoterm: quotationRes.incoterm || 'FOB',
          portOfLoading: quotationRes.port_of_loading || '',
          portOfDestination: quotationRes.port_of_destination || '',
          currency: quotationRes.currency || 'USD',
          exchangeRate: quotationRes.exchange_rate || 1,
          validityDays: quotationRes.validity_days || 30,
          paymentTerms: quotationRes.payment_terms || '',
          items,
          costBreakdown: (quotationRes.cost_breakdown as Record<string, number>) || {},
          totalWeight: quotationRes.total_weight || null,
          totalVolume: quotationRes.total_volume || null,
          globalProfitMargin: quotationRes.global_profit_margin || 20,
          deliveryTime: (quotationRes as any).delivery_time || '',
          remarks: (quotationRes as any).remarks || '',
          loading: false,
          errors: {},
          costCurrency: costTable?.currency || 'CNY',
        })
      } catch (err) {
        console.error('Error loading quotation:', err)
        toast({
          title: t('quotations.notFound'),
          variant: 'destructive',
        })
        router.push('/quotations')
      } finally {
        setLoadingData(false)
      }
    }
    loadData()
  }, [id, locale, router, t, toast])

  // 加载汇率（切换币种时重新计算明细项）
  useEffect(() => {
    if (loadingData) return

    const loadExchangeRate = async () => {
      if (state.currency === 'CNY') {
        // 人民币汇率为1，重新计算明细项
        const updatedItems = recalculateItemsWithExchangeRate(state.items, 1)
        setState(prev => ({ ...prev, exchangeRate: 1, items: updatedItems }))
        return
      }

      setRateLoading(true)
      try {
        const rate = await getRate(state.currency, 'CNY')
        // 使用新汇率重新计算所有明细项
        const updatedItems = recalculateItemsWithExchangeRate(state.items, rate)
        setState(prev => ({ ...prev, exchangeRate: rate, items: updatedItems }))
      } catch (err) {
        console.error('Error loading exchange rate:', err)
      } finally {
        setRateLoading(false)
      }
    }
    loadExchangeRate()
  }, [state.currency, loadingData])

  // 计算汇总
  const totals = useMemo(() => {
    const subtotal = calculateSubtotal(state.items)
    return { subtotal }
  }, [state.items])

  const currencyInfo = findCurrencyByCode(state.currency)
  const currencySymbol = currencyInfo?.symbol || state.currency

  const getDisplayName = (item: { name: string; name_cn?: string }) => {
    return locale === 'zh' && item.name_cn ? item.name_cn : item.name
  }

  const handleApplyGlobalMargin = (margin: number) => {
    const updatedItems = applyGlobalProfitMargin(state.items, margin, state.exchangeRate)
    setState(prev => ({
      ...prev,
      globalProfitMargin: margin,
      items: updatedItems,
    }))
  }

  // 根据产品包装信息计算总重量和总体积
  const calculateWeightAndVolume = (items: QuotationItemData[]) => {
    let totalWeight = 0
    let totalVolume = 0

    for (const item of items) {
      if (item.pcsPerCarton && item.pcsPerCarton > 0) {
        const cartons = Math.ceil(item.quantity / item.pcsPerCarton)

        // 计算重量 (kg)
        if (item.cartonGrossWeight) {
          totalWeight += cartons * item.cartonGrossWeight
        }

        // 计算体积 (m³) - cartonDimensions 格式: "625×450×390" 或 "625x450x390" (mm)
        if (item.cartonDimensions) {
          // 支持多种分隔符: ×, x, X, *, 空格
          const dims = item.cartonDimensions
            .split(/[×xX*\s]+/)
            .map(d => parseFloat(d.trim()))
            .filter(d => !isNaN(d))
          if (dims.length === 3) {
            const volumePerCarton = (dims[0] * dims[1] * dims[2]) / 1000000000
            totalVolume += cartons * volumePerCarton
          }
        }
      }
    }

    return {
      weight: totalWeight > 0 ? Math.round(totalWeight * 100) / 100 : null,
      volume: totalVolume > 0 ? Math.round(totalVolume * 1000) / 1000 : null,
    }
  }

  // 手动重新计算总重量和总体积
  const handleRecalculateWeightVolume = () => {
    const { weight, volume } = calculateWeightAndVolume(state.items)
    setState(prev => ({
      ...prev,
      totalWeight: weight ?? prev.totalWeight,
      totalVolume: volume ?? prev.totalVolume,
    }))
  }

  const handleItemsChange = (items: QuotationItemData[]) => {
    setState(prev => ({ ...prev, items }))
  }

  const handleProductSelect = (products: Product[]) => {
    const newItems = products.map(product => ({
      id: `prod-${product.id}-${Date.now()}`,
      productId: product.id,
      productCode: product.code || '',
      productName: product.name || '',
      productNameCn: product.name_cn,
      description: product.description || '',
      descriptionCn: product.description_cn || '',
      partNumber: product.part_number || '',
      unit: product.unit || 'PCS',
      quantity: 1,
      costPrice: 0,
      profitMargin: state.globalProfitMargin,
      unitPrice: 0,
      amount: 0,
      pcsPerCarton: product.pcs_per_carton,
      cartonDimensions: product.carton_dimensions?.length 
        ? `${product.carton_dimensions.length}×${product.carton_dimensions.width}×${product.carton_dimensions.height} mm`
        : undefined,
      cartonGrossWeight: product.carton_gross_weight,
    }))
    setState(prev => ({ ...prev, items: [...prev.items, ...newItems] }))
  }

  // 添加自定义产品（空行）
  const handleAddCustomItem = () => {
    const newItem: QuotationItemData = {
      id: `custom-${Date.now()}`,
      productId: '',
      productCode: '',
      productName: '',
      productNameCn: '',
      description: '',
      descriptionCn: '',
      partNumber: '',
      unit: 'PCS',
      quantity: 1,
      costPrice: 0,
      profitMargin: state.globalProfitMargin,
      unitPrice: 0,
      amount: 0,
    }
    setState(prev => ({
      ...prev,
      items: [...prev.items, newItem],
    }))
  }

  const handleCostBreakdownChange = (costs: Record<string, number>) => {
    setState(prev => ({ ...prev, costBreakdown: costs }))
  }

  const handleIncotermChange = (incoterm: string) => {
    setState(prev => ({ ...prev, incoterm }))
  }

  const formatCurrency = (value: number) => {
    return `${currencySymbol} ${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }


  // 保存报价单
  const handleSave = async () => {
    // 验证表单
    const validationResult = validateQuotationForm({
      projectId: state.projectId,
      customerId: state.customerId,
      incoterm: state.incoterm,
      currency: state.currency,
      exchangeRate: state.exchangeRate,
      validityDays: state.validityDays,
      items: state.items,
    })

    if (!validationResult.isValid) {
      setState(prev => ({ ...prev, errors: validationResult.errorsByField }))
      const errorMessages = validationResult.errors.map(e => e.message).join(', ')
      toast({
        title: t('quotations.validationError'),
        description: errorMessages || t('quotations.pleaseFixErrors'),
        variant: 'destructive',
      })
      return
    }

    setState(prev => ({ ...prev, loading: true, errors: {} }))

    try {
      const pb = getPocketBase()

      console.log('💾 保存报价单数据:', {
        items: state.items.length,
        subtotal: totals.subtotal,
        total_amount: totals.subtotal || 0.01,
      })

      // 更新报价单基本信息
      await pb.collection('quotations').update(id, {
        incoterm: state.incoterm,
        port_of_loading: state.portOfLoading || null,
        port_of_destination: state.portOfDestination || null,
        currency: state.currency,
        exchange_rate: state.exchangeRate,
        validity_days: state.validityDays,
        payment_terms: state.paymentTerms || null,
        global_profit_margin: state.globalProfitMargin,
        total_weight: state.totalWeight,
        total_volume: state.totalVolume,
        cost_breakdown: state.costBreakdown,
        delivery_time: state.deliveryTime || null,
        remarks: state.remarks || null,
        subtotal: totals.subtotal || 0,
        total_amount: Math.max(totals.subtotal || 0, 0.01),
        // 使用JSONB字段存储产品明细
        items: state.items.map(item => ({
          id: item.id,
          product_id: item.productId,
          product_code: item.productCode,
          product_name: item.productName,
          product_name_cn: item.productNameCn,
          part_number: item.partNumber,
          description_en: item.description,
          description_cn: item.descriptionCn,
          unit: item.unit,
          quantity: item.quantity,
          cost_price: item.costPrice,
          profit_margin: item.profitMargin,
          unit_price: item.unitPrice,
          amount: item.amount,
        })),
      })

      toast({
        title: t('quotations.updateSuccess'),
        description: t('quotations.updateSuccessDesc'),
      })

      // 保存后跳转到报价详情页（详情页要求 ?project= 参数）
      router.push(`/quotations/${id}?project=${projectIdFromUrl}`)
    } catch (error: any) {
      toast({
        title: t('quotations.updateError'),
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  if (loadingData || contextLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // 返回按钮导航到项目详情页 (Requirements: 4.3)
  const handleBack = () => {
    router.push(returnUrl || `/projects/${projectIdFromUrl}?tab=quotations`)
  }

  if (!quotation) {
    return null
  }

  // 只允许编辑草稿状态的报价单
  if (quotation.status !== 'draft') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold">{t('quotations.cannotEdit')}</h2>
              <p className="text-muted-foreground mt-2">{t('quotations.cannotEditDesc')}</p>
              <Button variant="outline" onClick={handleBack} className="mt-4">
                {t('common.back')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('quotations.edit')}</h1>
            <p className="text-muted-foreground mt-1">{quotation.code}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* ========== 1. 币种与条款 (与新建表单一致) ========== */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              <CardTitle className="text-base">{t('quotations.currencyTerms.title')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>{t('quotations.columns.currency')} <span className="text-destructive">*</span></Label>
                <Select
                  value={state.currency}
                  onValueChange={(v) => setState(prev => ({ ...prev, currency: v }))}
                >
                  <SelectTrigger>
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
                <Label>{t('quotations.exchangeRate')}</Label>
                <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm flex items-center">
                  {rateLoading ? (
                    <span className="text-muted-foreground">{t('common.loading')}...</span>
                  ) : (
                    <span>1 {state.currency} = {state.exchangeRate.toFixed(4)} CNY</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.paymentTerms')}</Label>
                <PaymentTermsSelect
                  value={state.paymentTerms}
                  onChange={(v) => setState(prev => ({ ...prev, paymentTerms: v }))}
                  placeholder={t('quotations.placeholders.paymentTerms')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.incoterm') || 'Incoterm'}</Label>
                <Select
                  value={state.incoterm}
                  onValueChange={(v) => setState(prev => ({ ...prev, incoterm: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('quotations.placeholders.incoterm') || "Select Incoterm"} />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOTERMS.map(item => (
                      <SelectItem key={item.code} value={item.code}>
                        {item.code} - {locale === 'zh' ? item.name_cn : item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.validityDays')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={state.validityDays}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    validityDays: parseInt(e.target.value) || 30
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== 2. 运输与利润 (与新建表单一致) ========== */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              <CardTitle className="text-base">{t('quotations.shippingInfo')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="space-y-2">
                <Label>{t('quotations.portOfLoading')}</Label>
                <PortSelect
                  value={state.portOfLoading}
                  onChange={(v) => setState(prev => ({ ...prev, portOfLoading: v }))}
                  placeholder={t('quotations.selectPort')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.portOfDestination')}</Label>
                <PortSelect
                  value={state.portOfDestination}
                  onChange={(v) => setState(prev => ({ ...prev, portOfDestination: v }))}
                  placeholder={t('quotations.selectPort')}
                  type="destination"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.deliveryTime')}</Label>
                <Input
                  value={state.deliveryTime}
                  onChange={(e) => setState(prev => ({ ...prev, deliveryTime: e.target.value }))}
                  placeholder={t('quotations.placeholders.deliveryTime')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.totalWeight')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={state.totalWeight ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setState(prev => ({
                      ...prev,
                      totalWeight: val === '' ? null : parseFloat(val) || null
                    }))
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.totalVolume')}</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={state.totalVolume ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setState(prev => ({
                      ...prev,
                      totalVolume: val === '' ? null : parseFloat(val) || null
                    }))
                  }}
                  placeholder="0.000"
                />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleRecalculateWeightVolume}
                  disabled={state.items.length === 0}
                  title={locale === 'zh' ? '根据产品包装信息重新计算' : 'Recalculate from product packaging'}
                >
                  {locale === 'zh' ? '重算' : 'Calc'}
                </Button>
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.globalMargin.margin')} (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={state.globalProfitMargin}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    globalProfitMargin: parseFloat(e.target.value) || 0
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleApplyGlobalMargin(state.globalProfitMargin)}
                  disabled={state.items.length === 0}
                >
                  {t('quotations.globalMargin.apply')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========== 3. QuotationItemsTable ========== */}
        <QuotationItemsTable
          items={state.items}
          currency={state.currency}
          exchangeRate={state.exchangeRate}
          projectId={state.projectId}
          defaultProfitMargin={state.globalProfitMargin}
          onItemsChange={handleItemsChange}
          costCurrency={state.costCurrency}
          showInternal={true}
          onSelectFromLibrary={() => setProductDialogOpen(true)}
          onAddCustomItem={handleAddCustomItem}
          onNewProduct={handleAddCustomItem}
        />

        {/* ========== 4. ActionButtons ========== */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="remarks">{t('quotations.remarks')}</Label>
              <Textarea
                id="remarks"
                value={state.remarks}
                onChange={(e) => setState(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder={t('quotations.placeholders.remarks')}
                rows={3}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button
              onClick={handleSave}
              disabled={state.loading}
            >
              <Save className="mr-2 h-4 w-4" />
              {t('common.save')}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Product Select Dialog */}
      <ProductSelectDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        onSelect={handleProductSelect}
        projectId={state.projectId}
      />
    </div>
  )
}
