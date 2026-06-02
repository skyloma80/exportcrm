/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const soCollection = app.findCollectionByNameOrId("so");

  // Update shipments collection
  const shipmentsCollection = app.findCollectionByNameOrId("shipments");

  // Rename old 'order' field to avoid conflict
  const oldField = shipmentsCollection.fields.getByName("order");
  if (oldField) {
    oldField.name = "order_legacy";
    app.save(shipmentsCollection);

    // Remove the old field
    shipmentsCollection.fields.removeById(oldField.id);
    app.save(shipmentsCollection);
  }

  // Add new 'order' field pointing to 'so'
  shipmentsCollection.fields.add(new Field({
    name: "order",
    type: "relation",
    required: true,
    collectionId: soCollection.id,
    cascadeDelete: true,
    maxSelect: 1
  }));
  app.save(shipmentsCollection);

  console.log("Updated shipments.order relation from 'orders' to 'so'");

}, (app) => {
  // Revert: restore old relation
  const ordersCollection = app.findCollectionByNameOrId("orders");
  const shipmentsCollection = app.findCollectionByNameOrId("shipments");

  const newField = shipmentsCollection.fields.getByName("order");
  if (newField) {
    newField.name = "order_so";
    app.save(shipmentsCollection);
    shipmentsCollection.fields.removeById(newField.id);
    app.save(shipmentsCollection);
  }

  const legacyField = shipmentsCollection.fields.getByName("order_legacy");
  if (legacyField) {
    legacyField.name = "order";
    app.save(shipmentsCollection);
  }
});
