/**
 * 发货数量计算工具
 * 用于计算订单项的已发数量、剩余可发数量，以及验证发货数量
 */

export interface ShippedQuantityResult {
  orderItemId: string;
  productId: string;
  productName: string;
  productCode: string;
  orderedQuantity: number;
  shippedQuantity: number;
  remainingQuantity: number;
}

export interface SelectedItem {
  orderItemId: string;
  quantity: number;
  packages?: number;
  grossWeight?: number;
  netWeight?: number;
}

export interface OrderItem {
  id: string;
  product: string;
  quantity: number;
  expand?: {
    product?: {
      id: string;
      name: string;
      code: string;
    };
  };
}

export interface ShipmentItem {
  id: string;
  shipment: string;
  order_item: string;
  quantity: number;
}

/**
 * 计算订单所有项的发货数量统计
 * @param orderItems 订单项列表
 * @param shipmentItems 所有发货明细（可选排除某个发货记录）
 * @param excludeShipmentId 排除的发货记录ID（用于编辑时）
 */
export function calculateShippedQuantities(
  orderItems: OrderItem[],
  shipmentItems: ShipmentItem[],
  excludeShipmentId?: string
): ShippedQuantityResult[] {
  // 过滤掉要排除的发货记录
  const filteredShipmentItems = excludeShipmentId
    ? shipmentItems.filter(item => item.shipment !== excludeShipmentId)
    : shipmentItems;

  // 按 order_item 汇总已发数量
  const shippedMap = new Map<string, number>();
  for (const item of filteredShipmentItems) {
    const current = shippedMap.get(item.order_item) || 0;
    shippedMap.set(item.order_item, current + item.quantity);
  }

  // 计算每个订单项的剩余可发数量
  return orderItems.map(oi => {
    const shippedQuantity = shippedMap.get(oi.id) || 0;
    return {
      orderItemId: oi.id,
      productId: oi.expand?.product?.id || oi.product,
      productName: oi.expand?.product?.name || '',
      productCode: oi.expand?.product?.code || '',
      orderedQuantity: oi.quantity,
      shippedQuantity,
      remainingQuantity: oi.quantity - shippedQuantity,
    };
  });
}

/**
 * 验证发货数量是否有效
 * @param items 要发货的项目列表
 * @param shippedQuantities 已发数量统计
 * @returns 错误信息，如果有效则返回 null
 */
export function validateShipmentQuantities(
  items: SelectedItem[],
  shippedQuantities: ShippedQuantityResult[]
): string | null {
  for (const item of items) {
    const stats = shippedQuantities.find(sq => sq.orderItemId === item.orderItemId);
    if (!stats) {
      return `订单项 ${item.orderItemId} 不存在`;
    }

    if (item.quantity <= 0) {
      return `发货数量必须大于0`;
    }

    if (item.quantity > stats.remainingQuantity) {
      return `${stats.productName || '产品'} 发货数量(${item.quantity})超过剩余可发数量(${stats.remainingQuantity})`;
    }
  }
  return null;
}

/**
 * 检查订单是否已完全发货
 * @param shippedQuantities 已发数量统计
 * @returns 是否所有订单项都已完全发货
 */
export function isOrderFullyShipped(shippedQuantities: ShippedQuantityResult[]): boolean {
  return shippedQuantities.every(sq => sq.remainingQuantity <= 0);
}

/**
 * 计算发货明细汇总
 * @param items 发货明细列表
 */
export function calculateShipmentSummary(items: SelectedItem[]): {
  totalQuantity: number;
  totalPackages: number;
  totalGrossWeight: number;
  totalNetWeight: number;
} {
  return items.reduce(
    (acc, item) => ({
      totalQuantity: acc.totalQuantity + item.quantity,
      totalPackages: acc.totalPackages + (item.packages || 0),
      totalGrossWeight: acc.totalGrossWeight + (item.grossWeight || 0),
      totalNetWeight: acc.totalNetWeight + (item.netWeight || 0),
    }),
    { totalQuantity: 0, totalPackages: 0, totalGrossWeight: 0, totalNetWeight: 0 }
  );
}

/**
 * 获取未完全发货的订单项
 * @param shippedQuantities 已发数量统计
 * @returns 剩余可发数量大于0的订单项
 */
export function getUnshippedItems(
  shippedQuantities: ShippedQuantityResult[]
): ShippedQuantityResult[] {
  return shippedQuantities.filter(sq => sq.remainingQuantity > 0);
}
