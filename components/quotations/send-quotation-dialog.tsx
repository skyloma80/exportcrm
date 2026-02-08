/**
 * Send Quotation Email Dialog
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
import { QuotationPDF } from '@/lib/pdf/quotation-template';
import { prepareQuotationPdfData } from '@/lib/pdf/quotation-pdf-data';
import { Loader2, Send } from 'lucide-react';
import { customerContactService } from '@/lib/pocketbase/services/customers';
import { brandingService } from '@/lib/services/branding-service';
import type { DocumentBranding } from '@/lib/branding/types';
import type { QuotationWithExpand, QuotationItemWithExpand } from '@/lib/pocketbase/services/quotations';

interface CustomerInfo {
  id: string;
  code: string;
  name: string;
  name_cn?: string;
  email?: string;
  contact_person?: string;
  address?: string;
}

interface SendQuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: QuotationWithExpand;
  items: QuotationItemWithExpand[];
 
  customerInfo?: CustomerInfo;
  onSuccess?: () => void;
}

export function SendQuotationDialog({
  open,
  onOpenChange,
  quotation,
  items,
   
  customerInfo,
  onSuccess,
}: SendQuotationDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { generatePdfBlob } = usePdfGenerator();
  const [isSending, setIsSending] = useState(false);
  const [branding, setBranding] = useState<DocumentBranding | null>(null);

  const customer = customerInfo || quotation.expand?.customer;
  const project = quotation.expand?.project;

  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    message: '',
  });

  // Load branding config on mount
  useEffect(() => {
    brandingService.getDocumentBranding('customer').then(setBranding);
  }, []);

  // 格式化日期
  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 格式化金额
  const formatAmount = (amount: number, currency: string) => {
    return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  // 计算有效期
  const getValidUntil = () => {
    if (!quotation.validity_days) return '-';
    // 直接使用数字天数计算
    const days = quotation.validity_days;
    const validDate = new Date(new Date(quotation.created).getTime() + days * 24 * 60 * 60 * 1000);
    return formatDate(validDate.toISOString());
  };

  // 初始化表单数据
  useEffect(() => {
    const initFormData = async () => {
      if (!open || !customer) return;

      let email = '';
      let contactPerson = customer.name;

      // 尝试获取主要联系人的邮箱
      try {
        const primaryContact = await customerContactService.getPrimaryContact(customer.id);
        if (primaryContact) {
          email = primaryContact.email || '';
          contactPerson = primaryContact.name || customer.name;
        } else {
          // 如果没有主要联系人，尝试获取第一个有邮箱的联系人
          const contacts = await customerContactService.getByCustomer(customer.id);
          const contactWithEmail = contacts.find(c => c.email);
          if (contactWithEmail) {
            email = contactWithEmail.email || '';
            contactPerson = contactWithEmail.name || customer.name;
          }
        }
      } catch (error) {
        console.error('Error fetching customer contacts:', error);
      }

      // 生成符合设计模板的邮件内容
      const emailBody = `Dear ${contactPerson},

Please find attached our quotation ${quotation.code} for your review.

Quotation Details:
• Quotation No: ${quotation.code}
• Date: ${formatDate(quotation.created)}
• Valid Until: ${getValidUntil()}
• Total Amount: ${formatAmount(quotation.total_amount, quotation.currency)}

If you have any questions, please don't hesitate to contact us.

Best regards`;

      setFormData({
        to: email,
        subject: `Quotation ${quotation.code} - ${project?.name || customer.name}`,
        message: emailBody,
      });
    };

    initFormData();
  }, [open, customer, quotation, project]);

  const handleSend = async () => {
    if (!formData.to) {
      toast({
        title: t('quotations.email.errorNoRecipient'),
        variant: 'destructive',
      });
      return;
    }

    // 验证必要数据
    if (items.length === 0) {
      toast({
        title: t('validation.required'),
        description: t('quotations.email.errorNoItems'),
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);

    try {
      // 确保 branding 数据已加载
      let brandingData = branding;
      if (!brandingData) {
        brandingData = await brandingService.getDocumentBranding('customer');
        setBranding(brandingData);
      }

      // 使用共享函数构建 PDF 数据
      const pdfData = prepareQuotationPdfData({
        quotation,
        customer: customer ? {
          name: customer.name,
          address: (customer as CustomerInfo).address,
        } : undefined,
        project: project ? {
          name: project.name,
          code: project.code,
        } : undefined,
        items,
        branding: brandingData,
      });

      // 生成 PDF
      const pdfBlob = await generatePdfBlob(<QuotationPDF data={pdfData} />);
      
      // 转换为 base64
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      // 发送邮件
      const response = await fetch(`/api/quotations/${quotation.id}/send-email`, {
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
        title: t('quotations.email.success'),
        description: t('quotations.email.successDesc'),
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Send email error:', error);
      toast({
        title: t('quotations.email.error'),
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
          <DialogTitle>{t('quotations.email.title')}</DialogTitle>
          <DialogDescription>
            {t('quotations.email.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="to">{t('quotations.email.to')}</Label>
            <Input
              id="to"
              type="email"
              value={formData.to}
              onChange={(e) => setFormData({ ...formData, to: e.target.value })}
              placeholder="customer@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">{t('quotations.email.subject')}</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t('quotations.email.message')}</Label>
            <Textarea
              id="message"
              rows={10}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="font-mono text-sm"
            />
          </div>

          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <p>📎 {t('quotations.email.attachmentNote', { filename: `${quotation.code}.pdf` })}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {t('quotations.email.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
