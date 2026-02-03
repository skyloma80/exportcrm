/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create Purchase Order Mold Items collection (采购订单模具费用)
 */
migrate((app) => {
  // 检查集合是否已存在
  const existing = app.findCollectionByNameOrId("purchase_order_mold_items");
  if (existing) {
    return; // 集合已存在，跳过
  }

  const purchaseOrdersCollection = app.findCollectionByNameOrId("purchase_orders");

  const collection = new Collection({
    name: "purchase_order_mold_items",
    type: "base",
    system: false,
    fields: [
        {
            name: "purchase_order",
            type: "relation",
            required: true,
            collectionId: purchaseOrdersCollection.id,
            cascadeDelete: true,
            maxSelect: 1
        },
        {
            name: "mold_type",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["die_casting", "stamping", "injection", "cnc_fixture", "forging", "extrusion"]
        },
        {
            name: "description",
            type: "text",
            required: false,
            max: 500
        },
        {
            name: "cost",
            type: "number",
            required: true,
            min: 0
        },
        {
            name: "charge_method",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["one_time", "amortized", "first_order_free"]
        },
        {
            name: "ownership",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["customer", "supplier", "shared"]
        },
        {
            name: "remarks",
            type: "text",
            required: false,
            max: 1000
        }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("purchase_order_mold_items");
  if (collection) {
    return app.delete(collection);
  }
});
