/// <reference path="../pb_data/types.d.ts" />

migrate(function(app) {
  // Delete empty records from previous failed runs
  try {
    var docs = app.findRecordsByFilter("document_branding", "company_name = '' || company_name IS NULL");
    for (var i = 0; i < docs.length; i++) { app.delete(docs[i]); }
  } catch(ex) {}
  try {
    var infos = app.findRecordsByFilter("company_info", "company_name = '' || company_name IS NULL");
    for (var i = 0; i < infos.length; i++) { app.delete(infos[i]); }
  } catch(ex) {}

  // Change long text fields to json type to bypass length limits
  try {
    var col = app.findCollectionByNameOrId("document_branding");
    var fieldNames = ["logo_base64", "stamp_base64", "signature_base64"];
    for (var fi = 0; fi < fieldNames.length; fi++) {
      var existingField = col.fields.getByName(fieldNames[fi]);
      if (existingField) {
        col.fields.removeById(existingField.id);
      }
    }
    col.fields.add(new Field({ name: "logo_base64", type: "json", required: false }));
    col.fields.add(new Field({ name: "stamp_base64", type: "json", required: false }));
    col.fields.add(new Field({ name: "signature_base64", type: "json", required: false }));
    app.save(col);
    console.log("Fixed document_branding field types");
  } catch(ex) {
    console.log("Field fix error: " + JSON.stringify(ex));
  }

  function getConfig(key) {
    try {
      var records = app.findRecordsByFilter("app_config", "key = \"" + key + "\"");
      if (records.length > 0) {
        var s = records[0].getString("value");
        console.log("getConfig " + key + " rawStr=" + s.substring(0, 120));
        var parsed = JSON.parse(s);
        console.log("getConfig " + key + " parsed type=" + typeof parsed + " isArray=" + Array.isArray(parsed));
        if (typeof parsed === "object" && !Array.isArray(parsed) && !parsed) {
          console.log("getConfig " + key + " plain obj keys=" + Object.keys(parsed).join(","));
        }
        return parsed;
      }
    } catch(e) {
      console.log("getConfig error for " + key + ": " + JSON.stringify(e));
    }
    return null;
  }

  function insertRecord(collectionName, data) {
    if (!data) return;
    try {
      var col = app.findCollectionByNameOrId(collectionName);
      var rec = new Record(col, data);
      app.save(rec);
    } catch(e) {
      console.log("Failed to insert into " + collectionName + ": " + JSON.stringify(e));
    }
  }

  function insertSingle(collectionName, data) {
    if (!data) return;
    try {
      var existing = app.findRecordsByFilter(collectionName, "1=1");
      // Delete existing records to ensure clean insert
      for (var i = 0; i < existing.length; i++) {
        app.delete(existing[i]);
      }
      insertRecord(collectionName, data);
    } catch(e) {
      console.log("Failed to insert into " + collectionName + ": " + JSON.stringify(e));
    }
  }

  // 1. ports_of_destination
  var destinationPorts = getConfig("ports_of_destination");
  console.log("ports_of_destination type=" + typeof destinationPorts + " isArray=" + Array.isArray(destinationPorts) + " ctor=" + (destinationPorts ? destinationPorts.constructor ? destinationPorts.constructor.name : "no ctor" : "null"));
  if (destinationPorts) {
    var arr = Array.isArray(destinationPorts) ? destinationPorts : (Object.values(destinationPorts));
    if (Array.isArray(arr) && arr.length > 0) {
      var existingCount = app.findRecordsByFilter("ports_of_destination", "1=1").length;
      if (existingCount === 0) {
        console.log("Migrating " + arr.length + " destination ports");
        for (var i = 0; i < arr.length; i++) {
          var p = arr[i];
          insertRecord("ports_of_destination", {
            code: p.code, name: p.name, name_cn: p.name_cn || "",
            sort_order: i + 1, is_active: true
          });
        }
      } else {
        console.log("ports_of_destination already has " + existingCount + " records, skipping");
      }
    }
  }

  // 2. ports_of_loading
  var loadingPorts = getConfig("ports_of_loading");
  if (loadingPorts) {
    var arr = Array.isArray(loadingPorts) ? loadingPorts : (Object.values(loadingPorts));
    if (Array.isArray(arr) && arr.length > 0) {
      var existingCount = app.findRecordsByFilter("ports_of_loading", "1=1").length;
      if (existingCount === 0) {
        console.log("Migrating " + arr.length + " loading ports");
        for (var i = 0; i < arr.length; i++) {
          var p = arr[i];
          insertRecord("ports_of_loading", {
            code: p.code, name: p.name, name_cn: p.name_cn || "",
            sort_order: i + 1, is_active: true
          });
        }
      } else {
        console.log("ports_of_loading already has " + existingCount + " records, skipping");
      }
    }
  }

  // 3. payment_terms
  var terms = getConfig("payment_terms");
  if (terms) {
    var arr = Array.isArray(terms) ? terms : (Object.values(terms));
    if (Array.isArray(arr) && arr.length > 0) {
      var existingCount = app.findRecordsByFilter("payment_terms", "1=1").length;
      if (existingCount === 0) {
        console.log("Migrating " + arr.length + " payment terms");
        for (var i = 0; i < arr.length; i++) {
          var t = arr[i];
          insertRecord("payment_terms", {
            code: t.code, name: t.name, name_cn: t.name_cn || "",
            sort_order: i + 1, is_active: true
          });
        }
      } else {
        console.log("payment_terms already has " + existingCount + " records, skipping");
      }
    }
  }

  // 4. document_branding
  var branding = getConfig("document_branding");
  if (branding && typeof branding === "object") {
    console.log("Migrating document_branding");
    insertSingle("document_branding", {
      company_name: branding.company_name || "",
      company_name_cn: branding.company_name_cn || "",
      website_url: branding.website_url || "",
      vat: branding.vat || "",
      logo_base64: branding.logo_base64 || "",
      logo_url: branding.logo_url || "",
      stamp_base64: branding.stamp_base64 || "",
      signature_base64: branding.signature_base64 || "",
      logo_path: branding.logo_path || "",
      stamp_path: branding.stamp_path || "",
      primary_office: branding.primary_office || {},
      secondary_office: branding.secondary_office || {},
      default_signer: branding.default_signer || {},
    });
  }

  // 5. company_info (from "general" key)
  var general = getConfig("general");
  if (general && typeof general === "object") {
    console.log("Migrating company_info");
    insertSingle("company_info", {
      company_name: general.companyName || general.company_name || "",
      company_name_cn: general.companyNameCn || general.company_name_cn || "",
      address: general.address || "",
      email: general.email || "",
      phone: general.phone || "",
      website: general.website || "",
    });
  }
}, function(app) {
  console.log("Rollback not implemented.");
});