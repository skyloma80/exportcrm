'use client';

/**
 * Edit Service Provider Page
 * 编辑服务商页面
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useToast } from '@/hooks/use-toast';
import { ServiceProviderForm, ServiceProviderFormData } from '@/components/service-providers/service-provider-form';
import { serviceProviderService, ServiceProvider } from '@/lib/pocketbase/services/service-providers';
import { Loader2 } from 'lucide-react';

export default function EditServiceProviderPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useI18n();
  const { toast } = useToast();
  const id = params.id as string;

  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (data: ServiceProviderFormData) => {
    setSubmitting(true);
    try {
      await serviceProviderService.updateServiceProvider(id, data);
      toast({
        title: t('common.success'),
        description: t('serviceProviders.updateSuccess') || 'Service provider updated',
      });
      router.push(`/service-providers/${id}`);
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
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
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t('serviceProviders.edit') || t('common.edit')}</h1>
          <p className="text-muted-foreground mt-1">{provider?.name}</p>
        </div>
      </div>
      <div className="max-w-2xl">
        <ServiceProviderForm
          initialData={provider || undefined}
          onSubmit={handleSubmit}
          isLoading={submitting}
        />
      </div>
    </div>
  );
}
