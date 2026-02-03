/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create project collections
 */
migrate((app) => {
  const customersCollection = app.findCollectionByNameOrId("customers");
  const productsCollection = app.findCollectionByNameOrId("products");

  // projects - 项目表
  const projectsCollection = new Collection({
    name: "projects",
    type: "base",
    system: false,
    fields: [
        {
            name: "code",
            type: "text",
            required: true,
            min: 1,
            max: 20 
        },
        {
            name: "name",
            type: "text",
            required: true,
            min: 1,
            max: 200
        },
        {
            name: "name_cn",
            type: "text",
            required: false,
            max: 200
        },
        {
            name: "customer",
            type: "relation",
            required: true,
            collectionId: customersCollection.id,
            maxSelect: 1
        },
        {
            name: "stage",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["lead", "inquiry", "quotation", "negotiation", "won", "lost", "on_hold"]
        },
        {
            name: "probability",
            type: "number",
            required: false,
            min: 0,
            max: 100
        },
        {
            name: "expected_close_date",
            type: "date",
            required: false
        },
        {
            name: "description",
            type: "text",
            required: false,
            max: 2000
        },
        {
            name: "description_cn",
            type: "text",
            required: false,
            max: 2000
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(projectsCollection);

  // products_projects - 产品-项目关联表
  const productsProjectsCollection = new Collection({
    name: "products_projects",
    type: "base",
    system: false,
    fields: [
        {
            name: "product",
            type: "relation",
            required: true,
            collectionId: productsCollection.id,
            maxSelect: 1
        },
        {
            name: "project",
            type: "relation",
            required: true,
            collectionId: projectsCollection.id,
            cascadeDelete: true,
            maxSelect: 1
        },
        {
            name: "usage_note",
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
  return app.save(productsProjectsCollection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("products_projects"));
  return app.delete(app.findCollectionByNameOrId("projects"));
});
