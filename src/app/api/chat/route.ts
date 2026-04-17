// Force Node.js runtime so SQLite works reliably
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/database';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(request: NextRequest) {
    try {
        // Parse incoming messages (optional)
        const { messages = [] } = await request.json().catch(() => ({ messages: [] }));

        // Fetch live data from the database (guarded)
        let vehicles: any[] = [];
        let zones: any[] = [];
        let incidents: any[] = [];
        try {
            vehicles = db.getVehicles();
            zones = db.getZones();
            incidents = db.getActiveIncidents();
        } catch (dbError: any) {
            console.error('Chat API DB Error:', dbError);
            return NextResponse.json(
                { error: 'Database unavailable. Please try again soon.' },
                { status: 500 }
            );
        }

        // Aggregate vehicle stats
        const totalVehicles = vehicles.length;
        const inTransit = vehicles.filter((v: any) => v.status === 'in-transit').length;
        const idle = vehicles.filter((v: any) => v.status === 'idle').length;
        const refueling = vehicles.filter((v: any) => v.status === 'refueling').length;

        // Congestion hotspots (top 3 by congestion_level)
        const topZones = [...zones]
            .sort((a: any, b: any) => (b.congestion_level || 0) - (a.congestion_level || 0))
            .slice(0, 3);

        // Build a concise, deterministic message (no external API)
        const lastUser = messages.length ? messages[messages.length - 1].content : 'No user message provided.';
        const message = `**Live Fleet Snapshot**\n- Vehicles: ${totalVehicles} total | ${inTransit} in-transit | ${idle} idle | ${refueling} refueling\n- Incidents: ${incidents.length} active\n- Top congestion: ${topZones.map(z => `${z.name} (${Math.round(z.congestion_level || 0)}%)`).join(', ') || 'none'}\n\nUser asked: ${lastUser}`;

        const aiModel = 'openai/gpt-oss-120b:free';

        // System context for AI (uses live stats)
        const systemContext = `You are TrafficMaxxer AI, a Bangalore traffic routing expert.

Live status:
- Vehicles: ${totalVehicles} total | ${inTransit} in-transit | ${idle} idle | ${refueling} refueling
- Incidents: ${incidents.length} active
- Top congestion: ${topZones.map(z => `${z.name} (${Math.round(z.congestion_level || 0)}%)`).join(', ') || 'none'}`;

        // Try OpenRouter first; on failure, fall back to local stats message
        if (OPENROUTER_API_KEY) {
            try {
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'TrafficMaxxers'
                    },
                    body: JSON.stringify({
                        model: aiModel,
                        messages: [
                            { role: 'system', content: systemContext },
                            { role: 'user', content: lastUser }
                        ],
                        temperature: 0.5,
                        max_tokens: 500
                    })
                });

                const data = await response.json().catch(() => ({}));
                const aiMessage = data?.choices?.[0]?.message?.content || data?.message || data?.error?.message;

                // Prefer any AI text we get, even on non-200, to avoid falling back when model replies
                if (aiMessage) {
                    return NextResponse.json({
                        message: aiMessage,
                        stats: {
                            vehicles: { total: totalVehicles, inTransit, idle, refueling },
                            incidents: incidents.length,
                            topZones
                        }
                    });
                }
            } catch (aiError: any) {
                console.warn('OpenRouter fallback to local stats:', aiError?.message || aiError);
            }
        }

        // Local deterministic response (fallback)
        return NextResponse.json({
            message,
            stats: {
                vehicles: { total: totalVehicles, inTransit, idle, refueling },
                incidents: incidents.length,
                topZones
            }
        });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to process chat request' },
            { status: 500 }
        );
    }
}
