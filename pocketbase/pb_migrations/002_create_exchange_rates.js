/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Create exchange rate collections
 * 
 * Creates two collections:
 * 1. exchange_rate_cache - Stores the latest exchange rates (updated daily)
 * 2. exchange_rate_history - Stores historical exchange rates for trend analysis
 */
migrate((app) => {
  // ============================================================================
  // exchange_rate_cache - 汇率缓存表
  // ============================================================================
  const cacheCollection = new Collection({
    name: "exchange_rate_cache",
    type: "base",
    system: false,
    fields: [
        {
            name: "base_currency",
            type: "text",
            required: true,
            min: 3,
            max: 3,
            pattern: "^[A-Z]{3}$"
        },
        {
            name: "target_currency",
            type: "text",
            required: true,
            min: 3,
            max: 3 
        },
        {
            name: "rate",
            type: "number",
            required: true,
            min: 0
        },
        {
            name: "source",
            type: "text",
            required: false,
            max: 50
        },
        {
            name: "fetched_at",
            type: "date",
            required: true
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: "@request.auth.id != ''"
  });

  app.save(cacheCollection);

  // ============================================================================
  // exchange_rate_history - 汇率历史表
  // ============================================================================
  const historyCollection = new Collection({
    name: "exchange_rate_history",
    type: "base",
    system: false,
    fields: [
        {
            name: "date",
            type: "date",
            required: true
        },
        {
            name: "base_currency",
            type: "text",
            required: true,
            min: 3,
            max: 3,
            pattern: "^[A-Z]{3}$"
        },
        {
            name: "target_currency",
            type: "text",
            required: true,
            min: 3,
            max: 3,
            pattern: "^[A-Z]{3}$"
        },
        {
            name: "rate",
            type: "number",
            required: true,
            min: 0
        },
        {
            name: "source",
            type: "text",
            required: false,
            max: 50
        }
    ],
    // Note: Indexes should be added manually via PocketBase Admin UI after collection creation
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: null,
    deleteRule: "@request.auth.id != ''"
  });

  return app.save(historyCollection);
}, (app) => {
  // Rollback
  const cacheCollection = app.findCollectionByNameOrId("exchange_rate_cache");
  app.delete(cacheCollection);
  
  const historyCollection = app.findCollectionByNameOrId("exchange_rate_history");
  return app.delete(historyCollection);
});
