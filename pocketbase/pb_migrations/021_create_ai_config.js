/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create AI Configs collection
 */
migrate((app) => {
  const collection = new Collection({
    name: "ai_configs",
    type: "base",
    system: false,
    fields: [
        {
            name: "provider",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["openai", "anthropic", "azure", "custom"]
        },
        {
            name: "model",
            type: "text",
            required: true,
            min: 1,
            max: 100
        },
        {
            name: "api_key",
            type: "text",
            required: true,
            min: 1,
            max: 500
        },
        {
            name: "api_endpoint",
            type: "url",
            required: false
        },
        {
            name: "is_active",
            type: "bool",
            required: false
        },
        {
            name: "settings",
            type: "json",
            required: false
        },
        {
            name: "description",
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
  const collection = app.findCollectionByNameOrId("ai_configs");
  if (collection) {
    return app.delete(collection);
  }
});
