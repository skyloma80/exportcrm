/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create code_sequences collection
 * 
 * This collection stores the sequence counters for generating business codes.
 * Format: {PREFIX}-{YYYY}-{XXXX}
 * Example: C-2025-0001, RFQ-2025-0001
 */
migrate((app) => {
  const collection = new Collection({
    name: "code_sequences",
    type: "base",
    system: false,
    fields: [
        {
            name: "prefix",
            type: "text",
            required: true,
            min: 1,
            max: 10,
            pattern: "^[A-Z]+$"
        },
        {
            name: "year",
            type: "number",
            required: true,
            min: 2020,
            max: 2100
        },
        {
            name: "current_sequence",
            type: "number",
            required: true,
            min: 0,
            max: 99999
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    createRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id != ''",
    deleteRule: null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("code_sequences");
  return app.delete(collection);
});
