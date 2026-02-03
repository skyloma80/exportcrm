/**
 * Product Cost Table Component
 * 产品成本表组件
 * 
 * Displays product cost comparison across suppliers
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, TrendingDown, Package } from 'lucide-react';
import { useI18n } from '@/lib/i18n/use-i18n';

interface CostTableItem {
  product: {
    id: string;
    code: string;
    name: string;
    name_cn?: string;
    unit: string;
  };
  quantity: number;
  target_price?: number;
  quotations: Array<{
    supplier: {
      id: string;
      code: string;
      name: string;
      name_cn?: string;
      rating?: number;
    };
    unit_price: number;
    moq?: number;
    lead_time_days?: number;
  }>;
  lowest_price?: number;
  lowest_price_supplier_id?: string;
  average_price?: number;
}

interface MoldCostItem {
  supplier: {
    id: string;
    name: string;
    name_cn?: string;
  };
  mold_type: string;
  cost: number;
  lead_time_days?: number;
}

interface CostTableData {
  rfq: {
    id: string;
    code: string;
    project_name?: string;
    customer_name?: string;
  };
  items: CostTableItem[];
  mold_costs: MoldCostItem[];
  summary: {
    total_items: number;
    total_suppliers: number;
    lowest_total?: number;
    average_total?: number;
  };
}

interface CostTableProps {
  rfqId: string;
}

export function CostTable({ rfqId }: CostTableProps) {
  const { t, locale } = useI18n();
  const [data, setData] = useState<CostTableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const getDisplayName = (item: { name: string; name_cn?: string }) => {
    if (locale === 'zh' && item.name_cn) {
      return item.name_cn;
    }
    return item.name;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/rfqs/${rfqId}/cost-table`);
      if (!response.ok) {
        throw new Error('Failed to fetch cost table');
      }
      const result = await response.json();
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/rfqs/${rfqId}/cost-table?format=excel`);
      if (!response.ok) {
        throw new Error('Failed to export');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cost-table-${data?.rfq.code || rfqId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      console.error('Export error:', e);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {error}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>{t('rfqs.costTable.empty')}</p>
        </CardContent>
      </Card>
    );
  }

  // Get unique suppliers from all quotations
  const suppliers = new Map<string, { id: string; name: string; name_cn?: string }>();
  data.items.forEach(item => {
    item.quotations.forEach(q => {
      if (!suppliers.has(q.supplier.id)) {
        suppliers.set(q.supplier.id, q.supplier);
      }
    });
  });
  const supplierList = Array.from(suppliers.values());

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{data.summary.total_items}</div>
            <div className="text-sm text-muted-foreground">{t('rfqs.costTable.totalItems')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{data.summary.total_suppliers}</div>
            <div className="text-sm text-muted-foreground">{t('rfqs.costTable.totalSuppliers')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              ${data.summary.lowest_total?.toLocaleString() || '-'}
            </div>
            <div className="text-sm text-muted-foreground">{t('rfqs.costTable.lowestTotal')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              ${data.summary.average_total?.toLocaleString() || '-'}
            </div>
            <div className="text-sm text-muted-foreground">{t('rfqs.costTable.averageTotal')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Comparison Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('rfqs.costTable.title')}</CardTitle>
            <CardDescription>{t('rfqs.costTable.description')}</CardDescription>
          </div>
          <Button onClick={handleExport} disabled={exporting} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {exporting ? t('common.exporting') : t('common.export')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background">{t('rfqs.costTable.product')}</TableHead>
                  <TableHead className="text-right">{t('rfqs.costTable.quantity')}</TableHead>
                  {supplierList.map(supplier => (
                    <TableHead key={supplier.id} className="text-right min-w-[120px]">
                      {getDisplayName(supplier)}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">{t('rfqs.costTable.lowest')}</TableHead>
                  <TableHead className="text-right">{t('rfqs.costTable.subtotal')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map(item => (
                  <TableRow key={item.product.id}>
                    <TableCell className="sticky left-0 bg-background font-medium">
                      <div>{getDisplayName(item.product)}</div>
                      <div className="text-xs text-muted-foreground">{item.product.code}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity} {item.product.unit}
                    </TableCell>
                    {supplierList.map(supplier => {
                      const quotation = item.quotations.find(q => q.supplier.id === supplier.id);
                      const isLowest = quotation && item.lowest_price === quotation.unit_price;
                      return (
                        <TableCell key={supplier.id} className="text-right">
                          {quotation ? (
                            <div className={isLowest ? 'text-green-600 font-medium' : ''}>
                              ${quotation.unit_price.toFixed(2)}
                              {isLowest && <TrendingDown className="inline ml-1 h-3 w-3" />}
                              {quotation.moq && (
                                <div className="text-xs text-muted-foreground">
                                  MOQ: {quotation.moq}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-medium text-green-600">
                      {item.lowest_price ? `$${item.lowest_price.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {item.lowest_price 
                        ? `$${(item.lowest_price * item.quantity).toFixed(2)}`
                        : '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mold Costs */}
      {data.mold_costs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('rfqs.costTable.moldCosts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('rfqs.costTable.supplier')}</TableHead>
                  <TableHead>{t('rfqs.costTable.moldType')}</TableHead>
                  <TableHead className="text-right">{t('rfqs.costTable.cost')}</TableHead>
                  <TableHead className="text-right">{t('rfqs.costTable.leadTime')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.mold_costs.map((mold, index) => (
                  <TableRow key={index}>
                    <TableCell>{getDisplayName(mold.supplier)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(`products.moldTypes.${mold.mold_type}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">${mold.cost.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {mold.lead_time_days ? `${mold.lead_time_days} days` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
