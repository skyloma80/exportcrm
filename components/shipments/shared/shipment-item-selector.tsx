'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/use-i18n';

/**
 * 订单项（含已发数量信息）
 */
export interface OrderItemWithShipped {
  id: string;
  product: {
    id: string;
    name: string;
    code: string;
    description?: string;
  };
  quantity: number;        // 订单数量
  shippedQuantity: number; // 已发数量
  remainingQuantity: number; // 剩余可发数量
}

/**
 * 选中的发货项
 */
export interface SelectedShipmentItem {
  orderItemId: string;
  quantity: number;
}

interface ShipmentItemSelectorProps {
  /** 订单项列表（含已发数量） */
  orderItems: OrderItemWithShipped[];
  /** 已选中的发货项（编辑模式） */
  initialItems?: SelectedShipmentItem[];
  /** 选择变更回调 */
  onChange: (items: SelectedShipmentItem[]) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 单个订单项行组件
 */
interface ItemRowProps {
  orderItem: OrderItemWithShipped;
  selectedItem?: SelectedShipmentItem;
  onSelect: (selected: boolean) => void;
  onChange: (item: SelectedShipmentItem) => void;
  disabled?: boolean;
  t: (key: string, params?: Record<string, string>) => string;
}

function ItemRow({
  orderItem,
  selectedItem,
  onSelect,
  onChange,
  disabled,
  t,
}: ItemRowProps) {
  const isSelected = !!selectedItem;
  
  // 数量验证
  const quantityError = useMemo(() => {
    if (!selectedItem) return null;
    if (selectedItem.quantity > orderItem.remainingQuantity) {
      return t('shipments.wizard.itemSelector.quantityExceeds', { 
        qty: String(selectedItem.quantity), 
        remaining: String(orderItem.remainingQuantity) 
      });
    }
    if (selectedItem.quantity <= 0) {
      return t('shipments.wizard.itemSelector.quantityRequired');
    }
    return null;
  }, [selectedItem, orderItem.remainingQuantity, t]);

  const handleQuantityChange = (value: string) => {
    const num = parseInt(value) || 0;
    onChange({
      ...selectedItem!,
      quantity: num,
    });
  };

  return (
    <div
      className={cn(
        'border rounded-lg transition-colors',
        isSelected && 'border-primary bg-primary/5',
        quantityError && 'border-destructive bg-destructive/5'
      )}
    >
      {/* 主行 */}
      <div className="p-3 flex items-center gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => {
            onSelect(!!checked);
          }}
          disabled={disabled || orderItem.remainingQuantity <= 0}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{orderItem.product.name}</span>
            <span className="text-xs text-muted-foreground">
              {orderItem.product.code}
            </span>
          </div>
          {orderItem.product.description && (
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {orderItem.product.description}
            </div>
          )}
          <div className="text-sm text-muted-foreground mt-0.5">
            {t('shipments.wizard.itemSelector.orderQty')}: {orderItem.quantity} | {t('shipments.wizard.itemSelector.shippedQty')}: {orderItem.shippedQuantity} | 
            <span className={cn(
              'ml-1',
              orderItem.remainingQuantity > 0 ? 'text-green-600' : 'text-gray-400'
            )}>
              {t('shipments.wizard.itemSelector.remainingQty')}: {orderItem.remainingQuantity}
            </span>
          </div>
        </div>

        {isSelected && (
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">{t('shipments.wizard.itemSelector.thisShipment')}</Label>
            <Input
              type="number"
              className={cn('w-20 h-8', quantityError && 'border-destructive')}
              value={selectedItem.quantity || ''}
              onChange={(e) => handleQuantityChange(e.target.value)}
              min={1}
              max={orderItem.remainingQuantity}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {quantityError && (
        <div className="px-3 pb-2 flex items-center gap-1 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {quantityError}
        </div>
      )}
    </div>
  );
}

/**
 * 发货明细选择器组件
 * 显示订单产品列表，支持勾选产品和输入发货数量
 */
export function ShipmentItemSelector({
  orderItems,
  initialItems = [],
  onChange,
  disabled = false,
  className,
}: ShipmentItemSelectorProps) {
  const { t } = useI18n();
  // 内部状态：选中的项目
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedShipmentItem>>(
    () => new Map(initialItems.map(item => [item.orderItemId, item]))
  );
  
  // Track if we're in the middle of an internal update to prevent sync loop
  const isInternalUpdate = useRef(false);
  // Track previous initialItems to detect external changes
  const prevInitialItemsRef = useRef<string>('');
  // Track if component has been initialized
  const initializedRef = useRef(false);
  // Store onChange in ref to avoid dependency issues
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 同步初始值变化 - only when initialItems actually changes from external source
  useEffect(() => {
    // Create a stable key from initialItems
    const initialItemsKey = JSON.stringify(
      initialItems.map(i => ({ id: i.orderItemId, qty: i.quantity }))
    );
    
    // Skip if this is triggered by our own onChange or if items haven't changed
    if (isInternalUpdate.current || initialItemsKey === prevInitialItemsRef.current) {
      isInternalUpdate.current = false;
      return;
    }
    
    prevInitialItemsRef.current = initialItemsKey;
    initializedRef.current = true;
    setSelectedItems(new Map(initialItems.map(item => [item.orderItemId, item])));
  }, [initialItems]);

  // 通知父组件变化 - 使用 useEffect 避免渲染期间调用 setState
  useEffect(() => {
    // Skip initial render notification
    if (!initializedRef.current) return;
    
    isInternalUpdate.current = true;
    onChangeRef.current(Array.from(selectedItems.values()));
  }, [selectedItems]);

  // 处理选择/取消选择
  const handleSelect = (orderItemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      if (selected) {
        const orderItem = orderItems.find(i => i.id === orderItemId);
        if (orderItem) {
          next.set(orderItemId, {
            orderItemId,
            quantity: Math.min(orderItem.remainingQuantity, orderItem.remainingQuantity),
          });
        }
      } else {
        next.delete(orderItemId);
      }
      return next;
    });
  };

  // 处理项目变更
  const handleItemChange = (item: SelectedShipmentItem) => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      next.set(item.orderItemId, item);
      return next;
    });
  };

  // 计算汇总
  const summary = useMemo(() => {
    let totalQuantity = 0;

    selectedItems.forEach(item => {
      totalQuantity += item.quantity || 0;
    });

    return {
      count: selectedItems.size,
      totalQuantity,
    };
  }, [selectedItems]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* 产品列表 */}
      <div className="space-y-2">
        {orderItems.map(orderItem => (
          <ItemRow
            key={orderItem.id}
            orderItem={orderItem}
            selectedItem={selectedItems.get(orderItem.id)}
            onSelect={(selected) => handleSelect(orderItem.id, selected)}
            onChange={handleItemChange}
            disabled={disabled}
            t={t}
          />
        ))}
      </div>

      {/* 选择统计 */}
      {selectedItems.size > 0 && (
        <div className="text-sm text-muted-foreground">
          {t('shipments.wizard.itemSelector.selected')}: {summary.count} {t('shipments.wizard.itemSelector.products')}，{t('shipments.wizard.itemSelector.totalQty')} {summary.totalQuantity} {t('shipments.wizard.itemSelector.pcs')}
        </div>
      )}

      {/* 空状态 */}
      {orderItems.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t('shipments.wizard.itemSelector.noProducts')}
        </div>
      )}
    </div>
  );
}
