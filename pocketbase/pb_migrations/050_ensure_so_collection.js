/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  try {
    const existing = app.findCollectionByNameOrId("so");
    if (existing) {
      // 确保规则是开放的
      existing.listRule = "";
      existing.viewRule = "";
      existing.createRule = "";
      existing.updateRule = "";
      existing.deleteRule = "";
      return app.save(existing);
    }
  } catch (e) {
    // 不存在则创建
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
      { name: "customer_id", type: "text" },
      { name: "customer_name", type: "text", required: true },
      { name: "customer_address", type: "text" },
      { name: "customer_tax_id", type: "text" },
      { name: "customer_po", type: "text" },
      { name: "vendor_code", type: "text" },
      { name: "currency", type: "text", required: true },
      { name: "incoterm", type: "text" },
      { name: "port_of_loading", type: "text" },
      { name: "port_of_destination", type: "text" },
      { name: "payment_terms", type: "text" },
      { name: "bank_info", type: "text" },
      { name: "country_of_origin", type: "text" },
      { name: "country_of_destination", type: "text" },
      { name: "mode_of_shipment", type: "text" },
      { name: "shipping_marks", type: "text" },
      { name: "expected_delivery_date", type: "date" },
      { name: "estimated_shipping_date", type: "date" },
      { name: "remarks", type: "text" },
      { name: "total_amount", type: "number" },
      {
        name: "status",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["draft", "confirmed", "in_production", "ready_to_ship", "shipped", "delivered", "completed", "cancelled"]
      },
      { name: "items", type: "json" }
    ]
  });

  return app.save(collection);
}, (app) => {
  // rollback
});
