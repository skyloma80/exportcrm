/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Add part_number and description fields to order items
 */
migrate((app) => {
  const poi = app.findCollectionByNameOrId("purchase_order_items");
  const oi = app.findCollectionByNameOrId("order_items");

  // Add fields to purchase_order_items
  poi.fields.add(new Field({
    name: "part_number",
    type: "text",
    required: false,
  }));
  poi.fields.add(new Field({
    name: "description_en",
    type: "text",
    required: false,
  }));
  poi.fields.add(new Field({
    name: "description_cn",
    type: "text",
    required: false,
  }));
  app.save(poi);

  // Add fields to order_items
  oi.fields.add(new Field({
    name: "part_number",
    type: "text",
    required: false,
  }));
  oi.fields.add(new Field({
    name: "description_en",
    type: "text",
    required: false,
  }));
  return app.save(oi);
}, (app) => {
  const poi = app.findCollectionByNameOrId("purchase_order_items");
  poi.fields.removeById(poi.fields.getByName("part_number")?.id);
  poi.fields.removeById(poi.fields.getByName("description_en")?.id);
  poi.fields.removeById(poi.fields.getByName("description_cn")?.id);
  app.save(poi);

  const oi = app.findCollectionByNameOrId("order_items");
  oi.fields.removeById(oi.fields.getByName("part_number")?.id);
  oi.fields.removeById(oi.fields.getByName("description_en")?.id);
  return app.save(oi);
});
