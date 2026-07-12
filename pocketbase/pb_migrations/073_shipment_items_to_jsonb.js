/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 073: Shipment items → JSONB
 *
 * 统一 JSONB 模式：shipment_items 子表数据迁移到 shipments.items JSON 字段
 */
migrate((app) => {
  const shipmentsCol = app.findCollectionByNameOrId("shipments");

  // 1. Add items JSON field
  let hasItems = false;
  for (let i = 0; i < shipmentsCol.fields.length; i++) {
    if (shipmentsCol.fields[i].name === "items") { hasItems = true; break; }
  }
  if (!hasItems) {
    shipmentsCol.fields.addAt(shipmentsCol.fields.length, new Field({
      name: "items",
      type: "json",
      required: false,
    }));
    app.save(shipmentsCol);
  }

  // 2. Migrate shipment_items → shipments.items
  const allItems = app.findRecordsByFilter("shipment_items", "1=1", "", 0, 0);
  const grouped = {};
  for (const item of allItems) {
    const shipmentId = item.get("shipment");
    if (!shipmentId) continue;
    if (!grouped[shipmentId]) grouped[shipmentId] = [];
    grouped[shipmentId].push({
      id: item.id,
      order_item: item.get("order_item") || "",
      quantity: item.get("quantity") || 0,
      packages: item.get("packages") || 0,
      gross_weight: item.get("gross_weight") || 0,
      net_weight: item.get("net_weight") || 0,
      volume: item.get("volume") || 0,
    });
  }
  for (const [shipmentId, items] of Object.entries(grouped)) {
    try {
      const s = app.findRecordById("shipments", shipmentId);
      s.set("items", items);
      app.save(s);
    } catch (e) {
      console.log("Skip shipment " + shipmentId + ": " + e.message);
    }
  }
  console.log("Migrated " + allItems.length + " shipment_items into shipments.items");

  // 3. Delete shipment_items collection
  try {
    const col = app.findCollectionByNameOrId("shipment_items");
    if (col) {
      app.delete(col);
      console.log("Deleted shipment_items collection");
    }
  } catch (e) {
    console.log("shipment_items not found, skipping");
  }
}, (app) => {
  console.log("Rollback not implemented for migration 073");
});
