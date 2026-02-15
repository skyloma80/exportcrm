// services/customerTrackingService.ts
import { Customer, customerService } from '@/lib/pocketbase/services/customers';
import { BaseCollectionService } from '@/lib/pocketbase/base-service';

import { RecordModel } from 'pocketbase';

// 客户跟踪记录类型
export interface CustomerTracking extends RecordModel {
  id: string;
  customer_id: string;  // 关联到客户ID
  status: 'Active' | 'Lead' | 'Follow-up' | 'Onboarded';  // 客户状态
  priority: 'Low' | 'Medium' | 'High';  // 优先级
  contact_status: 'Contacted' | 'Replied' | 'No Reply';  // 联系状态
  next_action_icon: 'event' | 'schedule' | 'warning' | 'check_circle' | 'calendar' | 'clock' | 'alert_triangle' | 'check';
  next_action_text: string;  // 下次行动描述
  next_step_action: string;  // 下一步行动
  next_step_date: string;  // 下一步日期
  notes: string;  // 备注
}

// 客户活动历史类型
export interface CustomerActivity extends RecordModel {
  id: string;
  customer_tracking_id: string;  // 关联到客户跟踪记录
  user: string;  // 执行操作的用户
  description: string;  // 活动描述
  timestamp: string;  // 时间戳
  is_recent?: boolean;
}

// 客户跟踪服务类
class CustomerTrackingService extends BaseCollectionService<CustomerTracking> {
  constructor() {
    super('customer_tracking');  // 假设集合名为 customer_tracking
  }

  /**
   * 获取客户跟踪记录
   */
  async getByCustomer(customerId: string): Promise<CustomerTracking | null> {
    try {
      const records = await this.getFullList({
        filter: `customer_id = "${customerId}"`,
      });
      return records.length > 0 ? records[0] : null;
    } catch (e) {
      console.error('Error getting customer tracking:', e);
      return null;
    }
  }

  /**
   * 创建或更新客户跟踪记录
   */
  async upsertTracking(customerId: string, data: Partial<CustomerTracking>): Promise<CustomerTracking> {
    const existing = await this.getByCustomer(customerId);
    
    if (existing) {
      // 更新现有记录
      return this.update(existing.id, {
        ...data,
        customer_id: customerId,
      });
    } else {
      // 创建新记录
      return this.create({
        ...data,
        customer_id: customerId,
        status: data.status || 'Lead',
        priority: data.priority || 'Medium',
        contact_status: data.contact_status || 'Contacted',
        next_action_icon: data.next_action_icon || 'calendar',
        next_action_text: data.next_action_text !== undefined && data.next_action_text !== null ? data.next_action_text : 'No upcoming action',
        next_step_action: data.next_step_action || '',
        next_step_date: data.next_step_date || new Date().toISOString().split('T')[0],
        notes: data.notes || '',
      });
    }
  }
}

// 客户活动历史服务类
class CustomerActivityService extends BaseCollectionService<CustomerActivity> {
  constructor() {
    super('customer_activities');  // 假设集合名为 customer_activities
  }

  /**
   * 获取客户活动历史
   */
  async getByTracking(trackingId: string): Promise<CustomerActivity[]> {
    try {
      return await this.getFullList({
        filter: `customer_tracking_id = "${trackingId}"`,
        sort: '-created',  // 按创建时间倒序排列
      });
    } catch (e) {
      console.error('Error getting customer activities:', e);
      return [];
    }
  }

  /**
   * 添加客户活动
   */
  async addActivity(trackingId: string, activity: Omit<CustomerActivity, 'id' | 'created' | 'updated' | 'customer_tracking_id'>): Promise<CustomerActivity> {
    return this.create({
      ...activity,
      customer_tracking_id: trackingId,
    });
  }
}

// 创建服务实例
export const customerTrackingService = new CustomerTrackingService();
export const customerActivityService = new CustomerActivityService();

/**
 * 获取所有客户及其跟踪信息（用于跟踪视图）
 */
export const getCustomersWithTracking = async (): Promise<(Customer & { tracking?: CustomerTracking, activities?: CustomerActivity[] })[]> => {
  // 获取所有客户
  const customers = await customerService.getFullList();

  // 获取所有跟踪记录
  const trackingRecords = await customerTrackingService.getFullList();

  // 获取所有活动记录
  const activityRecords = await customerActivityService.getFullList();

  // 将跟踪记录与客户关联
  return customers.map(customer => {
    const tracking = trackingRecords.find(t => t.customer_id === customer.id);
    
    // 为每个客户获取其活动记录
    const customerActivities = tracking 
      ? activityRecords.filter(activity => activity.customer_tracking_id === tracking.id) 
      : [];

    return {
      ...customer,
      tracking,
      activities: customerActivities,
    };
  });
};

/**
 * 获取特定客户的详细信息（包括跟踪和活动）
 */
export const getCustomerWithTrackingAndActivities = async (customerId: string): Promise<(Customer & { tracking?: CustomerTracking, activities?: CustomerActivity[] }) | null> => {
  // 获取客户信息
  const customer = await customerService.getOne(customerId);
  if (!customer) return null;
  
  // 获取跟踪记录
  const tracking = await customerTrackingService.getByCustomer(customerId);
  
  // 获取活动历史
  let activities: CustomerActivity[] = [];
  if (tracking) {
    activities = await customerActivityService.getByTracking(tracking.id);
  }
  
  return {
    ...customer,
    tracking: tracking || undefined,  // 确保返回undefined而不是null
    activities,
  };
};

/**
 * 更新客户跟踪信息
 */
export const updateCustomerTracking = async (customerId: string, trackingData: Partial<CustomerTracking>): Promise<CustomerTracking> => {
  return customerTrackingService.upsertTracking(customerId, trackingData);
};

/**
 * 添加客户活动
 */
export const addCustomerActivity = async (trackingId: string, activity: Omit<CustomerActivity, 'id' | 'created' | 'updated' | 'customer_tracking_id'>): Promise<CustomerActivity> => {
  // 添加活动
  return customerActivityService.addActivity(trackingId, activity);
};

/**
 * 为指定客户创建活动历史记录
 */
export const createCustomerActivity = async (customerId: string, activity: Omit<CustomerActivity, 'id' | 'created' | 'updated' | 'customer_tracking_id'>): Promise<CustomerActivity> => {
  // 首先获取或创建跟踪记录
  let tracking = await customerTrackingService.getByCustomer(customerId);
  if (!tracking) {
    tracking = await customerTrackingService.upsertTracking(customerId, {});
  }
  
  // 添加活动
  return addCustomerActivity(tracking.id, activity);
};