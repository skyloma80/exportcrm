/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create feedbacks collection
 * 用户反馈功能
 */
migrate((app) => {
  const usersCollection = app.findCollectionByNameOrId("users");

  const collection = new Collection({
    name: "feedbacks",
    type: "base",
    system: false,
    fields: [
        {
            name: "user",
            type: "relation",
            required: true,
            collectionId: usersCollection.id,
            maxSelect: 1
        },
        {
            name: "type",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["bug", "feature", "improvement", "other"]
        },
        {
            name: "title",
            type: "text",
            required: false,
            max: 200
        },
        {
            name: "description",
            type: "text",
            required: true,
            min: 1,
            max: 5000
        },
        {
            name: "screenshots",
            type: "json",
            required: false
        },
        {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["new", "in_review", "planned", "in_progress", "completed", "declined"]
        },
        {
            name: "admin_response",
            type: "text",
            required: false,
            max: 2000
        },
        {
            name: "responded_by",
            type: "relation",
            required: false,
            collectionId: usersCollection.id,
            maxSelect: 1
        },
        {
            name: "responded_at",
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

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("feedbacks");
  if (collection) {
    return app.delete(collection);
  }
});
