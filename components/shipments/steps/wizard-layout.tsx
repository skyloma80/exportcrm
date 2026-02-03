'use client';

import { Button } from '@/components/ui/button';
import { StepProgress } from '@/components/shipments/shared/step-progress';
import { WizardStep } from '@/lib/shipment/wizard-config';
import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/use-i18n';

interface WizardLayoutProps {
  shipmentNo?: string;
  steps: WizardStep[];
  currentStepIndex: number;
  /** 当前活动步骤索引（基于发货单状态） */
  activeStepIndex?: number;
  /** 是否正在查看历史步骤 */
  isViewingHistory?: boolean;
  children: React.ReactNode;
  onPrevious: () => void;
  onNext: () => void;
  onSkip?: () => void;
  onBackToOrder?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  showSkip?: boolean;
  isLoading?: boolean;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function WizardLayout({
  shipmentNo,
  steps,
  currentStepIndex,
  activeStepIndex,
  isViewingHistory = false,
  children,
  onPrevious,
  onNext,
  onSkip,
  onBackToOrder,
  canGoNext = true,
  canGoPrevious = true,
  showSkip = true,
  isLoading = false,
  onStepClick,
  className,
}: WizardLayoutProps) {
  const { t } = useI18n();
  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1];
  const prevStep = steps[currentStepIndex - 1];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div className={cn('space-y-6', className)}>
      {(shipmentNo || onBackToOrder) && (
        <div className="flex items-center justify-between">
          {shipmentNo && (
            <h1 className="text-lg font-semibold">
              {t('shipments.wizard.layout.shipment')} {shipmentNo}
            </h1>
          )}
          {onBackToOrder && (
            <Button variant="outline" size="sm" onClick={onBackToOrder}>
              {t('shipments.wizard.layout.backToOrder')}
            </Button>
          )}
        </div>
      )}

      <StepProgress
        steps={steps}
        currentIndex={currentStepIndex}
        activeIndex={activeStepIndex}
        onStepClick={onStepClick}
      />

      <div className="border-b pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">
            {t('shipments.wizard.layout.step', { step: String(currentStepIndex + 1) })}: {t(`shipments.wizard.steps.${currentStep.id}`)}
          </h2>
          {isViewingHistory && (
            <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded">
              {t('shipments.wizard.layout.viewingHistory')}
            </span>
          )}
        </div>
        <p className="text-muted-foreground mt-1">{currentStep.description}</p>
        {isViewingHistory && (
          <p className="text-sm text-amber-600 mt-2">
            {t('shipments.wizard.layout.historyWarning')}
          </p>
        )}
      </div>

      <div className="min-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="mt-2 text-muted-foreground">{t('shipments.wizard.layout.loading')}</p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <div>
          {isFirstStep ? (
            onBackToOrder && (
              <Button variant="outline" onClick={onBackToOrder}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                {t('shipments.wizard.layout.backToOrder')}
              </Button>
            )
          ) : (
            <Button
              variant="outline"
              onClick={onPrevious}
              disabled={!canGoPrevious || isLoading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('shipments.wizard.layout.prevStep')}: {t(`shipments.wizard.steps.${prevStep?.id}`)}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showSkip && !isLastStep && onSkip && (
            <Button
              variant="ghost"
              onClick={onSkip}
              disabled={isLoading}
            >
              <SkipForward className="w-4 h-4 mr-1" />
              {t('shipments.wizard.layout.skip')}
            </Button>
          )}
          <Button
            onClick={onNext}
            disabled={!canGoNext || isLoading}
          >
            {isLastStep ? (
              t('shipments.wizard.layout.complete')
            ) : (
              <>
                {t('shipments.wizard.layout.nextStep')}: {t(`shipments.wizard.steps.${nextStep?.id}`)}
                <ChevronRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
