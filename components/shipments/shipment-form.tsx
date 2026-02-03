'use client';

/**
 * Shipment Form Component
 * 发货表单组件
 * 
 * 订单选择器已移除，订单 ID 从 URL 参数获取
 * Requirements: 5.2
 */

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Shipment, ShipmentStatus, ShippingMethod, ContainerType } from '@/lib/pocketbase/services/shipments';
import { useOrderContext } from '@/hooks/use-order-context';

export interface ShipmentFormData {
  order: string;
  shipping_method: string;
  status: ShipmentStatus;
  carrier?: string;
  vessel_name?: string;
  voyage_number?: string;
  container_number?: string;
  container_type?: string;
  bl_number?: string;
  etd?: string;
  eta?: string;
}

export interface ShipmentFormProps {
  initialData?: Partial<Shipment>;
  onSubmit: (data: ShipmentFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const SHIPPING_METHODS: ShippingMethod[] = ['sea', 'air', 'express', 'land'];
const CONTAINER_TYPES: ContainerType[] = ['20GP', '40GP', '40HQ', '45HQ'];
const STATUSES: ShipmentStatus[] = ['preparing', 'booking', 'customs_clearance', 'loaded', 'handed_over', 'shipped', 'in_transit', 'arrived', 'delivered'];

export function ShipmentForm({ initialData, onSubmit, onCancel, isLoading }: ShipmentFormProps) {
  const { t } = useI18n();
  // 从 URL 参数获取订单 ID (Requirements: 5.2)
  const { orderId, order: contextOrder, loading: contextLoading } = useOrderContext();
  
  const [formData, setFormData] = useState<ShipmentFormData>({
    order: initialData?.order || '',
    shipping_method: initialData?.shipping_method || 'sea',
    status: initialData?.status || 'preparing',
    carrier: initialData?.carrier || '',
    vessel_name: initialData?.vessel_name || '',
    voyage_number: initialData?.voyage_number || '',
    container_number: initialData?.container_number || '',
    container_type: initialData?.container_type,
    bl_number: initialData?.bl_number || '',
    etd: initialData?.etd ? initialData.etd.split('T')[0] : '',
    eta: initialData?.eta ? initialData.eta.split('T')[0] : '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 从 URL 参数预填充订单 ID (Requirements: 5.2)
  useEffect(() => {
    if (orderId && !initialData?.order) {
      setFormData(prev => ({ ...prev, order: orderId }));
    }
  }, [orderId, initialData?.order]);

  const handleChange = (field: keyof ShipmentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.order) {
      newErrors.order = t('validation.required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  if (contextLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6 space-y-4">
          {/* 订单选择器已移除 - 订单信息从 URL 参数获取 (Requirements: 5.2) */}
          {/* 显示订单信息作为只读字段 */}
          {contextOrder && (
            <div className="space-y-2">
              <Label>{t('shipments.columns.order')}</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{contextOrder.code}</p>
                <p className="text-sm text-muted-foreground">
                  {t('common.prefilledFromContext') || 'Pre-filled from order context'}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shipping_method">{t('shipments.columns.shippingMethod')}</Label>
              <Select
                value={formData.shipping_method}
                onValueChange={(value) => handleChange('shipping_method', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIPPING_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {t(`shipments.shippingMethods.${m}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('shipments.columns.status')}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`shipments.status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">{t('shipments.columns.carrier')}</Label>
              <Input
                id="carrier"
                value={formData.carrier}
                onChange={(e) => handleChange('carrier', e.target.value)}
                placeholder={t('shipments.placeholders.carrier')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vessel_name">{t('shipments.columns.vesselName')}</Label>
              <Input
                id="vessel_name"
                value={formData.vessel_name}
                onChange={(e) => handleChange('vessel_name', e.target.value)}
                placeholder={t('shipments.placeholders.vesselName')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voyage_number">{t('shipments.columns.voyageNumber')}</Label>
              <Input
                id="voyage_number"
                value={formData.voyage_number}
                onChange={(e) => handleChange('voyage_number', e.target.value)}
                placeholder={t('shipments.placeholders.voyageNumber')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bl_number">{t('shipments.columns.blNumber')}</Label>
              <Input
                id="bl_number"
                value={formData.bl_number}
                onChange={(e) => handleChange('bl_number', e.target.value)}
                placeholder={t('shipments.placeholders.blNumber')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="container_number">{t('shipments.columns.containerNumber')}</Label>
              <Input
                id="container_number"
                value={formData.container_number}
                onChange={(e) => handleChange('container_number', e.target.value)}
                placeholder={t('shipments.placeholders.containerNumber')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="container_type">{t('shipments.columns.containerType')}</Label>
              <Select
                value={formData.container_type || ''}
                onValueChange={(value) => handleChange('container_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('shipments.placeholders.containerType')} />
                </SelectTrigger>
                <SelectContent>
                  {CONTAINER_TYPES.map((ct) => (
                    <SelectItem key={ct} value={ct}>
                      {t(`shipments.containerTypes.${ct}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="etd">{t('shipments.columns.etd')}</Label>
              <Input
                id="etd"
                type="date"
                value={formData.etd}
                onChange={(e) => handleChange('etd', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eta">{t('shipments.columns.eta')}</Label>
              <Input
                id="eta"
                type="date"
                value={formData.eta}
                onChange={(e) => handleChange('eta', e.target.value)}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default ShipmentForm;
