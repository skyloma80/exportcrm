migrate(function(app) {
  // customs_clearance still has a physical table + _collections entry
  // orders only has a _collections entry (no table) - zombie from migration 060
  // app.findCollectionByNameOrId() fails for these, try DAO approach
  
  // List all collections and find the ones we need
  try {
    // Try finding by ID directly
    var ids = {
      "customs_clearance": app.findCollectionByNameOrId("pbc_1281708896"),
      "orders": app.findCollectionByNameOrId("pbc_3527180448")
    };
    
    if (ids["customs_clearance"]) {
      app.delete(ids["customs_clearance"]);
      console.log("Deleted customs_clearance via ID");
    }
    if (ids["orders"]) {
      app.delete(ids["orders"]);
      console.log("Deleted orders via ID");
    }
  } catch(e) {
    console.log("DAO by ID failed: " + JSON.stringify(e));
  }
  
  // Final fallback: try to use app.dao()
  try {
    var dao = app.dao();
    // Try to find records from _collections table
    var collections = dao.findAllCollections();
    for (var i = 0; i < collections.length; i++) {
      var c = collections[i];
      if (c.name === "customs_clearance" || c.name === "orders") {
        app.delete(c);
        console.log("Deleted " + c.name + " via findAllCollections");
      }
    }
  } catch(e) {
    console.log("findAllCollections failed: " + JSON.stringify(e));
  }
}, function(app) {
  console.log("Rollback not implemented.");
});
