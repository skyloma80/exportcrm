/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create flat 'po' collection with JSON items
 */
migrate((app) => {
  const collection = new Collection({
    name: "po",
    type: "base",
    system: false,
    schema: [
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
  const collection = app.findCollectionByNameOrId("po");
  if (collection) {
    return app.delete(collection);
  }
});
