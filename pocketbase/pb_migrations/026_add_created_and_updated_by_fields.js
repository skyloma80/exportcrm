/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Add created_by and updated_by fields to orders collection
 */
migrate((app) => {
  const ordersCollection = app.findCollectionByNameOrId("orders");

  // Remove the incorrectly named field if it exists (for cases where previous version was deployed)
  const existingCreatorField = ordersCollection.fields.getByName("creator_by");
  if (existingCreatorField) {
    ordersCollection.fields.removeByName("creator_by");
  }

  // Add created_by field to orders collection
  ordersCollection.fields.add(new Field({
    name: "created_by",
    type: "relation",
    required: false, // Making it optional initially for existing records
    collectionId: "_pb_users_auth_", // PocketBase default users collection
    maxSelect: 1
  }));

  // Add updated_by field to orders collection
  ordersCollection.fields.add(new Field({
    name: "updated_by",
    type: "relation",
    required: false, // Making it optional
    collectionId: "_pb_users_auth_", // PocketBase default users collection
    maxSelect: 1
  }));

  // Update delete rule to restrict deletion to creator only for draft orders
  ordersCollection.deleteRule = "@request.auth.id = created_by && status = 'draft'";
  
  return app.save(ordersCollection);
}, (app) => {
  const ordersCollection = app.findCollectionByNameOrId("orders");
  
  // Restore original delete rule
  ordersCollection.deleteRule = "@request.auth.id != ''";
  
  return app.save(ordersCollection);
});