/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Change shipment_items.order_item from relation to text
 *
 * Reason: Orders now use SO collection with JSONB items instead of old order_items table.
 * The shipment_items.order_item field needs to store the JSONB item's id as text.
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("shipment_items");
  if (!collection) {
    console.log("Collection shipment_items not found, skipping");
    return;
  }

  const oldField = collection.fields.getByName("order_item");
  if (!oldField) {
    console.log("order_item field not found in shipment_items, skipping");
    return;
  }

  if (oldField.type === "text") {
    console.log("order_item is already text type, skipping");
    return;
  }

  // Remove old relation field
  collection.fields.removeById(oldField.id);

  // Add new text field
  collection.fields.add(new Field({
    name: "order_item",
    type: "text",
    required: true,
    max: 100
  }));

  app.save(collection);
  console.log("Changed shipment_items.order_item from relation to text");
}, (app) => {
  const ordersCollection = app.findCollectionByNameOrId("order_items");
  const collection = app.findCollectionByNameOrId("shipment_items");
  if (!collection) return;

  const textField = collection.fields.getByName("order_item");
  if (!textField || textField.type !== "text") return;

  collection.fields.removeById(textField.id);
  collection.fields.add(new Field({
    name: "order_item",
    type: "relation",
    required: true,
    collectionId: ordersCollection.id,
    maxSelect: 1
  }));

  app.save(collection);
  console.log("Reverted shipment_items.order_item back to relation");
});
