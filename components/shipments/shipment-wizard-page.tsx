'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { ShippingMethod, ShipmentStatus } from '@/lib/shipment/wizard-config';

// 动态导入向导组件，按需加载
const SeaWizard = dynamic(
  () => import('./wizards/sea-wizard').then(mod => ({ default: mod.SeaWizard })),
  {
    loading: () => <WizardSkeleton />,
    ssr: false,
  }
);

const AirWizard = dynamic(
  () => import('./wizards/air-wizard').then(mod => ({ default: mod.AirWizard })),
  {
    loading: () => <WizardSkeleton />,
    ssr: false,
  }
);

const LandWizard = dynamic(
  () => import('./wizards/land-wizard').then(mod => ({ default: mod.LandWizard })),
  {
    loading: () => <WizardSkeleton />,
    ssr: false,
  }
);

function WizardSkeleton() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

interface Shipment {
  id: string;
  code: string;
  order: string;
  status: ShipmentStatus;
  shipping_method: ShippingMethod;
  is_cross_border?: boolean;
  [key: string]: any;
}

interface ShipmentWizardPageProps {
  /** 发货单数据 */
  shipment: Shipment;
  /** 返回订单回调 */
  onBackToOrder?: () => void;
  /** 状态更新回调 */
  onStatusChange?: (status: ShipmentStatus) => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 发货向导页面组件
 * 根据运输方式动态加载对应的向导组件
 */
export function ShipmentWizardPage({
  shipment,
  onBackToOrder,
  onStatusChange,
  className,
}: ShipmentWizardPageProps) {
  const shippingMethod = shipment.shipping_method || 'sea';

  // 根据运输方式选择对应的向导组件
  switch (shippingMethod) {
    case 'sea':
      return (
        <SeaWizard
          shipment={shipment}
          onBackToOrder={onBackToOrder}
          onStatusChange={onStatusChange}
          className={className}
        />
      );
    case 'air':
      return (
        <AirWizard
          shipment={shipment}
          onBackToOrder={onBackToOrder}
          onStatusChange={onStatusChange}
          className={className}
        />
      );
    case 'land':
    case 'express':
      return (
        <LandWizard
          shipment={shipment}
          isCrossBorder={shipment.is_cross_border}
          onBackToOrder={onBackToOrder}
          onStatusChange={onStatusChange}
          className={className}
        />
      );
    default:
      return (
        <SeaWizard
          shipment={shipment}
          onBackToOrder={onBackToOrder}
          onStatusChange={onStatusChange}
          className={className}
        />
      );
  }
}
