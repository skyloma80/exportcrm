/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Relax total_amount requirement on purchase_orders
 * (PocketBase treats 0 as blank for required number fields)
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("purchase_orders");

  const totalAmountField = collection.fields.getByName("total_amount");
  if (totalAmountField) {
    totalAmountField.required = false;
    app.save(collection);
  }

}, (app) => {
  const collection = app.findCollectionByNameOrId("purchase_orders");
  const totalAmountField = collection.fields.getByName("total_amount");
  if (totalAmountField) {
    totalAmountField.required = true;
    app.save(collection);
  }
});
