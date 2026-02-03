/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create Invoice collections (PI and CI)
 */
migrate((app) => {
  const ordersCollection = app.findCollectionByNameOrId("orders");

  // proforma_invoices - 形式发票表
  const proformaInvoicesCollection = new Collection({
    name: "proforma_invoices",
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
            name: "order",
            type: "relation",
            required: true,
            collectionId: ordersCollection.id,
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
            values: ["draft", "sent", "confirmed", "revised", "cancelled"]
        },
        {
            name: "issue_date",
            type: "date",
            required: true
        },
        {
            name: "valid_until",
            type: "date",
            required: false
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
            name: "bank_account",
            type: "json",
            required: false
        },
        {
            name: "sent_at",
            type: "date",
            required: false
        },
        {
            name: "confirmed_at",
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
  app.save(proformaInvoicesCollection);

  // commercial_invoices - 商业发票表
  const commercialInvoicesCollection = new Collection({
    name: "commercial_invoices",
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
            name: "order",
            type: "relation",
            required: true,
            collectionId: ordersCollection.id,
            maxSelect: 1
        },
        {
            name: "shipment",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "issue_date",
            type: "date",
            required: true
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
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  return app.save(commercialInvoicesCollection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("commercial_invoices"));
  return app.delete(app.findCollectionByNameOrId("proforma_invoices"));
});
