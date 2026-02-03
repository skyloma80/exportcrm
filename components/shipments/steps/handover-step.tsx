'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DocumentUpload, DocumentFile, DocumentStatus } from '@/components/shipments/shared/document-upload';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/use-i18n';

interface HandoverData {
  handover_date?: string;
  handover_location?: string;
  receiver?: string;
  confirmation_number?: string;
  remarks?: string;
  confirmed?: boolean;
}

interface ShipmentSummary {
  totalPackages: number;
  totalGrossWeight: number;
  totalVolume?: number;
}

interface DocumentState {
  status: DocumentStatus;
  files: DocumentFile[];
}

interface HandoverStepProps {
  shipmentId: string;
  summary?: ShipmentSummary;
  initialData?: HandoverData;
  onChange?: (data: HandoverData, isValid: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function HandoverStep({
  shipmentId,
  summary = { totalPackages: 0, totalGrossWeight: 0 },
  initialData = {},
  onChange,
  disabled = false,
  className,
}: HandoverStepProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [data, setData] = useState<HandoverData>(initialData);
  const [documents, setDocuments] = useState<Record<string, DocumentState>>({
    handover_receipt: { status: 'pending', files: [] },
  });
  const [loading, setLoading] = useState(true);
  const dateLocale = locale === 'zh' ? zhCN : enUS;

  const fetchDocuments = useCallback(async () => {
    if (!shipmentId) return;
    
    try {
      setLoading(true);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const validateData = useCallback((d: HandoverData): boolean => {
    return !!(d.handover_date);
  }, []);

  const handleChange = (field: keyof HandoverData, value: string | boolean) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onChange?.(newData, validateData(newData));
  };

  const handleDateChange = (date: Date | undefined) => {
    const value = date ? format(date, 'yyyy-MM-dd') : undefined;
    const newData = { ...data, handover_date: value };
    setData(newData);
    onChange?.(newData, validateData(newData));
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

    toast({ title: t('shipments.wizard.handover.uploadSuccess') });
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
    setDocuments(prev => ({
      ...prev,
      [docType]: { status: 'not_applicable', files: [] },
    }));
  };

  const handleReset = async (docType: string) => {
    setDocuments(prev => ({
      ...prev,
      [docType]: { status: 'pending', files: [] },
    }));
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
        <h3 className="font-medium mb-4">{t('shipments.wizard.handover.title')}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('shipments.wizard.handover.handoverDate')} <span className="text-destructive">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !data.handover_date && 'text-muted-foreground'
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.handover_date ? format(new Date(data.handover_date), 'yyyy-MM-dd') : t('shipments.wizard.booking.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={data.handover_date ? new Date(data.handover_date) : undefined}
                  onSelect={handleDateChange}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>{t('shipments.wizard.handover.handoverLocation')}</Label>
            <Input
              placeholder={t('shipments.wizard.handover.handoverLocationPlaceholder')}
              value={data.handover_location || ''}
              onChange={(e) => handleChange('handover_location', e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('shipments.wizard.handover.receiver')}</Label>
            <Input
              placeholder={t('shipments.wizard.handover.receiverPlaceholder')}
              value={data.receiver || ''}
              onChange={(e) => handleChange('receiver', e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('shipments.wizard.handover.confirmationNumber')}</Label>
            <Input
              placeholder={t('shipments.wizard.handover.confirmationNumber')}
              value={data.confirmation_number || ''}
              onChange={(e) => handleChange('confirmation_number', e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>{t('shipments.wizard.handover.remarks')}</Label>
            <Textarea
              placeholder={t('shipments.wizard.handover.remarksPlaceholder')}
              value={data.remarks || ''}
              onChange={(e) => handleChange('remarks', e.target.value)}
              disabled={disabled}
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-3">{t('shipments.wizard.handover.cargoConfirm')}</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <span className="text-sm text-muted-foreground">{t('shipments.wizard.handover.totalPackages')}:</span>
            <span className="ml-2 font-medium">{summary.totalPackages}</span>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">{t('shipments.wizard.handover.totalGrossWeight')}:</span>
            <span className="ml-2 font-medium">{summary.totalGrossWeight} kg</span>
          </div>
          {summary.totalVolume && (
            <div>
              <span className="text-sm text-muted-foreground">{t('shipments.wizard.handover.totalVolume')}:</span>
              <span className="ml-2 font-medium">{summary.totalVolume} CBM</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="confirm-cargo"
            checked={data.confirmed || false}
            onCheckedChange={(checked) => handleChange('confirmed', !!checked)}
            disabled={disabled}
          />
          <Label htmlFor="confirm-cargo" className="font-normal cursor-pointer">
            {t('shipments.wizard.handover.confirmCargo')}
          </Label>
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-3">{t('shipments.wizard.handover.receipt')}</h3>
        <DocumentUpload
          docType="handover_receipt"
          label={t('shipments.wizard.handover.handoverReceipt')}
          status={documents.handover_receipt.status}
          files={documents.handover_receipt.files}
          onUpload={(file) => handleUpload('handover_receipt', file)}
          onMarkNA={() => handleMarkNA('handover_receipt')}
          onReset={() => handleReset('handover_receipt')}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
