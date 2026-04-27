/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 037: Support custom (free-text) products in order_items
 * 
 * 1. Make `product` relation optional
 * 2. Add `product_name` text field
 * 3. Add `product_code` text field
 */
migrate((app) => {
  const orderItemsCollection = app.findCollectionByNameOrId("order_items");

  // Make product optional
  const productField = orderItemsCollection.fields.getByName("product");
  if (productField) {
    productField.required = false;
  }

  // Add product_name
  orderItemsCollection.fields.add(new Field({
    name: "product_name",
    type: "text",
    required: false,
    max: 200
  }));

  // Add product_code
  orderItemsCollection.fields.add(new Field({
    name: "product_code",
    type: "text",
    required: false,
    max: 50
  }));

  app.save(orderItemsCollection);
}, (app) => {
  const orderItemsCollection = app.findCollectionByNameOrId("order_items");

  const productField = orderItemsCollection.fields.getByName("product");
  if (productField) {
    productField.required = true;
  }

  orderItemsCollection.fields.removeByName("product_name");
  orderItemsCollection.fields.removeByName("product_code");

  app.save(orderItemsCollection);
});
