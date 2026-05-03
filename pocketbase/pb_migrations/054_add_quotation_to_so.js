/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 054: Add quotation relation field to so collection
 */
migrate((app) => {
  var collection = app.findCollectionByNameOrId("so");
  if (!collection) {
    console.log("SO collection not found");
    return;
  }

  var existingField = null;
  for (var i = 0; i < collection.fields.length; i++) {
    if (collection.fields[i].name === "quotation") {
      existingField = collection.fields[i];
      break;
    }
  }
  
  if (existingField) {
    console.log("Quotation field already exists in so");
    return;
  }

  var quotationsCollection = app.findCollectionByNameOrId("quotations");
  if (!quotationsCollection) {
    console.log("Quotations collection not found");
    return;
  }

  var field = new Field({
    name: "quotation",
    type: "relation",
    required: false,
    presentable: false,
    collectionId: quotationsCollection.id,
    cascadeDelete: false,
    maxSelect: 1
  });

  collection.fields.addAt(collection.fields.length, field);

  return app.save(collection);
}, function(app) {
  var collection = app.findCollectionByNameOrId("so");
  if (collection) {
    var field = collection.fields.getByName("quotation");
    if (field) {
      collection.fields.removeById(field.id);
    }
    return app.save(collection);
  }
});