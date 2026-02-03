/**
 * Commercial Invoice PDF Export Button
 * 商业发票 PDF 导出按钮
 * 
 * Requirements: 3.1, 3.5
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileDown, Download, HardDrive, Loader2, ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useToast } from '@/hooks/use-toast';
import { usePdfGenerator } from '@/hooks/use-pdf-generator';
// import { CommercialInvoicePDF, type CommercialInvoicePDFData } from '@/lib/pdf/commercial-invoice-template';
import { ensureFolderExists } from '@/lib/disk/ensure-folder';
import { brandingService } from '@/lib/services/branding-service';
import { getPocketBase } from '@/lib/pocketbase/auth';
import type { DocumentBranding } from '@/lib/branding/types';
import type { OrderWithExpand } from '@/lib/pocketbase/services/orders';

interface CommercialInvoiceButtonProps {
  order: OrderWithExpand;
}

export function CommercialInvoiceButton({ order }: CommercialInvoiceButtonProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const { isGenerating, downloadPdf, uploadPdfToDisk } = usePdfGenerator();
  const [action, setAction] = useState<'download' | 'upload' | null>(null);
  const [branding, setBranding] = useState<DocumentBranding | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);

  const customer = order.expand?.customer;
  const project = order.expand?.project;

  // Load branding config and order items on mount
  useEffect(() => {
    brandingService.getDocumentBranding('customer').then(setBranding);
    
    // Load order items
    if (order?.id) {
      const pb = getPocketBase();
      pb.collection('order_items').getFullList({
        filter: `order = "${order.id}"`,
        expand: 'product',
      }).then(setOrderItems).catch(console.error);
    }
  }, [order?.id]);

  // Generate CI code from order code (e.g., ORD-2026-00001 -> CI-2026-00001)
  const generateCICode = () => {
    const orderCode = order.code || '';
    return orderCode.replace(/^ORD-/, 'CI-');
  };

  // Build PDF data (Requirements: 3.2, 3.3, 3.4)
  const preparePdfData = (): any => { // CommercialInvoicePDFData
    // Extract bank info from order
    const bankInfo = order.bank_info as Record<string, string> | undefined;
    
    return {
      code: generateCICode(),
      issue_date: new Date().toISOString(),
      currency: order.currency,
      total_amount: order.total_amount,
      remarks: order.remarks,
      order: {
        code: order.code,
        incoterm: order.incoterm,
        port_of_loading: order.port_of_loading,
        port_of_destination: order.port_of_destination,
        payment_terms: order.payment_terms,
      },
      // Requirements: 3.3 - Customer info with tax_id
      customer: customer ? {
        name: customer.name,
        address: (customer as any).address,
        tax_id: (customer as any).tax_id,
        contact_person: (customer as any).contact_person,
        phone: (customer as any).phone,
        email: (customer as any).email,
      } : undefined,
      project: project ? {
        name: project.name,
        code: project.code,
      } : undefined,
      // Requirements: 3.2 - Order product details
      items: orderItems.map(item => ({
        part_number: item.expand?.product?.part_number || '-',
        product_code: item.expand?.product?.code || item.product_code,
        product_name: item.expand?.product?.name || item.product_name,
        quantity: item.quantity,
        unit: item.expand?.product?.unit || item.unit || 'PCS',
        unit_price: item.unit_price,
        amount: item.amount || (item.quantity * item.unit_price),
      })),
      // Requirements: 3.4 - Bank account info
      bank_info: bankInfo ? {
        bank_name: bankInfo.bank_name,
        account_name: bankInfo.account_name,
        account_number: bankInfo.account_number,
        swift_code: bankInfo.swift_code,
        bank_address: bankInfo.bank_address,
      } : undefined,
     
      branding: branding || undefined,
    };
  };

  const filename = `${generateCICode()}.pdf`;

  const handleDownload = async () => {
    setAction('download');
    try {
      // Ensure branding data is loaded
      let brandingData = branding;
      if (!brandingData) {
        brandingData = await brandingService.getDocumentBranding('customer');
        setBranding(brandingData);
      }
      
      const data = preparePdfData();
      data.branding = brandingData || undefined;
      
      // const success = await downloadPdf(<CommercialInvoicePDF data={data} />, filename);
      throw new Error('CommercialInvoicePDF is currently disabled');
      if (success) {
        toast({ title: t('pdf.downloadSuccess') });
      }
    } catch (error: any) {
      console.error('PDF download error:', error);
      toast({ title: t('pdf.downloadError'), variant: 'destructive' });
    } finally {
      setAction(null);
    }
  };

  const handleUpload = async () => {
    setAction('upload');
    try {
      // Ensure branding data is loaded
      let brandingData = branding;
      if (!brandingData) {
        brandingData = await brandingService.getDocumentBranding('customer');
        setBranding(brandingData);
      }
      
      const data = preparePdfData();
      data.branding = brandingData || undefined;
      
      // Build folder path: Customers/{CustomerName}/{ProjectName}/Commercial Invoices/
      const customerName = customer?.name || 'Unknown';
      const projectName = project?.name || 'Unknown';
      const folder = `Customers/${customerName}/${projectName}/Commercial Invoices`;
      
      // Ensure folder exists
      await ensureFolderExists(folder);
      
      // const result = await uploadPdfToDisk(<CommercialInvoicePDF data={data} />, filename, folder);
      throw new Error('CommercialInvoicePDF is currently disabled');
      
      if (result.success) {
        toast({ title: t('pdf.uploadSuccess'), description: `${t('pdf.folder')}: ${folder}` });
      } else {
        toast({ title: t('pdf.uploadError'), description: result.error, variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('PDF upload error:', error);
      toast({ title: t('pdf.uploadError'), variant: 'destructive' });
    } finally {
      setAction(null);
    }
  };

  const isLoading = isGenerating || action !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          {locale === 'zh' ? '商业发票' : 'Commercial Invoice'}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleDownload} disabled={isLoading}>
          <Download className="mr-2 h-4 w-4" />
          {t('pdf.downloadLocal')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleUpload} disabled={isLoading}>
          <HardDrive className="mr-2 h-4 w-4" />
          {t('pdf.saveToDisk')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default CommercialInvoiceButton;
