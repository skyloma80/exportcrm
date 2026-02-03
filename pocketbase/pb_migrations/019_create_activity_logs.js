/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create Activity Logs collection
 */
migrate((app) => {
  // 获取 users collection
  const usersCollection = app.findCollectionByNameOrId("users");

  const collection = new Collection({
    name: "activity_logs",
    type: "base",
    system: false,
    fields: [
        {
            name: "user",
            type: "relation",
            required: false,
            collectionId: usersCollection.id,
            maxSelect: 1
        },
        {
            name: "action",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["create", "update", "delete", "view", "export", "import", "login", "logout", "other"]
        },
        {
            name: "entity_type",
            type: "text",
            required: true,
            min: 1,
            max: 50
        },
        {
            name: "entity_id",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "entity_name",
            type: "text",
            required: false,
            max: 200
        },
        {
            name: "details",
            type: "json",
            required: false
        },
        {
            name: "ip_address",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "user_agent",
            type: "text",
            required: false,
            max: 500
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: null,
    deleteRule: null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("activity_logs");
  if (collection) {
    return app.delete(collection);
  }
});
