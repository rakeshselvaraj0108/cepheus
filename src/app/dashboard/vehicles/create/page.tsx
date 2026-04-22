'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

// 40+ Bangalore locations for instant autocomplete
const BANGALORE_LOCATIONS: SearchResult[] = [
  { place_id: 10001, display_name: "KJU (Kristu Jayanti College), K Narayanapura", lat: "13.0584", lon: "77.6433" },
  { place_id: 10002, display_name: "Atria Institute of Technology, Anandnagar", lat: "13.0334", lon: "77.5901" },
  { place_id: 10003, display_name: "Koramangala, Bangalore", lat: "12.9352", lon: "77.6245" },
  { place_id: 10004, display_name: "Silk Board Junction, Bangalore", lat: "12.9176", lon: "77.6238" },
  { place_id: 10005, display_name: "Shanti Nagar, Bangalore", lat: "12.9569", lon: "77.5959" },
  { place_id: 10006, display_name: "Indiranagar, Bangalore", lat: "12.9784", lon: "77.6408" },
  { place_id: 10007, display_name: "Whitefield, Bangalore", lat: "12.9698", lon: "77.7500" },
  { place_id: 10008, display_name: "Electronic City Phase 1, Bangalore", lat: "12.8452", lon: "77.6602" },
  { place_id: 10009, display_name: "Majestic (Kempegowda Bus Station), Bangalore", lat: "12.9767", lon: "77.5713" },
  { place_id: 10010, display_name: "MG Road, Bangalore", lat: "12.9753", lon: "77.6066" },
  { place_id: 10011, display_name: "Brigade Road, Bangalore", lat: "12.9716", lon: "77.6070" },
  { place_id: 10012, display_name: "Jayanagar, Bangalore", lat: "12.9250", lon: "77.5938" },
  { place_id: 10013, display_name: "JP Nagar, Bangalore", lat: "12.9063", lon: "77.5857" },
  { place_id: 10014, display_name: "BTM Layout, Bangalore", lat: "12.9166", lon: "77.6101" },
  { place_id: 10015, display_name: "HSR Layout, Bangalore", lat: "12.9116", lon: "77.6389" },
  { place_id: 10016, display_name: "Marathahalli, Bangalore", lat: "12.9591", lon: "77.7009" },
  { place_id: 10017, display_name: "Hebbal, Bangalore", lat: "13.0358", lon: "77.5970" },
  { place_id: 10018, display_name: "Yelahanka, Bangalore", lat: "13.1007", lon: "77.5963" },
  { place_id: 10019, display_name: "Kempegowda International Airport, Bangalore", lat: "13.1989", lon: "77.7068" },
  { place_id: 10020, display_name: "Rajajinagar, Bangalore", lat: "12.9900", lon: "77.5525" },
  { place_id: 10021, display_name: "Malleshwaram, Bangalore", lat: "13.0035", lon: "77.5645" },
  { place_id: 10022, display_name: "Basavanagudi, Bangalore", lat: "12.9424", lon: "77.5750" },
  { place_id: 10023, display_name: "Sadashivanagar, Bangalore", lat: "13.0070", lon: "77.5780" },
  { place_id: 10024, display_name: "Banashankari, Bangalore", lat: "12.9255", lon: "77.5468" },
  { place_id: 10025, display_name: "Vijayanagar, Bangalore", lat: "12.9710", lon: "77.5330" },
  { place_id: 10026, display_name: "Peenya Industrial Area, Bangalore", lat: "13.0300", lon: "77.5190" },
  { place_id: 10027, display_name: "Yeshwanthpur, Bangalore", lat: "13.0280", lon: "77.5450" },
  { place_id: 10028, display_name: "Bannerghatta Road, Bangalore", lat: "12.8870", lon: "77.5970" },
  { place_id: 10029, display_name: "Sarjapur Road, Bangalore", lat: "12.9100", lon: "77.6870" },
  { place_id: 10030, display_name: "Bellandur, Bangalore", lat: "12.9260", lon: "77.6760" },
  { place_id: 10031, display_name: "Varthur, Bangalore", lat: "12.9370", lon: "77.7440" },
  { place_id: 10032, display_name: "KR Puram, Bangalore", lat: "13.0073", lon: "77.6960" },
  { place_id: 10033, display_name: "Domlur, Bangalore", lat: "12.9610", lon: "77.6387" },
  { place_id: 10034, display_name: "HAL Airport, Bangalore", lat: "12.9500", lon: "77.6680" },
  { place_id: 10035, display_name: "Ulsoor, Bangalore", lat: "12.9830", lon: "77.6200" },
  { place_id: 10036, display_name: "Richmond Town, Bangalore", lat: "12.9600", lon: "77.6000" },
  { place_id: 10037, display_name: "Cubbon Park, Bangalore", lat: "12.9763", lon: "77.5929" },
  { place_id: 10038, display_name: "Lalbagh Botanical Garden, Bangalore", lat: "12.9507", lon: "77.5848" },
  { place_id: 10039, display_name: "Wilson Garden, Bangalore", lat: "12.9440", lon: "77.5990" },
  { place_id: 10040, display_name: "Bommanahalli, Bangalore", lat: "12.9010", lon: "77.6230" },
  { place_id: 10041, display_name: "Nagarbhavi, Bangalore", lat: "12.9610", lon: "77.5100" },
  { place_id: 10042, display_name: "RT Nagar, Bangalore", lat: "13.0210", lon: "77.5970" },
  { place_id: 10043, display_name: "Kammanahalli, Bangalore", lat: "13.0130", lon: "77.6420" },
  { place_id: 10044, display_name: "Kalyan Nagar, Bangalore", lat: "13.0250", lon: "77.6400" },
  { place_id: 10045, display_name: "HRBR Layout, Bangalore", lat: "13.0180", lon: "77.6350" },
];

