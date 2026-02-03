/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create Tasks collection
 */
migrate((app) => {
  // 获取 users collection
  const usersCollection = app.findCollectionByNameOrId("users");

  const collection = new Collection({
    name: "tasks",
    type: "base",
    system: false,
    fields: [
        {
            name: "title",
            type: "text",
            required: true,
            min: 1,
            max: 200
        },
        {
            name: "description",
            type: "text",
            required: false,
            max: 2000
        },
        {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["pending", "in_progress", "completed", "cancelled"]
        },
        {
            name: "priority",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["low", "medium", "high", "urgent"]
        },
        {
            name: "due_date",
            type: "date",
            required: false
        },
        {
            name: "assignee",
            type: "relation",
            required: false,
            collectionId: usersCollection.id,
            maxSelect: 1
        },
        {
            name: "related_type",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "related_id",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "completed_at",
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
  const collection = app.findCollectionByNameOrId("tasks");
  if (collection) {
    return app.delete(collection);
  }
});
