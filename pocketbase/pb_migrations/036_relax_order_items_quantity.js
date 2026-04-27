/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 036: Relax order_items quantity constraint
 * 
 * Allows quantity to be less than 1 (e.g. 0.5) to support fractional units like tons, kg, etc.
 */
migrate((app) => {
  const orderItemsCollection = app.findCollectionByNameOrId("order_items");

  const quantityField = orderItemsCollection.fields.getByName("quantity");
  if (quantityField) {
    quantityField.min = 0.00001; // Allow fractional quantities > 0
  }

  app.save(orderItemsCollection);
}, (app) => {
  const orderItemsCollection = app.findCollectionByNameOrId("order_items");

  const quantityField = orderItemsCollection.fields.getByName("quantity");
  if (quantityField) {
    quantityField.min = 1;
  }

  app.save(orderItemsCollection);
});
