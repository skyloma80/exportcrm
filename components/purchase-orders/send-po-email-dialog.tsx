/**
 * Send Purchase Order Email Dialog
 * 发送采购订单邮件对话框
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useToast } from '@/hooks/use-toast';
import { usePdfGenerator } from '@/hooks/use-pdf-generator';
import { PurchaseOrderPDF, type PurchaseOrderPDFData } from '@/lib/pdf';
import { Loader2, Send } from 'lucide-react';
import { supplierContactService } from '@/lib/pocketbase/services/suppliers';
import { brandingService } from '@/lib/services/branding-service';
import type { DocumentBranding } from '@/lib/branding/types';
import type { 
  PurchaseOrderWithExpand, 
  PurchaseOrderItem,  
} from '@/lib/pocketbase/services/purchase-orders';

interface SendPOEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrder: PurchaseOrderWithExpand;
  items: PurchaseOrderItem[];
   
  onSuccess?: () => void;
}

export function SendPOEmailDialog({
  open,
  onOpenChange,
  purchaseOrder,
  items, 
  onSuccess,
}: SendPOEmailDialogProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const { generatePdfBlob } = usePdfGenerator();
  const [isSending, setIsSending] = useState(false);
  const [branding, setBranding] = useState<DocumentBranding | null>(null);

  const supplier = purchaseOrder.expand?.supplier;
  const project = purchaseOrder.expand?.project;

  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    message: '',
  });

  // Load branding config on mount (supplier-facing)
  useEffect(() => {
    brandingService.getDocumentBranding('supplier').then(setBranding);
  }, []);

  // 格式化日期
  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 格式化金额
  const formatAmount = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
  };

  // 初始化表单数据
  useEffect(() => {
    const initFormData = async () => {
      if (!open || !supplier) return;

      let email = '';
      let contactPerson = supplier.name_cn || supplier.name;

      // 尝试获取主要联系人的邮箱
      try {
        const primaryContact = await supplierContactService.getPrimaryContact(supplier.id);
        if (primaryContact) {
          email = primaryContact.email || '';
          contactPerson = primaryContact.name || supplier.name_cn || supplier.name;
        } else {
          // 如果没有主要联系人，尝试获取第一个有邮箱的联系人
          const contacts = await supplierContactService.getBySupplier(supplier.id);
          const contactWithEmail = contacts.find(c => c.email);
          if (contactWithEmail) {
            email = contactWithEmail.email || '';
            contactPerson = contactWithEmail.name || supplier.name_cn || supplier.name;
          }
        }
      } catch (error) {
        console.error('Error fetching supplier contacts:', error);
      }

      // 生成中文邮件内容
      const emailBody = `${contactPerson} 您好，

请查收附件中的采购订单 ${purchaseOrder.code}。

订单详情：
• 订单编号：${purchaseOrder.code}
• 日期：${formatDate(purchaseOrder.created)}
• 预计交货日期：${purchaseOrder.expected_delivery_date ? formatDate(purchaseOrder.expected_delivery_date) : '待定'}
• 订单金额：${formatAmount(purchaseOrder.total_amount, purchaseOrder.currency)}

如有任何问题，请随时与我们联系。

此致
敬礼`;

      const projectName = project?.name_cn || project?.name || '';
      setFormData({
        to: email,
        subject: `采购订单 ${purchaseOrder.code}${projectName ? ` - ${projectName}` : ''}`,
        message: emailBody,
      });
    };

    initFormData();
  }, [open, supplier, purchaseOrder, project]);

  const handleSend = async () => {
    if (!formData.to) {
      toast({
        title: '请输入收件人邮箱',
        variant: 'destructive',
      });
      return;
    }

    // 验证必要数据
    if (items.length === 0) {
      toast({
        title: '数据不完整',
        description: '采购订单没有产品明细',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      // 确保 branding 数据已加载
      let brandingData = branding;
      if (!brandingData) {
        brandingData = await brandingService.getDocumentBranding('supplier');
        setBranding(brandingData);
      }

      // 构建 PDF 数据
      const pdfData: PurchaseOrderPDFData = {
        code: purchaseOrder.code,
        created: purchaseOrder.created,
        expected_delivery_date: purchaseOrder.expected_delivery_date,
        currency: purchaseOrder.currency || 'CNY',
        total_amount: purchaseOrder.total_amount,
        remarks: (purchaseOrder as any).remarks,
        supplier: supplier ? {
          name: supplier.name,
          name_cn: supplier.name_cn,
          address: (supplier as any).address,
        } : undefined,
        project: project ? {
          name: project.name,
          name_cn: project.name_cn,
          code: project.code,
        } : undefined,
        items: items.map(item => ({
          product_code: (item as any).expand?.product?.code,
          product_name: (item as any).expand?.product?.name,
          product_name_cn: (item as any).expand?.product?.name_cn,
          quantity: item.quantity,
          unit: (item as any).unit || '件',
          unit_price: item.unit_price,
          amount: item.amount,
        })),
       
        branding: brandingData || undefined,
      };

      // 生成 PDF
      const pdfBlob = await generatePdfBlob(<PurchaseOrderPDF data={pdfData} />);
      
      // 转换为 base64
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      // 发送邮件
      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formData.to,
          subject: formData.subject,
          message: formData.message,
          pdfBase64: base64,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      toast({
        title: '邮件发送成功',
        description: `采购订单已发送至 ${formData.to}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Send email error:', error);
      toast({
        title: '发送失败',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>发送采购订单</DialogTitle>
          <DialogDescription>
            将采购订单 PDF 通过邮件发送给供应商
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="to">收件人邮箱</Label>
            <Input
              id="to"
              type="email"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              placeholder="supplier@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">邮件主题</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">邮件内容</Label>
            <Textarea
              id="message"
              rows={10}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="font-mono text-sm"
            />
          </div>

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <p>📎 附件: {purchaseOrder.code}.pdf</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            取消
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            发送邮件
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SendPOEmailDialog;
