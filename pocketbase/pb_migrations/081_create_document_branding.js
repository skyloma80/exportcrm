/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 081: Create document_branding collection
 *
 * 文档品牌配置表 - 存储公司信息、Logo、印章、签名等
 * 用于 PI/PO/邮件等文档的品牌展示
 */
migrate((app) => {
  // Skip if collection already exists (idempotent)
  let existing;
  try {
    existing = app.findCollectionByNameOrId("document_branding");
  } catch (e) {
    existing = null;
  }
  if (existing) {
    console.log("document_branding already exists, skipping creation.");
    return;
  }

  const collection = new Collection({
    name: "document_branding",
    type: "base",
    system: false,
    fields: [
      {
        name: "company_name",
        type: "text",
        required: false,
        max: 500,
      },
      {
        name: "company_name_cn",
        type: "text",
        required: false,
        max: 500,
      },
      {
        name: "website_url",
        type: "text",
        required: false,
        max: 500,
      },
      {
        name: "vat",
        type: "text",
        required: false,
        max: 100,
      },
      {
        name: "logo_url",
        type: "text",
        required: false,
        max: 1000,
      },
      {
        name: "logo_path",
        type: "text",
        required: false,
        max: 1000,
      },
      {
        name: "stamp_path",
        type: "text",
        required: false,
        max: 1000,
      },
      {
        name: "primary_office",
        type: "json",
        required: false,
      },
      {
        name: "secondary_office",
        type: "json",
        required: false,
      },
      {
        name: "default_signer",
        type: "json",
        required: false,
      },
      {
        name: "logo_base64",
        type: "json",
        required: false,
      },
      {
        name: "stamp_base64",
        type: "json",
        required: false,
      },
      {
        name: "signature_base64",
        type: "json",
        required: false,
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
  const collection = app.findCollectionByNameOrId("document_branding");
  if (collection) {
    return app.delete(collection);
  }
});
