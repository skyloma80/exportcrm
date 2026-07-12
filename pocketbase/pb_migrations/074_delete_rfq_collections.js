/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 074: Delete all RFQ collections
 *
 * RFQ 流程改为 agent 工作流（crm-email），不再持久化到数据库。
 * 结果直写 product_costs（成本价全局可用）。
 */
migrate((app) => {
  const toDelete = ["rfq_mold_quotations", "rfq_quotations", "rfq_suppliers", "rfqs"];
  for (const name of toDelete) {
    try {
      const col = app.findCollectionByNameOrId(name);
      if (col) {
        app.delete(col);
        console.log("Deleted collection: " + name);
      }
    } catch (e) {
      console.log("Collection " + name + " not found, skipping");
    }
  }
}, (app) => {
  console.log("Rollback not implemented for migration 074");
});
