/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create PO Payments collection (采购订单付款)
 */
migrate((app) => {
  const purchaseOrdersCollection = app.findCollectionByNameOrId("purchase_orders");

  const collection = new Collection({
    name: "po_payments",
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
            name: "receipt_file",
            type: "file",
            required: false,
            maxSelect: 1,
            maxSize: 10485760
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
  const collection = app.findCollectionByNameOrId("po_payments");
  if (collection) {
    return app.delete(collection);
  }
});
