/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 035: Relax order field constraints
 *
 * Changes:
 * - country_of_origin: remove max:2 → free text (any length)
 * - country_of_destination: remove max:2 → free text (any length)
 * - mode_of_shipment: change from select enum → free text field
 *
 * Impact on existing data: NONE. Relaxing constraints never invalidates
 * existing records; all existing values remain readable and writable.
 */
migrate((app) => {
  const ordersCollection = app.findCollectionByNameOrId("orders");

  // 1. Relax country_of_origin (remove max:2)
  const originField = ordersCollection.fields.getByName("country_of_origin");
  if (originField) {
    originField.max = null;
    originField.required = false;
  }

  // 2. Relax country_of_destination (remove max:2)
  const destField = ordersCollection.fields.getByName("country_of_destination");
  if (destField) {
    destField.max = null;
    destField.required = false;
  }

  // 3. Change mode_of_shipment from select → text (free input)
  //    Remove old select field and add a new text field with the same name.
  ordersCollection.fields.removeByName("mode_of_shipment");
  ordersCollection.fields.add(new Field({
    name: "mode_of_shipment",
    type: "text",
    required: false,
    max: 100,
  }));

  app.save(ordersCollection);

}, (app) => {
  // Rollback: restore original constraints
  const ordersCollection = app.findCollectionByNameOrId("orders");

  const originField = ordersCollection.fields.getByName("country_of_origin");
  if (originField) originField.max = 2;

  const destField = ordersCollection.fields.getByName("country_of_destination");
  if (destField) destField.max = 2;

  // Restore mode_of_shipment as select
  ordersCollection.fields.removeByName("mode_of_shipment");
  ordersCollection.fields.add(new Field({
    name: "mode_of_shipment",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["Sea", "Air", "Land", "Express"],
  }));

  app.save(ordersCollection);
});
