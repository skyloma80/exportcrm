/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 048: Force create 'po' collection.
 * This is a corrective migration that safely ensures the po collection exists.
 */
migrate((app) => {
  // Check if already exists
  let existing = null;
  try {
    existing = app.findCollectionByNameOrId("po");
  } catch (e) {
    // not found, that's fine
  }

  if (existing) {
    // Already exists, just ensure rules are set
    existing.listRule = "";
    existing.viewRule = "";
    existing.createRule = "";
    existing.updateRule = "";
    existing.deleteRule = "";
    return app.save(existing);
  }

  // Create from scratch
  const collection = new Collection({
    name: "po",
    type: "base",
    system: false,
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      {
        name: "code",
        type: "text",
        required: true
      },
      {
        name: "supplier_id",
        type: "text",
        required: false
      },
      {
        name: "supplier_name",
        type: "text",
        required: true
      },
      {
        name: "currency",
        type: "text",
        required: true
      },
      {
        name: "expected_delivery_date",
        type: "date",
        required: false
      },
      {
        name: "remarks",
        type: "text",
        required: false
      },
      {
        name: "total_amount",
        type: "number",
        required: false
      },
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["draft", "sent", "confirmed", "in_production", "shipped", "delivered", "completed", "cancelled"]
      },
      {
        name: "items",
        type: "json",
        required: false
      }
    ]
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("po");
    if (collection) {
      return app.delete(collection);
    }
  } catch (e) {}
});
