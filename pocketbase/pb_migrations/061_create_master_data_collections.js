/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 061: Create master data collections
 * Extracts data from AppConfig JSON into dedicated collections.
 */
migrate((app) => {
  const createIfNotExists = (name, config) => {
    try {
      app.findCollectionByNameOrId(name);
      console.log(`Collection ${name} already exists, skipping.`);
      return null;
    } catch (e) {
      const collection = new Collection(config);
      return app.save(collection);
    }
  };

  const baseRule = "@request.auth.id != ''";

  // 1. ports_of_destination
  createIfNotExists("ports_of_destination", {
    name: "ports_of_destination",
    type: "base",
    system: false,
    listRule: baseRule,
    viewRule: baseRule,
    createRule: baseRule,
    updateRule: baseRule,
    deleteRule: baseRule,
    fields: [
      { name: "code", type: "text", required: true, max: 20 },
      { name: "name", type: "text", required: true, max: 200 },
      { name: "name_cn", type: "text", required: false, max: 200 },
      { name: "sort_order", type: "number", required: false },
      { name: "is_active", type: "bool", required: false },
    ],
  });

  // 2. ports_of_loading
  createIfNotExists("ports_of_loading", {
    name: "ports_of_loading",
    type: "base",
    system: false,
    listRule: baseRule,
    viewRule: baseRule,
    createRule: baseRule,
    updateRule: baseRule,
    deleteRule: baseRule,
    fields: [
      { name: "code", type: "text", required: true, max: 20 },
      { name: "name", type: "text", required: true, max: 200 },
      { name: "name_cn", type: "text", required: false, max: 200 },
      { name: "sort_order", type: "number", required: false },
      { name: "is_active", type: "bool", required: false },
    ],
  });

  // 3. payment_terms
  createIfNotExists("payment_terms", {
    name: "payment_terms",
    type: "base",
    system: false,
    listRule: baseRule,
    viewRule: baseRule,
    createRule: baseRule,
    updateRule: baseRule,
    deleteRule: baseRule,
    fields: [
      { name: "code", type: "text", required: true, max: 20 },
      { name: "name", type: "text", required: true, max: 300 },
      { name: "name_cn", type: "text", required: false, max: 300 },
      { name: "sort_order", type: "number", required: false },
      { name: "is_active", type: "bool", required: false },
    ],
  });

  // 4. document_branding
  createIfNotExists("document_branding", {
    name: "document_branding",
    type: "base",
    system: false,
    listRule: baseRule,
    viewRule: baseRule,
    createRule: baseRule,
    updateRule: baseRule,
    deleteRule: baseRule,
    fields: [
      { name: "company_name", type: "text", required: false, max: 500 },
      { name: "company_name_cn", type: "text", required: false, max: 500 },
      { name: "website_url", type: "text", required: false, max: 500 },
      { name: "vat", type: "text", required: false, max: 100 },
      { name: "logo_base64", type: "json", required: false },
      { name: "logo_url", type: "text", required: false, max: 1000 },
      { name: "stamp_base64", type: "json", required: false },
      { name: "signature_base64", type: "json", required: false },
      { name: "logo_path", type: "text", required: false, max: 1000 },
      { name: "stamp_path", type: "text", required: false, max: 1000 },
      { name: "primary_office", type: "json", required: false },
      { name: "secondary_office", type: "json", required: false },
      { name: "default_signer", type: "json", required: false },
    ],
  });

  // 5. company_info
  createIfNotExists("company_info", {
    name: "company_info",
    type: "base",
    system: false,
    listRule: baseRule,
    viewRule: baseRule,
    createRule: baseRule,
    updateRule: baseRule,
    deleteRule: baseRule,
    fields: [
      { name: "company_name", type: "text", required: false, max: 500 },
      { name: "company_name_cn", type: "text", required: false, max: 500 },
      { name: "address", type: "text", required: false, max: 1000 },
      { name: "email", type: "email", required: false },
      { name: "phone", type: "text", required: false, max: 100 },
      { name: "website", type: "text", required: false, max: 500 },
    ],
  });
}, (app) => {
  const collectionsToDelete = ["ports_of_destination", "ports_of_loading", "payment_terms", "document_branding", "company_info"];
  for (const name of collectionsToDelete) {
    try {
      app.delete(app.findCollectionByNameOrId(name));
    } catch (e) {}
  }
});
