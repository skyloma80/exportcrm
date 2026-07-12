/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 078: Drop orphaned physical tables
 *
 * 065 删除了 purchase_orders 的 _collections 元数据但物理表残留，
 * quotation_mold_items 同理（旧报价模具行表）。通过 app.deleteTable() 清理。
 */
migrate((app) => {
  var names = ["purchase_orders", "quotation_mold_items"];
  for (var i = 0; i < names.length; i++) {
    try {
      app.deleteTable(names[i]);
      console.log("Dropped orphan table: " + names[i]);
    } catch (e) {
      console.log("Table " + names[i] + " not found, skipping.");
    }
    try {
      var q = app.db().newQuery("DELETE FROM _collections WHERE name = {:name}");
      q.bind({name: names[i]});
      q.execute();
      console.log("Cleaned _collections entry: " + names[i]);
    } catch (e) {
      console.log("_collections cleanup for " + names[i] + " failed or no entry.");
    }
  }
}, (app) => {
  console.log("Rollback not implemented for migration 078");
});
