/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration: Enhance bank info and order bank structure
 */
migrate((app) => {
  const bankAccountsCollection = app.findCollectionByNameOrId("bank_accounts");
  const ordersCollection = app.findCollectionByNameOrId("orders");

  // 1. Add 'lines' (json) to bank_accounts to store structured items
  bankAccountsCollection.fields.add(new Field({
    name: "lines",
    type: "json",
    required: false
  }));
  app.save(bankAccountsCollection);

  // 2. Change bank_info in orders to json and migrate data
  const bankInfoField = ordersCollection.fields.getByName("bank_info");
  if (bankInfoField && bankInfoField.type !== 'json') {
      // 2.1 Temporary field to hold data
      ordersCollection.fields.add(new Field({
        name: "bank_info_tmp",
        type: "json",
        required: false
      }));
      app.save(ordersCollection);

      // 2.2 Manually migrate data for each order (This part is tricky in PB JS migrations)
      // Usually we'd use app.dao().findRecordsByFilter(...)
      try {
          const records = app.dao().findRecordsByFilter("orders", "bank_info != ''");
          for (const record of records) {
              const oldText = record.getString("bank_info");
              if (oldText) {
                  record.set("bank_info_tmp", oldText.split('\n').filter(l => l.trim() !== ''));
                  app.dao().saveRecord(record);
              }
          }
      } catch (e) {
          console.log("Migration warning: Could not migrate bank_info data automatically.");
      }

      // 2.3 Swap fields
      ordersCollection.fields.removeByName("bank_info");
      ordersCollection.fields.add(new Field({
        name: "bank_info",
        type: "json",
        required: false
      }));
      app.save(ordersCollection);

      // 2.4 Restore data from tmp
      try {
          const records = app.dao().findRecordsByFilter("orders", "bank_info_tmp != ''");
          for (const record of records) {
              record.set("bank_info", record.get("bank_info_tmp"));
              app.dao().saveRecord(record);
          }
      } catch (e) {}

      // 2.5 Remove tmp
      ordersCollection.fields.removeByName("bank_info_tmp");
      app.save(ordersCollection);
  }

}, (app) => {
  // Rollback logic
});
