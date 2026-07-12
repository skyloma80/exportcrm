/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 072: Migrate project_cost_tables → product_costs
 *
 * project_cost_tables / project_cost_table_items 中的产品-供应商价格数据
 * 迁移到 product_costs 集合，再删除旧集合。
 *
 * 对每个 (product, supplier) 组合创建/更新 product_costs 记录：
 * - unit_price 存入 tiers[0].unitPrice
 * - lead_time_days、currency 直接映射
 * - valid_from 设为当前时间
 */
migrate((app) => {
  const productCostsCol = app.findCollectionByNameOrId("product_costs");

  // ---- 1. 收集 project_cost_table_items 数据 ----
  const items = app.findRecordsByFilter("project_cost_table_items", "1=1", "", 0, 0);
  console.log("Found " + items.length + " project_cost_table_items to migrate");

  // 按 (product, supplier) 分组，取最新记录
  const latest = {};
  for (const item of items) {
    const productId = item.get("product");
    const supplierId = item.get("supplier");
    if (!productId || !supplierId) continue;

    let currency = "USD";
    try {
      const ctId = item.get("cost_table");
      if (ctId) {
        const ct = app.findRecordById("project_cost_tables", ctId);
        currency = ct.get("currency") || "USD";
      }
    } catch (e) {}

    const key = productId + "::" + supplierId;
    if (!latest[key]) {
      latest[key] = {
        product: productId,
        supplier: supplierId,
        currency: currency,
        unit_price: item.get("unit_price") || 0,
        lead_time_days: item.get("lead_time_days") || 0,
      };
    }
  }

  // ---- 2. 写入 product_costs ----
  const now = new Date();
  const nowStr = now.toISOString().replace("Z", "+00:00");
  let created = 0;
  let updated = 0;

  for (const [, data] of Object.entries(latest)) {
    const existing = app.findRecordsByFilter(
      "product_costs",
      "product = '" + data.product + "' && supplier = '" + data.supplier + "' && valid_until = null",
      "", 0, 1
    );

    const tierPrice = {
      minQty: 1,
      maxQty: null,
      unitPrice: data.unit_price,
    };

    if (existing.length > 0) {
      const rec = existing[0];
      const existingTiers = rec.get("tiers");
      const tiers = existingTiers ? (typeof existingTiers === "string" ? JSON.parse(existingTiers) : existingTiers) : [];
      if (Array.isArray(tiers) && tiers.length === 0) {
        rec.set("tiers", [tierPrice]);
      }
      if (!rec.get("lead_time_days") && data.lead_time_days) {
        rec.set("lead_time_days", data.lead_time_days);
      }
      app.save(rec);
      updated++;
    } else {
      const rec = new Record(productCostsCol);
      rec.set("product", data.product);
      rec.set("supplier", data.supplier);
      rec.set("currency", data.currency);
      rec.set("lead_time_days", data.lead_time_days);
      rec.set("tiers", [tierPrice]);
      rec.set("valid_from", nowStr);
      rec.set("remarks", "Migrated from project_cost_tables");
      app.save(rec);
      created++;
    }
  }

  console.log("product_costs migration: created=" + created + ", updated=" + updated);

  // ---- 3. 删除旧集合 ----
  ["project_cost_table_items", "project_cost_tables"].forEach(function(name) {
    try {
      var col = app.findCollectionByNameOrId(name);
      if (col) {
        app.delete(col);
        console.log("Deleted " + name);
      }
    } catch (e) {
      console.log(name + " not found, skipping");
    }
  });
}, (app) => {
  console.log("Rollback not implemented for migration 072");
});
