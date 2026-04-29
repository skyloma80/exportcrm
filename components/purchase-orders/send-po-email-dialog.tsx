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
import { Loader2, Send, Upload } from 'lucide-react';
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
  const [isSending, setIsSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
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

    if (!attachment) {
      toast({
        title: locale === 'zh' ? '请上传附件' : 'Please upload an attachment',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      // 转换为 base64
      const arrayBuffer = await attachment.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const filename = attachment.name;

      // 发送邮件
      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formData.to,
          subject: formData.subject,
          message: formData.message,
          attachmentBase64: base64,
          attachmentName: filename,
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

          <div className="space-y-2">
            <Label>上传附件 (PDF/Excel)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.xlsx,.xls"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
              />
            </div>
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
