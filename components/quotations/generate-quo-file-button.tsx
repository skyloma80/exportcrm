/**
 * 生成QUO文件按钮组件
 * 用于基于报价单数据生成QUO PDF文件并保存到网盘
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, HardDrive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePdfGenerator } from '@/hooks/use-pdf-generator';
import { QuotationPDF as QuoPDF } from '@/lib/pdf/quotation-template';
import { prepareQuotationPdfData } from '@/lib/pdf/quotation-pdf-data';
import { ensureFolderExists, navigateToDisk } from '@/lib/disk/ensure-folder';
import { brandingService } from '@/lib/services/branding-service';
import { format } from 'date-fns';

interface GenerateQuoFileButtonProps {
  quotation: any;
  customer?: any;
  project?: any;
  items?: any[];
  router: any;
}

export function GenerateQuoFileButton({
  quotation,
  customer,
  project,
  items = [],
  router
}: GenerateQuoFileButtonProps) {
  const { toast } = useToast();
  const { uploadPdfToDisk } = usePdfGenerator();
  const [isGenerating, setIsGenerating] = useState(false);

  // 检查是否有必要数据
  const hasRequiredData = items.length > 0 && customer && project;

  const handleGenerateQuoFile = async () => {
    if (!hasRequiredData) {
      toast({
        title: '数据不完整',
        description: '请确保报价单包含客户、项目和至少一个产品',
        variant: 'destructive'
      });
      return;
    }

    setIsGenerating(true);
    try {
      // 加载品牌配置
      const branding = await brandingService.getDocumentBranding('customer');

      // 准备PDF数据
      const pdfData = prepareQuotationPdfData({
        quotation,
        customer,
        project,
        items,
        branding
      });

      // 生成文件名: {报价单号}-日期-当天秒数.pdf
      const now = new Date();
      const dateStr = format(now, 'yyyyMMdd');
      const seconds = Math.floor(now.getTime() / 1000) % 86400; // 当天经过的秒数
      const filename = `${quotation.code}-${dateStr}-${seconds}.pdf`;

      // 构建目录路径: Customers/{客户名}/{项目名}/quotations/{报价单号}/
      const customerName = customer?.name || 'Unknown';
      const projectName = project?.name || 'Unknown';
      const quotationCode = quotation.code; // 使用报价单code作为路径标识符
      const folder = `Customers/${customerName}/${projectName}/quotations/${quotationCode}`;

      // 确保目录存在
      await ensureFolderExists(folder);

      // 生成并上传PDF到网盘
      const result = await uploadPdfToDisk(<QuoPDF data={pdfData} />, filename, folder);

      if (result.success) {
        toast({
          title: 'QUO文件生成成功',
          description: '文件已保存到网盘',
        });

        // 自动跳转到网盘目录
        await navigateToDisk(folder, router);
      } else {
        toast({
          title: '保存失败',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Generate QUO file error:', error);
      toast({
        title: '生成失败',
        description: error.message || '生成QUO文件时发生错误',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleGenerateQuoFile}
      disabled={isGenerating || !hasRequiredData}
      className="w-full justify-start"
    >
      {isGenerating ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <HardDrive className="mr-2 h-4 w-4" />
      )}
      生成QUO文件
    </Button>
  );
}

export default GenerateQuoFileButton;