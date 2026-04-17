const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../bangalore_traffic_timely_data.csv');
const outPath = path.join(__dirname, '../src/lib/data/trafficPatterns.json');
const zonesPath = path.join(__dirname, '../src/lib/db/seed-sqlite.sql');

// Extract zone coordinates from seed file
const zoneCoords = {};
const seedContent = fs.readFileSync(zonesPath, 'utf8');
const zoneRegex = /\('ZONE-[^']+', '([^']+)', ([0-9.]+), ([0-9.]+)/g;
let match;
while ((match = zoneRegex.exec(seedContent)) !== null) {
    const name = match[1];
    const lat = parseFloat(match[2]);
    const lng = parseFloat(match[3]);
    
    // Normalize names to match CSV
    let key = name;
    if (name === 'Silk Board Junction') key = 'Silk Board'; 
    // CSV doesn't seem to have Silk Board in the sample, but let's see. 
    // Actually the CSV sample showed: Indiranagar, Koramangala, etc.
    
    // Create a mapping. CSV names are simple.
    // 'Indiranagar' -> match 'Indiranagar'
    zoneCoords[key] = { lat, lng };
}

// Manual Mapping fixups based on CSV unique values seen
zoneCoords['M.G. Road'] = { lat: 12.9750, lng: 77.6060 };
zoneCoords['Silk Board'] = { lat: 12.9172, lng: 77.6229 };
// Add others if missing

console.log('Zone Coords:', zoneCoords);

const fileContent = fs.readFileSync(csvPath, 'utf8');
const lines = fileContent.split('\n');
const headers = lines[0].split(',');

// Indices
const idxArea = headers.indexOf('Area Name');
const idxVol = headers.indexOf('Traffic Volume');
const idxCong = headers.indexOf('Congestion Level');
const idxTime = headers.indexOf('TimeBlock');

// Data Structure:
// {
//   "Morning": {
//      "Indiranagar": { volume: 1200, congestion: "High" },
//      ...
//   }
// }

const patterns = {};

lines.slice(1).forEach(line => {
    if (!line.trim()) return;
    const parts = line.split(',');
    const area = parts[idxArea];
    const vol = parseInt(parts[idxVol]) || 0;
    const cong = parts[idxCong];
    const time = parts[idxTime];

    if (!area || !time) return;

    if (!patterns[time]) patterns[time] = {};
    if (!patterns[time][area]) {
        patterns[time][area] = { volumes: [], congestions: [] };
    }

    patterns[time][area].volumes.push(vol);
    patterns[time][area].congestions.push(cong);
});

// Aggregate
const finalData = {};
Object.keys(patterns).forEach(time => {
    finalData[time] = {};
    Object.keys(patterns[time]).forEach(area => {
        const data = patterns[time][area];
        const avgVol = data.volumes.reduce((a, b) => a + b, 0) / data.volumes.length;
        
        // Mode of congestion
        const counts = {};
        data.congestions.forEach(c => counts[c] = (counts[c] || 0) + 1);
        const modeCong = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);

        finalData[time][area] = {
            volume: Math.round(avgVol),
            congestion: modeCong,
            lat: zoneCoords[area]?.lat || zoneCoords[area.replace(' Road', '')]?.lat || 12.9716, // Fallback to center
            lng: zoneCoords[area]?.lng || zoneCoords[area.replace(' Road', '')]?.lng || 77.5946
        };
    });
});

// Create dir if not exists
const dir = path.dirname(outPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outPath, JSON.stringify(finalData, null, 2));
console.log('Traffic patterns generated at', outPath);
