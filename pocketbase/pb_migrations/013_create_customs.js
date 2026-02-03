/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create Customs collections
 */
migrate((app) => {
  const ordersCollection = app.findCollectionByNameOrId("orders");
  const shipmentsCollection = app.findCollectionByNameOrId("shipments");

  // customs_clearance - 报关记录表
  const customsClearanceCollection = new Collection({
    name: "customs_clearance",
    type: "base",
    system: false,
    fields: [
        {
            name: "order",
            type: "relation",
            required: true,
            collectionId: ordersCollection.id,
            maxSelect: 1
        },
        {
            name: "shipment",
            type: "relation",
            required: false,
            collectionId: shipmentsCollection.id,
            maxSelect: 1
        },
        {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["draft", "submitted", "reviewing", "inspecting", "released"]
        },
        {
            name: "declaration_number",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "customs_district",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "port",
            type: "text",
            required: false,
            max: 100
        },
        {
            name: "customs_broker",
            type: "text",
            required: false,
            max: 100
        },
        {
            name: "submitted_at",
            type: "date",
            required: false
        },
        {
            name: "released_at",
            type: "date",
            required: false
        },
        {
            name: "tax_id",
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
  app.save(customsClearanceCollection);

  // customs_declarations - 报关单表
  const customsDeclarationsCollection = new Collection({
    name: "customs_declarations",
    type: "base",
    system: false,
    fields: [
        {
            name: "customs_clearance",
            type: "relation",
            required: true,
            collectionId: customsClearanceCollection.id,
            cascadeDelete: true,
            maxSelect: 1
        },
        {
            name: "declaration_number",
            type: "text",
            required: true,
            max: 50
        },
        {
            name: "declaration_date",
            type: "date",
            required: true
        },
        {
            name: "total_amount",
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
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(customsDeclarationsCollection);

  // customs_declaration_items - 报关商品表
  const customsDeclarationItemsCollection = new Collection({
    name: "customs_declaration_items",
    type: "base",
    system: false,
    fields: [
        {
            name: "declaration",
            type: "relation",
            required: true,
            collectionId: customsDeclarationsCollection.id,
            cascadeDelete: true,
            maxSelect: 1
        },
        {
            name: "hs_code",
            type: "text",
            required: true,
            max: 20
        },
        {
            name: "product_name",
            type: "text",
            required: true,
            max: 200
        },
        {
            name: "quantity",
            type: "number",
            required: true,
            min: 0
        },
        {
            name: "unit",
            type: "text",
            required: true,
            max: 10
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
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(customsDeclarationItemsCollection);

  // customs_fees - 报关费用表
  const customsFeesCollection = new Collection({
    name: "customs_fees",
    type: "base",
    system: false,
    fields: [
        {
            name: "customs_clearance",
            type: "relation",
            required: true,
            collectionId: customsClearanceCollection.id,
            cascadeDelete: true,
            maxSelect: 1
        },
        {
            name: "fee_type",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["duty", "inspection", "agency", "storage", "other"]
        },
        {
            name: "description",
            type: "text",
            required: false,
            max: 200
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
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  return app.save(customsFeesCollection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("customs_fees"));
  app.delete(app.findCollectionByNameOrId("customs_declaration_items"));
  app.delete(app.findCollectionByNameOrId("customs_declarations"));
  return app.delete(app.findCollectionByNameOrId("customs_clearance"));
});
