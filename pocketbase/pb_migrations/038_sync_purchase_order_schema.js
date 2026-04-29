/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 038: Sync Purchase Order schema with Sales Order (PI) schema
 * 
 * 1. Add trade and detail fields to purchase_orders
 * 2. Support custom products in purchase_order_items
 */
migrate((app) => {
  const purchaseOrdersCollection = app.findCollectionByNameOrId("purchase_orders");
  const purchaseOrderItemsCollection = app.findCollectionByNameOrId("purchase_order_items");

  const addFieldIfMissing = (collection, fieldData) => {
    if (!collection.fields.getByName(fieldData.name)) {
      collection.fields.add(new Field(fieldData));
    }
  };

  // --- 1. Update purchase_orders ---
  [
    { name: "incoterm", type: "text", max: 3 },
    { name: "port_of_loading", type: "text", max: 100 },
    { name: "port_of_destination", type: "text", max: 100 },
    { name: "payment_terms", type: "text", max: 200 },
    { name: "exchange_rate", type: "number", min: 0 },
    { name: "country_of_origin", type: "text", max: 2 },
    { name: "country_of_destination", type: "text", max: 2 },
    { name: "mode_of_shipment", type: "select", maxSelect: 1, values: ["Sea", "Air", "Land", "Express"] },
    { name: "bank_info", type: "text", max: 2000 },
    { name: "shipping_marks", type: "text", max: 2000 },
    { name: "estimated_shipping_date", type: "date" },
    { name: "remarks", type: "text", max: 2000 },
    { name: "supplier_code", type: "text", max: 100 },
    { name: "our_po", type: "text", max: 100 }
  ].forEach(f => addFieldIfMissing(purchaseOrdersCollection, f));

  app.save(purchaseOrdersCollection);

  // --- 2. Update purchase_order_items ---
  const productField = purchaseOrderItemsCollection.fields.getByName("product");
  if (productField) {
    productField.required = false;
  }

  [
    { name: "product_name", type: "text", max: 200 },
    { name: "product_code", type: "text", max: 50 },
    { name: "unit", type: "text", max: 10 }
  ].forEach(f => addFieldIfMissing(purchaseOrderItemsCollection, f));

  app.save(purchaseOrderItemsCollection);

}, (app) => {
  // Rollback logic
  const purchaseOrdersCollection = app.findCollectionByNameOrId("purchase_orders");
  const purchaseOrderItemsCollection = app.findCollectionByNameOrId("purchase_order_items");

  const poFields = [
    "incoterm", "port_of_loading", "port_of_destination", "payment_terms",
    "exchange_rate", "country_of_origin", "country_of_destination", "mode_of_shipment",
    "bank_info", "shipping_marks", "estimated_shipping_date", "remarks",
    "supplier_code", "our_po"
  ];

  poFields.forEach(f => purchaseOrdersCollection.fields.removeByName(f));
  app.save(purchaseOrdersCollection);

  const productField = purchaseOrderItemsCollection.fields.getByName("product");
  if (productField) {
    productField.required = true;
  }
  purchaseOrderItemsCollection.fields.removeByName("product_name");
  purchaseOrderItemsCollection.fields.removeByName("product_code");
  purchaseOrderItemsCollection.fields.removeByName("unit");
  app.save(purchaseOrderItemsCollection);
});
