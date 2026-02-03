/**
 * Items 服务示例
 * 
 * 演示如何使用 BaseCollectionService 创建具体的服务类
 */

import { BaseCollectionService } from '../base-service';
import type { RecordModel } from 'pocketbase';

// 定义 Item 类型
export interface Item extends RecordModel {
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'pending';
}

// 创建 Items 服务
class ItemService extends BaseCollectionService<Item> {
  constructor() {
    super('items');
  }

  // 自定义方法：按状态获取
  async getByStatus(status: string): Promise<Item[]> {
    return this.getFullList({
      filter: `status = "${status}"`,
    });
  }

  // 自定义方法：搜索
  async search(query: string): Promise<Item[]> {
    return this.getFullList({
      filter: `name ~ "${query}" || description ~ "${query}"`,
    });
  }
}

// 导出单例
export const itemService = new ItemService();
