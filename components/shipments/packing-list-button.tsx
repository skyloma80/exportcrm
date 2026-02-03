/**
 * Packing List PDF Export Button
 * 装箱单 PDF 导出按钮
 * 
 * Requirements: 4.1, 4.5
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
import { PackingListPDF, type PackingListPDFData } from '@/lib/pdf/packing-list-template';
import { ensureFolderExists } from '@/lib/disk/ensure-folder';
import { brandingService } from '@/lib/services/branding-service';
import type { DocumentBranding } from '@/lib/branding/types';
import type { ShipmentWithExpand, ShipmentItemWithExpand } from '@/lib/pocketbase/services/shipments';

interface PackingListButtonProps {
  shipment: ShipmentWithExpand;
  items: ShipmentItemWithExpand[];
}

export function PackingListButton({ shipment, items }: PackingListButtonProps) {
  const { t, locale } = useI18n();
  const { toast } = useToast();
  const { isGenerating, downloadPdf, uploadPdfToDisk } = usePdfGenerator();
  const [action, setAction] = useState<'download' | 'upload' | null>(null);
  const [branding, setBranding] = useState<DocumentBranding | null>(null);

  const order = shipment.expand?.order;
  const customer = order?.expand?.customer;
  const project = order?.expand?.project;

  // Load branding config on mount
  useEffect(() => {
    brandingService.getDocumentBranding('customer').then(setBranding);
  }, []);

  // Generate PL code from shipment code (e.g., SH-2026-00001 -> PL-2026-00001)
  const generatePLCode = () => {
    const shipmentCode = shipment.code || '';
    return shipmentCode.replace(/^SH-/, 'PL-');
  };

  // Calculate totals - Requirements: 4.4
  const calculateTotals = () => {
    let total_packages = 0;
    let total_gross_weight = 0;
    let total_net_weight = 0;
    let total_volume = 0;

    items.forEach(item => {
      total_packages += item.packages || 0;
      total_gross_weight += item.gross_weight || 0;
      total_net_weight += item.net_weight || 0;
      total_volume += item.volume || 0;
    });

    return {
      total_packages,
      total_gross_weight,
      total_net_weight,
      total_volume: total_volume > 0 ? total_volume : undefined,
    };
  };

  // Build PDF data - Requirements: 4.2, 4.3, 4.4
  const preparePdfData = (): PackingListPDFData => {
    const totals = calculateTotals();
    
    return {
      code: generatePLCode(),
      shipment_date: shipment.etd || new Date().toISOString().split('T')[0],
      shipment: {
        code: shipment.code,
        vessel_name: shipment.vessel_name,
        voyage_number: shipment.voyage_number,
        container_number: shipment.container_number,
        container_type: shipment.container_type,
        bl_number: shipment.bl_number,
      },
      order: {
        code: order?.code || '-',
      },
      // Shipper info from branding
      shipper: {
        name: branding?.primaryOffice?.name || 'Company Name',
        address: branding?.primaryOffice?.address,
      },
      // Consignee info from customer - Requirements: 4.2
      consignee: {
        name: customer?.name || '-',
        address: (customer as any)?.address,
      },
      // Items with package details - Requirements: 4.2, 4.3
      items: items.map(item => {
        const product = item.expand?.order_item?.expand?.product as any;
        // Get package dimensions if available
        const itemWithDimensions = item as any;
        const hasDimensions = itemWithDimensions.package_length && 
                              itemWithDimensions.package_width && 
                              itemWithDimensions.package_height;
        
        return {
          product_code: product?.code || '-',
          product_name: product?.name || '-',
          part_number: product?.part_number,
          quantity: item.quantity,
          unit: product?.unit || 'PCS',
          packages: item.packages || 0,
          gross_weight: item.gross_weight || 0,
          net_weight: item.net_weight || 0,
          dimensions: hasDimensions ? {
            length: itemWithDimensions.package_length,
            width: itemWithDimensions.package_width,
            height: itemWithDimensions.package_height,
          } : undefined,
          volume: item.volume,
        };
      }),
      // Totals - Requirements: 4.4
      totals,
      branding: branding || undefined,
    };
  };

  const filename = `${generatePLCode()}.pdf`;

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
      
      const success = await downloadPdf(<PackingListPDF data={data} />, filename);
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
      
      // Build folder path: Customers/{CustomerName}/{ProjectName}/Packing Lists/
      const customerName = customer?.name || 'Unknown';
      const projectName = project?.name || 'Unknown';
      const folder = `Customers/${customerName}/${projectName}/Packing Lists`;
      
      // Ensure folder exists
      await ensureFolderExists(folder);
      
      const result = await uploadPdfToDisk(<PackingListPDF data={data} />, filename, folder);
      
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
          {locale === 'zh' ? '装箱单' : 'Packing List'}
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

export default PackingListButton;
