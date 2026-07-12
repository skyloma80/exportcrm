/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 079: Fix product_costs tiers JSON key names
 *
 * 072 迁移写入产品成本的 tiers 数组时用了 min_qty/price 字段名，
 * 但前端和服务层期望 minQty/maxQty/unitPrice。此迁移修正存量数据。
 */
migrate((app) => {
  const records = app.findRecordsByFilter("product_costs", "tiers != null", "", 0, 0);
  let fixed = 0;

  for (const rec of records) {
    let tiers = rec.get("tiers");
    if (!tiers) continue;
    if (typeof tiers === "string") {
      try { tiers = JSON.parse(tiers); } catch (_) { continue; }
    }
    if (!Array.isArray(tiers)) continue;

    let changed = false;
    const fixedTiers = tiers.map((t) => {
      if (t == null) return t;
      const out = { ...t };
      // min_qty → minQty
      if ("min_qty" in out && !("minQty" in out)) {
        out.minQty = out.min_qty;
        delete out.min_qty;
        changed = true;
      }
      if (!("minQty" in out)) {
        out.minQty = 1;
        changed = true;
      }
      // max_qty → maxQty
      if ("max_qty" in out && !("maxQty" in out)) {
        out.maxQty = out.max_qty;
        delete out.max_qty;
        changed = true;
      }
      if (!("maxQty" in out)) {
        out.maxQty = null;
        changed = true;
      }
      // price → unitPrice
      if ("price" in out && !("unitPrice" in out)) {
        out.unitPrice = out.price;
        delete out.price;
        changed = true;
      }
      if (!("unitPrice" in out)) {
        out.unitPrice = 0;
        changed = true;
      }
      return out;
    });

    if (changed) {
      rec.set("tiers", fixedTiers);
      app.save(rec);
      fixed++;
    }
  }

  console.log("079: fixed " + fixed + " product_costs records (tier key names)");
}, (app) => {
  console.log("Rollback not implemented for migration 079");
});
