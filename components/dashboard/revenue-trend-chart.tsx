"use client"

/**
 * Revenue Trend Chart Component
 * 
 * Displays order revenue trend with time range selector
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts"
import { TimeRange, ChartDataPoint } from "@/lib/dashboard/types"
import { useI18n } from "@/lib/i18n/use-i18n"
import { cn } from "@/lib/utils"

export interface RevenueTrendChartProps {
  data: ChartDataPoint[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  loading?: boolean;
  title?: string;
}

const timeRangeOptions: { value: TimeRange; label: string; labelZh: string }[] = [
  { value: '7d', label: '7 Days', labelZh: '7天' },
  { value: '30d', label: '30 Days', labelZh: '30天' },
  { value: '3m', label: '3 Months', labelZh: '3个月' },
];

export function RevenueTrendChart({
  data,
  timeRange,
  onTimeRangeChange,
  loading = false,
  title,
}: RevenueTrendChartProps) {
  const { locale } = useI18n();
  const isZh = locale === 'zh';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium">{payload[0]?.payload?.label || label}</p>
          <p className="text-sm text-primary font-bold">
            {formatCurrency(payload[0]?.value || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-1">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">
          {title || (isZh ? '订单金额趋势' : 'Revenue Trend')}
        </CardTitle>
        <div className="flex gap-1">
          {timeRangeOptions.map((option) => (
            <Button
              key={option.value}
              variant={timeRange === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeRangeChange(option.value)}
              className={cn(
                "text-xs",
                timeRange === option.value && "pointer-events-none"
              )}
            >
              {isZh ? option.labelZh : option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            {isZh ? '暂无数据' : 'No data available'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default RevenueTrendChart;
