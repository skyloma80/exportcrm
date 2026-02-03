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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/use-i18n';

const DELIVERY_METHOD_KEYS = ['self_pickup', 'delivery', 'third_party'] as const;
type DeliveryMethod = typeof DELIVERY_METHOD_KEYS[number];

const DAMAGE_TYPE_KEYS = ['damage', 'shortage', 'other'] as const;
type DamageType = typeof DAMAGE_TYPE_KEYS[number];

interface DamageRecord {
  type: DamageType;
  quantity: number;
  description: string;
}

interface DeliveryData {
  delivery_date?: string;       // 签收日期
  receiver_name?: string;       // 签收人
  delivery_method?: DeliveryMethod; // 签收方式
  confirmed?: boolean;          // 确认签收
  quantity_matched?: boolean;   // 数量一致
  has_damage?: boolean;         // 是否有货损/货差
  damage_record?: DamageRecord; // 货损/货差记录
  remarks?: string;             // 备注
}

interface DocumentState {
  status: DocumentStatus;
  files: DocumentFile[];
}

interface DeliveryStepProps {
  /** 发货单 ID */
  shipmentId: string;
  /** 初始数据 */
  initialData?: DeliveryData;
  /** 数据变更回调 */
  onChange?: (data: DeliveryData, isValid: boolean) => void;
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
 * 签收步骤组件
 * 签收日期、签收人、签收方式、货损/货差记录、签收凭证上传
 */
export function DeliveryStep({
  shipmentId,
  initialData = {},
  onChange,
  disabled = false,
  className,
}: DeliveryStepProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const dateLocale = locale === 'zh' ? zhCN : enUS;
  const [data, setData] = useState<DeliveryData>({
    delivery_method: 'delivery',
    quantity_matched: true,
    ...initialData,
  });
  const [documents, setDocuments] = useState<Record<string, DocumentState>>({
    pod: { status: 'pending', files: [] },
  });
  const [loading, setLoading] = useState(true);

  // 加载单据状态
  const fetchDocuments = useCallback(async () => {
    if (!shipmentId) return;
    
    try {
      setLoading(true);
      // 加载签收单状态
      console.log('Fetching documents for shipment:', shipmentId);
      const response = await fetch(`/api/shipments/${shipmentId}/documents`);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      
      const data = await response.json();
      console.log('Received documents:', data);
      
      // API 返回的数据格式是 { documents: { pod: {...}, CI: {...}, ... } }
      if (data.documents) {
        const newDocuments: Record<string, DocumentState> = {};
        
        // 直接使用 API 返回的 documents 对象
        Object.entries(data.documents).forEach(([docType, docData]: [string, any]) => {
          newDocuments[docType] = {
            status: docData.status || 'pending',
            files: docData.files || [],
          };
        });
        
        console.log('Updated documents state:', newDocuments);
        setDocuments(newDocuments);
      }
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
      const initData = {
        delivery_method: 'delivery' as DeliveryMethod,
        quantity_matched: true,
        ...initialData,
      };
      setData(initData);
      // Initial validation
      const isValid = !!(initData.delivery_date && initData.confirmed);
      onChangeRef.current?.(initData, isValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 验证数据
  const validateData = useCallback((d: DeliveryData): boolean => {
    return !!(d.delivery_date && d.confirmed);
  }, []);

  // 处理字段变更
  const handleChange = (field: keyof DeliveryData, value: any) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onChangeRef.current?.(newData, validateData(newData));
  };

  // 处理日期变更
  const handleDateChange = (date: Date | undefined) => {
    const value = date ? format(date, 'yyyy-MM-dd') : undefined;
    const newData = { ...data, delivery_date: value };
    setData(newData);
    onChangeRef.current?.(newData, validateData(newData));
  };

  // 处理货损记录变更
  const handleDamageChange = (field: keyof DamageRecord, value: any) => {
    const newDamageRecord = {
      type: 'damage' as DamageType,
      quantity: 0,
      description: '',
      ...data.damage_record,
      [field]: value,
    };
    handleChange('damage_record', newDamageRecord);
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

    toast({ title: t('shipments.wizard.delivery.uploadSuccess') });
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

    toast({ title: t('shipments.wizard.delivery.markedNA') });
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

    toast({ title: t('shipments.wizard.delivery.statusReset') });
    await fetchDocuments();
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
      {/* 签收信息表单 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">{t('shipments.wizard.delivery.title')}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {/* 签收日期 */}
          <div className="space-y-2">
            <Label>{t('shipments.wizard.delivery.deliveryDate')} <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !data.delivery_date && 'text-muted-foreground'
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.delivery_date ? format(new Date(data.delivery_date), 'yyyy-MM-dd') : t('shipments.wizard.transit.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={data.delivery_date ? new Date(data.delivery_date) : undefined}
                  onSelect={handleDateChange}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 签收人 */}
          <div className="space-y-2">
            <Label>{t('shipments.wizard.delivery.receiverName')}</Label>
            <Input
              placeholder={t('shipments.wizard.delivery.receiverNamePlaceholder')}
              value={data.receiver_name || ''}
              onChange={(e) => handleChange('receiver_name', e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        {/* 签收方式 */}
        <div className="mt-4 space-y-2">
          <Label>{t('shipments.wizard.delivery.deliveryMethod')}</Label>
          <RadioGroup
            value={data.delivery_method || 'delivery'}
            onValueChange={(value) => handleChange('delivery_method', value)}
            className="flex gap-4"
            disabled={disabled}
          >
            {DELIVERY_METHOD_KEYS.map((method) => (
              <div key={method} className="flex items-center space-x-2">
                <RadioGroupItem value={method} id={`delivery-${method}`} />
                <Label htmlFor={`delivery-${method}`} className="font-normal cursor-pointer">
                  {t(`shipments.wizard.delivery.${method === 'self_pickup' ? 'selfPickup' : method === 'delivery' ? 'doorDelivery' : 'thirdParty'}`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* 备注 */}
        <div className="mt-4 space-y-2">
          <Label>{t('shipments.wizard.delivery.remarks')}</Label>
          <Textarea
            placeholder={t('shipments.wizard.delivery.remarksPlaceholder')}
            value={data.remarks || ''}
            onChange={(e) => handleChange('remarks', e.target.value)}
            disabled={disabled}
            rows={2}
          />
        </div>
      </div>

      {/* 签收确认 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-3">{t('shipments.wizard.delivery.confirmation')}</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="confirmed"
              checked={data.confirmed || false}
              onCheckedChange={(checked) => handleChange('confirmed', !!checked)}
              disabled={disabled}
            />
            <Label htmlFor="confirmed" className="font-normal cursor-pointer">
              {t('shipments.wizard.delivery.confirmed')}
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="quantity-matched"
              checked={data.quantity_matched || false}
              onCheckedChange={(checked) => handleChange('quantity_matched', !!checked)}
              disabled={disabled}
            />
            <Label htmlFor="quantity-matched" className="font-normal cursor-pointer">
              {t('shipments.wizard.delivery.quantityMatched')}
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="has-damage"
              checked={data.has_damage || false}
              onCheckedChange={(checked) => handleChange('has_damage', !!checked)}
              disabled={disabled}
            />
            <Label htmlFor="has-damage" className="font-normal cursor-pointer">
              {t('shipments.wizard.delivery.hasDamage')}
            </Label>
          </div>
        </div>

        {/* 货损/货差详情 */}
        {data.has_damage && (
          <div className="mt-4 border rounded-lg p-3 bg-amber-50">
            <h4 className="text-sm font-medium mb-3">{t('shipments.wizard.delivery.damageDetails')}</h4>
            <div className="space-y-3">
              {/* 类型 */}
              <div className="space-y-2">
                <Label className="text-sm">{t('shipments.wizard.delivery.damageType')}</Label>
                <RadioGroup
                  value={data.damage_record?.type || 'damage'}
                  onValueChange={(value) => handleDamageChange('type', value)}
                  className="flex gap-4"
                  disabled={disabled}
                >
                  {DAMAGE_TYPE_KEYS.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <RadioGroupItem value={type} id={`damage-${type}`} />
                      <Label htmlFor={`damage-${type}`} className="font-normal cursor-pointer text-sm">
                        {t(`shipments.wizard.delivery.damageType${type.charAt(0).toUpperCase() + type.slice(1)}`)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* 数量 */}
              <div className="space-y-2">
                <Label className="text-sm">{t('shipments.wizard.delivery.damageQuantity')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    className="w-24"
                    value={data.damage_record?.quantity || ''}
                    onChange={(e) => handleDamageChange('quantity', parseInt(e.target.value) || 0)}
                    disabled={disabled}
                  />
                  <span className="text-sm text-muted-foreground">{t('shipments.wizard.delivery.damageQuantityUnit')}</span>
                </div>
              </div>

              {/* 描述 */}
              <div className="space-y-2">
                <Label className="text-sm">{t('shipments.wizard.delivery.damageDescription')}</Label>
                <Textarea
                  placeholder={t('shipments.wizard.delivery.damageDescriptionPlaceholder')}
                  value={data.damage_record?.description || ''}
                  onChange={(e) => handleDamageChange('description', e.target.value)}
                  disabled={disabled}
                  rows={2}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 签收凭证 */}
      <div>
        <h3 className="font-medium mb-3">{t('shipments.wizard.delivery.receipt')}</h3>
        <DocumentUpload
          docType="pod"
          label={t('shipments.wizard.delivery.pod')}
          status={documents.pod.status}
          files={documents.pod.files}
          onUpload={(file) => handleUpload('pod', file)}
          onMarkNA={() => handleMarkNA('pod')}
          onReset={() => handleReset('pod')}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
