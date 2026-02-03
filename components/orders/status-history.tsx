'use client';

/**
 * Status History Component
 * 订单状态变更历史组件
 * 
 * Displays order status change history in a timeline format.
 * Requirements: 4.1, 4.2, 4.3
 */

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { getPocketBase } from '@/lib/pocketbase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, User, Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import type { OrderStatus } from '@/lib/order-workflow/types';
import type { RecordModel } from 'pocketbase';

interface StatusHistoryProps {
  orderId: string;
  title?: string;
}

interface StatusChangeActivity extends RecordModel {
  action: string;
  entity_type: string;
  entity_id: string;
  entity_code?: string;
  user?: string;
  user_name?: string;
  description?: string;
  description_cn?: string;
  old_value?: { status?: string };
  new_value?: { status?: string };
  metadata?: Record<string, any>;
}

// Status badge color mapping
const STATUS_COLORS: Record<OrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_production: 'bg-yellow-100 text-yellow-800',
  ready_to_ship: 'bg-orange-100 text-orange-800',
  shipped: 'bg-cyan-100 text-cyan-800',
  delivered: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function StatusHistory({ orderId, title }: StatusHistoryProps) {
  const { t, locale } = useI18n();
  const [activities, setActivities] = useState<StatusChangeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatusHistory = useCallback(async () => {
    if (!orderId) {
      setActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pb = getPocketBase();
      // Try to fetch status_change activities, but gracefully handle if the action type doesn't exist yet
      try {
        const result = await pb.collection('activity_logs').getList<StatusChangeActivity>(1, 50, {
          filter: `entity_type = "order" && entity_id = "${orderId}" && action = "status_change"`,
          sort: '-id',
        });
        setActivities(result.items);
      } catch (filterError: any) {
        // If the filter fails (e.g., status_change action not in schema), return empty list
        console.warn('Status history query failed, action type may not exist yet:', filterError.message);
        setActivities([]);
      }
    } catch (e) {
      console.error('Error fetching status history:', e);
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchStatusHistory();
  }, [fetchStatusHistory]);

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: locale === 'zh' ? zhCN : enUS,
    });
  };

  const formatFullTime = (date: string) => {
    return format(new Date(date), 'yyyy-MM-dd HH:mm:ss', {
      locale: locale === 'zh' ? zhCN : enUS,
    });
  };

  const getStatusLabel = (status: string) => {
    return t(`orders.status.${status}`) || status;
  };

  const getStatusColor = (status: string): string => {
    return STATUS_COLORS[status as OrderStatus] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {title || t('orders.statusHistory.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {title || t('orders.statusHistory.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-center py-4">{t('common.error')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          {title || t('orders.statusHistory.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            {t('orders.statusHistory.empty')}
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            
            <div className="space-y-4">
              {activities.map((activity) => {
                const fromStatus = activity.old_value?.status;
                const toStatus = activity.new_value?.status;
                // PocketBase id 前 15 位是时间戳（base32），可以用来显示时间
                // 或者使用 metadata 中的时间，如果没有则不显示
                const activityTime = activity.metadata?.timestamp || activity.created;
                
                return (
                  <div key={activity.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className="absolute left-0 p-2 rounded-full bg-primary/10">
                      <RefreshCw className="h-4 w-4 text-primary" />
                    </div>
                    
                    <div className="bg-muted/50 rounded-lg p-4">
                      {/* Status transition */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {fromStatus && (
                          <Badge variant="outline" className={getStatusColor(fromStatus)}>
                            {getStatusLabel(fromStatus)}
                          </Badge>
                        )}
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        {toStatus && (
                          <Badge variant="outline" className={getStatusColor(toStatus)}>
                            {getStatusLabel(toStatus)}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {/* User info */}
                        {activity.user_name && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{activity.user_name}</span>
                          </div>
                        )}
                        
                        {/* Time - only show if available */}
                        {activityTime && (
                          <div className="flex items-center gap-1" title={formatFullTime(activityTime)}>
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(activityTime)}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Reason/Notes if any */}
                      {activity.metadata?.reason && (
                        <p className="text-sm mt-2 text-muted-foreground">
                          {t('orders.statusHistory.reason')}: {activity.metadata.reason}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StatusHistory;
