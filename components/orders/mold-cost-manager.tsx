'use client';

/**
 * Mold Cost Manager Component
 * 订单模具费用管理组件
 */

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, Package } from 'lucide-react';

export interface MoldCost {
  id?: string;
  product_id: string;
  product_name: string;
  mold_type: 'new' | 'existing' | 'customer_owned';
  cost: number;
  currency: string;
  amortization_qty?: number;
  remarks?: string;
}

export interface MoldCostManagerProps {
  orderId: string;
  moldCosts: MoldCost[];
  products: Array<{ id: string; name: string }>;
  currency: string;
  onAdd: (cost: Omit<MoldCost, 'id'>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onUpdate: (id: string, data: Partial<MoldCost>) => Promise<void>;
  readOnly?: boolean;
}

const MOLD_TYPES = ['new', 'existing', 'customer_owned'] as const;

export function MoldCostManager({
  orderId,
  moldCosts,
  products,
  currency,
  onAdd,
  onRemove,
  onUpdate,
  readOnly,
}: MoldCostManagerProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newCost, setNewCost] = useState<Omit<MoldCost, 'id'>>({
    product_id: '',
    product_name: '',
    mold_type: 'new',
    cost: 0,
    currency: currency,
    amortization_qty: undefined,
    remarks: '',
  });

  const handleAdd = async () => {
    if (!newCost.product_id || newCost.cost <= 0) {
      toast({
        title: t('common.error'),
        description: t('orders.moldCosts.validation') || 'Please select product and enter cost',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const product = products.find(p => p.id === newCost.product_id);
      await onAdd({
        ...newCost,
        product_name: product?.name || '',
      });
      setNewCost({
        product_id: '',
        product_name: '',
        mold_type: 'new',
        cost: 0,
        currency: currency,
        amortization_qty: undefined,
        remarks: '',
      });
      setIsAdding(false);
      toast({ title: t('common.success') });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    setIsLoading(true);
    try {
      await onRemove(id);
      toast({ title: t('common.success') });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalMoldCost = moldCosts.reduce((sum, c) => sum + c.cost, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle>{t('orders.moldCosts.title') || 'Mold Costs'}</CardTitle>
          </div>
          {!readOnly && !isAdding && (
            <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('orders.moldCosts.add') || 'Add Mold Cost'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="mb-4 p-4 border rounded-lg space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>{t('orders.moldCosts.product') || 'Product'}</Label>
                <Select
                  value={newCost.product_id}
                  onValueChange={(value) => setNewCost({ ...newCost, product_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('orders.moldCosts.type') || 'Type'}</Label>
                <Select
                  value={newCost.mold_type}
                  onValueChange={(value: typeof MOLD_TYPES[number]) => setNewCost({ ...newCost, mold_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOLD_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`orders.moldCosts.types.${type}`) || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('orders.moldCosts.cost') || 'Cost'}</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={newCost.cost || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setNewCost({ ...newCost, cost: parseFloat(val) || 0 })
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('orders.moldCosts.amortizationQty') || 'Amortization Qty'}</Label>
                <Input
                  type="number"
                  value={newCost.amortization_qty || ''}
                  onChange={(e) => setNewCost({ ...newCost, amortization_qty: parseInt(e.target.value) || undefined })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleAdd} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.add')}
              </Button>
            </div>
          </div>
        )}

        {moldCosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('orders.moldCosts.empty') || 'No mold costs added'}</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('orders.moldCosts.product') || 'Product'}</TableHead>
                  <TableHead>{t('orders.moldCosts.type') || 'Type'}</TableHead>
                  <TableHead className="text-right">{t('orders.moldCosts.cost') || 'Cost'}</TableHead>
                  <TableHead className="text-right">{t('orders.moldCosts.amortizationQty') || 'Amort. Qty'}</TableHead>
                  {!readOnly && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {moldCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell>{cost.product_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t(`orders.moldCosts.types.${cost.mold_type}`) || cost.mold_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {cost.currency} {cost.cost.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {cost.amortization_qty?.toLocaleString() || '-'}
                    </TableCell>
                    {!readOnly && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => cost.id && handleRemove(cost.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{t('orders.moldCosts.total') || 'Total Mold Cost'}</p>
                <p className="text-xl font-bold">{currency} {totalMoldCost.toLocaleString()}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default MoldCostManager;
