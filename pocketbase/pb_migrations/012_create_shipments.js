/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create Shipment collections
 */
migrate((app) => {
  const ordersCollection = app.findCollectionByNameOrId("orders");
  const orderItemsCollection = app.findCollectionByNameOrId("order_items");

  // shipments - 发货表
  const shipmentsCollection = new Collection({
    name: "shipments",
    type: "base",
    system: false,
    fields: [
        {
            name: "code",
            type: "text",
            required: true,
            min: 1,
            max: 20 
        },
        {
            name: "order",
            type: "relation",
            required: true,
            collectionId: ordersCollection.id,
            maxSelect: 1
        },
        {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["preparing", "booking", "customs_clearance", "loaded", "handed_over", "shipped", "in_transit", "arrived", "delivered"]
        },
        {
            name: "shipping_method",
            type: "text",
            required: true,
            max: 50
        },
        {
            name: "carrier",
            type: "text",
            required: false,
            max: 100
        },
        {
            name: "vessel_name",
            type: "text",
            required: false,
            max: 100
        },
        {
            name: "voyage_number",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "container_number",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "container_type",
            type: "text",
            required: false,
            max: 10
        },
        {
            name: "bl_number",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "etd",
            type: "date",
            required: false
        },
        {
            name: "eta",
            type: "date",
            required: false
        },
        {
            name: "actual_departure",
            type: "date",
            required: false
        },
        {
            name: "actual_arrival",
            type: "date",
            required: false
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(shipmentsCollection);

  // shipment_items - 发货明细表
  const shipmentItemsCollection = new Collection({
    name: "shipment_items",
    type: "base",
    system: false,
    fields: [
        {
            name: "shipment",
            type: "relation",
            required: true,
            collectionId: shipmentsCollection.id,
            cascadeDelete: true,
            maxSelect: 1
        },
        {
            name: "order_item",
            type: "relation",
            required: true,
            collectionId: orderItemsCollection.id,
            maxSelect: 1
        },
        {
            name: "quantity",
            type: "number",
            required: true,
            min: 1
        },
        {
            name: "packages",
            type: "number",
            required: false,
            min: 0
        },
        {
            name: "gross_weight",
            type: "number",
            required: false,
            min: 0
        },
        {
            name: "net_weight",
            type: "number",
            required: false,
            min: 0
        },
        {
            name: "volume",
            type: "number",
            required: false,
            min: 0
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  return app.save(shipmentItemsCollection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("shipment_items"));
  return app.delete(app.findCollectionByNameOrId("shipments"));
});
