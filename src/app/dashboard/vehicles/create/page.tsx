'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

function LocationSearch({ label, value, onSelect }: { label: string, value: string, onSelect: (lat: number, lng: number, name: string) => void }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search to respect Nominatim rate limits (1 req/sec)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length < 3) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=77.3,13.3,77.9,12.7&bounded=1&limit=5&addressdetails=1`,
          {
            headers: {
              'Accept-Language': 'en-US,en;q=0.9',
            }
          }
        );
        
        if (!res.ok) throw new Error('Network response was not ok');
        
        const data = await res.json();
        setResults(data);
      } catch (e) {
        console.warn('Search failed:', e);
        // Fallback or silent fail
      } finally {
        setIsSearching(false);
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative mb-4">
      <label className="block text-sm font-medium mb-1 text-gray-300">{label}</label>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Bangalore location..."
        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
      />
      {/* Loading Indicator */}
      {isSearching && (
        <div className="absolute right-3 top-[38px] text-gray-400">
          <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
        </div>
      )}
      {/* Results Dropdown */}
      {results.length > 0 && query.length >= 3 && !isSearching && (
        <ul className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {results.map((item) => (
            <li 
                key={item.place_id}
                onClick={() => {
                setQuery(item.display_name.split(',')[0]); // Use short name for input
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