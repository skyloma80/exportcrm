"use client"

/**
 * KPI Card Component
 * 
 * Displays a key performance indicator with trend indicator
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { calculateTrendPercentage } from "@/lib/dashboard/utils"

export interface KPICardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: 'number' | 'currency';
  currency?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  error?: boolean;
  subtitle?: string;
}

export function KPICard({
  title,
  value,
  previousValue,
  format = 'number',
  currency = 'USD',
  icon,
  loading = false,
  error = false,
  subtitle,
}: KPICardProps) {
  const trendPercentage = previousValue !== undefined 
    ? calculateTrendPercentage(value, previousValue)
    : null;

  const formatValue = (val: number) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    }
    return val.toLocaleString();
  };

  const getTrendIcon = () => {
    if (trendPercentage === null) return null;
    if (trendPercentage > 0) return <TrendingUp className="h-3 w-3" />;
    if (trendPercentage < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (trendPercentage === null) return '';
    if (trendPercentage > 0) return 'text-green-600';
    if (trendPercentage < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(error && "border-destructive")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {error ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          icon && <span className="text-muted-foreground">{icon}</span>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">
            {error ? '0' : formatValue(value)}
          </div>
          {trendPercentage !== null && !error && (
            <div className={cn("flex items-center gap-1 text-xs", getTrendColor())}>
              {getTrendIcon()}
              <span>{Math.abs(trendPercentage).toFixed(1)}%</span>
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default KPICard;
