"use client"

/**
 * Exchange Rate Card Component
 * 
 * Displays current exchange rates for USD, EUR, GBP, JPY, HKD based on CNY
 */

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshCw, TrendingUp, TrendingDown, Minus, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/use-i18n"

interface RateData {
  currency: string;
  rate: number | null;
  change1d: number | null;
  updatedAt: string | null;
}

interface ExchangeRateCardProps {
  className?: string;
}

// 货币符号和名称映射
const CURRENCY_INFO: Record<string, { symbol: string; name: { zh: string; en: string } }> = {
  USD: { symbol: '$', name: { zh: '美元', en: 'USD' } },
  EUR: { symbol: '€', name: { zh: '欧元', en: 'EUR' } },
  GBP: { symbol: '£', name: { zh: '英镑', en: 'GBP' } },
  JPY: { symbol: '¥', name: { zh: '日元', en: 'JPY' } },
  HKD: { symbol: 'HK$', name: { zh: '港币', en: 'HKD' } },
};

export function ExchangeRateCard({ className }: ExchangeRateCardProps) {
  const { locale } = useI18n();
  const isZh = locale === 'zh';
  
  const [rates, setRates] = useState<RateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchRates = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
        // 先刷新汇率
        await fetch('/api/exchange-rates/refresh', { method: 'POST' });
      }
      
      // 获取汇率数据
      const response = await fetch('/api/exchange-rates/refresh');
      const data = await response.json();
      
      if (data.rates) {
        setRates(data.rates);
        // 找到最新的更新时间
        const latestUpdate = data.rates
          .filter((r: RateData) => r.updatedAt)
          .sort((a: RateData, b: RateData) => 
            new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime()
          )[0];
        
        if (latestUpdate?.updatedAt) {
          setLastUpdated(latestUpdate.updatedAt);
        }
        
        // 如果需要更新，自动刷新
        if (data.needsUpdate && !forceRefresh) {
          fetchRates(true);
        }
      }
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleRefresh = () => {
    fetchRates(true);
  };

  // 将汇率转换为"1外币 = X人民币"格式（取倒数）
  const formatRate = (rate: number | null) => {
    if (rate === null || rate === 0) return '--';
    // rate 是 1 CNY = X 外币，取倒数得到 1 外币 = X CNY
    const invertedRate = 1 / rate;
    return invertedRate.toFixed(2);
  };

  const formatChange = (change: number | null) => {
    if (change === null) return null;
    return Math.abs(change).toFixed(2);
  };

  const getTrendIcon = (change: number | null) => {
    if (change === null) return null;
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    if (change < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = (change: number | null) => {
    if (change === null) return '';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const formatLastUpdated = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return isZh ? '刚刚更新' : 'Just updated';
    } else if (diffHours < 24) {
      return isZh ? `${diffHours}小时前` : `${diffHours}h ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return isZh ? `${diffDays}天前` : `${diffDays}d ago`;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            {isZh ? '今日汇率' : 'Exchange Rates'}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {isZh ? '1外币 = X人民币' : '1 Foreign = X CNY'}
          {lastUpdated && (
            <span className="ml-2">· {formatLastUpdated(lastUpdated)}</span>
          )}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rates.map((rate) => {
            const info = CURRENCY_INFO[rate.currency];
            if (!info) return null; // 跳过未知币种
            return (
              <div key={rate.currency} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold w-8">{info.symbol}</span>
                  <span className="text-sm text-muted-foreground">
                    {isZh ? info.name.zh : info.name.en}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">
                    ¥{formatRate(rate.rate)}
                  </span>
                  {rate.change1d !== null && (
                    <div className={cn(
                      "flex items-center text-sm",
                      getTrendColor(rate.change1d)
                    )}>
                      {getTrendIcon(rate.change1d)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default ExchangeRateCard;
