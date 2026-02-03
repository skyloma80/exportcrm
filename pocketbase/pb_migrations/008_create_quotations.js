/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create Quotation collections
 */
migrate((app) => {
  const projectsCollection = app.findCollectionByNameOrId("projects");
  const customersCollection = app.findCollectionByNameOrId("customers");
  const productsCollection = app.findCollectionByNameOrId("products");

  // quotations - 报价单表
  const quotationsCollection = new Collection({
    name: "quotations",
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
            name: "version",
            type: "number",
            required: true,
            min: 1
        },
        {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["draft", "sent", "accepted", "rejected", "expired", "revised"]
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
            name: "validity_days",
            type: "number",
            required: true,
            min: 1
        },
        {
            name: "global_profit_margin",
            type: "number",
            required: false,
            min: 0,
            max: 100
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
            name: "sent_at",
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
  app.save(quotationsCollection);

  // quotation_items - 报价明细表
  const quotationItemsCollection = new Collection({
    name: "quotation_items",
    type: "base",
    system: false,
    fields: [
        {
            name: "quotation",
            type: "relation",
            required: true,
            collectionId: quotationsCollection.id,
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
            name: "cost_price",
            type: "number",
            required: true,
            min: 0
        },
        {
            name: "profit_margin",
            type: "number",
            required: true,
            min: 0,
            max: 100
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
  app.save(quotationItemsCollection);

  
}, (app) => {
 
  app.delete(app.findCollectionByNameOrId("quotation_items"));
  return app.delete(app.findCollectionByNameOrId("quotations"));
});
