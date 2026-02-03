/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create Project Cost Tables
 * 
 * 项目成本表 - 独立于采购订单，用于汇总项目下所有产品的供应商选择
 */
migrate((app) => {
  const projectsCollection = app.findCollectionByNameOrId("projects");
  const productsCollection = app.findCollectionByNameOrId("products");
  const suppliersCollection = app.findCollectionByNameOrId("suppliers");
  const rfqQuotationsCollection = app.findCollectionByNameOrId("rfq_quotations");

  // project_cost_tables - 项目成本表
  const costTablesCollection = new Collection({
    name: "project_cost_tables",
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
            name: "project",
            type: "relation",
            required: true,
            collectionId: projectsCollection.id,
            cascadeDelete: false,
            maxSelect: 1
        },
        {
            name: "status",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["draft", "confirmed"]
        },
        {
            name: "currency",
            type: "text",
            required: true,
            min: 3,
            max: 3
        },
        {
            name: "total_amount",
            type: "number",
            required: true,
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
  app.save(costTablesCollection);

  // project_cost_table_items - 成本表明细
  const costTableItemsCollection = new Collection({
    name: "project_cost_table_items",
    type: "base",
    system: false,
    fields: [
        {
            name: "cost_table",
            type: "relation",
            required: true,
            collectionId: costTablesCollection.id,
            cascadeDelete: true,
            maxSelect: 1
        },
        {
            name: "product",
            type: "relation",
            required: true,
            collectionId: productsCollection.id,
            cascadeDelete: false,
            maxSelect: 1
        },
        {
            name: "supplier",
            type: "relation",
            required: true,
            collectionId: suppliersCollection.id,
            cascadeDelete: false,
            maxSelect: 1
        },
        {
            name: "rfq_quotation",
            type: "relation",
            required: false,
            collectionId: rfqQuotationsCollection.id,
            cascadeDelete: false,
            maxSelect: 1
        },
        {
            name: "quantity",
            type: "number",
            required: true,
            min: 1
        },
        {
            name: "unit_price",
            type: "number",
            required: true,
            min: 0
        },
        {
            name: "amount",
            type: "number",
            required: true,
            min: 0
        },
        {
            name: "lead_time_days",
            type: "number",
            required: false,
            min: 0,
            noDecimal: true
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });
  return app.save(costTableItemsCollection);
}, (app) => {
  const itemsCollection = app.findCollectionByNameOrId("project_cost_table_items");
  if (itemsCollection) {
    app.delete(itemsCollection);
  }
  const tablesCollection = app.findCollectionByNameOrId("project_cost_tables");
  if (tablesCollection) {
    return app.delete(tablesCollection);
  }
});
