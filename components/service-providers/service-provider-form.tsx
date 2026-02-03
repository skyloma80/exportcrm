'use client';

/**
 * Service Provider Form Component
 * 服务商表单组件
 */

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { ServiceProvider, ServiceProviderType } from '@/lib/pocketbase/services/service-providers';

export interface ServiceProviderFormData {
  name: string;
  name_cn?: string;
  type: ServiceProviderType;
  country?: string;
  city?: string;
  address?: string;
  address_cn?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  contact_wechat?: string;
  rating?: number;
  is_active: boolean;
  remarks?: string;
}

export interface ServiceProviderFormProps {
  initialData?: Partial<ServiceProvider>;
  onSubmit: (data: ServiceProviderFormData) => Promise<void>;
  isLoading?: boolean;
}

const PROVIDER_TYPES: ServiceProviderType[] = [
  'freight_forwarder',
  'customs_broker',
  'shipping_line',
  'trucking',
  'warehouse',
  'inspection',
  'insurance',
  'other',
];

export function ServiceProviderForm({ initialData, onSubmit, isLoading }: ServiceProviderFormProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState<ServiceProviderFormData>({
    name: initialData?.name || '',
    name_cn: initialData?.name_cn || '',
    type: initialData?.type || 'freight_forwarder',
    country: initialData?.country || '',
    city: initialData?.city || '',
    address: initialData?.address || '',
    address_cn: initialData?.address_cn || '',
    contact_name: initialData?.contact_name || '',
    contact_phone: initialData?.contact_phone || '',
    contact_email: initialData?.contact_email || '',
    contact_wechat: initialData?.contact_wechat || '',
    rating: initialData?.rating,
    is_active: initialData?.is_active ?? true,
    remarks: initialData?.remarks || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof ServiceProviderFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = t('validation.required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-medium">{t('serviceProviders.basicInfo') || '基本信息'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('serviceProviders.columns.name')} <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name_cn">{t('serviceProviders.columns.name')} (中文)</Label>
                <Input
                  id="name_cn"
                  value={formData.name_cn}
                  onChange={(e) => handleChange('name_cn', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">{t('serviceProviders.columns.type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: ServiceProviderType) => handleChange('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`serviceProviders.type.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">{t('common.rating') || 'Rating'}</Label>
                <Select
                  value={formData.rating?.toString() || '_none_'}
                  onValueChange={(value) => handleChange('rating', value === '_none_' ? undefined : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">-</SelectItem>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <SelectItem key={r} value={r.toString()}>
                        {'⭐'.repeat(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-medium">{t('serviceProviders.columns.contact')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">{t('serviceProviders.columns.contact')}</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_phone">{t('serviceProviders.columns.phone')}</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">{t('serviceProviders.columns.email')}</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_wechat">WeChat</Label>
                <Input
                  id="contact_wechat"
                  value={formData.contact_wechat}
                  onChange={(e) => handleChange('contact_wechat', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="font-medium">{t('common.address') || 'Address'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">{t('customers.columns.country') || 'Country'}</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t('common.city') || 'City'}</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">{t('customers.columns.address') || 'Address'}</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_cn">{t('customers.columns.address') || 'Address'} (中文)</Label>
              <Input
                id="address_cn"
                value={formData.address_cn}
                onChange={(e) => handleChange('address_cn', e.target.value)}
              />
            </div>
          </div>

          {/* Status & Remarks */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="is_active">{t('common.active')}</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange('is_active', checked)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">{t('customers.columns.remarks') || 'Remarks'}</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('common.save')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default ServiceProviderForm;