function LocationSearch({ label, value, onSelect }: { label: string, value: string, onSelect: (lat: number, lng: number, name: string) => void }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // INSTANT local filtering + delayed Nominatim for extra results
  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const q = query.toLowerCase();

    // INSTANT: Filter from hardcoded locations (no network call!)
    const localMatches = BANGALORE_LOCATIONS.filter(loc =>
      loc.display_name.toLowerCase().includes(q)
    );
    setResults(localMatches.slice(0, 6));
    setShowDropdown(true);

    // DELAYED: Also fetch from Nominatim for extra results (non-blocking)
    const timer = setTimeout(async () => {
      if (query.length < 2) return;
      setIsSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          // Merge: local first, then remote, deduplicate by place_id
          const existingIds = new Set(localMatches.map(l => l.place_id));
          const remoteNew = (data || []).filter((d: SearchResult) => !existingIds.has(d.place_id));
          setResults([...localMatches, ...remoteNew].slice(0, 8));
        }
      } catch (e) {
        // Ignore - we already have local results
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative mb-4" ref={containerRef}>
      <label className="block text-sm font-medium mb-1 text-gray-300">{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
        placeholder="Type any Bangalore location... (e.g. K, Silk, MG)"
        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
      />
      {/* Loading Indicator */}
      {isSearching && (
        <div className="absolute right-3 top-[38px] text-gray-400">
          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        </div>
      )}
      {/* Results Dropdown */}
      {showDropdown && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {results.map((item) => (
            <li 
                key={item.place_id}
                onClick={() => {
                setQuery(item.display_name.split(',')[0]);
                setShowDropdown(false);
                setResults([]);
                onSelect(parseFloat(item.lat), parseFloat(item.lon), item.display_name);
                }}
                className="px-4 py-3 hover:bg-blue-600 cursor-pointer text-sm border-b border-gray-700 last:border-0 transition-colors"
            >
                <div className="font-medium text-white">{item.display_name.split(',')[0]}</div>
                <div className="text-xs text-gray-400 truncate">{item.display_name}</div>
            </li>
            ))}
        </ul>
      )}
    </div>
  );
}


export default function CreateVehiclePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'truck',
    sourceLat: '',
    sourceLng: '',
    destLat: '',
    destLng: '',
    aiPersonality: 'balanced',
    cargoCapacity: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Frontend validation
    if (!formData.name.trim()) {
      setError('Vehicle name is required');
      setLoading(false);
      return;
    }
    if (!formData.sourceLat || !formData.destLat) {
        setError('Please select both source and destination');
        setLoading(false);
        return;
    }

    try {
      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          sourceLat: parseFloat(formData.sourceLat),
          sourceLng: parseFloat(formData.sourceLng),
          destLat: parseFloat(formData.destLat),
          destLng: parseFloat(formData.destLng),
          aiPersonality: formData.aiPersonality,
          cargoCapacity: formData.cargoCapacity ? parseInt(formData.cargoCapacity) : undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.details || 'Failed to create vehicle');
        return;
      }

      if (data.success) {
        alert(`✅ Vehicle created: ${data.vehicle.id}\nStatus: ${data.vehicle.status}\n\nGo to Fleet Management to deploy it!`);
        router.push('/dashboard/vehicles');
      } else {
        setError(data.error || 'Failed to create vehicle');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🚛 Create New Vehicle</h1>
          <p className="text-gray-400">Add a vehicle to your fleet with source and destination</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Vehicle Name */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Vehicle Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Delivery Truck 1"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Vehicle Type */}
                <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Vehicle Type *</label>
                <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                >
                    <option value="truck">🚛 Truck (15,000 kg)</option>
                    <option value="van">🚐 Van (3,500 kg)</option>
                    <option value="car">🚗 Car (500 kg)</option>
                </select>
                </div>

                {/* AI Personality */}
                <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">AI Personality *</label>
                <select
                    value={formData.aiPersonality}
                    onChange={(e) => setFormData({...formData, aiPersonality: e.target.value})}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
                >
                    <option value="balanced">⚖️ Balanced</option>
                    <option value="efficient">⚡ Efficient</option>
                    <option value="cautious">🛡️ Cautious</option>
                    <option value="aggressive">🏁 Aggressive</option>
                </select>
                </div>
            </div>

            {/* Cargo Capacity */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Cargo Capacity (kg) <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <input
                type="number"
                value={formData.cargoCapacity}
                onChange={(e) => setFormData({...formData, cargoCapacity: e.target.value})}
                placeholder="Default"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white"
              />
            </div>

            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">📍 Route Configuration</h3>
              
              <LocationSearch 
                label="Start Location (Search)"
                value=""
                onSelect={(lat, lng) => setFormData(prev => ({ ...prev, sourceLat: lat.toString(), sourceLng: lng.toString() }))}
              />
               
              <LocationSearch 
                label="Destination Location (Search)"
                value=""
                onSelect={(lat, lng) => setFormData(prev => ({ ...prev, destLat: lat.toString(), destLng: lng.toString() }))}
              />

              {/* Coordinate Debug (Optional) */}
               {(formData.sourceLat || formData.destLat) && (
                   <div className="text-xs text-gray-500 font-mono mt-2 bg-gray-900 p-2 rounded">
                       SRC: {formData.sourceLat},{formData.sourceLng} <br/>
                       DST: {formData.destLat},{formData.destLng}
                   </div>
               )}
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
                <span>❌</span> {error}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-lg transition-colors shadow-lg ${
                  loading 
                    ? 'bg-gray-600 cursor-not-allowed text-gray-400' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {loading ? '⏳ Creating...' : '🚀 Create & Deploy'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}