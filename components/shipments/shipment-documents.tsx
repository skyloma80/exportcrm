'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  Check, 
  X, 
  Download, 
  Trash2, 
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/use-i18n';

// 单据状态类型
type DocumentStatusType = 'pending' | 'uploaded' | 'not_applicable';

interface DocumentFile {
  name: string;
  path: string;
  size: number;
  url: string;
}

interface DocumentTypeInfo {
  type: string;
  label: string;
}

interface DocumentState {
  status: DocumentStatusType;
  files: DocumentFile[];
}

interface ShipmentDocumentsProps {
  shipmentId: string;
}

// 必传单据类型
const REQUIRED_DOCUMENT_TYPES = ['CI', 'PL', 'BL'] as const;

/**
 * 进度显示组件
 * Requirements: 5.1, 5.2
 */
function DocumentProgress({ 
  completed, 
  total,
  t 
}: { 
  completed: number; 
  total: number;
  t: (key: string, params?: Record<string, string>) => string;
}) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = completed === total && total > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {completed}/{total} {t('shipments.wizard.documentsPage.completed')}
        </span>
        {isComplete && (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            {t('shipments.wizard.documentsPage.allComplete')}
          </Badge>
        )}
      </div>
      <Progress value={percentage} className={isComplete ? '[&>div]:bg-green-600' : ''} />
    </div>
  );
}

/**
 * 状态标签组件
 * Requirements: 2.1, 2.3
 */
function StatusBadge({ 
  status,
  t 
}: { 
  status: DocumentStatusType;
  t: (key: string) => string;
}) {
  switch (status) {
    case 'uploaded':
      return (
        <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
          <Check className="h-3 w-3" />
          {t('shipments.wizard.documentsPage.uploaded')}
        </Badge>
      );
    case 'not_applicable':
      return (
        <Badge variant="secondary" className="gap-1 bg-gray-100 text-gray-500">
          <Clock className="h-3 w-3" />
          {t('shipments.wizard.documentsPage.notApplicable')}
        </Badge>
      );
    case 'pending':
    default:
      return (
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <X className="h-3 w-3" />
          {t('shipments.wizard.documentsPage.pending')}
        </Badge>
      );
  }
}


/**
 * 单据项组件
 * Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 7.4
 */
