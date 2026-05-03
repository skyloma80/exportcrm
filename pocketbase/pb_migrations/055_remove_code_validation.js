/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Remove code field validation (min/max) from collections
 *
 * Reason: Code validation should be done in application layer, not database
 * This migration removes min/max constraints from code fields
 */
migrate((app) => {
  const collectionsToUpdate = [
    "suppliers",
    "customers",
    "projects",
    "products",
    "quotations",
    "rfqs",
    "so",
    "po"
  ];

  for (const collectionName of collectionsToUpdate) {
    const collection = app.findCollectionByNameOrId(collectionName);
    if (!collection) {
      console.log("Collection " + collectionName + " not found, skipping");
      continue;
    }

    // Find and update the code field
    let codeField = null;
    for (var i = 0; i < collection.fields.length; i++) {
      if (collection.fields[i].name === "code") {
        codeField = collection.fields[i];
        break;
      }
    }

    if (codeField && (codeField.min !== null || codeField.max !== null)) {
      codeField.min = null;
      codeField.max = null;
      console.log("Removed min/max validation from code field in " + collectionName);
      app.save(collection);
    }
  }

  console.log("Migration complete: removed code field validation");
}, function(app) {
  console.log("Rollback not implemented for this migration");
});