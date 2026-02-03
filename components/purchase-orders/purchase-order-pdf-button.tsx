/**
 * 采购订单 PDF 下载/保存按钮
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
import { PurchaseOrderPDF, type PurchaseOrderPDFData } from '@/lib/pdf';
import { ensureFolderExists } from '@/lib/disk/ensure-folder';
import { brandingService } from '@/lib/services/branding-service';
import type { DocumentBranding } from '@/lib/branding/types';
import type { PurchaseOrderWithExpand, PurchaseOrderItem, PurchaseOrderMoldItem } from '@/lib/pocketbase/services/purchase-orders';

interface PurchaseOrderPdfButtonProps {
  purchaseOrder: PurchaseOrderWithExpand;
  items?: PurchaseOrderItem[]; 
}

export function PurchaseOrderPdfButton({ purchaseOrder, items = []  }: PurchaseOrderPdfButtonProps) {
  const { toast } = useToast();
  const { isGenerating, downloadPdf, uploadPdfToDisk } = usePdfGenerator();
  const [action, setAction] = useState<'download' | 'upload' | null>(null);
  const [branding, setBranding] = useState<DocumentBranding | null>(null);

  const supplier = purchaseOrder.expand?.supplier;
  const project = purchaseOrder.expand?.project;

  // 检查是否有必要数据
  const hasRequiredData = items.length > 0 && supplier;

  // Load branding config on mount (supplier-facing = Chinese)
  useEffect(() => {
    brandingService.getDocumentBranding('supplier').then(setBranding);
  }, []);

  // 准备 PDF 数据
  const preparePdfData = (): PurchaseOrderPDFData => {
    return {
      code: purchaseOrder.code,
      created: purchaseOrder.created,
      expected_delivery_date: purchaseOrder.expected_delivery_date,
      currency: purchaseOrder.currency || 'CNY',
      total_amount: purchaseOrder.total_amount || 0,
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
        part_number: (item as any).expand?.product?.part_number,
        product_name: (item as any).expand?.product?.name,
        product_name_cn: (item as any).expand?.product?.name_cn,
        quantity: item.quantity,
        unit: (item as any).unit || '件',
        unit_price: item.unit_price,
        amount: item.amount,
      })),
     
      branding: branding || undefined,
    };
  };

  const handleDownload = async () => {
    if (!hasRequiredData) {
      toast({ 
        title: '数据不完整', 
        description: '请确保采购订单包含供应商和至少一个产品',
        variant: 'destructive' 
      });
      return;
    }
    
    setAction('download');
    try {
      const data = preparePdfData();
      const filename = `PO_${purchaseOrder.code}.pdf`;
      const success = await downloadPdf(<PurchaseOrderPDF data={data} />, filename);
      
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
        description: '请确保采购订单包含供应商和至少一个产品',
        variant: 'destructive' 
      });
      return;
    }
    
    setAction('upload');
    try {
      const data = preparePdfData();
      const filename = `${purchaseOrder.code}.pdf`;
      
      // 构建目录路径: Suppliers/{供应商名}/PurchaseOrders/
      const supplierName = supplier?.name_cn || supplier?.name || 'Unknown';
      const folder = `Suppliers/${supplierName}/PurchaseOrders`;
      
      // 确保目录存在
      await ensureFolderExists(folder);
      
      const result = await uploadPdfToDisk(<PurchaseOrderPDF data={data} />, filename, folder);
      
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

export default PurchaseOrderPdfButton;
