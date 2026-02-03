'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DocumentUpload, DocumentFile, DocumentStatus } from '@/components/shipments/shared/document-upload';
import { ShippingMethod } from '@/lib/shipment/wizard-config';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { CalendarIcon, Loader2, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/use-i18n';

const CLEARANCE_STATUS_KEYS = ['pending', 'clearing', 'cleared'] as const;
type ClearanceStatus = typeof CLEARANCE_STATUS_KEYS[number];

interface ArrivalData {
  actual_arrival?: string;      // 实际到港日期
  clearance_status?: ClearanceStatus; // 清关状态
  pickup_date?: string;         // 预计提货日期
  customer_notified?: boolean;  // 是否已通知客户
  notification_date?: string;   // 通知日期
  remarks?: string;             // 备注
}

interface ShipmentInfo {
  destination_port?: string;
  bl_number?: string;
  container_number?: string;
}

interface DocumentState {
  status: DocumentStatus;
  files: DocumentFile[];
}

interface ArrivalStepProps {
  /** 发货单 ID */
  shipmentId: string;
  /** 运输方式 */
  shippingMethod: ShippingMethod;
  /** 发货信息 */
  shipmentInfo?: ShipmentInfo;
  /** 初始数据 */
  initialData?: ArrivalData;
  /** 数据变更回调 */
  onChange?: (data: ArrivalData, isValid: boolean) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

interface DocumentState {
  status: DocumentStatus;
  files: DocumentFile[];
}

/**
 * 到港步骤组件
 * 实际到港日期、清关状态、客户通知、退税联上传
 */
export function ArrivalStep({
  shipmentId,
  shippingMethod,
  shipmentInfo = {},
  initialData = {},
  onChange,
  disabled = false,
  className,
}: ArrivalStepProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const dateLocale = locale === 'zh' ? zhCN : enUS;
  const [data, setData] = useState<ArrivalData>({
    clearance_status: 'pending',
    ...initialData,
  });
  const [documents, setDocuments] = useState<Record<string, DocumentState>>({
    tax_refund: { status: 'pending', files: [] },
  });
  const [loading, setLoading] = useState(true);

  const isSea = shippingMethod === 'sea';
  const isAir = shippingMethod === 'air';

  // 加载单据状态
  const fetchDocuments = useCallback(async () => {
    if (!shipmentId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/shipments/${shipmentId}/documents`);
      if (!response.ok) return;
      
      const result = await response.json();
      setDocuments({
        tax_refund: result.documents.tax_refund || { status: 'pending', files: [] },
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Use ref to avoid infinite loop with initialData dependency
  const initializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const initData = { clearance_status: 'pending' as ClearanceStatus, ...initialData };
      setData(initData);
      // Initial validation
      const isValid = !!initData.actual_arrival;
      onChangeRef.current?.(initData, isValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 验证数据
  const validateData = useCallback((d: ArrivalData): boolean => {
    return !!d.actual_arrival;
  }, []);

  // 处理字段变更
  const handleChange = (field: keyof ArrivalData, value: string | boolean) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onChangeRef.current?.(newData, validateData(newData));
  };

  // 处理日期变更
  const handleDateChange = (field: 'actual_arrival' | 'pickup_date', date: Date | undefined) => {
    const value = date ? format(date, 'yyyy-MM-dd') : undefined;
    const newData = { ...data, [field]: value };
    setData(newData);
    onChangeRef.current?.(newData, validateData(newData));
  };

  // 上传单据
  const handleUpload = async (docType: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);

    const response = await fetch(`/api/shipments/${shipmentId}/documents`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    toast({ title: t('shipments.wizard.arrival.uploadSuccess') });
    await fetchDocuments();
  };

  // 标记不适用
  const handleMarkNA = async (docType: string) => {
    const response = await fetch(`/api/shipments/${shipmentId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType, action: 'mark_na' }),
    });

    if (!response.ok) throw new Error('Failed to mark as not applicable');

    toast({ title: t('shipments.wizard.arrival.markedNA') });
    await fetchDocuments();
  };

  // 重置状态
  const handleReset = async (docType: string) => {
    const response = await fetch(`/api/shipments/${shipmentId}/documents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType }),
    });

    if (!response.ok) throw new Error('Failed to reset status');

    toast({ title: t('shipments.wizard.arrival.statusReset') });
    await fetchDocuments();
  };

  // 删除文件
  const handleDelete = async (filePath: string) => {
    if (!confirm(t('shipments.wizard.arrival.deleteConfirm'))) return;

    const response = await fetch(`/api/disk/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath }),
    });

    if (!response.ok) throw new Error('Delete failed');

    toast({ title: t('shipments.wizard.arrival.fileDeleted') });
    await fetchDocuments();
  };

  // 发送到港通知
  const handleSendNotification = async () => {
    // TODO: 实现发送邮件通知
    toast({ title: t('shipments.wizard.arrival.notificationSent') });
    handleChange('customer_notified', true);
    handleChange('notification_date', format(new Date(), 'yyyy-MM-dd'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* 到港信息表单 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">{t('shipments.wizard.arrival.title')}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* 实际到港日期 */}
          <div className="space-y-2">
            <Label>
              {isSea ? t('shipments.wizard.arrival.actualArrivalSea') : t('shipments.wizard.arrival.actualArrivalAir')} <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !data.actual_arrival && 'text-muted-foreground'
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.actual_arrival ? format(new Date(data.actual_arrival), 'yyyy-MM-dd') : t('shipments.wizard.transit.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={data.actual_arrival ? new Date(data.actual_arrival) : undefined}
                  onSelect={(date) => handleDateChange('actual_arrival', date)}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 目的港（只读） */}
          <div className="space-y-2">
            <Label>{isSea ? t('shipments.wizard.arrival.destinationPort') : t('shipments.wizard.arrival.destinationAirport')}</Label>
            <Input
              value={shipmentInfo.destination_port || '-'}
              disabled
            />
          </div>

          {/* 预计提货日期 */}
          <div className="space-y-2">
            <Label>{t('shipments.wizard.arrival.pickupDate')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !data.pickup_date && 'text-muted-foreground'
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.pickup_date ? format(new Date(data.pickup_date), 'yyyy-MM-dd') : t('shipments.wizard.transit.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={data.pickup_date ? new Date(data.pickup_date) : undefined}
                  onSelect={(date) => handleDateChange('pickup_date', date)}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* 清关状态 */}
        <div className="mt-4 space-y-2">
          <Label>{t('shipments.wizard.arrival.clearanceStatus')}</Label>
          <RadioGroup
            value={data.clearance_status || 'pending'}
            onValueChange={(value) => handleChange('clearance_status', value)}
            className="flex gap-4"
            disabled={disabled}
          >
            {CLEARANCE_STATUS_KEYS.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <RadioGroupItem value={status} id={`clearance-${status}`} />
                <Label htmlFor={`clearance-${status}`} className="font-normal cursor-pointer">
                  {t(`shipments.wizard.arrival.clearance${status.charAt(0).toUpperCase() + status.slice(1)}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* 备注 */}
        <div className="mt-4 space-y-2">
          <Label>{t('shipments.wizard.arrival.remarks')}</Label>
          <Textarea
            placeholder={t('shipments.wizard.arrival.remarksPlaceholder')}
            value={data.remarks || ''}
            onChange={(e) => handleChange('remarks', e.target.value)}
            disabled={disabled}
            rows={2}
          />
        </div>
      </div>

      {/* 客户通知 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-3">{t('shipments.wizard.arrival.customerNotification')}</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="customer-notified"
              checked={data.customer_notified || false}
              onCheckedChange={(checked) => handleChange('customer_notified', !!checked)}
              disabled={disabled}
            />
            <Label htmlFor="customer-notified" className="font-normal cursor-pointer">
              {t('shipments.wizard.arrival.customerNotified')}
            </Label>
          </div>
          
          {data.customer_notified && data.notification_date && (
            <p className="text-sm text-muted-foreground">
              {t('shipments.wizard.arrival.notificationDate')}: {data.notification_date}
            </p>
          )}

          {!data.customer_notified && !disabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendNotification}
            >
              <Mail className="h-4 w-4 mr-2" />
              {t('shipments.wizard.arrival.sendNotification')}
            </Button>
          )}
        </div>
      </div>

      {/* 相关单据 */}
      <div>
        <h3 className="font-medium mb-3">{t('shipments.wizard.arrival.relatedDocuments')}</h3>
        <DocumentUpload
          docType="tax_refund"
          label={t('shipments.wizard.arrival.taxRefund')}
          status={documents.tax_refund.status}
          files={documents.tax_refund.files}
          onUpload={(file) => handleUpload('tax_refund', file)}
          onMarkNA={() => handleMarkNA('tax_refund')}
          onReset={() => handleReset('tax_refund')}
          onDelete={handleDelete}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
