/**
 * Generate Purchase Order Dialog
 * 从询价单生成采购订单对话框
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useGeneratePOFromRFQ } from '@/hooks/collections/purchase-orders';

interface Supplier {
  id: string;
  name: string;
  name_cn?: string;
}

interface GeneratePODialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rfqId: string;
  rfqCode: string;
  suppliers: Supplier[];
  onSuccess?: () => void;
}

export function GeneratePODialog({
  open,
  onOpenChange,
  rfqId,
  rfqCode,
  suppliers,
  onSuccess,
}: GeneratePODialogProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { generate, loading, error } = useGeneratePOFromRFQ();

  const [planType, setPlanType] = useState<'single' | 'mixed'>('single');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    orders: Array<{
      id: string;
      code: string;
      supplier_name: string;
      total_amount: number;
      items_count: number;
    }>;
  } | null>(null);

  const getDisplayName = (supplier: Supplier) => {
    if (locale === 'zh' && supplier.name_cn) {
      return supplier.name_cn;
    }
    return supplier.name;
  };

  const handleGenerate = async () => {
    if (planType === 'single' && !selectedSupplierId) {
      return;
    }

    const response = await generate(rfqId, {
      planType,
      singleSupplierId: planType === 'single' ? selectedSupplierId : undefined,
    });

    if (response) {
      setResult(response);
      if (response.success && onSuccess) {
        onSuccess();
      }
    }
  };

  const handleClose = () => {
    setResult(null);
    setPlanType('single');
    setSelectedSupplierId('');
    onOpenChange(false);
  };

  const handleViewPO = (poId: string) => {
    router.push(`/purchase-orders/${poId}`);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('rfq.generatePO.title')}
          </DialogTitle>
          <DialogDescription>
            {t('rfq.generatePO.description', { code: rfqCode })}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          // Show result
          <div className="space-y-4">
            {result.success ? (
              <>
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    {result.message}
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label>{t('rfq.generatePO.generatedOrders')}</Label>
                  <div className="space-y-2">
                    {result.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{order.code}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.supplier_name} · {order.items_count} {t('common.items')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            ${order.total_amount.toLocaleString()}
                          </div>
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() => handleViewPO(order.id)}
                          >
                            {t('common.view')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{result.message}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          // Show form
          <div className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label>{t('rfq.generatePO.planType')}</Label>
              <RadioGroup
                value={planType}
                onValueChange={(value: 'single' | 'mixed') => setPlanType(value)}
              >
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="single" id="single" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="single" className="font-medium cursor-pointer">
                      {t('rfq.generatePO.singleSupplier')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('rfq.generatePO.singleSupplierDesc')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="mixed" id="mixed" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="mixed" className="font-medium cursor-pointer">
                      {t('rfq.generatePO.mixedSupplier')}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t('rfq.generatePO.mixedSupplierDesc')}
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {planType === 'single' && (
              <div className="space-y-2">
                <Label>{t('rfq.generatePO.selectSupplier')}</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('rfq.generatePO.selectSupplierPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {getDisplayName(supplier)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose}>{t('common.close')}</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={loading || (planType === 'single' && !selectedSupplierId)}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('rfq.generatePO.generate')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
