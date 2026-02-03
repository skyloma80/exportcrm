'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { WizardStep } from '@/lib/shipment/wizard-config';
import { useI18n } from '@/lib/i18n/use-i18n';

interface StepProgressProps {
  steps: WizardStep[];
  currentIndex: number;
  /** 当前活动步骤索引（基于发货单状态，用于区分查看历史） */
  activeIndex?: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function StepProgress({
  steps,
  currentIndex,
  activeIndex,
  onStepClick,
  className,
}: StepProgressProps) {
  const { t } = useI18n();
  const actualActiveIndex = activeIndex ?? currentIndex;

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop horizontal layout */}
      <div className="hidden md:flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < actualActiveIndex;
          const isCurrent = index === currentIndex;
          const isActive = index === actualActiveIndex;
          const isClickable = index <= actualActiveIndex && onStepClick;

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div
                className={cn(
                  'flex flex-col items-center',
                  isClickable && 'cursor-pointer hover:opacity-80'
                )}
                onClick={() => isClickable && onStepClick(index)}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                    isCompleted && 'bg-green-500 text-white',
                    isActive && !isCurrent && 'bg-blue-500 text-white ring-4 ring-blue-100',
                    isCurrent && isActive && 'bg-blue-500 text-white ring-4 ring-blue-100',
                    isCurrent && !isActive && 'bg-amber-500 text-white ring-4 ring-amber-100',
                    !isCompleted && !isCurrent && !isActive && 'bg-gray-200 text-gray-500'
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium whitespace-nowrap',
                    isCompleted && 'text-green-600',
                    isActive && 'text-blue-600',
                    isCurrent && !isActive && 'text-amber-600',
                    !isCompleted && !isCurrent && !isActive && 'text-gray-400'
                  )}
                >
                  {t(`shipments.wizard.steps.${step.id}`)}
                </span>
                {isActive && isCurrent && (
                  <span className="text-[10px] text-blue-500">
                    {t('shipments.wizard.current')}
                  </span>
                )}
                {isCurrent && !isActive && (
                  <span className="text-[10px] text-amber-500">
                    {t('shipments.wizard.viewing')}
                  </span>
                )}
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2',
                    index < actualActiveIndex ? 'bg-green-500' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile vertical layout */}
      <div className="md:hidden space-y-0">
        {steps.map((step, index) => {
          const isCompleted = index < actualActiveIndex;
          const isCurrent = index === currentIndex;
          const isActive = index === actualActiveIndex;
          const isClickable = index <= actualActiveIndex && onStepClick;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex">
              <div className="flex flex-col items-center mr-3">
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                    isCompleted && 'bg-green-500 text-white',
                    isActive && 'bg-blue-500 text-white',
                    isCurrent && !isActive && 'bg-amber-500 text-white',
                    !isCompleted && !isCurrent && !isActive && 'bg-gray-200 text-gray-500'
                  )}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : index + 1}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      'w-0.5 flex-1 min-h-[24px]',
                      index < actualActiveIndex ? 'bg-green-500' : 'bg-gray-200'
                    )}
                  />
                )}
              </div>

              <div
                className={cn(
                  'pb-4 flex-1',
                  isClickable && 'cursor-pointer hover:opacity-80'
                )}
                onClick={() => isClickable && onStepClick(index)}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isCompleted && 'text-green-600',
                      isActive && 'text-blue-600',
                      isCurrent && !isActive && 'text-amber-600',
                      !isCompleted && !isCurrent && !isActive && 'text-gray-400'
                    )}
                  >
                    {t(`shipments.wizard.steps.${step.id}`)}
                  </span>
                  {isActive && isCurrent && (
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                      {t('shipments.wizard.current')}
                    </span>
                  )}
                  {isCurrent && !isActive && (
                    <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">
                      {t('shipments.wizard.viewing')}
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-[10px] text-green-500">✓</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
