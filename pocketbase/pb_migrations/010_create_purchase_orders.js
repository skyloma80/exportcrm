/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create Purchase Order collections
 */
migrate((app) => {
  const projectsCollection = app.findCollectionByNameOrId("projects");
  const suppliersCollection = app.findCollectionByNameOrId("suppliers");
  const ordersCollection = app.findCollectionByNameOrId("orders");
  const rfqsCollection = app.findCollectionByNameOrId("rfqs");
  const productsCollection = app.findCollectionByNameOrId("products");

  // purchase_orders - 采购订单表
  const purchaseOrdersCollection = new Collection({
    name: "purchase_orders",
    type: "base",
    system: false,
    fields: [
        {
            name: "code",
            type: "text",
            required: true,
            min: 1,
            max: 20 
        },
        {
            name: "project",
            type: "relation",
            required: false,
            collectionId: projectsCollection.id,
            maxSelect: 1
        },
        {
            name: "supplier",
            type: "relation",
            required: true,
            collectionId: suppliersCollection.id,
            maxSelect: 1
        },
        {
            name: "order",
            type: "relation",
            required: false,
            collectionId: ordersCollection.id,
            maxSelect: 1
        },
        {
            name: "rfq",
            type: "relation",
            required: false,
            collectionId: rfqsCollection.id,
            maxSelect: 1
        },
        {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["draft", "sent", "confirmed", "in_production", "shipped", "delivered", "completed", "cancelled"]
        },
        {
            name: "currency",
            type: "text",
            required: true,
            min: 3,
            max: 3
        },
        {
            name: "total_amount",
            type: "number",
            required: true,
            min: 0
        },
        {
            name: "paid_amount",
            type: "number",
            required: false,
            min: 0
        },
        {
            name: "expected_delivery_date",
            type: "date",
            required: false
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(purchaseOrdersCollection);

  // purchase_order_items - 采购明细表
  const purchaseOrderItemsCollection = new Collection({
    name: "purchase_order_items",
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
            name: "product",
            type: "relation",
            required: true,
            collectionId: productsCollection.id,
            maxSelect: 1
        },
        {
            name: "quantity",
            type: "number",
            required: true,
            min: 1
        },
        {
            name: "unit_price",
            type: "number",
            required: true,
            min: 0
        },
        {
            name: "amount",
            type: "number",
            required: true,
            min: 0
        },
        {
            name: "received_quantity",
            type: "number",
            required: false,
            min: 0
        },
        {
            name: "rfq_quotation",
            type: "relation",
            required: false,
            collectionId: rfqsCollection.id,
            maxSelect: 1
        },
        {
            name: "lead_time_days",
            type: "number",
            required: false,
            min: 0
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(purchaseOrderItemsCollection);

  // purchase_order_mold_items - 采购模具明细表
  const purchaseOrderMoldItemsCollection = new Collection({
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
            name: "cost",
            type: "number",
            required: true,
            min: 0
        },
        {
            name: "lead_time_days",
            type: "number",
            required: false,
            min: 0
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(purchaseOrderMoldItemsCollection);

  // purchase_order_payments - 采购付款表
  const purchaseOrderPaymentsCollection = new Collection({
    name: "purchase_order_payments",
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
            name: "type",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["deposit", "progress", "final"]
        },
        {
            name: "amount",
            type: "number",
            required: true,
            min: 0
        },
        {
            name: "currency",
            type: "text",
            required: true,
            min: 3,
            max: 3
        },
        {
            name: "payment_method",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "payment_date",
            type: "date",
            required: true
        },
        {
            name: "bank_reference",
            type: "text",
            required: false,
            max: 100
        },
        {
            name: "voucher_file",
            type: "text",
            required: false,
            max: 500
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  return app.save(purchaseOrderPaymentsCollection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("purchase_order_payments"));
  app.delete(app.findCollectionByNameOrId("purchase_order_mold_items"));
  app.delete(app.findCollectionByNameOrId("purchase_order_items"));
  return app.delete(app.findCollectionByNameOrId("purchase_orders"));
});
