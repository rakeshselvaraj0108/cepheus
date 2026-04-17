# 🚛 Trafficmaxxers

**Real-time AI-powered traffic simulation system for Bangalore**

A sophisticated vehicle fleet management and routing simulation that combines real-time traffic data, weather conditions, and intelligent AI agents to simulate realistic vehicle behavior in Bangalore's road network.

## 🌟 Features

### Core Capabilities
- **🗺️ Real Bangalore Network**: 12 authentic zones (Silk Board, Whitefield, Hebbal, etc.)
- **🚗 Manual Vehicle Management**: Empty fleet by default - you control every vehicle
- **🤖 Intelligent AI Agents**: Using GLM-4.5 Air model with situation imagination
- **📊 FREE UNLIMITED Traffic**: Advanced simulation system with realistic incidents and congestion
- **🌦️ Real Weather Integration**: Live Bangalore weather from OpenWeatherMap
- **🎯 Route Optimization**: Dijkstra's algorithm with multi-factor cost calculation
- **⛽ Fuel Stations**: 6 real refueling locations across Bangalore

### AI Intelligence
The AI agents don't just "make decisions" - they **imagine** being in traffic:
- First-person perspective ("YOU ARE THE DRIVER")
- Sensory descriptions (feel steering wheel, hear traffic, see road conditions)
- Emotional states (anxious about fuel, worried about incidents)
- Detailed reasoning with human-like thought process

### Technical Architecture
- **Frontend**: Next.js 16.1.6 with React 19, MapLibre GL maps
- **Maps**: OpenStreetMap tiles (free CDN) with optional MBTiles support
- **Backend**: SQLite database, OSRM routing engine
- **AI**: GLM-4.5 Air via OpenRouter
- **Traffic**: FREE UNLIMITED advanced simulation (no API limits!)
- **Weather**: OpenWeatherMap API (free tier: 60 calls/min)
- **Optimization**: Custom Dijkstra implementation with traffic/weather/incident factors

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm
- API keys (see Setup)

### Installation

1. **Clone and install dependencies:**
```bash
cd trafficmaxxers
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your API keys:
```env
OPENROUTER_API_KEY=your_key_here
OPENWEATHER_API_KEY=your_openweathermap_api_key
```

**Get API Keys:**
- OpenRouter: https://openrouter.ai/ (for AI agents)
- OpenWeatherMap: Already provided! (or get your own at https://openweathermap.org/api)
- Traffic: NO API KEY NEEDED - completely free and unlimited!

3. **Initialize database:**
```bash
npm run db:init
```

This creates `trafficmaxxers.db` with:
- 12 Bangalore traffic zones
- 6 fuel stations
- Empty vehicle fleet (you add vehicles manually)

4. **Run development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## � FREE UNLIMITED Traffic System

### How It Works
Our advanced traffic simulation generates **realistic Bangalore traffic patterns** without any API limits or costs:

**Smart Incident Generation**
- 12 known traffic hotspots (Silk Board, Hebbal, Marathahalli, etc.)
- Probability-weighted incident placement
- Types: accidents, breakdowns, roadwork, weather-related, congestion
- Severity levels: low, medium, high, critical with realistic delay times

**Time-Based Patterns**
- Rush hour simulation (7-10 AM, 5-8 PM)
  - 2.5x more incidents
  - 50% speed reduction
  - +40% congestion
- Night hours (10 PM-5 AM)
  - 30% speed increase
  - -10% congestion
- Weekend vs weekday patterns

**Weather Correlation**
- Clear: Normal traffic patterns
- Rain: 2x incidents, 20% slower, +15% congestion
- Heavy rain: 3.5x incidents, 50% slower, +30% congestion
- Fog: 2.5x incidents, 40% slower, +25% congestion
- Storm: 4x incidents, 60% slower, +40% congestion

**Zone-Specific Characteristics**
- Tech hubs (Electronic City, Whitefield) worse during rush hours
- Always-congested areas (Silk Board, Outer Ring Road)
- Statistical modeling per zone

**Incident Lifecycle**
- Incidents spawn based on conditions
- Duration: 15-60 minutes depending on severity
- Automatic cleanup after resolution
- Affects nearby zones within radius

**Why It's Better Than APIs**
- ✅ Completely FREE - no costs ever
- ✅ UNLIMITED - no rate limits or quotas
- ✅ Realistic - statistical models based on real patterns
- ✅ Weather-aware - correlates with live weather data
- ✅ Time-aware - rush hours, nights, weekends
- ✅ No latency - instant local computation
- ✅ No API key management - zero configuration

## �📖 Usage Guide

### Vehicle Lifecycle

1. **Create Vehicle** (POST /api/vehicles)
```json
{
  "name": "Truck 1",
  "type": "truck",
  "sourceLat": 12.9716,
  "sourceLng": 77.5946,
  "destLat": 13.0358,
  "destLng": 77.5970,
  "aiPersonality": "balanced",
  "cargoCapacity": 15000
}
```

Vehicle created with status='idle'

2. **Deploy Vehicle** (PATCH /api/vehicles)
```json
{
  "vehicleId": "TRUCK-1234567890",
  "action": "deploy"
}
```

Vehicle status changes to 'in-transit' and enters simulation

3. **Monitor Progress**
- AI calculates optimal route using Dijkstra's algorithm
- Real-time traffic affects route costs
- Weather conditions impact speed
- AI makes decisions based on situation imagination

4. **Stop Vehicle** (PATCH /api/vehicles)
```json
{
  "vehicleId": "TRUCK-1234567890",
  "action": "stop"
}
```

### API Endpoints

#### Vehicles
- `POST /api/vehicles` - Create new vehicle
- `GET /api/vehicles` - List all vehicles
- `DELETE /api/vehicles?id={id}` - Remove vehicle
- `PATCH /api/vehicles` - Deploy or stop vehicle

#### Traffic
- `GET /api/traffic` - Get current traffic incidents
- `POST /api/traffic/zones` - Update zone traffic data

#### Weather
- `GET /api/weather` - Get current Bangalore weather
- `POST /api/weather` - Get 24-hour forecast

## 🧠 AI Agent Behavior

### Personality Types
- **Aggressive**: Prefers speed, risk-tolerant, avoids delays
- **Cautious**: Safety-first, avoids incidents, conservative fuel usage
- **Balanced**: Considers all factors equally
- **Efficient**: Optimizes for fuel economy and time

### Decision Process

1. **Route Calculation**: Dijkstra's algorithm with multi-factor costs:
   ```
   totalCost = baseTime × trafficFactor × weatherFactor × incidentFactor
   ```
   - Traffic: 0% congestion = 1x, 100% = 3x slower
   - Weather: Clear = 1x, Storm = 0.3x (70% slower)
   - Incidents: Low severity = 1.2x, Critical = 3x slower

2. **Situation Imagination**: AI receives detailed prompt:
   - Current location, fuel level, speed, cargo
   - Weather conditions with visual indicators
   - Traffic zones with congestion levels
   - Active incidents with delays
   - Nearest fuel stations with distances
   - Sensory descriptions and emotional states

3. **AI Decision**: GLM-4.5 Air responds with:
   - Action (continue/reroute/refuel/wait/adjust_speed/emergency_stop)
   - First-person reasoning
   - Target speed (if applicable)
   - Priority level (low/medium/high/critical)
   - Confidence score (0.0-1.0)

## 🗂️ Project Structure

```
trafficmaxxers/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── vehicles/route.ts    # Vehicle CRUD
│   │   │   ├── traffic/route.ts     # Traffic data
│   │   │   └── weather/route.ts     # Weather data
│   │   ├── page.tsx                 # Main dashboard
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                      # UI components
│   │   └── logic/                   # Simulation logic
│   └── lib/
│       ├── ai/
│       │   └── vehicleAgent.ts      # AI decision making
│       ├── db/
│       │   ├── schema.sql           # Database schema
│       │   └── seed-sqlite.sql      # Seed data
│       ├── routing/
│       │   ├── routeOptimization.ts # Dijkstra's algorithm
│       │   └── osrmService.ts       # OSRM integration
│       ├── traffic/
│       │   └── trafficDataService.ts # TomTom API
│       ├── weather/
│       │   └── weatherService.ts    # OpenWeatherMap API
│       └── simulation/
│           └── environmentEngine.ts  # Environment simulation
├── trafficmaxxers.db                # SQLite database
├── .env.example                     # Environment template
└── README.md
```

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Manual Testing Workflow

1. **Create test vehicle:**
```bash
curl -X POST http://localhost:3000/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Truck",
    "type": "truck",
    "sourceLat": 12.9716,
    "sourceLng": 77.5946,
    "destLat": 13.0358,
    "destLng": 77.5970,
    "aiPersonality": "balanced"
  }'
