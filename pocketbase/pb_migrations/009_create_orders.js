/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create Order collections
 */
migrate((app) => {
  const projectsCollection = app.findCollectionByNameOrId("projects");
  const customersCollection = app.findCollectionByNameOrId("customers");
  const quotationsCollection = app.findCollectionByNameOrId("quotations");
  const productsCollection = app.findCollectionByNameOrId("products");

  // orders - 销售订单表
  const ordersCollection = new Collection({
    name: "orders",
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
            required: true,
            collectionId: projectsCollection.id,
            maxSelect: 1
        },
        {
            name: "customer",
            type: "relation",
            required: true,
            collectionId: customersCollection.id,
            maxSelect: 1
        },
        {
            name: "quotation",
            type: "relation",
            required: false,
            collectionId: quotationsCollection.id,
            maxSelect: 1
        },
        {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["draft", "confirmed", "in_production", "ready_to_ship", "shipped", "delivered", "completed", "cancelled"]
        },
        {
            name: "incoterm",
            type: "text",
            required: true,
            min: 3,
            max: 3
        },
        {
            name: "port_of_loading",
            type: "text",
            required: false,
            max: 100
        },
        {
            name: "port_of_destination",
            type: "text",
            required: false,
            max: 100
        },
        {
            name: "payment_terms",
            type: "text",
            required: false,
            max: 200
        },
        {
            name: "currency",
            type: "text",
            required: true,
            min: 3,
            max: 3
        },
        {
            name: "exchange_rate",
            type: "number",
            required: false,
            min: 0
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
        },
        {
            name: "shipping_marks",
            type: "text",
            required: false,
            max: 2000
        },
        {
            name: "remarks",
            type: "text",
            required: false,
            max: 2000
        },
        {
            name: "country_of_origin",
            type: "text",
            required: false,
            max: 2
        },
        {
            name: "country_of_destination",
            type: "text",
            required: false,
            max: 2
        },
        {
            name: "mode_of_shipment",
            type: "select",
            required: false,
            maxSelect: 1,
            values: ["Sea", "Air", "Land", "Express"]
        },
        {
            name: "estimated_shipping_date",
            type: "date",
            required: false
        },
        {
            name: "bank_info",
            type: "text",
            required: false,
            max: 2000
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(ordersCollection);

  // order_items - 订单明细表
  const orderItemsCollection = new Collection({
    name: "order_items",
    type: "base",
    system: false,
    fields: [
        {
            name: "order",
            type: "relation",
            required: true,
            collectionId: ordersCollection.id,
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
            name: "shipped_quantity",
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
  app.save(orderItemsCollection);

  // order_mold_items - 订单模具明细表
  const orderMoldItemsCollection = new Collection({
    name: "order_mold_items",
    type: "base",
    system: false,
    fields: [
        {
            name: "order",
            type: "relation",
            required: true,
            collectionId: ordersCollection.id,
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
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(orderMoldItemsCollection);

  // order_payments - 订单收款表
  const orderPaymentsCollection = new Collection({
    name: "order_payments",
    type: "base",
    system: false,
    fields: [
        {
            name: "order",
            type: "relation",
            required: true,
            collectionId: ordersCollection.id,
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
            name: "receipt_file",
            type: "text",
            required: false,
            max: 500
        },
        {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["pending", "approved", "rejected"]
        },
        {
            name: "approved_by",
            type: "text",
            required: false,
            max: 100
        },
        {
            name: "approved_at",
            type: "date",
            required: false
        },
        {
            name: "rejection_reason",
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
  app.save(orderPaymentsCollection);

  // order_templates - 订单模板表
  const orderTemplatesCollection = new Collection({
    name: "order_templates",
    type: "base",
    system: false,
    fields: [
        {
            name: "name",
            type: "text",
            required: true,
            min: 1,
            max: 100
        },
        {
            name: "customer",
            type: "relation",
            required: false,
            collectionId: customersCollection.id,
            maxSelect: 1
        },
        {
            name: "template_data",
            type: "json",
            required: true
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  return app.save(orderTemplatesCollection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("order_templates"));
  app.delete(app.findCollectionByNameOrId("order_payments"));
  app.delete(app.findCollectionByNameOrId("order_mold_items"));
  app.delete(app.findCollectionByNameOrId("order_items"));
  return app.delete(app.findCollectionByNameOrId("orders"));
});
