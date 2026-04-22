import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    
    if (!q) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&viewbox=77.3,13.3,77.9,12.7&bounded=1&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Trafficmaxxers/1.0 (hackathon-submission@example.com)',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      }
    );

    if (!res.ok) {
      throw new Error(`Nominatim API returned ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Geocode API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
