'use client';

import { useState, useCallback, useEffect } from 'react';
import { WizardLayout } from '@/components/shipments/steps/wizard-layout';
import { SkipConfirmDialog } from '@/components/shipments/shared/skip-confirm-dialog';
import { ItemsStep } from '@/components/shipments/steps/items-step';
import { BookingStep } from '@/components/shipments/steps/booking-step';
import { CustomsStep } from '@/components/shipments/steps/customs-step';
import { LoadingStep } from '@/components/shipments/steps/loading-step';
import { TransitStep } from '@/components/shipments/steps/transit-step';
import { ArrivalStep } from '@/components/shipments/steps/arrival-step';
import { DeliveryStep } from '@/components/shipments/steps/delivery-step';
import {
  SEA_WIZARD_STEPS,
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
  // 其他发货字段...
  [key: string]: any;
}

interface SeaWizardProps {
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
 * 海运向导组件
 * 整合所有海运步骤组件，实现步骤切换和状态更新逻辑
 * 步骤：准备 → 订舱 → 报关 → 装柜 → 发运 → 到港 → 签收
 */
export function SeaWizard({
  shipment,
  onBackToOrder,
  onStatusChange,
  className,
}: SeaWizardProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const steps = SEA_WIZARD_STEPS;
  
  // 当前活动步骤索引（基于发货单状态）
  const activeStepIndex = getStepIndexByStatus(steps, shipment.status);
  
  // 当前查看的步骤索引（可能是历史步骤）
  const [viewingStepIndex, setViewingStepIndex] = useState(activeStepIndex);
  
  // 步骤历史记录
  const [stepHistory, setStepHistory] = useState<ShipmentStepHistory | null>(null);
  
  // 跳过确认弹窗
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  
  // 各步骤数据有效性
  const [stepValidity, setStepValidity] = useState<Record<string, boolean>>({});
  
  // 当前步骤的数据（用于保存快照）
  const [currentStepData, setCurrentStepData] = useState<Record<string, any>>({});
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(false);

  const currentStep = steps[viewingStepIndex];
  const isViewingHistory = viewingStepIndex < activeStepIndex;
  const isReadOnly = isStepReadOnly(viewingStepIndex, activeStepIndex);
  const canEdit = canEditShipmentItems(shipment.status) && !isReadOnly;

  // 加载步骤历史
  useEffect(() => {
    const loadHistory = async () => {
      const history = await getStepHistory(shipment.id);
      setStepHistory(history);
    };
    loadHistory();
  }, [shipment.id]);

  // 更新发货状态
  const updateStatus = async (newStatus: ShipmentStatus) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/shipments/${shipment.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      onStatusChange?.(newStatus);
      toast({ title: t('shipments.wizard.statusUpdated') });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ title: t('shipments.wizard.statusUpdateFailed'), variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // 上一步（查看历史）
  const handlePrevious = useCallback(() => {
    if (viewingStepIndex > 0) {
      setViewingStepIndex(viewingStepIndex - 1);
    }
  }, [viewingStepIndex]);

  // 下一步（只能在当前活动步骤操作）
  const handleNext = useCallback(async () => {
    // 只能在当前活动步骤点击下一步
    if (isViewingHistory) {
      toast({ 
        title: t('shipments.wizard.cannotAdvanceFromHistory'), 
        variant: 'destructive' 
      });
      return;
    }

    const currentStepId = currentStep.id;
    // 必须明确验证通过才能继续
    if (stepValidity[currentStepId] !== true) {
      toast({ 
        title: t('shipments.wizard.validationRequired'), 
        variant: 'destructive' 
      });
      return;
    }
    
    try {
      // 保存当前步骤快照
      const snapshot = createStepSnapshot(
        currentStepId,
        currentStep.status,
        currentStepData
      );
      await saveStepSnapshot(shipment.id, snapshot);

      // 更新步骤历史
      const updatedHistory = await getStepHistory(shipment.id);
      setStepHistory(updatedHistory);

      if (activeStepIndex < steps.length - 1) {
        // 更新状态到下一步
        const nextStep = steps[activeStepIndex + 1];
        await updateStatus(nextStep.status);
        setViewingStepIndex(activeStepIndex + 1);
      } else {
        // 最后一步，完成发货
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
  }, [isViewingHistory, activeStepIndex, steps, t, stepValidity, currentStep, currentStepData, shipment.id]);

  // 跳过当前步骤（只能在当前活动步骤操作）
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

  // 确认跳过
  const handleConfirmSkip = useCallback(async () => {
    setShowSkipDialog(false);
    
    try {
      // 保存空快照（标记为已跳过）
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

  // 点击步骤跳转（可以查看历史步骤和当前步骤）
  const handleStepClick = useCallback((index: number) => {
    if (index <= activeStepIndex) {
      setViewingStepIndex(index);
    }
  }, [activeStepIndex]);

  // 步骤数据变更（同时保存数据用于快照）
  const handleStepDataChange = useCallback((stepId: string, data: any, isValid: boolean) => {
    setStepValidity(prev => ({ ...prev, [stepId]: isValid }));
    setCurrentStepData(data);
  }, []);

  // 获取步骤数据（历史快照或当前数据）
  const getStepData = (stepId: string) => {
    if (isViewingHistory && stepHistory) {
      const snapshot = stepHistory.snapshots.find(s => s.stepId === stepId);
      return snapshot?.data || {};
    }
    // 当前步骤使用发货单的实时数据
    return {};
  };

  // 渲染当前步骤内容
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
            shippingMethod="sea"
            initialData={isViewingHistory ? stepData : {
              carrier: shipment.carrier,
              vessel_name: shipment.vessel_name,
              voyage_number: shipment.voyage_number,
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
      case 'loading':
        return (
          <LoadingStep
            shipmentId={shipment.id}
            initialData={isViewingHistory ? stepData : {
              container_number: shipment.container_number,
              container_type: shipment.container_type,
              seal_number: shipment.seal_number,
              loading_date: shipment.loading_date,
            }}
            onChange={(data, isValid) => handleStepDataChange('loading', data, isValid)}
            disabled={isReadOnly}
          />
        );
      case 'transit':
        return (
          <TransitStep
            shipmentId={shipment.id}
            shippingMethod="sea"
            shipmentInfo={{
              vessel_name: shipment.vessel_name,
              voyage_number: shipment.voyage_number,
              container_number: shipment.container_number,
              departure_port: shipment.departure_port,
              destination_port: shipment.destination_port,
            }}
            initialData={isViewingHistory ? stepData : {
              actual_departure: shipment.actual_departure,
              eta: shipment.eta,
              bl_number: shipment.bl_number,
              bl_type: shipment.bl_type,
            }}
            onChange={(data, isValid) => handleStepDataChange('transit', data, isValid)}
            disabled={isReadOnly}
          />
        );
      case 'arrival':
        return (
          <ArrivalStep
            shipmentId={shipment.id}
            shippingMethod="sea"
            shipmentInfo={{
              destination_port: shipment.destination_port,
              bl_number: shipment.bl_number,
              container_number: shipment.container_number,
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

export default SeaWizard;
