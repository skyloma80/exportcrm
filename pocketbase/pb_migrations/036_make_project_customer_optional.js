/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 036: Make project and customer optional in orders
 *
 * Changes:
 * - project: change from required to optional
 * - customer: change from required to optional
 * - quotation: keep optional (already was)
 *
 * Impact on existing data: NONE. Relaxing constraints never invalidates
 * existing records.
 */
migrate((app) => {
  const ordersCollection = app.findCollectionByNameOrId("orders");

  // Make project optional
  const projectField = ordersCollection.fields.getByName("project");
  if (projectField) {
    projectField.required = false;
    projectField.cascadeDelete = false;
  }

  // Make customer optional
  const customerField = ordersCollection.fields.getByName("customer");
  if (customerField) {
    customerField.required = false;
    customerField.cascadeDelete = false;
  }

  app.save(ordersCollection);

}, (app) => {
  // Rollback: restore required constraints
  const ordersCollection = app.findCollectionByNameOrId("orders");

  const projectField = ordersCollection.fields.getByName("project");
  if (projectField) {
    projectField.required = true;
  }

  const customerField = ordersCollection.fields.getByName("customer");
  if (customerField) {
    customerField.required = true;
  }

  app.save(ordersCollection);
});