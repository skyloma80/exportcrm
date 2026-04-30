/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Add remarks field back to purchase_orders
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("purchase_orders");

  collection.fields.add(new Field({
    name: "remarks",
    type: "text",
    required: false,
    max: 2000
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("purchase_orders");
  collection.fields.removeById(collection.fields.getByName("remarks")?.id);
  return app.save(collection);
});
