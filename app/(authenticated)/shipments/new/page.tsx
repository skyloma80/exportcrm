'use client';

/**
 * New Shipment Page
 * 新建发货页面
 * 
 * 强制项目上下文和订单上下文：必须通过 URL 参数 `project` 和 `order` 传递，否则返回 404
 * 第一步显示运输方式选择器，选择后进入发货明细步骤
 * Requirements: 1.1, 1.2, 1.5, 5.1, 5.2, 5.3
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { notFound } from 'next/navigation';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useToast } from '@/hooks/use-toast';
import { useBreadcrumb } from '@/lib/breadcrumb/context';
import { ShippingMethodSelector } from '@/components/shipments/shipping-method-selector';
import { shipmentService } from '@/lib/pocketbase/services/shipments';
import { orderService, type Order } from '@/lib/pocketbase/services/orders';
import { projectService, type Project } from '@/lib/pocketbase/services/projects';
import { customerService, type Customer } from '@/lib/pocketbase/services/customers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ShippingMethod } from '@/lib/shipment/wizard-config';

export default function NewShipmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { toast } = useToast();
  const { setItems: setBreadcrumb } = useBreadcrumb();
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(true);
  
  // Get order and project context from URL params
  const orderId = searchParams.get('order');
  const projectId = searchParams.get('project');
  
  // 强制项目上下文和订单上下文：无参数返回 404 (Requirements: 1.5)
  if (!projectId || !orderId) {
    notFound();
  }
  
  // Context data
  const [order, setOrder] = useState<Order | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  // Load context data
  useEffect(() => {
    const loadContext = async () => {
      setContextLoading(true);
      try {
        // Load order
        const orderData = await orderService.getOne(orderId);
        setOrder(orderData);
        
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
  }, [orderId, projectId]);

  // 设置面包屑：订单 > 新建发货 (Requirements: 5.3)
  // 注意：客户和项目信息由 layout 根据 URL 参数自动添加
  useEffect(() => {
    if (order) {
      setBreadcrumb([
        { label: order.code, href: `/orders/${order.id}?project=${projectId}` },
        { label: t('shipments.newShipment') },
      ]);
    }
    return () => setBreadcrumb([]);
  }, [order, projectId, setBreadcrumb, t]);

  // 计算返回 URL：订单详情页的发货标签页 (Requirements: 5.1)
  const returnUrl = `/orders/${orderId}/shipments?project=${projectId}`;

  const handleCancel = () => {
    router.push(returnUrl);
  };

  // 运输方式选择回调 - 直接创建发货单并跳转到向导
  const handleMethodSelect = async (method: ShippingMethod, crossBorder: boolean) => {
    setLoading(true);
    try {
      const shipment = await shipmentService.createShipment({
        order: orderId,
        shipping_method: method,
      });
      
      // Update is_cross_border for land shipments
      if (method === 'land') {
        await shipmentService.update(shipment.id, { is_cross_border: crossBorder });
      }
      
      toast({
        title: t('common.success'),
        description: t('shipments.createSuccess'),
      });
      
      // Navigate to shipment wizard
      router.push(`/shipments/${shipment.id}?order=${orderId}&project=${projectId}`);
    } catch (error: any) {
      console.error('Create shipment error:', error);
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  if (contextLoading || loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 选择运输方式 - 选择后直接创建发货单并进入向导 */}
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
