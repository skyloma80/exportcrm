'use client';

/**
 * New Shipment Page
 * 新建发货页面
 * 
 * 第一步显示运输方式选择器，选择后进入发货明细步骤
 * Requirements: 1.1, 1.2, 1.5, 5.1, 5.2, 5.3
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useToast } from '@/hooks/use-toast';
import { useBreadcrumb } from '@/lib/breadcrumb/context';
import { ShippingMethodSelector } from '@/components/shipments/shipping-method-selector';
import { shipmentService } from '@/lib/pocketbase/services/shipments';
import { soService, type FlatSO } from '@/lib/pocketbase/services/so';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ShippingMethod } from '@/lib/shipment/wizard-config';

export default function NewShipmentPage() {
  return (
    <Suspense fallback={
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <NewShipmentPageInner />
    </Suspense>
  );
}

function NewShipmentPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { toast } = useToast();
  const { setItems: setBreadcrumb } = useBreadcrumb();
  const [loading, setLoading] = useState(false);

  const orderId = searchParams.get('order');

  if (!orderId) {
    notFound();
  }

  const [order, setOrder] = useState<FlatSO | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const orderData = await soService.getOne(orderId);
        setOrder(orderData);
      } catch (error) {
        console.error('Failed to load order:', error);
      }
    };
    loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (order) {
      setBreadcrumb([
        { label: order.code || t("orders.detail"), href: `/so/${order.id}` },
        { label: t('shipments.newShipment') },
      ]);
    }
    return () => setBreadcrumb([]);
  }, [order, setBreadcrumb, t]);

  const handleCancel = () => {
    router.push(`/so/${orderId}/shipments`);
  };

  const handleMethodSelect = async (method: ShippingMethod, crossBorder: boolean) => {
    setLoading(true);
    try {
      console.log('Creating shipment with data:', { order: orderId, shipping_method: method });
      const shipment = await shipmentService.createShipment({
        order: orderId,
        shipping_method: method,
      });

      if (method === 'land') {
        await shipmentService.update(shipment.id, { is_cross_border: crossBorder });
      }

      toast({
        title: t('common.success'),
        description: t('shipments.createSuccess'),
      });

      router.push(`/shipments/${shipment.id}?order=${orderId}`);
    } catch (error: any) {
      console.error('Create shipment error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      let errorDetails = '';

      if (error.response?.data?.data) {
        if (typeof error.response.data.data === 'string') {
          errorDetails = error.response.data.data;
        } else if (error.response.data.data instanceof Object) {
          try {
            errorDetails = JSON.stringify(error.response.data.data);
          } catch (e) {
            errorDetails = String(error.response.data.data);
          }
        } else {
          errorDetails = String(error.response.data.data);
        }
      } else if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorDetails = error.response.data;
        } else if (error.response.data instanceof Object) {
          try {
            errorDetails = JSON.stringify(error.response.data);
          } catch (e) {
            errorDetails = String(error.response.data);
          }
        } else {
          errorDetails = String(error.response.data);
        }
      }

      console.error('Full error details:', { message: errorMessage, details: errorDetails, status: error.response?.status });

      toast({
        title: t('common.error'),
        description: errorDetails || errorMessage || 'Failed to create shipment',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="max-w-4xl">
        <CardContent className="pt-6">
          <ShippingMethodSelector
            onSelect={handleMethodSelect}
            onBack={handleCancel}
            disabled={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
