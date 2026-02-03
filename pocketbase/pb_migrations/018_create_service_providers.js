/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create Service Providers collection
 */
migrate((app) => {
  const collection = new Collection({
    name: "service_providers",
    type: "base",
    system: false,
    fields: [
        {
            name: "code",
            type: "text",
            required: true,
            min: 1,
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
            name: "type",
            type: "select",
            required: true,
            maxSelect: 1,
            values: ["freight_forwarder", "customs_broker", "shipping_line", "trucking", "warehouse", "inspection", "insurance", "other"]
        },
        {
            name: "country",
            type: "text",
            required: false,
            max: 100
        },
        {
            name: "city",
            type: "text",
            required: false,
            max: 100
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
            name: "contact_name",
            type: "text",
            required: false,
            max: 100
        },
        {
            name: "contact_phone",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "contact_email",
            type: "email",
            required: false
        },
        {
            name: "contact_wechat",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "services",
            type: "json",
            required: false
        },
        {
            name: "rating",
            type: "number",
            required: false,
            min: 0,
            max: 5
        },
        {
            name: "is_active",
            type: "bool",
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

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("service_providers");
  if (collection) {
    return app.delete(collection);
  }
});
