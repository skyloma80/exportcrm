/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create product collections
 */
migrate((app) => {
  // product_categories - 产品分类表
  const categoriesCollection = new Collection({
    name: "product_categories",
    type: "base",
    system: false,
    fields: [
        {
            name: "name",
            type: "text",
            required: true,
            min: 1,
            max: 100
        },
        {
            name: "name_cn",
            type: "text",
            required: false,
            max: 100
        },
        {
            name: "sort_order",
            type: "number",
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
  app.save(categoriesCollection);

  // products - 产品表
  const productsCollection = new Collection({
    name: "products",
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
            name: "part_number",
            type: "text",
            required: false,
            max: 50
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
        },
        {
            name: "category",
            type: "relation",
            required: false,
            collectionId: categoriesCollection.id,
            maxSelect: 1
        },
        {
            name: "unit",
            type: "text",
            required: true,
            min: 1,
            max: 10
        },
        {
            name: "hs_code",
            type: "text",
            required: false,
            max: 20
        },
        {
            name: "specifications",
            type: "json",
            required: false
        },
        {
            name: "pcs_per_carton",
            type: "number",
            required: false,
            min: 1
        },
        {
            name: "carton_dimensions",
            type: "json",
            required: false
        },
        {
            name: "carton_gross_weight",
            type: "number",
            required: false,
            min: 0
        },
        {
            name: "carton_net_weight",
            type: "number",
            required: false,
            min: 0
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  app.save(productsCollection);

  // product_molds - 产品模具表
  const moldsCollection = new Collection({
    name: "product_molds",
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
            name: "product",
            type: "relation",
            required: true,
            collectionId: productsCollection.id,
            cascadeDelete: true,
            maxSelect: 1
        },
        {
            name: "type",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["die_casting", "stamping", "injection", "cnc_fixture", "forging", "extrusion"]
        },
        {
            name: "cost",
            type: "number",
            required: true,
            min: 0
        },
        {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["new", "in_use", "maintenance", "retired"]
        },
        {
            name: "lifespan",
            type: "number",
            required: false
        },
        {
            name: "current_usage",
            type: "number",
            required: false
        },
        {
            name: "supplier",
            type: "text",
            required: false,
            max: 200
        },
        {
            name: "delivery_days",
            type: "number",
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
  app.save(moldsCollection);

  // product_documents - 产品文档表
  const documentsCollection = new Collection({
    name: "product_documents",
    type: "base",
    system: false,
    fields: [
        {
            name: "product",
            type: "relation",
            required: true,
            collectionId: productsCollection.id,
            cascadeDelete: true,
            maxSelect: 1
        },
        {
            name: "type",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["drawing", "photo", "specification", "inspection", "certification", "sample_approval", "other"]
        },
        {
            name: "name",
            type: "text",
            required: true,
            min: 1,
            max: 200
        },
        {
            name: "file_path",
            type: "text",
            required: true,
            max: 500
        },
        {
            name: "file_size",
            type: "number",
            required: false
        },
        {
            name: "remarks",
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
  return app.save(documentsCollection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("product_documents"));
  app.delete(app.findCollectionByNameOrId("product_molds"));
  app.delete(app.findCollectionByNameOrId("products"));
  return app.delete(app.findCollectionByNameOrId("product_categories"));
});
