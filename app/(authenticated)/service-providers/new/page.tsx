'use client';

/**
 * New Service Provider Page
 * 新建服务商页面
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useToast } from '@/hooks/use-toast';
import { ServiceProviderForm, ServiceProviderFormData } from '@/components/service-providers/service-provider-form';
import { serviceProviderService } from '@/lib/pocketbase/services/service-providers';

export default function NewServiceProviderPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: ServiceProviderFormData) => {
    setLoading(true);
    try {
      await serviceProviderService.createServiceProvider(data);
      toast({
        title: t('common.success'),
        description: t('serviceProviders.createSuccess') || 'Service provider created',
      });
      router.push('/service-providers');
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

  return (
    <div className="p-6">
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t('serviceProviders.newProvider')}</h1>
          <p className="text-muted-foreground mt-1">{t('serviceProviders.newDescription') || t('serviceProviders.description')}</p>
        </div>
      </div>
      <div className="max-w-2xl">
        <ServiceProviderForm
          onSubmit={handleSubmit}
          isLoading={loading}
        />
      </div>
    </div>
  );
}
