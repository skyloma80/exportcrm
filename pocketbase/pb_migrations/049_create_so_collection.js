/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 049: Create 'so' (Sales Order) flat collection
 * Mirrors the 'po' collection design: all order items stored as JSON array
 */
migrate((app) => {
  // Check if already exists
  let existing = null;
  try {
    existing = app.findCollectionByNameOrId("so");
  } catch (e) {}

  if (existing) {
    existing.listRule = "";
    existing.viewRule = "";
    existing.createRule = "";
    existing.updateRule = "";
    existing.deleteRule = "";
    return app.save(existing);
  }

  const collection = new Collection({
    name: "so",
    type: "base",
    system: false,
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "",
    fields: [
      { name: "code", type: "text", required: true },
      { name: "customer_id", type: "text", required: false },
      { name: "customer_name", type: "text", required: true },
      { name: "customer_address", type: "text", required: false },
      { name: "customer_tax_id", type: "text", required: false },
      { name: "customer_po", type: "text", required: false },
      { name: "vendor_code", type: "text", required: false },
      { name: "currency", type: "text", required: true },
      { name: "incoterm", type: "text", required: false },
      { name: "port_of_loading", type: "text", required: false },
      { name: "port_of_destination", type: "text", required: false },
      { name: "payment_terms", type: "text", required: false },
      { name: "bank_info", type: "text", required: false },
      { name: "country_of_origin", type: "text", required: false },
      { name: "country_of_destination", type: "text", required: false },
      { name: "mode_of_shipment", type: "text", required: false },
      { name: "shipping_marks", type: "text", required: false },
      { name: "expected_delivery_date", type: "date", required: false },
      { name: "estimated_shipping_date", type: "date", required: false },
      { name: "remarks", type: "text", required: false },
      { name: "total_amount", type: "number", required: false },
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["draft", "confirmed", "in_production", "ready_to_ship", "shipped", "delivered", "completed", "cancelled"]
      },
      { name: "items", type: "json", required: false }
    ]
  });

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("so");
    if (collection) return app.delete(collection);
  } catch (e) {}
});
