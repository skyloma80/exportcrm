'use client';

/**
 * Payment Manager Component
 * 订单收款管理组件
 * 
 * 收款凭证按类型分目录存储：预付款、进度款、尾款
 */

import { useState, useEffect, useRef } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, DollarSign, Loader2, CheckCircle, XCircle, Clock, Upload, ImageIcon, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPocketBase } from '@/lib/pocketbase/auth';
import { CURRENCY_LIST } from '@/lib/constants/currencies';
import { orderPaymentService, orderService } from '@/lib/pocketbase/services/orders';

interface Payment {
  id: string;
  order: string;
  amount: number;
  currency: string;
  type: 'deposit' | 'progress' | 'final';
  payment_method?: string;
  status: 'pending' | 'approved' | 'rejected';
  payment_date: string;
  bank_reference?: string;
  created: string;
}

interface ReceiptFile {
  name: string;
  path: string;
  size: number;
  url: string;
  lastModified?: string;
}

interface FilesByType {
  deposit: ReceiptFile[];
  progress: ReceiptFile[];
  final: ReceiptFile[];
}

interface PaymentManagerProps {
  orderId: string;
  orderCode: string;
  customerId?: string;
  projectId?: string;
  totalAmount: number;
  currency: string;
  onPaymentAdded?: () => void;
}

const PAYMENT_TYPES = ['deposit', 'progress', 'final'] as const;
const PAYMENT_METHODS = ['bank_transfer', 'letter_of_credit', 'paypal', 'other'] as const;

