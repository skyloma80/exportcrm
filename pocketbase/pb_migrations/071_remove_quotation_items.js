/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 071: Remove quotation_items sub-table
 *
 * quotations 已使用 items JSON 字段存储行项，
 * quotation_items 子表已无用途，安全删除。
 */
migrate((app) => {
  try {
    const col = app.findCollectionByNameOrId("quotation_items");
    if (col) {
      app.delete(col);
      console.log("Deleted quotation_items collection");
    }
  } catch (e) {
    console.log("quotation_items collection not found, skipping");
  }
}, (app) => {
  console.log("Rollback not implemented for migration 071");
});
