/// <reference path="../pb_data/types.d.ts" />

migrate(function(app) {
  try {
    var col = app.findCollectionByNameOrId("tasks");
    app.delete(col);
    console.log("Deleted tasks collection");
  } catch(e) {
    console.log("tasks collection not found, skipping.");
  }
}, function(app) {
  console.log("Rollback not implemented.");
});
