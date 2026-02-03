'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { CalendarIcon, Loader2, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/use-i18n';

interface LoadingData {
  container_number?: string;
  container_type?: string;
  seal_number?: string;
  loading_date?: string;
  loading_location?: string;
}

interface PhotoFile {
  name: string;
  path: string;
  url: string;
}

interface LoadingStepProps {
  shipmentId: string;
  initialData?: LoadingData;
  onChange?: (data: LoadingData, isValid: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function LoadingStep({
  shipmentId,
  initialData = {},
  onChange,
  disabled = false,
  className,
}: LoadingStepProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const [data, setData] = useState<LoadingData>(initialData);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const dateLocale = locale === 'zh' ? zhCN : enUS;

  const CONTAINER_TYPES = [
    { value: '20GP', label: t('shipments.containerTypes.20GP') },
    { value: '40GP', label: t('shipments.containerTypes.40GP') },
    { value: '40HQ', label: t('shipments.containerTypes.40HQ') },
    { value: '45HQ', label: t('shipments.containerTypes.45HQ') },
  ];

  const fetchPhotos = useCallback(async () => {
    if (!shipmentId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/shipments/${shipmentId}/photos`);
      if (!response.ok) return;
      
      const result = await response.json();
      setPhotos(result.photos || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Use ref to avoid infinite loop with initialData dependency
  const initializedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      setData(initialData);
      // Initial validation
      const isValid = !!(initialData.container_number && initialData.container_type);
      onChangeRef.current?.(initialData, isValid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateData = useCallback((d: LoadingData): boolean => {
    return !!(d.container_number && d.container_type);
  }, []);

  const handleChange = (field: keyof LoadingData, value: string) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onChangeRef.current?.(newData, validateData(newData));
  };

  const handleDateChange = (date: Date | undefined) => {
    const value = date ? format(date, 'yyyy-MM-dd') : undefined;
    const newData = { ...data, loading_date: value };
    setData(newData);
    onChangeRef.current?.(newData, validateData(newData));
  };

  const handleUploadPhoto = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('type', 'loading');

          const response = await fetch(`/api/shipments/${shipmentId}/photos`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Upload failed');
          }
        }
        toast({ title: t('shipments.wizard.loading.uploadSuccess') });
        await fetchPhotos();
      } catch (error) {
        console.error('Upload error:', error);
        toast({ title: t('shipments.wizard.loading.uploadFailed'), variant: 'destructive' });
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleDeletePhoto = async (path: string) => {
    if (!confirm(t('shipments.wizard.loading.deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/disk/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) throw new Error('Delete failed');

      toast({ title: t('shipments.wizard.loading.deleteSuccess') });
      await fetchPhotos();
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: t('shipments.wizard.loading.deleteFailed'), variant: 'destructive' });
    }
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
        <h3 className="font-medium mb-4">{t('shipments.wizard.loading.title')}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t('shipments.wizard.loading.containerNumber')} <span className="text-destructive">*</span></Label>
            <Input
              placeholder={t('shipments.wizard.loading.containerNumberPlaceholder')}
              value={data.container_number || ''}
              onChange={(e) => handleChange('container_number', e.target.value.toUpperCase())}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('shipments.wizard.loading.containerType')} <span className="text-destructive">*</span></Label>
            <Select
              value={data.container_type || ''}
              onValueChange={(value) => handleChange('container_type', value)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('shipments.wizard.loading.containerTypePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {CONTAINER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('shipments.wizard.loading.sealNumber')}</Label>
            <Input
              placeholder={t('shipments.wizard.loading.sealNumberPlaceholder')}
              value={data.seal_number || ''}
              onChange={(e) => handleChange('seal_number', e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('shipments.wizard.loading.loadingDate')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !data.loading_date && 'text-muted-foreground'
                  )}
                  disabled={disabled}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data.loading_date ? format(new Date(data.loading_date), 'yyyy-MM-dd') : t('shipments.wizard.booking.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={data.loading_date ? new Date(data.loading_date) : undefined}
                  onSelect={handleDateChange}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>{t('shipments.wizard.loading.loadingLocation')}</Label>
            <Input
              placeholder={t('shipments.wizard.loading.loadingLocationPlaceholder')}
              value={data.loading_location || ''}
              onChange={(e) => handleChange('loading_location', e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">{t('shipments.wizard.loading.photos')}</h3>
        <p className="text-sm text-muted-foreground mb-3">
          {t('shipments.wizard.loading.photosHint')}
        </p>
        
        <div className="border rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div key={photo.path} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {photo.name}
                </p>
                {!disabled && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeletePhoto(photo.path)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}

            {!disabled && (
              <button
                onClick={handleUploadPhoto}
                disabled={uploading}
                className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex flex-col items-center justify-center gap-2 text-muted-foreground transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-6 w-6" />
                    <span className="text-xs">{t('shipments.wizard.loading.addPhoto')}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {photos.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              {t('shipments.wizard.loading.photosCount', { count: String(photos.length) })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
