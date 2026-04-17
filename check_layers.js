const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const filename = 'osm-2020-02-10-v3.11_india_bengaluru.mbtiles';
const dbPath = path.join(__dirname, filename);

if (!fs.existsSync(dbPath)) {
  console.error(`Error: File ${filename} not found in ${__dirname}`);
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });
const row = db.prepare("SELECT value FROM metadata WHERE name = 'json'").get();

if (row && row.value) {
    try {
        const json = JSON.parse(row.value);
        if (json.vector_layers) {
            console.log("Found layers:");
            json.vector_layers.forEach(l => console.log(`- ${l.id}`));
        } else {
            console.log("No vector_layers in json metadata");
        }
    } catch(e) {
        console.log("Error parsing json metadata");
    }
} else {
    console.log("No json metadata found");
}
db.close();