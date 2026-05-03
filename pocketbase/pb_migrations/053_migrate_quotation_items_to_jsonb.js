/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 053: Migrate existing quotation_items to JSONB items field
 *
 * NOTE: Data migration is skipped. Data will be handled by application layer.
 * The items field has been added to quotations collection in migration 052.
 * Application code will read from both quotation_items (legacy) and items (new) fields.
 */
migrate((app) => {
  var quotationsCollection = app.findCollectionByNameOrId("quotations");
  if (!quotationsCollection) {
    console.log("Quotations collection not found, skipping migration");
    return;
  }

  var hasItemsField = false;
  for (var i = 0; i < quotationsCollection.fields.length; i++) {
    if (quotationsCollection.fields[i].name === "items") {
      hasItemsField = true;
      break;
    }
  }

  if (!hasItemsField) {
    console.log("Items field not found in quotations, skipping migration");
    return;
  }

  console.log("Items field exists. Data migration will be handled by application layer.");
  return;
}, function(app) {
});