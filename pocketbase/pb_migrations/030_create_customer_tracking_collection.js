/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create customer tracking collection
 *
 * Creates customer_tracking collection for tracking customer interactions and status
 */
migrate((app) => {
  // 获取customers集合的ID
  const customersCollection = app.findCollectionByNameOrId("customers");
  if (!customersCollection) {
    throw new Error("Customers collection not found");
  }

  const collection = new Collection({
    name: "customer_tracking",
    type: "base",
    system: false,
    fields: [
      {
        name: "customer_id",
        type: "relation",
        required: true,
        collectionId: customersCollection.id,
        cascadeDelete: false,
        maxSelect: 1
      },
      {
        name: "status",
        type: "select",
        required: false,
        maxSelect: 1,
        values: ["Active", "Lead", "Follow-up", "Onboarded"]
      },
      {
        name: "priority",
        type: "select",
        required: false,
        maxSelect: 1,
        values: ["Low", "Medium", "High"]
      },
      {
        name: "contact_status",
        type: "select",
        required: false,
        maxSelect: 1,
        values: ["Contacted", "Replied", "No Reply"]
      },
      {
        name: "next_action_icon",
        type: "select",
        required: false,
        maxSelect: 1,
        values: ["event", "schedule", "warning", "check_circle", "calendar", "clock", "alert_triangle", "check"]
      },
      {
        name: "next_action_text",
        type: "text",
        required: false,
        max: 200
      },
      {
        name: "next_step_action",
        type: "text",
        required: false,
        max: 100
      },
      {
        name: "next_step_date",
        type: "date",
        required: false
      },
      {
        name: "notes",
        type: "text",
        required: false,
        max: 2000
      },
      // Standard fields
      {
        name: "created_by",
        type: "relation",
        required: false,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 1
      },
      {
        name: "updated_by",
        type: "relation",
        required: false,
        collectionId: "_pb_users_auth_",
        cascadeDelete: false,
        maxSelect: 1
      }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''", // 允许授权用户更新，而不仅仅是创建者
    deleteRule: "@request.auth.id != ''" // 允许授权用户删除
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("customer_tracking");
  return app.delete(collection);
});