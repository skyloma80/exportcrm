'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/use-i18n';
import {
  Upload,
  FileText,
  Check,
  X,
  Download,
  Trash2,
  Loader2,
  Ban,
  RotateCcw,
  FileUp,
  Sparkles,
} from 'lucide-react';

export type DocumentStatus = 'pending' | 'uploaded' | 'not_applicable' | 'uploading' | 'error';

export interface DocumentFile {
  name: string;
  path: string;
  size: number;
  url: string;
  uploadedAt?: string;
  source?: 'manual' | 'generated';
}

export interface DocumentUploadProps {
  docType: string;
  label: string;
  status: DocumentStatus;
  files: DocumentFile[];
  canGenerate?: boolean;
  generateLabel?: string;
  onUpload: (file: File) => Promise<void>;
  onGenerate?: () => Promise<void>;
  onMarkNA?: () => Promise<void>;
  onReset?: () => Promise<void>;
  onDelete?: (filePath: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const { t } = useI18n();
  
  switch (status) {
    case 'uploaded':
      return (
        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
          <Check className="h-3 w-3" />
          {t('shipments.wizard.documents.completed')}
        </Badge>
      );
    case 'not_applicable':
      return (
        <Badge variant="secondary" className="gap-1 bg-gray-100 text-gray-500">
          <Ban className="h-3 w-3" />
          {t('shipments.wizard.documents.notApplicable')}
        </Badge>
      );
    case 'uploading':
      return (
        <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700">
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('shipments.wizard.documents.uploading')}
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive" className="gap-1">
          <X className="h-3 w-3" />
          {t('shipments.wizard.documents.uploadFailed')}
        </Badge>
      );
    case 'pending':
    default:
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          {t('shipments.wizard.documents.pending')}
        </Badge>
      );
  }
}

export function DocumentUpload({
  label,
  status,
  files,
  canGenerate = false,
  generateLabel,
  onUpload,
  onGenerate,
  onMarkNA,
  onReset,
  onDelete,
  disabled = false,
  className,
}: DocumentUploadProps) {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const effectiveStatus = isUploading ? 'uploading' : error ? 'error' : status;

  const handleFileSelect = useCallback(() => {
    if (disabled || isUploading) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await handleUpload(file);
      }
    };
    input.click();
  }, [disabled, isUploading]);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 100);

    try {
      await onUpload(file);
      setUploadProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('shipments.wizard.documents.uploadFailed'));
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  const handleGenerate = async () => {
    if (!onGenerate || isGenerating) return;
    
    setIsGenerating(true);
    setError(null);
    try {
      await onGenerate();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('shipments.wizard.documents.generateFailed'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled || isUploading) return;
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleUpload(file);
    }
  }, [disabled, isUploading]);

  const isComplete = status === 'uploaded' || status === 'not_applicable';

  return (
    <div
      className={cn(
        'border rounded-lg p-4 space-y-3 transition-colors',
        isComplete && 'border-green-200 bg-green-50/30',
        isDragging && 'border-blue-400 bg-blue-50',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{label}</span>
        </div>
        <StatusBadge status={effectiveStatus} />
      </div>

      {isUploading && uploadProgress > 0 && (
        <Progress value={uploadProgress} className="h-1" />
      )}

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.path}
              className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{file.name}</span>
                <span className="text-muted-foreground flex-shrink-0">
                  {formatFileSize(file.size)}
                </span>
                {file.source === 'generated' && (
                  <Badge variant="outline" className="text-xs">
                    {t('shipments.wizard.documents.systemGenerated')}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(file.path)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {status === 'not_applicable' && (
        <div className="text-sm text-muted-foreground">
          {t('shipments.wizard.documents.markedNA')}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {(status === 'pending' || status === 'uploaded') && (
          <>
            {canGenerate && onGenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={disabled || isGenerating || isUploading}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                {generateLabel || t('shipments.wizard.documents.generate')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleFileSelect}
              disabled={disabled || isUploading}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              {files.length > 0 
                ? t('shipments.wizard.documents.uploadMore') 
                : t('shipments.wizard.documents.uploadFile')}
            </Button>
            {status === 'pending' && onMarkNA && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkNA}
                disabled={disabled || isUploading}
              >
                <Ban className="h-4 w-4 mr-1" />
                {t('shipments.wizard.documents.markNA')}
              </Button>
            )}
          </>
        )}

        {status === 'not_applicable' && onReset && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={disabled}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            {t('shipments.wizard.documents.resetStatus')}
          </Button>
        )}
      </div>

      {status === 'pending' && files.length === 0 && !isUploading && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground transition-colors',
            isDragging && 'border-blue-400 bg-blue-50 text-blue-600'
          )}
        >
          <FileUp className="h-6 w-6 mx-auto mb-2 opacity-50" />
          <p>{t('shipments.wizard.documents.dragHint')}</p>
          <p className="text-xs mt-1">{t('shipments.wizard.documents.fileTypes')}</p>
        </div>
      )}
    </div>
  );
}