export function PaymentManager({ orderId, orderCode, customerId, projectId, totalAmount, currency, onPaymentAdded }: PaymentManagerProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
    amount: '',
    currency: currency,
    type: 'deposit' as const,
    payment_method: 'bank_transfer',
    payment_date: new Date().toISOString().split('T')[0],
    bank_reference: '',
  });
  
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [filesByType, setFilesByType] = useState<FilesByType>({
    deposit: [],
    progress: [],
    final: [],
  });
  
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingPaymentId, setRejectingPaymentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [noReceiptDialogOpen, setNoReceiptDialogOpen] = useState(false);
  const [pendingApprovePayment, setPendingApprovePayment] = useState<Payment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);

  useEffect(() => {
    loadPayments();
    loadReceiptFiles();
  }, [orderId]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const pb = getPocketBase();
      const data = await pb.collection('order_payments').getFullList<Payment>({
        filter: `order = "${orderId}"`,
        sort: '-payment_date',
      });
      setPayments(data);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReceiptFiles = async () => {
    try {
      const res = await fetch(`/api/so/${orderId}/payment-receipts`);
      if (res.ok) {
        const data = await res.json();
        setFilesByType(data.filesByType || { deposit: [], progress: [], final: [] });
      }
    } catch (error) {
      console.error('Failed to load receipt files:', error);
    }
  };

  const formatCurrency = (amount: number, curr?: string) => {
    return new Intl.NumberFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
      style: 'currency',
      currency: curr || currency || 'USD',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { zh: string; en: string }> = {
      deposit: { zh: '预付款', en: 'Deposit' },
      progress: { zh: '进度款', en: 'Progress' },
      final: { zh: '尾款', en: 'Final' },
    };
    return locale === 'zh' ? labels[type]?.zh : labels[type]?.en;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast({
        title: t('common.error'),
        description: locale === 'zh' ? '请上传图片或PDF文件' : 'Please upload an image or PDF file',
        variant: 'destructive',
      });
      return;
    }
    // 验证文件大小 (最大 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t('common.error'),
        description: locale === 'zh' ? '文件大小不能超过 10MB' : 'File size cannot exceed 10MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
  };

  const openImagePreview = (url: string) => {
    setPreviewImageUrl(url);
    setPreviewDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast({
        title: t('common.error'),
        description: locale === 'zh' ? '请输入有效金额' : 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const pb = getPocketBase();
      
      // 1. 创建收款记录
      const dateObj = new Date(formData.payment_date);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const pbDate = `${year}-${month}-${day} 12:00:00`;

      const paymentData: any = {
        order: orderId,
        customer_id: customerId,
        project_id: projectId,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        type: formData.type,
        payment_method: formData.payment_method,
        payment_date: pbDate,
        bank_reference: formData.bank_reference || '',
      };

      console.log('Submitting payment data via service:', paymentData);
      
      const result = await orderPaymentService.createPayment(paymentData);
      
      console.log('Payment created:', result);

      // 2. 如果有选择文件，上传到对应类型目录
      if (selectedFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        uploadFormData.append('type', formData.type);
        
        const res = await fetch(`/api/so/${orderId}/payment-receipts`, {
          method: 'POST',
          body: uploadFormData,
        });

        if (!res.ok) {
          const err = await res.json();
          console.error('Upload error:', err);
          // 不阻止流程，只提示
          toast({
            title: locale === 'zh' ? '凭证上传失败' : 'Receipt upload failed',
            description: err.error,
            variant: 'destructive',
          });
        }
      }
      
      toast({
        title: t('common.success'),
        description: locale === 'zh' ? '收款记录已添加' : 'Payment record added',
      });
      
      // 重置表单
      setDialogOpen(false);
      setSelectedFile(null);
      setFormData({
        amount: '',
        currency: currency,
        type: 'deposit',
        payment_method: 'bank_transfer',
        payment_date: new Date().toISOString().split('T')[0],
        bank_reference: '',
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      loadPayments();
      loadReceiptFiles();
      onPaymentAdded?.();
    } catch (error: any) {
      console.error('Failed to add payment:', error);
      console.log('Error as JSON:', error.toJSON?.() || 'no toJSON');
      console.error('Error data:', error.data);
      console.error('Error response:', error.response);
      
      let errorMsg = error.message;
      if (error.data && Object.keys(error.data).length > 0) {
        errorMsg = `${error.message}: ${JSON.stringify(error.data)}`;
      } else if (error.response?.data && Object.keys(error.response.data).length > 0) {
        errorMsg = `${error.message}: ${JSON.stringify(error.response.data)}`;
      } else if (error.originalError) {
        errorMsg = `${error.message} (Original: ${JSON.stringify(error.originalError)})`;
      }
        
      toast({
        title: t('common.error'),
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleApprove = async (payment: Payment) => {
    // 所有审核都需要弹窗确认
    setPendingApprovePayment(payment);
    setNoReceiptDialogOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!pendingApprovePayment) return;
    setNoReceiptDialogOpen(false);
    await doApprove(pendingApprovePayment.id);
    setPendingApprovePayment(null);
  };

  const doApprove = async (paymentId: string) => {
    try {
      const pb = getPocketBase();
      const currentUser = pb.authStore.record;
      
      // Use service for approval (it also recalculates order paid amount)
      await orderPaymentService.approvePayment(paymentId, currentUser?.id || '');
      
      // Get current order to check status and potentially update it
      const order = await orderService.getOne(orderId);
      if (order && order.status === 'draft') {
        await orderService.update(orderId, { status: 'confirmed' });
      }
      
      toast({
        title: t('common.success'),
        description: locale === 'zh' ? '收款已审核通过' : 'Payment approved',
      });
      loadPayments();
      onPaymentAdded?.();
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

  const handleReject = async () => {
    if (!rejectingPaymentId) return;
    
    try {
      await orderPaymentService.rejectPayment(rejectingPaymentId, rejectReason);
      toast({
        title: t('common.success'),
        description: locale === 'zh' ? '收款已拒绝' : 'Payment rejected',
      });
      setRejectDialogOpen(false);
      setRejectingPaymentId(null);
      setRejectReason('');
      loadPayments();
      onPaymentAdded?.();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const openDeleteDialog = (payment: Payment) => {
    setDeletingPayment(payment);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingPayment) return;
    
    try {
      await orderPaymentService.delete(deletingPayment.id);
      
      // Also recalculate order paid amount after deletion
      await orderService.recalculatePaidAmount(orderId);
      
      toast({
        title: t('common.success'),
        description: locale === 'zh' ? '收款记录已删除' : 'Payment deleted',
      });
      setDeleteDialogOpen(false);
      setDeletingPayment(null);
      loadPayments();
      onPaymentAdded?.();
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // 渲染凭证缩略图
  const renderReceiptThumbnails = (type: 'deposit' | 'progress' | 'final') => {
    const files = filesByType[type];
    if (files.length === 0) return null;
    
    return (
      <div className="flex gap-1 flex-wrap">
        {files.slice(0, 3).map((file) => (
          <div
            key={file.path}
            className="w-8 h-8 rounded border cursor-pointer hover:border-primary transition-colors overflow-hidden"
            onClick={() => openImagePreview(file.url)}
            title={file.name}
          >
            {file.name.toLowerCase().endsWith('.pdf') ? (
              <div className="w-full h-full flex items-center justify-center bg-muted text-[8px]">PDF</div>
            ) : (
              <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
            )}
          </div>
        ))}
        {files.length > 3 && (
          <div className="w-8 h-8 rounded border flex items-center justify-center text-xs text-muted-foreground">
            +{files.length - 3}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('orders.payments.title')}
            </CardTitle>
            <CardDescription>{t('orders.payments.description')}</CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('orders.payments.add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : payments.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t('orders.payments.empty')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('orders.payments.date')}</TableHead>
                <TableHead>{t('orders.payments.type')}</TableHead>
                <TableHead>{t('orders.payments.amount')}</TableHead>
                <TableHead>{t('orders.payments.status')}</TableHead>
                <TableHead>{t('orders.payments.reference')}</TableHead>
                <TableHead className="w-24">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getTypeLabel(payment.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(payment.amount, payment.currency)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(payment.status)}>
                      {getStatusIcon(payment.status)}
                      <span className="ml-1">{t(`orders.paymentStatus.${payment.status}`)}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{payment.bank_reference || '-'}</TableCell>
                  <TableCell>
                    {payment.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleApprove(payment)}
                          title={locale === 'zh' ? '审核通过' : 'Approve'}
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openRejectDialog(payment.id)}
                          title={locale === 'zh' ? '拒绝' : 'Reject'}
                        >
                          <XCircle className="h-4 w-4 text-red-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openDeleteDialog(payment)}
                          title={locale === 'zh' ? '删除' : 'Delete'}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* 收款凭证汇总区域 */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-4">{locale === 'zh' ? '收款凭证' : 'Payment Receipts'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PAYMENT_TYPES.map((type) => (
              <div key={type} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{getTypeLabel(type)}</span>
                  <Badge variant="secondary" className="text-xs">
                    {filesByType[type].length} {locale === 'zh' ? '个文件' : 'files'}
                  </Badge>
                </div>
                {filesByType[type].length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {locale === 'zh' ? '暂无凭证' : 'No receipts'}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {filesByType[type].map((file) => (
                      <div
                        key={file.path}
                        className="aspect-square rounded border cursor-pointer hover:border-primary transition-colors overflow-hidden"
                        onClick={() => openImagePreview(file.url)}
                        title={file.name}
                      >
                        {file.name.toLowerCase().endsWith('.pdf') ? (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <span className="text-xs text-muted-foreground">PDF</span>
                          </div>
                        ) : (
                          <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Add Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('orders.payments.add')}</DialogTitle>
            <DialogDescription>
              {locale === 'zh' ? `为订单 ${orderCode} 添加收款记录` : `Add payment for order ${orderCode}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('orders.payments.amount')} *</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.amount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setFormData(prev => ({ ...prev, amount: val }));
                    }
                  }}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>{locale === 'zh' ? '币种' : 'Currency'}</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_LIST.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('orders.payments.type')}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {getTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('orders.payments.method')}</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {locale === 'zh' ? {
                          bank_transfer: '银行转账',
                          letter_of_credit: '信用证',
                          paypal: 'PayPal',
                          other: '其他',
                        }[method] : method.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('orders.payments.date')}</Label>
              <Input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('orders.payments.reference')}</Label>
              <Input
                value={formData.bank_reference}
                onChange={(e) => setFormData(prev => ({ ...prev, bank_reference: e.target.value }))}
                placeholder={locale === 'zh' ? '银行流水号' : 'Bank reference'}
              />
            </div>
            
            {/* 凭证上传 */}
            <div className="space-y-2">
              <Label>{locale === 'zh' ? '收款凭证' : 'Receipt'}</Label>
              <div className="flex items-center gap-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="receipt-file"
                />
                <Label
                  htmlFor="receipt-file"
                  className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  {locale === 'zh' ? '选择文件' : 'Choose file'}
                </Label>
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {locale === 'zh' 
                  ? `凭证将保存到"${getTypeLabel(formData.type)}"目录` 
                  : `Receipt will be saved to "${getTypeLabel(formData.type)}" folder`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button variant="destructive" onClick={handleReject}>
              {locale === 'zh' ? '确认拒绝' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={noReceiptDialogOpen} onOpenChange={setNoReceiptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{locale === 'zh' ? '确认审核' : 'Confirm Approval'}</DialogTitle>
            <DialogDescription>
              {pendingApprovePayment && filesByType[pendingApprovePayment.type].length === 0
                ? (locale === 'zh' 
                    ? `该${getTypeLabel(pendingApprovePayment?.type || 'deposit')}收款没有上传凭证，确定要审核通过吗？`
                    : `This ${getTypeLabel(pendingApprovePayment?.type || 'deposit')} payment has no receipt uploaded. Are you sure you want to approve it?`)
                : (locale === 'zh' 
                    ? `确定要审核通过这笔${getTypeLabel(pendingApprovePayment?.type || 'deposit')}收款吗？`
                    : `Are you sure you want to approve this ${getTypeLabel(pendingApprovePayment?.type || 'deposit')} payment?`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setNoReceiptDialogOpen(false);
              setPendingApprovePayment(null);
            }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleConfirmApprove}>
              {locale === 'zh' ? '确认通过' : 'Confirm Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{locale === 'zh' ? '删除收款记录' : 'Delete Payment'}</DialogTitle>
            <DialogDescription>
              {locale === 'zh' 
                ? `确定要删除这笔 ${formatCurrency(deletingPayment?.amount || 0, deletingPayment?.currency)} 的${getTypeLabel(deletingPayment?.type || 'deposit')}收款记录吗？此操作无法撤销。`
                : `Are you sure you want to delete this ${getTypeLabel(deletingPayment?.type || 'deposit')} payment of ${formatCurrency(deletingPayment?.amount || 0, deletingPayment?.currency)}? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {locale === 'zh' ? '确认删除' : 'Confirm Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{locale === 'zh' ? '收款凭证' : 'Payment Receipt'}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {previewImageUrl && (
              previewImageUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe src={previewImageUrl} className="w-full h-[70vh]" />
              ) : (
                <img
                  src={previewImageUrl}
                  alt="Receipt"
                  className="max-h-[70vh] max-w-full object-contain rounded"
                />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default PaymentManager;
