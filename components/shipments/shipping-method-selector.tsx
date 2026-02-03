'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ShippingMethod, getWizardSteps } from '@/lib/shipment/wizard-config';
import { cn } from '@/lib/utils';
import { Ship, Plane, Truck, Package, Check, ChevronRight, ArrowLeft } from 'lucide-react';
import { useI18n } from '@/lib/i18n/use-i18n';

interface ShippingMethodSelectorProps {
  /** 初始选中的运输方式 */
  initialMethod?: ShippingMethod;
  /** 选择变更回调 */
  onSelect: (method: ShippingMethod, isCrossBorder: boolean) => void;
  /** 返回回调 */
  onBack?: () => void;
  /** 是否禁用（已创建发货后不可更改） */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

interface MethodOption {
  value: ShippingMethod;
  icon: React.ReactNode;
}

const METHOD_OPTIONS: MethodOption[] = [
  { value: 'sea', icon: <Ship className="h-8 w-8" /> },
  { value: 'air', icon: <Plane className="h-8 w-8" /> },
  { value: 'land', icon: <Truck className="h-8 w-8" /> },
  { value: 'express', icon: <Package className="h-8 w-8" /> },
];

/**
 * 运输方式选择器组件
 * 显示海运、空运、陆运、快递四个选项
 * 陆运显示跨境/国内选项
 */
export function ShippingMethodSelector({
  initialMethod,
  onSelect,
  onBack,
  disabled = false,
  className,
}: ShippingMethodSelectorProps) {
  const { t } = useI18n();
  const [selectedMethod, setSelectedMethod] = useState<ShippingMethod | null>(initialMethod || null);
  const [isCrossBorder, setIsCrossBorder] = useState(true);

  const handleMethodSelect = (method: ShippingMethod) => {
    if (disabled) return;
    setSelectedMethod(method);
  };

  const handleConfirm = () => {
    if (!selectedMethod) return;
    onSelect(selectedMethod, isCrossBorder);
  };

  // 获取选中方式的流程步骤
  const steps = selectedMethod ? getWizardSteps(selectedMethod, isCrossBorder) : [];

  return (
    <div className={cn('space-y-6', className)}>
      {/* 运输方式卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {METHOD_OPTIONS.map((option) => {
          const isSelected = selectedMethod === option.value;
          
          return (
            <button
              key={option.value}
              onClick={() => handleMethodSelect(option.value)}
              disabled={disabled}
              className={cn(
                'relative p-4 rounded-lg border-2 text-left transition-all',
                'hover:border-primary/50 hover:bg-primary/5',
                isSelected && 'border-primary bg-primary/5',
                !isSelected && 'border-muted',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* 选中标记 */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}

              {/* 图标 */}
              <div className={cn(
                'mb-3',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )}>
                {option.icon}
              </div>

              {/* 标题 */}
              <h3 className={cn(
                'font-medium mb-2',
                isSelected && 'text-primary'
              )}>
                {t(`shipments.wizard.methods.${option.value}`)}
              </h3>

              {/* 描述 */}
              <p className="text-xs text-muted-foreground">
                {t(`shipments.wizard.methods.${option.value}Desc`)}
              </p>
            </button>
          );
        })}
      </div>

      {/* 陆运跨境选项 */}
      {selectedMethod === 'land' && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <p className="font-medium mb-3">{t('shipments.wizard.crossBorder')}?</p>
          <RadioGroup
            value={isCrossBorder ? 'cross_border' : 'domestic'}
            onValueChange={(value) => setIsCrossBorder(value === 'cross_border')}
            disabled={disabled}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="domestic" id="domestic" />
              <Label htmlFor="domestic" className="font-normal cursor-pointer">
                {t('shipments.wizard.domestic')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cross_border" id="cross_border" />
              <Label htmlFor="cross_border" className="font-normal cursor-pointer">
                {t('shipments.wizard.crossBorder')}
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* 流程预览 */}
      {selectedMethod && (
        <div className="border rounded-lg p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground mb-2">
            {t(`shipments.wizard.methods.${selectedMethod}`)}
            {selectedMethod === 'land' && (isCrossBorder ? ` (${t('shipments.wizard.crossBorder')})` : ` (${t('shipments.wizard.domestic')})`)}
          </p>
          <p className="text-sm">
            {steps.map((step, index) => (
              <span key={step.id}>
                {index > 0 && ' → '}
                <span className="font-medium">{t(`shipments.wizard.steps.${step.id}`)}</span>
              </span>
            ))}
          </p>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-between pt-4 border-t">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('shipments.wizard.backToOrder')}
          </Button>
        )}
        <div className="flex-1" />
        <Button
          onClick={handleConfirm}
          disabled={!selectedMethod || disabled}
        >
          {t('shipments.wizard.nextStep')}
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
