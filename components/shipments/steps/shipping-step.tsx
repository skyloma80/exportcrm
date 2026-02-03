'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DocumentUpload, DocumentFile, DocumentStatus } from '@/components/shipments/shared/document-upload';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { CalendarIcon, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/use-i18n';

interface ShippingData {
  carrier?: string;           // 物流公司
  tracking_number?: string;   // 运单号
  shipping_date?: string;     // 发货日期
  receiver_name?: string;     // 收货人
  receiver_phone?: string;    // 收货电话
  receiver_address?: string;  // 收货地址
  remarks?: string;           // 备注
}

interface ShipmentSummary {
  totalPackages: number;
  totalWeight: number;
}

interface DocumentState {
  status: DocumentStatus;
  files: DocumentFile[];
}

interface ShippingStepProps {
  /** 发货单 ID */
  shipmentId: string;
  /** 货物汇总信息 */
  summary?: ShipmentSummary;
  /** 初始数据 */
  initialData?: ShippingData;
  /** 数据变更回调 */
  onChange?: (data: ShippingData, isValid: boolean) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

// 常用物流公司 keys
const CARRIER_KEYS = ['sf', 'deppon', 'jd', 'zto', 'yto', 'yunda', 'sto', 'other'] as const;

/**
 * 发货步骤组件（陆运专用）
 * 物流公司、运单号、发货日期、收货人信息
 */
export function ShippingStep({
  shipmentId,
  summary = { totalPackages: 0, totalWeight: 0 },
  initialData = {},
  onChange,
  disabled = false,
  className,
}: ShippingStepProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const dateLocale = locale === 'zh' ? zhCN : enUS;
  const [data, setData] = useState<ShippingData>(initialData);
  const [customCarrier, setCustomCarrier] = useState('');
  const [documents, setDocuments] = useState<Record<string, DocumentState>>({
    transport_docs: { status: 'pending', files: [] },
  });
  const [loading, setLoading] = useState(true);

  // 加载单据状态
  const fetchDocuments = useCallback(async () => {
    if (!shipmentId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/shipments/${shipmentId}/documents`);
      if (!response.ok) return;
      
      const result = await response.json();
      setDocuments({
        transport_docs: result.documents.transport_docs || { status: 'pending', files: [] },
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

  // 同步初始数据
  useEffect(() => {
    setData(initialData);
    // 检查是否是自定义物流公司
    const knownCarriers = CARRIER_KEYS.filter(k => k !== 'other').map(k => t(`shipments.wizard.shipping.carriers.${k}`));
    if (initialData.carrier && !knownCarriers.includes(initialData.carrier)) {
      setCustomCarrier(initialData.carrier);
    }
  }, [initialData, t]);

  // 验证数据
  const validateData = useCallback((d: ShippingData): boolean => {
    // 物流公司、运单号、发货日期为必填
    return !!(d.carrier && d.tracking_number && d.shipping_date);
  }, []);

  // 处理字段变更
  const handleChange = (field: keyof ShippingData, value: string) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onChange?.(newData, validateData(newData));
  };

  // 处理物流公司选择
  const handleCarrierChange = (value: string) => {
    if (value === 'other') {
      // 选择"其他"时，使用自定义输入
      handleChange('carrier', customCarrier);
    } else {
      const label = t(`shipments.wizard.shipping.carriers.${value}`);
      handleChange('carrier', label);
    }
  };

  // 处理日期变更
  const handleDateChange = (date: Date | undefined) => {
    const value = date ? format(date, 'yyyy-MM-dd') : undefined;
    const newData = { ...data, shipping_date: value };
    setData(newData);
    onChange?.(newData, validateData(newData));
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

    toast({ title: t('shipments.wizard.shipping.uploadSuccess') });
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

    toast({ title: t('shipments.wizard.transit.markedNA') });
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

    toast({ title: t('shipments.wizard.transit.statusReset') });
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

    toast({ title: t('shipments.wizard.transit.fileDeleted') });
    await fetchDocuments();
  };

  // 获取当前选中的物流公司值
  const getCarrierSelectValue = () => {
    // Check if carrier matches any known carrier label
    for (const key of CARRIER_KEYS) {
      if (data.carrier === t(`shipments.wizard.shipping.carriers.${key}`)) {
        return key;
      }
    }
    return data.carrier ? 'other' : '';
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
      {/* 物流信息表单 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">{t('shipments.wizard.shipping.title')}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* 物流公司 */}
          <div className="space-y-2">
            <Label>{t('shipments.wizard.shipping.carrier')} <span className="text-destructive">*</span></Label>
            <Select
              value={getCarrierSelectValue()}
              onValueChange={handleCarrierChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('shipments.wizard.shipping.carrierPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {CARRIER_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`shipments.wizard.shipping.carriers.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getCarrierSelectValue() === 'other' && (
              <Input
                placeholder={t('shipments.wizard.shipping.carrierOther')}
                value={customCarrier}
                onChange={(e) => {
                  setCustomCarrier(e.target.value);
                  handleChange('carrier', e.target.value);
                }}
                disabled={disabled}
                className="mt-2"
              />
            )}
          </div>

          {/* 运单号 */}
          <div className="space-y-2">
            <Label>{t('shipments.wizard.shipping.trackingNumber')} <span className="text-destructive">*</span></Label>
            <Input
              placeholder={t('shipments.wizard.shipping.trackingNumberPlaceholder')}
              value={data.tracking_number || ''}
              onChange={(e) => handleChange('tracking_number', e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* 发货日期 */}
          <div className="space-y-2">
            <Label>{t('shipments.wizard.shipping.shippingDate')} <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !data.shipping_date && 'text-muted-foreground'
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.shipping_date ? format(new Date(data.shipping_date), 'yyyy-MM-dd') : t('shipments.wizard.booking.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={data.shipping_date ? new Date(data.shipping_date) : undefined}
                  onSelect={handleDateChange}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 收货人 */}
          <div className="space-y-2">
            <Label>{t('shipments.wizard.shipping.receiverName')}</Label>
            <Input
              placeholder={t('shipments.wizard.shipping.receiverNamePlaceholder')}
              value={data.receiver_name || ''}
              onChange={(e) => handleChange('receiver_name', e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* 收货电话 */}
          <div className="space-y-2">
            <Label>{t('shipments.wizard.shipping.receiverPhone')}</Label>
            <Input
              placeholder={t('shipments.wizard.shipping.receiverPhonePlaceholder')}
              value={data.receiver_phone || ''}
              onChange={(e) => handleChange('receiver_phone', e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* 收货地址 */}
          <div className="space-y-2 md:col-span-2">
            <Label>{t('shipments.wizard.shipping.receiverAddress')}</Label>
            <Textarea
              placeholder={t('shipments.wizard.shipping.receiverAddressPlaceholder')}
              value={data.receiver_address || ''}
              onChange={(e) => handleChange('receiver_address', e.target.value)}
              disabled={disabled}
              rows={2}
            />
          </div>

          {/* 备注 */}
          <div className="space-y-2 md:col-span-2">
            <Label>{t('shipments.wizard.shipping.remarks')}</Label>
            <Textarea
              placeholder={t('shipments.wizard.shipping.remarksPlaceholder')}
              value={data.remarks || ''}
              onChange={(e) => handleChange('remarks', e.target.value)}
              disabled={disabled}
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* 货物信息 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-3">{t('shipments.wizard.shipping.cargoInfo')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-muted-foreground">{t('shipments.wizard.shipping.totalPackages')}:</span>
            <span className="ml-2 font-medium">{summary.totalPackages} {t('shipments.wizard.itemSelector.pcs')}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">{t('shipments.wizard.shipping.totalWeight')}:</span>
            <span className="ml-2 font-medium">{summary.totalWeight} kg</span>
          </div>
        </div>
      </div>

      {/* 发货凭证 */}
      <div>
        <h3 className="font-medium mb-3">{t('shipments.wizard.shipping.receipt')}</h3>
        <DocumentUpload
          docType="transport_docs"
          label={t('shipments.wizard.shipping.transportDocs')}
          status={documents.transport_docs.status}
          files={documents.transport_docs.files}
          onUpload={(file) => handleUpload('transport_docs', file)}
          onMarkNA={() => handleMarkNA('transport_docs')}
          onReset={() => handleReset('transport_docs')}
          onDelete={handleDelete}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
