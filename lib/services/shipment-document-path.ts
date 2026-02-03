/**
 * 发货单据路径生成工具
 * 
 * 基于约定优于配置的原则，通过业务数据动态生成 S3 存储路径
 * 不在数据库存储文件路径，完全依赖目录结构
 */

// 订单级别单据类型 (英文目录名)
export const ORDER_DOCUMENT_TYPES = ['PI', 'contracts', 'payment_receipts'] as const;
export type OrderDocumentType = typeof ORDER_DOCUMENT_TYPES[number];

// 采购订单级别单据类型 (英文目录名)
export const PO_DOCUMENT_TYPES = ['PO', 'invoices', 'receipts'] as const;
export type PODocumentType = typeof PO_DOCUMENT_TYPES[number];

// 发货级别单据类型 (7种，英文目录名)
export const SHIPMENT_DOCUMENT_TYPES = [
  'transport_docs',  // 国内运输单据
  'CI',              // 商业发票
  'PL',              // 装箱单
  'BL',              // 提单
  'customs_dec',     // 报关单
  'tax_refund',      // 退税联（盖章）
  'pod',             // 签收单 (Proof of Delivery)
] as const;
export type ShipmentDocumentType = typeof SHIPMENT_DOCUMENT_TYPES[number];

// 单据类型显示名称 (用于 UI 展示)
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  // 订单级别单据
  'PI': '形式发票 (PI)',
  'contracts': '合同',
  'payment_receipts': '收款凭证',
  // 采购订单级别单据
  'PO': '采购订单 (PO)',
  'invoices': '供应商发票',
  'receipts': '付款凭证',
  // 发货级别单据 (7种)
  'transport_docs': '国内运输单据',
  'CI': '商业发票 (CI)',
  'PL': '装箱单 (PL)',
  'BL': '提单 (B/L)',
  'customs_dec': '报关单',
  'tax_refund': '退税联（盖章）',
  'pod': '签收单 (POD)',
};

export interface OrderPathInfo {
  customerName: string;
  projectName: string;
  orderCode: string;
}

/**
 * 生成订单级别单据路径
 * 格式: Customers/{客户名}/{项目名}/orders/{订单号}/{单据类型}
 */
export function getOrderDocumentPath(
  info: OrderPathInfo,
  docType: OrderDocumentType
): string {
  const { customerName, projectName, orderCode } = info;
  return `Customers/${sanitizePath(customerName)}/${sanitizePath(projectName)}/orders/${sanitizePath(orderCode)}/${docType}`;
}

/**
 * 生成采购订单级别单据路径
 * 格式: Customers/{客户名}/{项目名}/orders/{订单号}/PurchaseOrders/{供应商名}
 */
export function getPODocumentPath(
  info: OrderPathInfo,
  supplierName: string
): string {
  const { customerName, projectName, orderCode } = info;
  return `Customers/${sanitizePath(customerName)}/${sanitizePath(projectName)}/orders/${sanitizePath(orderCode)}/PurchaseOrders/${sanitizePath(supplierName)}`;
}

/**
 * 生成发货级别单据路径
 * 格式: Customers/{客户名}/{项目名}/orders/{订单号}/shipments_{序号}/{单据类型}
 */
export function getShipmentDocumentPath(
  info: OrderPathInfo,
  shipmentIndex: number,
  docType: ShipmentDocumentType
): string {
  const { customerName, projectName, orderCode } = info;
  return `Customers/${sanitizePath(customerName)}/${sanitizePath(projectName)}/orders/${sanitizePath(orderCode)}/shipments_${shipmentIndex}/${docType}`;
}

/**
 * 生成完整的文件上传路径
 */
export function getDocumentUploadPath(
  info: OrderPathInfo,
  docType: OrderDocumentType | ShipmentDocumentType,
  filename: string,
  shipmentIndex?: number
): string {
  const basePath = shipmentIndex !== undefined
    ? getShipmentDocumentPath(info, shipmentIndex, docType as ShipmentDocumentType)
    : getOrderDocumentPath(info, docType as OrderDocumentType);
  
  return `${basePath}${sanitizeFilename(filename)}`;
}

/**
 * 清理路径中的特殊字符
 * 注意：保留空格，因为 S3 支持空格
 */
function sanitizePath(str: string): string {
  return str
    .replace(/[\/\\:*?"<>|]/g, '_')  // 替换文件系统不允许的字符
    // .replace(/\s+/g, '_')          // 不替换空格，S3 支持空格
    .trim();
}

/**
 * 清理文件名
 */
function sanitizeFilename(filename: string): string {
  // 保留文件扩展名
  const ext = filename.lastIndexOf('.') > 0 
    ? filename.slice(filename.lastIndexOf('.')) 
    : '';
  const name = filename.lastIndexOf('.') > 0 
    ? filename.slice(0, filename.lastIndexOf('.')) 
    : filename;
  
  return sanitizePath(name) + ext;
}

/**
 * 从订单数据中提取路径信息
 */
export function extractOrderPathInfo(order: {
  code: string;
  expand?: {
    customer?: { name: string };
    project?: { name: string };
  };
}): OrderPathInfo | null {
  const customerName = order.expand?.customer?.name;
  const projectName = order.expand?.project?.name;
  
  if (!customerName || !projectName) {
    return null;
  }
  
  return {
    customerName,
    projectName,
    orderCode: order.code,
  };
}
