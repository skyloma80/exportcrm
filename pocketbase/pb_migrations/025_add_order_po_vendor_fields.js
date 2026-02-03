/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Add customer_po and vendor_code fields to orders collection
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("orders");

  // Add customer_po field
  collection.fields.addAt(3, new Field({
    name: "customer_po",
    type: "text",
    required: false,
    presentable: false,
    options: {
      min: null,
      max: 100,
      pattern: ""
    }
  }));

  // Add vendor_code field
  collection.fields.addAt(4, new Field({
    name: "vendor_code",
    type: "text",
    required: false,
    presentable: false,
    options: {
      min: null,
      max: 100,
      pattern: ""
    }
  }));

  return app.save(collection);
}, (app) => {
  // Rollback: remove the fields
  const collection = app.findCollectionByNameOrId("orders");
  
  collection.fields.removeById(collection.fields.getByName("customer_po")?.id);
  collection.fields.removeById(collection.fields.getByName("vendor_code")?.id);

  return app.save(collection);
});
