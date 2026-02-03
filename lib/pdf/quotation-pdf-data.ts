/**
 * Quotation PDF Data Preparation
 * 报价单 PDF 数据准备工具
 * 
 * 统一的 PDF 数据准备逻辑，供导出和邮件发送共用
 */

import type { QuotationPDFData } from './quotation-template';
import type { DocumentBranding } from '@/lib/branding/types';

interface QuotationInput {
  code: string;
  created?: string;
  valid_until?: string;
  validity_days?: number;
  currency?: string;
  incoterm?: string;
  delivery_port?: string;
  port_of_destination?: string;
  payment_terms?: string;
  total_amount?: number;
  remarks?: string;
   delivery_time?: string;
  cost_breakdown?: Record<string, number>;  // 添加费用分解字段
  [key: string]: unknown;  // 允许额外属性
}

interface CustomerInput {
  name: string;
  address?: string;
}

interface ProjectInput {
  name: string;
  code: string;
}

interface ProductInput {
  part_number?: string;
  code?: string;
  name?: string;
  description?: string;
  unit?: string;
  pcs_per_carton?: number;
  carton_dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  carton_gross_weight?: number;
}

interface QuotationItemInput {
  product_code?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  amount: number;
  expand?: {
    product?: ProductInput;
  };
}

export interface PrepareQuotationPdfDataParams {
  quotation: QuotationInput;
  customer?: CustomerInput;
  project?: ProjectInput;
  items: QuotationItemInput[];
  branding?: DocumentBranding | null;
}

/**
 * 准备报价单 PDF 数据
 * 统一的数据准备逻辑，确保导出和邮件发送的 PDF 内容一致
 */
export function prepareQuotationPdfData({
  quotation,
  customer,
  project,
  items,
  branding,
}: PrepareQuotationPdfDataParams): QuotationPDFData {
  // 计算有效期
  const createdStr = quotation.created || new Date().toISOString();
  let validUntil = quotation.valid_until;
  if (!validUntil && quotation.validity_days) {
    const createdDate = new Date(createdStr);
    validUntil = new Date(createdDate.getTime() + quotation.validity_days * 24 * 60 * 60 * 1000).toISOString();
  }

  return {
    code: quotation.code,
    created: createdStr,
    valid_until: validUntil || '',
    currency: quotation.currency || 'USD',
    incoterm: quotation.incoterm || '',
    delivery_port: quotation.delivery_port || quotation.port_of_destination || '',
    payment_terms: quotation.payment_terms || '',
    total_amount: quotation.total_amount || 0,
    remarks: quotation.remarks,
   
    delivery_time: quotation.delivery_time,
    cost_breakdown: quotation.cost_breakdown,  // 添加费用分解
    customer: customer ? {
      name: customer.name,
      address: customer.address,
    } : undefined,
    project: project ? {
      name: project.name,
      code: project.code,
    } : undefined,
    items: items.map(item => {
      const product = item.expand?.product;
      
      // 生成包装描述：多行格式
      // 200 pcs/ctn
      // 625×490×450 cm
      // G.W: 25 kg/ctn
      const packagingLines: string[] = [];
      if (product?.pcs_per_carton) {
        packagingLines.push(`${product.pcs_per_carton} pcs/ctn`);
      }
      if (product?.carton_dimensions) {
        const d = product.carton_dimensions;
        if (d.length && d.width && d.height) {
          packagingLines.push(`${d.length}×${d.width}×${d.height} cm`);
        }
      }
      if (product?.carton_gross_weight) {
        packagingLines.push(`G.W: ${product.carton_gross_weight} kg/ctn`);
      }
      const packaging = packagingLines.length > 0 ? packagingLines.join('\n') : undefined;
      
      // Description 直接从产品表获取
      const description = product?.description || product?.name || '-';
      
      return {
        part_number: product?.part_number || '-',
        product_code: product?.code || item.product_code || '',
        product_name: description,  // PDF 模板中 product_name 对应 Description 列
        packaging,
        quantity: item.quantity,
        unit: item.unit || product?.unit || 'PCS',
        unit_price: item.unit_price,
        amount: item.amount,
      };
    }),
    branding: branding || undefined,
  };
}
