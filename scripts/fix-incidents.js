const db = require('better-sqlite3')('./trafficmaxxers.db');

try {
    console.log('--- Incident Database Cleanup ---');
    
    const beforeCount = db.prepare('SELECT COUNT(*) as cnt FROM incidents').get().cnt;
    console.log(`Incidents before cleanup: ${beforeCount}`);

    if (beforeCount > 0) {
        db.exec('DELETE FROM incidents');
        const afterCount = db.prepare('SELECT COUNT(*) as cnt FROM incidents').get().cnt;
        console.log(`Cleared all incidents. Count is now: ${afterCount}`);
    }

    // Re-add just the 3 original, stable seed incidents
    const seedStmt = db.prepare(`
        INSERT OR IGNORE INTO incidents (id, type, severity, location_lat, location_lng, affected_radius_meters, status, description, speed_reduction_factor) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const seedIncidents = [
        ['INC-001', 'accident', 'high', 12.9172, 77.6229, 800, 'active', 'Multi-vehicle collision at Silk Board Junction', 0.3],
        ['INC-002', 'construction', 'medium', 12.9750, 77.6060, 500, 'active', 'Metro construction work on MG Road', 0.6],
        ['INC-003', 'congestion', 'low', 13.0358, 77.5970, 600, 'active', 'Heavy traffic near Hebbal Flyover', 0.7]
    ];

    const insertMany = db.transaction((incidents) => {
        for (const inc of incidents) seedStmt.run(...inc);
    });

    insertMany(seedIncidents);
    
    const finalCount = db.prepare('SELECT COUNT(*) as cnt FROM incidents').get().cnt;
    console.log(`Re-seeded database with ${finalCount} stable incidents.`);
    console.log('---------------------------------');

} catch (error) {
    console.error('Error fixing incidents:', error.message);
} finally {
    db.close();
}
