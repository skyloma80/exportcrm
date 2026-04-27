/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create remittance collection
 * 汇款指令模板表 - 用于 PI 文档的汇款信息
 */
migrate((app) => {
  const collection = new Collection({
    name: "remittance",
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
        name: "items",
        type: "json",
        required: false,
        constraints: {
          JSON: {
            schema: {
              type: "array",
              items: {
                type: "string"
              }
            }
          }
        }
      },
      {
        name: "is_default",
        type: "bool",
        required: false
      }
    ],
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("remittance");
  if (collection) {
    return app.delete(collection);
  }
});