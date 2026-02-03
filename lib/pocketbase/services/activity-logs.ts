/**
 * Activity Log Service
 * 活动日志服务
 * 
 * Tracks all system activities for audit and timeline display.
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';

// ============================================================================
// Types
// ============================================================================

export type ActivityAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'payment'
  | 'shipment'
  | 'email'
  | 'other';

export type EntityType = 
  | 'customer'
  | 'supplier'
  | 'product'
  | 'project'
  | 'rfq'
  | 'quotation'
  | 'order'
  | 'purchase_order'
  | 'invoice'
  | 'shipment'
  | 'task'
  | 'service_provider';

export interface ActivityLog extends RecordModel {
  action: ActivityAction;
  entity_type: EntityType;
  entity_id: string;
  entity_code?: string;
  user?: string;
  user_name?: string;
  description?: string;
  description_cn?: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  metadata?: Record<string, any>;
  ip_address?: string;
}

export interface ActivityLogWithExpand extends ActivityLog {
  expand?: {
    user?: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
  };
}

export interface ActivityLogCreateInput {
  action: ActivityAction;
  entity_type: EntityType;
  entity_id: string;
  entity_code?: string;
  user?: string;
  user_name?: string;
  description?: string;
  description_cn?: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  metadata?: Record<string, any>;
  ip_address?: string;
}

// ============================================================================
// Activity Log Service
// ============================================================================

class ActivityLogService extends BaseCollectionService<ActivityLog> {
  constructor() {
    super('activity_logs');
  }

  /**
   * Log an activity
   */
  async log(input: ActivityLogCreateInput): Promise<ActivityLog> {
    return this.create(input);
  }

  /**
   * Log entity creation
   */
  async logCreate(
    entityType: EntityType,
    entityId: string,
    entityCode: string,
    userId?: string,
    userName?: string,
    metadata?: Record<string, any>
  ): Promise<ActivityLog> {
    return this.log({
      action: 'create',
      entity_type: entityType,
      entity_id: entityId,
      entity_code: entityCode,
      user: userId,
      user_name: userName,
      description: `Created ${entityType} ${entityCode}`,
      description_cn: `创建了${this.getEntityTypeCn(entityType)} ${entityCode}`,
      metadata,
    });
  }

  /**
   * Log entity update
   */
  async logUpdate(
    entityType: EntityType,
    entityId: string,
    entityCode: string,
    oldValue: Record<string, any>,
    newValue: Record<string, any>,
    userId?: string,
    userName?: string
  ): Promise<ActivityLog> {
    return this.log({
      action: 'update',
      entity_type: entityType,
      entity_id: entityId,
      entity_code: entityCode,
      user: userId,
      user_name: userName,
      description: `Updated ${entityType} ${entityCode}`,
      description_cn: `更新了${this.getEntityTypeCn(entityType)} ${entityCode}`,
      old_value: oldValue,
      new_value: newValue,
    });
  }

  /**
   * Log entity deletion
   */
  async logDelete(
    entityType: EntityType,
    entityId: string,
    entityCode: string,
    userId?: string,
    userName?: string
  ): Promise<ActivityLog> {
    return this.log({
      action: 'delete',
      entity_type: entityType,
      entity_id: entityId,
      entity_code: entityCode,
      user: userId,
      user_name: userName,
      description: `Deleted ${entityType} ${entityCode}`,
      description_cn: `删除了${this.getEntityTypeCn(entityType)} ${entityCode}`,
    });
  }

  /**
   * Log status change
   */
  async logStatusChange(
    entityType: EntityType,
    entityId: string,
    entityCode: string,
    oldStatus: string,
    newStatus: string,
    userId?: string,
    userName?: string
  ): Promise<ActivityLog> {
    return this.log({
      action: 'status_change',
      entity_type: entityType,
      entity_id: entityId,
      entity_code: entityCode,
      user: userId,
      user_name: userName,
      description: `Changed status from ${oldStatus} to ${newStatus}`,
      description_cn: `状态从 ${oldStatus} 变更为 ${newStatus}`,
      old_value: { status: oldStatus },
      new_value: { status: newStatus },
    });
  }

  /**
   * Get activities for an entity
   */
  async getByEntity(
    entityType: EntityType,
    entityId: string,
    options?: { page?: number; perPage?: number }
  ): Promise<{ items: ActivityLogWithExpand[]; totalItems: number; totalPages: number }> {
    const result = await this.pb.collection('activity_logs').getList<ActivityLogWithExpand>(
      options?.page || 1,
      options?.perPage || 50,
      {
        filter: `entity_type = "${entityType}" && entity_id = "${entityId}"`,
        sort: '-id',
        expand: 'user',
      }
    );
    return {
      items: result.items,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get recent activities
   */
  async getRecent(limit: number = 20): Promise<ActivityLogWithExpand[]> {
    const result = await this.pb.collection('activity_logs').getList<ActivityLogWithExpand>(1, limit, {
      sort: '-id',
      expand: 'user',
    });
    return result.items;
  }

  /**
   * Get activities by user
   */
  async getByUser(
    userId: string,
    options?: { page?: number; perPage?: number }
  ): Promise<{ items: ActivityLogWithExpand[]; totalItems: number; totalPages: number }> {
    const result = await this.pb.collection('activity_logs').getList<ActivityLogWithExpand>(
      options?.page || 1,
      options?.perPage || 50,
      {
        filter: `user = "${userId}"`,
        sort: '-id',
        expand: 'user',
      }
    );
    return {
      items: result.items,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get entity type in Chinese
   */
  private getEntityTypeCn(entityType: EntityType): string {
    const map: Record<EntityType, string> = {
      customer: '客户',
      supplier: '供应商',
      product: '产品',
      project: '项目',
      rfq: '询价单',
      quotation: '报价单',
      order: '订单',
      purchase_order: '采购单',
      invoice: '发票',
      shipment: '发货单',
      task: '任务',
      service_provider: '服务商',
    };
    return map[entityType] || entityType;
  }
}

// ============================================================================
// Export
// ============================================================================

export const activityLogService = new ActivityLogService();
export default activityLogService;
