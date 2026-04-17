import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Singleton connection to MBTiles
// Try to be smart about finding the file
const FILENAME = 'osm-2020-02-10-v3.11_india_bengaluru.mbtiles';
const MBTILES_PATH = path.join(process.cwd(), FILENAME);

const globalForTiles = globalThis as unknown as {
  tilesDb: Database.Database | undefined;
};

export function getTilesDb() {
  if (!globalForTiles.tilesDb) {
    console.log('🗺️ Opening MBTiles database:', MBTILES_PATH);
    
    if (!fs.existsSync(MBTILES_PATH)) {
        console.error(`❌ MBTiles file NOT FOUND at: ${MBTILES_PATH}`);
        console.error(`   Please ensure '${FILENAME}' is in the project root.`);
        throw new Error(`MBTiles file not found: ${MBTILES_PATH}`);
    }

    try {
        globalForTiles.tilesDb = new Database(MBTILES_PATH, { 
            readonly: true, 
            fileMustExist: true,
            timeout: 5000 
        });
        console.log('✅ MBTiles database opened successfully');
    } catch (e) {
        console.error('❌ Failed to open MBTiles:', e);
        throw e;
    }
  }
  return globalForTiles.tilesDb;
}