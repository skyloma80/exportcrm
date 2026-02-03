'use client';

/**
 * Shipment Detail Page
 * 发货详情页
 * 
 * 强制项目上下文和订单上下文：必须通过 URL 参数 `project` 和 `order` 传递，否则返回 404
 * Requirements: 1.5, 5.3
 */

import { use, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useBreadcrumb } from '@/lib/breadcrumb/context';
import { useShipment } from '@/hooks/collections/shipments';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Package, Loader2 } from 'lucide-react';
import { projectService, type Project } from '@/lib/pocketbase/services/projects';
import { customerService, type Customer } from '@/lib/pocketbase/services/customers';
import { ShipmentWizardPage } from '@/components/shipments/shipment-wizard-page';
import { ShipmentStatus as WizardShipmentStatus } from '@/lib/shipment/wizard-config';

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { setItems: setBreadcrumb } = useBreadcrumb();
  const { shipment, isLoading, refetch } = useShipment(id);
  const orderId = searchParams.get('order');
  const projectId = searchParams.get('project');
  
  // 强制项目上下文和订单上下文：无参数返回 404 (Requirements: 1.5)
  if (!projectId || !orderId) {
    notFound();
  }
  
  // Context data
  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contextLoading, setContextLoading] = useState(true);

  // Load context data
  useEffect(() => {
    const loadContext = async () => {
      setContextLoading(true);
      try {
        // Load project
        const projectData = await projectService.getOne(projectId);
        setProject(projectData);
        
        // Load customer from project
        if (projectData?.customer) {
          const customerData = await customerService.getOne(projectData.customer);
          setCustomer(customerData);
        }
      } catch (error) {
        console.error('Failed to load context:', error);
      } finally {
        setContextLoading(false);
      }
    };
    
    loadContext();
  }, [projectId]);

  // 计算返回 URL：订单详情页的发货标签页 (Requirements: 5.3)
  const returnUrl = `/orders/${orderId}/shipments?project=${projectId}`;

  // 设置面包屑：订单 > 发货编号 (Requirements: 5.3)
  // 注意：客户和项目信息由 layout 根据 URL 参数自动添加
  useEffect(() => {
    if (shipment) {
      const order = shipment.expand?.order;
      setBreadcrumb([
        { label: order?.code || orderId, href: `/orders/${orderId}?project=${projectId}` },
        { label: shipment.code || shipment.id },
      ]);
    }
    return () => setBreadcrumb([]);
  }, [shipment, orderId, projectId, setBreadcrumb]);

  if (isLoading || contextLoading) {
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

  // 向导模式状态更新回调
  const handleWizardStatusChange = (newStatus: WizardShipmentStatus) => {
    refetch();
  };

  // 直接渲染向导模式
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