interface DocumentItemProps {
  type: string;
  label: string;
  state: DocumentState;
  isUploading: boolean;
  domesticFreight: number | null;
  isRequired: boolean;
  onUpload: () => void;
  onDelete: (filePath: string) => void;
  onDomesticFreightChange?: (value: number | null) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

function DocumentItem({
  type,
  label,
  state,
  isUploading,
  domesticFreight,
  isRequired,
  onUpload,
  onDelete,
  onDomesticFreightChange,
  t,
}: DocumentItemProps) {
  const isTransportDocs = type === 'transport_docs';
  const [freightValue, setFreightValue] = useState<string>(
    domesticFreight !== null ? String(domesticFreight) : ''
  );

  // 同步外部值变化
  useEffect(() => {
    setFreightValue(domesticFreight !== null ? String(domesticFreight) : '');
  }, [domesticFreight]);

  const handleFreightBlur = () => {
    if (onDomesticFreightChange) {
      const numValue = freightValue ? parseFloat(freightValue) : null;
      if (numValue !== domesticFreight) {
        onDomesticFreightChange(numValue);
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* 第一行：标题 + 状态徽章 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </span>
          {state.status === 'uploaded' && state.files.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({state.files.length} {t('shipments.wizard.documentsPage.files')})
            </span>
          )}
        </div>
        <StatusBadge status={state.status} t={t} />
      </div>

      {/* 国内运输单据：金额输入框 */}
      {isTransportDocs && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t('shipments.wizard.documentsPage.domesticFreight')}:</span>
          <Input
            type="number"
            placeholder={t('shipments.wizard.documentsPage.enterAmount')}
            className="w-24 h-7"
            value={freightValue}
            onChange={(e) => setFreightValue(e.target.value)}
            onBlur={handleFreightBlur}
          />
          <span className="text-sm text-muted-foreground">{t('shipments.wizard.documentsPage.yuan')}</span>
        </div>
      )}

      {/* 已上传文件列表 */}
      {state.status === 'uploaded' && state.files.length > 0 && (
        <div className="space-y-1">
          {state.files.map((file) => (
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
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  asChild
                >
                  <a href={file.url} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(file.path)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 操作按钮 - 放在底部独立一行 */}
      <div className="flex flex-wrap items-center gap-2">
        {state.status === 'pending' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            {t('shipments.wizard.documentsPage.upload')}
          </Button>
        )}
        
        {state.status === 'uploaded' && (
          <Button
            variant="outline"
            size="sm"
            onClick={onUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            {t('shipments.wizard.documentsPage.uploadMore')}
          </Button>
        )}
      </div>
    </div>
  );
}


/**
 * 发货单据主组件
 */
export function ShipmentDocuments({ shipmentId }: ShipmentDocumentsProps) {
  const { toast } = useToast();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Record<string, DocumentState>>({});
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeInfo[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [domesticFreight, setDomesticFreight] = useState<number | null>(null);
  const [shipmentInfo, setShipmentInfo] = useState<{
    shipmentCode: string;
    shipmentIndex: number;
    orderCode: string;
  } | null>(null);

  // Helper to get localized document type label
  const getDocTypeLabel = (docType: string): string => {
    const key = `shipments.wizard.documentsPage.docTypes.${docType}`;
    const translated = t(key);
    // If translation key not found, return the original docType
    return translated === key ? docType : translated;
  };

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/shipments/${shipmentId}/documents`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      
      const data = await response.json();
      setDocuments(data.documents);
      setDocumentTypes(data.documentTypes);
      setProgress(data.progress);
      setDomesticFreight(data.domestic_freight);
      setShipmentInfo({
        shipmentCode: data.shipmentCode,
        shipmentIndex: data.shipmentIndex,
        orderCode: data.orderCode,
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({ title: t('shipments.wizard.documentsPage.fetchError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [shipmentId, toast, t]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (docType: string, file: File) => {
    try {
      setUploading(docType);
      
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

      toast({ title: t('shipments.wizard.documentsPage.uploadSuccess', { docType: getDocTypeLabel(docType) }) });
      await fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: t('shipments.wizard.documentsPage.uploadError'), description: error instanceof Error ? error.message : '', variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const handleFileSelect = (docType: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleUpload(docType, file);
      }
    };
    input.click();
  };

  /**
   * 删除文件
   */
  const handleDelete = async (filePath: string) => {
    if (!confirm(t('shipments.wizard.documentsPage.deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/disk/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });

      if (!response.ok) throw new Error('Delete failed');

      toast({ title: t('shipments.wizard.documentsPage.deleteSuccess') });
      await fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: t('shipments.wizard.documentsPage.deleteError'), variant: 'destructive' });
    }
  };

  /**
   * 更新国内运费
   * Requirements: 7.2
   */
  const handleDomesticFreightChange = async (value: number | null) => {
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domestic_freight: value }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update domestic freight');
      }

      setDomesticFreight(value);
      toast({ title: t('shipments.wizard.documentsPage.freightSaved') });
    } catch (error) {
      console.error('Update domestic freight error:', error);
      toast({ title: t('shipments.wizard.documentsPage.freightSaveError'), variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isAllComplete = progress.completed === progress.total && progress.total > 0;

  return (
    <Card className={isAllComplete ? 'border-green-200' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          {t('shipments.wizard.documentsPage.title')}
          {isAllComplete && <CheckCircle2 className="h-5 w-5 text-green-600" />}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchDocuments}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {shipmentInfo && (
          <p className="text-sm text-muted-foreground">
            {t('shipments.wizard.documentsPage.orderShipment', { 
              orderCode: shipmentInfo.orderCode, 
              index: String(shipmentInfo.shipmentIndex) 
            })}
          </p>
        )}
        
        {/* 进度显示 */}
        <DocumentProgress completed={progress.completed} total={progress.total} t={t} />
        
        {/* 单据清单 - 网格布局 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documentTypes.map(({ type }) => {
            const state = documents[type] || { status: 'pending' as DocumentStatusType, files: [] };
            const localizedLabel = getDocTypeLabel(type);
            const isTransportDocs = type === 'transport_docs';
            const isRequired = REQUIRED_DOCUMENT_TYPES.includes(type as typeof REQUIRED_DOCUMENT_TYPES[number]);
            
            return (
              <DocumentItem
                key={type}
                type={type}
                label={localizedLabel}
                state={state}
                isUploading={uploading === type}
                domesticFreight={isTransportDocs ? domesticFreight : null}
                isRequired={isRequired}
                onUpload={() => handleFileSelect(type)}
                onDelete={handleDelete}
                onDomesticFreightChange={isTransportDocs ? handleDomesticFreightChange : undefined}
                t={t}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
