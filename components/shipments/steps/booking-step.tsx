'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DocumentUpload, DocumentFile, DocumentStatus } from '@/components/shipments/shared/document-upload';
import { ShippingMethod } from '@/lib/shipment/wizard-config';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/use-i18n';

interface BookingData {
  carrier?: string;
  vessel_name?: string;
  voyage_number?: string;
  flight_number?: string;
  etd?: string;
  eta?: string;
  departure_port?: string;
  destination_port?: string;
}

interface DocumentState {
  status: DocumentStatus;
  files: DocumentFile[];
}

interface ValidationErrors {
  carrier?: string;
  vessel_name?: string;
  voyage_number?: string;
  flight_number?: string;
  etd?: string;
}

interface BookingStepProps {
  shipmentId: string;
  shippingMethod: ShippingMethod;
  initialData?: BookingData;
  onChange?: (data: BookingData, isValid: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function BookingStep({
  shipmentId,
  shippingMethod,
  initialData = {},
  onChange,
  disabled = false,
  className,
}: BookingStepProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [data, setData] = useState<BookingData>(initialData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [documents, setDocuments] = useState<Record<string, DocumentState>>({
    PL: { status: 'pending', files: [] },
    CI: { status: 'pending', files: [] },
  });
  const [loading, setLoading] = useState(true);

  const isSea = shippingMethod === 'sea';
  const isAir = shippingMethod === 'air';
  const dateLocale = locale === 'zh' ? zhCN : enUS;
  
  // Use ref to track if initial data has been set
  const initializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const fetchDocuments = useCallback(async () => {
    if (!shipmentId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/shipments/${shipmentId}/documents`);
      if (!response.ok) return;
      
      const result = await response.json();
      setDocuments({
        PL: result.documents.PL || { status: 'pending', files: [] },
        CI: result.documents.CI || { status: 'pending', files: [] },
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

  const validateData = useCallback((d: BookingData): { isValid: boolean; errors: ValidationErrors } => {
    const newErrors: ValidationErrors = {};
    
    if (!d.carrier?.trim()) {
      newErrors.carrier = t('validation.required');
    }
    if (!d.etd) {
      newErrors.etd = t('validation.required');
    }
    if (isSea && !d.vessel_name?.trim()) {
      newErrors.vessel_name = t('validation.required');
    }
    if (isSea && !d.voyage_number?.trim()) {
      newErrors.voyage_number = t('validation.required');
    }
    if (isAir && !d.flight_number?.trim()) {
      newErrors.flight_number = t('validation.required');
    }
    
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
    };
  }, [isSea, isAir, t]);

  // Initialize data only once when component mounts or shipmentId changes
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setData(initialData);
      // 初始化时验证并通知父组件
      const { isValid } = validateData(initialData);
      onChangeRef.current?.(initialData, isValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentId]); // Only depend on shipmentId to avoid infinite loop

  const handleChange = (field: keyof BookingData, value: string) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    setTouched(prev => ({ ...prev, [field]: true }));
    const { isValid, errors: newErrors } = validateData(newData);
    setErrors(newErrors);
    onChange?.(newData, isValid);
  };

  const handleBlur = (field: keyof BookingData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const { errors: newErrors } = validateData(data);
    setErrors(newErrors);
  };

  const handleDateChange = (field: 'etd' | 'eta', date: Date | undefined) => {
    const value = date ? format(date, 'yyyy-MM-dd') : undefined;
    const newData = { ...data, [field]: value };
    setData(newData);
    setTouched(prev => ({ ...prev, [field]: true }));
    const { isValid, errors: newErrors } = validateData(newData);
    setErrors(newErrors);
    onChange?.(newData, isValid);
  };

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

    toast({ 
      title: docType === 'PL' 
        ? t('shipments.wizard.itemsStep.plUploadSuccess') 
        : t('shipments.wizard.itemsStep.ciUploadSuccess') 
    });
    await fetchDocuments();
  };

  const handleGenerate = async (docType: string) => {
    const response = await fetch(`/api/shipments/${shipmentId}/documents/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Generate failed');
    }

    toast({ 
      title: docType === 'PL' 
        ? t('shipments.wizard.itemsStep.plGenerateSuccess') 
        : t('shipments.wizard.itemsStep.ciGenerateSuccess') 
    });
    await fetchDocuments();
  };

  const handleMarkNA = async (docType: string) => {
    const response = await fetch(`/api/shipments/${shipmentId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType, action: 'mark_na' }),
    });

    if (!response.ok) throw new Error('Failed to mark as not applicable');

    toast({ title: t('shipments.wizard.documents.markedSuccess') });
    await fetchDocuments();
  };

  const handleReset = async (docType: string) => {
    const response = await fetch(`/api/shipments/${shipmentId}/documents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType }),
    });

    if (!response.ok) throw new Error('Failed to reset status');

    toast({ title: t('shipments.wizard.documents.resetSuccess') });
    await fetchDocuments();
  };

  const handleDelete = async (filePath: string) => {
    if (!confirm(t('shipments.wizard.documents.deleteConfirm'))) return;

    const response = await fetch(`/api/disk/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath }),
    });

    if (!response.ok) throw new Error('Delete failed');

    toast({ title: t('shipments.wizard.documents.deleteSuccess') });
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
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">{t('shipments.wizard.booking.title')}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>
              {isSea ? t('shipments.wizard.booking.carrier') : t('shipments.wizard.booking.carrierAir')} <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder={isSea ? t('shipments.wizard.booking.carrierPlaceholder') : t('shipments.wizard.booking.carrierAirPlaceholder')}
              value={data.carrier || ''}
              onChange={(e) => handleChange('carrier', e.target.value)}
              onBlur={() => handleBlur('carrier')}
              disabled={disabled}
              className={cn(touched.carrier && errors.carrier && 'border-destructive')}
            />
            {touched.carrier && errors.carrier && (
              <p className="text-sm text-destructive">{errors.carrier}</p>
            )}
          </div>

          {isSea && (
            <div className="space-y-2">
              <Label>{t('shipments.wizard.booking.vesselName')} <span className="text-destructive">*</span></Label>
              <Input
                placeholder={t('shipments.wizard.booking.vesselNamePlaceholder')}
                value={data.vessel_name || ''}
                onChange={(e) => handleChange('vessel_name', e.target.value)}
                onBlur={() => handleBlur('vessel_name')}
                disabled={disabled}
                className={cn(touched.vessel_name && errors.vessel_name && 'border-destructive')}
              />
              {touched.vessel_name && errors.vessel_name && (
                <p className="text-sm text-destructive">{errors.vessel_name}</p>
              )}
            </div>
          )}

          {isSea && (
            <div className="space-y-2">
              <Label>{t('shipments.wizard.booking.voyageNumber')} <span className="text-destructive">*</span></Label>
              <Input
                placeholder={t('shipments.wizard.booking.voyageNumberPlaceholder')}
                value={data.voyage_number || ''}
                onChange={(e) => handleChange('voyage_number', e.target.value)}
                onBlur={() => handleBlur('voyage_number')}
                disabled={disabled}
                className={cn(touched.voyage_number && errors.voyage_number && 'border-destructive')}
              />
              {touched.voyage_number && errors.voyage_number && (
                <p className="text-sm text-destructive">{errors.voyage_number}</p>
              )}
            </div>
          )}

          {isAir && (
            <div className="space-y-2">
              <Label>{t('shipments.wizard.booking.flightNumber')} <span className="text-destructive">*</span></Label>
              <Input
                placeholder={t('shipments.wizard.booking.flightNumberPlaceholder')}
                value={data.flight_number || ''}
                onChange={(e) => handleChange('flight_number', e.target.value)}
                onBlur={() => handleBlur('flight_number')}
                disabled={disabled}
                className={cn(touched.flight_number && errors.flight_number && 'border-destructive')}
              />
              {touched.flight_number && errors.flight_number && (
                <p className="text-sm text-destructive">{errors.flight_number}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>
              {isSea ? t('shipments.wizard.booking.etdSea') : t('shipments.wizard.booking.etdAir')} <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !data.etd && 'text-muted-foreground',
                    touched.etd && errors.etd && 'border-destructive'
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.etd ? format(new Date(data.etd), 'yyyy-MM-dd') : t('shipments.wizard.booking.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={data.etd ? new Date(data.etd) : undefined}
                  onSelect={(date) => handleDateChange('etd', date)}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>{isSea ? t('shipments.wizard.booking.etaSea') : t('shipments.wizard.booking.etaAir')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !data.eta && 'text-muted-foreground'
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.eta ? format(new Date(data.eta), 'yyyy-MM-dd') : t('shipments.wizard.booking.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={data.eta ? new Date(data.eta) : undefined}
                  onSelect={(date) => handleDateChange('eta', date)}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-3">{t('shipments.wizard.booking.relatedDocuments')}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <DocumentUpload
            docType="PL"
            label={t('shipments.wizard.itemsStep.packingList')}
            status={documents.PL.status}
            files={documents.PL.files}
            canGenerate={true}
            generateLabel={t('shipments.wizard.itemsStep.generatePL')}
            onUpload={(file) => handleUpload('PL', file)}
            onGenerate={() => handleGenerate('PL')}
            onMarkNA={() => handleMarkNA('PL')}
            onReset={() => handleReset('PL')}
            onDelete={handleDelete}
            disabled={disabled}
          />
          <DocumentUpload
            docType="CI"
            label={t('shipments.wizard.itemsStep.commercialInvoice')}
            status={documents.CI.status}
            files={documents.CI.files}
            canGenerate={true}
            generateLabel={t('shipments.wizard.itemsStep.generateCI')}
            onUpload={(file) => handleUpload('CI', file)}
            onGenerate={() => handleGenerate('CI')}
            onMarkNA={() => handleMarkNA('CI')}
            onReset={() => handleReset('CI')}
            onDelete={handleDelete}
            disabled={disabled}
          />
        </div>
        
        {(documents.PL.status === 'pending' || documents.CI.status === 'pending') && (
          <p className="text-sm text-amber-600 mt-3">
            {t('shipments.wizard.booking.documentWarning')}
          </p>
        )}
      </div>
    </div>
  );
}
