/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Remove code field pattern validation from shipments
 *
 * Reason: The code field in shipments collection has a pattern validation
 * that prevents valid codes like SHP-2026-0001 from being created
 */
migrate((app) => {
  const shipmentsCollection = app.findCollectionByNameOrId("shipments");
  if (!shipmentsCollection) {
    console.log("Collection shipments not found, skipping");
    return;
  }

  const codeField = shipmentsCollection.fields.find(f => f.name === "code");
  if (!codeField) {
    console.log("Code field not found in shipments, skipping");
    return;
  }

  if (codeField.pattern) {
    console.log("Current code field pattern:", codeField.pattern);
    codeField.pattern = null;
    console.log("Removed pattern validation from code field in shipments");
    app.save(shipmentsCollection);
  } else {
    console.log("No pattern validation found on code field in shipments");
  }

  console.log("Migration complete: removed code field pattern from shipments");
}, function(app) {
  console.log("Rollback not implemented for this migration");
});