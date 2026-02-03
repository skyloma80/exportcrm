'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DocumentUpload, DocumentFile, DocumentStatus } from '@/components/shipments/shared/document-upload';
import { ShippingMethod } from '@/lib/shipment/wizard-config';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { CalendarIcon, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/use-i18n';

const BL_TYPE_KEYS = ['original', 'telex', 'seaway'] as const;
type BLType = typeof BL_TYPE_KEYS[number];

interface TransitData {
  actual_departure?: string;
  eta?: string;
  bl_number?: string;
  bl_type?: BLType;
}

interface ShipmentInfo {
  vessel_name?: string;
  voyage_number?: string;
  flight_number?: string;
  container_number?: string;
  departure_port?: string;
  destination_port?: string;
  carrier?: string;
  tracking_number?: string;
}

interface DocumentState {
  status: DocumentStatus;
  files: DocumentFile[];
}

interface TransitStepProps {
  shipmentId: string;
  shippingMethod: ShippingMethod;
  shipmentInfo?: ShipmentInfo;
  initialData?: TransitData;
  onChange?: (data: TransitData, isValid: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function TransitStep({
  shipmentId,
  shippingMethod,
  shipmentInfo = {},
  initialData = {},
  onChange,
  disabled = false,
  className,
}: TransitStepProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const dateLocale = locale === 'zh' ? zhCN : enUS;
  const [data, setData] = useState<TransitData>({ bl_type: 'telex', ...initialData });
  const [documents, setDocuments] = useState<Record<string, DocumentState>>({
    BL: { status: 'pending', files: [] },
  });
  const [loading, setLoading] = useState(true);

  const isSea = shippingMethod === 'sea';
  const isAir = shippingMethod === 'air';
  const isLand = shippingMethod === 'land' || shippingMethod === 'express';

  const fetchDocuments = useCallback(async () => {
    if (!shipmentId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/shipments/${shipmentId}/documents`);
      if (!response.ok) return;
      const result = await response.json();
      setDocuments({ BL: result.documents.BL || { status: 'pending', files: [] } });
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);
  
  // Use ref to avoid infinite loop with initialData dependency
  const initializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const initData = { bl_type: 'telex' as BLType, ...initialData };
      setData(initData);
      // Initial validation
      const isValid = !!(initData.actual_departure && ((isSea || isAir) ? initData.bl_number : true));
      onChangeRef.current?.(initData, isValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateData = useCallback((d: TransitData): boolean => {
    if (!d.actual_departure) return false;
    if ((isSea || isAir) && !d.bl_number) return false;
    return true;
  }, [isSea, isAir]);

  const handleChange = (field: keyof TransitData, value: string) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onChangeRef.current?.(newData, validateData(newData));
  };

  const handleDateChange = (field: 'actual_departure' | 'eta', date: Date | undefined) => {
    const value = date ? format(date, 'yyyy-MM-dd') : undefined;
    const newData = { ...data, [field]: value };
    setData(newData);
    onChangeRef.current?.(newData, validateData(newData));
  };

  const handleUpload = async (docType: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('docType', docType);
    const response = await fetch(`/api/shipments/${shipmentId}/documents`, { method: 'POST', body: formData });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Upload failed'); }
    toast({ title: t('shipments.wizard.transit.uploadSuccess') });
    await fetchDocuments();
  };

  const handleMarkNA = async (docType: string) => {
    const response = await fetch(`/api/shipments/${shipmentId}/documents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType, action: 'mark_na' }),
    });
    if (!response.ok) throw new Error('Failed to mark as not applicable');
    toast({ title: t('shipments.wizard.transit.markedNA') });
    await fetchDocuments();
  };

  const handleReset = async (docType: string) => {
    const response = await fetch(`/api/shipments/${shipmentId}/documents`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType }),
    });
    if (!response.ok) throw new Error('Failed to reset status');
    toast({ title: t('shipments.wizard.transit.statusReset') });
    await fetchDocuments();
  };

  const handleDelete = async (filePath: string) => {
    if (!confirm(t('shipments.wizard.arrival.deleteConfirm'))) return;
    const response = await fetch(`/api/disk/delete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath }),
    });
    if (!response.ok) throw new Error('Delete failed');
    toast({ title: t('shipments.wizard.transit.fileDeleted') });
    await fetchDocuments();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">{t('shipments.wizard.transit.title')}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>
              {isSea ? t('shipments.wizard.transit.actualDepartureSea') : isAir ? t('shipments.wizard.transit.actualDepartureAir') : t('shipments.wizard.transit.actualDepartureLand')} 
              <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !data.actual_departure && 'text-muted-foreground')} disabled={disabled}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.actual_departure ? format(new Date(data.actual_departure), 'yyyy-MM-dd') : t('shipments.wizard.transit.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={data.actual_departure ? new Date(data.actual_departure) : undefined} onSelect={(date) => handleDateChange('actual_departure', date)} locale={dateLocale} />
              </PopoverContent>
            </Popover>
          </div>
          {(isSea || isAir) && (
            <div className="space-y-2">
              <Label>{isSea ? t('shipments.wizard.transit.etaSea') : t('shipments.wizard.transit.etaAir')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !data.eta && 'text-muted-foreground')} disabled={disabled}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data.eta ? format(new Date(data.eta), 'yyyy-MM-dd') : t('shipments.wizard.transit.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={data.eta ? new Date(data.eta) : undefined} onSelect={(date) => handleDateChange('eta', date)} locale={dateLocale} />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        {(isSea || isAir) && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {isSea && shipmentInfo.vessel_name && (<div><span className="text-muted-foreground">{t('shipments.wizard.transit.vesselVoyage')}:</span><span className="ml-2">{shipmentInfo.vessel_name} / {shipmentInfo.voyage_number}</span></div>)}
            {isSea && shipmentInfo.container_number && (<div><span className="text-muted-foreground">{t('shipments.wizard.transit.containerNumber')}:</span><span className="ml-2">{shipmentInfo.container_number}</span></div>)}
            {isAir && shipmentInfo.flight_number && (<div><span className="text-muted-foreground">{t('shipments.wizard.transit.flightNumber')}:</span><span className="ml-2">{shipmentInfo.flight_number}</span></div>)}
            {shipmentInfo.departure_port && (<div><span className="text-muted-foreground">{isSea ? t('shipments.wizard.transit.departurePort') : t('shipments.wizard.transit.departureAirport')}:</span><span className="ml-2">{shipmentInfo.departure_port}</span></div>)}
            {shipmentInfo.destination_port && (<div><span className="text-muted-foreground">{isSea ? t('shipments.wizard.transit.destinationPort') : t('shipments.wizard.transit.destinationAirport')}:</span><span className="ml-2">{shipmentInfo.destination_port}</span></div>)}
          </div>
        )}
        {isLand && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2"><span className="text-muted-foreground">{t('shipments.wizard.transit.carrier')}:</span><span>{shipmentInfo.carrier || '-'}</span></div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('shipments.wizard.transit.trackingNumber')}:</span><span>{shipmentInfo.tracking_number || '-'}</span>
              {shipmentInfo.tracking_number && (<Button variant="link" size="sm" className="h-auto p-0"><ExternalLink className="h-3 w-3 mr-1" />{t('shipments.wizard.transit.trackLogistics')}</Button>)}
            </div>
          </div>
        )}
      </div>
      {(isSea || isAir) && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-4">{isSea ? t('shipments.wizard.transit.blInfo') : t('shipments.wizard.transit.awbInfo')}</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{isSea ? t('shipments.wizard.transit.blNumber') : t('shipments.wizard.transit.awbNumber')} <span className="text-destructive">*</span></Label>
              <Input placeholder={isSea ? t('shipments.wizard.transit.blNumberPlaceholder') : t('shipments.wizard.transit.awbNumberPlaceholder')} value={data.bl_number || ''} onChange={(e) => handleChange('bl_number', e.target.value)} disabled={disabled} />
            </div>
            {isSea && (
              <div className="space-y-2">
                <Label>{t('shipments.wizard.transit.blType')}</Label>
                <RadioGroup value={data.bl_type || 'telex'} onValueChange={(value) => handleChange('bl_type', value)} className="flex gap-4" disabled={disabled}>
                  {BL_TYPE_KEYS.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <RadioGroupItem value={type} id={`bl-${type}`} />
                      <Label htmlFor={`bl-${type}`} className="font-normal cursor-pointer">{t(`shipments.wizard.transit.blType${type.charAt(0).toUpperCase() + type.slice(1)}`)}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}
          </div>
        </div>
      )}
      {(isSea || isAir) && (
        <div>
          <h3 className="font-medium mb-3">{t('shipments.wizard.transit.relatedDocuments')}</h3>
          <DocumentUpload docType="BL" label={isSea ? t('shipments.wizard.transit.bl') : t('shipments.wizard.transit.awb')} status={documents.BL.status} files={documents.BL.files} onUpload={(file) => handleUpload('BL', file)} onMarkNA={() => handleMarkNA('BL')} onReset={() => handleReset('BL')} onDelete={handleDelete} disabled={disabled} />
        </div>
      )}
    </div>
  );
}
