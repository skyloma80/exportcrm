/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Recreate flat 'po' collection with correct 'fields' syntax
 */
migrate((app) => {
  // First, try to delete the old broken collection if it exists
  try {
    const oldCollection = app.findCollectionByNameOrId("po");
    if (oldCollection) {
      app.delete(oldCollection);
    }
  } catch (e) {
    // ignore if not found
  }

  // Create the collection properly using the 'fields' syntax for newer PB versions
  const collection = new Collection({
    name: "po",
    type: "base",
    system: false,
    fields: [
      {
        name: "code",
        type: "text",
        required: true,
        min: 1,
        max: 50
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
        required: true,
        min: 3,
        max: 3
      },
      {
        name: "expected_delivery_date",
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
        name: "total_amount",
        type: "number",
        required: false,
        min: 0
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
