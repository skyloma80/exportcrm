/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create customer activities collection
 *
 * Creates customer_activities collection for tracking customer interaction history
 */
migrate((app) => {
  // 获取customer_tracking集合的ID
  const customerTrackingCollection = app.findCollectionByNameOrId("customer_tracking");
  if (!customerTrackingCollection) {
    throw new Error("Customer tracking collection not found");
  }

  const collection = new Collection({
    name: "customer_activities",
    type: "base",
    system: false,
    fields: [
      {
        name: "customer_tracking_id",
        type: "relation",
        required: true,
        collectionId: customerTrackingCollection.id,
        cascadeDelete: true,
        maxSelect: 1
      },
      {
        name: "user",
        type: "text",
        required: false,
        max: 100
      },
      {
        name: "description",
        type: "text",
        required: true,
        max: 500
      },
      {
        name: "timestamp",
        type: "date",
        required: true
      },
      {
        name: "is_recent",
        type: "bool",
        required: false
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
    createRule: "@request.auth.id != ''", // 允许任何授权用户创建活动记录
    updateRule: "@request.auth.id != ''", // 在实际应用中，可以通过API钩子实现只允许创建者更新
    deleteRule: "@request.auth.id != ''" // 在实际应用中，可以通过API钩子实现只允许创建者删除
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("customer_activities");
  return app.delete(collection);
});