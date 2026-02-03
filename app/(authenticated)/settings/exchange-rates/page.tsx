'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { getDashboardRates, exchangeRateService } from '@/lib/services/exchange-rate'
import { RefreshCw, Save, AlertTriangle, Calendar, ArrowRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n/use-i18n'
import { COMMON_CURRENCIES } from '@/lib/constants/currencies'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export default function ExchangeRatesPage() {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [rates, setRates] = useState<any>(null)
  const [manualRates, setManualRates] = useState<Record<string, string>>({})
  const { toast } = useToast()
  const { t, locale } = useI18n()

  useEffect(() => {
    loadRates()
  }, [])

  const loadRates = async () => {
    setLoading(true)
    try {
      const dashboardData = await getDashboardRates()
      setRates(dashboardData)

      // Initialize manual rates form
      const initialManualRates: Record<string, string> = {}
      dashboardData.rates.forEach((r: any) => {
        if (r.rate) {
          initialManualRates[r.currency] = r.rate.toString()
        }
      })
      setManualRates(initialManualRates)
    } catch (error) {
      console.error('Failed to load rates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const result = await exchangeRateService.refreshRates()
      if (result.success) {
        toast({
          title: locale === 'zh' ? '汇率更新成功' : 'Exchange rates updated',
          description: `${locale === 'zh' ? '数据来源' : 'Source'}: ${result.source}`,
        })
        await loadRates()
      } else {
        toast({
          title: locale === 'zh' ? '汇率更新失败' : 'Update failed',
          description: result.error || (locale === 'zh' ? '接口连接失败，请尝试手动录入' : 'API connection failed, please enter manually'),
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      toast({
        title: locale === 'zh' ? '汇率更新失败' : 'Update failed',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setRefreshing(false)
    }
  }

  const handleManualSave = async (currency: string) => {
    const rateValue = parseFloat(manualRates[currency])
    if (isNaN(rateValue) || rateValue <= 0) {
      toast({
        title: locale === 'zh' ? '无效的汇率' : 'Invalid rate',
        description: locale === 'zh' ? '请输入大于0的数字' : 'Please enter a number greater than 0',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const ratesToUpdate: Record<string, number> = {
        [currency]: rateValue
      }

      await exchangeRateService.updateRates(ratesToUpdate, 'CNY', 'manual')

      toast({
        title: locale === 'zh' ? '手动保存成功' : 'Saved manually',
        description: `${currency} ${locale === 'zh' ? '汇率已更新' : 'rate updated'}`,
      })

      await loadRates()
    } catch (error: any) {
      toast({
        title: locale === 'zh' ? '保存失败' : 'Save failed',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const isToday = (dateStr: string | null) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">{locale === 'zh' ? '汇率管理' : 'Exchange Rates'}</h1>
          <p className="text-muted-foreground mt-1">
            {locale === 'zh' ? '管理系统核心汇率，确保财务计算准确' : 'Manage system exchange rates to ensure accurate financial calculations'}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing || loading} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? (locale === 'zh' ? '正从API同步...' : 'Syncing...') : (locale === 'zh' ? '同步最新汇率' : 'Sync Rates')}
        </Button>
      </div>

      {rates?.needsUpdate && (
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle className="text-lg">{locale === 'zh' ? '汇率需要更新' : 'Rates Need Update'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700">
              {locale === 'zh'
                ? '当前的汇率数据不是最新的，可能会影响报价和订单的准确性。请点击上方按钮同步，或在下方手动录入当日汇率。'
                : 'Current rate data is not up-to-date. Please sync above or enter manual rates below for today.'}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {COMMON_CURRENCIES.filter(c => c !== 'CNY').map((currency) => {
          const rateData = rates?.rates.find((r: any) => r.currency === currency)
          const isRateToday = isToday(rateData?.updatedAt)

          return (
            <Card key={currency} className={isRateToday ? 'border-green-200' : 'border-slate-200'}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{currency}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-medium text-muted-foreground">CNY</span>
                  </div>
                  <Badge variant={isRateToday ? "success" : "destructive"}>
                    {isRateToday
                      ? (locale === 'zh' ? '今日已更新' : 'Updated Today')
                      : (locale === 'zh' ? '需要手动录入' : 'Entry Needed')}
                  </Badge>
                </div>
                <CardDescription>
                  <div className="flex items-center gap-1 mt-1 font-mono text-xs">
                    <Calendar className="h-3 w-3" />
                    {rateData?.updatedAt
                      ? format(new Date(rateData.updatedAt), 'yyyy-MM-dd HH:mm:ss')
                      : 'Never'}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor={`rate-${currency}`}>{locale === 'zh' ? '当前汇率数值' : 'Current Rate Value'}</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">¥ 1 = </span>
                      <Input
                        id={`rate-${currency}`}
                        type="number"
                        step="0.000001"
                        className="pl-14 font-mono text-lg"
                        value={manualRates[currency] || ''}
                        onChange={(e) => setManualRates({ ...manualRates, [currency]: e.target.value })}
                        placeholder="0.000000"
                      />
                    </div>
                    <Button
                      onClick={() => handleManualSave(currency)}
                      disabled={loading || !manualRates[currency]}
                      className="shrink-0"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {locale === 'zh' ? '保存' : 'Save'}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    {locale === 'zh'
                      ? `* 汇率表示 1 元人民币可兑换的 ${currency} 数量`
                      : `* Rate represents how much ${currency} for 1 CNY`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{locale === 'zh' ? '说明' : 'Instructions'}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. {locale === 'zh' ? '本系统报价逻辑以人民币(CNY)为基准成本，所有外币报价均依赖此汇率表。' : 'System quotation is based on CNY cost, all foreign prices depend on these rates.'}</p>
          <p>2. {locale === 'zh' ? '建议每天上午检查汇率同步状态。' : 'Check rate sync status every morning.'}</p>
          <p>3. {locale === 'zh' ? '如果 API 自动同步失败（如网络问题），请参考中国银行外汇牌价手动录入。' : 'If API sync fails, please refer to bank rates and enter manually.'}</p>
        </CardContent>
      </Card>
    </div>
  )
}
