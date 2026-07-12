'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ShipmentItemSelector, OrderItemWithShipped, SelectedShipmentItem } from '@/components/shipments/shared/shipment-item-selector';
import { DocumentUpload, DocumentFile, DocumentStatus } from '@/components/shipments/shared/document-upload';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/use-i18n';

interface ItemsStepProps {
  shipmentId: string;
  orderId: string;
  canEdit: boolean;
  onItemsChange?: (items: SelectedShipmentItem[], isValid: boolean) => void;
  className?: string;
}

interface DocumentState {
  status: DocumentStatus;
  files: DocumentFile[];
}

export function ItemsStep({
  shipmentId,
  orderId,
  canEdit,
  onItemsChange,
  className,
}: ItemsStepProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orderItems, setOrderItems] = useState<OrderItemWithShipped[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedShipmentItem[]>([]);
  const [documents, setDocuments] = useState<Record<string, DocumentState>>({
    PL: { status: 'pending', files: [] },
    CI: { status: 'pending', files: [] },
  });
  
  // 使用 ref 存储回调，避免无限循环
  const onItemsChangeRef = useRef(onItemsChange);
  onItemsChangeRef.current = onItemsChange;
  
  // 跟踪是否已初始化通知过父组件
  const hasNotifiedRef = useRef(false);

  const fetchOrderItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/so/${orderId}/items-with-shipped?excludeShipmentId=${shipmentId}`);
      if (!response.ok) throw new Error('Failed to fetch order items');
      
      const data = await response.json();
      setOrderItems(data.items);
      
      if (shipmentId) {
        const shipmentResponse = await fetch(`/api/shipments/${shipmentId}/items`);
        if (shipmentResponse.ok) {
          const shipmentData = await shipmentResponse.json();
          setSelectedItems(shipmentData.items.map((item: any) => ({
            orderItemId: item.order_item,
            quantity: item.quantity,
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching order items:', error);
      toast({ title: t('shipments.wizard.itemsStep.fetchError'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [orderId, shipmentId, toast, t]);

  const fetchDocuments = useCallback(async () => {
    if (!shipmentId) return;
    
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/documents`);
      if (!response.ok) return;
      
      const data = await response.json();
      setDocuments({
        PL: data.documents.PL || { status: 'pending', files: [] },
        CI: data.documents.CI || { status: 'pending', files: [] },
      });
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }, [shipmentId]);

  useEffect(() => {
    fetchOrderItems();
    fetchDocuments();
  }, [fetchOrderItems, fetchDocuments]);

  // 初始化时通知父组件验证状态（只在数据加载完成后执行一次）
  useEffect(() => {
    if (loading || hasNotifiedRef.current) return;
    
    hasNotifiedRef.current = true;
    const isValid = selectedItems.length > 0 && selectedItems.every(item => {
      const orderItem = orderItems.find(oi => oi.id === item.orderItemId);
      return orderItem && item.quantity > 0 && item.quantity <= orderItem.remainingQuantity;
    });
    
    onItemsChangeRef.current?.(selectedItems, isValid);
  }, [loading, selectedItems, orderItems]);

  const handleItemsChange = useCallback((items: SelectedShipmentItem[]) => {
    setSelectedItems(items);
    
    const isValid = items.length > 0 && items.every(item => {
      const orderItem = orderItems.find(oi => oi.id === item.orderItemId);
      return orderItem && item.quantity > 0 && item.quantity <= orderItem.remainingQuantity;
    });
    
    // 保存到数据库
    if (isValid && items.length > 0) {
      saveItemsToDatabase(items);
    }
    
    onItemsChangeRef.current?.(items, isValid);
  }, [orderItems]);

  const saveItemsToDatabase = async (items: SelectedShipmentItem[]) => {
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        throw new Error('Failed to save items');
      }
    } catch (error) {
      console.error('Error saving shipment items:', error);
      toast({ 
        title: t('shipments.wizard.itemsStep.saveError'), 
        variant: 'destructive' 
      });
    }
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

  const handleMarkNA = async (docType: string) => {
    const response = await fetch(`/api/shipments/${shipmentId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType, action: 'mark_na' }),
    });

    if (!response.ok) {
      throw new Error('Failed to mark as not applicable');
    }

    toast({ title: t('shipments.wizard.documents.markedSuccess') });
    await fetchDocuments();
  };

  const handleReset = async (docType: string) => {
    const response = await fetch(`/api/shipments/${shipmentId}/documents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType }),
    });

    if (!response.ok) {
      throw new Error('Failed to reset status');
    }

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

    if (!response.ok) {
      throw new Error('Delete failed');
    }

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
    <div className={className}>
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium mb-3">
            {t('shipments.wizard.itemsStep.selectProducts')}
          </h3>
          <ShipmentItemSelector
            orderItems={orderItems}
            initialItems={selectedItems}
            onChange={handleItemsChange}
            disabled={!canEdit}
          />
        </div>

        <div className="border-t pt-6">
          <h3 className="text-sm font-medium mb-3">
            {t('shipments.wizard.itemsStep.prepareDocuments')}
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <DocumentUpload
              docType="PL"
              label={t('shipments.wizard.itemsStep.packingList')}
              status={documents.PL.status}
              files={documents.PL.files}
              canGenerate={false}
              onUpload={(file) => handleUpload('PL', file)}
              onMarkNA={() => handleMarkNA('PL')}
              onReset={() => handleReset('PL')}
              onDelete={handleDelete}
              disabled={!canEdit}
            />
            <DocumentUpload
              docType="CI"
              label={t('shipments.wizard.itemsStep.commercialInvoice')}
              status={documents.CI.status}
              files={documents.CI.files}
              canGenerate={false}
              onUpload={(file) => handleUpload('CI', file)}
              onMarkNA={() => handleMarkNA('CI')}
              onReset={() => handleReset('CI')}
              onDelete={handleDelete}
              disabled={!canEdit}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
