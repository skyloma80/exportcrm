'use client';

/**
 * Quotation Mold Costs Component
 * 报价模具费用管理组件
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
import { Plus, Trash2, Loader2, Package, Calculator } from 'lucide-react';

export interface QuotationMoldCost {
  id?: string;
  product_id: string;
  product_name: string;
  mold_type: 'new' | 'existing' | 'customer_owned';
  cost: number;
  currency: string;
  amortization_qty?: number;
  unit_amortization?: number;
  include_in_price: boolean;
  remarks?: string;
}

export interface QuotationMoldCostsProps {
  quotationId: string;
  moldCosts: QuotationMoldCost[];
  products: Array<{ id: string; name: string }>;
  currency: string;
  onAdd: (cost: Omit<QuotationMoldCost, 'id'>) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onUpdate: (id: string, data: Partial<QuotationMoldCost>) => Promise<void>;
  readOnly?: boolean;
}

const MOLD_TYPES = ['new', 'existing', 'customer_owned'] as const;

export function QuotationMoldCosts({
  quotationId,
  moldCosts,
  products,
  currency,
  onAdd,
  onRemove,
  onUpdate,
  readOnly,
}: QuotationMoldCostsProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newCost, setNewCost] = useState<Omit<QuotationMoldCost, 'id'>>({
    product_id: '',
    product_name: '',
    mold_type: 'new',
    cost: 0,
    currency: currency,
    amortization_qty: undefined,
    unit_amortization: undefined,
    include_in_price: false,
    remarks: '',
  });

  const calculateUnitAmortization = (cost: number, qty?: number): number | undefined => {
    if (!qty || qty <= 0) return undefined;
    return cost / qty;
  };

  const handleAdd = async () => {
    if (!newCost.product_id || newCost.cost <= 0) {
      toast({
        title: t('common.error'),
        description: t('quotations.moldCosts.validation') || 'Please select product and enter cost',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const product = products.find(p => p.id === newCost.product_id);
      const unitAmort = calculateUnitAmortization(newCost.cost, newCost.amortization_qty);
      
      await onAdd({
        ...newCost,
        product_name: product?.name || '',
        unit_amortization: unitAmort,
      });
      
      setNewCost({
        product_id: '',
        product_name: '',
        mold_type: 'new',
        cost: 0,
        currency: currency,
        amortization_qty: undefined,
        unit_amortization: undefined,
        include_in_price: false,
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
  const includedInPrice = moldCosts.filter(c => c.include_in_price).reduce((sum, c) => sum + c.cost, 0);
  const separateCharge = totalMoldCost - includedInPrice;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <CardTitle>{t('quotations.moldCosts.title') || 'Mold Costs'}</CardTitle>
          </div>
          {!readOnly && !isAdding && (
            <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('quotations.moldCosts.add') || 'Add Mold Cost'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="mb-4 p-4 border rounded-lg space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{t('quotations.moldCosts.product') || 'Product'}</Label>
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
                <Label>{t('quotations.moldCosts.type') || 'Type'}</Label>
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
                        {t(`quotations.moldCosts.types.${type}`) || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.moldCosts.cost') || 'Cost'}</Label>
                <Input
                  type="number"
                  value={newCost.cost || ''}
                  onChange={(e) => setNewCost({ ...newCost, cost: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.moldCosts.amortizationQty') || 'Amortization Qty'}</Label>
                <Input
                  type="number"
                  value={newCost.amortization_qty || ''}
                  onChange={(e) => setNewCost({ ...newCost, amortization_qty: parseInt(e.target.value) || undefined })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('quotations.moldCosts.includeInPrice') || 'Include in Price'}</Label>
                <Select
                  value={newCost.include_in_price ? 'yes' : 'no'}
                  onValueChange={(value) => setNewCost({ ...newCost, include_in_price: value === 'yes' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">{t('common.no') || 'No'}</SelectItem>
                    <SelectItem value="yes">{t('common.yes') || 'Yes'}</SelectItem>
                  </SelectContent>
                </Select>
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
            <p>{t('quotations.moldCosts.empty') || 'No mold costs added'}</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('quotations.moldCosts.product') || 'Product'}</TableHead>
                  <TableHead>{t('quotations.moldCosts.type') || 'Type'}</TableHead>
                  <TableHead className="text-right">{t('quotations.moldCosts.cost') || 'Cost'}</TableHead>
                  <TableHead className="text-right">{t('quotations.moldCosts.amortizationQty') || 'Amort. Qty'}</TableHead>
                  <TableHead className="text-right">{t('quotations.moldCosts.unitAmort') || 'Unit Amort.'}</TableHead>
                  <TableHead>{t('quotations.moldCosts.includeInPrice') || 'In Price'}</TableHead>
                  {!readOnly && <TableHead className="w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {moldCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell>{cost.product_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t(`quotations.moldCosts.types.${cost.mold_type}`) || cost.mold_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {cost.currency} {cost.cost.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {cost.amortization_qty?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {cost.unit_amortization 
                        ? `${cost.currency} ${cost.unit_amortization.toFixed(4)}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={cost.include_in_price ? 'default' : 'secondary'}>
                        {cost.include_in_price ? t('common.yes') || 'Yes' : t('common.no') || 'No'}
                      </Badge>
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
            
            <div className="mt-4 grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('quotations.moldCosts.total') || 'Total Mold Cost'}</p>
                <p className="text-lg font-bold">{currency} {totalMoldCost.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('quotations.moldCosts.includedInPrice') || 'Included in Price'}</p>
                <p className="text-lg font-bold text-green-600">{currency} {includedInPrice.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{t('quotations.moldCosts.separateCharge') || 'Separate Charge'}</p>
                <p className="text-lg font-bold text-orange-600">{currency} {separateCharge.toLocaleString()}</p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default QuotationMoldCosts;
