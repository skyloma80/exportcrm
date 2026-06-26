/// <reference path="../pb_data/types.d.ts" />

migrate(function(app) {
  // 1. Update po_payments to reference 'po' instead of 'purchase_orders'
  try {
    var poCollection = app.findCollectionByNameOrId("po");
    var poPayments = app.findCollectionByNameOrId("po_payments");

    var oldField = poPayments.fields.getByName("purchase_order");
    if (oldField) {
      oldField.name = "purchase_order_legacy";
      app.save(poPayments);

      poPayments.fields.removeById(oldField.id);
      app.save(poPayments);
    }

    poPayments.fields.add(new Field({
      name: "purchase_order",
      type: "relation",
      required: true,
      collectionId: poCollection.id,
      cascadeDelete: true,
      maxSelect: 1
    }));
    app.save(poPayments);
    console.log("Updated po_payments to reference po");
  } catch(e) {
    console.log("Failed to update po_payments: " + JSON.stringify(e));
  }

  // 2. Delete legacy purchase_orders collection group
  var oldCollections = ["purchase_orders", "purchase_order_items", "purchase_order_mold_items", "purchase_order_payments"];
  for (var i = 0; i < oldCollections.length; i++) {
    try {
      var col = app.findCollectionByNameOrId(oldCollections[i]);
      app.delete(col);
      console.log("Deleted legacy collection: " + oldCollections[i]);
    } catch(e) {
      console.log("Collection " + oldCollections[i] + " not found, skipping.");
    }
  }
}, function(app) {
  console.log("Rollback not implemented.");
});