```

2. **Deploy vehicle:**
```bash
curl -X PATCH http://localhost:3000/api/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "TRUCK-1234567890",
    "action": "deploy"
  }'
```

3. **Check traffic:**
```bash
curl http://localhost:3000/api/traffic
```

4. **Check weather:**
```bash
curl http://localhost:3000/api/weather
```

## 📊 Database Schema

### Tables
- `vehicles` - Fleet vehicles with location, fuel, status
- `traffic_zones` - 12 Bangalore zones with simulated traffic data
- `incidents` - Real-time traffic incidents from advanced simulation
- `fuel_stations` - 6 refueling locations
- `environment` - Weather and time-of-day state
- `simulation_logs` - Historical data

### Key Columns
- `vehicle_id` - Format: `{TYPE}-{timestamp}{random}`
- `status` - idle | in-transit | loading | unloading | refueling
- `ai_personality` - aggressive | cautious | balanced | efficient

## 🔧 Configuration

### Environment Variables
- `USE_REAL_WEATHER` - Enable/disable live weather (default: true)
- `SIMULATION_SPEED` - Time multiplier (default: 1.0)
- `DATABASE_PATH` - SQLite database location

### API Rate Limits
- **Traffic**: FREE UNLIMITED - No API key or limits!
- **OpenWeatherMap** (Free): 60 calls/minute, 1M calls/month
- **OpenRouter**: Varies by plan

### Polling Intervals
- Traffic data: 5 minutes (unlimited)
- Weather data: 15 minutes
- Zone updates: On-demand via POST /api/traffic/zones

## 🐛 Troubleshooting

### Common Issues

**"API key invalid"**
- Check `.env` file has correct keys
- Restart development server after updating `.env`

**"No routes found"**
- Verify coordinates are within Bangalore bounds (12.7342-13.1731°N, 77.3791-77.8827°E)
- Check OSRM service is accessible

**"Weather fallback mode"**
- OpenWeatherMap API key missing or invalid
- Network connectivity issue
- System will use simulated weather

**"Empty dashboard"**
- No vehicles created yet (expected behavior!)
- Use POST /api/vehicles to create your first vehicle

## 🚦 Roadmap

- [ ] Frontend vehicle creation UI
- [ ] Traffic overlay visualization on map
- [ ] AI thinking display component
- [ ] Route alternatives comparison
- [ ] Historical analytics dashboard
- [ ] Multi-depot support
- [ ] Custom incident reporting
- [ ] Route replay feature

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

Built with ❤️ for realistic Bangalore traffic simulation
