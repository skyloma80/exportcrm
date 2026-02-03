/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create App Config collection
 */
migrate((app) => {
  const collection = new Collection({
    name: "app_config",
    type: "base",
    system: false,
    fields: [
        {
            name: "key",
            type: "text",
            required: true,
            min: 1,
            max: 100
        },
        {
            name: "value",
            type: "json",
            required: true
        },
        {
            name: "category",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "description",
            type: "text",
            required: false,
            max: 500
        },
        {
            name: "description_cn",
            type: "text",
            required: false,
            max: 500
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("app_config");
  if (collection) {
    return app.delete(collection);
  }
});
