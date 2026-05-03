/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 052: Add items JSONB field to quotations collection
 */
migrate((app) => {
  var collection = app.findCollectionByNameOrId("quotations");
  if (!collection) {
    console.log("Quotations collection not found, skipping migration");
    return;
  }

  var existingField = null;
  for (var i = 0; i < collection.fields.length; i++) {
    if (collection.fields[i].name === "items") {
      existingField = collection.fields[i];
      break;
    }
  }
  
  if (existingField) {
    console.log("Items field already exists in quotations, skipping");
    return;
  }

  collection.fields.addAt(collection.fields.length, new Field({
    name: "items",
    type: "json",
    required: false,
    presentable: false,
    options: {
      max: null,
      min: null
    }
  }));

  collection.listRule = "";
  collection.viewRule = "";
  collection.createRule = "";
  collection.updateRule = "";
  collection.deleteRule = "";

  return app.save(collection);
}, function(app) {
  var collection = app.findCollectionByNameOrId("quotations");
  if (collection) {
    var field = collection.fields.getByName("items");
    if (field) {
      collection.fields.removeById(field.id);
    }
    return app.save(collection);
  }
});