import { NextResponse } from 'next/server';
import { findOrCreateTodaySession } from '@/lib/sessionService';

export async function GET() {
  try {
    const session = await findOrCreateTodaySession();
    return NextResponse.json(session);
  } catch (error) {
    console.error('GET /api/sessions/today error:', error);
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 });
  }
}
