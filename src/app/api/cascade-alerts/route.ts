import { NextResponse } from 'next/server';
import { db } from '@/lib/db/database';

export async function GET() {
  try {
    const alerts = db.getCascadeAlerts ? db.getCascadeAlerts() : [];
    return NextResponse.json({ success: true, alerts });
  } catch (error: any) {
    console.error('Failed to get cascade alerts:', error);
    return NextResponse.json({ success: false, alerts: [], error: error.message }, { status: 500 });
  }
}
