/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Cleanup PO trade fields and restore/fix item fields
 */
migrate((app) => {
  const po = app.findCollectionByNameOrId("purchase_orders");
  const poi = app.findCollectionByNameOrId("purchase_order_items");
  const oi = app.findCollectionByNameOrId("order_items");

  // 1. Remove incorrect trade fields from purchase_orders
  const fieldsToRemove = [
    "incoterm", "port_of_loading", "port_of_destination", "payment_terms",
    "exchange_rate", "country_of_origin", "country_of_destination", "mode_of_shipment",
    "bank_info", "shipping_marks", "estimated_shipping_date", "remarks",
    "supplier_code", "our_po"
  ];
  
  fieldsToRemove.forEach(f => {
    try {
      const field = po.fields.getByName(f);
      if (field) {
        po.fields.removeById(field.id);
      }
    } catch (e) {}
  });
  app.save(po);

  // 2. Restore and Add fields to purchase_order_items
  const poiFields = [
    { name: "product_name", type: "text" },
    { name: "product_code", type: "text" },
    { name: "unit", type: "text" },
    { name: "part_number", type: "text" },
    { name: "description_en", type: "text" },
    { name: "description_cn", type: "text" }
  ];

  poiFields.forEach(f => {
    try {
      if (!poi.fields.getByName(f.name)) {
        poi.fields.add(new Field(f));
      }
    } catch (e) {}
  });
  
  // Also make product optional again (if 038 made it required)
  try {
    const productField = poi.fields.getByName("product");
    if (productField) {
      productField.required = false;
    }
  } catch (e) {}
  
  app.save(poi);

  // 3. Add fields to order_items
  const oiFields = [
    { name: "part_number", type: "text" },
    { name: "description_en", type: "text" }
  ];

  oiFields.forEach(f => {
    try {
      if (!oi.fields.getByName(f.name)) {
        oi.fields.add(new Field(f));
      }
    } catch (e) {}
  });
  
  return app.save(oi);
}, (app) => {
  // Rollback logic (optional)
});
