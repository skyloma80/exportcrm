/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Relax API rules for 'po' collection to public
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("po");
  if (collection) {
    collection.listRule = "";
    collection.viewRule = "";
    collection.createRule = "";
    collection.updateRule = "";
    collection.deleteRule = "";
    app.save(collection);
  }
}, (app) => {
  const collection = app.findCollectionByNameOrId("po");
  if (collection) {
    collection.listRule = "@request.auth.id != ''";
    collection.viewRule = "@request.auth.id != ''";
    collection.createRule = "@request.auth.id != ''";
    collection.updateRule = "@request.auth.id != ''";
    collection.deleteRule = "@request.auth.id != ''";
    app.save(collection);
  }
});
