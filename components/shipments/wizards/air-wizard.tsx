'use client';

import { useState, useCallback, useEffect } from 'react';
import { WizardLayout } from '@/components/shipments/steps/wizard-layout';
import { SkipConfirmDialog } from '@/components/shipments/shared/skip-confirm-dialog';
import { ItemsStep } from '@/components/shipments/steps/items-step';
import { BookingStep } from '@/components/shipments/steps/booking-step';
import { CustomsStep } from '@/components/shipments/steps/customs-step';
import { HandoverStep } from '@/components/shipments/steps/handover-step';
import { TransitStep } from '@/components/shipments/steps/transit-step';
import { ArrivalStep } from '@/components/shipments/steps/arrival-step';
import { DeliveryStep } from '@/components/shipments/steps/delivery-step';
import {
  AIR_WIZARD_STEPS,
  getStepIndexByStatus,
  canEditShipmentItems,
  ShipmentStatus,
} from '@/lib/shipment/wizard-config';
import {
  getStepHistory,
  saveStepSnapshot,
  createStepSnapshot,
  isStepReadOnly,
  ShipmentStepHistory,
} from '@/lib/shipment/step-snapshot';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/use-i18n';

interface Shipment {
  id: string;
  code: string;
  order: string;
  status: ShipmentStatus;
  [key: string]: any;
}

interface AirWizardProps {
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
 * 空运向导组件
 * 步骤：准备 → 订舱 → 报关 → 交货 → 发运 → 到港 → 签收
 */
export function AirWizard({
  shipment,
  onBackToOrder,
  onStatusChange,
  className,
}: AirWizardProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const steps = AIR_WIZARD_STEPS;
  
  const activeStepIndex = getStepIndexByStatus(steps, shipment.status);
  const [viewingStepIndex, setViewingStepIndex] = useState(activeStepIndex);
  const [stepHistory, setStepHistory] = useState<ShipmentStepHistory | null>(null);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [stepValidity, setStepValidity] = useState<Record<string, boolean>>({});
  const [currentStepData, setCurrentStepData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const currentStep = steps[viewingStepIndex];
  const isViewingHistory = viewingStepIndex < activeStepIndex;
  const isReadOnly = isStepReadOnly(viewingStepIndex, activeStepIndex);
  const canEdit = canEditShipmentItems(shipment.status) && !isReadOnly;

  useEffect(() => {
    const loadHistory = async () => {
      const history = await getStepHistory(shipment.id);
      setStepHistory(history);
    };
    loadHistory();
  }, [shipment.id]);

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
    if (viewingStepIndex > 0) {
      setViewingStepIndex(viewingStepIndex - 1);
    }
  }, [viewingStepIndex]);

  const handleNext = useCallback(async () => {
    if (isViewingHistory) {
      toast({ 
        title: t('shipments.wizard.cannotAdvanceFromHistory'), 
        variant: 'destructive' 
      });
      return;
    }

    const currentStepId = currentStep.id;
    if (stepValidity[currentStepId] !== true) {
      toast({ 
        title: t('shipments.wizard.validationRequired'), 
        variant: 'destructive' 
      });
      return;
    }

    try {
      const snapshot = createStepSnapshot(
        currentStepId,
        currentStep.status,
        currentStepData
      );
      await saveStepSnapshot(shipment.id, snapshot);

      const updatedHistory = await getStepHistory(shipment.id);
      setStepHistory(updatedHistory);

      if (activeStepIndex < steps.length - 1) {
        const nextStep = steps[activeStepIndex + 1];
        await updateStatus(nextStep.status);
        setViewingStepIndex(activeStepIndex + 1);
      } else {
        await updateStatus('delivered');
        toast({ title: t('shipments.wizard.shipmentComplete') });
      }
    } catch (error) {
      console.error('Error saving step snapshot:', error);
      toast({ 
        title: t('shipments.wizard.snapshotSaveFailed'), 
        variant: 'destructive' 
      });
    }
  }, [isViewingHistory, activeStepIndex, steps, t, currentStep, stepValidity, currentStepData, shipment.id]);

  const handleSkip = useCallback(() => {
    if (isViewingHistory) {
      toast({ 
        title: t('shipments.wizard.cannotSkipFromHistory'), 
        variant: 'destructive' 
      });
      return;
    }
    setShowSkipDialog(true);
  }, [isViewingHistory, t, toast]);

