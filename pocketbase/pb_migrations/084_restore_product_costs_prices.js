/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 084: Restore real product_costs prices from 2025-06-18 backup
 *
 * 修复 9 条 product_costs 记录的垃圾 tiers（43-45 个空 tier）：
 * 从 2025-06-18 备份的 project_cost_table_items 提取真实价格，
 * 每条记录设为单个有效 tier。
 */
migrate((app) => {
  function fixCost(productId, supplierId, unitPrice, leadTime) {
    try {
      var records = app.findRecordsByFilter(
        "product_costs",
        "product = '" + productId + "' && supplier = '" + supplierId + "'",
        "", 0, 0
      );
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        r.set("tiers", [{ minQty: 1, maxQty: null, unitPrice: unitPrice }]);
        r.set("currency", "CNY");
        r.set("lead_time_days", leadTime);
        r.set("moq", 1);
        r.set("valid_from", new Date().toISOString().replace("Z", "+00:00"));
        app.save(r);
        console.log("084: fixed " + productId + " price=" + unitPrice);
      }
      if (records.length === 0) {
        console.log("084: no record found for " + productId + ", skipping");
      }
    } catch (e) {
      console.log("084: error for " + productId + ": " + e);
    }
  }

    fixCost("k2jbxjl72nmuixe", "fpkc5aomf7fom86", 16.5, 30);
    fixCost("zulu2uarc7sjc7q", "fpkc5aomf7fom86", 56.6, 30);
    fixCost("x5ll8zv6z5nd95s", "fpkc5aomf7fom86", 57.8, 30);
    fixCost("sokja3b4at0t5d0", "fpkc5aomf7fom86", 57.8, 30);
    fixCost("gv9j8v9hvjvm5yf", "fpkc5aomf7fom86", 56.6, 30);
    fixCost("gsqag81z9ytwo60", "fpkc5aomf7fom86", 20.1, 30);
    fixCost("eds3f1u0hekj0fi", "fpkc5aomf7fom86", 20.1, 30);
    fixCost("kw1q3kc5zcqawvu", "fpkc5aomf7fom86", 75, 30);
    fixCost("fcpik1ht6v43a2k", "fpkc5aomf7fom86", 2575, 20);
}, (app) => {
  console.log("Rollback not implemented.");
});
