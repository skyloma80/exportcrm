/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create RFQ (Request for Quotation) collections
 */
migrate((app) => {
  const projectsCollection = app.findCollectionByNameOrId("projects");
  const productsCollection = app.findCollectionByNameOrId("products");
  const suppliersCollection = app.findCollectionByNameOrId("suppliers");

  // rfqs - 询价单表
  const rfqsCollection = new Collection({
    name: "rfqs",
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
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["draft", "sent", "received", "completed", "cancelled"]
        },
        {
            name: "deadline",
            type: "date",
            required: false
        },
        {
            name: "remarks",
            type: "text",
            required: false,
            max: 2000
        },
        {
            name: "attachments",
            type: "json",
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
  app.save(rfqsCollection);

  // rfq_items - 询价明细表
  const rfqItemsCollection = new Collection({
    name: "rfq_items",
    type: "base",
    system: false,
    fields: [
        {
            name: "rfq",
            type: "relation",
            required: true,
            collectionId: rfqsCollection.id,
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
            name: "target_price",
            type: "number",
            required: false,
            min: 0
        },
        {
            name: "remarks",
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
  app.save(rfqItemsCollection);

  // rfq_suppliers - 询价供应商表
  const rfqSuppliersCollection = new Collection({
    name: "rfq_suppliers",
    type: "base",
    system: false,
    fields: [
        {
            name: "rfq",
            type: "relation",
            required: true,
            collectionId: rfqsCollection.id,
            cascadeDelete: true,
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
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["pending", "sent", "received", "selected", "rejected"]
        },
        {
            name: "sent_at",
            type: "date",
            required: false
        },
        {
            name: "received_at",
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
  app.save(rfqSuppliersCollection);

  // rfq_quotations - 供应商报价表
  const rfqQuotationsCollection = new Collection({
    name: "rfq_quotations",
    type: "base",
    system: false,
    fields: [
        {
            name: "rfq",
            type: "relation",
            required: true,
            collectionId: rfqsCollection.id,
            cascadeDelete: true,
            maxSelect: 1
        },
        {
            name: "rfq_item",
            type: "relation",
            required: true,
            collectionId: rfqItemsCollection.id,
            cascadeDelete: true,
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
            name: "unit_price",
            type: "number",
            required: true,
            min: 0
        },
        {
            name: "moq",
            type: "number",
            required: false,
            min: 1
        },
        {
            name: "lead_time_days",
            type: "number",
            required: false,
            min: 0
        },
        {
            name: "valid_until",
            type: "date",
            required: false
        },
        {
            name: "remarks",
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
  app.save(rfqQuotationsCollection);

  // rfq_mold_quotations - 供应商模具报价表
  const rfqMoldQuotationsCollection = new Collection({
    name: "rfq_mold_quotations",
    type: "base",
    system: false,
    fields: [
        {
            name: "rfq",
            type: "relation",
            required: true,
            collectionId: rfqsCollection.id,
            cascadeDelete: true,
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
        },
        {
            name: "lifespan",
            type: "number",
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
  return app.save(rfqMoldQuotationsCollection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("rfq_mold_quotations"));
  app.delete(app.findCollectionByNameOrId("rfq_quotations"));
  app.delete(app.findCollectionByNameOrId("rfq_suppliers"));
  app.delete(app.findCollectionByNameOrId("rfq_items"));
  return app.delete(app.findCollectionByNameOrId("rfqs"));
});