  const handleConfirmSkip = useCallback(async () => {
    setShowSkipDialog(false);
    
    try {
      const snapshot = createStepSnapshot(
        currentStep.id,
        currentStep.status,
        { skipped: true }
      );
      await saveStepSnapshot(shipment.id, snapshot);

      if (activeStepIndex < steps.length - 1) {
        const nextStep = steps[activeStepIndex + 1];
        await updateStatus(nextStep.status);
        setViewingStepIndex(activeStepIndex + 1);
      }
    } catch (error) {
      console.error('Error skipping step:', error);
    }
  }, [activeStepIndex, steps, currentStep, shipment.id]);

  const handleStepClick = useCallback((index: number) => {
    if (index <= activeStepIndex) {
      setViewingStepIndex(index);
    }
  }, [activeStepIndex]);

  const handleStepDataChange = useCallback((stepId: string, data: any, isValid: boolean) => {
    setStepValidity(prev => ({ ...prev, [stepId]: isValid }));
    setCurrentStepData(data);
  }, []);

  const getStepData = (stepId: string) => {
    if (isViewingHistory && stepHistory) {
      const snapshot = stepHistory.snapshots.find(s => s.stepId === stepId);
      return snapshot?.data || {};
    }
    return {};
  };

  const renderStepContent = () => {
    const stepData = getStepData(currentStep.id);
    
    switch (currentStep.id) {
      case 'preparing':
        return (
          <ItemsStep
            shipmentId={shipment.id}
            orderId={shipment.order}
            canEdit={canEdit}
            onItemsChange={(items, isValid) => handleStepDataChange('preparing', { items }, isValid)}
          />
        );
      case 'booking':
        return (
          <BookingStep
            shipmentId={shipment.id}
            shippingMethod="air"
            initialData={isViewingHistory ? stepData : {
              carrier: shipment.carrier,
              flight_number: shipment.flight_number,
              etd: shipment.etd,
              eta: shipment.eta,
            }}
            onChange={(data, isValid) => handleStepDataChange('booking', data, isValid)}
            disabled={isReadOnly}
          />
        );
      case 'customs':
        return (
          <CustomsStep
            shipmentId={shipment.id}
            initialData={isViewingHistory ? stepData : {
              customs_broker: shipment.customs_broker,
              customs_number: shipment.customs_number,
              customs_date: shipment.customs_date,
              clearance_date: shipment.clearance_date,
            }}
            onChange={(data, isValid) => handleStepDataChange('customs', data, isValid)}
            disabled={isReadOnly}
          />
        );
      case 'handover':
        return (
          <HandoverStep
            shipmentId={shipment.id}
            summary={{
              totalPackages: shipment.total_packages || 0,
              totalGrossWeight: shipment.total_gross_weight || 0,
            }}
            initialData={isViewingHistory ? stepData : {
              handover_date: shipment.handover_date,
              handover_location: shipment.handover_location,
              receiver: shipment.handover_receiver,
            }}
            onChange={(data, isValid) => handleStepDataChange('handover', data, isValid)}
            disabled={isReadOnly}
          />
        );
      case 'transit':
        return (
          <TransitStep
            shipmentId={shipment.id}
            shippingMethod="air"
            shipmentInfo={{
              flight_number: shipment.flight_number,
              departure_port: shipment.departure_port,
              destination_port: shipment.destination_port,
            }}
            initialData={isViewingHistory ? stepData : {
              actual_departure: shipment.actual_departure,
              eta: shipment.eta,
              bl_number: shipment.awb_number,
            }}
            onChange={(data, isValid) => handleStepDataChange('transit', data, isValid)}
            disabled={isReadOnly}
          />
        );
      case 'arrival':
        return (
          <ArrivalStep
            shipmentId={shipment.id}
            shippingMethod="air"
            shipmentInfo={{
              destination_port: shipment.destination_port,
            }}
            initialData={isViewingHistory ? stepData : {
              actual_arrival: shipment.actual_arrival,
              clearance_status: shipment.dest_clearance_status,
            }}
            onChange={(data, isValid) => handleStepDataChange('arrival', data, isValid)}
            disabled={isReadOnly}
          />
        );
      case 'delivery':
        return (
          <DeliveryStep
            shipmentId={shipment.id}
            initialData={isViewingHistory ? stepData : {
              delivery_date: shipment.delivery_date,
              receiver_name: shipment.receiver_name,
            }}
            onChange={(data, isValid) => handleStepDataChange('delivery', data, isValid)}
            disabled={isReadOnly}
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
        currentStepIndex={viewingStepIndex}
        activeStepIndex={activeStepIndex}
        isViewingHistory={isViewingHistory}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSkip={handleSkip}
        onBackToOrder={onBackToOrder}
        onStepClick={handleStepClick}
        canGoNext={!isViewingHistory}
        canGoPrevious={viewingStepIndex > 0}
        showSkip={!isViewingHistory && activeStepIndex < steps.length - 1}
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

export default AirWizard;
