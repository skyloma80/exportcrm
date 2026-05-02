/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const soCollection = app.findCollectionByNameOrId("so");
  
  // 1. Update order_payments
  const orderPayments = app.findCollectionByNameOrId("order_payments");
  
  // We MUST save the removal of the old field before adding a new one with the same name,
  // otherwise PocketBase treats it as an update to the existing field and fails 
  // because relation targets cannot be changed.
  const oldOpField = orderPayments.fields.getByName("order");
  if (oldOpField) {
    // Rename it first to be safe
    oldOpField.name = "order_legacy";
    app.save(orderPayments);
    
    // Now remove it
    orderPayments.fields.removeById(oldOpField.id);
    app.save(orderPayments);
  }

  // Add new 'order' field pointing to 'so'
  orderPayments.fields.add(new Field({
    name: "order",
    type: "relation",
    required: true,
    collectionId: soCollection.id,
    cascadeDelete: true,
    maxSelect: 1
  }));
  app.save(orderPayments);

  // 2. Update purchase_orders
  try {
    const purchaseOrders = app.findCollectionByNameOrId("purchase_orders");
    const oldPoField = purchaseOrders.fields.getByName("order");
    if (oldPoField) {
      oldPoField.name = "order_legacy";
      app.save(purchaseOrders);
      
      purchaseOrders.fields.removeById(oldPoField.id);
      app.save(purchaseOrders);
    }
    
    purchaseOrders.fields.add(new Field({
      name: "order",
      type: "relation",
      required: false,
      collectionId: soCollection.id,
      maxSelect: 1
    }));
    
    app.save(purchaseOrders);
  } catch (e) {}

}, (app) => {
  // Rollback logic
});
