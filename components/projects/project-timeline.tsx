'use client';

/**
 * Project Timeline Component
 * 项目时间线组件
 */

import { useI18n } from '@/lib/i18n/use-i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  ShoppingCart, 
  Package, 
  Ship, 
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'quotation' | 'order' | 'purchase_order' | 'shipment' | 'invoice';
  code: string;
  title: string;
  status: string;
  date: string;
  amount?: number;
  currency?: string;
}

interface ProjectTimelineProps {
  events: TimelineEvent[];
}

const EVENT_ICONS = {
  quotation: FileText,
  order: ShoppingCart,
  purchase_order: Package,
  shipment: Ship,
  invoice: FileText,
};

const EVENT_COLORS = {
  quotation: 'bg-purple-100 text-purple-800',
  order: 'bg-green-100 text-green-800',
  purchase_order: 'bg-orange-100 text-orange-800',
  shipment: 'bg-cyan-100 text-cyan-800',
  invoice: 'bg-yellow-100 text-yellow-800',
};

export function ProjectTimeline({ events }: ProjectTimelineProps) {
  const { t } = useI18n();

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('projects.timeline.title') || 'Project Timeline'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('projects.timeline.empty') || 'No events yet'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort events by date descending
  const sortedEvents = [...events].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('projects.timeline.title') || 'Project Timeline'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {sortedEvents.map((event, index) => {
              const Icon = EVENT_ICONS[event.type] || FileText;
              const colorClass = EVENT_COLORS[event.type] || 'bg-gray-100 text-gray-800';

              return (
                <div key={event.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{event.code}</span>
                        <Badge variant="outline" className="text-xs">
                          {t(`projects.timeline.types.${event.type}`) || event.type}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(event.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm">{event.title}</p>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {event.status}
                      </Badge>
                      {event.amount !== undefined && (
                        <span className="text-sm font-medium">
                          {event.currency || 'USD'} {event.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProjectTimeline;
