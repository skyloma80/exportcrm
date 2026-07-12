/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 075: Clean up remaining rfqs and rfq_items collections
 *
 * 074 删了 rfq_mold_quotations / rfq_quotations / rfq_suppliers，
 * 但 rfqs（因 070 部分执行导致 schema 不一致，findCollectionByNameOrId 失效）
 * 和 rfq_items（070 被删除）残留。直接通过 SQL 清理。
 */
migrate((app) => {
  // 1. Drop data tables
  app.deleteTable("rfqs");
  app.deleteTable("rfq_items");

  // 2. Remove from _collections metadata
  var q = app.db().newQuery("DELETE FROM _collections WHERE name IN ({:name1}, {:name2})");
  q.bind({name1: "rfqs", name2: "rfq_items"});
  q.execute();

  console.log("Cleaned up rfqs and rfq_items collections");
}, (app) => {
  console.log("Rollback not implemented for migration 075");
});
