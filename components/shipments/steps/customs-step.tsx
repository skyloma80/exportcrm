'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

type CustomsStatus = 'pending' | 'declared' | 'cleared';

interface CustomsData {
  customs_broker?: string;
  customs_number?: string;
  customs_date?: string;
  clearance_date?: string;
  customs_status?: CustomsStatus;
  customs_port?: string;
  remarks?: string;
}

interface DocumentState {
  status: DocumentStatus;
  files: DocumentFile[];
}

interface CustomsStepProps {
  shipmentId: string;
  isCrossBorder?: boolean;
  initialData?: CustomsData;
  onChange?: (data: CustomsData, isValid: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function CustomsStep({
  shipmentId,
  isCrossBorder = false,
  initialData = {},
  onChange,
  disabled = false,
  className,
}: CustomsStepProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [data, setData] = useState<CustomsData>({
    customs_status: 'pending',
    ...initialData,
  });
  const [documents, setDocuments] = useState<Record<string, DocumentState>>({
    customs_dec: { status: 'pending', files: [] },
  });
  const [loading, setLoading] = useState(true);
  const dateLocale = locale === 'zh' ? zhCN : enUS;
  
  // Use ref to track initialization and store onChange callback
  const initializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const CUSTOMS_STATUS_LABELS: Record<CustomsStatus, string> = {
    pending: t('shipments.wizard.customs.statusPending'),
    declared: t('shipments.wizard.customs.statusDeclared'),
    cleared: t('shipments.wizard.customs.statusCleared'),
  };

  const fetchDocuments = useCallback(async () => {
    if (!shipmentId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/shipments/${shipmentId}/documents`);
      if (!response.ok) return;
      
      const result = await response.json();
      setDocuments({
        customs_dec: result.documents.customs_dec || { status: 'pending', files: [] },
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

  // Initialize data only once when component mounts or shipmentId changes
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const initData = { customs_status: 'pending' as CustomsStatus, ...initialData };
      setData(initData);
      onChangeRef.current?.(initData, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentId]); // Only depend on shipmentId to avoid infinite loop

  const validateData = useCallback((_d: CustomsData): boolean => {
    return true;
  }, []);

  const handleChange = (field: keyof CustomsData, value: string) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onChange?.(newData, validateData(newData));
  };

  const handleDateChange = (field: 'customs_date' | 'clearance_date', date: Date | undefined) => {
    const value = date ? format(date, 'yyyy-MM-dd') : undefined;
    const newData = { ...data, [field]: value };
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

    toast({ title: t('shipments.wizard.customs.uploadSuccess') });
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
        <h3 className="font-medium mb-4">{t('shipments.wizard.customs.title')}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {isCrossBorder && (
            <div className="space-y-2">
              <Label>{t('shipments.wizard.customs.customsPort')}</Label>
              <Input
                placeholder={t('shipments.wizard.customs.customsPortPlaceholder')}
                value={data.customs_port || ''}
                onChange={(e) => handleChange('customs_port', e.target.value)}
                disabled={disabled}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('shipments.wizard.customs.customsBroker')}</Label>
            <Input
              placeholder={t('shipments.wizard.customs.customsBrokerPlaceholder')}
              value={data.customs_broker || ''}
              onChange={(e) => handleChange('customs_broker', e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('shipments.wizard.customs.customsNumber')}</Label>
            <Input
              placeholder={t('shipments.wizard.customs.customsNumber')}
              value={data.customs_number || ''}
              onChange={(e) => handleChange('customs_number', e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('shipments.wizard.customs.customsDate')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !data.customs_date && 'text-muted-foreground'
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.customs_date ? format(new Date(data.customs_date), 'yyyy-MM-dd') : t('shipments.wizard.booking.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={data.customs_date ? new Date(data.customs_date) : undefined}
                  onSelect={(date) => handleDateChange('customs_date', date)}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>{t('shipments.wizard.customs.clearanceDate')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !data.clearance_date && 'text-muted-foreground'
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.clearance_date ? format(new Date(data.clearance_date), 'yyyy-MM-dd') : t('shipments.wizard.booking.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={data.clearance_date ? new Date(data.clearance_date) : undefined}
                  onSelect={(date) => handleDateChange('clearance_date', date)}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Label>{t('shipments.wizard.customs.customsStatus')}</Label>
          <RadioGroup
            value={data.customs_status || 'pending'}
            onValueChange={(value) => handleChange('customs_status', value)}
            className="flex gap-4"
            disabled={disabled}
          >
            {(['pending', 'declared', 'cleared'] as CustomsStatus[]).map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <RadioGroupItem value={status} id={`customs-${status}`} />
                <Label htmlFor={`customs-${status}`} className="font-normal cursor-pointer">
                  {CUSTOMS_STATUS_LABELS[status]}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="mt-4 space-y-2">
          <Label>{t('shipments.wizard.customs.remarks')}</Label>
          <Textarea
            placeholder={t('shipments.wizard.customs.remarksPlaceholder')}
            value={data.remarks || ''}
            onChange={(e) => handleChange('remarks', e.target.value)}
            disabled={disabled}
            rows={2}
          />
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-3">{t('shipments.wizard.booking.relatedDocuments')}</h3>
        <DocumentUpload
          docType="customs_dec"
          label={t('shipments.wizard.customs.customsDeclaration')}
          status={documents.customs_dec.status}
          files={documents.customs_dec.files}
          onUpload={(file) => handleUpload('customs_dec', file)}
          onMarkNA={() => handleMarkNA('customs_dec')}
          onReset={() => handleReset('customs_dec')}
          onDelete={handleDelete}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
