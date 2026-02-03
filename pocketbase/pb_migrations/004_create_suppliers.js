/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create supplier collections
 */
migrate((app) => {
  // suppliers - 供应商表
  const suppliersCollection = new Collection({
    name: "suppliers",
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
            name: "country",
            type: "text",
            required: true,
            min: 2,
            max: 2
        },
        {
            name: "type",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["manufacturer", "trader", "agent"]
        },
        {
            name: "rating",
            type: "number",
            required: false,
            min: 1,
            max: 5
        },
        {
            name: "address",
            type: "text",
            required: false,
            max: 500
        },
        {
            name: "address_cn",
            type: "text",
            required: false,
            max: 500
        },
        {
            name: "capabilities",
            type: "json",
            required: false
        },
        {
            name: "certifications",
            type: "json",
            required: false
        },
        {
            name: "remarks",
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
  app.save(suppliersCollection);

  // supplier_contacts - 供应商联系人表
  const contactsCollection = new Collection({
    name: "supplier_contacts",
    type: "base",
    system: false,
    fields: [
        {
            name: "supplier",
            type: "relation",
            required: true,
            collectionId: suppliersCollection.id,
            cascadeDelete: true,
            maxSelect: 1
        },
        {
            name: "name",
            type: "text",
            required: true,
            min: 1,
            max: 100
        },
        {
            name: "position",
            type: "text",
            required: false,
            max: 100
        },
        {
            name: "email",
            type: "email",
            required: false
        },
        {
            name: "phone",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "wechat",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "is_primary",
            type: "bool",
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
  app.save(contactsCollection);

  // supplier_bank_accounts - 供应商银行账户表
  const bankAccountsCollection = new Collection({
    name: "supplier_bank_accounts",
    type: "base",
    system: false,
    fields: [
        {
            name: "supplier",
            type: "relation",
            required: true,
            collectionId: suppliersCollection.id,
            cascadeDelete: true,
            maxSelect: 1
        },
        {
            name: "bank_name",
            type: "text",
            required: true,
            min: 1,
            max: 200
        },
        {
            name: "account_name",
            type: "text",
            required: true,
            min: 1,
            max: 200
        },
        {
            name: "account_number",
            type: "text",
            required: true,
            min: 1,
            max: 50
        },
        {
            name: "swift_code",
            type: "text",
            required: false,
            max: 20
        },
        {
            name: "currency",
            type: "text",
            required: false,
            min: 3,
            max: 3
        },
        {
            name: "is_default",
            type: "bool",
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
  return app.save(bankAccountsCollection);
}, (app) => {
  app.delete(app.findCollectionByNameOrId("supplier_bank_accounts"));
  app.delete(app.findCollectionByNameOrId("supplier_contacts"));
  return app.delete(app.findCollectionByNameOrId("suppliers"));
});
