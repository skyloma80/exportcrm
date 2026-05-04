/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create custom_pallet_specs collection
 * 自定义托盘规格（简化版）
 */
migrate((app) => {
  const collection = new Collection({
    name: "custom_pallet_specs",
    type: "base",
    system: false,
    fields: [
        {
            name: "name",
            type: "text",
            required: true,
            min: 1,
            max: 200
        },
        {
            name: "dimensions",
            type: "text",
            required: true,
            min: 1,
            max: 50
        },
        {
            name: "is_active",
            type: "bool",
            required: false
        },
        {
            name: "created_by",
            type: "relation",
            required: false,
            collectionId: app.findCollectionByNameOrId("users").id,
            maxSelect: 1
        }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("custom_pallet_specs");
  if (collection) {
    return app.delete(collection);
  }
});
