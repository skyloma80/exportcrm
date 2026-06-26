/// <reference path="../pb_data/types.d.ts" />

migrate(function(app) {
  var names = ["orders", "order_items", "order_mold_items", "order_templates"];
  for (var i = 0; i < names.length; i++) {
    try {
      var col = app.findCollectionByNameOrId(names[i]);
      app.delete(col);
      console.log("Deleted legacy collection: " + names[i]);
    } catch(e) {
      console.log("Collection " + names[i] + " not found, skipping.");
    }
  }
}, function(app) {
  console.log("Rollback not implemented.");
});
