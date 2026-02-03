'use client';

/**
 * Service Provider Detail Page
 * 服务商详情页
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Ship, Phone, Mail, MapPin, Loader2 } from 'lucide-react';
import { serviceProviderService, ServiceProvider, ServiceProviderType } from '@/lib/pocketbase/services/service-providers';

const TYPE_COLORS: Record<ServiceProviderType, string> = {
  freight_forwarder: 'bg-blue-100 text-blue-800',
  customs_broker: 'bg-green-100 text-green-800',
  shipping_line: 'bg-cyan-100 text-cyan-800',
  trucking: 'bg-orange-100 text-orange-800',
  warehouse: 'bg-purple-100 text-purple-800',
  inspection: 'bg-yellow-100 text-yellow-800',
  insurance: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function ServiceProviderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const id = params.id as string;

  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProvider();
  }, [id]);

  const loadProvider = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await serviceProviderService.getOne(id);
      setProvider(data);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (!provider) return '';
    return locale === 'zh' && provider.name_cn ? provider.name_cn : provider.name;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">{t('common.noData')}</p>
            <Button variant="outline" onClick={() => router.back()} className="mt-4">
              {t('common.back')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Ship className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-3xl font-bold">{getDisplayName()}</h1>
              <Badge className={TYPE_COLORS[provider.type]}>
                {t(`serviceProviders.type.${provider.type}`)}
              </Badge>
              <Badge variant={provider.is_active ? 'default' : 'secondary'}>
                {provider.is_active ? t('common.active') : t('common.inactive')}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 font-mono">{provider.code}</p>
          </div>
          <Button onClick={() => router.push(`/service-providers/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            {t('common.edit')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{locale === 'zh' ? '基本信息' : 'Basic Information'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('serviceProviders.columns.name')}</p>
                <p className="font-medium">{provider.name}</p>
              </div>
              {provider.name_cn && (
                <div>
                  <p className="text-sm text-muted-foreground">{locale === 'zh' ? '中文名称' : 'Chinese Name'}</p>
                  <p className="font-medium">{provider.name_cn}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">{t('serviceProviders.columns.type')}</p>
                <Badge className={TYPE_COLORS[provider.type]}>
                  {t(`serviceProviders.type.${provider.type}`)}
                </Badge>
              </div>
              {provider.rating && (
                <div>
                  <p className="text-sm text-muted-foreground">{locale === 'zh' ? '评级' : 'Rating'}</p>
                  <p className="font-medium">{'⭐'.repeat(provider.rating)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{locale === 'zh' ? '联系信息' : 'Contact Information'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {provider.contact_name && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t('serviceProviders.columns.contact')}:</span>
                <span className="font-medium">{provider.contact_name}</span>
              </div>
            )}
            {provider.contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{provider.contact_phone}</span>
              </div>
            )}
            {provider.contact_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${provider.contact_email}`} className="text-primary hover:underline">
                  {provider.contact_email}
                </a>
              </div>
            )}
            {provider.contact_wechat && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{locale === 'zh' ? '微信' : 'WeChat'}:</span>
                <span>{provider.contact_wechat}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {(provider.address || provider.address_cn || provider.city || provider.country) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {locale === 'zh' ? '地址' : 'Address'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {provider.country && <p>{provider.country}{provider.city ? `, ${provider.city}` : ''}</p>}
              {provider.address && <p>{provider.address}</p>}
              {provider.address_cn && <p className="text-muted-foreground">{provider.address_cn}</p>}
            </CardContent>
          </Card>
        )}

        {provider.remarks && (
          <Card>
            <CardHeader>
              <CardTitle>{locale === 'zh' ? '备注' : 'Remarks'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{provider.remarks}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
