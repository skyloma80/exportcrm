/// <reference path="../pb_data/types.d.ts" />

/**
 * User Settings Migration
 * 
 */
migrate((app) => {
  const collection = new Collection({
    name: "user_settings",
    type: "base",
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: "@request.auth.id != ''"
  });

  // 使用新版 API 添加字段
  collection.fields.add(new Field({ name: "user_id", type: "text", required: true }));
  collection.fields.add(new Field({ name: "smtp_host", type: "text" }));
  collection.fields.add(new Field({ name: "smtp_port", type: "number" }));
  collection.fields.add(new Field({ name: "smtp_user", type: "text" }));
  collection.fields.add(new Field({ name: "smtp_pass", type: "text" }));
  collection.fields.add(new Field({ name: "smtp_from", type: "text" }));
  collection.fields.add(new Field({ name: "smtp_secure", type: "bool" }));
  collection.fields.add(new Field({ name: "rfq_email_company_name", type: "text" }));
  collection.fields.add(new Field({ name: "rfq_email_subject", type: "text" }));
  collection.fields.add(new Field({ name: "rfq_email_greeting", type: "text" }));
  collection.fields.add(new Field({ name: "rfq_email_intro", type: "text" }));
  collection.fields.add(new Field({ name: "rfq_email_closing", type: "text" }));
  collection.fields.add(new Field({ name: "rfq_email_signature", type: "text" }));
  collection.fields.add(new Field({ name: "rfq_email_footer", type: "text" }));
  collection.fields.add(new Field({ name: "language", type: "text" }));
  collection.fields.add(new Field({ name: "timezone", type: "text" }));
  collection.fields.add(new Field({ name: "currency", type: "text" }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("user_settings");
  return app.delete(collection);
});
