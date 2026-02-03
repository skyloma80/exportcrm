/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create bank_accounts collection
 * 公司银行账户表 - 用于 PI 文档等
 */
migrate((app) => {
  const collection = new Collection({
    name: "bank_accounts",
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
            name: "content",
            type: "text",
            required: true,
            max: 2000
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
  const collection = app.findCollectionByNameOrId("bank_accounts");
  if (collection) {
    return app.delete(collection);
  }
});
