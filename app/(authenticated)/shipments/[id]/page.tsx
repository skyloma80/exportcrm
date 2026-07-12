'use client';

/**
 * Shipment Detail Page
 * 发货详情页
 * 
 * 通过 URL 参数 `order` 或 shipment expand 数据解析订单上下文
 * Requirements: 1.5, 5.3
 */

import { use, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useBreadcrumb } from '@/lib/breadcrumb/context';
import { useShipment } from '@/hooks/collections/shipments';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, Loader2 } from 'lucide-react';
import { ShipmentWizardPage } from '@/components/shipments/shipment-wizard-page';
import { ShipmentStatus as WizardShipmentStatus } from '@/lib/shipment/wizard-config';

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setItems: setBreadcrumb } = useBreadcrumb();
  const { shipment, isLoading, refetch } = useShipment(id);
  const orderIdFromUrl = searchParams.get('order');

  const [resolvedOrderId, setResolvedOrderId] = useState<string | null>(orderIdFromUrl);

  useEffect(() => {
    if (resolvedOrderId) return;
    if (!shipment?.expand?.order) return;
    setResolvedOrderId(shipment.expand.order.id);
  }, [shipment, resolvedOrderId]);

  const returnUrl = resolvedOrderId
    ? `/so/${resolvedOrderId}/shipments`
    : '/so';

  useEffect(() => {
    if (!shipment || !resolvedOrderId) return;
    const order = shipment.expand?.order;
    setBreadcrumb([
      { label: order?.code || resolvedOrderId, href: `/so/${resolvedOrderId}` },
      { label: shipment.code || shipment.id },
    ]);
    return () => setBreadcrumb([]);
  }, [shipment, resolvedOrderId, setBreadcrumb]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t('shipments.notFound')}</h2>
            <Button variant="outline" onClick={() => router.push(returnUrl)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('shipments.backToList')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleWizardStatusChange = (newStatus: WizardShipmentStatus) => {
    refetch();
  };

  return (
    <div className="p-6">
      <ShipmentWizardPage
        shipment={{
          id: shipment.id,
          code: shipment.code,
          order: shipment.order,
          status: shipment.status as WizardShipmentStatus,
          shipping_method: shipment.shipping_method as 'sea' | 'air' | 'land' | 'express',
          is_cross_border: (shipment as any).is_cross_border,
        }}
        onBackToOrder={() => router.push(returnUrl)}
        onStatusChange={handleWizardStatusChange}
      />
    </div>
  );
}
