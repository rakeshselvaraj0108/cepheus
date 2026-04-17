const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const filename = 'osm-2020-02-10-v3.11_india_bengaluru.mbtiles';
const dbPath = path.join(__dirname, filename);

console.log(`Checking for file: ${dbPath}`);

if (!fs.existsSync(dbPath)) {
  console.error(`Error: File ${filename} not found in ${__dirname}`);
  process.exit(1);
}

try {
  const db = new Database(dbPath, { readonly: true });

  // 1. Select format from metadata
  const formatQuery = db.prepare("SELECT value FROM metadata WHERE name = 'format'");
  const formatRow = formatQuery.get();
  const format = formatRow ? formatRow.value : 'NOT FOUND';
  
  console.log(`Metadata format: ${format}`);

  // 2. Inspect the first tile header (first 4 bytes)
  const tileQuery = db.prepare("SELECT tile_data FROM tiles LIMIT 1");
  const tileRow = tileQuery.get();

  if (tileRow && tileRow.tile_data) {
    const buffer = tileRow.tile_data;
    const header = buffer.subarray(0, 4);
    const hexHeader = header.toString('hex');
    console.log(`First tile header (first 4 bytes): ${hexHeader}`);
    
    // Heurisitc
    if (hexHeader.startsWith('1f8b')) console.log("Format: GZIP (PBF Vector)");
    else if (hexHeader.startsWith('89504e47')) console.log("Format: PNG (Raster)");
    else if (hexHeader.startsWith('ffd8')) console.log("Format: JPG (Raster)");
    else console.log("Format: UNKNOWN");

  } else {
    console.log("No tiles found in 'tiles' table.");
  }
  
  // also print json
  const jsonQuery = db.prepare("SELECT value FROM metadata WHERE name = 'json'");
  const jsonRow = jsonQuery.get();
  if (jsonRow) {
      console.log('JSON metadata found (vector tiles usually have this).');
  }

  db.close();

} catch (error) {
  console.error("An error occurred:", error.message);
}