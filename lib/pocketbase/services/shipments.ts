/**
 * Shipment Service
 * 发货服务
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';
import { codeGenerator, CODE_PREFIXES } from '@/lib/services/code-generator';

// ============================================================================
// Types
// ============================================================================

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
export type CustomsStatus = 'pending' | 'declared' | 'cleared' | 'inspected';
export type ShippingMethod = 'sea' | 'air' | 'express' | 'land';
export type ContainerType = '20GP' | '40GP' | '40HQ' | '45HQ';

export interface Shipment extends RecordModel {
  code: string;
  order: string;
  status: ShipmentStatus;
  shipping_method: string;
  carrier?: string;
  vessel_name?: string;
  voyage_number?: string;
  container_number?: string;
  container_type?: string;
  bl_number?: string;
  etd?: string;
  eta?: string;
  actual_departure?: string;
  actual_arrival?: string;
  // Customs info
  customs_status?: CustomsStatus;
  customs_declaration_no?: string;
  customs_declared_date?: string;
  customs_cleared_date?: string;
  customs_remarks?: string;
  // Photos
  photos?: string[];
  // Domestic freight cost (国内运费) - Requirements: 7.2
  domestic_freight?: number;
}

export interface ShipmentItem extends RecordModel {
  shipment: string;
  order_item: string;
  quantity: number;
  packages?: number;
  gross_weight?: number;
  net_weight?: number;
  volume?: number;
  // Package dimensions (cm) - Requirements: 4.3
  package_length?: number;
  package_width?: number;
  package_height?: number;
}

export interface ShipmentWithExpand extends Shipment {
  expand?: {
    order?: {
      id: string;
      code: string;
      customer_name?: string;
      customer_address?: string;
      project_id?: string;
      project_name?: string;
    };
    shipment_items_via_shipment?: ShipmentItemWithExpand[];
  };
}

export interface ShipmentItemWithExpand extends ShipmentItem {
  expand?: {
    order_item?: {
      id: string;
      product: string;
      quantity: number;
      expand?: {
        product?: { id: string; code: string; name: string };
      };
    };
  };
}

export interface ShipmentCreateInput {
  order: string;
  shipping_method: string;
  carrier?: string;
  vessel_name?: string;
  voyage_number?: string;
  container_number?: string;
  container_type?: string;
  bl_number?: string;
  etd?: string;
  eta?: string;
}

export interface ShipmentItemCreateInput {
  shipment: string;
  order_item: string;
  quantity: number;
  packages?: number;
  gross_weight?: number;
  net_weight?: number;
  volume?: number;
  // Package dimensions (cm) - Requirements: 4.3
  package_length?: number;
  package_width?: number;
  package_height?: number;
}

// ============================================================================
// Shipment Service
// ============================================================================

class ShipmentService extends BaseCollectionService<Shipment> {
  constructor() {
    super('shipments');
  }

  async generateCode(): Promise<string> {
    return codeGenerator.generate(CODE_PREFIXES.SHIPMENT || 'SH');
  }

  async getByCode(code: string): Promise<Shipment | null> {
    return this.getFirstListItem(`code = "${code}"`);
  }

  async getWithDetails(id: string): Promise<ShipmentWithExpand | null> {
    try {
      return await this.pb.collection('shipments').getOne<ShipmentWithExpand>(id, {
        expand: 'order,order.customer,order.project,shipment_items_via_shipment,shipment_items_via_shipment.order_item,shipment_items_via_shipment.order_item.product',
      });
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async getByOrder(orderId: string): Promise<Shipment[]> {
    return this.getFullList({
      filter: `order = "${orderId}"`,
      sort: '-id',
    });
  }

  async getByStatus(status: ShipmentStatus): Promise<Shipment[]> {
    return this.getFullList({
      filter: `status = "${status}"`,
      sort: '-id',
    });
  }

  async createShipment(data: ShipmentCreateInput): Promise<Shipment> {
    const code = await this.generateCode();
    const shipmentData = {
      ...data,
      code,
      status: 'preparing' as ShipmentStatus,
    };
    console.log('Creating shipment with data:', shipmentData);
    return this.create(shipmentData);
  }

  async updateStatus(id: string, status: ShipmentStatus): Promise<Shipment> {
    const updates: Partial<Shipment> = { status };
    
    if (status === 'in_transit' || status === 'loaded') {
      updates.actual_departure = new Date().toISOString().split('T')[0];
    }
    if (status === 'arrived' || status === 'delivered') {
      updates.actual_arrival = new Date().toISOString().split('T')[0];
    }
    
    return this.update(id, updates);
  }

  async updateCustomsStatus(id: string, customsStatus: CustomsStatus, data?: {
    customs_declaration_no?: string;
    customs_remarks?: string;
  }): Promise<Shipment> {
    const updates: Partial<Shipment> = {
      customs_status: customsStatus,
      ...data,
    };
    
    if (customsStatus === 'declared') {
      updates.customs_declared_date = new Date().toISOString().split('T')[0];
    }
    if (customsStatus === 'cleared') {
      updates.customs_cleared_date = new Date().toISOString().split('T')[0];
    }
    
    return this.update(id, updates);
  }
}

// ============================================================================
// Shipment Item Service
// ============================================================================

class ShipmentItemService extends BaseCollectionService<ShipmentItem> {
  constructor() {
    super('shipment_items', { sort: 'created' });
  }

  async getByShipment(shipmentId: string): Promise<ShipmentItemWithExpand[]> {
    return this.pb.collection('shipment_items').getFullList<ShipmentItemWithExpand>({
      filter: `shipment = "${shipmentId}"`,
      expand: 'order_item,order_item.product',
    });
  }

  async createItem(data: ShipmentItemCreateInput): Promise<ShipmentItem> {
    return this.create(data);
  }

  async getTotalShippedByOrderItem(orderItemId: string): Promise<number> {
    const items = await this.getFullList({
      filter: `order_item = "${orderItemId}"`,
    });
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }
}

// ============================================================================
// Export Services
// ============================================================================

export const shipmentService = new ShipmentService();
export const shipmentItemService = new ShipmentItemService();

export default {
  shipmentService,
  shipmentItemService,
};
