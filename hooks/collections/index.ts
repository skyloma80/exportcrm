/**
 * Collection Hooks 导出
 * 
 * 集中导出所有 collection 的 hooks
 */

import { createCollectionHook, createRecordHook, createFullListHook } from '../use-collection';
import { itemService } from '@/lib/pocketbase/services/items';

// Items Hooks
export const useItems = createCollectionHook(itemService);
export const useItem = createRecordHook(itemService);
export const useAllItems = createFullListHook(itemService);

// 导出 service 供直接使用
export { itemService };

// Re-export from individual collection files
export * from './customers';
export * from './suppliers';
export * from './products';
export * from './projects';
export * from './rfqs';
export * from './quotations';
export * from './orders';
export * from './shipments';
export * from './service-providers';
export * from './activity-logs';
