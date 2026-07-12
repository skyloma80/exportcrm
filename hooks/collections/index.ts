/**
 * Collection Hooks 导出
 * 
 * 集中导出所有 collection 的 hooks
 */

import { createCollectionHook, createRecordHook, createFullListHook } from '../use-collection';

// Re-export from individual collection files
export * from './customers';
export * from './suppliers';
export * from './products';
export * from './projects';
export * from './quotations';
export * from './orders';
export * from './shipments';
export * from './service-providers';
export * from './activity-logs';
