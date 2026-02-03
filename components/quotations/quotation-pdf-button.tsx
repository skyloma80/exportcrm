/**
 * 报价单 PDF 下载/保存按钮
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
import { FileDown, Loader2, HardDrive, Download, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePdfGenerator } from '@/hooks/use-pdf-generator';
import { QuotationPDF } from '@/lib/pdf';
import { prepareQuotationPdfData } from '@/lib/pdf/quotation-pdf-data';
import { ensureFolderExists } from '@/lib/disk/ensure-folder';
import { brandingService } from '@/lib/services/branding-service';
import type { DocumentBranding } from '@/lib/branding/types';

interface QuotationPdfButtonProps {
  quotation: any;
  customer?: any;
  project?: any;
  items?: any[]; 
}

export function QuotationPdfButton({ quotation, customer, project, items = []   }: QuotationPdfButtonProps) {
  const { toast } = useToast();
  const { isGenerating, downloadPdf, uploadPdfToDisk } = usePdfGenerator();
  const [action, setAction] = useState<'download' | 'upload' | null>(null);
  const [branding, setBranding] = useState<DocumentBranding | null>(null);

  // 检查是否有必要数据
  const hasRequiredData = items.length > 0 && customer && project;

  // Load branding config on mount
  useEffect(() => {
    brandingService.getDocumentBranding('customer').then(setBranding);
  }, []);

  const handleDownload = async () => {
    if (!hasRequiredData) {
      toast({ 
        title: '数据不完整', 
        description: '请确保报价单包含客户、项目和至少一个产品',
        variant: 'destructive' 
      });
      return;
    }
    
    setAction('download');
    try {
      const data = prepareQuotationPdfData({ quotation, customer, project, items, branding });
      const filename = `Quotation_${quotation.code}.pdf`;
      const success = await downloadPdf(<QuotationPDF data={data} />, filename);
      
      if (success) {
        toast({ title: 'PDF 已下载' });
      } else {
        toast({ title: '下载失败', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: '生成失败', description: error.message, variant: 'destructive' });
    } finally {
      setAction(null);
    }
  };

  const handleUploadToDisk = async () => {
    if (!hasRequiredData) {
      toast({ 
        title: '数据不完整', 
        description: '请确保报价单包含客户、项目和至少一个产品',
        variant: 'destructive' 
      });
      return;
    }
    
    setAction('upload');
    try {
      const data = prepareQuotationPdfData({ quotation, customer, project, items, branding });
      const filename = `${quotation.code}.pdf`;
      
      // 构建目录路径: Customers/{客户名}/{项目名}/Quotations/
      const customerName = customer?.name || 'Unknown';
      const projectName = project?.name || 'Unknown';
      const folder = `Customers/${customerName}/${projectName}/Quotations`;
      
      // 确保目录存在
      await ensureFolderExists(folder);
      
      const result = await uploadPdfToDisk(<QuotationPDF data={data} />, filename, folder);
      
      if (result.success) {
        toast({ title: 'PDF 已保存到网盘', description: `文件夹: ${folder}` });
      } else {
        toast({ title: '保存失败', description: result.error, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: '生成失败', description: error.message, variant: 'destructive' });
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
          导出 PDF
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownload} disabled={isLoading}>
          <Download className="mr-2 h-4 w-4" />
          下载到本地
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleUploadToDisk} disabled={isLoading}>
          <HardDrive className="mr-2 h-4 w-4" />
          保存到网盘
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default QuotationPdfButton;
