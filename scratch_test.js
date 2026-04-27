const db = require('better-sqlite3')('pocketbase/pb_data/data.db');
const schemaStr = db.prepare("SELECT schema FROM _collections WHERE name='order_items'").get().schema;
const schema = JSON.parse(schemaStr);
console.log(JSON.stringify(schema, null, 2));
