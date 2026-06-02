'use client';

/**
 * Payments Page
 * 财务管理页面 - 应收款和应付款
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useTabState } from '@/hooks/use-tab-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  DataTable, 
  DataTableColumnHeader,
} from '@/components/data-table';
import { 
  DollarSign, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle, XCircle,
  TrendingUp, TrendingDown, Loader2, BarChart3, Eye
} from 'lucide-react';
import { getPocketBase } from '@/lib/pocketbase/auth';
import { useToast } from '@/hooks/use-toast';

interface OrderPayment {
  id: string;
  order: string;
  amount: number;
  currency: string;
  status: 'pending' | 'approved' | 'rejected';
  payment_date: string;
  expand?: {
    order?: {
      code: string;
      customer: string;
      expand?: {
        customer?: { name: string };
      };
    };
  };
}

interface POPayment {
  id: string;
  purchase_order: string;
  amount: number;
  currency: string;
  type?: 'deposit' | 'progress' | 'final';
  payment_date: string;
  expand?: {
    purchase_order?: {
      code: string;
      supplier: string;
      expand?: {
        supplier?: { name: string };
      };
    };
  };
}

export default function PaymentsPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useTabState("receivables");
  const [loading, setLoading] = useState(true);
  const [receivables, setReceivables] = useState<OrderPayment[]>([]);
  const [payables, setPayables] = useState<POPayment[]>([]);
  const [orderStats, setOrderStats] = useState({ totalReceivable: 0, totalReceived: 0 });
  const [poStats, setPoStats] = useState({ totalPayable: 0, totalPaid: 0 });
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const pb = getPocketBase();
      
      const orderPayments = await pb.collection('order_payments').getFullList<OrderPayment>({
        sort: '-payment_date',
        expand: 'order,order.customer',
      });
      setReceivables(orderPayments);

      const poPayments = await pb.collection('purchase_order_payments').getFullList<POPayment>({
        sort: '-payment_date',
        expand: 'purchase_order,purchase_order.supplier',
      });
      setPayables(poPayments);

      const orders = await pb.collection('so').getFullList({
        filter: 'status != "cancelled"',
      });
      const totalReceivable = orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0);
      const totalReceived = orderPayments
        .filter(p => p.status === 'approved')
        .reduce((sum, p) => sum + p.amount, 0);
      setOrderStats({ totalReceivable, totalReceived });

      const pos = await pb.collection('po').getFullList({
        filter: 'status != "cancelled"',
      });
      const totalPayable = pos.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0);
      const totalPaid = poPayments.reduce((sum, p) => sum + p.amount, 0);
      setPoStats({ totalPayable, totalPaid });

    } catch (error) {
      console.error('Failed to load payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const receivableStats = useMemo(() => {
    const pending = receivables.filter((r) => r.status === 'pending');
    const approved = receivables.filter((r) => r.status === 'approved');
    return {
      total: receivables.length,
      pending: pending.length,
      approved: approved.length,
      pendingAmount: pending.reduce((sum, r) => sum + r.amount, 0),
    };
  }, [receivables]);

  const payableStats = useMemo(() => {
    // purchase_order_payments doesn't have a status field, all records are considered paid
    return {
      total: payables.length,
      pending: 0,
      paid: payables.length,
      pendingAmount: 0,
    };
  }, [payables]);

  const handleApprovePayment = async (payment: OrderPayment) => {
    try {
      const pb = getPocketBase();
      const currentUser = pb.authStore.model;
      await pb.collection('order_payments').update(payment.id, {
        status: 'approved',
        approved_by: currentUser?.id,
        approved_at: new Date().toISOString(),
      });
      
      const updatedPayments = await pb.collection('order_payments').getFullList<OrderPayment>({
        filter: `order = "${payment.order}" && status = "approved"`,
      });
      const newPaidAmount = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
      await pb.collection('so').update(payment.order, { paid_amount: newPaidAmount });
      
      toast({
        title: t('common.success'),
        description: t('payments.approvedSuccess'),
      });
      loadData();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openRejectDialog = (paymentId: string) => {
    setRejectingPaymentId(paymentId);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectPayment = async () => {
    if (!rejectingPaymentId) return;
    
    try {
      const pb = getPocketBase();
      await pb.collection('order_payments').update(rejectingPaymentId, {
        status: 'rejected',
        rejection_reason: rejectReason || undefined,
      });
      toast({
        title: t('common.success'),
        description: locale === 'zh' ? '收款已拒绝' : 'Payment rejected',
      });
      setRejectDialogOpen(false);
      setRejectingPaymentId(null);
      setRejectReason('');
      loadData();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };


  // Receivables columns
  const receivablesColumns: ColumnDef<OrderPayment>[] = useMemo(() => [
    {
      accessorKey: 'order',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === 'zh' ? '订单号' : 'Order'} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.expand?.order?.code || '-'}</span>
      ),
    },
    {
      accessorKey: 'customer',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === 'zh' ? '客户' : 'Customer'} />
      ),
      cell: ({ row }) => row.original.expand?.order?.expand?.customer?.name || '-',
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === 'zh' ? '金额' : 'Amount'} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.currency} {row.original.amount.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'payment_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === 'zh' ? '付款日期' : 'Payment Date'} />
      ),
      cell: ({ row }) => new Date(row.original.payment_date).toLocaleDateString(),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === 'zh' ? '状态' : 'Status'} />
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge className={
            status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
            status === 'approved' ? 'bg-green-100 text-green-800' : 
            'bg-red-100 text-red-800'
          }>
            {status === 'pending' ? (locale === 'zh' ? '待审核' : 'Pending') : 
             status === 'approved' ? (locale === 'zh' ? '已审核' : 'Approved') : 
             (locale === 'zh' ? '已拒绝' : 'Rejected')}
          </Badge>
        );
      },
      filterFn: (row, id, value) => value.includes(row.getValue(id)),
    },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/orders/${row.original.order}`)}
            title={locale === 'zh' ? '查看订单' : 'View Order'}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.status === 'pending' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleApprovePayment(row.original)}
                title={locale === 'zh' ? '审核通过' : 'Approve'}
              >
                <CheckCircle className="h-4 w-4 text-green-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => openRejectDialog(row.original.id)}
                title={locale === 'zh' ? '拒绝' : 'Reject'}
              >
                <XCircle className="h-4 w-4 text-red-500" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ], [locale, router, t]);

  // Payables columns
  const payablesColumns: ColumnDef<POPayment>[] = useMemo(() => [
    {
      accessorKey: 'purchase_order',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === 'zh' ? '采购单号' : 'PO Number'} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.expand?.purchase_order?.code || '-'}</span>
      ),
    },
    {
      accessorKey: 'supplier',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === 'zh' ? '供应商' : 'Supplier'} />
      ),
      cell: ({ row }) => row.original.expand?.purchase_order?.expand?.supplier?.name || '-',
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === 'zh' ? '类型' : 'Type'} />
      ),
      cell: ({ row }) => {
        const type = row.original.type;
        const typeLabels: Record<string, string> = {
          deposit: locale === 'zh' ? '预付款' : 'Deposit',
          progress: locale === 'zh' ? '进度款' : 'Progress',
          final: locale === 'zh' ? '尾款' : 'Final',
        };
        return <Badge variant="outline">{typeLabels[type || ''] || type || '-'}</Badge>;
      },
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === 'zh' ? '金额' : 'Amount'} />
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.currency} {row.original.amount.toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'payment_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={locale === 'zh' ? '付款日期' : 'Payment Date'} />
      ),
      cell: ({ row }) => new Date(row.original.payment_date).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: t('common.actions'),
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push(`/po/${row.original.purchase_order}`)}
          title={locale === 'zh' ? '查看采购单' : 'View PO'}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ], [locale, router, t]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('payments.title') || '财务管理'}</h1>
            <p className="text-muted-foreground mt-1">{t('payments.description') || '管理应收款和应付款'}</p>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <TrendingUp className="h-5 w-5" />
                {locale === 'zh' ? '应收款概览' : 'Receivables Overview'}
              </CardTitle>
              <BarChart3 className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-green-700">{locale === 'zh' ? '订单总额' : 'Total Orders'}</p>
                <p className="text-2xl font-bold text-green-800">USD {orderStats.totalReceivable.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-green-700">{locale === 'zh' ? '已收款' : 'Received'}</p>
                <p className="text-2xl font-bold text-green-800">USD {orderStats.totalReceived.toLocaleString()}</p>
              </div>
            </div>
            <div className="h-2 bg-green-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all" 
                style={{ width: `${orderStats.totalReceivable > 0 ? (orderStats.totalReceived / orderStats.totalReceivable) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-green-700">
              {locale === 'zh' ? '待收款' : 'Outstanding'}: USD {(orderStats.totalReceivable - orderStats.totalReceived).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <TrendingDown className="h-5 w-5" />
                {locale === 'zh' ? '应付款概览' : 'Payables Overview'}
              </CardTitle>
              <BarChart3 className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-red-700">{locale === 'zh' ? '采购总额' : 'Total POs'}</p>
                <p className="text-2xl font-bold text-red-800">CNY {poStats.totalPayable.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-red-700">{locale === 'zh' ? '已付款' : 'Paid'}</p>
                <p className="text-2xl font-bold text-red-800">CNY {poStats.totalPaid.toLocaleString()}</p>
              </div>
            </div>
            <div className="h-2 bg-red-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all" 
                style={{ width: `${poStats.totalPayable > 0 ? (poStats.totalPaid / poStats.totalPayable) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-red-700">
              {locale === 'zh' ? '待付款' : 'Outstanding'}: CNY {(poStats.totalPayable - poStats.totalPaid).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="receivables">
            <ArrowDownCircle className="mr-2 h-4 w-4 text-green-500" />
            {locale === 'zh' ? '应收款' : 'Receivables'}
          </TabsTrigger>
          <TabsTrigger value="payables">
            <ArrowUpCircle className="mr-2 h-4 w-4 text-red-500" />
            {locale === 'zh' ? '应付款' : 'Payables'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{locale === 'zh' ? '收款记录' : 'Records'}</CardDescription>
                <CardTitle className="text-3xl">{receivableStats.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{locale === 'zh' ? '待审核' : 'Pending'}</CardDescription>
                <CardTitle className="text-3xl">{receivableStats.pending}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{locale === 'zh' ? '已审核' : 'Approved'}</CardDescription>
                <CardTitle className="text-3xl">{receivableStats.approved}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{locale === 'zh' ? '待审核金额' : 'Pending Amount'}</CardDescription>
                <CardTitle className="text-2xl">USD {receivableStats.pendingAmount.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* DataTable */}
          <Card>
            <CardHeader>
              <CardTitle>{locale === 'zh' ? '应收款列表' : 'Receivables List'}</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={receivablesColumns}
                data={receivables}
                filterableColumns={[
                  {
                    id: 'status',
                    title: locale === 'zh' ? '状态' : 'Status',
                    options: [
                      { label: locale === 'zh' ? '待审核' : 'Pending', value: 'pending' },
                      { label: locale === 'zh' ? '已审核' : 'Approved', value: 'approved' },
                      { label: locale === 'zh' ? '已拒绝' : 'Rejected', value: 'rejected' },
                    ],
                  },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payables" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{locale === 'zh' ? '付款记录' : 'Records'}</CardDescription>
                <CardTitle className="text-3xl">{payableStats.total}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{locale === 'zh' ? '待付款' : 'Pending'}</CardDescription>
                <CardTitle className="text-3xl">{payableStats.pending}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{locale === 'zh' ? '已付款' : 'Paid'}</CardDescription>
                <CardTitle className="text-3xl">{payableStats.paid}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{locale === 'zh' ? '待付金额' : 'Pending Amount'}</CardDescription>
                <CardTitle className="text-2xl">CNY {payableStats.pendingAmount.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* DataTable */}
          <Card>
            <CardHeader>
              <CardTitle>{locale === 'zh' ? '应付款列表' : 'Payables List'}</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={payablesColumns}
                data={payables}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reject Payment Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{locale === 'zh' ? '拒绝收款' : 'Reject Payment'}</DialogTitle>
            <DialogDescription>
              {locale === 'zh' ? '请输入拒绝原因（可选）' : 'Please enter rejection reason (optional)'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '拒绝原因' : 'Rejection Reason'}</Label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={locale === 'zh' ? '例如：金额不符、凭证不清晰等' : 'e.g., Amount mismatch, unclear receipt'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRejectPayment}>
              {locale === 'zh' ? '确认拒绝' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
