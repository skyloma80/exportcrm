"use client"

/**
 * Dashboard 页面
 * 
 * CRM首页，显示业务KPI、趋势图表和数据列表
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { useI18n } from "@/lib/i18n/use-i18n"
import {
  ShoppingCart,
  FileText,
  Clock,
  RefreshCw,
  AlertTriangle
} from "lucide-react"
import { KPICard } from "@/components/dashboard/kpi-card"
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart"
import { DashboardTabs } from "@/components/dashboard/dashboard-tabs"
import { RecentProjectsCard } from "@/components/dashboard/recent-projects-card"
import { dashboardService } from "@/lib/pocketbase/services/dashboard"
import {
  TimeRange,
  TabType,
  KPIStats,
  ChartDataPoint,
  TaskSummary,
  OrderSummary,
  PaymentSummary,
  ShipmentSummary
} from "@/lib/dashboard/types"

export default function DashboardPage() {
  const { user } = useAuth()
  const { locale } = useI18n()
  const isZh = locale === 'zh'

  // State
  const [loading, setLoading] = useState(true)
  const [kpiStats, setKpiStats] = useState<KPIStats | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')

  const [kpiError, setKpiError] = useState(false)
  const [chartLoading, setChartLoading] = useState(false)

  // Load KPI stats
  const loadKPIStats = async () => {
    try {
      setKpiError(false)
      const stats = await dashboardService.getKPIStats(timeRange)
      setKpiStats(stats)
    } catch (e) {
      console.error('Failed to load KPI stats:', e)
      setKpiError(true)
    }
  }

  // Load chart data
  const loadChartData = async (range: TimeRange) => {
    setChartLoading(true)
    try {
      const data = await dashboardService.getRevenueTrend(range)
      setChartData(data)
    } catch (e) {
      console.error('Failed to load chart data:', e)
      setChartData([])
    } finally {
      setChartLoading(false)
    }
  }



  // Load all data
  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([
      loadKPIStats(),
      loadChartData(timeRange),
    ])
    setLoading(false)
  }

  // Initial load
  useEffect(() => {
    loadAllData()
  }, [])

  // Reload chart when time range changes
  useEffect(() => {
    if (!loading) {
      loadChartData(timeRange)
    }
  }, [timeRange])

  // Handle time range change
  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range)
  }

  // Handle refresh
  const handleRefresh = () => {
    loadAllData()
  }

  // Greeting based on time
  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return isZh ? '早上好' : 'Good morning'
    if (hour < 18) return isZh ? '下午好' : 'Good afternoon'
    return isZh ? '晚上好' : 'Good evening'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {greeting()}{user?.name ? `, ${user.name}` : ''}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {isZh ? '这是您的业务概览' : "Here's your business overview"}
          </p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {isZh ? '刷新' : 'Refresh'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title={isZh ? '订单收入' : 'Revenue'}
          value={kpiStats?.revenue.current || 0}
          previousValue={kpiStats?.revenue.previous}
          format="currency"
          icon={<ShoppingCart className="h-4 w-4" />}
          loading={loading}
          error={kpiError}
        />
        <KPICard
          title={isZh ? '订单数量' : 'Orders'}
          value={kpiStats?.orders.current || 0}
          previousValue={kpiStats?.orders.previous}
          icon={<ShoppingCart className="h-4 w-4" />}
          loading={loading}
          error={kpiError}
        />
        <KPICard
          title={isZh ? '询价单' : 'RFQs'}
          value={kpiStats?.rfqs.current || 0}
          previousValue={kpiStats?.rfqs.previous}
          icon={<FileText className="h-4 w-4" />}
          loading={loading}
          error={kpiError}
        />
        <KPICard
          title={isZh ? '待办任务' : 'Pending Tasks'}
          value={kpiStats?.tasks.pending || 0}
          icon={kpiStats?.tasks.overdue ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4" />}
          loading={loading}
          error={kpiError}
          subtitle={kpiStats?.tasks.overdue ? `${kpiStats.tasks.overdue} ${isZh ? '已逾期' : 'overdue'}` : undefined}
        />
      </div>

      {/* Recent Projects Card + Revenue Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <RecentProjectsCard className="lg:col-span-1" />
        <div className="lg:col-span-3">
          <RevenueTrendChart
            data={chartData}
            timeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            loading={loading || chartLoading}
          />
        </div>
      </div>


    </div>
  )
}
