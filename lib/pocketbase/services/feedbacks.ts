/**
 * Feedback Service
 * 用户反馈服务
 * 
 * 管理用户反馈的创建、查询和状态更新
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';

// ============================================================================
// Types
// ============================================================================

export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other';

export type FeedbackStatus = 
  | 'new' 
  | 'in_review' 
  | 'planned' 
  | 'in_progress' 
  | 'completed' 
  | 'declined';

export interface Feedback extends RecordModel {
  user: string;
  type: FeedbackType;
  title: string;
  description: string;
  screenshots: string[]; // S3 paths
  status: FeedbackStatus;
  admin_response?: string;
  responded_by?: string;
  responded_at?: string;
}

export interface FeedbackWithExpand extends Feedback {
  expand?: {
    user?: {
      id: string;
      name: string;
      email: string;
      avatar?: string;
    };
    responded_by?: {
      id: string;
      name: string;
    };
  };
}

export interface FeedbackCreateInput {
  user: string;
  type: FeedbackType;
  title: string;
  description: string;
  screenshots?: string[];
  status?: FeedbackStatus;
}

export interface FeedbackUpdateInput {
  status?: FeedbackStatus;
  admin_response?: string;
  responded_by?: string;
  responded_at?: string;
}

// ============================================================================
// Feedback Service
// ============================================================================

class FeedbackService extends BaseCollectionService<Feedback> {
  constructor() {
    super('feedbacks', { 
      sort: '-@rowid',
      expand: 'user,responded_by'
    });
  }

  /**
   * Create a new feedback
   */
  async createFeedback(input: FeedbackCreateInput): Promise<Feedback> {
    return this.create({
      ...input,
      status: input.status || 'new',
      screenshots: input.screenshots || [],
    });
  }

  /**
   * Get feedback by ID with expanded relations
   */
  async getById(id: string): Promise<FeedbackWithExpand> {
    return this.getOne(id, { expand: 'user,responded_by' });
  }

  /**
   * Get feedbacks by user
   */
  async getByUser(
    userId: string,
    options?: { page?: number; perPage?: number }
  ): Promise<{ items: FeedbackWithExpand[]; totalItems: number; totalPages: number }> {
    const result = await this.pb.collection('feedbacks').getList<FeedbackWithExpand>(
      options?.page || 1,
      options?.perPage || 50,
      {
        filter: `user = "${userId}"`,
        sort: '-@rowid',
        expand: 'user,responded_by',
      }
    );
    return {
      items: result.items,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  }

  /**
   * Get all feedbacks (for admin)
   */
  async getAllFeedbacks(
    options?: { 
      page?: number; 
      perPage?: number; 
      status?: FeedbackStatus;
      type?: FeedbackType;
    }
  ): Promise<{ items: FeedbackWithExpand[]; totalItems: number; totalPages: number }> {
    const filters: string[] = [];
    
    if (options?.status) {
      filters.push(`status = "${options.status}"`);
    }
    if (options?.type) {
      filters.push(`type = "${options.type}"`);
    }

    const result = await this.pb.collection('feedbacks').getList<FeedbackWithExpand>(
      options?.page || 1,
      options?.perPage || 50,
      {
        filter: filters.length > 0 ? filters.join(' && ') : '',
        sort: '-@rowid',
        expand: 'user,responded_by',
      }
    );
    return {
      items: result.items,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    };
  }

  /**
   * Update feedback status
   */
  async updateStatus(
    id: string, 
    status: FeedbackStatus, 
    adminResponse?: string,
    respondedBy?: string
  ): Promise<Feedback> {
    const updateData: FeedbackUpdateInput = { status };
    
    if (adminResponse !== undefined) {
      updateData.admin_response = adminResponse;
    }
    if (respondedBy) {
      updateData.responded_by = respondedBy;
      updateData.responded_at = new Date().toISOString();
    }

    return this.update(id, updateData);
  }

  /**
   * Add admin response
   */
  async addResponse(
    id: string,
    response: string,
    adminId: string
  ): Promise<Feedback> {
    return this.update(id, {
      admin_response: response,
      responded_by: adminId,
      responded_at: new Date().toISOString(),
    });
  }

  /**
   * Get feedback type display name
   */
  getTypeLabel(type: FeedbackType, locale: 'en' | 'zh' = 'zh'): string {
    const labels: Record<FeedbackType, { en: string; zh: string }> = {
      bug: { en: 'Bug Report', zh: 'Bug 报告' },
      feature: { en: 'Feature Request', zh: '功能建议' },
      improvement: { en: 'Improvement', zh: '改进意见' },
      other: { en: 'Other', zh: '其他' },
    };
    return labels[type]?.[locale] || type;
  }

  /**
   * Get feedback status display name
   */
  getStatusLabel(status: FeedbackStatus, locale: 'en' | 'zh' = 'zh'): string {
    const labels: Record<FeedbackStatus, { en: string; zh: string }> = {
      new: { en: 'New', zh: '新建' },
      in_review: { en: 'In Review', zh: '审核中' },
      planned: { en: 'Planned', zh: '已计划' },
      in_progress: { en: 'In Progress', zh: '进行中' },
      completed: { en: 'Completed', zh: '已完成' },
      declined: { en: 'Declined', zh: '已拒绝' },
    };
    return labels[status]?.[locale] || status;
  }
}

// ============================================================================
// Export
// ============================================================================

export const feedbackService = new FeedbackService();
export default feedbackService;
