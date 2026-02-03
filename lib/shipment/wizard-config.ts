/**
 * 发货向导步骤配置
 * 按运输方式区分不同的向导流程
 */

export type ShipmentStatus =
  | 'preparing'
  | 'booking'           // 订舱中（海运/空运）
  | 'customs_clearance' // 报关中
  | 'loaded'            // 已装柜（海运）
  | 'handed_over'       // 已交货（空运）
  | 'shipped'           // 已发货（陆运）
  | 'in_transit'        // 运输中
  | 'arrived'           // 已到港
  | 'delivered';        // 已签收

export type ShippingMethod = 'sea' | 'air' | 'land' | 'express';

export interface WizardStep {
  id: string;
  status: ShipmentStatus;
  title: string;
  description: string;
  documents?: string[];     // 需要的单据类型
  fields?: string[];        // 需要填写的字段
  photos?: boolean;         // 是否需要照片
}

// 海运向导步骤
export const SEA_WIZARD_STEPS: WizardStep[] = [
  {
    id: 'preparing',
    status: 'preparing',
    title: '准备',
    description: '确认发货明细，准备装箱单和商业发票',
    documents: ['PL', 'CI'],
  },
  {
    id: 'booking',
    status: 'booking',
    title: '订舱',
    description: '联系货代/船公司订舱，确认船期',
    fields: ['carrier', 'vessel_name', 'voyage_number', 'etd'],
  },
  {
    id: 'customs',
    status: 'customs_clearance',
    title: '报关',
    description: '提交报关资料，等待海关放行',
    documents: ['customs_dec'],
  },
  {
    id: 'loading',
    status: 'loaded',
    title: '装柜',
    description: '货物装柜，拍摄装柜照片',
    fields: ['container_number', 'container_type', 'seal_number'],
    photos: true,
  },
  {
    id: 'transit',
    status: 'in_transit',
    title: '发运',
    description: '货物已发运，获取提单',
    documents: ['BL'],
    fields: ['bl_number', 'actual_departure'],
  },
  {
    id: 'arrival',
    status: 'arrived',
    title: '到港',
    description: '货物到达目的港',
    documents: ['tax_refund'],
    fields: ['actual_arrival'],
  },
  {
    id: 'delivery',
    status: 'delivered',
    title: '签收',
    description: '客户签收确认',
  },
];

// 空运向导步骤
export const AIR_WIZARD_STEPS: WizardStep[] = [
  {
    id: 'preparing',
    status: 'preparing',
    title: '准备',
    description: '确认发货明细，准备装箱单和商业发票',
    documents: ['PL', 'CI'],
  },
  {
    id: 'booking',
    status: 'booking',
    title: '订舱',
    description: '联系货代/航空公司订舱，确认航班',
    fields: ['carrier', 'flight_number', 'etd'],
  },
  {
    id: 'customs',
    status: 'customs_clearance',
    title: '报关',
    description: '提交报关资料，等待海关放行',
    documents: ['customs_dec'],
  },
  {
    id: 'handover',
    status: 'handed_over',
    title: '交货',
    description: '货物交给货代/航空公司',
  },
  {
    id: 'transit',
    status: 'in_transit',
    title: '发运',
    description: '货物已起飞，获取空运提单',
    documents: ['BL'], // AWB
    fields: ['bl_number', 'actual_departure'],
  },
  {
    id: 'arrival',
    status: 'arrived',
    title: '到港',
    description: '货物到达目的机场',
    fields: ['actual_arrival'],
  },
  {
    id: 'delivery',
    status: 'delivered',
    title: '签收',
    description: '客户签收确认',
  },
];

// 陆运向导步骤（跨境）
export const LAND_CROSS_BORDER_WIZARD_STEPS: WizardStep[] = [
  {
    id: 'preparing',
    status: 'preparing',
    title: '准备',
    description: '确认发货明细',
  },
  {
    id: 'customs',
    status: 'customs_clearance',
    title: '报关',
    description: '提交报关资料',
    documents: ['customs_dec'],
  },
  {
    id: 'shipping',
    status: 'shipped',
    title: '发货',
    description: '货物交给物流公司',
    fields: ['carrier', 'tracking_number'],
  },
  {
    id: 'transit',
    status: 'in_transit',
    title: '运输',
    description: '货物运输中',
  },
  {
    id: 'delivery',
    status: 'delivered',
    title: '签收',
    description: '客户签收确认',
  },
];

// 陆运向导步骤（国内）
export const LAND_DOMESTIC_WIZARD_STEPS: WizardStep[] = [
  {
    id: 'preparing',
    status: 'preparing',
    title: '准备',
    description: '确认发货明细',
  },
  {
    id: 'shipping',
    status: 'shipped',
    title: '发货',
    description: '货物交给物流公司',
    fields: ['carrier', 'tracking_number'],
  },
  {
    id: 'transit',
    status: 'in_transit',
    title: '运输',
    description: '货物运输中',
  },
  {
    id: 'delivery',
    status: 'delivered',
    title: '签收',
    description: '客户签收确认',
  },
];

/**
 * 根据运输方式获取向导步骤
 */
export function getWizardSteps(
  shippingMethod: ShippingMethod,
  isCrossBorder: boolean = true
): WizardStep[] {
  switch (shippingMethod) {
    case 'sea':
      return SEA_WIZARD_STEPS;
    case 'air':
      return AIR_WIZARD_STEPS;
    case 'land':
    case 'express':
      return isCrossBorder ? LAND_CROSS_BORDER_WIZARD_STEPS : LAND_DOMESTIC_WIZARD_STEPS;
    default:
      return SEA_WIZARD_STEPS;
  }
}

/**
 * 根据当前状态获取步骤索引
 */
export function getStepIndexByStatus(
  steps: WizardStep[],
  status: ShipmentStatus
): number {
  const index = steps.findIndex(step => step.status === status);
  return index >= 0 ? index : 0;
}

/**
 * 检查是否可以编辑发货明细（只有准备中状态可以编辑）
 */
export function canEditShipmentItems(status: ShipmentStatus): boolean {
  return status === 'preparing';
}

/**
 * 获取下一个状态
 */
export function getNextStatus(
  steps: WizardStep[],
  currentStatus: ShipmentStatus
): ShipmentStatus | null {
  const currentIndex = steps.findIndex(step => step.status === currentStatus);
  if (currentIndex < 0 || currentIndex >= steps.length - 1) {
    return null;
  }
  return steps[currentIndex + 1].status;
}

/**
 * 获取上一个状态
 */
export function getPreviousStatus(
  steps: WizardStep[],
  currentStatus: ShipmentStatus
): ShipmentStatus | null {
  const currentIndex = steps.findIndex(step => step.status === currentStatus);
  if (currentIndex <= 0) {
    return null;
  }
  return steps[currentIndex - 1].status;
}

// 状态中文名称
export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  preparing: '准备中',
  booking: '订舱中',
  customs_clearance: '报关中',
  loaded: '已装柜',
  handed_over: '已交货',
  shipped: '已发货',
  in_transit: '运输中',
  arrived: '已到港',
  delivered: '已签收',
};

// 运输方式中文名称
export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  sea: '海运',
  air: '空运',
  land: '陆运',
  express: '快递',
};

// 单据类型中文名称
export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  PL: '装箱单 (PL)',
  CI: '商业发票 (CI)',
  BL: '提单 (B/L)',
  customs_dec: '报关单',
  tax_refund: '退税联（盖章）',
  transport_docs: '国内运输单据',
};
