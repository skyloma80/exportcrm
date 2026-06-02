/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 057: Add supplier_id field to customers collection
 * 本公司在客户系统中的供应商代码，非供应商表ID
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("customers");

  const existing = collection.fields.getByName("supplier_id");
  if (existing) {
    return;
  }

  collection.fields.add(new Field({
    name: "supplier_id",
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
  const collection = app.findCollectionByNameOrId("customers");
  const field = collection.fields.getByName("supplier_id");
  if (field) {
    collection.fields.removeById(field.id);
    return app.save(collection);
  }
});
