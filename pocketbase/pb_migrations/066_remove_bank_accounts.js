migrate(function(app) {
  try {
    var col = app.findCollectionByNameOrId("bank_accounts");
    app.delete(col);
    console.log("Deleted bank_accounts collection");
  } catch(e) {
    console.log("Collection bank_accounts not found, skipping.");
  }
}, function(app) {
  console.log("Rollback not implemented.");
});
