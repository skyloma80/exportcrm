'use client';

import { useState, useCallback } from 'react';
import { WizardLayout } from '@/components/shipments/steps/wizard-layout';
import { SkipConfirmDialog } from '@/components/shipments/shared/skip-confirm-dialog';
import { ItemsStep } from '@/components/shipments/steps/items-step';
import { CustomsStep } from '@/components/shipments/steps/customs-step';
import { ShippingStep } from '@/components/shipments/steps/shipping-step';
import { TransitStep } from '@/components/shipments/steps/transit-step';
import { DeliveryStep } from '@/components/shipments/steps/delivery-step';
import {
  getWizardSteps,
  getStepIndexByStatus,
  canEditShipmentItems,
  ShipmentStatus,
} from '@/lib/shipment/wizard-config';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/use-i18n';

interface Shipment {
  id: string;
  code: string;
  order: string;
  status: ShipmentStatus;
  is_cross_border?: boolean;
  [key: string]: any;
}

interface LandWizardProps {
  /** 发货单数据 */
  shipment: Shipment;
  /** 是否跨境运输 */
  isCrossBorder?: boolean;
  /** 返回订单回调 */
  onBackToOrder?: () => void;
  /** 状态更新回调 */
  onStatusChange?: (status: ShipmentStatus) => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 陆运向导组件
 * 跨境步骤：准备 → 报关 → 发货 → 运输 → 签收
 * 国内步骤：准备 → 发货 → 运输 → 签收
 */
export function LandWizard({
  shipment,
  isCrossBorder = true,
  onBackToOrder,
  onStatusChange,
  className,
}: LandWizardProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  
  // 根据是否跨境获取步骤配置
  const crossBorder = shipment.is_cross_border ?? isCrossBorder;
  const steps = getWizardSteps('land', crossBorder);
  
  const [currentStepIndex, setCurrentStepIndex] = useState(
    getStepIndexByStatus(steps, shipment.status)
  );
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [stepValidity, setStepValidity] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const currentStep = steps[currentStepIndex];
  const canEdit = canEditShipmentItems(shipment.status);

  const updateStatus = async (newStatus: ShipmentStatus) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/shipments/${shipment.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      onStatusChange?.(newStatus);
      toast({ title: t('shipments.wizard.statusUpdated') });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: t('shipments.wizard.statusUpdateFailed'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }, [currentStepIndex]);

  const handleNext = useCallback(async () => {
    if (currentStepIndex < steps.length - 1) {
      const nextStep = steps[currentStepIndex + 1];
      await updateStatus(nextStep.status);
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      await updateStatus('delivered');
      toast({ title: t('shipments.wizard.shipmentComplete') });
    }
  }, [currentStepIndex, steps, t]);

  const handleSkip = useCallback(() => {
    setShowSkipDialog(true);
  }, []);

  const handleConfirmSkip = useCallback(async () => {
    setShowSkipDialog(false);
    if (currentStepIndex < steps.length - 1) {
      const nextStep = steps[currentStepIndex + 1];
      await updateStatus(nextStep.status);
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }, [currentStepIndex, steps]);

  const handleStepClick = useCallback((index: number) => {
    if (index < currentStepIndex) {
      setCurrentStepIndex(index);
    }
  }, [currentStepIndex]);

  const handleStepDataChange = useCallback((stepId: string, isValid: boolean) => {
    setStepValidity(prev => ({ ...prev, [stepId]: isValid }));
  }, []);

  const renderStepContent = () => {
    switch (currentStep.id) {
      case 'preparing':
        return (
          <ItemsStep
            shipmentId={shipment.id}
            orderId={shipment.order}
            canEdit={canEdit}
            onItemsChange={(items, isValid) => handleStepDataChange('preparing', isValid)}
          />
        );
      case 'customs':
        return (
          <CustomsStep
            shipmentId={shipment.id}
            isCrossBorder={true}
            initialData={{
              customs_broker: shipment.customs_broker,
              customs_number: shipment.customs_number,
              customs_port: shipment.customs_port,
            }}
            onChange={(data, isValid) => handleStepDataChange('customs', isValid)}
          />
        );
      case 'shipping':
        return (
          <ShippingStep
            shipmentId={shipment.id}
            summary={{
              totalPackages: shipment.total_packages || 0,
              totalWeight: shipment.total_gross_weight || 0,
            }}
            initialData={{
              carrier: shipment.carrier,
              tracking_number: shipment.tracking_number,
              shipping_date: shipment.shipping_date,
              receiver_name: shipment.receiver_name,
              receiver_phone: shipment.receiver_phone,
              receiver_address: shipment.receiver_address,
            }}
            onChange={(data, isValid) => handleStepDataChange('shipping', isValid)}
          />
        );
      case 'transit':
        return (
          <TransitStep
            shipmentId={shipment.id}
            shippingMethod="land"
            shipmentInfo={{
              carrier: shipment.carrier,
              tracking_number: shipment.tracking_number,
            }}
            initialData={{
              actual_departure: shipment.shipping_date,
            }}
            onChange={(data, isValid) => handleStepDataChange('transit', isValid)}
          />
        );
      case 'delivery':
        return (
          <DeliveryStep
            shipmentId={shipment.id}
            initialData={{
              delivery_date: shipment.delivery_date,
              receiver_name: shipment.receiver_name,
            }}
            onChange={(data, isValid) => handleStepDataChange('delivery', isValid)}
          />
        );
      default:
        return <div>{t('shipments.wizard.unknownStep')}</div>;
    }
  };

  return (
    <>
      <WizardLayout
        shipmentNo={shipment.code}
        steps={steps}
        currentStepIndex={currentStepIndex}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSkip={handleSkip}
        onBackToOrder={onBackToOrder}
        onStepClick={handleStepClick}
        canGoNext={true}
        canGoPrevious={currentStepIndex > 0}
        showSkip={currentStepIndex < steps.length - 1}
        isLoading={isLoading}
        className={className}
      >
        {renderStepContent()}
      </WizardLayout>

      <SkipConfirmDialog
        open={showSkipDialog}
        onOpenChange={setShowSkipDialog}
        step={currentStep}
        onConfirm={handleConfirmSkip}
      />
    </>
  );
}

export default LandWizard;
