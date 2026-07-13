/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Add VAT fields to po collection
 */
migrate((app) => {
  const collection = app.findCollectionByNameOrId("po");

  collection.fields.add(new Field({
    name: "vat_rate",
    type: "number",
    required: false,
    min: 0,
    max: 100,
  }));

  collection.fields.add(new Field({
    name: "subtotal",
    type: "number",
    required: false,
    min: 0,
  }));

  collection.fields.add(new Field({
    name: "vat_amount",
    type: "number",
    required: false,
    min: 0,
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("po");

  const vatRate = collection.fields.getByName("vat_rate");
  if (vatRate) collection.fields.removeById(vatRate.id);

  const subtotal = collection.fields.getByName("subtotal");
  if (subtotal) collection.fields.removeById(subtotal.id);

  const vatAmount = collection.fields.getByName("vat_amount");
  if (vatAmount) collection.fields.removeById(vatAmount.id);

  return app.save(collection);
});
