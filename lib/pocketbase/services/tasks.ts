/**
 * Task Service
 * 任务服务
 */

import { RecordModel } from 'pocketbase';
import { BaseCollectionService } from '../base-service';

// ============================================================================
// Types
// ============================================================================

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task extends RecordModel {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  assignee?: string;
  related_type?: string;
  related_id?: string;
  completed_at?: string;
}

export interface TaskWithExpand extends Task {
  expand?: {
    assignee?: {
      id: string;
      email: string;
      name?: string;
    };
  };
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  priority: TaskPriority;
  due_date?: string;
  assignee?: string;
  related_type?: string;
  related_id?: string;
}

// ============================================================================
// Task Service
// ============================================================================

class TaskService extends BaseCollectionService<Task> {
  constructor() {
    super('tasks', { sort: '' });
  }

  async getWithDetails(id: string): Promise<TaskWithExpand | null> {
    try {
      return await this.pb.collection('tasks').getOne<TaskWithExpand>(id, {
        expand: 'assignee',
      });
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async getByStatus(status: TaskStatus): Promise<Task[]> {
    return this.getFullList({
      filter: `status = "${status}"`,
    });
  }

  async getByAssignee(assigneeId: string): Promise<Task[]> {
    return this.getFullList({
      filter: `assignee = "${assigneeId}"`,
    });
  }

  async getOverdue(): Promise<Task[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getFullList({
      filter: `due_date < "${today}" && status != "completed" && status != "cancelled"`,
    });
  }

  async getByRelated(relatedType: string, relatedId: string): Promise<Task[]> {
    return this.getFullList({
      filter: `related_type = "${relatedType}" && related_id = "${relatedId}"`,
    });
  }

  async createTask(data: TaskCreateInput): Promise<Task> {
    const pb = this.pb;
    if (!pb) {
      throw new Error("Missing or invalid collection context.");
    }
    return this.create({
      ...data,
      status: 'pending' as TaskStatus,
    });
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    const updates: Partial<Task> = { status };
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }
    return this.update(id, updates);
  }

  async complete(id: string): Promise<Task> {
    return this.updateStatus(id, 'completed');
  }

  async cancel(id: string): Promise<Task> {
    return this.updateStatus(id, 'cancelled');
  }
}

// ============================================================================
// Export Services
// ============================================================================

export const taskService = new TaskService();

export default taskService;
