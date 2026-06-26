/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create Product Costs
 *
 * 产品成本表 - 独立于项目和询价单，记录产品-供应商报价及阶梯价
 * 一个产品对应多个供应商，每个供应商可有多条历史报价记录
 * 通过 valid_until 区分当前价(null=有效)和历史价(有值)
 */
migrate((app) => {
  const productsCollection = app.findCollectionByNameOrId("products");
  const suppliersCollection = app.findCollectionByNameOrId("suppliers");

  const collection = new Collection({
    name: "product_costs",
    type: "base",
    system: false,
    fields: [
      {
        name: "product",
        type: "relation",
        required: true,
        collectionId: productsCollection.id,
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        name: "supplier",
        type: "relation",
        required: true,
        collectionId: suppliersCollection.id,
        cascadeDelete: false,
        maxSelect: 1,
      },
      {
        name: "currency",
        type: "text",
        required: true,
        max: 3,
      },
      {
        name: "moq",
        type: "number",
        required: false,
        min: 0,
        noDecimal: true,
      },
      {
        name: "lead_time_days",
        type: "number",
        required: false,
        min: 0,
        noDecimal: true,
      },
      {
        name: "tiers",
        type: "json",
        required: false,
      },
      {
        name: "is_preferred",
        type: "bool",
        required: false,
      },
      {
        name: "valid_from",
        type: "date",
        required: true,
      },
      {
        name: "valid_until",
        type: "date",
        required: false,
      },
      {
        name: "remarks",
        type: "text",
        required: false,
        max: 1000,
      },
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''",
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("product_costs");
  if (collection) {
    return app.delete(collection);
  }
});
