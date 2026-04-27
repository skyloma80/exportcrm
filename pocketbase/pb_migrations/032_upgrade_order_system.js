/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Upgrade Order system for standalone orders and enhanced data tracking
 */
migrate((app) => {
  const productsCollection = app.findCollectionByNameOrId("products");
  const ordersCollection = app.findCollectionByNameOrId("orders");
  const orderItemsCollection = app.findCollectionByNameOrId("order_items");

  // 1. Add purchase_price_notes to products
  productsCollection.fields.add(new Field({
    name: "purchase_price_notes",
    type: "text",
    required: false,
    max: 2000
  }));
  app.save(productsCollection);

  // 2. Make project optional in orders
  const projectField = ordersCollection.fields.getByName("project");
  if (projectField) {
    projectField.required = false;
    app.save(ordersCollection);
  }

  // 3. Add cost_price to order_items
  orderItemsCollection.fields.add(new Field({
    name: "cost_price",
    type: "number",
    required: false,
    min: 0
  }));
  app.save(orderItemsCollection);

}, (app) => {
  // Rollback logic (optional but good practice)
  const productsCollection = app.findCollectionByNameOrId("products");
  const ordersCollection = app.findCollectionByNameOrId("orders");
  const orderItemsCollection = app.findCollectionByNameOrId("order_items");

  productsCollection.fields.removeByName("purchase_price_notes");
  app.save(productsCollection);

  const projectField = ordersCollection.fields.getByName("project");
  if (projectField) {
    projectField.required = true;
    app.save(ordersCollection);
  }

  orderItemsCollection.fields.removeByName("cost_price");
  app.save(orderItemsCollection);
});
