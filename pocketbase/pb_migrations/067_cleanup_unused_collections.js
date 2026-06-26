migrate(function(app) {
  var names = [
    "commercial_invoices",
    "customs_clearance",
    "customs_declaration_items",
    "customs_declarations",
    "customs_fees",
    "product_molds",
    "order_sessions",
    "orders"
  ];
  for (var i = 0; i < names.length; i++) {
    try {
      var col = app.findCollectionByNameOrId(names[i]);
      app.delete(col);
      console.log("Deleted collection: " + names[i]);
    } catch(e) {
      console.log("Collection " + names[i] + " not found, skipping.");
    }
  }
}, function(app) {
  console.log("Rollback not implemented.");
});
