'use client';

/**
 * Activity Timeline Component
 * 活动时间线组件
 * 
 * Displays activity history for an entity.
 */

import { useI18n } from '@/lib/i18n/use-i18n';
import { useEntityActivities } from '@/hooks/collections/activity-logs';
import { EntityType, ActivityAction } from '@/lib/pocketbase/services/activity-logs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit, Trash2, RefreshCw, DollarSign, Truck, Mail, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';

interface ActivityTimelineProps {
  entityType: EntityType;
  entityId: string;
  title?: string;
}

const ACTION_ICONS: Record<ActivityAction, LucideIcon> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  status_change: RefreshCw,
  payment: DollarSign,
  shipment: Truck,
  email: Mail,
  other: Clock,
};

const ACTION_COLORS: Record<ActivityAction, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
  status_change: 'bg-yellow-100 text-yellow-800',
  payment: 'bg-purple-100 text-purple-800',
  shipment: 'bg-cyan-100 text-cyan-800',
  email: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
};

export function ActivityTimeline({ entityType, entityId, title }: ActivityTimelineProps) {
  const { t, locale } = useI18n();
  const { data: activities, loading } = useEntityActivities(entityType, entityId);

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: locale === 'zh' ? zhCN : enUS,
    });
  };

  const getDescription = (activity: typeof activities[0]) => {
    if (locale === 'zh' && activity.description_cn) {
      return activity.description_cn;
    }
    return activity.description || t(`activity.action.${activity.action}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title || t('activity.timeline')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || t('activity.timeline')}</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">{t('activity.noActivity')}</p>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
              {activities.map((activity) => {
                const IconComponent = ACTION_ICONS[activity.action as ActivityAction] || Clock;
                return (
                  <div key={activity.id} className="relative pl-10">
                    <div className={`absolute left-0 p-2 rounded-full ${ACTION_COLORS[activity.action as ActivityAction] || ACTION_COLORS.other}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className={ACTION_COLORS[activity.action as ActivityAction] || ACTION_COLORS.other}>
                          {t(`activity.action.${activity.action}`)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(activity.created)}
                        </span>
                      </div>
                      <p className="text-sm">{getDescription(activity)}</p>
                      {activity.user_name && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('activity.by')} {activity.user_name}
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

export default ActivityTimeline;
