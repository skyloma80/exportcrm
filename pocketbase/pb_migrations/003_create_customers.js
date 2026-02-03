/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create customer collections
 * 
 * Creates two collections:
 * 1. customers - Main customer information
 * 2. customer_contacts - Customer contact persons
 */
migrate((app) => {
  // ============================================================================
  // customers - 客户表
  // ============================================================================
  const customersCollection = new Collection({
    name: "customers",
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
            required: true
            
        },
        {
            name: "type",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["direct", "agent", "distributor"]
        },
        {
            name: "rating",
            type: "number",
            required: false,
            min: 1,
            max: 5
        },
        {
            name: "preferred_currency",
            type: "text",
            required: false,
            min: 3,
            max: 3
            
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
            name: "website",
            type: "url",
            required: false
        },
        {
            name: "remarks",
            type: "text",
            required: false,
            max: 2000
        },
        {
            name:"tax_id",
            type:"text",
            required: false,
            max: 50

        }

    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });

  app.save(customersCollection);

  // ============================================================================
  // customer_contacts - 客户联系人表
  // ============================================================================
  const contactsCollection = new Collection({
    name: "customer_contacts",
    type: "base",
    system: false,
    fields: [
        {
            name: "customer",
            type: "relation",
            required: true,
            collectionId: customersCollection.id,
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

  return app.save(contactsCollection);
}, (app) => {
  // Rollback
  const contactsCollection = app.findCollectionByNameOrId("customer_contacts");
  app.delete(contactsCollection);
  
  const customersCollection = app.findCollectionByNameOrId("customers");
  return app.delete(customersCollection);
});
