'use client';

/**
 * Shipment Photos Component
 * 发货照片管理组件
 */

import { useState, useRef } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { getPocketBase } from '@/lib/pocketbase/auth';

export interface ShipmentPhoto {
  id: string;
  filename: string;
  url: string;
}

export interface ShipmentPhotosProps {
  shipmentId: string;
  photos: string[];
  onPhotosChange?: (photos: string[]) => void;
  readOnly?: boolean;
}

export function ShipmentPhotos({ shipmentId, photos = [], onPhotosChange, readOnly }: ShipmentPhotosProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const pb = getPocketBase();
  const baseUrl = pb.baseUrl;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('photos', file);
      });

      const record = await pb.collection('shipments').update(shipmentId, formData);
      const newPhotos = record.photos || [];
      onPhotosChange?.(newPhotos);
      
      toast({
        title: t('common.success'),
        description: t('shipments.photos.uploadSuccess') || 'Photos uploaded',
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (filename: string) => {
    setDeleting(filename);
    try {
      const newPhotos = photos.filter(p => p !== filename);
      await pb.collection('shipments').update(shipmentId, { 'photos-': filename });
      onPhotosChange?.(newPhotos);
      
      toast({
        title: t('common.success'),
        description: t('shipments.photos.deleteSuccess') || 'Photo deleted',
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const getPhotoUrl = (filename: string) => {
    return `${baseUrl}/api/files/shipments/${shipmentId}/${filename}`;
  };

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex justify-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {t('shipments.photos.upload') || 'Upload Photos'}
          </Button>
        </div>
      )}

      {photos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{t('shipments.photos.empty') || 'No photos uploaded'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((filename) => (
            <Card key={filename} className="overflow-hidden group relative">
              <CardContent className="p-0">
                <img
                  src={getPhotoUrl(filename)}
                  alt={filename}
                  className="w-full h-40 object-cover"
                />
                {!readOnly && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                    onClick={() => handleDelete(filename)}
                    disabled={deleting === filename}
                  >
                    {deleting === filename ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default ShipmentPhotos;
